// Attente animée pendant les 5 à 12 secondes de réponse. Elle décrit la méthode de l'assistant
// en général : la surbrillance tourne en boucle sur les étapes, elle ne prétend pas suivre l'appel.
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
import { EASE, cascade, glisse } from "@/components/anime";
import { cn } from "@/lib/utils";

export function Attente({ titre, etapes, dureeBarre = 11 }: { titre: string; etapes: string[]; dureeBarre?: number }) {
  const [actif, setActif] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActif((i) => (i + 1) % etapes.length), 1700);
    return () => clearInterval(id);
  }, [etapes.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 26, rotateX: 14, transformPerspective: 900 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, boxShadow: ["0 18px 60px rgb(110 17 240 / 0.2)", "0 26px 90px rgb(110 17 240 / 0.36)"] }}
      exit={{ opacity: 0, y: -12, filter: "blur(6px)", transition: { duration: 0.35 } }}
      transition={{ duration: 0.85, ease: EASE, boxShadow: { duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } }}
      className="relative overflow-hidden rounded-[22px] bg-encre-douce p-5 text-creme md:p-6"
      role="status"
      aria-live="polite"
    >
      {/* Barre d'attente : avance vite puis ralentit, ne se termine qu'à l'arrivée de la réponse */}
      <div className="absolute inset-x-0 top-0 h-[3px] bg-white/10">
        <motion.div
          className="degrade h-full origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 0.94 }}
          transition={{ duration: dureeBarre, ease: [0.1, 0.6, 0.3, 1] }}
        />
      </div>

      <div className="flex items-center gap-3">
        <span className="points text-violet-doux" aria-hidden="true"><i /><i /><i /></span>
        <TextShimmer as="p" duration={1.8} className="font-serif text-[22px] leading-tight [--base-color:#C9A9FF] [--base-gradient-color:#FFFFFF]">
          {titre}
        </TextShimmer>
      </div>

      <motion.ul variants={cascade(0.08, 0.3)} initial="cache" animate="visible" className="mt-5 space-y-1" aria-hidden="true">
        {etapes.map((e, i) => (
          <motion.li key={e} variants={glisse} className="relative">
            {i === actif && (
              <motion.span
                layoutId="attente-surbrillance"
                transition={{ type: "spring", bounce: 0, duration: 0.6 }}
                className="absolute inset-0 rounded-xl bg-white/[0.07]"
              />
            )}
            <span className={cn("relative flex items-center gap-3 px-3 py-2 text-[15.5px] leading-snug transition-colors duration-500", i === actif ? "text-creme" : "text-gris-clair/70")}>
              <span className={cn("size-1.5 shrink-0 rounded-full transition-colors duration-500", i === actif ? "bg-violet-doux" : "bg-white/20")} />
              {e}
            </span>
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  );
}
