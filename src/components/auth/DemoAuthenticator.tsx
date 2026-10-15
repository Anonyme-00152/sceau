"use client";

import { useEffect, useState } from "react";

// Simule l'application d'authentification du membre, pour la démonstration uniquement.
export function DemoAuthenticator({ email, onUse }: { email: string; onUse: (code: string) => void }) {
  const [data, setData] = useState<{ code: string; expiresAt: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const res = await fetch(`/api/demo/code?email=${encodeURIComponent(email)}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const json = (await res.json()) as { code: string; remaining: number };
        if (cancelled) return;
        setData({ code: json.code, expiresAt: Date.now() + json.remaining * 1000 });
        setFailed(false);
        timer = setTimeout(load, json.remaining * 1000 + 150);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    void load();
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(tick);
    };
  }, [email]);

  if (failed) return null;
  const remaining = data ? Math.max(0, (data.expiresAt - now) / 1000) : 30;
  const C = 2 * Math.PI * 15;

  return (
    <div className="rounded-2xl border border-dashed border-bone/20 bg-ink-2/60 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="label text-steel">Authentificateur de démonstration</p>
          <p className="mt-2 font-mono text-3xl tracking-[0.2em] text-bone" aria-live="polite">
            {data ? `${data.code.slice(0, 3)} ${data.code.slice(3)}` : "··· ···"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 36 36" className="size-9 -rotate-90" aria-label={`${Math.ceil(remaining)} secondes restantes`}>
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(237,235,228,0.12)" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke={remaining < 6 ? "var(--color-danger)" : "var(--color-bone)"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - remaining / 30)}
            />
          </svg>
          <button
            type="button"
            disabled={!data}
            onClick={() => data && onUse(data.code)}
            className="label rounded-full bg-bone px-3.5 py-2.5 text-ink transition-transform hover:scale-[1.04] disabled:opacity-40"
          >
            Utiliser
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-mute">
        Sur un vrai compte, ce code s&apos;affiche uniquement sur le téléphone du membre.
      </p>
    </div>
  );
}
