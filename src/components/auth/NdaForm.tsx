"use client";

import { useRef } from "react";
import { acceptNdaAction, logoutAction } from "@/lib/auth-actions";
import { HoldToConfirm } from "./HoldToConfirm";

export function NdaForm() {
  const form = useRef<HTMLFormElement>(null);
  return (
    <div className="space-y-4">
      <form ref={form} action={acceptNdaAction}>
        <HoldToConfirm label="Je m'engage" doneLabel="Engagement signé" onConfirm={() => form.current?.requestSubmit()} />
      </form>
      <form action={logoutAction} className="text-center">
        <button className="label px-2 py-2.5 text-mute underline-offset-4 transition-colors hover:text-bone hover:underline">
          Refuser et se déconnecter
        </button>
      </form>
    </div>
  );
}
