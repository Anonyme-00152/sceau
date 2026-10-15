import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAccess } from "@/lib/session";
import { getModules, ADMIN_EMAIL, APP_URL, HEALTH_ALLOWED, ONLINE } from "@/lib/settings";
import { BackupButton } from "@/components/espace/BackupButton";
import { smtpConfigured } from "@/lib/mail";
import { saveModulesAction } from "@/lib/account-actions";
import { MODULES, SECTIONS } from "@/lib/fields";
import { DEMO_MODE } from "@/lib/demo";
import { PageHeader, Panel } from "@/components/espace/PageHeader";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Paramètres" };

export default async function ParametresPage() {
  const { user } = await requireAccess();
  if (user.role !== "direction") redirect("/espace");
  const active = new Set(await getModules());
  const smtp = smtpConfigured();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Installation"
        title={
          <>
            Paramètres <span className="serif-accent text-brass">de la maison.</span>
          </>
        }
        description="Choisissez les rubriques des fiches selon votre métier. N'activez que ce dont vous avez besoin : le RGPD impose de ne collecter que le nécessaire."
      />

      <Panel title="Rubriques des fiches client">
        <form action={saveModulesAction}>
          <ul className="divide-y divide-bone/[0.06]">
            {MODULES.map((m) => {
              const count = SECTIONS.filter((s) => s.module === m.id).reduce((n, s) => n + s.fields.length, 0);
              // En ligne, l'hébergeur n'est pas certifié HDS : le module Santé ne peut pas être activé.
              const forbidden = m.id === "sante" && !HEALTH_ALLOWED;
              return (
                <li key={m.id}>
                  <label
                    className={`flex items-start gap-4 px-6 py-4 ${m.locked || forbidden ? "" : "cursor-pointer hover:bg-bone/[0.02]"} ${forbidden ? "opacity-60" : ""}`}
                  >
                    <input
                      type="checkbox"
                      name="module"
                      value={m.id}
                      defaultChecked={!forbidden && (m.locked || active.has(m.id))}
                      disabled={m.locked || forbidden}
                      className="peer mt-1 size-4 accent-[var(--color-brass)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 text-bone">
                        {m.label}
                        {m.locked && <span className="label rounded-full border border-bone/15 px-2 py-0.5 text-mute">Toujours actif</span>}
                        {m.id === "sante" && <span className="label rounded-full border border-danger/40 px-2 py-0.5 text-danger">Données de santé</span>}
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-mute">
                        {forbidden
                          ? "Indisponible en ligne : les données de santé exigent un hébergeur certifié HDS. Utilisez une installation locale."
                          : m.description}
                      </span>
                    </span>
                    <span className="label shrink-0 pt-1 text-mute">{count} champs</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-bone/10 px-6 py-4">
            <p className="max-w-xl text-sm leading-relaxed text-mute">
              Désactiver une rubrique la masque des formulaires et des fiches ; les valeurs déjà saisies restent chiffrées en base.
            </p>
            <button className="inline-flex h-11 items-center gap-2 rounded-full bg-bone px-5 text-sm font-medium text-ink transition-transform hover:scale-[1.03]">
              <Icon name="check" className="size-4" />
              Enregistrer
            </button>
          </div>
        </form>
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="Validation des nouveaux comptes">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-3 px-6 py-5 text-sm">
            <dt className="label self-center text-mute">Administrateur</dt>
            <dd className="break-all text-bone">{ADMIN_EMAIL || "non défini (ADMIN_EMAIL)"}</dd>
            <dt className="label self-center text-mute">Envoi</dt>
            <dd className={smtp ? "text-moss" : ONLINE ? "text-danger" : "text-steel"}>
              {smtp ? "SMTP configuré" : ONLINE ? "Non configuré — aucun e-mail ne part" : "Hors ligne — dépôt dans data/outbox"}
            </dd>
            <dt className="label self-center text-mute">Adresse</dt>
            <dd className="font-mono text-bone">{APP_URL}</dd>
          </dl>
          {!smtp && (
            <p className="border-t border-bone/10 px-6 py-4 text-sm leading-relaxed text-mute">
              Pour recevoir les e-mails sur iCloud : créez un « mot de passe pour app » sur appleid.apple.com, puis renseignez SMTP_HOST,
              SMTP_PORT, SMTP_USER, SMTP_PASS {ONLINE ? "dans les variables de l'hébergeur" : <>dans <span className="font-mono text-bone/80">.env.local</span></>}{" "}
              et redémarrez Sceau.
            </p>
          )}
        </Panel>

        <Panel title="Sauvegarde">
          <div className="space-y-4 px-6 py-5 text-sm leading-relaxed">
            <p className="text-bone/80">
              Un fichier contenant tous les dossiers, l&apos;équipe et le journal. Les données sensibles y restent chiffrées : sans la clé
              de chiffrement de l&apos;installation, il est illisible. Le code à usage unique est redemandé.
            </p>
            <BackupButton />
            <p className="text-mute">Conservez la clé de chiffrement à part, dans un gestionnaire de mots de passe.</p>
          </div>
        </Panel>

        <Panel title="Mode">
          <div className="px-6 py-5 text-sm leading-relaxed">
            <p className={DEMO_MODE ? "text-steel" : "text-moss"}>{DEMO_MODE ? "Démonstration (données fictives)" : "Usage réel"}</p>
            <p className="mt-2 text-mute">
              {DEMO_MODE
                ? "Pour passer en usage réel avec une base vide : arrêtez Sceau puis lancez « npm run setup -- --vierge »."
                : "Les comptes de démonstration et leur authentificateur à l'écran sont désactivés."}
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
