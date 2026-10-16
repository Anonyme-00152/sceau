import type { Metadata } from "next";
import Link from "next/link";
import { count } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { activeSessions, requireAccess } from "@/lib/session";
import { listPendingRequests } from "@/lib/accounts";
import { ROLE_LABEL } from "@/lib/fields";
import { describeAgent } from "@/lib/request";
import { relative } from "@/lib/format";
import { revokeOtherSessionsAction, revokeSessionAction } from "../actions";
import { PageHeader, Panel } from "@/components/espace/PageHeader";
import { Avatar } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { PendingRequest, type PendingView } from "@/components/espace/PendingRequest";
import { CreateMemberForm } from "@/components/espace/members/CreateMemberForm";

export const metadata: Metadata = { title: "Équipe & sessions" };

const ROLE_RIGHTS = {
  direction: "Gère les accès de tous les dossiers, lit le journal complet, révèle les données critiques.",
  gestionnaire: "Crée et modifie ses dossiers, révèle les données critiques avec accès renforcé.",
  lecteur: "Consulte les dossiers de sa liste. Aucune donnée critique, aucune modification.",
} as const;

export default async function TeamPage() {
  const { user, session } = await requireAccess();
  const direction = user.role === "direction";

  const [everyone, accessCounts, sessions, pendingRows] = await Promise.all([
    db.select().from(schema.users).orderBy(schema.users.name),
    db.select({ userId: schema.clientAccess.userId, n: count() }).from(schema.clientAccess).groupBy(schema.clientAccess.userId),
    activeSessions(),
    direction ? listPendingRequests() : Promise.resolve([]),
  ]);
  const members = everyone.filter((m) => m.status === "actif" || m.status === "suspendu");
  const fmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const pendingRequests: PendingView[] = pendingRows.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    title: m.title,
    note: m.requestNote,
    when: fmt.format(m.createdAt),
    expires: fmt.format(m.approvalExpiresAt ?? 0),
  }));
  const accessBy = new Map(accessCounts.map((a) => [a.userId, a.n]));
  const visibleSessions = sessions.filter((s) => direction || s.session.userId === user.id);
  const activeBy = new Map<string, number>();
  for (const s of sessions) activeBy.set(s.session.userId, (activeBy.get(s.session.userId) ?? 0) + 1);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={<>Équipe · {members.length} membres</>}
        title={
          <>
            Des personnes, <span className="serif-accent text-brass">pas des comptes.</span>
          </>
        }
        description="Chaque accès est nominatif. Aucun identifiant partagé, aucune session anonyme."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(Object.keys(ROLE_RIGHTS) as (keyof typeof ROLE_RIGHTS)[]).map((r) => (
          <div key={r} className={`rounded-3xl border p-6 ${user.role === r ? "border-bone/30 bg-bone/[0.04]" : "border-bone/10"}`}>
            <p className="label flex items-center justify-between text-mute">
              {ROLE_LABEL[r]}
              {user.role === r && <span className="text-moss">Votre rôle</span>}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-bone/75">{ROLE_RIGHTS[r]}</p>
          </div>
        ))}
      </div>

      {direction && (
        <Panel title={`Demandes d'accès en attente · ${pendingRequests.length}`}>
          {pendingRequests.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-mute">
              Aucune demande. Les nouvelles demandes arrivent par e-mail à l&apos;administrateur, avec un code de validation.
            </p>
          ) : (
            <ul className="divide-y divide-bone/[0.06]">
              {pendingRequests.map((r) => (
                <PendingRequest key={r.id} req={r} />
              ))}
            </ul>
          )}
        </Panel>
      )}

      {direction && (
        <Panel title="Ajouter un compte">
          <CreateMemberForm />
        </Panel>
      )}

      <Panel title="Membres">
        <ul className="divide-y divide-bone/[0.06]">
          {members.map((m) => {
            const active = activeBy.get(m.id) ?? 0;
            return (
              <li key={m.id} className="grid grid-cols-1 items-center gap-4 px-6 py-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto_auto]">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="relative">
                    <Avatar name={m.name} className="size-10 text-sm" />
                    {active > 0 && <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-ink-2 bg-moss" aria-label="En ligne" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-bone">
                      {m.name}
                      {m.id === user.id && <span className="text-mute"> · vous</span>}
                    </p>
                    <p className="truncate text-sm text-mute">{m.title}</p>
                  </div>
                </div>
                <p className="truncate text-sm text-bone/60">{direction || m.id === user.id ? m.email : "—"}</p>
                <span className="flex flex-wrap gap-2">
                  <span className="label rounded-full border border-bone/15 px-3 py-1.5 text-bone/75">{ROLE_LABEL[m.role]}</span>
                  {m.status === "suspendu" && <span className="label rounded-full border border-danger/40 px-3 py-1.5 text-danger">Suspendu</span>}
                </span>
                <p className="label text-mute md:text-right">
                  {accessBy.get(m.id) ?? 0} dossiers · {m.lastLoginAt ? relative(m.lastLoginAt) : "jamais connecté"}
                </p>
                {direction || m.id === user.id ? (
                  <Link
                    href={direction ? `/espace/equipe/${m.id}` : "/espace/compte"}
                    className="label inline-flex items-center justify-center gap-1.5 justify-self-start rounded-full border border-bone/15 px-3 py-2 text-bone/80 transition-colors hover:border-brass hover:text-brass md:justify-self-end"
                  >
                    <Icon name={direction ? "settings" : "key"} className="size-3.5" />
                    {direction ? "Gérer" : "Mon compte"}
                  </Link>
                ) : (
                  <span aria-hidden />
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel
        title={direction ? "Sessions actives de l'équipe" : "Vos sessions actives"}
        action={
          <form action={revokeOtherSessionsAction}>
            <button className="label rounded-full border border-bone/15 px-3 py-2 text-mute transition-colors hover:border-danger hover:text-danger">
              Fermer mes autres sessions
            </button>
          </form>
        }
      >
        <ul className="divide-y divide-bone/[0.06]">
          {visibleSessions.map(({ session: s, name }) => {
            const current = s.id === session.id;
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <span className={`flex size-10 items-center justify-center rounded-full ${current ? "bg-moss/15 text-moss" : "bg-bone/[0.06] text-bone/70"}`}>
                  <Icon name="device" className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-bone">
                    {describeAgent(s.userAgent)}
                    {direction && <span className="text-mute"> · {name}</span>}
                    {current && <span className="label ml-2 text-moss">cette session</span>}
                    {s.lockedAt && <span className="label ml-2 text-steel">verrouillée</span>}
                  </p>
                  <p className="mt-1 font-mono text-xs text-mute">
                    {s.ip} · ouverte {relative(s.createdAt)} · vue {relative(s.lastSeenAt)}
                  </p>
                </div>
                {!current && (
                  <form action={revokeSessionAction}>
                    <input type="hidden" name="sessionId" value={s.id} />
                    <button className="label rounded-full border border-bone/15 px-3 py-2 text-mute transition-colors hover:border-danger hover:text-danger">
                      Révoquer
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
