import { LineReveal, Reveal } from "../motion";
import { AccessDemo, ChainDemo, CipherDemo, TotpDemo } from "./LockDemos";

const LOCKS = [
  {
    n: "01",
    title: "Chiffré, champ par champ.",
    body: "Chaque dossier est scellé en AES-256-GCM et lié à son identifiant. Copié ailleurs, un bloc chiffré ne s'ouvre plus. Même la base de données ne lit rien.",
    demo: <CipherDemo />,
  },
  {
    n: "02",
    title: "Cloisonné, dossier par dossier.",
    body: "Une liste d'accès nominative pour chaque client. La direction gère les droits, sans lire les dossiers qui ne la concernent pas.",
    demo: <AccessDemo />,
  },
  {
    n: "03",
    title: "Deux clés pour entrer.",
    body: "Un mot de passe, puis un code à usage unique généré par le téléphone du membre. Les données critiques redemandent ce code.",
    demo: <TotpDemo />,
  },
  {
    n: "04",
    title: "Un journal qu'on ne réécrit pas.",
    body: "Chaque consultation, chaque révélation, chaque droit accordé rejoint une chaîne d'empreintes. Modifier une ligne la casse, visiblement.",
    demo: <ChainDemo />,
  },
];

export function Locks() {
  return (
    <section id="verrous" className="relative bg-ink py-28 md:py-40" aria-labelledby="verrous-titre">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-16 px-5 md:grid-cols-12 md:px-8">
        <div className="md:col-span-5">
          <div className="md:sticky md:top-32">
            <p className="label flex items-center gap-3 text-mute">
              <span className="text-brass">02</span> Les verrous
            </p>
            <h2 id="verrous-titre" className="mt-6 text-[clamp(2.6rem,5.4vw,5.6rem)] leading-[0.95] tracking-[-0.05em]">
              <LineReveal lines={["Quatre verrous.", <span key="b" className="serif-accent text-brass">Aucun passe-partout.</span>]} />
            </h2>
            <p className="mt-8 max-w-sm leading-relaxed text-bone/65">
              La sécurité n&apos;est pas une option qu&apos;on coche. Elle tient dans quatre mécanismes simples, visibles, que vous
              pouvez tester ici même.
            </p>
          </div>
        </div>

        <ol className="flex flex-col gap-6 md:col-span-7">
          {LOCKS.map((lock) => (
            <Reveal as="li" key={lock.n} className="group rounded-3xl border border-bone/10 bg-ink-2 p-5 transition-colors duration-500 hover:border-bone/25 sm:p-6 md:p-10">
              <div className="flex items-start justify-between gap-6">
                <h3 className="max-w-md text-[clamp(1.6rem,2.6vw,2.4rem)] leading-[1.02] tracking-[-0.035em]">{lock.title}</h3>
                <span className="display text-5xl text-bone/15 transition-colors duration-500 group-hover:text-brass md:text-7xl">{lock.n}</span>
              </div>
              <p className="mt-4 max-w-lg leading-relaxed text-bone/65">{lock.body}</p>
              <div className="mt-8">{lock.demo}</div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
