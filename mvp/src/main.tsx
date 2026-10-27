import { StrictMode, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion, MotionConfig } from "motion/react";
import "./index.css";
import Operateur from "./pages/Operateur";
import Expert from "./pages/Expert";
import Admin from "./pages/Admin";
import { Accueil, type Origine } from "./components/Accueil";

// Trois pages, routage par chemin : pas besoin d'un routeur.
const PAGES: Record<string, () => React.JSX.Element> = { "/expert": Expert, "/admin": Admin };
const chemin = window.location.pathname.replace(/\/$/, "");
const Page = PAGES[chemin] ?? Operateur;

// L'écran d'ouverture précède la page Terrain à chaque ouverture de l'appli. Il n'est pas rejoué
// quand on revient sur Terrain depuis Expert ou Admin dans la même fenêtre.
const DEJA_VU = "accueil-vu";
function accueilAttendu() {
  if (Page !== Operateur) return false;
  try {
    return sessionStorage.getItem(DEJA_VU) !== "1";
  } catch {
    return true;
  }
}

const calme = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function App() {
  const [phase, setPhase] = useState<"accueil" | "sortie" | "page">(accueilAttendu() ? "accueil" : "page");
  const [origine, setOrigine] = useState<Origine>({ x: 0, y: 0 });
  const scene = useRef<HTMLDivElement>(null);

  function entrer(o: Origine) {
    try {
      sessionStorage.setItem(DEJA_VU, "1");
    } catch {
      /* stockage indisponible : l'accueil reviendra, sans gravité */
    }
    if (calme()) return setPhase("page");
    setOrigine(o);
    setPhase("sortie");
  }

  // La page se révèle en cercle depuis le bouton, puis le clip disparaît (aucun style résiduel).
  useLayoutEffect(() => {
    if (phase !== "sortie" || !scene.current) return;
    const rayon = Math.hypot(Math.max(origine.x, innerWidth - origine.x), Math.max(origine.y, innerHeight - origine.y));
    const a = scene.current.animate(
      [{ clipPath: `circle(0px at ${origine.x}px ${origine.y}px)` }, { clipPath: `circle(${rayon}px at ${origine.x}px ${origine.y}px)` }],
      { duration: 1000, delay: 380, easing: "cubic-bezier(.76,0,.24,1)", fill: "backwards" },
    );
    a.onfinish = () => setPhase("page");
    return () => a.cancel();
  }, [phase, origine]);

  return (
    <>
      {phase !== "page" && <Accueil onEntrer={entrer} />}
      {phase === "sortie" && (
        // Disque violet qui part du bouton, comme l'orbe du deck
        <motion.div
          aria-hidden="true"
          className="pointer-events-none fixed z-[55] size-4 rounded-full bg-violet"
          style={{ left: origine.x - 8, top: origine.y - 8 }}
          initial={{ scale: 1 }}
          animate={{ scale: (Math.hypot(innerWidth, innerHeight) * 2) / 16 }}
          transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
        />
      )}
      {phase !== "accueil" && (
        <div ref={scene} className={phase === "sortie" ? "relative z-[60] min-h-dvh bg-creme" : undefined}>
          <Page />
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
