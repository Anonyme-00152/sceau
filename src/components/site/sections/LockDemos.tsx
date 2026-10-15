"use client";

import { useEffect, useRef, useState } from "react";

/* ───────────── 01 · Chiffrement : la donnée passe du chiffré au clair ───────────── */

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
const PLAIN = "FR76 3041 9920 1187 6604 223";
const CIPHER = "v1.Qm9u.ZG9uZWVz.c2NlbGxlZXM9";

function scramble(from: string, to: string, t: number) {
  const len = Math.max(from.length, to.length);
  let out = "";
  for (let i = 0; i < len; i++) {
    const threshold = i / len;
    if (t > threshold + 0.15) out += to[i] ?? "";
    else if (t > threshold) out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    else out += from[i] ?? "";
  }
  return out;
}

export function CipherDemo() {
  const [text, setText] = useState(CIPHER);
  const [open, setOpen] = useState(false);
  const raf = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const run = (to: string, from: string, done?: () => void) => {
    cancelAnimationFrame(raf.current);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      setText(scramble(from, to, t * 1.2));
      if (t < 1) raf.current = requestAnimationFrame(step);
      else {
        setText(to);
        done?.();
      }
    };
    raf.current = requestAnimationFrame(step);
  };

  const reveal = () => {
    if (open) return;
    setOpen(true);
    run(PLAIN, CIPHER, () => {
      timer.current = setTimeout(() => run(CIPHER, PLAIN, () => setOpen(false)), 2600);
    });
  };

  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    clearTimeout(timer.current);
  }, []);

  return (
    <div className="rounded-2xl border border-bone/10 bg-ink-3/60 p-5">
      <div className="flex items-center justify-between">
        <span className="label text-mute">IBAN · Donnée critique</span>
        <span className={`label ${open ? "text-moss" : "text-brass"}`}>{open ? "Révélé · journalisé" : "Scellé"}</span>
      </div>
      <p className="mt-4 break-all font-mono text-lg tracking-tight text-bone md:text-xl" aria-live="polite">
        {text}
      </p>
      <button
        type="button"
        onClick={reveal}
        disabled={open}
        className="label mt-5 rounded-full border border-bone/20 px-4 py-2.5 text-bone transition-colors hover:border-brass hover:text-brass disabled:opacity-40"
      >
        Déchiffrer (démo)
      </button>
    </div>
  );
}

/* ───────────── 02 · Cloisonnement : chacun ne voit que ses dossiers ───────────── */

const MEMBERS = [
  { name: "Inès", role: "Direction", mask: 0b111101111011011111011110 },
  { name: "Hugo", role: "Gestion", mask: 0b100100110000010010010000 },
  { name: "Sarah", role: "Lecture", mask: 0b000100000010000001000000 },
];

