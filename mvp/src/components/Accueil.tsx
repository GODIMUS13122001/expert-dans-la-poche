// Écran d'ouverture : reprend les gestes du deck (sur-titre brouillé, titre qui monte mot par mot,
// orbe violet) et le motif de l'icône : le téléphone sort de la poche et affiche une réponse type.
// Au clic sur « Entrer » (ou touche Entrée), un disque violet part du bouton et la page Terrain
// se révèle en cercle depuis le même point, comme les changements de scène du deck.
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { GlowEffect } from "@/components/motion-primitives/glow-effect";
import { Magnetic } from "@/components/motion-primitives/magnetic";
import { Spotlight } from "@/components/motion-primitives/spotlight";
import { Tilt } from "@/components/motion-primitives/tilt";
import { EASE, EASE_TRACE, NombreGlissant, SurTitreBrouille, TitreMots } from "@/components/anime";
import { api } from "@/api";
import type { EtatAdmin } from "@/types";

export type Origine = { x: number; y: number };

const aujourdhui = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// Codes défaut réellement présents dans les documents de référence chargés.
function codesDuCorpus(etat: EtatAdmin) {
  const codes = new Set<string>();
  for (const d of etat.docs) {
    if (d.etat !== "charge" || d.statut !== "reference") continue;
    for (const c of d.apercu.match(/\bE\d{3}\b/g) ?? []) codes.add(c);
  }
  return [...codes].sort();
}

export function Accueil({ onEntrer }: { onEntrer: (o: Origine) => void }) {
  const [etat, setEtat] = useState<EtatAdmin | null>(null);
  const [parti, setParti] = useState(false);
  const bouton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    api.admin().then(setEtat).catch(() => setEtat(null));
  }, []);

  function entrer() {
    if (parti) return;
    setParti(true);
    const r = bouton.current?.getBoundingClientRect();
    onEntrer(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 });
  }

  // Entrée valide depuis n'importe où sur l'écran.
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.repeat) {
        e.preventDefault();
        entrer();
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  });
  useEffect(() => bouton.current?.focus({ preventScroll: true }), []);

  const docs = etat?.docs.filter((d) => d.etat === "charge").length ?? 0;
  const astuces = etat?.astuces.length ?? 0;
  const codes = etat ? codesDuCorpus(etat) : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-creme text-encre" role="dialog" aria-modal="true" aria-labelledby="accueil-titre">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col px-5 pt-[max(18px,env(safe-area-inset-top))] pb-[max(20px,env(safe-area-inset-bottom))] md:px-12">
        {/* Bandeau du haut : marque, date du jour, état du compte */}
        <motion.header
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex items-center justify-between gap-3 font-mono text-[11px] text-gris-texte"
        >
          <span className="flex items-center gap-2 tracking-[0.18em] text-violet uppercase">
            <span className="size-2 rounded-full bg-violet" /> L'expert
          </span>
          <span className="flex items-center gap-3">
            <span className="hidden first-letter:uppercase sm:inline">{aujourdhui}</span>
            {etat?.compte.connecte && (
              <span className="flex items-center gap-1.5">
                <span className="relative grid size-2 place-items-center">
                  <span className="respire absolute inset-0 rounded-full bg-violet-doux" />
                  <span className="relative size-1.5 rounded-full bg-violet" />
                </span>
                Compte Claude connecté
              </span>
            )}
          </span>
        </motion.header>

        <div className="grid flex-1 items-center gap-6 py-6 md:grid-cols-[1.05fr_1fr] md:gap-12 md:py-10">
          {/* Le message */}
          <div className="order-1">
            <SurTitreBrouille texte="Atelier injection · ligne LA-07" className="text-violet" delai={0.2} />
            <span id="accueil-titre" className="sr-only">La réponse du senior, sans attendre le senior</span>
            <TitreMots
              texte="La réponse du senior, *sans attendre* le senior."
              delai={0.35}
              reflet
              className="mt-4 text-[40px] leading-[1.04] md:text-[66px]"
            />
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1, ease: EASE }}
              className="mt-5 max-w-md text-[16px] leading-relaxed text-gris-texte md:text-[17px]"
            >
              Un code défaut, une question : l'appli répond avec les documents de l'atelier et cite sa source.
            </motion.p>

            {/* Ce que l'appli a réellement lu, chiffres tirés de /api/admin */}
            {etat && (
              <motion.dl
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.2 }}
                className="mt-7 hidden gap-10 md:flex"
              >
                <Chiffre valeur={docs} libelle="documents" delai={1.3} />
                {astuces > 0 && <Chiffre valeur={astuces} libelle="astuces de seniors" delai={1.45} />}
                {codes.length > 0 && <Chiffre valeur={codes.length} libelle="codes défaut" delai={1.6} />}
              </motion.dl>
            )}

            <BoutonEntrer refBouton={bouton} onClick={entrer} className="inline-flex" />
          </div>

          {/* L'illustration : le téléphone sort de la poche */}
          <div className="order-2 flex justify-center">
            <Poche />
          </div>
        </div>

        {/* Sur téléphone : chiffres et bouton sous le pouce */}
        <div className="space-y-4 md:hidden">
          {etat && (
            <motion.dl
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.3 }}
              className="flex justify-center gap-8"
            >
              <Chiffre valeur={docs} libelle="documents" delai={1.4} petit />
              {astuces > 0 && <Chiffre valeur={astuces} libelle="astuces" delai={1.5} petit />}
              {codes.length > 0 && <Chiffre valeur={codes.length} libelle="codes défaut" delai={1.6} petit />}
            </motion.dl>
          )}
          <BoutonEntrer refBouton={bouton} onClick={entrer} className="flex w-full" mobile />
        </div>
      </div>
    </div>
  );
}

