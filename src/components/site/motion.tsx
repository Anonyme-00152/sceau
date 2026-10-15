"use client";

import { motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";

const EXPO = [0.16, 1, 0.3, 1] as const;

/** Apparition douce à l'entrée dans le champ. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "p" | "span" | "section" | "article";
}) {
  const reduced = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 1.1, ease: EXPO, delay }}
    >
      {children}
    </Comp>
  );
}

/** Titre révélé ligne par ligne, chaque ligne glissant hors d'un masque. */
export function LineReveal({
  lines,
  className,
  lineClassName = "",
  delay = 0,
  immediate = false,
}: {
  lines: React.ReactNode[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduced = useReducedMotion();
  const show = immediate || inView;
  return (
    <span ref={ref} className={className}>
      {lines.map((line, i) => (
        <span key={i} className={`block overflow-hidden pb-[0.08em] ${lineClassName}`}>
          <motion.span
            className="block"
            initial={reduced ? false : { y: "108%" }}
            animate={show ? { y: "0%" } : undefined}
            transition={{ duration: 1.2, ease: EXPO, delay: delay + i * 0.09 }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** Texte qui s'allume mot à mot au fil du défilement. */
export function ScrollWords({ text, className, accent = [] }: { text: string; className?: string; accent?: string[] }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = text.split(" ");
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <Word
          key={i}
          progress={scrollYProgress}
          range={[i / words.length, (i + 1) / words.length]}
          accent={accent.includes(w.replace(/[.,;:!?]/g, ""))}
        >
          {w}
        </Word>
      ))}
    </p>
  );
}

function Word({
  children,
  progress,
  range,
  accent,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
  accent: boolean;
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <>
      <motion.span style={{ opacity }} className={accent ? "serif-accent text-brass" : undefined}>
        {children}
      </motion.span>{" "}
    </>
  );
}

/** Compteur qui défile jusqu'à sa valeur à l'entrée dans le champ. */
export function Counter({ to, duration = 1.6, format }: { to: number; duration?: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const [animated, setValue] = useState(0);
  // Mouvement réduit : la valeur finale s'affiche directement, sans animation.
  const value = reduced ? to : animated;
  useEffect(() => {
    if (!inView || reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      setValue(Math.round(to * (1 - Math.pow(1 - t, 4))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, to, duration]);
  return <span ref={ref}>{format ? format(value) : value}</span>;
}

/** Bouton qui se laisse attirer par le pointeur. */
export function Magnetic({ children, strength = 0.35, className }: { children: React.ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  return (
    <div
      ref={ref}
      className={className}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = ref.current!.getBoundingClientRect();
        setOffset({ x: (e.clientX - r.left - r.width / 2) * strength, y: (e.clientY - r.top - r.height / 2) * strength });
      }}
      onPointerLeave={() => setOffset({ x: 0, y: 0 })}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        transition: "transform 700ms var(--ease-expo)",
      }}
    >
      {children}
    </div>
  );
}
