// Chargement du corpus : lit chaque fichier du dossier corpus/, en extrait le texte
// et calcule ce que la page admin affiche (statut, taille, sections, alertes).
import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import ExcelJS from "exceljs";

const FORMATS = { ".docx": "Word", ".xlsx": "Excel", ".md": "Markdown", ".txt": "Texte" };

export const STATUTS = {
  reference: "Référence",
  obsolete: "Obsolète",
  non_valide: "Non validé",
  retour_experience: "Retour d'expérience",
  a_qualifier: "À qualifier",
};

// ---------------------------------------------------------------- extraction

function decoder(s) {
  return s
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");
}

function sansBalises(s) {
  return decoder(s.replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

// mammoth produit un HTML simple et régulier : titres, paragraphes, listes, tableaux.
// On le convertit en Markdown pour garder la structure (sections, étapes numérotées).
function htmlVersMarkdown(html) {
  const lignes = [];
  const re = /<(h[1-6]|p|ol|ul|table)[^>]*>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(html))) {
    const [, tag, contenu] = m;
    if (tag.startsWith("h")) {
      lignes.push("", `${"#".repeat(Number(tag[1]) + 1)} ${sansBalises(contenu)}`, "");
    } else if (tag === "p") {
      const t = sansBalises(contenu);
      if (t) lignes.push(t, "");
    } else if (tag === "ol" || tag === "ul") {
      const items = [...contenu.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((x) => sansBalises(x[1]));
      items.forEach((t, i) => lignes.push(tag === "ol" ? `${i + 1}. ${t}` : `- ${t}`));
      lignes.push("");
    } else {
      const rangees = [...contenu.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((r) =>
        [...r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => sansBalises(c[1])));
      rangees.forEach((r, i) => {
        lignes.push(`| ${r.join(" | ")} |`);
        if (i === 0) lignes.push(`|${r.map(() => " --- ").join("|")}|`);
      });
      lignes.push("");
    }
  }
  return lignes.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function valeurCellule(v) {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") return v.text ?? v.result ?? (v.richText ? v.richText.map((r) => r.text).join("") : "");
  return String(v);
}

async function extraire(chemin, ext) {
  if (ext === ".docx") {
    // Le style « Title » de Word sort en paragraphe simple ; on le mappe sur h1.
    const { value } = await mammoth.convertToHtml({ path: chemin }, { styleMap: ["p[style-name='Title'] => h1:fresh"] });
    return htmlVersMarkdown(value);
  }
  if (ext === ".xlsx") {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(chemin);
    const blocs = [];
    wb.eachSheet((ws) => {
      const lignes = [`## Feuille « ${ws.name} »`, ""];
      let entete = false;
      ws.eachRow((row) => {
        const cellules = row.values.slice(1).map(valeurCellule);
        const remplies = cellules.filter((c) => c !== "");
        if (!remplies.length) return;
        if (remplies.length === 1) return void lignes.push(remplies[0], "");
        lignes.push(`| ${cellules.join(" | ")} |`);
        if (!entete) lignes.push(`|${cellules.map(() => " --- ").join("|")}|`), (entete = true);
      });
      blocs.push(lignes.join("\n"));
    });
    return blocs.join("\n\n");
  }
  return fs.readFile(chemin, "utf8");
}

// ---------------------------------------------------------------- analyse

function titreDe(texte, fichier) {
  const h = texte.match(/^#{1,3} (.+)$/m);
  return h ? h[1].trim() : fichier.replace(/\.[^.]+$/, "").replace(/_/g, " ");
}

// Codes documentaires du type PR-SEC-003, PLT-PI180-MN1.
const RE_CODE = /\b[A-Z]{2,4}-[A-Z0-9]{2,6}-[A-Z0-9]{1,4}\b/g;

function analyserVersions(docs) {
  // Un document qui « Remplace » une version d'un autre document du même titre rend ce dernier obsolète.
  const remplace = {};
  for (const d of docs) {
    const v = d.texte.match(/\|\s*Version\s*\|\s*(\d+)\s*\|/i);
    d.version = v ? Number(v[1]) : null;
    const r = d.texte.match(/\|\s*Remplace\s*\|\s*Version\s*(\d+)/i);
    if (r) remplace[d.titre] = { par: d.fichier, version: Number(r[1]) };
  }
  for (const d of docs) {
    const r = remplace[d.titre];
    if (r && r.par !== d.fichier && d.version === r.version) d.remplacePar = r.par;
  }
}

function alertesCorpus(docs) {
  const alertes = [];
  const connus = docs.flatMap((d) => [d.fichier, d.titre, d.texte.match(/Référence document \| ([^|]+)/)?.[1]?.trim() ?? ""]).join(" ");
  const cites = new Map();
  for (const d of docs) {
    for (const code of d.texte.match(RE_CODE) ?? []) {
      if (!connus.includes(code)) (cites.get(code) ?? cites.set(code, new Set()).get(code)).add(d.fichier);
    }
  }
  // On ne garde que les codes de procédures (PR-...) : les références de pièces (FH-180-25…) sont normales.
  for (const [code, fichiers] of cites) {
    if (code.startsWith("PR-")) {
      alertes.push({ type: "manquant", message: `${code} est cité mais n'est pas dans le corpus`, fichiers: [...fichiers] });
    }
  }
  for (const d of docs.filter((x) => x.remplacePar)) {
    alertes.push({ type: "version", message: `${d.fichier} est remplacé par ${d.remplacePar}`, fichiers: [d.fichier] });
  }
  return alertes;
}

// ---------------------------------------------------------------- chargement

async function lister(dossier) {
  const sortie = [];
  for (const e of await fs.readdir(dossier, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name.startsWith("~$")) continue;
    const p = path.join(dossier, e.name);
    if (e.isDirectory()) sortie.push(...(await lister(p)));
    else sortie.push(p);
  }
  return sortie;
}

export async function chargerCorpus(dossierCorpus, registre) {
  const debut = Date.now();
  const docs = [];
  for (const chemin of (await lister(dossierCorpus)).sort()) {
    const fichier = path.basename(chemin);
    const ext = path.extname(fichier).toLowerCase();
    const stat = await fs.stat(chemin);
    const doc = {
      fichier,
      chemin: path.relative(dossierCorpus, chemin),
      format: FORMATS[ext] ?? ext.slice(1).toUpperCase(),
      octets: stat.size,
      modifie: stat.mtime.toISOString(),
      texte: "",
      etat: "charge",
      erreur: null,
    };
    if (!FORMATS[ext]) {
      doc.etat = "ignore";
      doc.erreur = `Format ${ext || "inconnu"} non pris en charge (Word, Excel, Markdown ou texte)`;
    } else {
      try {
        doc.texte = (await extraire(chemin, ext)).trim();
        if (!doc.texte) (doc.etat = "erreur"), (doc.erreur = "Aucun texte extrait");
      } catch (e) {
        doc.etat = "erreur";
        doc.erreur = e.message;
      }
    }
    doc.titre = ext === ".xlsx" ? titreDe("", fichier) : titreDe(doc.texte, fichier);
    doc.caracteres = doc.texte.length;
    doc.tokens = Math.round(doc.texte.length / 3.5); // estimation, le français tokenise autour de 3,5 caractères
    doc.sections = (doc.texte.match(/^#{2,4} /gm) ?? []).length + (doc.texte.match(/^## Feuille/gm) ?? []).length;
    doc.fictif = /fictif|fictive/i.test(doc.texte.slice(0, 800));
    docs.push(doc);
  }
  const charges = docs.filter((d) => d.etat === "charge");
  analyserVersions(charges);
  for (const d of docs) {
    const r = registre[d.fichier];
    d.statut = d.remplacePar ? "obsolete" : (r?.statut ?? "a_qualifier");
    d.noteStatut = d.remplacePar ? `Remplacé par ${d.remplacePar}` : (r?.note ?? "Nouveau document, pas encore qualifié");
  }
  return { docs, alertes: alertesCorpus(charges), chargeLe: new Date().toISOString(), dureeMs: Date.now() - debut };
}

// Le bloc envoyé au modèle : uniquement les documents chargés, dans un ordre stable (cache de prompt).
export function blocCorpus(corpus) {
  return corpus.docs
    .filter((d) => d.etat === "charge")
    .map((d) => `<document fichier="${d.fichier}" statut="${STATUTS[d.statut]}" note="${d.noteStatut}">\n${d.texte}\n</document>`)
    .join("\n\n");
}
