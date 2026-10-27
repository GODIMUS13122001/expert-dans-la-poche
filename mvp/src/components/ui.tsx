// Petits éléments partagés par les trois pages.
import { cn } from "@/lib/utils";
import type { Source, Statut } from "@/types";

const LIENS = [
  { href: "/", libelle: "Terrain" },
  { href: "/expert", libelle: "Expert" },
  { href: "/admin", libelle: "Admin" },
];

export function Entete({ large = false }: { large?: boolean }) {
  const ici = window.location.pathname.replace(/\/$/, "") || "/";
  return (
    <header className={cn("relative z-20 mx-auto flex w-full items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))] pb-2", large ? "max-w-6xl md:px-8" : "max-w-xl")}>
      <a href="/" className="sur-titre flex min-h-11 items-center gap-2.5 whitespace-nowrap text-violet">
        <span className="relative grid size-2 place-items-center">
          <span className="respire absolute inset-0 rounded-full bg-violet-doux" />
          <span className="relative size-2 rounded-full bg-violet" />
        </span>
        <span className="sm:hidden">L'expert</span>
        <span className="hidden sm:inline">L'expert dans la poche</span>
      </a>
      <nav aria-label="Pages" className="flex gap-1 rounded-full bg-creme-doux p-1">
        {LIENS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            aria-current={ici === l.href ? "page" : undefined}
            className={cn(
              "relative rounded-full px-3.5 py-1.5 font-mono text-[11px] tracking-wide transition-colors duration-300 before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']",
              ici === l.href ? "bg-papier text-encre shadow-[0_1px_2px_rgb(10_10_15/0.08)]" : "text-gris hover:text-encre",
            )}
          >
            {l.libelle}
          </a>
        ))}
      </nav>
    </header>
  );
}

// Nom de fichier lisible : « Manuel_maintenance_N1_PI-180_Plastelec.docx » → « Manuel maintenance N1 PI-180 Plastelec »
export const nomCourt = (fichier: string) => fichier.replace(/\.[^.]+$/, "").replace(/_/g, " ");

export function PuceSource({ source, sombre = false }: { source: Source; sombre?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-x-1.5 rounded-lg px-2 py-1 font-mono text-[10.5px] leading-4",
        sombre ? "bg-white/10 text-violet-doux" : "bg-creme-doux text-gris-texte",
      )}
      title={`${source.document} · ${source.section}`}
    >
      <span className="break-all">{nomCourt(source.document)}</span>
      <span className="opacity-50">·</span>
      <span>{source.section}</span>
    </span>
  );
}

export const STYLE_STATUT: Record<Statut, string> = {
  reference: "bg-encre text-creme",
  retour_experience: "bg-violet/10 text-violet-profond",
  obsolete: "bg-creme-doux text-gris line-through",
  non_valide: "border border-magenta/60 text-magenta-texte",
  a_qualifier: "border border-filet-fort text-gris",
};

export const COULEUR_STATUT: Record<Statut, string> = {
  reference: "#0A0A0F",
  retour_experience: "#6E11F0",
  obsolete: "#B9B9C2",
  non_valide: "#FF2E88",
  a_qualifier: "#C9A9FF",
};
