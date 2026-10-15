import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { recentlyConsulted } from "@/lib/activity";
import { db, schema } from "@/lib/db";
import { requireAccess } from "@/lib/session";
import { canEdit, canManageAccess, hasAccess } from "@/lib/access";
import { audit } from "@/lib/audit";
import { requestInfo } from "@/lib/request";
import { getModules } from "@/lib/settings";
import { buildFieldViews, clientEvents, clientMembers, getClientMeta, readProfile, type FieldView } from "@/lib/clients";
import { EVENT_LABEL, ROLE_LABEL } from "@/lib/fields";
import { dateShort, relative } from "@/lib/format";
import { grantAccessAction, revokeAccessAction } from "../../actions";
import { PageHeader, Panel, buttonClass } from "@/components/espace/PageHeader";
import { SealedField } from "@/components/espace/SealedField";
import { EventForm } from "@/components/espace/EventForm";
import { ActivityList } from "@/components/espace/ActivityList";
import { Avatar, SensitivityBadge, StatusBadge } from "@/components/ui/Badge";
import { Icon, type IconName } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Dossier" };

const EVENT_ICON: Record<string, IconName> = { appel: "phone", "rendez-vous": "calendar", email: "mail", note: "note" };

export default async function ClientPage(props: PageProps<"/espace/clients/[id]">) {
  const { user } = await requireAccess();
  const { id } = await props.params;
  const meta = await getClientMeta(id);
  const { ip } = await requestInfo();

  if (!meta) notFound();
  const { client, ownerName } = meta;
  const access = await hasAccess(user.id, id);

  if (!access) {
    await audit({ userId: user.id, actor: user.name, action: "acces.refuse", targetType: "client", targetId: id, label: client.ref, ip });
    // Hors direction, on ne confirme même pas l'existence du dossier.
    if (user.role !== "direction") notFound();
    return <Restricted id={id} refLabel={client.ref} name={client.displayName} owner={ownerName} sensitivity={client.sensitivity} selfId={user.id} />;
  }

  // Une consultation = une trace. On évite seulement de dupliquer la trace à chaque rafraîchissement rapproché.
  if (!(await recentlyConsulted(user.id, id))) {
    await audit({ userId: user.id, actor: user.name, action: "client.consulte", targetType: "client", targetId: id, label: `${client.ref} · ${client.displayName}`, ip });
  }

  const profile = readProfile(client);
  const { sections, custom } = buildFieldViews(user, client, profile, await getModules());
  const [members, events, traces, team] = await Promise.all([
    clientMembers(id),
    clientEvents(id),
    db
      .select()
      .from(schema.auditLog)
      .where(user.role === "direction" ? eq(schema.auditLog.targetId, id) : and(eq(schema.auditLog.targetId, id), eq(schema.auditLog.userId, user.id)))
      .orderBy(desc(schema.auditLog.seq))
      .limit(6),
    canManageAccess(user) ? db.select({ id: schema.users.id, name: schema.users.name, role: schema.users.role }).from(schema.users) : Promise.resolve([]),
  ]);
  const candidates = team.filter((t) => !members.some((m) => m.userId === t.id));

  return (
    <div className="space-y-8">
      <Link href="/espace/clients" className="label inline-flex items-center gap-2 py-2 text-mute transition-colors hover:text-bone">
        <Icon name="arrowLeft" className="size-4" /> Dossiers
      </Link>

      <PageHeader
        eyebrow={
          <>
            <span className="text-bone/80">{client.ref}</span>
            <span>·</span>
            <span>{client.kind === "entreprise" ? "Entreprise" : "Particulier"}</span>
            {client.city && (
              <>
                <span>·</span>
                <span>
                  {client.city}, {client.country}
                </span>
              </>
            )}
          </>
        }
        title={client.displayName}
        description={
          <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <StatusBadge status={client.status} />
            <span className="text-sm">Titulaire : {ownerName}</span>
            <span className="text-sm">Ouvert le {dateShort(client.createdAt)}</span>
          </span>
        }
        actions={
          <>
            <SensitivityBadge level={client.sensitivity} className="h-11 px-4" />
            {canEdit(user) && (
              <Link href={`/espace/clients/${id}/modifier`} className={buttonClass.ghost}>
                <Icon name="edit" className="size-4" />
                Modifier
              </Link>
            )}
          </>
        }
      />

      {client.sensitivity === "secret" && (
        <div className="flex items-start gap-4 rounded-2xl border border-danger/30 bg-danger/[0.06] px-5 py-4">
          <Icon name="key" className="mt-0.5 size-5 shrink-0 text-danger" />
          <p className="text-sm leading-relaxed text-bone/80">
            Dossier <strong className="font-medium text-danger">secret</strong> : toute donnée sensible exige un accès renforcé,
            valable 5 minutes. Chaque révélation est inscrite au journal à votre nom.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {sections.map((s) => (
            <Panel
              key={s.id}
              title={
                <span className="flex items-center gap-3">
                  <span className="text-brass">{s.index}</span>
                  {s.label}
                </span>
              }
            >
              <div className="grid grid-cols-1 gap-x-10 gap-y-7 px-6 py-6 md:grid-cols-2">
                {s.fields.map((f) => (
                  <FieldCell key={f.key} f={f} clientId={id} />
                ))}
              </div>
            </Panel>
          ))}
          {custom.length > 0 && (
            <Panel
              title={
                <span className="flex items-center gap-3">
                  <span className="text-brass">06</span>
                  Champs libres
                </span>
              }
            >
              <div className="grid grid-cols-1 gap-x-10 gap-y-7 px-6 py-6 md:grid-cols-2">
                {custom.map((f) => (
                  <FieldCell key={f.key} f={f} clientId={id} />
                ))}
              </div>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title={`Liste d'accès · ${members.length}`}>
            <ul className="divide-y divide-bone/[0.06]">
              {members.map((m) => (
                <li key={m.userId} className="flex items-center gap-3 px-6 py-3.5">
                  <Avatar name={m.name} className="size-9 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-bone">
                      {m.name}
                      {m.userId === user.id && <span className="text-mute"> · vous</span>}
                    </p>
                    <p className="label mt-1 text-mute">
                      {ROLE_LABEL[m.role]} · {m.grantedBy === "création" ? "titulaire" : `par ${m.grantedBy}`}
                    </p>
                  </div>
                  {canManageAccess(user) && m.userId !== client.ownerId && (
                    <form action={revokeAccessAction.bind(null, id)}>
                      <input type="hidden" name="userId" value={m.userId} />
                      <button className="label rounded-full border border-bone/10 px-2.5 py-1.5 text-mute transition-colors hover:border-danger hover:text-danger">
                        Retirer
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
            {canManageAccess(user) && candidates.length > 0 && (
              <form action={grantAccessAction.bind(null, id)} className="flex gap-2 border-t border-bone/10 px-6 py-4">
                <label className="sr-only" htmlFor="grant-user">
                  Membre à ajouter
                </label>
                <select
                  id="grant-user"
                  name="userId"
                  className="h-10 min-w-0 flex-1 rounded-full border border-bone/15 bg-ink px-4 text-sm text-bone outline-none focus:border-bone"
                >
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {ROLE_LABEL[c.role]}
                    </option>
                  ))}
                </select>
                <button className="h-10 rounded-full bg-bone px-4 text-sm font-medium text-ink">Accorder</button>
              </form>
            )}
          </Panel>

          <Panel title={`Échanges · ${events.length}`}>
            {events.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-mute">Aucun échange consigné.</p>
            ) : (
              <ol className="relative px-6 py-5">
                <span aria-hidden className="absolute bottom-7 left-[39px] top-7 w-px bg-bone/10" />
                {events.map((e) => (
                  <li key={e.id} className="relative flex gap-4 pb-5 last:pb-0">
                    <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-bone/10 bg-ink-2 text-bone/70">
                      <Icon name={EVENT_ICON[e.kind] ?? "note"} className="size-4" />
                    </span>
                    <div className="min-w-0 pt-1">
                      <p className="label text-mute">
                        {EVENT_LABEL[e.kind]} · {e.author} · {relative(e.at)}
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-bone/85">{e.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {canEdit(user) && <EventForm clientId={id} />}
          </Panel>

          <Panel title={user.role === "direction" ? "Traces sur ce dossier" : "Vos traces sur ce dossier"}>
            <ActivityList entries={traces} showActor={user.role === "direction"} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function FieldCell({ f, clientId }: { f: FieldView; clientId: string }) {
  const wide = f.wide || f.multiline;
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      {f.state === "plain" ? (
        <>
          <p className="label flex min-h-7 items-center text-mute">{f.label}</p>
          <p className={`mt-1.5 text-bone ${f.multiline ? "whitespace-pre-wrap leading-relaxed" : ""}`}>{f.value}</p>
        </>
      ) : (
        <SealedField
          clientId={clientId}
          fieldKey={f.key}
          label={f.label}
          shape={f.shape}
          empty={f.empty}
          critical={f.critical}
          allowed={f.allowed}
          needsElevation={f.needsElevation}
          reason={f.reason}
          multiline={f.multiline}
        />
      )}
    </div>
  );
}

function Restricted({
  id,
  refLabel,
  name,
  owner,
  sensitivity,
  selfId,
}: {
  id: string;
  refLabel: string;
  name: string;
  owner: string;
  sensitivity: "standard" | "restreint" | "secret";
  selfId: string;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
      <span className="flex size-16 items-center justify-center rounded-full border border-steel/40 text-steel">
        <Icon name="lock" className="size-6" />
      </span>
      <p className="label mt-8 text-mute">{refLabel} · hors de votre liste d&apos;accès</p>
      <h1 className="mt-4 text-4xl tracking-[-0.045em]">{name}</h1>
      <div className="mt-4">
        <SensitivityBadge level={sensitivity} />
      </div>
      <p className="mt-6 leading-relaxed text-bone/60">
        Ce dossier est cloisonné. Vous voyez qu&apos;il existe parce que vous gérez les accès, mais son contenu est réservé à
        sa liste (titulaire : {owner}). Cette tentative vient d&apos;être journalisée.
      </p>
      <form action={grantAccessAction.bind(null, id)} className="mt-8">
        <input type="hidden" name="userId" value={selfId} />
        <button className={buttonClass.brass}>
          <Icon name="key" className="size-4" />
          M&apos;inscrire sur la liste (journalisé)
        </button>
      </form>
      <Link href="/espace/clients" className="label mt-6 inline-block py-2 text-mute hover:text-bone">
        ← Retour aux dossiers
      </Link>
    </div>
  );
}
