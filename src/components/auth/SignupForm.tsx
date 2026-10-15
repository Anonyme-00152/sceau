"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signupAction, type SignupState } from "@/lib/account-actions";
import { Field, SubmitButton } from "@/components/ui/Field";

function strength(p: string) {
  let s = 0;
  if (p.length >= 12) s++;
  if (p.length >= 16) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^a-zA-Z0-9]/.test(p)) s++;
  return Math.min(4, s);
}

const STRENGTH_LABEL = ["Trop faible", "Faible", "Correct", "Solide", "Excellent"];

export function SignupForm() {
  const [state, action, pending] = useActionState<SignupState, FormData>(signupAction, {});
  const [password, setPassword] = useState("");
  const fe = state.fieldErrors ?? {};
  const level = strength(password);

  if (state.done) {
    return (
      <div>
        <p className="label text-moss">Demande envoyée</p>
        <h1 className="mt-4 text-4xl tracking-[-0.045em] md:text-5xl">Votre demande est entre de bonnes mains.</h1>
        <p className="mt-5 leading-relaxed text-bone/70">
          L&apos;administrateur vient de recevoir un e-mail pour valider votre accès. Tant qu&apos;il ne l&apos;a pas fait,
          votre compte reste fermé. Vous serez prévenu par e-mail.
        </p>
        <p className="mt-4 leading-relaxed text-bone/70">
          À votre première connexion, vous associerez une application d&apos;authentification à votre compte.
        </p>
        <Link href="/connexion" className="mt-10 inline-flex h-13 items-center rounded-full bg-bone px-6 font-medium text-ink">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="label text-mute">Nouvel accès</p>
      <h1 className="mt-4 text-4xl tracking-[-0.045em] md:text-5xl">Demander un accès.</h1>
      <p className="mt-4 leading-relaxed text-bone/65">
        Chaque compte est nominatif et validé par l&apos;administrateur avant la première connexion.
      </p>

      <form action={action} className="mt-10 space-y-5" noValidate>
        <Field label="Nom complet" name="name" autoComplete="name" required error={fe.name} />
        <Field label="E-mail professionnel" name="email" type="email" autoComplete="email" required error={fe.email} placeholder="prenom.nom@entreprise.fr" />
        <Field label="Fonction" name="title" autoComplete="organization-title" hint="Facultatif" error={fe.title} placeholder="Assistante de direction" />
        <div>
          <Field
            label="Mot de passe"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            hint="12 caractères minimum"
            error={fe.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-2 flex items-center gap-3" aria-live="polite">
            <div className="flex flex-1 gap-1" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    password && i < level ? (level <= 1 ? "bg-danger" : level === 2 ? "bg-steel" : "bg-moss") : "bg-bone/10"
                  }`}
                />
              ))}
            </div>
            <span className="label w-24 text-right text-mute">{password ? STRENGTH_LABEL[level] : ""}</span>
          </div>
        </div>
        <Field label="Confirmer le mot de passe" name="confirm" type="password" autoComplete="new-password" required error={fe.confirm} />
        <div>
          <label htmlFor="note" className="label mb-2 flex items-center justify-between text-mute">
            Message pour l&apos;administrateur
            <span className="normal-case tracking-normal text-mute/80">Facultatif</span>
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            maxLength={500}
            placeholder="Service, motif de la demande…"
            className="w-full resize-none rounded-xl border border-bone/15 bg-ink-2 px-4 py-3 text-bone outline-none transition-colors placeholder:text-mute/60 hover:border-bone/30 focus:border-bone"
          />
        </div>
        <label className="flex cursor-pointer gap-3 rounded-xl border border-bone/10 p-4 text-sm leading-relaxed text-bone/80">
          <input type="checkbox" name="charter" className="mt-1 accent-[var(--color-brass)]" />
          <span>
            Je m&apos;engage à ne consulter que les dossiers nécessaires à ma mission et à ne rien divulguer hors de cet espace.
            Mes consultations seront journalisées à mon nom.
            {fe.charter && <span className="mt-1 block text-danger">{fe.charter}</span>}
          </span>
        </label>
        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        <SubmitButton pending={pending} className="w-full">
          Envoyer la demande
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-bone/60">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="inline-block py-2 text-brass underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
