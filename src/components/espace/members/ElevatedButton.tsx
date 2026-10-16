"use client";

import type { MemberActionState } from "@/lib/member-actions";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Feedback, useElevatedAction } from "./shared";

/** Une action de gestion (réinitialiser, suspendre…) : titre, explication, bouton, puis le résultat sur place. */
export function ElevatedButton({
  action,
  title,
  description,
  label,
  icon,
  danger,
}: {
  action: () => Promise<MemberActionState>;
  title: string;
  description: string;
  label: string;
  icon: IconName;
  danger?: boolean;
}) {
  const [state, onSubmit, pending] = useElevatedAction(() => action());

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-xl">
          <p className="text-bone">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-mute">{description}</p>
        </div>
        <button
          disabled={pending}
          className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors disabled:opacity-60 ${
            danger ? "border-danger/40 text-danger hover:bg-danger/10" : "border-bone/15 text-bone/85 hover:border-bone hover:text-bone"
          }`}
        >
          <Icon name={icon} className="size-4" />
          {pending ? "…" : label}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
