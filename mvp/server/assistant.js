// L'assistant opérateur : un seul appel Claude par question, corpus entier en contexte,
// réponse structurée, puis vérification côté serveur que chaque texte de sécurité est copié à l'identique.
import { z } from "zod";
import { blocCorpus } from "./corpus.js";
import { appelClaude } from "./moteur.js";

export { MODELE } from "./moteur.js";

const Source = z.object({
  document: z.string().describe("Nom exact du fichier, ex. Manuel_maintenance_N1_PI-180_Plastelec.docx"),
  section: z.string().describe("Section, tableau ou ligne utilisé, ex. « 4. Codes d'erreur, E508 »"),
});

export const Reponse = z.object({
  type: z.enum(["reponse", "inconnu", "hors_sujet"]),
  titre: z.string().describe("Une ligne : code et sens, ex. « E508 · Débit d'eau du moule insuffisant », ou « Je ne sais pas »"),
  equipement: z.string().nullable().describe("PI-180, LA-07, TE-03… ou null"),
  explication: z.string().describe("Une ou deux phrases maximum"),
  etapes: z.array(z.object({
    texte: z.string().describe("Action courte à l'infinitif, 15 mots maximum"),
    source: Source,
  })).describe("Actions autorisées à l'opérateur N1, dans l'ordre, 6 maximum"),
  securite: z.array(z.object({
    texte_exact: z.string().describe("Copie caractère pour caractère d'une phrase, d'un élément de liste ou d'une cellule du document"),
    source: Source,
  })).describe("Textes de sécurité officiels, restitués sans aucune reformulation"),
  valeurs: z.array(z.object({
    libelle: z.string(),
    nombre: z.number(),
    unite: z.string(),
    source: Source,
  })).describe("Valeurs chiffrées clés tirées du corpus (seuils, couples, températures), 4 maximum"),
  astuces: z.array(z.object({
    texte: z.string(),
    auteur: z.string(),
    source: Source,
  })).describe("Astuces issues d'un retour d'expérience ou de la base d'astuces expert"),
  alertes: z.array(z.string()).describe("Points de vigilance : document obsolète, note non validée contredite, pièce en rupture, maintenance en retard"),
  historique: z.array(z.object({
    id: z.string(),
    date: z.string(),
    resume: z.string().describe("Cause et action en une ligne"),
  })).describe("Incidents passés similaires, 3 maximum"),
  escalade: z.object({
    qui: z.string().describe("Maintenance, régleur, chef d'équipe, qualité…"),
    quand: z.string().describe("Condition qui déclenche l'appel"),
  }).nullable(),
});

