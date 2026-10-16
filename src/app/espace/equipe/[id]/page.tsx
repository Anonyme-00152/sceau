import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/session";
import { getMember, isLocked, memberFootprint, memberSessions } from "@/lib/members";
import {
  resetMemberPasswordAction,
  resetMemberTotpAction,
  revokeMemberSessionsAction,
  setMemberStatusAction,
  unlockMemberAction,
} from "@/lib/member-actions";
import { ROLE_LABEL } from "@/lib/fields";
import { DEMO_MODE } from "@/lib/demo";
import { dateShort, dateTime, relative } from "@/lib/format";
import { PageHeader, Panel } from "@/components/espace/PageHeader";
import { Avatar } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { MemberForm } from "@/components/espace/members/MemberForm";
import { ElevatedButton } from "@/components/espace/members/ElevatedButton";
import { DeleteMemberForm } from "@/components/espace/members/DeleteMemberForm";

export const metadata: Metadata = { title: "Gérer un compte" };

export default async function MemberPage(props: PageProps<"/espace/equipe/[id]">) {
  const { user } = await requireAccess();
  if (user.role !== "direction") notFound();
  const { id } = await props.params;
  const member = await getMember(id);
  if (!member || member.status === "en-attente" || member.status === "refuse") notFound();

  const [footprint, sessions] = await Promise.all([memberFootprint(member.id), memberSessions(member.id)]);
  const self = member.id === user.id;
  const suspended = member.status === "suspendu";
  const locked = isLocked(member);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={
          <Link href="/espace/equipe" className="inline-flex items-center gap-2 transition-colors hover:text-bone">
            <Icon name="arrowLeft" className="size-4" />
            Équipe
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-4">
            <Avatar name={member.name} className="size-12 text-base" />
            {member.name}
            {self && <span className="serif-accent text-brass">· vous</span>}
          </span>
        }
        description={
          DEMO_MODE
            ? "Démonstration : consultation seule, les comptes de démonstration ne peuvent pas être modifiés."
            : "Chaque modification redemande votre code à usage unique et s'inscrit au journal scellé."
        }
        actions={
          <>
            <span className="label rounded-full border border-bone/15 px-3 py-1.5 text-bone/75">{ROLE_LABEL[member.role]}</span>
            <span className={`label rounded-full border px-3 py-1.5 ${suspended ? "border-danger/40 text-danger" : "border-moss/40 text-moss"}`}>
              {suspended ? "Suspendu" : "Actif"}
            </span>
            {locked && <span className="label rounded-full border border-steel/40 px-3 py-1.5 text-steel">Bloqué</span>}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title="Identité et rôle">
          <MemberForm member={{ id: member.id, name: member.name, email: member.email, title: member.title, role: member.role }} />
        </Panel>

        <Panel title="État du compte">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-3 px-6 py-5 text-sm">
            <dt className="label self-center text-mute">Créé le</dt>
            <dd className="text-bone">{dateShort(member.createdAt)}</dd>
            <dt className="label self-center text-mute">Connexion</dt>
            <dd className="text-bone">{member.lastLoginAt ? relative(member.lastLoginAt) : "jamais connecté"}</dd>
            <dt className="label self-center text-mute">Téléphone</dt>
            <dd className={member.totpEnrolledAt ? "text-moss" : "text-steel"}>
              {member.totpEnrolledAt ? `associé le ${dateShort(member.totpEnrolledAt)}` : "à associer à la prochaine connexion"}
            </dd>
            <dt className="label self-center text-mute">Tentatives</dt>
            <dd className={locked ? "text-danger" : "text-bone"}>
              {locked ? `bloqué jusqu'à ${dateTime(member.lockedUntil!)}` : `${member.failedAttempts} échec(s) récent(s)`}
            </dd>
            <dt className="label self-center text-mute">Dossiers</dt>
            <dd className="text-bone">
              titulaire de {footprint.owned} · accès à {footprint.access} · {footprint.events} échange(s)
            </dd>
            <dt className="label self-center text-mute">Sessions</dt>
            <dd className="text-bone">{sessions.length} ouverte(s)</dd>
          </dl>
          {self && (
            <p className="border-t border-bone/10 px-6 py-4 text-sm leading-relaxed text-mute">
              C&apos;est votre compte : votre mot de passe se change dans{" "}
              <Link href="/espace/compte" className="text-brass underline-offset-4 hover:underline">
                Mon compte
              </Link>
              .
            </p>
          )}
        </Panel>
      </div>

      <Panel title="Sécurité">
        <div className="divide-y divide-bone/[0.06]">
          {!self && (
            <ElevatedButton
              action={resetMemberPasswordAction.bind(null, member.id)}
              title="Nouveau mot de passe provisoire"
              description="Pour un mot de passe oublié. Un mot de passe provisoire est généré et affiché une fois ; ses sessions ouvertes sont fermées."
              label="Générer"
              icon="key"
            />
          )}
          <ElevatedButton
            action={resetMemberTotpAction.bind(null, member.id)}
            title="Réassocier le téléphone"
            description={
              self
                ? "Nouveau téléphone ou application d'authentification : un nouveau QR code s'affichera à votre prochaine connexion."
                : "Téléphone perdu ou changé : un nouveau QR code s'affichera à sa prochaine connexion. L'ancien code ne fonctionnera plus."
            }
            label="Réinitialiser"
            icon="phone"
          />
          {(locked || member.failedAttempts > 0) && (
            <ElevatedButton
              action={unlockMemberAction.bind(null, member.id)}
              title="Débloquer"
              description="Efface les tentatives échouées et lève le blocage temporaire."
              label="Débloquer"
              icon="unlock"
            />
          )}
          {sessions.length > (self ? 1 : 0) && (
            <ElevatedButton
              action={revokeMemberSessionsAction.bind(null, member.id)}
              title={self ? "Fermer vos autres sessions" : "Fermer ses sessions"}
              description="Déconnecte immédiatement les appareils ouverts."
              label="Fermer"
              icon="logout"
            />
          )}
        </div>
      </Panel>

      {!self && (
        <Panel title="Accès">
          <div className="divide-y divide-bone/[0.06]">
            {suspended ? (
              <ElevatedButton
                action={setMemberStatusAction.bind(null, member.id, "actif")}
                title="Réactiver le compte"
                description="La personne pourra de nouveau se connecter, avec son mot de passe et son téléphone."
                label="Réactiver"
                icon="unlock"
              />
            ) : (
              <ElevatedButton
                action={setMemberStatusAction.bind(null, member.id, "suspendu")}
                title="Suspendre le compte"
                description="Bloque la connexion et ferme ses sessions, sans rien effacer. Réversible à tout moment."
                label="Suspendre"
                icon="lock"
                danger
              />
            )}
            <DeleteMemberForm memberId={member.id} email={member.email} />
          </div>
        </Panel>
      )}
    </div>
  );
}
