"use client";

import { useActionState, useRef } from "react";
import { changeOwnPasswordAction, updateOwnProfileAction, type MemberActionState } from "@/lib/member-actions";
import { Icon } from "@/components/ui/Icon";
import { Feedback, fieldClass } from "./shared";

const saveClass =
  "inline-flex h-11 items-center gap-2 rounded-full bg-bone px-5 text-sm font-medium text-ink transition-transform hover:scale-[1.03] disabled:opacity-60";

export function ProfileForm({ name, title }: { name: string; title: string }) {
  const [state, action, pending] = useActionState<MemberActionState, FormData>(updateOwnProfileAction, {});
  return (
    <form action={action} className="space-y-5 px-6 py-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="label text-mute">Nom complet</span>
          <input name="name" required defaultValue={name} autoComplete="name" className={fieldClass} />
        </label>
        <label className="block">
          <span className="label text-mute">Fonction</span>
          <input name="title" defaultValue={title} autoComplete="organization-title" className={fieldClass} />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Feedback state={state} />
        <button disabled={pending} className={`ml-auto ${saveClass}`}>
          <Icon name="check" className="size-4" />
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

export function PasswordForm({ email }: { email: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<MemberActionState, FormData>(async (prev, formData) => {
    const res = await changeOwnPasswordAction(prev, formData);
    if (res.ok) form.current?.reset();
    return res;
  }, {});
  return (
    <form ref={form} action={action} className="space-y-5 px-6 py-5">
      {/* Aide les gestionnaires de mots de passe à associer le nouveau mot de passe au bon compte. */}
      <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="block">
          <span className="label text-mute">Mot de passe actuel</span>
          <input name="current" type="password" required autoComplete="current-password" className={fieldClass} />
        </label>
        <label className="block">
          <span className="label text-mute">Nouveau</span>
          <input name="password" type="password" required minLength={12} autoComplete="new-password" className={fieldClass} />
        </label>
        <label className="block">
          <span className="label text-mute">Confirmation</span>
          <input name="confirm" type="password" required autoComplete="new-password" className={fieldClass} />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-mute">12 caractères minimum, lettres et chiffres. Vos autres appareils seront déconnectés.</p>
        <button disabled={pending} className={saveClass}>
          <Icon name="key" className="size-4" />
          {pending ? "Modification…" : "Changer le mot de passe"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
