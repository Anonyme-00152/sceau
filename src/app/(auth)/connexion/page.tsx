import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrent } from "@/lib/session";
import { enrollmentData, signupsOpen } from "@/lib/accounts";
import { DEMO_MODE, DEMO_PASSWORD, demoAccounts } from "@/lib/demo";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { LoginPanel } from "@/components/auth/LoginPanel";

export const metadata: Metadata = { title: "Connexion" };

export default async function ConnexionPage() {
  const current = await getCurrent();
  if (current?.session.mfaAt) redirect(current.session.ndaAt ? "/espace" : "/engagement");

  const pending = !!current && !current.session.mfaAt;
  const enrolling = pending && !current.user.totpEnrolledAt;
  const accounts = await demoAccounts();

  return (
    <AuthFrame
      step={{ index: pending ? 1 : 0, label: pending ? "Double clé" : "Identité" }}
      aside={{
        title: (
          <>
            Deux clés.
            <br />
            <span className="serif-accent text-brass">Une seule porte.</span>
          </>
        ),
        body: "Le mot de passe prouve ce que vous savez. Le code à usage unique prouve ce que vous avez. Il faut les deux pour entrer.",
      }}
    >
      <LoginPanel
        initialStep={enrolling ? "enroll" : pending ? "code" : "password"}
        initialEmail={pending ? current.user.email : undefined}
        initialEnroll={enrolling ? await enrollmentData(current.user) : undefined}
        demo={DEMO_MODE ? { accounts, password: DEMO_PASSWORD } : null}
        signupsOpen={await signupsOpen()}
      />
    </AuthFrame>
  );
}
