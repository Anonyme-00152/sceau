import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAccess } from "@/lib/session";
import { canCreate } from "@/lib/access";
import { getModules } from "@/lib/settings";
import { createClientAction } from "../../actions";
import { PageHeader } from "@/components/espace/PageHeader";
import { ClientForm } from "@/components/espace/ClientForm";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Nouveau dossier" };

export default async function NewClientPage() {
  const { user } = await requireAccess();
  if (!canCreate(user)) redirect("/espace/clients");

  return (
    <div className="space-y-8">
      <Link href="/espace/clients" className="label inline-flex items-center gap-2 py-2 text-mute transition-colors hover:text-bone">
        <Icon name="arrowLeft" className="size-4" /> Dossiers
      </Link>
      <PageHeader
        eyebrow="Nouveau dossier"
        title={
          <>
            Ouvrir un dossier <span className="serif-accent text-brass">scellé.</span>
          </>
        }
        description="Vous en serez titulaire et seul membre. Ajoutez d'autres personnes ensuite, une par une, depuis la fiche."
      />
      <ClientForm
        mode="create"
        action={createClientAction}
        meta={{ kind: "particulier", displayName: "", status: "prospect", sensitivity: "standard", city: "", country: "France", sector: "" }}
        values={{}}
        sealedFilled={{}}
        custom={[]}
        cancelHref="/espace/clients"
        modules={await getModules()}
      />
    </div>
  );
}
