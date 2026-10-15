"use client";

import { useActionState, useEffect, useRef } from "react";
import { addEventAction } from "@/app/espace/actions";
import { EVENT_LABEL } from "@/lib/fields";

export function EventForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState<{ error?: string; ok?: number }, FormData>(
    addEventAction.bind(null, clientId),
    {},
  );
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state.ok]);

  return (
    <form ref={form} action={action} className="space-y-3 border-t border-bone/10 px-6 py-5">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Type d'échange">
        {Object.entries(EVENT_LABEL).map(([value, label], i) => (
          <label key={value} className="cursor-pointer">
            <input type="radio" name="kind" value={value} defaultChecked={i === 0} className="peer sr-only" />
            <span className="block rounded-full border border-bone/15 px-3 py-1.5 text-sm text-bone/70 transition-colors peer-checked:border-bone peer-checked:bg-bone peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brass">
              {label}
            </span>
          </label>
        ))}
      </div>
      <textarea
        name="body"
        rows={3}
        required
        maxLength={2000}
        placeholder="Consigner un échange — il sera chiffré."
        aria-label="Contenu de l'échange"
        className="w-full resize-none rounded-2xl border border-bone/10 bg-ink px-4 py-3 text-sm text-bone outline-none transition-colors placeholder:text-mute focus:border-bone"
      />
      <div className="flex items-center justify-between gap-4">
        <p className={`text-sm ${state.error ? "text-danger" : "text-mute"}`} role={state.error ? "alert" : undefined}>
          {state.error ?? "Chiffré avant d'être enregistré."}
        </p>
        <button
          disabled={pending}
          className="inline-flex h-10 items-center rounded-full bg-bone px-4 text-sm font-medium text-ink transition-transform hover:scale-[1.03] disabled:opacity-50"
        >
          {pending ? "…" : "Consigner"}
        </button>
      </div>
    </form>
  );
}
