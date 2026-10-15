import Link from "next/link";
import { SealMark } from "./SealMark";

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink pt-24 text-bone">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-12 px-5 md:grid-cols-12 md:px-8">
        <div className="md:col-span-5">
          <SealMark className="size-10 text-brass [--seal-inner:#0b0b0c]" />
          <p className="mt-6 max-w-sm text-lg leading-snug text-bone/80">
            Ce que vos clients vous confient reste dans la pièce. Le reste n&apos;est que du bruit.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 md:col-span-7 md:grid-cols-3">
          <FooterCol
            title="Produit"
            links={[
              { href: "/#verrous", label: "Les quatre verrous" },
              { href: "/#espace", label: "L'espace" },
              { href: "/securite", label: "Architecture" },
            ]}
          />
          <FooterCol
            title="Accès"
            links={[
              { href: "/connexion", label: "Connexion" },
              { href: "/securite#faq", label: "Questions" },
            ]}
          />
          <div>
            <p className="label text-mute">Statut</p>
            <p className="mt-4 flex items-center gap-2 text-sm text-bone/80">
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-moss/60" />
                <span className="relative size-2 rounded-full bg-moss" />
              </span>
              Démonstration en ligne
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-20 flex max-w-[1600px] flex-wrap items-center justify-between gap-4 border-t border-bone/10 px-5 py-6 text-mute md:px-8">
        <p className="label">© {new Date().getFullYear()} Sceau — Projet portfolio</p>
        <p className="label">Toutes les données affichées sont fictives</p>
      </div>

      <p
        aria-hidden
        className="display pointer-events-none select-none whitespace-nowrap text-center text-[31vw] leading-[0.72] text-bone/[0.045]"
      >
        Sceau
      </p>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="label text-mute">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="inline-block py-1.5 text-sm text-bone/80 transition-colors hover:text-brass">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
