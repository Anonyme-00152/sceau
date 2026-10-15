import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrent } from "@/lib/session";
import { signupsOpen } from "@/lib/accounts";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Demander un accès" };

export default async function InscriptionPage() {
  const current = await getCurrent();
  if (current?.session.mfaAt) redirect("/espace");
  const open = await signupsOpen();

  return (
    <AuthFrame
      step={{ index: 0, label: "Demande" }}
      steps={["Demande", "Validation", "Première connexion"]}
      aside={{
        title: (
          <>
            Personne n&apos;entre
            <br />
            <span className="serif-accent text-brass">sans être invité.</span>
          </>
        ),
        body: "Votre demande part par e-mail à l'administrateur. Tant qu'il ne l'a pas validée, le compte existe mais reste fermé.",
      }}
    >
      {open ? (
        <SignupForm />
      ) : (
        <div>
          <p className="label text-steel">Inscriptions fermées</p>
          <h1 className="mt-4 text-4xl tracking-[-0.045em] md:text-5xl">Cette installation est privée.</h1>
          <p className="mt-5 leading-relaxed text-bone/70">
            Aucune nouvelle demande d&apos;accès n&apos;est acceptée ici. Si vous avez déjà un compte, connectez-vous.
          </p>
          <Link href="/connexion" className="mt-10 inline-flex h-13 items-center rounded-full bg-bone px-6 font-medium text-ink">
            Aller à la connexion
          </Link>
        </div>
      )}
    </AuthFrame>
  );
}
