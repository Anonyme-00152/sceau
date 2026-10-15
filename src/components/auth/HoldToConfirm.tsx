"use client";

import { useEffect, useRef, useState } from "react";

// Signature par appui long : un geste délibéré, impossible à faire « par erreur ».
// Fonctionne au pointeur et au clavier (Espace ou Entrée maintenus).
export function HoldToConfirm({
  label,
  doneLabel = "Signé",
  duration = 1600,
  onConfirm,
}: {
  label: string;
  doneLabel?: string;
  duration?: number;
  onConfirm: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const raf = useRef(0);
  const start = useRef<number | null>(null);
  const holding = useRef(false);

  const tick = (now: number) => {
    if (!holding.current || start.current === null) return;
    const p = Math.min(1, (now - start.current) / duration);
    setProgress(p);
    if (p >= 1) {
      holding.current = false;
      setDone(true);
      onConfirm();
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  const begin = () => {
    if (done || holding.current) return;
    holding.current = true;
    setIsHolding(true);
    start.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  };

  const release = () => {
    if (done) return;
    holding.current = false;
    setIsHolding(false);
    cancelAnimationFrame(raf.current);
    // Relâché trop tôt : la jauge redescend.
    const from = progress;
    const t0 = performance.now();
    const back = (now: number) => {
      const p = Math.max(0, from - (now - t0) / 350);
      setProgress(p);
      if (p > 0 && !holding.current) raf.current = requestAnimationFrame(back);
    };
    raf.current = requestAnimationFrame(back);
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        begin();
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          begin();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") release();
      }}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={`${label} — maintenir appuyé`}
      aria-live="polite"
      disabled={done}
      className="relative h-16 w-full select-none overflow-hidden rounded-full border border-bone/25 bg-ink-2 text-bone [touch-action:none]"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-brass"
        style={{ width: `${progress * 100}%`, transition: isHolding ? "none" : "width 120ms linear" }}
      />
      <span className="relative flex items-center justify-center gap-3 font-medium" style={{ color: progress > 0.5 ? "var(--color-ink)" : undefined }}>
        {done ? (
          <>✓ {doneLabel}</>
        ) : (
          <>
            {label}
            <span className="label opacity-70">· maintenir</span>
          </>
        )}
      </span>
    </button>
  );
}
