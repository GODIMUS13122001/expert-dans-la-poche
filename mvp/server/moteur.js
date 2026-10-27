// Moteur sans clé API : chaque appel pilote Claude Code (`claude -p`) avec le compte Claude connecté sur la machine,
// comme le préparateur de visite. Aucun outil, aucun réglage personnel chargé : le prompt système fait foi.
import { spawn, execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

export const MODELE = "sonnet";

export class ErreurMoteur extends Error {
  constructor(message, code) {
    super(message);
    this.code = code; // "absent", "connexion", "quota", "reseau", "illisible"
  }
}

function classer(texte) {
  if (/ENOENT/.test(texte)) return new ErreurMoteur("Claude Code n'est pas installé sur cette machine.", "absent");
  if (/not logged in|login|authenticat|401/i.test(texte)) return new ErreurMoteur("Compte Claude non connecté : lancer « claude auth login ».", "connexion");
  if (/rate limit|usage limit|429|quota/i.test(texte)) return new ErreurMoteur("Quota du compte Claude atteint, réessayer plus tard.", "quota");
  if (/ENOTFOUND|ECONNREFUSED|network|fetch failed/i.test(texte)) return new ErreurMoteur("Réseau indisponible : impossible de joindre Claude.", "reseau");
  return new ErreurMoteur(texte.slice(0, 300) || "Erreur inconnue de Claude Code.", "inconnu");
}

// systeme : texte du prompt système ; prompt : message utilisateur ; schema : schéma zod de la réponse attendue.
export async function appelClaude({ systeme, prompt, schema }) {
  const dossier = await fs.mkdtemp(path.join(os.tmpdir(), "expert-poche-"));
  const fichierSysteme = path.join(dossier, "systeme.txt");
  await fs.writeFile(fichierSysteme, systeme);
  const { $schema, ...jsonSchema } = z.toJSONSchema(schema); // le CLI refuse la clé $schema (draft 2020-12)
  const args = [
    "-p", "--model", MODELE, "--output-format", "json",
    "--system-prompt-file", fichierSysteme,
    "--json-schema", JSON.stringify(jsonSchema),
    "--tools", "", "--setting-sources", "local", "--no-session-persistence",
  ];
  const debut = Date.now();
  try {
    const sortie = await new Promise((resolve, reject) => {
      const proc = spawn("claude", args, { cwd: dossier, stdio: ["pipe", "pipe", "pipe"] });
      let out = "", err = "";
      proc.stdout.on("data", (d) => (out += d));
      proc.stderr.on("data", (d) => (err += d));
      proc.on("error", (e) => reject(classer(String(e))));
      const minuteur = setTimeout(() => { proc.kill(); reject(new ErreurMoteur("Claude met trop de temps à répondre, réessayer.", "delai")); }, 180_000);
      proc.on("close", (code) => {
        clearTimeout(minuteur);
        let json;
        try { json = JSON.parse(out); } catch { return reject(classer(err || out)); }
        if (code !== 0 || json.is_error) return reject(classer(String(json.result ?? err)));
        resolve(json);
      });
      proc.stdin.end(prompt);
    });
    const parse = schema.safeParse(sortie.structured_output);
    if (!parse.success) throw new ErreurMoteur("Réponse illisible, réessayer.", "illisible");
    return { donnees: parse.data, usage: { ...sortie.usage, dureeMs: Date.now() - debut, modele: Object.keys(sortie.modelUsage ?? {})[0] ?? MODELE } };
  } finally {
    fs.rm(dossier, { recursive: true, force: true });
  }
}

// État du compte pour l'admin : { connecte, email, abonnement }
export function etatCompte() {
  return new Promise((resolve) => {
    execFile("claude", ["auth", "status", "--json"], { timeout: 20_000 }, (e, out) => {
      try {
        const st = JSON.parse(out);
        resolve({ connecte: Boolean(st.loggedIn), email: st.email ?? null, abonnement: st.subscriptionType ?? null });
      } catch {
        resolve({ connecte: false, email: null, abonnement: null });
      }
    });
  });
}