function Chiffre({ valeur, libelle, delai, petit = false }: { valeur: number; libelle: string; delai: number; petit?: boolean }) {
  return (
    <div className={petit ? "text-center" : undefined}>
      <dt className="sr-only">{libelle}</dt>
      <dd className={petit ? "font-serif text-[30px] leading-none text-violet" : "font-serif text-[46px] leading-none text-violet"}>
        <NombreGlissant valeur={valeur} delai={delai} />
      </dd>
      <dd className="mt-2 font-mono text-[10.5px] tracking-[0.14em] text-gris-texte uppercase" aria-hidden="true">{libelle}</dd>
    </div>
  );
}

function BoutonEntrer({
  refBouton,
  onClick,
  className,
  mobile = false,
}: {
  refBouton: React.RefObject<HTMLButtonElement | null>;
  onClick: () => void;
  className?: string;
  mobile?: boolean;
}) {
  // Un seul des deux boutons est visible selon la largeur ; le ref suit celui qui est affiché.
  const local = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const visible = () => {
      const el = local.current;
      if (el && el.offsetParent !== null) refBouton.current = el;
    };
    visible();
    window.addEventListener("resize", visible);
    return () => window.removeEventListener("resize", visible);
  }, [refBouton]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 1.25, ease: EASE }}
      className={mobile ? "w-full" : "mt-10 hidden md:block"}
    >
      <Magnetic intensity={0.25} range={140} springOptions={{ stiffness: 180, damping: 18, mass: 0.4 }}>
      <div className={mobile ? "relative" : "relative inline-block"}>
        {/* Halo qui respire sous le bouton */}
        <GlowEffect
          colors={["#6E11F0", "#4A0BB0", "#C9A9FF", "#FF2E88"]}
          mode="breathe"
          blur="strong"
          duration={5}
          scale={0.92}
          className="rounded-full opacity-60"
        />
      <motion.button
        ref={local}
        type="button"
        onClick={onClick}
        whileTap={{ scale: 0.97 }}
        className={`group relative min-h-14 items-center justify-between gap-6 rounded-full bg-violet py-2 pr-2 pl-7 text-[17px] text-papier transition-colors duration-300 hover:bg-violet-profond ${className}`}
      >
        Entrer
        <span className="grid size-11 place-items-center rounded-full bg-papier text-violet transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-x-1">
          <ArrowRight className="size-5" />
        </span>
      </motion.button>
      </div>
      </Magnetic>
    </motion.div>
  );
}

// Téléphone sombre qui monte hors d'une poche crème, puis affiche un exemple de réponse qui s'écrit.
const REPONSE = "Débit de refroidissement du moule insuffisant";

