// Page admin : prouver que chaque document du dossier corpus/ est bien lu par l'assistant,
// voir ce qui en a été extrait, qualifier son statut et repérer les trous du corpus.
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, Maximize2, FileSpreadsheet, FileText, RefreshCw, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { CocheTracee, EASE, Filet, NombreAnime, NombreGlissant, SurTitreBrouille, TitreMots, bascule, cascade, glisse } from "@/components/anime";
import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogSubtitle,
  MorphingDialogTitle,
  MorphingDialogTrigger,
} from "@/components/motion-primitives/morphing-dialog";
import { Magnetic } from "@/components/motion-primitives/magnetic";
import { COULEUR_STATUT, Entete, STYLE_STATUT } from "@/components/ui";
import { cn } from "@/lib/utils";
import { api } from "@/api";
import type { DocAdmin, EtatAdmin, Statut } from "@/types";

const ko = (o: number) => `${(o / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Ko`;

function Indicateur({ libelle, valeur, total, delai }: { libelle: string; valeur: number; total?: number; delai: number }) {
  return (
    <motion.div variants={bascule} className="flex flex-col rounded-[22px] bg-papier p-5">
      <p className="sur-titre text-gris">{libelle}</p>
      <p className="mt-3 font-serif text-[40px] leading-none md:text-[48px]">
        <span className="inline-block align-bottom"><NombreGlissant valeur={valeur} delai={delai} /></span>
        {total !== undefined && <span className="text-[22px] text-gris"> / {total}</span>}
      </p>
      <Filet className="degrade mt-3 h-[3px] w-10 rounded-full" delai={delai + 0.4} />
    </motion.div>
  );
}

