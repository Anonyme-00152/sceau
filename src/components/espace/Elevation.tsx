"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { elevateAction } from "@/lib/auth-actions";
import { OtpInput } from "@/components/ui/OtpInput";
import { DemoAuthenticator } from "@/components/auth/DemoAuthenticator";
import { Icon } from "@/components/ui/Icon";

// Accès renforcé : pour les données critiques, on redemande la seconde clé.
// requestElevation() ouvre la fenêtre et se résout quand le code est validé (ou abandonné).

type Api = { until: number | null; requestElevation: () => Promise<boolean> };
const Ctx = createContext<Api>({ until: null, requestElevation: async () => false });
export const useElevation = () => useContext(Ctx);

export function ElevationProvider({
  children,
  initialUntil,
  demoEmail,
}: {
  children: React.ReactNode;
  initialUntil: number | null;
  demoEmail: string | null;
}) {
  const [until, setUntil] = useState(initialUntil);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const requestElevation = useCallback(() => {
    if (until && until > Date.now()) return Promise.resolve(true);
    setCode("");
    setError(null);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, [until]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const close = (ok: boolean) => {
    setOpen(false);
    resolver.current?.(ok);
    resolver.current = null;
  };

  const submit = async (value: string) => {
    if (value.length !== 6 || pending) return;
    setPending(true);
    const res = await elevateAction(value);
    setPending(false);
    if (res.ok && res.until) {
      setUntil(res.until);
      close(true);
    } else {
      setError(res.error ?? "Code refusé.");
      setCode("");
    }
  };

  return (
    <Ctx.Provider value={{ until, requestElevation }}>
      {children}
      <dialog
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          close(false);
        }}
        aria-labelledby="elevation-title"
        className="m-auto w-[min(92vw,460px)] rounded-3xl border border-bone/15 bg-ink-2 p-0 text-bone shadow-[0_40px_120px_rgba(0,0,0,0.8)] backdrop:bg-ink/80 backdrop:backdrop-blur-sm"
      >
        {open && (
          <div className="p-7">
            <div className="flex items-start justify-between gap-4">
              <span className="flex size-11 items-center justify-center rounded-full bg-brass/15 text-brass">
                <Icon name="key" className="size-5" />
              </span>
              <button type="button" onClick={() => close(false)} className="rounded-full p-2 text-mute hover:text-bone" aria-label="Fermer">
                <Icon name="close" />
              </button>
            </div>
            <h2 id="elevation-title" className="mt-5 text-2xl tracking-[-0.03em]">
              Accès renforcé
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-bone/65">
              Donnée critique ou dossier secret : confirmez avec votre code à usage unique. L&apos;accès renforcé dure
              5&nbsp;minutes et sera journalisé.
            </p>
            <div className="mt-6">
              <OtpInput value={code} onChange={setCode} onComplete={submit} invalid={!!error} disabled={pending} />
            </div>
            {error && (
              <p role="alert" className="mt-3 text-sm text-danger">
                {error}
              </p>
            )}
            {demoEmail && (
              <div className="mt-6">
                <DemoAuthenticator
                  email={demoEmail}
                  onUse={(c) => {
                    setCode(c);
                    void submit(c);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </dialog>
    </Ctx.Provider>
  );
}
