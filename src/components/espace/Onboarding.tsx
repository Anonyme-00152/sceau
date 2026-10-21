import Link from "next/link";
import type { OnboardingStep } from "@/lib/onboarding";
import { Icon } from "@/components/ui/Icon";

// Premiers pas : visible tant que les étapes essentielles ne sont pas faites, puis disparaît d'elle-même.
export function Onboarding({ steps }: { steps: OnboardingStep[] }) {
  const required = steps.filter((s) => !s.optional);
  const doneCount = required.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);

  return (
    <section className="overflow-hidden rounded-3xl border border-brass/25 bg-[linear-gradient(135deg,rgba(203,163,92,0.10),rgba(203,163,92,0.02)_55%)]">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-brass/15 px-6 py-6 md:px-8">
        <div className="max-w-xl">
          <p className="label text-brass">Premiers pas · {doneCount} sur {required.length}</p>
          <h2 className="mt-3 text-3xl tracking-[-0.04em] md:text-4xl">
            Votre registre est prêt. <span className="serif-accent text-brass">Installons-le.</span>
          </h2>
        </div>
        <div className="h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-bone/10" aria-hidden>
          <div className="h-full rounded-full bg-brass transition-[width] duration-700" style={{ width: `${(doneCount / required.length) * 100}%` }} />
        </div>
      </div>
      <ol className="grid grid-cols-1 divide-y divide-bone/[0.06] md:grid-cols-2 md:divide-y-0 xl:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.key} className={`flex flex-col gap-4 px-6 py-6 md:px-8 ${i > 0 ? "xl:border-l xl:border-bone/[0.06]" : ""}`}>
            <div className="flex items-center gap-3">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-xs ${
                  s.done ? "border-moss/50 bg-moss/15 text-moss" : s === next ? "border-brass text-brass" : "border-bone/15 text-mute"
                }`}
              >
                {s.done ? <Icon name="check" className="size-4" /> : <span className="font-mono">{String(i + 1).padStart(2, "0")}</span>}
              </span>
              {s.optional && <span className="label text-mute">Facultatif</span>}
            </div>
            <div className="flex-1">
              <p className={s.done ? "text-bone/50 line-through decoration-bone/25" : "text-bone"}>{s.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-mute">{s.body}</p>
            </div>
            {!s.done && (
              <Link
                href={s.href}
                className={`inline-flex h-10 items-center gap-2 self-start rounded-full px-4 text-sm transition-transform hover:scale-[1.03] ${
                  s === next ? "bg-brass font-medium text-ink" : "border border-bone/15 text-bone/85"
                }`}
              >
                {s.cta}
                <Icon name="arrowRight" className="size-4" />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
