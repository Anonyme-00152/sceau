import type { Metadata } from "next";
import Link from "next/link";
import { getCurrent } from "@/lib/session";
import { findPendingByToken, hasActiveDirection } from "@/lib/accounts";
import { decideByTokenAction } from "@/lib/account-actions";
import { ROLE_LABEL } from "@/lib/fields";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { DecisionButtons } from "@/components/auth/DecisionButtons";

export const metadata: Metadata = { title: "Valider une demande d'accès" };

export default async function ApprobationPage(props: PageProps<"/approbation/[jeton]">) {
  const { jeton } = await props.params;
  const { decision } = await props.searchParams;
  const frame = (children: React.ReactNode) => (
    <AuthFrame
      step={{ index: 1, label: "Validation" }}
      steps={["Demande", "Validation", "Première connexion"]}
      aside={{
        title: (
          <>
            Une porte,
            <br />
            <span className="serif-accent text-brass">une clé à la fois.</span>
          </>
        ),
        body: "Seul le destinataire de l'e-mail de validation peut ouvrir un nouveau compte. Chaque décision est inscrite au journal scellé.",
      }}
    >
      {children}
    </AuthFrame>
  );

  if (decision === "approuver" || decision === "refuser") {
    return frame(
      <div>
        <p className={`label ${decision === "approuver" ? "text-moss" : "text-danger"}`}>Décision enregistrée</p>
        <h1 className="mt-4 text-4xl tracking-[-0.045em]">{decision === "approuver" ? "Accès validé." : "Demande refusée."}</h1>
        <p className="mt-4 leading-relaxed text-bone/70">
          {decision === "approuver"
            ? "La personne a été prévenue. À sa première connexion, elle associera son application d'authentification."
            : "Le compte reste fermé. La personne a été prévenue."}
        </p>
        <Link href="/connexion" className="mt-10 inline-flex h-13 items-center rounded-full bg-bone px-6 font-medium text-ink">
          Aller à la connexion
        </Link>
      </div>,
    );
  }

  const pending = await findPendingByToken(jeton);
  if (!pending) {
    return frame(
      <div>
        <p className="label text-danger">Lien inutilisable</p>
        <h1 className="mt-4 text-4xl tracking-[-0.045em]">Ce lien a expiré ou a déjà servi.</h1>
        <p className="mt-4 leading-relaxed text-bone/70">
          Les liens de validation sont valables 7 jours et ne servent qu&apos;une fois. Si vous venez de valider cette demande, la
          décision est bien enregistrée : la personne peut se connecter.
        </p>
        <Link href="/connexion" className="mt-10 inline-flex h-13 items-center rounded-full bg-bone px-6 font-medium text-ink">
          Aller à la connexion
        </Link>
      </div>,
    );
  }

  const bootstrap = !(await hasActiveDirection());
  const current = await getCurrent();
  const isDirection =
    !!current?.session.ndaAt && !current.session.lockedAt && current.user.role === "direction" && current.user.status === "actif";

  if (!bootstrap && !isDirection) {
    return frame(
      <div>
        <p className="label text-steel">Connexion requise</p>
        <h1 className="mt-4 text-4xl tracking-[-0.045em]">Connectez-vous pour décider.</h1>
        <p className="mt-4 leading-relaxed text-bone/70">
          Une demande de <strong className="font-medium text-bone">{pending.name}</strong> attend. Pour la valider, connectez-vous
          avec un compte Direction, puis rouvrez ce lien depuis l&apos;e-mail — ou saisissez le code reçu dans la page Équipe.
        </p>
        <Link href="/connexion" className="mt-10 inline-flex h-13 items-center rounded-full bg-bone px-6 font-medium text-ink">
          Se connecter
        </Link>
      </div>,
    );
  }

  const requested = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(pending.createdAt);
  const action = decideByTokenAction.bind(null, jeton);

  return frame(
    <div>
      <p className="label text-mute">Demande d&apos;accès</p>
      <h1 className="mt-4 text-4xl tracking-[-0.045em]">{pending.name}</h1>
      <dl className="mt-8 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-3 rounded-2xl border border-bone/10 p-5 text-sm">
        <dt className="label self-center text-mute">E-mail</dt>
        <dd className="break-all text-bone">{pending.email}</dd>
        <dt className="label self-center text-mute">Fonction</dt>
        <dd className="text-bone">{pending.title}</dd>
        <dt className="label self-center text-mute">Demandé le</dt>
        <dd className="text-bone">{requested}</dd>
        <dt className="label self-center text-mute">Origine</dt>
        <dd className="font-mono text-bone">{pending.requestIp ?? "—"}</dd>
        {pending.requestNote && (
          <>
            <dt className="label pt-0.5 text-mute">Message</dt>
            <dd className="whitespace-pre-wrap text-bone/85">{pending.requestNote}</dd>
          </>
        )}
      </dl>

      <form action={action} className="mt-8 space-y-6">
        {bootstrap ? (
          <p className="rounded-xl border border-brass/30 bg-brass/[0.06] p-4 text-sm leading-relaxed text-bone/80">
            Premier compte de cette installation : il recevra le rôle <strong className="font-medium text-brass">Direction</strong>, qui
            permet ensuite de valider les autres demandes.
          </p>
        ) : (
          <fieldset>
            <legend className="label text-mute">Rôle attribué</legend>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(["lecteur", "gestionnaire", "direction"] as const).map((r, i) => (
                <label key={r} className="cursor-pointer">
                  <input type="radio" name="role" value={r} defaultChecked={i === 0} className="peer sr-only" />
                  <span className="block rounded-xl border border-bone/12 px-4 py-3 text-sm text-bone/80 transition-colors peer-checked:border-brass peer-checked:text-bone peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brass">
                    {ROLE_LABEL[r]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <DecisionButtons />
      </form>
    </div>,
  );
}