function Poche() {
  const reduit = useReducedMotion();
  const [ecrit, setEcrit] = useState(reduit ? REPONSE.length : 0);

  useEffect(() => {
    if (reduit) return;
    let i = 0;
    let id = 0;
    const debut = setTimeout(() => {
      id = window.setInterval(() => {
        i += 1;
        setEcrit(i);
        if (i >= REPONSE.length) clearInterval(id);
      }, 28);
    }, 3300);
    return () => {
      clearTimeout(debut);
      clearInterval(id);
    };
  }, [reduit]);

  const apparait = (delai: number, x = 0) => ({
    initial: { opacity: 0, x, y: x ? 0 : 8 },
    animate: { opacity: 1, x: 0, y: 0 },
    transition: { duration: 0.6, delay: delai, ease: EASE },
  });

  return (
    <Tilt rotationFactor={7} springOptions={{ stiffness: 120, damping: 20 }} className="relative h-[364px] w-[280px] md:h-[500px] md:w-[400px]">
    <div className="absolute inset-0" aria-hidden="true">
      {/* Orbe violet qui respire derrière */}
      <motion.div
        initial={{ scale: 0.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.4, delay: 0.2, ease: EASE }}
        className="absolute top-[-4%] left-1/2 size-[300px] -translate-x-1/2 md:size-[440px]"
      >
        <div className="halo size-full rounded-full bg-[radial-gradient(circle_at_40%_35%,rgb(140_70_255/0.55)_0%,rgb(110_17_240/0.28)_42%,rgb(110_17_240/0)_70%)]" />
      </motion.div>

      {/* Le téléphone : la moitié basse reste dans la poche */}
      <motion.div
        initial={{ y: "62%" }}
        animate={{ y: 0 }}
        transition={{ duration: 1.2, delay: 0.9, ease: [0.65, 0, 0.2, 1] }}
        className="absolute top-[3%] left-[12%] h-[82%] w-[76%] rounded-[30px] bg-[#0F0F14] shadow-[0_30px_70px_rgb(10_10_15/0.35)] ring-1 ring-white/5 md:rounded-[38px]"
      >
       <div className="h-full rounded-[inherit] p-4 md:p-6">
        <Spotlight size={220} className="from-violet-doux/40 via-violet/15 to-transparent" />
        <div className="flex items-center justify-between">
          <span className="size-3 rounded-full bg-magenta md:size-3.5" />
          <span className="font-mono text-[8.5px] tracking-[0.16em] text-white/30 md:text-[9.5px]">EXEMPLE</span>
        </div>
        <motion.div
          {...apparait(2.1, 24)}
          className="mt-3 ml-auto w-fit rounded-[14px_14px_4px_14px] bg-encre-carte px-3 py-1.5 text-[12.5px] text-creme md:mt-4 md:text-[15px]"
        >
          E508 sur la PI-180 ?
        </motion.div>
        {/* Trois points pendant qu'il « cherche », puis la réponse */}
        {!reduit && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.9, delay: 2.5, times: [0, 0.15, 0.85, 1] }}
            className="points absolute mt-2 text-violet-doux"
          >
            <i /><i /><i />
          </motion.span>
        )}
        <motion.div {...apparait(3.2, -20)} className="mt-2.5 rounded-[14px_14px_14px_4px] bg-violet p-3 text-papier md:mt-4 md:p-4">
          <p className="min-h-[2.4em] font-serif text-[14px] leading-[1.2] md:text-[19px]">
            {REPONSE.slice(0, ecrit)}
            {ecrit < REPONSE.length && <span className="ml-px inline-block h-[1em] w-px translate-y-[2px] bg-papier align-baseline" />}
          </p>
          <motion.p {...apparait(4.7)} className="mt-1.5 text-[11px] leading-snug md:text-[14px]">1. Vannes V1 et V2 ouvertes ?</motion.p>
          <motion.p {...apparait(4.9)} className="text-[11px] leading-snug md:text-[14px]">2. Rincer le filtre à eau</motion.p>
        </motion.div>
        <motion.p {...apparait(5.3)} className="mt-2 flex items-center gap-1.5 font-mono text-[9.5px] text-violet-doux md:mt-3 md:text-[11px]">
          <Check className="size-3" /> Source : manuel PI-180
        </motion.p>
       </div>
      </motion.div>

      {/* La poche, par-dessus le bas du téléphone */}
      <motion.svg
        viewBox="0 0 280 120"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
        className="absolute bottom-0 left-0 w-full drop-shadow-[0_24px_40px_rgb(74_11_176/0.18)]"
      >
        <defs>
          <linearGradient id="poche-tissu" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#F2EFE8" />
          </linearGradient>
          <mask id="poche-couture">
            <motion.rect x="0" y="0" height="120" initial={{ width: 0 }} animate={{ width: 280 }} transition={{ duration: 1.1, delay: 0.9, ease: EASE_TRACE }} fill="#fff" />
          </mask>
        </defs>
        <path d="M0 0 H280 V44 C280 80 214 104 140 120 C66 104 0 80 0 44 Z" fill="url(#poche-tissu)" />
        <rect x="0" y="0" width="280" height="20" fill="#ECE4FB" />
        <path
          d="M22 33 H258 V50 C258 76 204 94 140 106 C76 94 22 76 22 50 Z"
          fill="none"
          stroke="#B48CF2"
          strokeWidth="3"
          strokeDasharray="9 7"
          strokeLinecap="round"
          mask="url(#poche-couture)"
        />
      </motion.svg>
    </div>
    </Tilt>
  );
}
