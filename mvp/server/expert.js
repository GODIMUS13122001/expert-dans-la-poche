// Agent de rangement : découpe une note libre d'expert en astuces et range chacune
// sous le code défaut, l'équipement ou la procédure qu'elle concerne.
import fs from "node:fs/promises";
import { z } from "zod";
import { appelClaude } from "./moteur.js";
import { blocCorpus } from "./corpus.js";

const Rangement = z.object({
  auteur: z.string().describe("Auteur de la note s'il est indiqué, sinon « Expert (non nommé) »"),
  astuces: z.array(z.object({
    cible: z.string().describe("Code défaut (E508, A12…), sinon nom court de la procédure ou de l'opération (« Changement de moule »)"),
    type_cible: z.enum(["code_defaut", "equipement", "procedure", "reference_produit"]),
    equipement: z.string().nullable().describe("PI-180, LA-07… tel qu'il apparaît dans le corpus"),
    texte: z.string().describe("L'astuce en une ou deux phrases courtes, fidèle à la note, sans rien inventer"),
    citation: z.string().describe("Le passage de la note d'où vient l'astuce, copié tel quel"),
    ecart_reference: z.string().nullable().describe("Si l'astuce s'écarte d'un document de référence du corpus : quel document et en quoi. Sinon null"),
  })),
  ignores: z.array(z.object({
    texte: z.string(),
    raison: z.string().describe("Pourquoi ce passage n'est pas une astuce exploitable"),
  })),
});

const CONSIGNE = `Tu ranges la note de départ d'un expert d'atelier (régleur, senior de ligne, maintenance) pour que son savoir-faire serve aux opérateurs après son départ.

Découpe la note en astuces unitaires : une astuce = un savoir-faire actionnable sur un code défaut, un équipement, une procédure ou une référence produit. Range chacune sous sa cible exacte, en reprenant les codes et noms d'équipements tels qu'ils figurent dans le corpus fourni.

Règles :
- Reste fidèle à la note : pas d'ajout, pas de valeur inventée.
- Compare chaque astuce au corpus de référence et remplis ecart_reference quand elle s'en écarte (périodicité, valeur, ordre des opérations).
- Une règle de sécurité générale (« ne jamais shunter… ») est une astuce de type equipement si elle vise un équipement, sinon procedure.
- Mets dans ignores ce qui n'est pas exploitable : phrases d'introduction, avis personnels, informations sans action.`;

export async function rangerNote({ texte, nomFichier, corpus }) {
  const { donnees } = await appelClaude({
    systeme: `${CONSIGNE}\n\n<corpus>\n${blocCorpus(corpus)}\n</corpus>`,
    prompt: `<note fichier="${nomFichier}">\n${texte}\n</note>`,
    schema: Rangement,
  });
  return donnees;
}

// ---------------------------------------------------------------- stockage fichier

export async function lireAstuces(chemin) {
  try {
    return JSON.parse(await fs.readFile(chemin, "utf8"));
  } catch {
    return [];
  }
}

export async function ajouterAstuces(chemin, rangement, source) {
  const existantes = (await lireAstuces(chemin)).filter((a) => a.source !== source); // re-dépôt = remplacement
  const date = new Date().toISOString();
  const nouvelles = rangement.astuces.map((a, i) => ({
    id: `${Date.now().toString(36)}-${i}`,
    ...a,
    auteur: rangement.auteur,
    source,
    deposeLe: date,
  }));
  const toutes = [...existantes, ...nouvelles];
  await fs.writeFile(chemin, JSON.stringify(toutes, null, 2));
  return { nouvelles, toutes };
}
