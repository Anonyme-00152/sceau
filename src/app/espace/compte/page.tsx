import type { Metadata } from "next";
import Link from "next/link";
import { requireAccess } from "@/lib/session";
import { ROLE_LABEL } from "@/lib/fields";
import { DEMO_MODE } from "@/lib/demo";
import { dateShort } from "@/lib/format";
import { PageHeader, Panel } from "@/components/espace/PageHeader";
import { PasswordForm, ProfileForm } from "@/components/espace/members/AccountForms";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const { user } = await requireAccess();
  const demoLocked = DEMO_MODE && user.isDemo;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={<>Mon compte · {ROLE_LABEL[user.role]}</>}
        title={
          <>
            {user.name.split(" ")[0]}, <span className="serif-accent text-brass">vos clés.</span>
          </>
        }
        description={
          demoLocked
            ? "Démonstration : le profil et le mot de passe des comptes de démonstration ne peuvent pas être modifiés."
            : "Votre profil, votre mot de passe et l'état de votre seconde clé."
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title="Profil">
          <ProfileForm name={user.name} title={user.title} />
        </Panel>
        <Panel title="Identifiants">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-3 px-6 py-5 text-sm">
            <dt className="label self-center text-mute">E-mail</dt>
            <dd className="break-all text-bone">{user.email}</dd>
            <dt className="label self-center text-mute">Rôle</dt>
            <dd className="text-bone">{ROLE_LABEL[user.role]}</dd>
            <dt className="label self-center text-mute">Téléphone</dt>
            <dd className="text-moss">{user.totpEnrolledAt ? `associé le ${dateShort(user.totpEnrolledAt)}` : "associé"}</dd>
          </dl>
          <p className="border-t border-bone/10 px-6 py-4 text-sm leading-relaxed text-mute">
            {user.role === "direction" ? (
              <>
                L&apos;adresse de connexion, le rôle et le téléphone se gèrent depuis{" "}
                <Link href={`/espace/equipe/${user.id}`} className="text-brass underline-offset-4 hover:underline">
                  votre fiche dans Équipe
                </Link>
                .
              </>
            ) : (
              "Pour changer d'adresse, de rôle ou de téléphone, adressez-vous à la direction."
            )}
          </p>
        </Panel>
      </div>

      <Panel title="Mot de passe">
        <PasswordForm email={user.email} />
      </Panel>
    </div>
  );
}
