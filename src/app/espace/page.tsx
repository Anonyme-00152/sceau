import type { Metadata } from "next";
import Link from "next/link";
import { requireAccess } from "@/lib/session";
import { listClients } from "@/lib/clients";
import { failedLoginsLastDays, previousLogin, recentActivity, revealsToday } from "@/lib/activity";
import { verifyChain } from "@/lib/audit";
import { canCreate } from "@/lib/access";
import { describeAgent } from "@/lib/request";
import { relative, timeOnly } from "@/lib/format";
import { onboardingSteps } from "@/lib/onboarding";
import { ActivityList } from "@/components/espace/ActivityList";
import { Onboarding } from "@/components/espace/Onboarding";
import { PageHeader, Panel, buttonClass } from "@/components/espace/PageHeader";
import { SensitivityBadge, StatusBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Tableau de bord" };

function greeting() {
  // Heure de Paris : le serveur, lui, tourne en temps universel.
  const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", hourCycle: "h23" }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 12);
  return h < 6 ? "Bonne nuit" : h < 18 ? "Bonjour" : "Bonsoir";
}

export default async function DashboardPage() {
  const { user, session } = await requireAccess();
  const [clients, activity, reveals, chain, alerts, lastLogin, firstSteps] = await Promise.all([
    listClients(user),
    recentActivity(user, 8),
    revealsToday(user.id),
    verifyChain(),
    user.role === "direction" ? failedLoginsLastDays(7) : Promise.resolve(0),
    previousLogin(user.id),
    onboardingSteps(user),
  ]);
  const mine = clients.filter((c) => c.access);
  const secret = mine.filter((c) => c.sensitivity === "secret").length;
  const firstName = user.name.split(" ")[0];
  const date = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" }).format(new Date());

  const stats = [
    { label: "Dossiers accessibles", value: mine.length, hint: user.role === "direction" ? `sur ${clients.length} au registre` : "sur votre liste d'accès" },
    { label: "Dossiers secrets", value: secret, hint: "accès renforcé requis", tone: secret ? "text-danger" : undefined },
    { label: "Révélations aujourd'hui", value: reveals, hint: "par vous, toutes journalisées" },
    user.role === "direction"
      ? { label: "Échecs de connexion", value: alerts, hint: "sur les 7 derniers jours", tone: alerts ? "text-danger" : undefined }
      : { label: "Session", value: timeOnly(session.createdAt), hint: "heure d'ouverture" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={<span className="first-letter:uppercase">{date}</span>}
        title={
          <>
            {greeting()}, <span className="serif-accent text-brass">{firstName}.</span>
          </>
        }
        description={`${user.title}. ${lastLogin ? `Connexion précédente ${relative(lastLogin)}.` : "Première connexion."}`}
        actions={
          canCreate(user) ? (
            <Link href="/espace/clients/nouveau" className={buttonClass.primary}>
              <Icon name="plus" className="size-4" />
              Nouveau dossier
            </Link>
          ) : undefined
        }
      />

      {firstSteps && <Onboarding steps={firstSteps} />}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-bone/10 bg-bone/10 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-ink-2 p-6">
            <p className="label text-mute">{s.label}</p>
            <p className={`display mt-6 text-6xl ${s.tone ?? "text-bone"}`}>{s.value}</p>
            <p className="mt-2 text-sm text-mute">{s.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Panel
          title="Dossiers récents"
          action={
            <Link href="/espace/clients" className="label -my-2 inline-block py-2 text-mute transition-colors hover:text-bone">
              Tout voir →
            </Link>
          }
        >
          {mine.length === 0 ? (
            <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-bone/[0.05] text-mute">
                <Icon name="folder" className="size-5" />
              </span>
              <p className="max-w-xs text-sm leading-relaxed text-mute">
                {canCreate(user) ? "Aucun dossier pour l’instant. Le premier sera chiffré dès son enregistrement." : "Aucun dossier ne vous est encore attribué. La direction vous ajoutera aux dossiers qui vous concernent."}
              </p>
              {canCreate(user) && (
                <Link href="/espace/clients/nouveau" className={buttonClass.ghost}>
                  <Icon name="plus" className="size-4" />
                  Ouvrir un dossier
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-bone/[0.06]">
              {mine.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link href={`/espace/clients/${c.id}`} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-bone/[0.03]">
                    <span className="label w-16 shrink-0 text-mute">{c.ref}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-bone">{c.displayName}</span>
                      <span className="block truncate text-sm text-mute">
                        {[c.sector, c.city].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="hidden sm:block">
                      <StatusBadge status={c.status} />
                    </span>
                    <SensitivityBadge level={c.sensitivity} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel
            title="Intégrité du journal"
            action={
              <Link href="/espace/journal" className="label -my-2 inline-block py-2 text-mute transition-colors hover:text-bone">
                Journal →
              </Link>
            }
          >
            <div className="flex items-center gap-5 px-6 py-5">
              <span className={`flex size-12 items-center justify-center rounded-full ${chain.ok ? "bg-moss/15 text-moss" : "bg-danger/15 text-danger"}`}>
                <Icon name={chain.ok ? "check" : "shield"} className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-bone">{chain.ok ? "Chaîne intègre" : `Rupture détectée à l'entrée #${chain.brokenAt}`}</p>
                <p className="mt-1 truncate font-mono text-xs text-mute">
                  {chain.count} entrées · tête {chain.head.slice(0, 16)}…
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Votre session">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 px-6 py-5 text-sm">
              <dt className="label self-center text-mute">Appareil</dt>
              <dd className="text-bone/85">{describeAgent(session.userAgent)}</dd>
              <dt className="label self-center text-mute">Origine</dt>
              <dd className="font-mono text-bone/85">{session.ip}</dd>
              <dt className="label self-center text-mute">Ouverte</dt>
              <dd className="text-bone/85">{relative(session.createdAt)}</dd>
              <dt className="label self-center text-mute">Engagement</dt>
              <dd className="text-bone/85">{session.ndaAt ? `signé à ${timeOnly(session.ndaAt)}` : "—"}</dd>
            </dl>
          </Panel>
        </div>
      </div>

      <Panel
        title={user.role === "direction" ? "Activité de l'équipe" : "Votre activité"}
        action={
          <Link href="/espace/journal" className="label -my-2 inline-block py-2 text-mute transition-colors hover:text-bone">
            Journal →
          </Link>
        }
      >
        <ActivityList entries={activity} showActor={user.role === "direction"} />
      </Panel>
    </div>
  );
}
