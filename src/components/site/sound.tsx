"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { usePref } from "@/lib/client-store";

// Habillage sonore synthétisé (Web Audio) : aucun fichier, aucune requête.
// Coupé par défaut ; le choix est mémorisé sur l'appareil.

type SoundName = "hover" | "click" | "open" | "close" | "seal";
type SoundApi = { enabled: boolean; toggle: () => void; play: (name: SoundName) => void };

const SoundContext = createContext<SoundApi>({ enabled: false, toggle: () => {}, play: () => {} });
export const useSound = () => useContext(SoundContext);

const STORAGE_KEY = "sceau:son";

function blip(ctx: AudioContext, out: AudioNode, { from, to, dur, gain, type = "sine", delay = 0 }: {
  from: number; to: number; dur: number; gain: number; type?: OscillatorType; delay?: number;
}) {
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function whoosh(ctx: AudioContext, out: AudioNode, { up, dur = 0.32, gain = 0.05 }: { up: boolean; dur?: number; gain?: number }) {
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.4;
  filter.frequency.setValueAtTime(up ? 400 : 2400, t);
  filter.frequency.exponentialRampToValueAtTime(up ? 2400 : 400, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(out);
  src.start(t);
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = usePref(STORAGE_KEY, false);
  const ctxRef = useRef<AudioContext | null>(null);
  const outRef = useRef<GainNode | null>(null);
  const lastHover = useRef(0);

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      const out = ctx.createGain();
      out.gain.value = 0.9;
      out.connect(ctx.destination);
      ctxRef.current = ctx;
      outRef.current = out;
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return { ctx: ctxRef.current, out: outRef.current! };
  }, []);

  const play = useCallback(
    (name: SoundName) => {
      if (!enabled) return;
      const { ctx, out } = ensureCtx();
      switch (name) {
        case "hover": {
          const now = performance.now();
          if (now - lastHover.current < 70) return;
          lastHover.current = now;
          blip(ctx, out, { from: 2600, to: 1900, dur: 0.045, gain: 0.018, type: "triangle" });
          break;
        }
        case "click":
          blip(ctx, out, { from: 720, to: 560, dur: 0.06, gain: 0.05 });
          blip(ctx, out, { from: 1080, to: 900, dur: 0.07, gain: 0.035, delay: 0.045 });
          break;
        case "open":
          whoosh(ctx, out, { up: true });
          break;
        case "close":
          whoosh(ctx, out, { up: false });
          break;
        case "seal":
          blip(ctx, out, { from: 110, to: 46, dur: 0.38, gain: 0.16 });
          blip(ctx, out, { from: 1400, to: 900, dur: 0.05, gain: 0.03, type: "triangle", delay: 0.02 });
          break;
      }
    },
    [enabled, ensureCtx],
  );

  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    if (next) {
      const { ctx, out } = ensureCtx();
      blip(ctx, out, { from: 520, to: 880, dur: 0.12, gain: 0.05 });
    }
  }, [enabled, setEnabled, ensureCtx]);

  // Survol et clic des éléments interactifs, par délégation.
  useEffect(() => {
    if (!enabled) return;
    const interactive = (el: EventTarget | null) =>
      el instanceof Element ? el.closest("a, button, [data-sound]") : null;
    const onOver = (e: PointerEvent) => {
      const el = interactive(e.target);
      if (el && !(e.relatedTarget instanceof Node && el.contains(e.relatedTarget))) play("hover");
    };
    const onClick = (e: MouseEvent) => {
      if (interactive(e.target)) play("click");
    };
    document.addEventListener("pointerover", onOver);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("click", onClick, true);
    };
  }, [enabled, play]);

  const api = useMemo(() => ({ enabled, toggle, play }), [enabled, toggle, play]);
  return <SoundContext.Provider value={api}>{children}</SoundContext.Provider>;
}

export function SoundToggle({ className = "" }: { className?: string }) {
  const { enabled, toggle } = useSound();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Couper le son" : "Activer le son"}
      className={`group flex h-10 items-center gap-2.5 px-1 ${className}`}
    >
      <span className="flex h-3.5 items-end gap-[3px]" aria-hidden>
        {[0.55, 1, 0.7, 0.4].map((h, i) => (
          <span
            key={i}
            className="w-[2px] origin-bottom rounded-full bg-current transition-transform duration-500"
            style={{
              height: "100%",
              transform: `scaleY(${enabled ? h : 0.18})`,
              animation: enabled ? `sound-bar 900ms ${i * 120}ms ease-in-out infinite alternate` : "none",
            }}
          />
        ))}
      </span>
      <span className="label hidden sm:inline">{enabled ? "Son" : "Muet"}</span>
      <style>{`@keyframes sound-bar { from { transform: scaleY(0.25) } to { transform: scaleY(1) } }`}</style>
    </button>
  );
}
