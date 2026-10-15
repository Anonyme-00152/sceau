"use client";

import { useFormStatus } from "react-dom";

// Un seul envoi : un second clic arriverait après la décision et afficherait « lien déjà utilisé ».
export function DecisionButtons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-3">
      <button
        name="decision"
        value="approuver"
        disabled={pending}
        className="inline-flex h-13 flex-1 items-center justify-center rounded-full bg-brass px-6 font-medium text-ink transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
      >
        {pending ? "Enregistrement…" : "Valider l'accès"}
      </button>
      <button
        name="decision"
        value="refuser"
        disabled={pending}
        className="inline-flex h-13 items-center justify-center rounded-full border border-bone/20 px-6 text-bone/85 transition-colors hover:border-danger hover:text-danger disabled:opacity-60"
      >
        Refuser
      </button>
    </div>
  );
}
