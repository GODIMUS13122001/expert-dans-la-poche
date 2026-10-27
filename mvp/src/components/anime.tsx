// Grammaire de mouvement reprise du deck de synthèse : titres qui montent mot par mot,
// sur-titre brouillé puis recomposé, filets qui se tracent, révélation en cercle, cascade.
import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { AnimatedNumber } from "@/components/motion-primitives/animated-number";
import { SlidingNumber } from "@/components/motion-primitives/sliding-number";
import { cn } from "@/lib/utils";

export const EASE = [0.16, 1, 0.3, 1] as const;
export const EASE_TRACE = [0.3, 0, 0.15, 1] as const;

const calme = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Titre : chaque mot sort de son masque. Les mots entre *astérisques* passent en italique violet.
// `reflet` fait passer un éclat magenta sur les mots en italique une fois posés.
export function TitreMots({
  texte,
  as = "h1",
  className,
  delai = 0,
  pas = 0.08,
  reflet = false,
  clair = false,
}: {
  texte: string;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  delai?: number;
  pas?: number;
  reflet?: boolean;
  clair?: boolean;
}) {
  const Balise = as;
  // Un passage *en italique* peut couvrir plusieurs mots.
  let dansAccent = false;
  const mots = texte.split(" ").map((brut) => {
    const ouvre = brut.startsWith("*");
    if (ouvre) dansAccent = true;
    const accent = dansAccent;
    if (/\*[.,!?…]*$/.test(brut) && (!ouvre || brut.length > 1)) dansAccent = false;
    return { mot: brut.replace(/\*/g, ""), accent };
  });
  return (
    <Balise className={className} aria-label={texte.replace(/\*/g, "")}>
      {mots.map(({ mot, accent }, i) => {
        const anim = {
          initial: { y: "110%" },
          animate: { y: 0 },
          transition: { duration: 0.95, delay: delai + i * pas, ease: EASE },
        };
        return (
          <span key={i} aria-hidden="true" className="mr-[0.22em] -mb-[0.12em] inline-block overflow-hidden pr-[0.04em] pb-[0.12em] align-top last:mr-0">
            {accent ? (
              <motion.em {...anim} className={cn("inline-block", reflet && "reflet", reflet && clair && "reflet-clair")}>
                {mot}
              </motion.em>
            ) : (
              <motion.span {...anim} className="inline-block">
                {mot}
              </motion.span>
            )}
          </span>
        );
      })}
    </Balise>
  );
}

// Sur-titre : les lettres se fixent de gauche à droite, le reste défile (text-scramble du deck).
const SIGNES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export function SurTitreBrouille({ texte, className, delai = 0.1, duree = 0.55 }: { texte: string; className?: string; delai?: number; duree?: number }) {
  const [affiche, setAffiche] = useState(() => (calme() ? texte : texte.replace(/\S/g, " ")));
  useEffect(() => {
    if (calme()) return setAffiche(texte);
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const e = (now - t0) / 1000 - delai;
      const prog = Math.max(0, Math.min(1, e / duree));
      let out = "";
      for (let i = 0; i < texte.length; i++) {
        const c = texte[i];
        out += c === " " || prog * texte.length > i ? c : e < 0 ? " " : SIGNES[Math.floor(Math.random() * SIGNES.length)];
      }
      setAffiche(out);
      if (prog < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [texte, delai, duree]);
  return (
    <p className={cn("sur-titre", className)}>
      <span className="sr-only">{texte}</span>
      <span aria-hidden="true" className="whitespace-pre">{affiche}</span>
    </p>
  );
}

// Filet qui se trace de gauche à droite (ou de haut en bas).
export function Filet({ className, delai = 0, vertical = false }: { className?: string; delai?: number; vertical?: boolean }) {
  return (
    <motion.div
      aria-hidden="true"
      className={cn(vertical ? "origin-top" : "origin-left", className)}
      initial={vertical ? { scaleY: 0 } : { scaleX: 0 }}
      animate={vertical ? { scaleY: 1 } : { scaleX: 1 }}
      transition={{ duration: 0.75, delay: delai, ease: EASE_TRACE }}
    />
  );
}

// Coche dont le trait se dessine.
export function CocheTracee({ className, delai = 0 }: { className?: string; delai?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <motion.path d="M5 12.5l4.2 4.2L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: delai, ease: EASE_TRACE }} />
    </svg>
  );
}

// Révélation en cercle depuis un point (clip-path), comme les changements de scène du deck.
export function RevelationCercle({ children, className, delai = 0, origine = "28px 28px" }: { children: ReactNode; className?: string; delai?: number; origine?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ clipPath: `circle(0px at ${origine})` }}
      animate={{ clipPath: `circle(1400px at ${origine})` }}
      transition={{ duration: 1.05, delay: delai, ease: [0.76, 0, 0.24, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Cascade : le parent orchestre, chaque enfant <Bloc> entre légèrement basculé (tilt du deck).
export const cascade = (pas = 0.12, depart = 0): Variants => ({
  cache: {},
  visible: { transition: { staggerChildren: pas, delayChildren: depart } },
});
export const bascule: Variants = {
  cache: { opacity: 0, y: 26, rotateX: 14, transformPerspective: 900 },
  visible: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.85, ease: EASE } },
};
export const glisse: Variants = {
  cache: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } },
};
export const monte: Variants = {
  cache: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

// Nombre qui compte depuis zéro à son arrivée (AnimatedNumber part sinon de sa valeur finale).
export function NombreAnime({ valeur, decimales = 0, delai = 0.2, duree = 1200, className }: { valeur: number; decimales?: number; delai?: number; duree?: number; className?: string }) {
  const reduit = useReducedMotion();
  const [v, setV] = useState(reduit ? valeur : 0);
  useEffect(() => {
    if (reduit) return setV(valeur);
    const t = setTimeout(() => setV(valeur), delai * 1000);
    return () => clearTimeout(t);
  }, [valeur, delai, reduit]);
  return <AnimatedNumber value={v} decimales={decimales} springOptions={{ bounce: 0, duration: duree }} className={className} />;
}

// Entier dont les chiffres défilent comme un compteur mécanique (sliding-number) à son arrivée.
export function NombreGlissant({ valeur, delai = 0.2 }: { valeur: number; delai?: number }) {
  const reduit = useReducedMotion();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (reduit) return;
    const t = setTimeout(() => setV(valeur), delai * 1000);
    return () => clearTimeout(t);
  }, [valeur, delai, reduit]);
  if (reduit) return <span className="tabular-nums">{valeur.toLocaleString("fr-FR")}</span>;
  return <SlidingNumber value={v} />;
}