// Graphique : part de chaque document dans le contexte envoyé au modèle, couleur = statut.
function RepartitionTokens({ docs, statuts }: { docs: DocAdmin[]; statuts: EtatAdmin["statuts"] }) {
  const charges = docs.filter((d) => d.etat === "charge").sort((a, b) => b.tokens - a.tokens);
  const max = Math.max(...charges.map((d) => d.tokens), 1);
  const presents = [...new Set(charges.map((d) => d.statut))];
  return (
    <section className="rounded-[22px] bg-papier p-5 md:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="sur-titre text-gris">Contexte envoyé au modèle</p>
          <TitreMots as="h2" texte="Ce que pèse *chaque document*" delai={0.6} className="mt-2 text-[28px]" />
        </div>
        <div className="flex flex-wrap gap-3">
          {presents.map((s) => (
            <span key={s} className="flex items-center gap-1.5 font-mono text-[11px] text-gris">
              <span className="size-2.5 rounded-sm" style={{ background: COULEUR_STATUT[s] }} /> {statuts[s]}
            </span>
          ))}
        </div>
      </div>
      <ul className="space-y-2.5">
        {charges.map((d, i) => (
          <li key={d.fichier} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 md:grid-cols-[260px_minmax(0,1fr)_70px]">
            <span className="truncate text-[13px]" title={d.fichier}>{d.fichier}</span>
            <span className="text-right font-mono text-[11px] text-gris-texte md:order-last">≈ <NombreAnime valeur={d.tokens} delai={0.8 + i * 0.06} duree={1000} /></span>
            <div className="col-span-2 h-2.5 rounded-full bg-creme-doux md:col-span-1">
              <motion.div
                className="h-full rounded-full"
                style={{ background: COULEUR_STATUT[d.statut] }}
                initial={{ width: 0 }}
                animate={{ width: `${(d.tokens / max) * 100}%` }}
                transition={{ duration: 0.9, delay: 0.8 + i * 0.06, ease: EASE }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LigneDocument({ doc, statuts, onStatut }: { doc: DocAdmin; statuts: EtatAdmin["statuts"]; onStatut: (s: Statut) => void }) {
  const Icone = doc.format === "Excel" ? FileSpreadsheet : FileText;
  return (
    <div className="flex flex-col gap-3 rounded-[22px] bg-papier p-3 md:flex-row md:items-center md:gap-4 md:p-4">
      {/* Le document s'ouvre en grand sur son texte extrait */}
      <MorphingDialog transition={{ type: "spring", bounce: 0.05, duration: 0.5 }}>
        <MorphingDialogTrigger className="group flex min-w-0 flex-1 items-start gap-3 rounded-2xl p-1 text-left transition-colors hover:bg-creme">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-creme-doux text-violet">
            <Icone className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <MorphingDialogTitle className="truncate font-medium">{doc.fichier}</MorphingDialogTitle>
            <MorphingDialogSubtitle className="truncate text-[13px] text-gris-texte">{doc.titre}</MorphingDialogSubtitle>
            <p className="mt-1 font-mono text-[10.5px] text-gris-texte">
              {doc.format} · {ko(doc.octets)} · {doc.sections} section{doc.sections > 1 ? "s" : ""}
            </p>
          </div>
          <Maximize2 className="mt-1 size-4 shrink-0 text-gris opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
          <span className="sr-only">Ouvrir le texte extrait</span>
        </MorphingDialogTrigger>
        <MorphingDialogContainer>
          <MorphingDialogContent className="relative flex max-h-[86dvh] w-full max-w-3xl flex-col rounded-[26px] bg-papier p-5 shadow-[0_40px_120px_rgb(10_10_15/0.3)] md:p-8">
            <div className="flex items-start gap-3 pr-10">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-creme-doux text-violet">
                <Icone className="size-5" />
              </span>
              <div className="min-w-0">
                <MorphingDialogTitle className="font-serif text-[22px] leading-tight break-words md:text-[28px]">{doc.fichier}</MorphingDialogTitle>
                <MorphingDialogSubtitle className="mt-1 text-[14px] text-gris-texte">{doc.noteStatut}{doc.erreur ? ` · ${doc.erreur}` : ""}</MorphingDialogSubtitle>
              </div>
            </div>
            <motion.pre
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.15, duration: 0.4, ease: EASE }}
              className="mt-5 min-h-0 flex-1 overflow-auto rounded-2xl bg-creme p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-encre-douce md:p-5"
            >
              {doc.apercu || "Aucun texte extrait."}
            </motion.pre>
            <MorphingDialogClose className="top-4 right-4 grid size-11 place-items-center rounded-full text-gris transition-colors hover:bg-creme-doux md:top-6 md:right-6" />
          </MorphingDialogContent>
        </MorphingDialogContainer>
      </MorphingDialog>

      <div className="flex flex-wrap items-center gap-2 pl-1 md:justify-end md:pl-0">
        {doc.etat === "charge" ? (
          <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-violet/10 px-2.5 font-mono text-[11px] text-violet-profond">
            <span className="grid size-4 place-items-center rounded-full bg-violet text-papier"><CocheTracee className="size-2.5" delai={0.6} /></span> Chargé
          </span>
        ) : (
          <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-magenta/10 px-2.5 font-mono text-[11px] text-magenta-texte" title={doc.erreur ?? ""}>
            <XCircle className="size-3.5" /> {doc.etat === "ignore" ? "Ignoré" : "Erreur"}
          </span>
        )}
        <label className={cn("relative rounded-full font-mono text-[11px]", STYLE_STATUT[doc.statut])}>
          <span className="sr-only">Statut de {doc.fichier}</span>
          <select
            value={doc.statut}
            onChange={(e) => onStatut(e.target.value as Statut)}
            disabled={Boolean(doc.remplacePar)}
            className="min-h-11 cursor-pointer appearance-none bg-transparent pr-7 pl-3 outline-none disabled:cursor-default"
          >
            {Object.entries(statuts).map(([k, v]) => <option key={k} value={k} className="text-encre">{v}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2" />
        </label>
      </div>
    </div>
  );
}

export default function Admin() {
  const [etat, setEtat] = useState<EtatAdmin | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recharge, setRecharge] = useState(false);
  const [recharge_ok, setRechargeOk] = useState(false);

  const charger = () => api.admin().then(setEtat).catch((e) => setErreur(e.message));
  useEffect(() => void charger(), []);

  async function recharger() {
    setRecharge(true);
    await api.recharger().catch((e) => setErreur(e.message));
    await charger();
    setRecharge(false);
    setRechargeOk(true);
    setTimeout(() => setRechargeOk(false), 2600);
  }

  async function changerStatut(fichier: string, statut: Statut) {
    await api.statut(fichier, statut).catch((e) => setErreur(e.message));
    await charger();
  }

  if (!etat) {
    return (
      <div className="min-h-dvh">
        <Entete large />
        <div className="mx-auto max-w-6xl px-4 pt-10 md:px-8">
          {erreur ? (
            <p role="alert" className="text-magenta-texte">{erreur}</p>
          ) : (
            <p role="status" className="flex items-center gap-3 text-gris">
              <span className="points text-violet" aria-hidden="true"><i /><i /><i /></span> Lecture du corpus…
            </p>
          )}
        </div>
      </div>
    );
  }

  const charges = etat.docs.filter((d) => d.etat === "charge");
  const tokens = charges.reduce((s, d) => s + d.tokens, 0);
  const parCible = Object.entries(
    etat.astuces.reduce<Record<string, typeof etat.astuces>>((acc, a) => ((acc[a.cible] ??= []).push(a), acc), {}),
  );

  return (
    <div className="relative min-h-dvh overflow-x-clip pb-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[480px] overflow-hidden">
        <div className="halo absolute -top-56 right-0 size-[520px] rounded-full bg-[radial-gradient(circle,rgb(110_17_240/0.14)_0%,rgb(110_17_240/0)_68%)]" />
      </div>
      <Entete large />
      <main className="relative mx-auto max-w-6xl space-y-4 px-4 md:px-8">
        <section className="flex flex-col gap-4 pt-8 pb-2 md:flex-row md:items-end md:justify-between">
          <div>
            <SurTitreBrouille texte="Administration · corpus" className="text-violet" />
            <TitreMots texte="Ce que l'assistant *a lu*" delai={0.2} className="mt-4 text-[42px] md:text-[60px]" />
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <AnimatePresence>
              {recharge_ok && (
                <motion.span
                  role="status"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] text-violet-profond"
                >
                  <CocheTracee className="size-3.5" /> Corpus relu
                </motion.span>
              )}
            </AnimatePresence>
            <Magnetic intensity={0.2} range={110} springOptions={{ stiffness: 180, damping: 18, mass: 0.4 }}>
            <motion.button
              type="button"
              onClick={recharger}
              disabled={recharge}
              whileTap={{ scale: 0.96 }}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-encre px-5 text-[14px] text-creme transition-colors hover:bg-violet-profond disabled:opacity-70"
            >
              <RefreshCw className={cn("size-4", recharge && "animate-spin")} /> {recharge ? "Lecture en cours…" : "Recharger le corpus"}
            </motion.button>
            </Magnetic>
          </div>
        </section>

        {erreur && <p role="alert" className="rounded-2xl border border-magenta/40 bg-papier p-4 text-[14px] text-magenta-texte">{erreur}</p>}

        <motion.div variants={cascade(0.1, 0.3)} initial="cache" animate="visible" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Indicateur libelle="Documents chargés" valeur={charges.length} total={etat.docs.length} delai={0.5} />
          <Indicateur libelle="Tokens en contexte" valeur={tokens} delai={0.6} />
          <Indicateur libelle="Astuces expert" valeur={etat.astuces.length} delai={0.7} />
          <motion.div variants={bascule} className="relative overflow-hidden rounded-[22px] bg-encre p-5 text-creme">
            <div className="halo absolute -top-16 -right-16 size-40 rounded-full bg-[radial-gradient(circle,rgb(110_17_240/0.5)_0%,rgb(110_17_240/0)_70%)]" />
            <p className="sur-titre relative text-violet-doux">Modèle</p>
            <p className="mt-3 font-mono text-[15px]">{etat.modele}</p>
            <p className={cn("mt-2 flex items-center gap-1.5 text-[13px]", etat.compte.connecte ? "text-violet-doux" : "text-rose-doux")}>
              {etat.compte.connecte ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
              {etat.compte.connecte ? `Compte Claude connecté${etat.compte.abonnement ? ` (${etat.compte.abonnement})` : ""}` : "Compte Claude non connecté"}
            </p>
          </motion.div>
        </motion.div>

        {etat.alertes.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6, ease: EASE }} className="rounded-[22px] border border-magenta/30 bg-papier p-5 md:p-6">
            <p className="sur-titre flex items-center gap-2 text-magenta-texte"><AlertTriangle className="size-4" /> Points d'attention du corpus</p>
            <motion.ul variants={cascade(0.1, 0.8)} initial="cache" animate="visible" className="mt-3 space-y-2">
              {etat.alertes.map((a, i) => (
                <motion.li key={i} variants={glisse} className="flex gap-2 text-[14.5px]">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-magenta" />
                  <span>
                    {a.message}
                  </span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.section>
        )}

        <RepartitionTokens docs={etat.docs} statuts={etat.statuts} />

        <section className="space-y-2 pt-4">
          <div className="flex items-end justify-between px-1 pb-1">
            <TitreMots as="h2" texte="Documents du *dossier*" delai={0.9} className="text-[28px]" />
          </div>
          <motion.div variants={cascade(0.07, 1)} initial="cache" animate="visible" className="space-y-2">
            {etat.docs.map((d) => (
              <motion.div key={d.fichier} variants={bascule}>
                <LigneDocument doc={d} statuts={etat.statuts} onStatut={(s) => changerStatut(d.fichier, s)} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        <section className="space-y-2 pt-4">
          <div className="flex items-end justify-between px-1 pb-1">
            <h2 className="text-[28px]">Astuces <em>rangées</em></h2>
            <a href="/expert" className="group inline-flex min-h-11 items-center gap-1.5 font-mono text-[11px] text-violet">
              Déposer une note <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>
          {parCible.length === 0 ? (
            <p className="rounded-[22px] bg-papier p-5 text-[14px] text-gris-texte">Aucune astuce déposée. Le retour d'expérience présent dans le corpus reste utilisé comme document.</p>
          ) : (
            <motion.div variants={cascade(0.08)} initial="cache" whileInView="visible" viewport={{ once: true, margin: "-40px" }} className="grid gap-3 md:grid-cols-2">
              {parCible.map(([cible, liste]) => (
                <motion.div key={cible} variants={bascule} className="rounded-[22px] bg-papier p-5">
                  <p className="flex items-baseline justify-between gap-2">
                    <span className="font-serif text-[22px]">{cible}</span>
                    <span className="font-mono text-[11px] text-gris">{liste[0].equipement ?? "général"}</span>
                  </p>
                  <ul className="mt-2 space-y-2">
                    {liste.map((a) => (
                      <li key={a.id} className="text-[14px] leading-snug">
                        {a.texte}
                        {a.ecart_reference && <span className="mt-1 block text-[12.5px] text-magenta-texte">Écart : {a.ecart_reference}</span>}
                        <span className="mt-1 block font-mono text-[10.5px] text-gris-texte">{a.auteur} · {a.source}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </main>
    </div>
  );
}
