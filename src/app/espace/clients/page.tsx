import type { Metadata } from "next";
import Link from "next/link";
import { requireAccess } from "@/lib/session";
import { listClients } from "@/lib/clients";
import { canCreate } from "@/lib/access";
import { SENSITIVITY_LABEL, STATUS_LABEL } from "@/lib/fields";
import { relative } from "@/lib/format";
import { PageHeader, buttonClass } from "@/components/espace/PageHeader";
import { SensitivityBadge, StatusBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Dossiers" };

export default async function ClientsPage(props: PageProps<"/espace/clients">) {
  const { user } = await requireAccess();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const status = typeof sp.statut === "string" && sp.statut in STATUS_LABEL ? sp.statut : "";
  const sensitivity = typeof sp.niveau === "string" && sp.niveau in SENSITIVITY_LABEL ? sp.niveau : "";
  const rows = await listClients(user, { q, status, sensitivity });
  const direction = user.role === "direction";

  const link = (patch: Record<string, string>) => {
    const params = new URLSearchParams({ ...(q && { q }), ...(status && { statut: status }), ...(sensitivity && { niveau: sensitivity }), ...patch });
    for (const [k, v] of [...params]) if (!v) params.delete(k);
    const s = params.toString();
    return `/espace/clients${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={<>Registre · {rows.length} dossier{rows.length > 1 ? "s" : ""}</>}
        title="Dossiers"
        description={
          direction
            ? "La direction voit l'existence de chaque dossier. Le contenu reste réservé à sa liste d'accès."
            : "Seuls les dossiers dont vous êtes membre apparaissent ici. Les autres n'existent pas pour vous."
        }
        actions={
          canCreate(user) ? (
            <Link href="/espace/clients/nouveau" className={buttonClass.primary}>
              <Icon name="plus" className="size-4" />
              Nouveau dossier
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <form className="relative w-full max-w-md" role="search">
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-mute" />
          {status && <input type="hidden" name="statut" value={status} />}
          {sensitivity && <input type="hidden" name="niveau" value={sensitivity} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Nom, référence, ville, secteur…"
            aria-label="Rechercher dans les dossiers"
            className="h-11 w-full rounded-full border border-bone/10 bg-ink-2 pl-11 pr-4 text-sm text-bone outline-none transition-colors placeholder:text-mute hover:border-bone/25 focus:border-bone"
          />
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <FilterGroup
            label="Niveau"
            current={sensitivity}
            options={Object.entries(SENSITIVITY_LABEL)}
            href={(v) => link({ niveau: v })}
          />
          <span className="mx-1 hidden h-5 w-px bg-bone/10 sm:block" />
          <FilterGroup label="Statut" current={status} options={Object.entries(STATUS_LABEL)} href={(v) => link({ statut: v })} />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-bone/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-2">
            <tr className="label text-mute">
              <th scope="col" className="px-6 py-4 font-normal">Dossier</th>
              <th scope="col" className="hidden px-4 py-4 font-normal md:table-cell">Secteur · ville</th>
              <th scope="col" className="hidden px-4 py-4 font-normal lg:table-cell">Titulaire</th>
              <th scope="col" className="hidden px-4 py-4 font-normal sm:table-cell">Statut</th>
              <th scope="col" className="px-4 py-4 font-normal">Niveau</th>
              <th scope="col" className="hidden px-6 py-4 text-right font-normal xl:table-cell">Mis à jour</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bone/[0.06]">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-mute">
                  Aucun dossier ne correspond.
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} className="group relative transition-colors hover:bg-bone/[0.03]">
                <td className="px-6 py-4">
                  <Link href={`/espace/clients/${c.id}`} className="flex items-center gap-4 after:absolute after:inset-0">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-bone/10 text-mute">
                      <Icon name={c.access ? (c.kind === "entreprise" ? "folder" : "team") : "lock"} className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className={`block truncate ${c.access ? "text-bone" : "text-bone/50"}`}>{c.displayName}</span>
                      <span className="label mt-1 block text-mute">
                        {c.ref} · {c.kind === "entreprise" ? "Entreprise" : "Particulier"}
                        {!c.access && <span className="text-steel"> · hors liste</span>}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="hidden px-4 py-4 text-bone/65 md:table-cell">{[c.sector, c.city].filter(Boolean).join(" · ")}</td>
                <td className="hidden px-4 py-4 text-bone/65 lg:table-cell">
                  {c.ownerName}
                  <span className="label ml-2 text-mute">+{Math.max(0, c.members - 1)}</span>
                </td>
                <td className="hidden px-4 py-4 sm:table-cell">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-4">
                  <SensitivityBadge level={c.sensitivity} />
                </td>
                <td className="label hidden px-6 py-4 text-right text-mute xl:table-cell">{relative(c.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  current,
  options,
  href,
}: {
  label: string;
  current: string;
  options: [string, string][];
  href: (value: string) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      <Link
        href={href("")}
        aria-current={!current ? "true" : undefined}
        className={`rounded-full px-3 py-1.5 text-sm transition-colors ${!current ? "bg-bone text-ink" : "text-bone/60 hover:text-bone"}`}
      >
        Tous
      </Link>
      {options.map(([value, text]) => (
        <Link
          key={value}
          href={href(value)}
          aria-current={current === value ? "true" : undefined}
          className={`rounded-full px-3 py-1.5 text-sm transition-colors ${current === value ? "bg-bone text-ink" : "text-bone/60 hover:text-bone"}`}
        >
          {text}
        </Link>
      ))}
    </div>
  );
}
