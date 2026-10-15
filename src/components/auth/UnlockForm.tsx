"use client";

import { useActionState } from "react";
import { logoutAction, unlockAction, type AuthState } from "@/lib/auth-actions";
import { Field, SubmitButton } from "@/components/ui/Field";

export function UnlockForm({ back }: { back: string }) {
  const [state, unlock, pending] = useActionState<AuthState, FormData>(unlockAction, {});
  return (
    <>
      <form action={unlock} className="space-y-4">
        <input type="hidden" name="retour" value={back} />
        <Field label="Mot de passe" name="password" type="password" autoComplete="current-password" required autoFocus error={state.error} />
        <SubmitButton pending={pending} className="w-full">
          Déverrouiller
        </SubmitButton>
      </form>
      <form action={logoutAction} className="mt-6 text-center">
        <button className="label px-2 py-2.5 text-mute underline-offset-4 transition-colors hover:text-bone hover:underline">Se déconnecter</button>
      </form>
    </>
  );
}
