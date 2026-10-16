"use client";

import { startTransition, useActionState, useState } from "react";
import type { MemberActionState } from "@/lib/member-actions";
import { useElevation } from "../Elevation";
import { Icon } from "@/components/ui/Icon";

export const fieldClass =
  "mt-2 h-11 w-full rounded-xl border border-bone/15 bg-ink px-4 text-sm text-bone outline-none transition-colors focus:border-bone aria-[invalid]:border-danger/70";

/**
 * Action de gestion des comptes : le code à usage unique est redemandé avant l'envoi (accès renforcé).
 * La fenêtre du code s'ouvre depuis l'évènement d'envoi, hors de la transition de l'action : une mise à jour
 * d'état faite pendant une action n'est appliquée qu'à sa fin, la fenêtre ne s'ouvrirait jamais.
 */
export function useElevatedAction(action: (prev: MemberActionState, formData: FormData) => Promise<MemberActionState>) {
  const { requestElevation } = useElevation();
  const [state, dispatch, pending] = useActionState<MemberActionState, FormData>(action, {});
  const [asking, setAsking] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    setAsking(true);
    const ok = await requestElevation();
    setAsking(false);
    setCancelled(!ok);
    if (ok) startTransition(() => dispatch(formData));
  };

  const shown: MemberActionState = cancelled ? { error: "Confirmation annulée : le code à usage unique est requis." } : state;
  return [shown, onSubmit, pending || asking] as const;
}

export function Feedback({ state }: { state: MemberActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-danger">
        {state.error}
      </p>
    );
  }
  if (!state.ok) return null;
  return (
    <div role="status" className="space-y-3">
      <p className="text-sm text-moss">{state.ok}</p>
      {state.secret && <SecretOnce value={state.secret} />}
    </div>
  );
}

/** Mot de passe provisoire : affiché une seule fois, à transmettre de vive voix. */
function SecretOnce({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl border border-brass/30 bg-brass/[0.06] p-4">
      <p className="label text-brass">Mot de passe provisoire · affiché une seule fois</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <code className="select-all break-all font-mono text-lg tracking-wider text-bone">{value}</code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
          className="label inline-flex items-center gap-1.5 rounded-full border border-bone/15 px-3 py-1.5 text-bone/80 transition-colors hover:border-bone hover:text-bone"
        >
          <Icon name={copied ? "check" : "copy"} className="size-3.5" />
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-bone/70">
        Transmettez-le de vive voix, jamais par e-mail. La personne associera son téléphone à sa première connexion, puis pourra le
        changer dans « Mon compte ».
      </p>
    </div>
  );
}
