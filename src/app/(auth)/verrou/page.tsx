import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrent } from "@/lib/session";
import { UnlockForm } from "@/components/auth/UnlockForm";
import { SealMark } from "@/components/site/SealMark";

export const metadata: Metadata = { title: "Session verrouillée" };

export default async function VerrouPage(props: PageProps<"/verrou">) {
  const current = await getCurrent();
  if (!current?.session.mfaAt) redirect("/connexion");
  if (!current.session.lockedAt) redirect("/espace");
  const { retour } = await props.searchParams;
  const back = typeof retour === "string" && retour.startsWith("/espace") ? retour : "/espace";
  const initials = current.user.name.split(" ").map((p) => p[0]).join("");

  return (
    <div className="grain relative flex min-h-dvh items-center justify-center overflow-hidden bg-ink px-5">
      <div aria-hidden className="absolute left-1/2 top-1/2 size-[90vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(203,163,92,0.14),transparent_60%)]" />
      <div className="relative z-10 w-full max-w-sm text-center">
        <SealMark className="mx-auto size-16 text-brass [--seal-inner:#0b0b0c]" />
        <p className="label mt-8 text-mute">Session verrouillée</p>
        <h1 className="mt-4 text-4xl tracking-[-0.045em]">L&apos;espace attend votre retour.</h1>
        <p className="mt-4 leading-relaxed text-bone/60">
          Verrouillée après inactivité. Aucun contenu n&apos;est chargé tant que vous n&apos;avez pas confirmé votre identité.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-ink-4 text-sm font-medium">{initials}</span>
          <span className="text-left">
            <span className="block text-sm text-bone">{current.user.name}</span>
            <span className="block text-xs text-mute">{current.user.email}</span>
          </span>
        </div>
        <div className="mt-8 text-left">
          <UnlockForm back={back} />
        </div>
      </div>
    </div>
  );
}
