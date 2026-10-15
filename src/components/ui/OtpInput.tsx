"use client";

import { useRef, useState } from "react";

// Six cases, saisie fluide : avance automatique, retour arrière, collage d'un code entier.
export function OtpInput({
  name = "code",
  onComplete,
  disabled,
  autoFocus = true,
  value: controlled,
  onChange,
  invalid,
}: {
  name?: string;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  value?: string;
  onChange?: (code: string) => void;
  invalid?: boolean;
}) {
  const [inner, setInner] = useState("");
  const value = controlled ?? inner;
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const set = (next: string) => {
    const clean = next.replace(/\D/g, "").slice(0, 6);
    if (controlled === undefined) setInner(clean);
    onChange?.(clean);
    if (clean.length === 6) onComplete?.(clean);
    return clean;
  };

  return (
    <div className="flex items-center gap-2 sm:gap-2.5" role="group" aria-label="Code à usage unique, 6 chiffres">
      <input type="hidden" name={name} value={value} />
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="contents">
          <input
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            autoFocus={autoFocus && i === 0}
            aria-label={`Chiffre ${i + 1}`}
            aria-invalid={invalid || undefined}
            disabled={disabled}
            maxLength={1}
            value={value[i] ?? ""}
            onFocus={(e) => e.currentTarget.select()}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = set(e.clipboardData.getData("text"));
              refs.current[Math.min(5, pasted.length)]?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !value[i] && i > 0) {
                e.preventDefault();
                set(value.slice(0, i - 1) + value.slice(i));
                refs.current[i - 1]?.focus();
              } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
              else if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
            }}
            onChange={(e) => {
              const digit = e.target.value.replace(/\D/g, "").slice(-1);
              const chars = value.padEnd(6, " ").split("");
              chars[i] = digit || " ";
              const next = set(chars.join("").replace(/\s+$/g, "").replace(/\s/g, ""));
              if (digit && i < 5) refs.current[Math.min(i + 1, next.length)]?.focus();
            }}
            className={`h-14 w-full min-w-0 rounded-xl border bg-ink-2 text-center font-mono text-2xl text-bone outline-none transition-colors focus:border-bone disabled:opacity-50 sm:h-16 ${
              invalid ? "border-danger/70" : "border-bone/15"
            }`}
          />
          {i === 2 && <span className="h-px w-3 shrink-0 bg-bone/25" aria-hidden />}
        </span>
      ))}
    </div>
  );
}
