"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    n: "01",
    title: "Inviter",
    body: "Chaque membre reçoit un accès nominatif et sa propre clé à usage unique. Pas de compte partagé, jamais.",
    art: "invite",
  },
  {
    n: "02",
    title: "Cloisonner",
    body: "Vous décidez, dossier par dossier, qui peut lire quoi. Par défaut, la réponse est : personne.",
    art: "split",
  },
  {
    n: "03",
    title: "Consulter",
    body: "Les données sensibles restent masquées. Les révéler est un geste volontaire, limité dans le temps, signé.",
    art: "reveal",
  },
  {
    n: "04",
    title: "Prouver",
    body: "Le journal répond à la seule question qui compte après un incident : qui a vu quoi, et quand.",
    art: "proof",
  },
] as const;

function Art({ kind }: { kind: (typeof STEPS)[number]["art"] }) {
  const stroke = "currentColor";
  switch (kind) {
    case "invite":
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          {[40, 100, 160].map((x, i) => (
            <g key={x} opacity={i === 1 ? 1 : 0.45}>
              <circle cx={x} cy="46" r="16" fill="none" stroke={stroke} strokeWidth="1.5" />
              <path d={`M${x - 26} 98 a26 26 0 0 1 52 0`} fill="none" stroke={stroke} strokeWidth="1.5" />
            </g>
          ))}
          <circle cx="116" cy="34" r="6" fill="var(--color-brass-deep)" />
        </svg>
      );
    case "split":
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          {[...Array(12)].map((_, i) => (
            <rect
              key={i}
              x={20 + (i % 6) * 28}
              y={22 + Math.floor(i / 6) * 42}
              width="20"
              height="30"
              rx="3"
              fill={[1, 4, 8].includes(i) ? "var(--color-brass-deep)" : "none"}
              stroke={stroke}
              strokeWidth="1.2"
              opacity={[1, 4, 8].includes(i) ? 1 : 0.35}
            />
          ))}
        </svg>
      );
    case "reveal":
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <rect x="20" y="40" width="160" height="40" rx="8" fill="none" stroke={stroke} strokeWidth="1.2" opacity="0.5" />
          {[...Array(9)].map((_, i) => (
            <circle key={i} cx={40 + i * 14} cy="60" r="3.2" fill={stroke} opacity={i < 5 ? 0.2 : 0.8} />
          ))}
          <path d="M28 96 H120" stroke="var(--color-brass-deep)" strokeWidth="2" />
        </svg>
      );
    case "proof":
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={14 + i * 46} y="44" width="34" height="32" rx="5" fill="none" stroke={stroke} strokeWidth="1.2" opacity={0.4 + i * 0.2} />
              {i < 3 && <path d={`M${48 + i * 46} 60 H${60 + i * 46}`} stroke={stroke} strokeWidth="1.2" opacity="0.6" />}
            </g>
          ))}
          <rect x="152" y="44" width="34" height="32" rx="5" fill="var(--color-brass-deep)" />
        </svg>
      );
  }
}

function Card({ step }: { step: (typeof STEPS)[number] }) {
  return (
    <article className="flex h-full w-[min(84vw,30rem)] shrink-0 flex-col justify-between rounded-3xl border border-ink/12 bg-bone-2/60 p-7 text-ink md:w-[34rem] md:p-10">
      <div className="flex items-start justify-between">
        <span className="display text-[6.5rem] leading-none text-ink/12 md:text-[9rem]">{step.n}</span>
        <div className="h-24 w-40 text-ink/70 md:h-28 md:w-48">
          <Art kind={step.art} />
        </div>
      </div>
      <div>
        <h3 className="text-4xl tracking-[-0.04em] md:text-5xl">{step.title}</h3>
        {/* Trois lignes réservées : les titres des quatre cartes restent alignés. */}
        <p className="mt-4 min-h-[4.9rem] max-w-sm leading-relaxed text-ink/70">{step.body}</p>
      </div>
    </article>
  );
}

export function Process() {
  const ref = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [distance, setDistance] = useState(0);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const measure = () => {
      const wide = window.innerWidth >= 900 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setPinned(wide);
      if (track.current) setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (track.current) ro.observe(track.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);
  const bar = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const header = (
    <div className="mx-auto flex max-w-[1600px] items-end justify-between gap-6 px-5 md:px-8">
      <div>
        <p className="label flex items-center gap-3 text-ink/60">
          <span className="text-brass-deep">04</span> Méthode
        </p>
        <h2 className="mt-5 text-[clamp(2.4rem,5vw,5rem)] leading-[0.95] tracking-[-0.05em]">
          Quatre gestes, <span className="serif-accent text-brass-deep">dans l&apos;ordre.</span>
        </h2>
      </div>
      {pinned && (
        <div className="mb-3 hidden w-48 md:block" aria-hidden>
          <div className="h-px w-full bg-ink/15">
            <motion.div className="h-px bg-ink" style={{ width: bar }} />
          </div>
        </div>
      )}
    </div>
  );

  if (!pinned || reduced) {
    return (
      <section ref={ref} className="bg-bone py-24 text-ink md:py-32" aria-label="Méthode">
        {header}
        <div ref={track} className="mx-auto mt-12 flex max-w-[1600px] gap-5 overflow-x-auto px-5 pb-4 [scrollbar-width:none] md:px-8">
          {STEPS.map((s) => (
            <div key={s.n} className="h-[26rem]">
              <Card step={s} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative bg-bone text-ink" style={{ height: `calc(100vh + ${distance}px)` }} aria-label="Méthode">
      <div className="sticky top-0 flex h-screen flex-col justify-center gap-12 overflow-hidden py-16">
        {header}
        <motion.div ref={track} style={{ x }} className="flex w-max gap-6 px-8 will-change-transform">
          {STEPS.map((s) => (
            <div key={s.n} className="h-[min(56vh,32rem)]">
              <Card step={s} />
            </div>
          ))}
          <div className="w-[12vw] shrink-0" aria-hidden />
        </motion.div>
      </div>
    </section>
  );
}
