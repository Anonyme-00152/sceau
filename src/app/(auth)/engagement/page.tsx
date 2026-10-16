import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrent } from "@/lib/session";
import { requestInfo } from "@/lib/request";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { NdaForm } from "@/components/auth/NdaForm";

export const metadata: Metadata = { title: "Engagement de confidentialité" };

const COMMITMENTS = [
  "Ne consulter que les dossiers nécessaires à ma mission.",
  "Ne rien copier, exporter, photographier ni transmettre hors de cet espace.",
  "Ne jamais partager mes identifiants ni mon code à usage unique.",
  "Signaler sans délai tout accès inhabituel ou toute suspicion de fuite.",
];

export default async function EngagementPage() {
  const current = await getCurrent();
  if (!current?.session.mfaAt) redirect("/connexion");
  if (current.session.ndaAt) redirect("/espace");

  const { ip } = await requestInfo();
  const date = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" }).format(new Date());

  return (
    <AuthFrame
      step={{ index: 2, label: "Engagement" }}
      aside={{
        title: (
          <>
            Avant d&apos;entrer,
            <br />
            <span className="serif-accent text-brass">un engagement.</span>
          </>
        ),
        body: "La technique protège les données. L'engagement rappelle que chaque personne qui les consulte en répond.",
      }}
    >
      <p className="label text-mute">Étape 3 sur 3</p>
      <h1 className="mt-4 text-4xl tracking-[-0.045em] md:text-5xl">Engagement de confidentialité</h1>
      <p className="mt-5 leading-relaxed text-bone/70">
        Vous entrez dans un espace qui contient des données personnelles confiées par nos clients. Tout ce qui s&apos;y trouve
        doit y rester. En continuant, je m&apos;engage à&nbsp;:
      </p>
      <ol className="mt-6 space-y-3">
        {COMMITMENTS.map((c, i) => (
          <li key={c} className="flex gap-4 rounded-xl border border-bone/10 bg-ink-2/60 px-4 py-3.5">
            <span className="label mt-0.5 text-brass">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-[0.95rem] leading-relaxed text-bone/85">{c}</span>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm leading-relaxed text-bone/60">
        Chaque consultation est inscrite à mon nom dans un journal infalsifiable. Toute divulgation engage la responsabilité
        de son auteur.
      </p>

      <div className="mt-8 rounded-2xl border border-bone/10 p-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="label self-center text-mute">Signataire</dt>
          <dd className="text-bone">{current.user.name}</dd>
          <dt className="label self-center text-mute">Date</dt>
          <dd className="text-bone">{date}</dd>
          <dt className="label self-center text-mute">Origine</dt>
          <dd className="font-mono text-bone">{ip}</dd>
        </dl>
      </div>

      <div className="mt-8">
        <NdaForm />
      </div>
    </AuthFrame>
  );
}
