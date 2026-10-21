import Link from "next/link";
import { SealMark } from "@/components/site/SealMark";

// Cadre commun des écrans d'accès : panneau de marque à gauche, contenu à droite.
export function AuthFrame({
  children,
  step,
  aside,
  steps = ["Identité", "Double clé", "Engagement"],
}: {
  children: React.ReactNode;
  step: { index: number; label: string };
  aside: { title: React.ReactNode; body: string };
  steps?: string[];
}) {
  return (
    <div className="grid grid-cols-1 min-h-dvh bg-ink lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="grain relative hidden flex-col justify-between overflow-hidden border-r border-bone/10 bg-ink-2 p-10 lg:flex">
        <Link href="/" className="relative z-10 flex items-center gap-2.5 self-start" aria-label="Retour à l'accueil">
          <SealMark className="size-7 text-bone [--seal-inner:#111113]" />
          <span className="text-[1.35rem] font-medium tracking-[-0.03em]">Sceau</span>
        </Link>

        <div aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative size-[min(34vw,520px)]">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(203,163,92,0.22),transparent_60%)]" />
            <svg viewBox="0 0 200 200" className="absolute inset-0 animate-[spin_40s_linear_infinite] text-bone/25">
              <defs>
                <path id="ring" d="M100 100 m-82 0 a82 82 0 1 1 164 0 a82 82 0 1 1 -164 0" />
              </defs>
              <text fontSize="7.2" letterSpacing="3.2" fill="currentColor" fontFamily="var(--font-geist-mono)">
                <textPath href="#ring">CONFIDENTIEL · SCELLÉ · CLOISONNÉ · TRACÉ · CONFIDENTIEL · SCELLÉ · CLOISONNÉ · TRACÉ ·</textPath>
              </text>
            </svg>
            <SealMark className="absolute inset-[24%] text-brass [--seal-inner:#4f3b18] drop-shadow-[0_40px_90px_rgba(203,163,92,0.25)]" />
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-5xl leading-[0.95] tracking-[-0.05em]">{aside.title}</h2>
          <p className="mt-5 leading-relaxed text-bone/60">{aside.body}</p>
        </div>
      </aside>

      <section className="flex min-h-dvh flex-col px-5 py-6 md:px-12 md:py-10">
        <div className="flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5 lg:hidden" aria-label="Retour à l'accueil">
            <SealMark className="size-6 text-bone [--seal-inner:#0b0b0c]" />
            <span className="text-lg font-medium tracking-[-0.03em]">Sceau</span>
          </Link>
          {steps.length > 0 && (
            <ol className="ml-auto flex items-center gap-2" aria-label="Étapes d'accès">
              {steps.map((s, i) => (
                <li key={s} className="flex items-center gap-2" aria-current={i === step.index ? "step" : undefined}>
                  <span
                    className={`label flex items-center gap-2 rounded-full border px-3 py-1.5 ${
                      i === step.index
                        ? "border-bone text-bone"
                        : i < step.index
                          ? "border-moss/40 text-moss"
                          : "border-bone/10 text-mute"
                    }`}
                  >
                    {i < step.index ? "✓" : String(i + 1).padStart(2, "0")}
                    <span className="hidden sm:inline">{s}</span>
                  </span>
                  {i < steps.length - 1 && <span className="h-px w-3 bg-bone/15" aria-hidden />}
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-12">{children}</div>
        <p className="label text-center text-mute">Connexion chiffrée · Tentatives journalisées</p>
      </section>
    </div>
  );
}
