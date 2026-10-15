import { Reveal, ScrollWords } from "../motion";

const PROMISES = [
  { k: "Où", v: "Une seule pièce, fermée à clé. Ni tableur, ni boîte mail, ni conversation de groupe." },
  { k: "Qui", v: "Des personnes nommées, une liste d'accès par dossier. Par défaut : personne." },
  { k: "Quoi", v: "Tout ce qui compte pour la relation, et rien de ce qui pourrait fuir sans laisser de trace." },
];

export function Manifesto() {
  return (
    <section id="manifeste" className="relative bg-bone py-28 text-ink md:py-44" aria-labelledby="manifeste-titre">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-14 px-5 md:grid-cols-12 md:px-8">
        <div className="md:col-span-3">
          <p id="manifeste-titre" className="label flex items-center gap-3 text-ink/60">
            <span className="text-brass-deep">01</span> Manifeste
          </p>
        </div>
        <div className="md:col-span-9">
          <ScrollWords
            className="text-[clamp(1.85rem,4.1vw,4.25rem)] leading-[1.06] tracking-[-0.038em]"
            accent={["secrets", "trace"]}
            text="Vos clients vous confient leur adresse, leurs comptes, leurs projets, parfois leurs secrets. Ces informations n'ont rien à faire dans un fichier partagé. Sceau les garde dans une seule pièce, où chaque entrée laisse une trace."
          />
          <div className="mt-20 grid grid-cols-1 gap-10 border-t border-ink/15 pt-10 md:mt-28 md:grid-cols-3">
            {PROMISES.map((p, i) => (
              <Reveal key={p.k} delay={i * 0.08}>
                <p className="serif-accent text-4xl text-brass-deep">{p.k}</p>
                <p className="mt-3 max-w-xs text-[0.95rem] leading-relaxed text-ink/75">{p.v}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
