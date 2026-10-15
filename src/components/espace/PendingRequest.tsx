"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { decideByCodeAction, type CodeDecisionState } from "@/lib/account-actions";
import { ROLE_LABEL } from "@/lib/fields";
import { Avatar } from "@/components/ui/Badge";

export type PendingView = { id: string; name: string; email: string; title: string; note: string | null; when: string; expires: string };

export function PendingRequest({ req }: { req: PendingView }) {
  const [state, action, pending] = useActionState<CodeDecisionState, FormData>(decideByCodeAction.bind(null, req.id), {});
  const router = useRouter();

  // Laisse le temps de lire la confirmation, puis met à jour les listes (membres, demandes).
  useEffect(() => {
    if (!state.ok) return;
    const id = setTimeout(() => router.refresh(), 2500);
    return () => clearTimeout(id);
  }, [state.ok, router]);

  if (state.ok) {
    return (
      <li className="px-6 py-5">
        <p className="text-sm text-moss" role="status">
          {state.ok}
        </p>
      </li>
    );
  }

  return (
    <li className="grid grid-cols-1 gap-5 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex min-w-0 gap-4">
        <Avatar name={req.name} className="size-10 text-sm" />
        <div className="min-w-0">
          <p className="text-bone">{req.name}</p>
          <p className="truncate text-sm text-mute">
            {req.email} · {req.title}
          </p>
          <p className="label mt-2 text-mute">
            Demandé {req.when} · expire {req.expires}
          </p>
          {req.note && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-bone/75">« {req.note} »</p>}
        </div>
      </div>
      <form action={action} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="label text-mute">Code reçu par e-mail</span>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000 000"
              maxLength={7}
              aria-invalid={!!state.error || undefined}
              className="mt-2 h-11 w-full rounded-xl border border-bone/15 bg-ink px-4 font-mono tracking-[0.2em] text-bone outline-none focus:border-bone aria-[invalid]:border-danger/70"
            />
          </label>
          <label className="block">
            <span className="label text-mute">Rôle</span>
            <select name="role" defaultValue="lecteur" className="mt-2 h-11 w-full rounded-xl border border-bone/15 bg-ink px-4 text-sm text-bone outline-none focus:border-bone">
              {(["lecteur", "gestionnaire", "direction"] as const).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            name="decision"
            value="approuver"
            disabled={pending}
            className="inline-flex h-10 items-center rounded-full bg-brass px-4 text-sm font-medium text-ink transition-transform hover:scale-[1.03] disabled:opacity-60"
          >
            Valider avec le code
          </button>
          <button
            name="decision"
            value="refuser"
            disabled={pending}
            className="inline-flex h-10 items-center rounded-full border border-bone/15 px-4 text-sm text-bone/80 transition-colors hover:border-danger hover:text-danger disabled:opacity-60"
          >
            Refuser
          </button>
        </div>
      </form>
    </li>
  );
}
