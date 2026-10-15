"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { LineReveal } from "../motion";

// Aperçu interactif de l'espace : une fiche fictive, ses champs masqués, et le geste de révélation.

const FIELDS = [
  { label: "Téléphone", value: "01 99 00 42 17", sensitive: true },
  { label: "E-mail", value: "elise.marchand@exemple.test", sensitive: true },
  { label: "Ville", value: "Lyon", sensitive: false },
  { label: "Adresse", value: "12 rue des Tisserands, 69002 Lyon", sensitive: true },
  { label: "Canal préféré", value: "Rendez-vous au bureau", sensitive: false },
  { label: "IBAN", value: "FR76 3041 9920 1187 6604 223", sensitive: true, critical: true },
];

function PreviewField({ f }: { f: (typeof FIELDS)[number] }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const shown = !f.sensitive || left > 0;
  return (
    <div className="relative border-t border-bone/10 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <span className="label text-mute">
          {f.label}
          {f.critical && <span className="ml-2 text-danger">· critique</span>}
        </span>
        {f.sensitive && (
          <button
            type="button"
            onClick={() => setLeft(left > 0 ? 0 : 6)}
            className="label rounded-full border border-bone/15 px-3 py-2 text-bone/80 transition-colors hover:border-brass hover:text-brass"
          >
            {left > 0 ? `Masquer · ${left}s` : "Révéler"}
          </button>
        )}
      </div>
      <p className={`mt-1.5 truncate font-mono text-[0.95rem] ${shown ? "text-bone" : "tracking-[0.2em] text-bone/40"}`}>
        {shown ? f.value : "•".repeat(Math.min(16, f.value.length))}
      </p>
      {f.sensitive && left > 0 && (
        <span className="absolute bottom-0 left-0 h-px bg-brass" style={{ width: `${(left / 6) * 100}%`, transition: "width 1s linear" }} />
      )}
    </div>
  );
}

export function SpacePreview() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [24, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], reduced ? [1, 1] : [0.86, 1]);
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [80, 0]);

  return (
    <section ref={ref} id="espace" className="relative overflow-hidden bg-ink py-28 md:py-40" aria-labelledby="espace-titre">
      <div aria-hidden className="absolute inset-x-0 top-1/3 h-[60%] bg-[radial-gradient(ellipse_at_center,rgba(203,163,92,0.12),transparent_65%)]" />
      <div className="relative mx-auto max-w-[1600px] px-5 md:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <p className="label flex items-center gap-3 text-mute md:col-span-3">
            <span className="text-brass">03</span> L&apos;espace
          </p>
          <h2 id="espace-titre" className="text-[clamp(2.4rem,5vw,5.2rem)] leading-[0.96] tracking-[-0.05em] md:col-span-9">
            <LineReveal lines={["Calme en surface,", <span key="b" className="serif-accent text-brass">verrouillé en profondeur.</span>]} />
          </h2>
        </div>

        <div className="mt-16 [perspective:1600px] md:mt-24">
          <motion.div
            style={{ rotateX, scale, y, transformOrigin: "50% 0%" }}
            className="relative mx-auto max-w-6xl overflow-hidden rounded-[22px] border border-bone/15 bg-ink-2 shadow-[0_60px_160px_-40px_rgba(0,0,0,0.9)]"
          >
            {/* Barre de fenêtre */}
            <div className="flex items-center justify-between border-b border-bone/10 px-5 py-3">
              <div className="flex gap-1.5" aria-hidden>
                <span className="size-2.5 rounded-full bg-bone/15" />
                <span className="size-2.5 rounded-full bg-bone/15" />
                <span className="size-2.5 rounded-full bg-bone/15" />
              </div>
              <p className="label text-mute">sceau / espace / clients / SC-0101</p>
              <p className="label hidden items-center gap-2 text-moss sm:flex">
                <span className="size-1.5 rounded-full bg-moss" /> Session protégée
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
              <aside className="hidden border-r border-bone/10 p-5 md:block" aria-hidden>
                <p className="label text-mute">Espace</p>
                <ul className="mt-4 space-y-1 text-sm">
                  {["Tableau de bord", "Clients", "Journal", "Équipe"].map((x, i) => (
                    <li key={x} className={`rounded-lg px-3 py-2 ${i === 1 ? "bg-bone/[0.07] text-bone" : "text-bone/55"}`}>
                      {x}
                    </li>
                  ))}
                </ul>
                <div className="mt-10 rounded-xl border border-bone/10 p-3">
                  <p className="label text-mute">Verrouillage</p>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-bone/10">
                    <div className="h-full w-2/3 rounded-full bg-bone/60" />
                  </div>
                  <p className="label mt-2 text-bone/60">dans 3 min 20</p>
                </div>
              </aside>

              <div className="relative p-5 md:p-8">
                {/* Filigrane nominatif */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-[0.05]"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='160'><text x='0' y='90' fill='%23edebe4' font-family='monospace' font-size='13' transform='rotate(-18 160 80)'>Hugo Lambert · 13/10 · 4F2A</text></svg>\")",
                  }}
                />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="label text-mute">SC-0101 · Particulier · Lyon</p>
                    <p className="mt-2 text-3xl tracking-[-0.035em] md:text-4xl">Élise Marchand</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="label rounded-full border border-danger/50 px-3 py-1.5 text-danger">Secret</span>
                    <span className="label rounded-full border border-bone/15 px-3 py-1.5 text-bone/80">Actif</span>
                  </div>
                </div>
                <div className="relative mt-8 grid grid-cols-1 gap-x-10 md:grid-cols-2">
                  {FIELDS.map((f) => (
                    <PreviewField key={f.label} f={f} />
                  ))}
                </div>
                <p className="label relative mt-6 text-mute">
                  Fiche fictive. Dans l&apos;espace réel, chaque révélation est inscrite au journal à votre nom.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
