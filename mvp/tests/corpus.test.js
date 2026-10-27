// Tests sans appel au modèle : chargement du corpus et vérification « à l'identique ».
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { chargerCorpus } from "../server/corpus.js";
import { verifierSecurite } from "../server/assistant.js";

const registre = JSON.parse(fs.readFileSync(new URL("../data/registre.json", import.meta.url), "utf8"));
const corpus = await chargerCorpus(fileURLToPath(new URL("../../corpus", import.meta.url)), registre);
const doc = (motif) => corpus.docs.find((d) => d.fichier.includes(motif));

test("les 8 documents du corpus sont chargés, Word et Excel", () => {
  assert.equal(corpus.docs.length, 8);
  assert.ok(corpus.docs.every((d) => d.etat === "charge" && d.caracteres > 500 || d.fichier.includes("Notes")));
  assert.match(doc("Planning").texte, /FH-180-25 \| Filtre hydraulique/);
  assert.match(doc("Manuel").texte, /\| E508 \| Débit de refroidissement du moule insuffisant/);
});

test("les étapes numérotées des procédures sont conservées", () => {
  assert.match(doc("v3").texte, /^8\. Serrer les 8 brides en croix au couple de 85 N·m/m);
});

test("la version 2 de PR-INJ-014 est détectée comme obsolète", () => {
  assert.equal(doc("v2").statut, "obsolete");
  assert.equal(doc("v2").remplacePar, "PR-INJ-014_Changement_de_moule_PI-180_v3.docx");
  assert.equal(doc("v3").statut, "reference");
});

test("la procédure PR-SEC-003, citée mais absente, est signalée", () => {
  assert.ok(corpus.alertes.some((a) => a.type === "manquant" && a.message.startsWith("PR-SEC-003")));
});

test("un texte de sécurité copié à l'identique est validé, une reformulation est rejetée", () => {
  const source = { document: "Manuel_maintenance_N1_PI-180_Plastelec.docx", section: "E310" };
  const r = verifierSecurite({
    securite: [
      { texte_exact: "Ouvrir puis refermer la porte. Ne jamais shunter ni contourner le capteur", source },
      { texte_exact: "Il ne faut jamais shunter le capteur de porte", source },
    ],
  }, corpus);
  assert.deepEqual(r.securite.map((s) => s.verifie), [true, false]);
});
