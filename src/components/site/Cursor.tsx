"use client";

import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/lib/client-store";

// Curseur à deux corps : un point exact et un anneau qui suit avec inertie.
// Les éléments portant data-cursor="Texte" affichent une étiquette dans l'anneau.
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [hidden, setHidden] = useState(true);
  const enabled = useMediaQuery("(pointer: fine) and (prefers-reduced-motion: no-preference)");

  useEffect(() => {
    if (!enabled) return;

    const pos = { x: -100, y: -100 };
    const lag = { x: -100, y: -100 };
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      setHidden(false);
      const target = e.target instanceof Element ? e.target : null;
      const labelled = target?.closest<HTMLElement>("[data-cursor]");
      const interactive = target?.closest("a, button, [role='button'], label, summary");
      const typing = target?.closest("input, textarea, select, [contenteditable='true']");
      setLabel(labelled?.dataset.cursor || null);
      setActive(!!interactive && !typing);
      if (typing) setHidden(true);
    };
    const onLeave = () => setHidden(true);

    const loop = () => {
      lag.x += (pos.x - lag.x) * 0.16;
      lag.y += (pos.y - lag.y) * 0.16;
      if (dot.current) dot.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${lag.x}px, ${lag.y}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.documentElement.classList.add("has-cursor");
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.classList.remove("has-cursor");
    };
  }, [enabled]);

  if (!enabled) return null;

  const size = label ? 92 : active ? 52 : 30;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] mix-blend-difference">
      <div ref={ring} className="absolute left-0 top-0 will-change-transform">
        <div
          className="flex items-center justify-center rounded-full border border-bone/80 transition-[width,height,background-color,opacity] duration-500 ease-[var(--ease-expo)]"
          style={{
            width: size,
            height: size,
            marginLeft: -size / 2,
            marginTop: -size / 2,
            backgroundColor: label ? "var(--color-bone)" : "transparent",
            opacity: hidden ? 0 : 1,
          }}
        >
          {label && <span className="label text-[10px] text-ink">{label}</span>}
        </div>
      </div>
      <div ref={dot} className="absolute left-0 top-0 will-change-transform">
        <div
          className="-ml-[3px] -mt-[3px] size-1.5 rounded-full bg-bone transition-opacity duration-200"
          style={{ opacity: hidden || label ? 0 : 1 }}
        />
      </div>
      <style>{`html.has-cursor, html.has-cursor a, html.has-cursor button { cursor: none; } html.has-cursor input, html.has-cursor textarea { cursor: text; }`}</style>
    </div>
  );
}
