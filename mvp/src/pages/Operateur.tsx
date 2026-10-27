// Page opérateur : une question, une réponse sourcée. Pensée pour un téléphone tenu d'une main.
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUp, Mic, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { TextLoop } from "@/components/motion-primitives/text-loop";
import { GlowEffect } from "@/components/motion-primitives/glow-effect";
import { ProgressiveBlur } from "@/components/motion-primitives/progressive-blur";
import { CarteReponse } from "@/components/CarteReponse";
import { Attente } from "@/components/Attente";
import { EASE, NombreGlissant, SurTitreBrouille, TitreMots, bascule, cascade } from "@/components/anime";
import { Entete, nomCourt } from "@/components/ui";
import { cn } from "@/lib/utils";
import { api } from "@/api";
import type { Reponse } from "@/types";

const SUGGESTIONS = [
  { code: "E508", question: "La PI-180 affiche E508, je fais quoi ?" },
  { code: "Sécurité", question: "Comment je consigne la presse ?" },
  { code: "E310", question: "La porte ne se verrouille pas, je peux shunter le capteur pour finir la série ?" },
];

// Bandeau qui défile : questions courtes de l'atelier, un doigt suffit.
const BANDEAU = [
  { libelle: "E508 sur la PI-180", question: "La PI-180 affiche E508, je fais quoi ?" },
  { libelle: "Couple des brides", question: "Quel couple pour serrer les brides au changement de moule sur la PI-180 ?" },
  { libelle: "Bavures sur les pièces", question: "J'ai des bavures sur les pièces qui sortent de la PI-180, c'est acceptable ?" },
  { libelle: "Consigner la presse", question: "Comment je consigne la presse ?" },
  { libelle: "E101 qui revient", question: "E101 qui revient de temps en temps sur la PI-180, une idée ?" },
  { libelle: "Fourreau prise 16 A", question: "Quelle température de fourreau pour injecter la référence de prise 16 A ?" },
];

const EXEMPLES = ["E508 sur la PI-180", "Comment je consigne la presse ?", "Couple des brides du moule", "Bavures, c'est acceptable ?"];

type Echange = { question: string; reponse: Reponse };

// Dictée native du navigateur (Chrome, Safari) : rien à installer, absente ailleurs.
const Reconnaissance = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

// Ce que fait l'assistant pour chaque question, affiché pendant l'attente.
const METHODE = [
  "Lit les documents de l'atelier",
  "Garde la version en vigueur",
  "Recopie la sécurité mot pour mot",
  "Ajoute les astuces des seniors",
  "Cite chaque source",
];

