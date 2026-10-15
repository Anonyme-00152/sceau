import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export default function EspaceNotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center text-center">
      <span className="flex size-16 items-center justify-center rounded-full border border-bone/15 text-mute">
        <Icon name="lock" className="size-6" />
      </span>
      <p className="label mt-8 text-mute">Introuvable ou cloisonné</p>
      <h1 className="mt-4 text-4xl tracking-[-0.045em]">Rien à voir ici.</h1>
      <p className="mt-4 leading-relaxed text-bone/60">
        Ce dossier n&apos;existe pas, ou il ne figure pas sur votre liste d&apos;accès. Les deux cas sont volontairement
        indiscernables.
      </p>
      <Link href="/espace/clients" className="mt-8 inline-flex h-11 items-center rounded-full bg-bone px-5 text-sm font-medium text-ink">
        Retour aux dossiers
      </Link>
    </div>
  );
}
