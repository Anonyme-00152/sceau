"use client";

import { deleteMemberAction } from "@/lib/member-actions";
import { Icon } from "@/components/ui/Icon";
import { Feedback, fieldClass, useElevatedAction } from "./shared";

export function DeleteMemberForm({ memberId, email }: { memberId: string; email: string }) {
  const [state, onSubmit, pending] = useElevatedAction(deleteMemberAction.bind(null, memberId));

  return (
    <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
      <div className="max-w-xl">
        <p className="text-bone">Supprimer le compte</p>
        <p className="mt-1 text-sm leading-relaxed text-mute">
          Définitif. Possible seulement pour un compte sans dossier ni échange à son nom ; sinon, suspendez-le. Le journal garde la trace
          de ses actions passées.
        </p>
      </div>
      <label className="block max-w-md">
        <span className="label text-mute">Recopiez l&apos;adresse pour confirmer</span>
        <input name="confirm" autoComplete="off" placeholder={email} className={fieldClass} />
      </label>
      <button
        disabled={pending}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-danger/40 px-4 text-sm text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
      >
        <Icon name="close" className="size-4" />
        {pending ? "Suppression…" : "Supprimer définitivement"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
