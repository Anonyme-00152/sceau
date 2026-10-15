import Link from "next/link";
import { LineReveal, Magnetic } from "../motion";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-bone py-28 text-ink md:py-40" aria-labelledby="cta-titre">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-14 px-5 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <p className="label flex items-center gap-3 text-ink/60">
            <span className="text-brass-deep">05</span> Démonstration
          </p>
          <h2 id="cta-titre" className="display mt-6 text-[clamp(6rem,21vw,22rem)]">
            <LineReveal lines={["Entrez."]} />
          </h2>
          <p className="mt-6 max-w-md leading-relaxed text-ink/70">
            Trois comptes de démonstration, trois niveaux d&apos;accès. Les codes à usage unique s&apos;affichent à l&apos;écran : rien
            à installer. Toutes les données sont fictives.
          </p>
        </div>
        <Magnetic className="self-start md:self-auto">
          <Link
            href="/connexion"
            data-cursor="Entrer"
            className="group relative flex size-44 items-center justify-center overflow-hidden rounded-full bg-brass text-ink md:size-56"
          >
            <span className="absolute inset-0 origin-bottom scale-y-0 rounded-full bg-ink transition-transform duration-700 ease-[var(--ease-expo)] group-hover:scale-y-100" />
            <span className="relative text-center text-lg font-medium leading-tight transition-colors duration-500 group-hover:text-bone">
              Ouvrir
              <br />
              l&apos;espace →
            </span>
          </Link>
        </Magnetic>
      </div>
    </section>
  );
}
