import type { Metadata } from "next";
import Link from "next/link";
import { requireAccess } from "@/lib/session";
import { listAudit } from "@/lib/activity";
import { AUDIT_LABEL, verifyChain, type AuditAction } from "@/lib/audit";
import { dateTime } from "@/lib/format";
import { PageHeader } from "@/components/espace/PageHeader";
import { VerifyChainButton } from "@/components/espace/VerifyChainButton";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Journal scellé" };

const FILTERS = [
  { value: "", label: "Tout" },
  { value: "connexion", label: "Connexions" },
  { value: "client", label: "Dossiers" },
  { value: "champ", label: "Révélations" },
  { value: "acces", label: "Accès" },
  { value: "session", label: "Sessions" },
];

const ALERT = new Set(["connexion.echec", "connexion.bloquee", "code.echec", "acces.refuse"]);

export default async function JournalPage(props: PageProps<"/espace/journal">) {
  const { user } = await requireAccess();
  const sp = await props.searchParams;
  const action = typeof sp.type === "string" && FILTERS.some((f) => f.value === sp.type) ? sp.type : "";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const page = Number(typeof sp.page === "string" ? sp.page : 1) || 1;
  const [{ rows, total, pages }, chain] = await Promise.all([listAudit(user, { page, action, q }), verifyChain()]);

  const href = (patch: Record<string, string | number>) => {
    const params = new URLSearchParams();
    const merged = { type: action, q, page: 1, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && v === 1)) params.set(k, String(v));
    const s = params.toString();
    return `/espace/journal${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={<>Preuve · {total} entrée{total > 1 ? "s" : ""}</>}
        title={
          <>
            Journal <span className="serif-accent text-brass">scellé.</span>
          </>
        }
        description={
          user.role === "direction"
            ? "Chaque ligne contient l'empreinte de la précédente. Modifier ou supprimer une entrée casse la chaîne, visiblement."
            : "Vos propres traces. La direction voit l'ensemble du journal de l'équipe."
        }
        actions={<VerifyChainButton />}
      />

      <div
        className={`flex flex-wrap items-center gap-5 rounded-3xl border px-6 py-5 ${chain.ok ? "border-moss/25 bg-moss/[0.05]" : "border-danger/40 bg-danger/[0.07]"}`}
      >
        <span className={`flex size-11 items-center justify-center rounded-full ${chain.ok ? "bg-moss/15 text-moss" : "bg-danger/15 text-danger"}`}>
          <Icon name={chain.ok ? "check" : "shield"} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-bone">{chain.ok ? "Chaîne intègre de bout en bout" : `Altération détectée à l'entrée #${chain.brokenAt}`}</p>
          <p className="mt-1 break-all font-mono text-xs text-mute">SHA-256 · tête {chain.head}</p>
        </div>
        <p className="label text-mute">{chain.count} maillons</p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Type d'événement">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={href({ type: f.value })}
              aria-current={action === f.value ? "true" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${action === f.value ? "bg-bone text-ink" : "text-bone/60 hover:text-bone"}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <form className="relative w-full max-w-xs" role="search">
          {action && <input type="hidden" name="type" value={action} />}
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-mute" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Personne, dossier…"
            aria-label="Filtrer le journal"
            className="h-11 w-full rounded-full border border-bone/10 bg-ink-2 pl-11 pr-4 text-sm text-bone outline-none placeholder:text-mute focus:border-bone"
          />
        </form>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-bone/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-ink-2">
            <tr className="label text-mute">
              <th scope="col" className="px-6 py-4 font-normal">#</th>
              <th scope="col" className="px-4 py-4 font-normal">Date</th>
              <th scope="col" className="px-4 py-4 font-normal">Personne</th>
              <th scope="col" className="px-4 py-4 font-normal">Événement</th>
              <th scope="col" className="px-4 py-4 font-normal">Objet</th>
              <th scope="col" className="px-4 py-4 font-normal">Origine</th>
              <th scope="col" className="px-6 py-4 text-right font-normal">Empreinte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bone/[0.06] font-[450]">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center text-mute">
                  Aucune entrée.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.seq} className="transition-colors hover:bg-bone/[0.03]">
                <td className="px-6 py-3.5 font-mono text-xs text-mute">{r.seq}</td>
                <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-bone/70">{dateTime(r.at)}</td>
                <td className="whitespace-nowrap px-4 py-3.5 text-bone/85">{r.actor}</td>
                <td className={`whitespace-nowrap px-4 py-3.5 ${ALERT.has(r.action) ? "text-danger" : "text-bone"}`}>
                  {AUDIT_LABEL[r.action as AuditAction] ?? r.action}
                </td>
                <td className="max-w-[280px] truncate px-4 py-3.5 text-bone/65">
                  {r.targetType === "client" && r.targetId ? (
                    <Link href={`/espace/clients/${r.targetId}`} className="inline-block py-1 hover:text-bone hover:underline">
                      {r.label}
                    </Link>
                  ) : (
                    r.label ?? "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-mute">{r.ip ?? "—"}</td>
                <td className="px-6 py-3.5 text-right font-mono text-xs text-mute" title={r.hash}>
                  {r.hash.slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="flex items-center justify-between" aria-label="Pagination">
          <p className="label text-mute">
            Page {page} / {pages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={href({ page: page - 1 })} className="inline-flex h-10 items-center rounded-full border border-bone/15 px-4 text-sm hover:border-bone">
                ← Plus récent
              </Link>
            )}
            {page < pages && (
              <Link href={href({ page: page + 1 })} className="inline-flex h-10 items-center rounded-full border border-bone/15 px-4 text-sm hover:border-bone">
                Plus ancien →
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