export default function Operateur() {
  const [question, setQuestion] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [echanges, setEchanges] = useState<Echange[]>([]);
  const [documents, setDocuments] = useState<string[]>([]);
  const [ecoute, setEcoute] = useState(false);
  const [posee, setPosee] = useState("");
  const [focus, setFocus] = useState(false);
  const champ = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.admin()
      .then((e) => setDocuments(e.docs.filter((d: any) => d.etat === "charge").map((d: any) => nomCourt(d.fichier))))
      .catch(() => setDocuments([]));
  }, []);

  // Le champ grandit avec le texte, jusqu'à quatre lignes.
  useEffect(() => {
    const el = champ.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [question]);

  const dernier = echanges.at(-1);

  async function envoyer(texte = question) {
    const q = texte.trim();
    if (!q || enCours) return;
    setPosee(q);
    setQuestion("");
    setErreur(null);
    setEnCours(true);
    champ.current?.blur();
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const { reponse } = await api.question(q, echanges.slice(-2));
      setEchanges((e) => [...e, { question: q, reponse }]);
    } catch (e) {
      setErreur((e as Error).message);
      setQuestion(q);
    } finally {
      setEnCours(false);
    }
  }

  function dicter() {
    if (!Reconnaissance) return;
    const r = new Reconnaissance();
    r.lang = "fr-FR";
    r.interimResults = false;
    r.onresult = (e: any) => {
      const texte = e.results[0][0].transcript;
      setQuestion(texte);
      envoyer(texte);
    };
    r.onend = () => setEcoute(false);
    setEcoute(true);
    r.start();
  }

  return (
    <div className="relative min-h-dvh overflow-x-clip pb-44">
      {/* Halo violet qui respire en haut de page */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[560px] overflow-hidden">
        <div className="halo absolute -top-40 -right-32 size-[460px] rounded-full bg-[radial-gradient(circle,rgb(110_17_240/0.22)_0%,rgb(110_17_240/0)_68%)]" />
        <div className="halo absolute top-40 -left-40 size-[340px] rounded-full bg-[radial-gradient(circle,rgb(255_208_229/0.55)_0%,rgb(255_208_229/0)_70%)] [animation-delay:-5s]" />
      </div>

      <Entete />
      <main className="relative mx-auto max-w-xl px-4">
        <AnimatePresence mode="wait">
          {enCours ? (
            <motion.div key="attente" exit={{ opacity: 0, transition: { duration: 0.25 } }} className="space-y-4 pt-6">
              <BulleQuestion texte={posee} />
              <Attente titre="Recherche dans les documents" etapes={METHODE} />
            </motion.div>
          ) : dernier ? (
            <motion.div key={`reponse-${echanges.length}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} className="space-y-4 pt-6">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setEchanges([])}
                  className="-mr-2 flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] text-violet transition-colors hover:bg-violet/5"
                >
                  <RotateCcw className="size-3.5" /> Nouvelle question
                </button>
              </div>
              <BulleQuestion texte={dernier.question} />
              <CarteReponse reponse={dernier.reponse} />
            </motion.div>
          ) : (
            <Accueil key="accueil" nbDocs={documents.length} onChoisir={envoyer} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {erreur && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, x: 0 }}
              animate={{ opacity: 1, x: [0, -8, 7, -4, 2, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-4 rounded-2xl border border-magenta/40 bg-papier p-4 text-[14px] text-magenta-texte"
            >
              {erreur}
            </motion.p>
          )}
        </AnimatePresence>
      </main>

      {/* Zone de saisie, toujours sous le pouce */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          envoyer();
        }}
        className="fixed inset-x-0 bottom-0 z-30 px-3 pt-10 pb-[max(14px,env(safe-area-inset-bottom))]"
      >
        <ProgressiveBlur direction="bottom" blurIntensity={0.6} className="pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-creme from-35% to-creme/0" />
        <div className="relative mx-auto max-w-xl">
        {/* Halo qui tourne lentement autour du champ quand il est actif */}
        <AnimatePresence>
          {focus && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute -inset-1">
              <GlowEffect colors={["#C9A9FF", "#6E11F0", "#FFD0E5", "#C9A9FF"]} mode="rotate" blur="stronger" duration={7} className="rounded-[32px] opacity-45" />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
          className={cn(
            "relative mx-auto flex max-w-xl items-end gap-2 rounded-[28px] bg-papier p-2 ring-1 transition-[box-shadow,--tw-ring-color] duration-300",
            focus ? "shadow-[0_14px_44px_rgb(110_17_240/0.2)] ring-violet/40" : "shadow-[0_10px_34px_rgb(10_10_15/0.1)] ring-filet",
          )}
        >
          <div className="relative min-w-0 flex-1">
            <textarea
              ref={champ}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  envoyer();
                }
              }}
              rows={1}
              enterKeyHint="send"
              placeholder={ecoute ? "J'écoute…" : focus ? "Code défaut ou question…" : ""}
              aria-label="Votre question : code défaut ou question"
              className="block max-h-32 min-h-12 w-full resize-none bg-transparent px-3 py-3 text-[17px] leading-6 outline-none placeholder:text-gris"
            />
            {/* Exemples qui s'enchaînent tant que le champ est vide */}
            {!question && !focus && !ecoute && (
              <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 right-1 flex items-center overflow-hidden text-[17px] text-gris">
                                <TextLoop interval={2.6} mode="wait" transition={{ duration: 0.35, ease: EASE }} className="min-w-0 flex-1">
                  {EXEMPLES.map((x) => <span key={x} className="block truncate">{x}</span>)}
                </TextLoop>
              </div>
            )}
          </div>
          {Reconnaissance && (
            <button
              type="button"
              onClick={dicter}
              aria-label="Dicter la question"
              aria-pressed={ecoute}
              className={cn(
                "relative grid size-12 shrink-0 place-items-center rounded-full transition-colors duration-300",
                ecoute ? "bg-magenta text-papier" : "bg-creme-doux text-encre hover:bg-violet/10",
              )}
            >
              {ecoute && <span className="respire absolute inset-0 rounded-full bg-magenta/40" />}
              <Mic className="relative size-5" />
            </button>
          )}
          <motion.button
            type="submit"
            disabled={!question.trim() || enCours}
            aria-label="Envoyer"
            whileTap={{ scale: 0.92 }}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-violet text-papier transition-[opacity,background-color] duration-300 hover:bg-violet-profond disabled:opacity-30"
          >
            {enCours ? (
              <motion.span
                className="size-5 rounded-full border-2 border-papier/30 border-t-papier"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <ArrowUp className="size-5" />
            )}
          </motion.button>
        </motion.div>
        </div>
      </form>
    </div>
  );
}

// La question posée, en bulle alignée à droite comme dans le deck.
function BulleQuestion({ texte }: { texte: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="ml-auto w-fit max-w-[88%] rounded-[20px_20px_6px_20px] bg-encre px-4 py-3 text-[16px] leading-snug text-creme"
    >
      {texte}
    </motion.div>
  );
}

function Accueil({ nbDocs, onChoisir }: { nbDocs: number; onChoisir: (q: string) => void }) {
  return (
    <motion.div exit={{ opacity: 0, y: -16, filter: "blur(6px)", transition: { duration: 0.35 } }} className="pt-8 md:pt-14">
      <SurTitreBrouille texte="Atelier injection · ligne LA-07" className="text-violet" />
      <TitreMots texte="Un incident ? *Demandez.*" delai={0.25} reflet className="mt-4 text-[48px] md:text-[64px]" />
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6, ease: EASE }}
        className="mt-5 max-w-sm text-[16px] leading-relaxed text-gris-texte"
      >
        La réponse tirée des{" "}
        {nbDocs > 0 && <span className="inline-block align-[-3px] font-serif text-[21px] leading-none text-violet"><NombreGlissant valeur={nbDocs} delai={0.8} /></span>}{" "}
        documents de l'atelier, source citée.
      </motion.p>

      {/* Bandeau de questions qui défile */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.9 }}
        className="relative -mx-4 mt-8 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] motion-reduce:overflow-x-auto"
      >
        <ul className="defile flex w-max gap-2 px-4 py-1">
          {[...BANDEAU, ...BANDEAU].map((b, i) => {
            const copie = i >= BANDEAU.length;
            return (
              <li key={i} aria-hidden={copie || undefined}>
                <button
                  type="button"
                  tabIndex={copie ? -1 : 0}
                  onClick={() => onChoisir(b.question)}
                  className="flex min-h-11 items-center gap-2 rounded-full border border-filet-fort bg-papier/80 px-4 font-mono text-[12px] whitespace-nowrap text-encre-douce transition-colors duration-300 hover:border-violet hover:text-violet active:bg-creme-doux"
                >
                  <span className="size-1.5 rounded-full bg-violet" />
                  {b.libelle}
                </button>
              </li>
            );
          })}
        </ul>
      </motion.div>

      <motion.ul variants={cascade(0.12, 1)} initial="cache" animate="visible" className="mt-6 grid gap-2">
        {SUGGESTIONS.map((s) => (
          <motion.li key={s.code} variants={bascule}>
            <button
              type="button"
              onClick={() => onChoisir(s.question)}
              className="group flex min-h-16 w-full items-center gap-3 rounded-[18px] bg-papier px-4 py-3.5 text-left shadow-[0_1px_0_rgb(10_10_15/0.05)] transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgb(110_17_240/0.12)] active:scale-[0.99]"
            >
              <span className="w-[72px] shrink-0 font-mono text-[11px] tracking-wide text-violet uppercase">{s.code}</span>
              <span className="flex-1 text-[15.5px] leading-snug">{s.question}</span>
              <ArrowRight className="size-4 shrink-0 text-gris transition-transform duration-300 group-hover:translate-x-1 group-hover:text-violet" />
            </button>
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  );
}
