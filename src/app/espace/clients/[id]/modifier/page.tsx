import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAccess } from "@/lib/session";
import { canEdit, hasAccess } from "@/lib/access";
import { getClientMeta, readProfile } from "@/lib/clients";
import { SECTIONS } from "@/lib/fields";
import { getModules } from "@/lib/settings";
import { updateClientAction } from "../../../actions";
import { PageHeader } from "@/components/espace/PageHeader";
import { ClientForm } from "@/components/espace/ClientForm";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Modifier le dossier" };

export default async function EditClientPage(props: PageProps<"/espace/clients/[id]/modifier">) {
  const { user } = await requireAccess();
  const { id } = await props.params;
  const meta = await getClientMeta(id);
  if (!meta || !(await hasAccess(user.id, id))) notFound();
  if (!canEdit(user)) redirect(`/espace/clients/${id}`);

  const { client } = meta;
  const profile = readProfile(client);

  // Les valeurs sensibles ne quittent jamais le serveur, même pour être modifiées : on indique seulement leur présence.
  const values: Record<string, string> = {};
  const sealedFilled: Record<string, boolean> = {};
  for (const f of SECTIONS.flatMap((s) => s.fields)) {
    const v = profile.values[f.key] ?? "";
    if (f.sensitive) sealedFilled[f.key] = !!v;
    else values[f.key] = v;
  }
  const custom = profile.custom.map((c) => ({
    id: c.id,
    label: c.label,
    value: c.sensitive ? "" : c.value,
    sensitive: c.sensitive,
    hasValue: !!c.value,
  }));

  return (
    <div className="space-y-8">
      <Link href={`/espace/clients/${id}`} className="label inline-flex items-center gap-2 py-2 text-mute transition-colors hover:text-bone">
        <Icon name="arrowLeft" className="size-4" /> {client.ref}
      </Link>
      <PageHeader
        eyebrow={<>{client.ref} · Modification</>}
        title={client.displayName}
        description="Les champs scellés restent vides : laissez-les tels quels pour conserver la valeur actuelle, ou saisissez-en une nouvelle."
      />
      <ClientForm
        mode="edit"
        action={updateClientAction.bind(null, id)}
        meta={{
          kind: client.kind,
          displayName: client.displayName,
          status: client.status,
          sensitivity: client.sensitivity,
          city: client.city ?? "",
          country: client.country,
          sector: client.sector ?? "",
        }}
        values={values}
        sealedFilled={sealedFilled}
        custom={custom}
        cancelHref={`/espace/clients/${id}`}
        modules={await getModules()}
      />
    </div>
  );
}