export function AccessDemo() {
  const [active, setActive] = useState(1);
  const mask = MEMBERS[active].mask;
  const visible = [...Array(24)].filter((_, i) => mask & (1 << i)).length;
  return (
    <div className="rounded-2xl border border-bone/10 bg-ink-3/60 p-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Membre">
        {MEMBERS.map((m, i) => (
          <button
            key={m.name}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            onPointerEnter={() => setActive(i)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
              i === active ? "border-bone bg-bone text-ink" : "border-bone/15 text-bone/80 hover:border-bone/50"
            }`}
          >
            <span className={`flex size-5 items-center justify-center rounded-full text-[10px] font-semibold ${i === active ? "bg-ink text-bone" : "bg-ink-4"}`}>
              {m.name[0]}
            </span>
            {m.name}
            <span className="label opacity-60">{m.role}</span>
          </button>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-8 gap-1.5" aria-hidden>
        {[...Array(24)].map((_, i) => {
          const on = !!(mask & (1 << i));
          return (
            <span
              key={i}
              className="aspect-[3/4] rounded-[4px] border transition-all duration-500"
              style={{
                borderColor: on ? "rgba(237,235,228,0.55)" : "rgba(237,235,228,0.08)",
                backgroundColor: on ? "rgba(237,235,228,0.12)" : "transparent",
                transitionDelay: `${(i % 8) * 25}ms`,
              }}
            />
          );
        })}
      </div>
      <p className="label mt-4 text-mute">
        {visible} dossiers sur 24 lisibles par {MEMBERS[active].name}
      </p>
    </div>
  );
}

/* ───────────── 03 · Double clé : un code qui change toutes les 30 s ───────────── */

function fakeCode(step: number) {
  // Purement décoratif : une suite pseudo-aléatoire déterministe.
  let x = (step * 2654435761) % 4294967296;
  x = (x ^ (x >>> 13)) * 1274126177;
  return String(Math.abs(x) % 1_000_000).padStart(6, "0");
}

export function TotpDemo() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  const seconds = now ? (now / 1000) % 30 : 0;
  const code = now ? fakeCode(Math.floor(now / 30000)) : "······";
  const remaining = 30 - seconds;
  const C = 2 * Math.PI * 18;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-bone/10 bg-ink-3/60 p-5">
      <div>
        <span className="label text-mute">Code à usage unique</span>
        <p className="mt-3 font-mono text-[2rem] tracking-[0.14em] text-bone sm:text-4xl sm:tracking-[0.18em] md:text-5xl" aria-label="Code de démonstration">
          {code.slice(0, 3)}
          <span className="text-mute"> </span>
          {code.slice(3)}
        </p>
      </div>
      <svg viewBox="0 0 44 44" className="size-14 -rotate-90" aria-hidden>
        <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(237,235,228,0.1)" strokeWidth="3" />
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke={remaining < 6 ? "var(--color-danger)" : "var(--color-bone)"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - remaining / 30)}
        />
      </svg>
    </div>
  );
}

/* ───────────── 04 · Journal scellé : altérer un maillon casse la chaîne ───────────── */

const ACTIONS = ["Connexion", "Dossier consulté", "Donnée révélée", "Accès accordé", "Dossier modifié", "Déconnexion"];

function shortHash(seed: number) {
  let h = seed * 2246822519;
  let out = "";
  for (let i = 0; i < 8; i++) {
    h = (h * 1103515245 + 12345) % 2147483648;
    out += "0123456789abcdef"[h % 16];
  }
  return out;
}

export function ChainDemo() {
  const [blocks, setBlocks] = useState(() => [0, 1, 2, 3].map((i) => ({ id: i, action: ACTIONS[i] })));
  const [tampered, setTampered] = useState<number | null>(null);
  const counter = useRef(4);

  useEffect(() => {
    const id = setInterval(() => {
      setBlocks((b) => {
        const n = counter.current++;
        return [...b.slice(-4), { id: n, action: ACTIONS[n % ACTIONS.length] }];
      });
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const brokenFrom = tampered === null ? Infinity : blocks.findIndex((b) => b.id === tampered);

  return (
    <div className="rounded-2xl border border-bone/10 bg-ink-3/60 p-5">
      <ol className="flex flex-col gap-1.5" aria-live="off">
        {blocks.map((b, i) => {
          const broken = i >= brokenFrom && brokenFrom !== -1;
          return (
            <li
              key={b.id}
              className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 font-mono text-xs transition-colors duration-500 ${
                broken ? "border-danger/60 bg-danger/10 text-danger" : "border-bone/10 text-bone/80"
              }`}
              style={{ animation: "chain-in 600ms var(--ease-expo)" }}
            >
              <span className="flex items-center gap-3">
                <span className="text-mute">#{String(1280 + b.id).padStart(4, "0")}</span>
                {b.action}
              </span>
              <span>{broken ? "≠ empreinte" : shortHash(b.id)}</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className={`label ${tampered === null ? "text-moss" : "text-danger"}`}>
          {tampered === null ? "Chaîne intègre" : "Altération détectée"}
        </p>
        <button
          type="button"
          onClick={() => setTampered((t) => (t === null ? blocks[1].id : null))}
          className="label rounded-full border border-bone/20 px-4 py-2.5 text-bone transition-colors hover:border-brass hover:text-brass"
        >
          {tampered === null ? "Altérer une ligne" : "Restaurer"}
        </button>
      </div>
      <style>{`@keyframes chain-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }`}</style>
    </div>
  );
}
