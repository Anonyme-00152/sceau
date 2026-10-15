import Link from "next/link";
import { SealMark } from "@/components/site/SealMark";

export default function NotFound() {
  return (
    <main className="grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-ink px-5 text-center">
      <p aria-hidden className="display pointer-events-none absolute select-none text-[42vw] text-bone/[0.04]">
        404
      </p>
      <SealMark className="relative size-14 text-brass [--seal-inner:#0b0b0c]" />
      <h1 className="relative mt-8 text-5xl tracking-[-0.05em] md:text-6xl">
        Page <span className="serif-accent text-brass">introuvable.</span>
      </h1>
      <p className="relative mt-4 max-w-md text-bone/60">Elle n&apos;existe pas, ou elle est restée sous scellé.</p>
      <Link href="/" className="relative mt-10 inline-flex h-12 items-center rounded-full bg-bone px-6 font-medium text-ink">
        Revenir à l&apos;accueil
      </Link>
    </main>
  );
}