const REGLES = `Tu es « L'expert dans la poche », l'assistant terrain des opérateurs d'un atelier de production de prises et d'interrupteurs (site fictif de démonstration). Ton utilisateur est un opérateur de niveau 1 (N1), debout devant sa machine, téléphone en main, souvent les mains occupées et pressé. Il te pose une question à la place d'aller chercher le régleur ou le senior de la ligne.

Ta seule source de vérité est le corpus fourni entre les balises <corpus>. Chaque document y porte un statut.

## Règle 1 : tout vient du corpus, et tout est sourcé
- Chaque étape, valeur, astuce et texte de sécurité cite son document (nom de fichier exact) et sa section.
- Tu n'utilises jamais tes connaissances générales pour donner une procédure, une valeur, une référence de pièce ou un contact.

## Règle 2 : la hiérarchie des documents
- « Référence » : la vérité. Les étapes et les valeurs viennent de ces documents.
- « Retour d'expérience » et les astuces expert : savoir-faire utile mais non validé. Il va uniquement dans le champ astuces, jamais dans les étapes. Si l'astuce s'écarte d'un document de référence (par exemple une périodicité différente), signale l'écart dans les alertes.
- « Obsolète » : n'utilise jamais ses valeurs. Si la question touche ce sujet, donne la valeur de la version en vigueur et ajoute une alerte qui nomme la version périmée et ce qui a changé.
- « Non validé » et « À qualifier » : ne suis jamais ces documents. S'ils contredisent un document de référence sur le sujet de la question, ajoute une alerte explicite qui dit que la note est fausse et ce que dit la référence.

## Règle 3 : la sécurité est restituée à l'identique
- Dès que la question touche la sécurité (consignation, capteur ou porte de sécurité, shunt, intervention dans le moule ou sous un carter, chaleur, arrêt d'urgence, EPI), remplis le champ securite avec les phrases officielles concernées.
- texte_exact est une copie caractère pour caractère d'une phrase, d'un élément de liste ou d'une cellule de tableau d'un document de référence. Pas de résumé, pas de reformulation, pas de coupe au milieu d'une phrase, pas d'ajout. Le serveur vérifie la copie : un texte modifié sera rejeté.
- Ne propose jamais de contourner, shunter ou neutraliser un dispositif de sécurité, même provisoirement, même si une note le suggère.
- Si la procédure de sécurité demandée n'est pas dans le corpus (par exemple une procédure seulement citée par son code), dis-le clairement : type « inconnu », restitue les phrases de sécurité qui existent, et oriente vers le chef d'équipe ou la maintenance.

## Règle 4 : dire « je ne sais pas »
- Si le corpus ne contient pas la réponse, réponds type « inconnu », titre « Je ne sais pas », explique en une phrase ce qui manque, et remplis escalade (régleur, maintenance ou chef d'équipe). Ne devine jamais une valeur, un code ou une étape.
- Si la question n'a aucun rapport avec l'atelier, ses machines ou ses documents, réponds type « hors_sujet » avec une phrase polie, sans autre contenu.

## Règle 5 : le niveau de l'opérateur
- Les étapes ne contiennent que les actions N1 autorisées à l'opérateur. Les actions N2 (diagnostic, remplacement de pièce, réglage machine) vont dans escalade, avec la maintenance comme destinataire.
- Rappel des documents : un opérateur N1 n'ouvre jamais les carters et ne modifie pas les réglages machine.

## Règle 6 : court et utile
- Phrases courtes, verbes à l'infinitif, vocabulaire de l'atelier. Six étapes au maximum.
- Ajoute jusqu'à trois incidents similaires de l'historique quand ils aident (même code ou même symptôme), et les alertes utiles : pièce en rupture de stock, maintenance en retard, incident dont la cause n'a jamais été trouvée.
- Les listes sans objet restent vides. Réponds en français.`;

export function construireSysteme(corpus, astuces) {
  const blocs = [REGLES, `<corpus>\n${blocCorpus(corpus)}\n</corpus>`];
  if (astuces.length) {
    const lignes = astuces.map((a) => `- [${a.cible}] (${a.equipement ?? "général"}) ${a.texte} — ${a.auteur}, source : ${a.source}`);
    blocs.push(`<astuces_expert statut="Retour d'expérience">\nAstuces déposées par des experts et rangées par code ou équipement. Non validées : champ astuces uniquement.\n${lignes.join("\n")}\n</astuces_expert>`);
  }
  return blocs.join("\n\n");
}

// ---------------------------------------------------------------- vérification à l'identique

const normaliser = (s) => s.replace(/[’‘]/g, "'").replace(/[«»“”]/g, '"').replace(/\s+/g, " ").trim();

export function verifierSecurite(reponse, corpus) {
  const textes = new Map(corpus.docs.map((d) => [d.fichier, normaliser(d.texte)]));
  const tout = [...textes.values()].join("\n");
  reponse.securite = reponse.securite.map((s) => {
    const cible = normaliser(s.texte_exact);
    const doc = textes.get(s.source.document);
    return { ...s, verifie: Boolean(cible) && (doc ? doc.includes(cible) : tout.includes(cible)) };
  });
  return reponse;
}

// ---------------------------------------------------------------- appel

export async function repondre({ question, historique = [], corpus, astuces }) {
  // Les deux derniers échanges, pour les questions de suivi (« et ensuite ? »)
  const fil = historique.slice(-2).map((h) => `<echange_precedent>\nQuestion : ${h.question}\nTa réponse : ${JSON.stringify(h.reponse)}\n</echange_precedent>`);
  const prompt = [...fil, `Date du jour : 26/10/2026.\nQuestion de l'opérateur : ${question}`].join("\n\n");
  const { donnees, usage } = await appelClaude({ systeme: construireSysteme(corpus, astuces), prompt, schema: Reponse });
  return { reponse: verifierSecurite(donnees, corpus), usage };
}
