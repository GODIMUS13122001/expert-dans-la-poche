// Affichage d'une réponse : chaque bloc n'apparaît que s'il a du contenu, dans l'ordre
// où l'opérateur en a besoin (sécurité, quoi faire, chiffres, astuce, vigilance, à qui s'adresser).
// Les blocs se construisent en cascade : le parent orchestre, chaque bloc entre à son tour.
import { AlertTriangle, ChevronDown, History, Lightbulb, PhoneCall, ShieldAlert } from "lucide-react";
import { motion, type Variants } from "motion/react";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/motion-primitives/disclosure";
import { CocheTracee, EASE, Filet, NombreAnime, TitreMots, bascule, cascade, glisse, monte } from "@/components/anime";
import { PuceSource, nomCourt } from "@/components/ui";
import type { Reponse, Source } from "@/types";

const PAS = 0.16;

const decimalesDe = (n: number) => (Number.isInteger(n) ? 0 : Math.min(2, String(n).split(".")[1]?.length ?? 0));

// Le bloc sécurité s'ouvre en cercle depuis son bouclier.
const cercle: Variants = {
  cache: { clipPath: "circle(0px at 34px 34px)" },
  visible: { clipPath: "circle(1400px at 34px 34px)", transition: { duration: 1.05, ease: [0.76, 0, 0.24, 1] } },
};

const pastille: Variants = {
  cache: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: EASE } },
};

