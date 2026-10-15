import { Counter, Reveal } from "../motion";

const FIGURES = [
  { value: 256, suffix: "", unit: "bits", label: "Clé de chiffrement AES-GCM, par dossier" },
  { value: 0, suffix: "", unit: "export", label: "Aucune extraction possible par défaut" },
  { value: 100, suffix: " %", unit: "tracé", label: "Des consultations inscrites au journal" },
  { value: 5, suffix: "", unit: "min", label: "Avant verrouillage automatique" },
];

export function Figures() {
  return (
    <section className="bg-ink py-24 md:py-36" aria-label="Chiffres clés">
      <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-px overflow-hidden rounded-3xl border border-bone/10 bg-bone/10 px-0 md:mx-8 md:grid-cols-4 2xl:mx-auto">
        {FIGURES.map((f, i) => (
          <Reveal key={f.unit} delay={i * 0.07} className="flex flex-col justify-between gap-12 bg-ink p-6 md:p-9">
            <p className="label text-mute">{f.unit}</p>
            <div>
              <p className="display text-[clamp(4.5rem,9vw,9rem)] text-bone">
                <Counter to={f.value} />
                <span className="text-brass">{f.suffix}</span>
              </p>
              <p className="mt-4 max-w-[16rem] text-sm leading-relaxed text-bone/60">{f.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
