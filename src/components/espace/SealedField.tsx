"use client";

import { useEffect, useRef, useState } from "react";
import { logCopyAction, revealFieldAction } from "@/app/espace/actions";
import { REVEAL_SECONDS } from "@/lib/constants";
import { Icon } from "@/components/ui/Icon";
import { useElevation } from "./Elevation";

type Props = {
  clientId: string;
  fieldKey: string;
  label: string;
  shape: string;
  empty: boolean;
  critical: boolean;
  allowed: boolean;
  needsElevation: boolean;
  reason?: string;
  multiline?: boolean;
};

// Donnée scellée : masquée par défaut, révélée à la demande pour un temps limité, chaque fois journalisée.
export function SealedField(p: Props) {
  const [value, setValue] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { requestElevation } = useElevation();
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => () => clearInterval(timer.current), []);

  const hide = () => {
    clearInterval(timer.current);
    setValue(null);
    setLeft(0);
  };

  const reveal = async (retry = false): Promise<void> => {
    if (pending) return;
    setError(null);
    setPending(true);
    const res = await revealFieldAction(p.clientId, p.fieldKey);
    setPending(false);
    if (res.ok) {
      setValue(res.value);
      setLeft(REVEAL_SECONDS);
      clearInterval(timer.current);
      timer.current = setInterval(() => {
        setLeft((l) => {
          if (l <= 1) {
            clearInterval(timer.current);
            setValue(null);
            return 0;
          }
          return l - 1;
        });
      }, 1000);
      return;
    }
    if (res.needsElevation && !retry) {
      if (await requestElevation()) return reveal(true);
      return;
    }
    setError(res.error);
  };

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      void logCopyAction(p.clientId, p.fieldKey);
    } catch {}
  };

  const shown = value !== null;

  return (
    <div className="relative">
      <div className="flex min-h-7 items-center justify-between gap-3">
        <span className="label flex items-center gap-2 text-mute">
          {p.label}
          {p.critical && <span className="text-danger">· critique</span>}
        </span>
        {!p.empty &&
          (p.allowed ? (
            <span className="flex items-center gap-1">
              {shown && (
                <button
                  type="button"
                  onClick={copy}
                  className="rounded-full p-1.5 text-mute transition-colors hover:text-bone"
                  aria-label={`Copier ${p.label} (journalisé)`}
                  title="Copier (journalisé)"
                >
                  <Icon name={copied ? "check" : "copy"} className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => (shown ? hide() : reveal())}
                disabled={pending}
                className={`label flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 transition-colors disabled:opacity-50 ${
                  shown ? "border-bone/30 text-bone" : "border-bone/15 text-bone/75 hover:border-brass hover:text-brass"
                }`}
              >
                <Icon name={shown ? "eyeOff" : p.needsElevation ? "key" : "eye"} className="size-3.5" />
                {pending ? "…" : shown ? `Masquer · ${left}s` : "Révéler"}
              </button>
            </span>
          ) : (
            <span className="label flex items-center gap-1.5 text-mute" title={p.reason}>
              <Icon name="lock" className="size-3.5" />
              Réservé
            </span>
          ))}
      </div>

      <div className="mt-1.5">
        {p.empty ? (
          <p className="text-bone/30">—</p>
        ) : shown ? (
          <p
            className={`text-bone ${p.multiline ? "whitespace-pre-wrap leading-relaxed" : "break-words font-mono text-[0.95rem]"}`}
            onCopy={() => void logCopyAction(p.clientId, p.fieldKey)}
          >
            {value}
          </p>
        ) : (
          <p className="select-none font-mono tracking-[0.22em] text-bone/35" aria-label={`${p.label} masqué`}>
            {p.multiline ? `${p.shape}\n${p.shape}` : p.shape}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      {shown && (
        <span
          aria-hidden
          className="absolute -bottom-3 left-0 h-px bg-brass"
          style={{ width: `${(left / REVEAL_SECONDS) * 100}%`, transition: "width 1s linear" }}
        />
      )}
    </div>
  );
}
