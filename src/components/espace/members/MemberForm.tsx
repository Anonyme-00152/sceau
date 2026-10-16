"use client";

import { updateMemberAction } from "@/lib/member-actions";
import { ROLE_LABEL } from "@/lib/fields";
import type { Role } from "@/lib/db/schema";
import { Icon } from "@/components/ui/Icon";
import { Feedback, fieldClass, useElevatedAction } from "./shared";

export function MemberForm({ member }: { member: { id: string; name: string; email: string; title: string; role: Role } }) {
  const [state, onSubmit, pending] = useElevatedAction(updateMemberAction.bind(null, member.id));

  return (
    <form onSubmit={onSubmit} className="space-y-5 px-6 py-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="label text-mute">Nom complet</span>
          <input name="name" required defaultValue={member.name} className={fieldClass} />
        </label>
        <label className="block">
          <span className="label text-mute">E-mail de connexion</span>
          <input name="email" type="email" required defaultValue={member.email} className={fieldClass} />
        </label>
        <label className="block">
          <span className="label text-mute">Fonction</span>
          <input name="title" defaultValue={member.title} className={fieldClass} />
        </label>
        <label className="block">
          <span className="label text-mute">Rôle</span>
          <select name="role" defaultValue={member.role} className={fieldClass}>
            {(["lecteur", "gestionnaire", "direction"] as const).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Feedback state={state} />
        <button
          disabled={pending}
          className="ml-auto inline-flex h-11 items-center gap-2 rounded-full bg-bone px-5 text-sm font-medium text-ink transition-transform hover:scale-[1.03] disabled:opacity-60"
        >
          <Icon name="check" className="size-4" />
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
