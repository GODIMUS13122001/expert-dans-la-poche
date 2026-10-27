// Page expert : le senior colle ou dépose sa note, l'agent la découpe et range chaque astuce
// sous le code défaut ou l'équipement concerné. Les astuces servent ensuite dans les réponses.
import { useRef, useState } from "react";
import { ArrowRight, ChevronDown, FileUp, Sparkles, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { BorderTrail } from "@/components/motion-primitives/border-trail";
import { Magnetic } from "@/components/motion-primitives/magnetic";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/motion-primitives/disclosure";
import { Attente } from "@/components/Attente";
import { EASE, NombreGlissant, SurTitreBrouille, TitreMots, bascule, cascade, glisse, monte } from "@/components/anime";
import { Entete } from "@/components/ui";
import { api } from "@/api";
import type { Astuce } from "@/types";

type Resultat = { auteur: string; astuces: Astuce[]; ignores: { texte: string; raison: string }[]; total: number };

// Ce que fait l'assistant pour chaque note, affiché pendant l'attente.
const METHODE = [
  "Lit la note telle quelle",
  "La découpe en astuces",
  "Range chacune sous son code ou sa machine",
  "Signale les écarts avec les documents officiels",
];

const LIBELLE_TYPE: Record<Astuce["type_cible"], string> = {
  code_defaut: "Code défaut",
  equipement: "Équipement",
  procedure: "Procédure",
  reference_produit: "Référence produit",
};

export default function Expert() {
  const [texte, setTexte] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const entree = useRef<HTMLInputElement>(null);

  async function exemple() {
    const etat = await api.admin();
    const rex = etat.docs.find((d: any) => d.statut === "retour_experience");
    if (rex) {
      setFichier(null);
      // Retire le balisage Markdown de l'extraction pour retrouver une note brute.
      const brut = rex.apercu
        .split("\n")
        .filter((l: string) => !/^\|[\s-|]+\|$/.test(l))
        .map((l: string) => l.replace(/^#+\s*/, "").replace(/^\|\s*(.*?)\s*\|\s*(.*?)\s*\|$/, "$1 : $2"))
        .join("\n");
      setTexte(brut);
    }
  }

  async function ranger() {
    setErreur(null);
    setEnCours(true);
    setResultat(null);
    const donnees = new FormData();
    if (fichier) donnees.append("fichier", fichier);
    else donnees.append("texte", texte);
    try {
      setResultat(await api.note(donnees));
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(false);
    }
  }

  const groupes = resultat
    ? Object.entries(resultat.astuces.reduce<Record<string, Astuce[]>>((acc, a) => ((acc[a.cible] ??= []).push(a), acc), {}))
    : [];

  return (
    <div className="relative min-h-dvh overflow-x-clip pb-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[480px] overflow-hidden">
        <div className="halo absolute -top-48 -right-40 size-[440px] rounded-full bg-[radial-gradient(circle,rgb(110_17_240/0.16)_0%,rgb(110_17_240/0)_68%)]" />
      </div>
      <Entete />
      <main className="relative mx-auto max-w-xl space-y-4 px-4">
        <section className="pt-8 md:pt-14">
          <SurTitreBrouille texte="Note de départ d'un expert" className="text-violet" />
          <TitreMots texte="Transmettre *son savoir*" delai={0.25} className="mt-4 text-[46px] md:text-[60px]" />
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55, ease: EASE }}
            className="mt-5 text-[16px] leading-relaxed text-gris-texte"
          >
            Collez vos notes, même en vrac : chaque astuce est rangée sous son code défaut ou sa machine.
          </motion.p>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 26, rotateX: 14, transformPerspective: 900 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.85, delay: 0.7, ease: EASE }}
          className="relative overflow-hidden rounded-[22px] bg-papier p-2 shadow-[0_10px_34px_rgb(10_10_15/0.06)] ring-1 ring-filet focus-within:ring-violet/40"
        >
          {enCours && <BorderTrail className="bg-gradient-to-l from-violet via-magenta to-violet-profond" size={110} />}
          <AnimatePresence mode="wait" initial={false}>
            {fichier ? (
              <motion.div key="fichier" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-between gap-3 p-3">
                <p className="flex min-w-0 items-center gap-3 text-[15px]">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-creme-doux text-violet"><FileUp className="size-5" /></span>
                  <span className="truncate">{fichier.name}</span>
                </p>
                <button type="button" onClick={() => setFichier(null)} aria-label="Retirer le fichier" className="grid size-11 shrink-0 place-items-center rounded-full text-gris hover:bg-creme-doux">
                  <X className="size-4" />
                </button>
              </motion.div>
            ) : (
              <motion.textarea
                key="texte"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                rows={9}
                placeholder="E508 : avant d'appeler qui que ce soit, je regarde les vannes V1 et V2…"
                aria-label="Note de l'expert"
                className="block w-full resize-y rounded-2xl bg-transparent p-3 text-[16px] leading-relaxed outline-none placeholder:text-gris"
              />
            )}
          </AnimatePresence>
          <div className="flex flex-wrap items-center gap-2 border-t border-filet p-2">
            <input
              ref={entree}
              type="file"
              accept=".docx,.txt,.md"
              className="hidden"
              onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
            />
            <button type="button" onClick={() => entree.current?.click()} className="min-h-11 rounded-full bg-creme-doux px-4 font-mono text-[11px] transition-colors hover:bg-violet/10">
              Déposer un fichier
            </button>
            <button type="button" onClick={exemple} className="min-h-11 rounded-full bg-creme-doux px-4 font-mono text-[11px] transition-colors hover:bg-violet/10">
              Exemple : note de Michel B.
            </button>
            <div className="w-full sm:ml-auto sm:w-auto">
            <Magnetic intensity={0.2} range={110} springOptions={{ stiffness: 180, damping: 18, mass: 0.4 }}>
            <motion.button
              type="button"
              onClick={ranger}
              whileTap={{ scale: 0.96 }}
              disabled={enCours || (!texte.trim() && !fichier)}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-violet px-5 sm:w-auto text-[15px] text-papier transition-[opacity,background-color] hover:bg-violet-profond disabled:opacity-30"
            >
              <Sparkles className="size-4" /> Ranger la note
            </motion.button>
            </Magnetic>
            </div>
          </div>
        </motion.section>

        <AnimatePresence>
          {erreur && (
            <motion.p role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl border border-magenta/40 bg-papier p-4 text-[14px] text-magenta-texte">
              {erreur}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {enCours && (
            <motion.div key="attente" exit={{ opacity: 0 }} className="pt-2">
              <Attente titre="Rangement de la note" etapes={METHODE} dureeBarre={20} />
            </motion.div>
          )}
          {resultat && (
            <motion.div key="resultat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-4">
              <div className="flex items-end justify-between gap-3 px-1">
                <h2 className="text-[30px]">
                  <span className="text-violet"><span className="inline-block align-[-4px]"><NombreGlissant valeur={resultat.astuces.length} delai={0.2} /></span></span> astuce{resultat.astuces.length > 1 ? "s" : ""} <em>rangée{resultat.astuces.length > 1 ? "s" : ""}</em>
                </h2>
                <p className="pb-1 font-mono text-[11px] text-gris-texte">{resultat.auteur}</p>
              </div>

              <motion.div variants={cascade(0.12, 0.2)} initial="cache" animate="visible" className="space-y-3">
                {groupes.map(([cible, liste]) => (
                  <motion.div key={cible} variants={bascule} className="rounded-[22px] bg-papier p-5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-serif text-[26px] leading-none">{cible}</span>
                      <span className="font-mono text-[10.5px] text-gris-texte">
                        {LIBELLE_TYPE[liste[0].type_cible]}{liste[0].equipement ? ` · ${liste[0].equipement}` : ""}
                      </span>
                    </div>
                    <motion.ul variants={cascade(0.1, 0.3)} className="mt-3 space-y-4">
                      {liste.map((a) => (
                        <motion.li key={a.id} variants={monte} className="border-t border-filet pt-3 first:border-0 first:pt-0">
                          <p className="text-[15.5px] leading-snug">{a.texte}</p>
                          {a.ecart_reference && (
                            <p className="mt-2 flex gap-2 rounded-xl bg-rose-doux/40 px-3 py-2 text-[13.5px] leading-snug text-magenta-texte">
                              <span className="mt-[6px] size-1.5 shrink-0 rounded-full bg-magenta" />
                              <span>Écart avec la référence : {a.ecart_reference}</span>
                            </p>
                          )}
                          <Disclosure className="mt-1" transition={{ type: "spring", bounce: 0, duration: 0.3 }}>
                            <DisclosureTrigger>
                              <button type="button" className="group -ml-1 inline-flex min-h-11 items-center gap-1 px-1 font-mono text-[11px] text-violet">
                                Passage d'origine <ChevronDown className="size-3 transition-transform duration-300 group-aria-expanded:rotate-180" />
                              </button>
                            </DisclosureTrigger>
                            <DisclosureContent>
                              <p className="mb-1 border-l-2 border-violet-doux pl-3 font-serif text-[15px] italic text-encre-douce">{a.citation}</p>
                            </DisclosureContent>
                          </Disclosure>
                        </motion.li>
                      ))}
                    </motion.ul>
                  </motion.div>
                ))}
              </motion.div>

              {resultat.ignores.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 + groupes.length * 0.12, ease: EASE }} className="rounded-[22px] bg-creme-doux p-5">
                  <p className="sur-titre text-gris">Mis de côté · {resultat.ignores.length}</p>
                  <motion.ul variants={cascade(0.08, 0.6 + groupes.length * 0.12)} initial="cache" animate="visible" className="mt-3 space-y-2">
                    {resultat.ignores.map((x, i) => (
                      <motion.li key={i} variants={glisse} className="text-[14px] leading-snug text-encre-douce">
                        « {x.texte} » <span className="text-gris-texte">· {x.raison}</span>
                      </motion.li>
                    ))}
                  </motion.ul>
                </motion.div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <a href="/" className="group inline-flex min-h-11 items-center gap-1.5 font-mono text-[11px] text-violet">
                  Tester sur le terrain <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
                <button
                  type="button"
                  onClick={() => api.viderAstuces().then(() => setResultat(null))}
                  className="inline-flex min-h-11 items-center gap-1.5 font-mono text-[11px] text-gris-texte hover:text-magenta-texte"
                >
                  <Trash2 className="size-3.5" /> Vider la base d'astuces
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