export function CarteReponse({ reponse }: { reponse: Reponse }) {
  const inconnu = reponse.type !== "reponse";

  // Ordre d'entrée de chaque bloc présent, pour caler les chiffres qui comptent sur leur arrivée.
  const blocs = ["entete", reponse.securite.length && "securite", reponse.etapes.length && "etapes", reponse.valeurs.length && "valeurs"].filter(Boolean);
  const arrivee = (bloc: string) => 0.1 + blocs.indexOf(bloc) * PAS;

  const sources = [
    ...reponse.securite.map((s) => s.source),
    ...reponse.etapes.map((e) => e.source),
    ...reponse.valeurs.map((v) => v.source),
    ...reponse.astuces.map((a) => a.source),
  ];
  const documents = [...new Map(sources.map((s: Source) => [s.document, s])).values()];

  return (
    <motion.article variants={cascade(PAS, 0.1)} initial="cache" animate="visible" className="space-y-3">
      {/* En-tête : titre et explication */}
      <motion.section variants={bascule} className="rounded-[22px] bg-papier p-5 shadow-[0_1px_0_rgb(10_10_15/0.05)]">
        <p className="sur-titre mb-3 flex items-center gap-2 text-gris">
          <span className={inconnu ? "size-1.5 rounded-full bg-magenta" : "size-1.5 rounded-full bg-violet"} />
          {inconnu ? (reponse.type === "hors_sujet" ? "Hors sujet" : "Pas dans les documents") : (reponse.equipement ?? "Réponse")}
        </p>
        {inconnu && reponse.type === "inconnu" ? (
          <TitreMots as="h2" texte="Je ne sais *pas.*" delai={0.2} reflet className="text-[38px]" />
        ) : (
          <TitreMots as="h2" texte={reponse.titre} delai={0.2} pas={0.05} className="text-[27px] leading-[1.12]" />
        )}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
          className="mt-3 text-[15.5px] leading-relaxed text-encre-douce"
        >
          {reponse.explication}
        </motion.p>
      </motion.section>

      {/* Sécurité : texte officiel, jamais reformulé */}
      {reponse.securite.length > 0 && (
        <motion.section variants={cercle} className="relative overflow-hidden rounded-[22px] bg-encre p-5 text-creme">
          <Filet className="degrade absolute inset-x-0 top-0 h-1" delai={arrivee("securite") + 0.5} />
          <p className="sur-titre mb-4 flex items-center gap-2.5 text-rose-doux">
            <span className="grid size-7 place-items-center rounded-full bg-white/10">
              <ShieldAlert className="size-4" />
            </span>
            Sécurité · texte officiel
          </p>
          <motion.ul variants={cascade(0.14, 0.35)} className="space-y-5">
            {reponse.securite.map((s, i) => (
              <motion.li key={i} variants={monte} className="space-y-2.5">
                <p className="text-[17px] leading-relaxed">« {s.texte_exact} »</p>
                <div className="flex flex-wrap items-center gap-2">
                  {s.verifie ? (
                    <span className="relative inline-flex items-center gap-1.5 rounded-full bg-violet/30 py-1 pr-2.5 pl-1.5 font-mono text-[11px] text-violet-doux ring-1 ring-violet-doux/40">
                      <span className="grid size-4 place-items-center rounded-full bg-violet-doux text-encre">
                        <CocheTracee className="size-3" delai={arrivee("securite") + 0.9 + i * 0.14} />
                      </span>
                      Vérifié à l'identique
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-doux/10 px-2.5 py-1 font-mono text-[11px] text-rose-doux ring-1 ring-rose-doux/40">
                      <AlertTriangle className="size-3" /> Copie non vérifiée : lire le document
                    </span>
                  )}
                  <PuceSource source={s.source} sombre />
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </motion.section>
      )}

      {/* Étapes N1 : numéros qui montent, filets qui se tracent */}
      {reponse.etapes.length > 0 && (
        <motion.section variants={bascule} className="rounded-[22px] bg-papier p-5">
          <p className="sur-titre mb-1 text-gris">À faire maintenant</p>
          <motion.ol variants={cascade(0.13, 0.25)}>
            {reponse.etapes.map((e, i) => (
              <motion.li key={i} variants={{ cache: {}, visible: {} }} className="relative flex gap-4 py-4 last:pb-1">
                {i > 0 && <motion.div variants={{ cache: { scaleX: 0 }, visible: { scaleX: 1, transition: { duration: 0.75, ease: [0.3, 0, 0.15, 1] } } }} className="absolute inset-x-0 top-0 h-px origin-left bg-filet-fort" />}
                <span className="inline-block w-7 shrink-0 overflow-hidden pb-1">
                  <motion.span
                    variants={{ cache: { y: "110%" }, visible: { y: 0, transition: { duration: 0.9, ease: EASE } } }}
                    className="inline-block font-serif text-[30px] leading-none text-violet"
                  >
                    {i + 1}
                  </motion.span>
                </span>
                <motion.div variants={monte} className="min-w-0 space-y-2">
                  <p className="text-[16.5px] leading-snug">{e.texte}</p>
                  <PuceSource source={e.source} />
                </motion.div>
              </motion.li>
            ))}
          </motion.ol>
        </motion.section>
      )}

      {/* Valeurs clés : les chiffres arrivent en comptant */}
      {reponse.valeurs.length > 0 && (
        <motion.section variants={cascade(0.1)} className="grid grid-cols-2 gap-2">
          {reponse.valeurs.map((v, i) => (
            <motion.div key={i} variants={bascule} className="flex flex-col rounded-[18px] bg-creme-doux p-4 odd:last:col-span-2">
              <p className="font-serif text-[38px] leading-none text-violet">
                <NombreAnime valeur={v.nombre} decimales={decimalesDe(v.nombre)} delai={arrivee("valeurs") + 0.2 + i * 0.1} />
                <span className="ml-1 font-sans text-sm text-violet-profond">{v.unite}</span>
              </p>
              <p className="mt-2 text-[13.5px] leading-snug text-encre-douce">{v.libelle}</p>
              <Filet className="degrade mt-3 h-[3px] w-10 rounded-full" delai={arrivee("valeurs") + 0.6 + i * 0.1} />
              <div className="mt-auto pt-3">
                <PuceSource source={v.source} />
              </div>
            </motion.div>
          ))}
        </motion.section>
      )}

      {/* Astuces des seniors */}
      {reponse.astuces.map((a, i) => (
        <motion.section key={i} variants={bascule} className="relative overflow-hidden rounded-[22px] bg-creme-doux p-5 pl-6">
          <motion.div
            variants={{ cache: { scaleY: 0 }, visible: { scaleY: 1, transition: { duration: 0.8, delay: 0.3, ease: [0.3, 0, 0.15, 1] } } }}
            className="absolute inset-y-0 left-0 w-[3px] origin-top bg-violet"
          />
          <p className="sur-titre mb-2.5 flex items-center gap-2 text-violet">
            <Lightbulb className="size-4" /> Astuce de senior · {a.auteur}
          </p>
          <p className="text-[15.5px] leading-relaxed">{a.texte}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10.5px] text-gris-texte">Non validée par les Méthodes</span>
            <PuceSource source={a.source} />
          </div>
        </motion.section>
      ))}

      {/* Points de vigilance */}
      {reponse.alertes.length > 0 && (
        <motion.section variants={bascule} className="rounded-[22px] border border-magenta/30 bg-papier p-5">
          <p className="sur-titre mb-3 text-magenta-texte">Vigilance</p>
          <motion.ul variants={cascade(0.1, 0.3)} className="space-y-2.5">
            {reponse.alertes.map((a, i) => (
              <motion.li key={i} variants={glisse} className="flex gap-2.5 text-[15px] leading-snug">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-magenta" />
                {a}
              </motion.li>
            ))}
          </motion.ul>
        </motion.section>
      )}

      {/* À qui s'adresser */}
      {reponse.escalade && (
        <motion.section variants={bascule} className="flex items-start gap-4 rounded-[22px] bg-violet p-5 text-papier shadow-[0_18px_50px_rgb(110_17_240/0.28)]">
          <span className="relative grid size-11 shrink-0 place-items-center">
            <span className="respire absolute inset-1 rounded-full bg-white/25" />
            <span className="relative grid size-11 place-items-center rounded-full bg-white/15">
              <PhoneCall className="size-5" />
            </span>
          </span>
          <div className="min-w-0">
            <p className="sur-titre mb-1 text-rose-doux">À qui s'adresser</p>
            <p className="text-[17px] font-medium leading-snug">{reponse.escalade.qui}</p>
            <p className="mt-1 text-[14px] leading-snug text-rose-doux">{reponse.escalade.quand}</p>
          </div>
        </motion.section>
      )}

      {/* Historique, replié par défaut */}
      {reponse.historique.length > 0 && (
        <motion.div variants={bascule}>
          <Disclosure className="rounded-[22px] bg-papier px-5" transition={{ type: "spring", bounce: 0, duration: 0.4 }}>
            <DisclosureTrigger>
              <button type="button" className="group flex min-h-14 w-full items-center gap-3 py-3 text-left text-[14.5px] text-encre-douce">
                <History className="size-4 shrink-0 text-violet" />
                <span className="flex-1">
                  <span className="font-serif text-[20px] text-violet">{reponse.historique.length}</span> incident{reponse.historique.length > 1 ? "s" : ""} similaire{reponse.historique.length > 1 ? "s" : ""} dans l'historique
                </span>
                <ChevronDown className="size-4 text-gris transition-transform duration-300 group-aria-expanded:rotate-180" />
              </button>
            </DisclosureTrigger>
            <DisclosureContent>
              <ul className="space-y-3 pb-5">
                {reponse.historique.map((h) => (
                  <li key={h.id} className="border-l-2 border-violet-doux pl-3">
                    <p className="font-mono text-[10.5px] text-gris-texte">{h.id} · {h.date}</p>
                    <p className="mt-0.5 text-[14px] leading-snug">{h.resume}</p>
                  </li>
                ))}
              </ul>
            </DisclosureContent>
          </Disclosure>
        </motion.div>
      )}

      {/* Sources citées : chaque document en pastille mono */}
      {documents.length > 0 && (
        <motion.section variants={monte} className="px-1 pt-2">
          <p className="sur-titre mb-2.5 text-gris">Sources</p>
          <motion.ul variants={cascade(0.07, 0.15)} className="flex flex-wrap gap-1.5">
            {documents.map((s) => (
              <motion.li
                key={s.document}
                variants={pastille}
                title={s.document}
                className="flex items-center gap-1.5 rounded-full border border-filet-fort bg-papier px-3 py-1.5 font-mono text-[11px] text-gris-texte"
              >
                <span className="size-1 rounded-full bg-violet" />
                {nomCourt(s.document)}
              </motion.li>
            ))}
          </motion.ul>
        </motion.section>
      )}
    </motion.article>
  );
}
