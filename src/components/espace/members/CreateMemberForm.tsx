"use client";

import { useRef } from "react";
import { createMemberAction } from "@/lib/member-actions";
import { ROLE_LABEL } from "@/lib/fields";
import { Icon } from "@/components/ui/Icon";
import { Feedback, fieldClass, useElevatedAction } from "./shared";

export function CreateMemberForm() {
  const form = useRef<HTMLFormElement>(null);
  const [state, onSubmit, pending] = useElevatedAction(async (prev, formData) => {
    const res = await createMemberAction(prev, formData);
    if (res.ok) form.current?.reset();
    return res;
  });

  return (
    <form ref={form} onSubmit={onSubmit} className="space-y-5 px-6 py-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="label text-mute">Nom complet</span>
          <input name="name" required autoComplete="off" className={fieldClass} />
        </label>
        <label className="block">
          <span className="label text-mute">E-mail</span>
          <input name="email" type="email" required autoComplete="off" className={fieldClass} />
        </label>
        <label className="block">
          <span className="label text-mute">Fonction</span>
          <input name="title" autoComplete="off" placeholder="Membre" className={fieldClass} />
        </label>
        <label className="block">
          <span className="label text-mute">Rôle</span>
          <select name="role" defaultValue="lecteur" className={fieldClass}>
            {(["lecteur", "gestionnaire", "direction"] as const).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-sm leading-relaxed text-mute">
          Un mot de passe provisoire est généré. À sa première connexion, la personne associe son téléphone puis signe l&apos;engagement.
        </p>
        <button
          disabled={pending}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-bone px-5 text-sm font-medium text-ink transition-transform hover:scale-[1.03] disabled:opacity-60"
        >
          <Icon name="plus" className="size-4" />
          {pending ? "Création…" : "Créer le compte"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
