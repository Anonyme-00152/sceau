import Link from "next/link";
import { AUDIT_LABEL, type AuditAction } from "@/lib/audit";
import type { AuditEntry } from "@/lib/db/schema";
import { relative } from "@/lib/format";
import { Icon, type IconName } from "@/components/ui/Icon";

const ICON: Partial<Record<AuditAction, IconName>> = {
  "connexion.reussie": "fingerprint",
  "connexion.echec": "shield",
  "connexion.bloquee": "shield",
  "code.echec": "key",
  "confidentialite.acceptee": "edit",
  "session.verrouillee": "lock",
  "session.deverrouillee": "unlock",
  "session.elevee": "key",
  "session.revoquee": "device",
  deconnexion: "logout",
  "client.consulte": "eye",
  "client.cree": "plus",
  "client.modifie": "edit",
  "champ.revele": "eye",
  "champ.copie": "copy",
  "acces.accorde": "team",
  "acces.retire": "team",
  "acces.refuse": "shield",
  "echange.ajoute": "note",
  "journal.verifie": "chain",
};

const ALERT = new Set<string>(["connexion.echec", "connexion.bloquee", "code.echec", "acces.refuse"]);

export function ActivityList({ entries, showActor = true }: { entries: AuditEntry[]; showActor?: boolean }) {
  if (entries.length === 0) return <p className="px-6 py-10 text-center text-sm text-mute">Aucune activité pour le moment.</p>;
  return (
    <ol className="divide-y divide-bone/[0.06]">
      {entries.map((e) => {
        const action = e.action as AuditAction;
        const alert = ALERT.has(e.action);
        const body = (
          <>
            <span
              className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${alert ? "bg-danger/15 text-danger" : "bg-bone/[0.06] text-bone/70"}`}
            >
              <Icon name={ICON[action] ?? "journal"} className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-bone">
                {AUDIT_LABEL[action] ?? e.action}
                {showActor && <span className="text-mute"> · {e.actor}</span>}
              </span>
              {e.label && <span className="mt-0.5 block truncate text-sm text-mute">{e.label}</span>}
            </span>
            <span className="label shrink-0 pt-1 text-mute">{relative(e.at)}</span>
          </>
        );
        return (
          <li key={e.seq}>
            {e.targetType === "client" && e.targetId ? (
              <Link href={`/espace/clients/${e.targetId}`} className="flex items-start gap-4 px-6 py-3.5 transition-colors hover:bg-bone/[0.03]">
                {body}
              </Link>
            ) : (
              <div className="flex items-start gap-4 px-6 py-3.5">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
