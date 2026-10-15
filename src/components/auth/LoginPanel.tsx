"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { cancelLoginAction, loginAction, verifyCodeAction, type AuthState, type EnrollData } from "@/lib/auth-actions";
import { ROLE_LABEL } from "@/lib/fields";
import { Field, SubmitButton } from "@/components/ui/Field";
import { OtpInput } from "@/components/ui/OtpInput";
import { DemoAuthenticator } from "./DemoAuthenticator";

type DemoAccount = { email: string; name: string; role: keyof typeof ROLE_LABEL; title: string };

export function LoginPanel({
  initialStep,
  initialEmail,
  initialEnroll,
  demo,
  signupsOpen = true,
}: {
  initialStep: "password" | "code" | "enroll";
  initialEmail?: string;
  initialEnroll?: EnrollData;
  demo: { accounts: DemoAccount[]; password: string } | null;
  signupsOpen?: boolean;
}) {
  const [loginState, login, loginPending] = useActionState<AuthState, FormData>(loginAction, {
    step: initialStep,
    email: initialEmail,
    enroll: initialEnroll,
  });
  const [codeState, verify, codePending] = useActionState<AuthState, FormData>(verifyCodeAction, {});
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const codeForm = useRef<HTMLFormElement>(null);

  // Retour à l'étape mot de passe si le code a échoué trop souvent ou si la fenêtre a expiré.
  const step = codeState.step === "password" ? "password" : codeState.step === "enroll" ? "enroll" : (loginState.step ?? initialStep);
  const currentEmail = loginState.email ?? email;
  const enroll = codeState.enroll ?? loginState.enroll;

  if (step === "enroll" && enroll) {
    return (
      <div>
        <p className="label text-mute">Première connexion</p>
        <h1 className="mt-4 text-4xl tracking-[-0.045em] md:text-5xl">Associez votre téléphone.</h1>
        <p className="mt-4 leading-relaxed text-bone/65">
          Votre seconde clé sera un code à six chiffres généré par votre téléphone. Cette étape n&apos;a lieu qu&apos;une fois.
        </p>

        <ol className="mt-8 space-y-5">
          <li className="flex gap-4">
            <span className="label mt-1 text-brass">01</span>
            <p className="text-sm leading-relaxed text-bone/80">
              Installez une application d&apos;authentification : Google Authenticator, Microsoft Authenticator, 1Password ou
              Aegis.
            </p>
          </li>
          <li className="flex gap-4">
            <span className="label mt-1 text-brass">02</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-bone/80">Scannez ce code avec l&apos;application.</p>
              <div className="mt-4 flex flex-wrap items-center gap-5">
                {/* eslint-disable-next-line @next/next/no-img-element -- image générée localement (data URL) */}
                <img src={enroll.qr} alt="QR code d'association de l'application d'authentification" width={168} height={168} className="rounded-xl" />
                <div className="min-w-0">
                  <p className="label text-mute">Ou saisissez la clé</p>
                  <p className="mt-2 break-all font-mono text-sm leading-relaxed tracking-wider text-bone select-all">{enroll.secret}</p>
                </div>
              </div>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="label mt-1 text-brass">03</span>
            <p className="text-sm leading-relaxed text-bone/80">
              Saisissez le code de l&apos;entrée <strong className="font-medium text-bone">{enroll.issuer}</strong> pour confirmer.
              Si l&apos;application affiche plusieurs entrées « Sceau », c&apos;est celle-ci.
            </p>
          </li>
        </ol>

        <form ref={codeForm} action={verify} className="mt-6 space-y-6">
          <OtpInput
            value={code}
            onChange={setCode}
            invalid={!!codeState.error}
            disabled={codePending}
            onComplete={() => requestAnimationFrame(() => codeForm.current?.requestSubmit())}
          />
          {codeState.error && (
            <p role="alert" className="text-sm text-danger">
              {codeState.error}
            </p>
          )}
          <SubmitButton pending={codePending} disabled={code.length !== 6} className="w-full">
            Associer et continuer
          </SubmitButton>
        </form>
        <form action={cancelLoginAction} className="mt-8 text-center">
          <button className="label px-2 py-2.5 text-mute underline-offset-4 transition-colors hover:text-bone hover:underline">
            Annuler
          </button>
        </form>
      </div>
    );
  }

  if (step === "code") {
    return (
      <div>
        <p className="label text-mute">Étape 2 sur 3</p>
        <h1 className="mt-4 text-4xl tracking-[-0.045em] md:text-5xl">La seconde clé.</h1>
        <p className="mt-4 leading-relaxed text-bone/65">
          Saisissez le code à six chiffres affiché par votre application d&apos;authentification. Il change toutes les
          30&nbsp;secondes.
        </p>

        <form ref={codeForm} action={verify} className="mt-10 space-y-6">
          <OtpInput
            value={code}
            onChange={setCode}
            invalid={!!codeState.error}
            disabled={codePending}
            onComplete={() => requestAnimationFrame(() => codeForm.current?.requestSubmit())}
          />
          {codeState.error && (
            <p role="alert" className="text-sm text-danger">
              {codeState.error}
            </p>
          )}
          <SubmitButton pending={codePending} disabled={code.length !== 6} className="w-full">
            Valider le code
          </SubmitButton>
        </form>

        {demo && currentEmail && (
          <div className="mt-8">
            <DemoAuthenticator
              email={currentEmail}
              onUse={(c) => {
                setCode(c);
                setTimeout(() => codeForm.current?.requestSubmit(), 60);
              }}
            />
          </div>
        )}

        <form action={cancelLoginAction} className="mt-8 text-center">
          <button className="label px-2 py-2.5 text-mute underline-offset-4 transition-colors hover:text-bone hover:underline">
            Changer de compte
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <p className="label text-mute">Étape 1 sur 3</p>
      <h1 className="mt-4 text-4xl tracking-[-0.045em] md:text-5xl">Qui entre ?</h1>
      <p className="mt-4 leading-relaxed text-bone/65">
        Accès nominatif uniquement. Chaque tentative, réussie ou non, est inscrite au journal.
      </p>

      <form action={login} className="mt-10 space-y-5">
        <Field
          label="E-mail professionnel"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="prenom.nom@entreprise.fr"
        />
        <Field
          label="Mot de passe"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {loginState.error && (
          <p role="alert" className="text-sm text-danger">
            {loginState.error}
          </p>
        )}
        <SubmitButton pending={loginPending} className="w-full">
          Continuer →
        </SubmitButton>
      </form>

      {signupsOpen && (
        <p className="mt-6 text-center text-sm text-bone/60">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="inline-block py-2 text-brass underline-offset-4 hover:underline">
            Demander un accès
          </Link>
        </p>
      )}

      {demo && (
        <div className="mt-10">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-bone/10" />
            <p className="label text-steel">Comptes de démonstration</p>
            <span className="h-px flex-1 bg-bone/10" />
          </div>
          <ul className="mt-5 grid grid-cols-1 gap-2">
            {demo.accounts.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(demo.password);
                  }}
                  className={`group flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition-colors ${
                    email === a.email ? "border-bone/60 bg-bone/[0.06]" : "border-bone/10 hover:border-bone/30"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-ink-4 text-sm font-medium">
                      {a.name.split(" ").map((p) => p[0]).join("")}
                    </span>
                    <span>
                      <span className="block text-sm text-bone">{a.name}</span>
                      <span className="block text-xs text-mute">{a.title}</span>
                    </span>
                  </span>
                  <span className="label text-mute transition-colors group-hover:text-bone">{ROLE_LABEL[a.role]}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-mute">
            Un clic remplit les champs. Toutes les données de la démonstration sont fictives.
          </p>
        </div>
      )}
    </div>
  );
}
