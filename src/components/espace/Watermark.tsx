"use client";

import { useEffect, useMemo, useState } from "react";
import { usePref } from "@/lib/client-store";

// Filigrane nominatif sur tout l'espace : une capture d'écran porte toujours le nom de son auteur.
// Et quand la fenêtre perd le focus, le contenu se floute (regard par-dessus l'épaule, partage d'écran).
export function Watermark({ name, sessionTag }: { name: string; sessionTag: string }) {
  const [stamp, setStamp] = useState("");

  useEffect(() => {
    const update = () =>
      setStamp(new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date()));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  const tile = useMemo(() => {
    const text = `${name} · ${stamp} · ${sessionTag}`.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='220'><text x='10' y='120' fill='%23edebe4' font-family='ui-monospace,monospace' font-size='12' letter-spacing='1' transform='rotate(-16 210 110)'>${encodeURIComponent(text)}</text></svg>`;
    return `url("data:image/svg+xml;utf8,${svg}")`;
  }, [name, stamp, sessionTag]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[70] opacity-[0.045] print:opacity-30"
      style={{ backgroundImage: tile }}
    />
  );
}

export const BLUR_PREF = "sceau:flou";

export function PrivacyBlur() {
  const [blurred, setBlurred] = useState(false);
  const [enabled] = usePref(BLUR_PREF, true);

  useEffect(() => {
    const onBlur = () => setBlurred(true);
    const onFocus = () => setBlurred(false);
    const onVisibility = () => setBlurred(document.visibilityState === "hidden");
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (!enabled || !blurred) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/40 backdrop-blur-2xl" role="status">
      <div className="text-center">
        <p className="label text-mute">Contenu masqué</p>
        <p className="mt-3 text-2xl tracking-[-0.03em]">Revenez sur la fenêtre pour continuer.</p>
      </div>
    </div>
  );
}
