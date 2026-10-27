// Serveur unique : API + interface. `npm start` construit puis sert ; `npm run dev` sert avec Vite à chaud.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import mammoth from "mammoth";
import { chargerCorpus, STATUTS } from "./corpus.js";
import { repondre, MODELE } from "./assistant.js";
import { ErreurMoteur, etatCompte } from "./moteur.js";
import { rangerNote, lireAstuces, ajouterAstuces } from "./expert.js";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, "..");
const DOSSIER_CORPUS = process.env.CORPUS_DIR ?? path.resolve(RACINE, "../corpus");
const REGISTRE = path.join(RACINE, "data/registre.json");
const ASTUCES = path.join(RACINE, "data/astuces.json");
const PORT = Number(process.env.PORT ?? 5173);
const DEV = process.argv.includes("--dev");

const lireRegistre = async () => JSON.parse(await fs.readFile(REGISTRE, "utf8").catch(() => "{}"));

let corpus = await chargerCorpus(DOSSIER_CORPUS, await lireRegistre());
let derniereUsage = null; // dernier appel : sert à montrer le cache de prompt dans l'admin
console.log(`Corpus : ${corpus.docs.filter((d) => d.etat === "charge").length}/${corpus.docs.length} documents chargés depuis ${DOSSIER_CORPUS}`);

const app = express();
app.use(express.json({ limit: "1mb" }));

// Pas d'écriture déclenchée depuis un autre site (CSRF) : l'origine doit être la page servie ici.
app.use((req, res, next) => {
  const origine = req.get("origin");
  if (req.method === "GET" || !origine) return next();
  let memeHote = false;
  try { memeHote = new URL(origine).host === req.get("host"); } catch {}
  if (!memeHote) return res.status(403).json({ erreur: "Origine refusée" });
  next();
});
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const STATUT_HTTP = { absent: 500, connexion: 500, quota: 429, reseau: 503, delai: 504, illisible: 502 };

function erreurApi(res, e) {
  console.error(e);
  if (e instanceof ErreurMoteur) return res.status(STATUT_HTTP[e.code] ?? 500).json({ erreur: e.message });
  return res.status(500).json({ erreur: e.message ?? "Erreur inconnue" });
}

// ---------------------------------------------------------------- opérateur

app.post("/api/question", async (req, res) => {
  const question = String(req.body?.question ?? "").trim();
  if (!question) return res.status(400).json({ erreur: "Question vide." });
  try {
    const sortie = await repondre({ question, historique: req.body.historique ?? [], corpus, astuces: await lireAstuces(ASTUCES) });
    derniereUsage = { ...sortie.usage, le: new Date().toISOString() };
    res.json(sortie);
  } catch (e) {
    erreurApi(res, e);
  }
});

// ---------------------------------------------------------------- expert

app.post("/api/expert/note", upload.single("fichier"), async (req, res) => {
  try {
    let texte = String(req.body?.texte ?? "").trim();
    let nomFichier = "note-collee.txt";
    if (req.file) {
      nomFichier = req.file.originalname;
      texte = nomFichier.toLowerCase().endsWith(".docx")
        ? (await mammoth.extractRawText({ buffer: req.file.buffer })).value
        : req.file.buffer.toString("utf8");
    }
    if (!texte) return res.status(400).json({ erreur: "Note vide." });
    const rangement = await rangerNote({ texte, nomFichier, corpus });
    const { nouvelles, toutes } = await ajouterAstuces(ASTUCES, rangement, nomFichier);
    res.json({ auteur: rangement.auteur, astuces: nouvelles, ignores: rangement.ignores, total: toutes.length });
  } catch (e) {
    erreurApi(res, e);
  }
});

app.delete("/api/expert/astuces", async (_req, res) => {
  await fs.writeFile(ASTUCES, "[]");
  res.json({ ok: true });
});

// ---------------------------------------------------------------- admin

app.get("/api/admin", async (_req, res) => {
  const astuces = await lireAstuces(ASTUCES);
  res.json({
    docs: corpus.docs.map(({ texte, ...d }) => ({ ...d, apercu: texte })),
    alertes: corpus.alertes,
    chargeLe: corpus.chargeLe,
    dureeMs: corpus.dureeMs,
    dossier: DOSSIER_CORPUS,
    statuts: STATUTS,
    astuces,
    modele: MODELE,
    compte: await etatCompte(),
    derniereUsage,
  });
});

app.post("/api/admin/recharger", async (_req, res) => {
  corpus = await chargerCorpus(DOSSIER_CORPUS, await lireRegistre());
  res.json({ ok: true, chargeLe: corpus.chargeLe });
});

app.put("/api/admin/statut", async (req, res) => {
  const { fichier, statut } = req.body ?? {};
  if (!STATUTS[statut]) return res.status(400).json({ erreur: "Statut inconnu." });
  const registre = await lireRegistre();
  registre[fichier] = { statut, note: `Qualifié depuis l'admin le ${new Date().toLocaleDateString("fr-FR")}` };
  await fs.writeFile(REGISTRE, JSON.stringify(registre, null, 2));
  corpus = await chargerCorpus(DOSSIER_CORPUS, registre);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- interface

if (DEV) {
  const { createServer } = await import("vite");
  const vite = await createServer({ root: RACINE, server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
} else {
  const dist = path.join(RACINE, "dist");
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

// Local par défaut : sans authentification, n'importe qui sur le réseau consommerait le quota Claude.
// Pour une démo sur téléphone : HOST=0.0.0.0 npm start
const HOTE = process.env.HOST ?? "127.0.0.1";
app.listen(PORT, HOTE, () => {
  console.log(`L'expert dans la poche : http://localhost:${PORT}  (admin : /admin, expert : /expert)${HOTE === "0.0.0.0" ? "  · ouvert au réseau local" : ""}`);
  etatCompte().then((c) => console.log(c.connecte ? `Compte Claude connecté : ${c.email}` : "⚠ Compte Claude non connecté : lancer « claude auth login »."));
});
