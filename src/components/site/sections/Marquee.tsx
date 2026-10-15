"use client";

import { motion, useScroll, useSpring, useTransform, useVelocity } from "motion/react";

const WORDS = ["Chiffré", "Cloisonné", "Tracé", "Scellé"];

export function Marquee() {
  // Le bandeau se penche avec la vitesse de défilement.
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 40, stiffness: 300 });
  const skew = useTransform(velocity, [-2500, 0, 2500], [7, 0, -7], { clamp: true });

  const row = (
    <span className="flex shrink-0 items-center">
      {WORDS.map((w) => (
        <span key={w} className="flex items-center">
          <span className="display px-[0.18em] text-[clamp(4.5rem,13vw,13rem)]">{w}</span>
          <svg viewBox="0 0 24 24" className="mx-[0.3em] size-[clamp(2rem,5vw,4.5rem)]" aria-hidden>
            <path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" fill="currentColor" />
          </svg>
        </span>
      ))}
    </span>
  );

  return (
    <section aria-label="Chiffré, cloisonné, tracé, scellé" className="overflow-hidden bg-brass py-6 text-ink md:py-8">
      <motion.div style={{ skewX: skew }} className="flex w-max" aria-hidden>
        <div className="flex w-max" style={{ animation: "marquee 26s linear infinite" }}>
          {row}
          {row}
        </div>
      </motion.div>
    </section>
  );
}
