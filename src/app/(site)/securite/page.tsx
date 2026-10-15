import type { Metadata } from "next";
import Link from "next/link";
import { LineReveal, Reveal } from "@/components/site/motion";

export const metadata: Metadata = {
  title: "Sécurité",
  description: "Architecture de sécurité de Sceau : chiffrement, cloisonnement, double facteur, journal scellé, en-têtes et limites assumées.",
};

const LAYERS = [
  { k: "Transport", v: "HTTPS imposé (HSTS), cookies de session httpOnly, SameSite strict, jamais lisibles par le JavaScript de la page." },
  { k: "Page", v: "Politique de sécurité du contenu à nonce unique par requête, aucun script tiers, aucune iframe possible, aucun traceur." },
  { k: "Identité", v: "Mot de passe haché en scrypt, puis code à usage unique (TOTP) : deux preuves distinctes, un appareil personnel." },
  { k: "Session", v: "Empreinte du jeton seule en base, expiration absolue de 8 h, suppression après 30 min sans activité, verrou à 5 min." },
  { k: "Accès", v: "Liste nominative par dossier, vérifiée côté serveur à chaque page et chaque action. Une donnée critique exige un accès renforcé." },
  { k: "Stockage", v: "Profils et échanges chiffrés en AES-256-GCM, chaque bloc lié à son dossier. La base seule ne révèle rien." },
  { k: "Preuve", v: "Journal à chaîne d'empreintes SHA-256 : toute modification ou suppression d'une ligne est détectée." },
];

const FAQ = [
  {
    q: "L'engagement de confidentialité me protège-t-il en cas de fuite ?",
    a: "Il engage la personne qui consulte les données : chacun signe, à chaque connexion, et la signature est journalisée. Il ne remplace pas vos obligations d'entreprise. Au regard du RGPD, la responsabilité de protéger les données reste celle de l'organisation qui les collecte. C'est précisément pour cela que Sceau mise sur des protections techniques plutôt que sur un avertissement.",
  },
  {
    q: "Pourquoi ne pas pouvoir exporter les dossiers ?",
    a: "Un export est la fuite la plus fréquente et la moins visible. Sceau n'en propose aucun par défaut : les données sont consultées sur place, et chaque révélation laisse une trace.",
  },
  {
    q: "Que voit la direction ?",
    a: "La direction voit l'existence de tous les dossiers pour pouvoir gérer les accès. Elle ne lit un dossier que si elle figure sur sa liste d'accès, et s'y inscrire est lui-même journalisé.",
  },
  {
    q: "Qu'est-ce qu'une donnée critique ?",
    a: "Pièce d'identité, numéro fiscal, IBAN. Les révéler demande un accès renforcé (le code à usage unique, de nouveau), valable cinq minutes. Les comptes en lecture seule n'y ont pas accès.",
  },
  {
    q: "Cette démonstration contient-elle de vraies données ?",
    a: "Non. Toutes les personnes, entreprises, adresses et numéros sont inventés. Les numéros de téléphone utilisent une plage réservée à la fiction, les e-mails un domaine réservé aux tests.",
  },
];

export default function SecuritePage() {
  return (
    <>
      <section className="grain relative overflow-hidden bg-ink pb-24 pt-40 md:pb-32 md:pt-52">
        <div className="mx-auto max-w-[1600px] px-5 md:px-8">
          <p className="label flex items-center gap-3 text-mute">
            <span className="h-px w-8 bg-brass" /> Architecture
          </p>
          <h1 className="mt-8 max-w-6xl text-[clamp(3rem,8vw,8.5rem)] leading-[0.9] tracking-[-0.055em]">
            <LineReveal immediate lines={["Sécurité,", <span key="b" className="serif-accent text-brass">sans astérisque.</span>]} />
          </h1>
          <p className="mt-10 max-w-xl text-lg leading-relaxed text-bone/65">
            Sept couches indépendantes. Si l&apos;une cède, les autres tiennent. Voici exactement ce qui protège chaque donnée,
            de votre clavier jusqu&apos;au disque.
          </p>
        </div>
      </section>

      <section className="bg-ink pb-28 md:pb-40" aria-label="Couches de protection">
        <div className="mx-auto max-w-[1600px] px-5 md:px-8">
          <Diagram />
          <ol className="mt-20 border-t border-bone/10">
            {LAYERS.map((l, i) => (
              <Reveal as="li" key={l.k} className="grid grid-cols-1 gap-4 border-b border-bone/10 py-8 md:grid-cols-12 md:py-10">
                <span className="label text-brass md:col-span-1">{String(i + 1).padStart(2, "0")}</span>
                <h2 className="text-3xl tracking-[-0.04em] md:col-span-4 md:text-4xl">{l.k}</h2>
                <p className="max-w-xl leading-relaxed text-bone/65 md:col-span-7">{l.v}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section id="faq" className="bg-bone py-28 text-ink md:py-40" aria-labelledby="faq-titre">
        <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-12 px-5 md:grid-cols-12 md:px-8">
          <div className="md:col-span-4">
            <p className="label text-ink/60">Questions</p>
            <h2 id="faq-titre" className="mt-6 text-[clamp(2.4rem,4.4vw,4.4rem)] leading-[0.95] tracking-[-0.05em]">
              Ce qu&apos;on nous <span className="serif-accent text-brass-deep">demande.</span>
            </h2>
          </div>
          <div className="md:col-span-8">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-t border-ink/15 py-6 last:border-b">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-xl tracking-[-0.02em] md:text-2xl [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-ink/25 transition-transform duration-500 group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-2xl leading-relaxed text-ink/70">{f.a}</p>
              </details>
            ))}
            <Link href="/connexion" className="mt-12 inline-flex h-13 items-center gap-3 rounded-full bg-ink px-7 font-medium text-bone transition-transform hover:scale-[1.03]">
              Tester la démonstration →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Diagram() {
  const nodes = ["Navigateur", "Proxy · CSP", "Double clé", "Contrôle d'accès", "AES-256-GCM", "Base"];
  return (
    <Reveal className="overflow-x-auto rounded-3xl border border-bone/10 bg-ink-2 p-6 md:p-10">
      <div className="flex min-w-[760px] items-center justify-between gap-2">
        {nodes.map((n, i) => (
          <div key={n} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-24 flex-1 flex-col justify-between rounded-2xl border p-4 ${
                i === 4 ? "border-brass/60 bg-brass/10" : "border-bone/15"
              }`}
            >
              <span className="label text-mute">{String(i + 1).padStart(2, "0")}</span>
              <span className={`text-sm ${i === 4 ? "text-brass" : "text-bone"}`}>{n}</span>
            </div>
            {i < nodes.length - 1 && (
              <svg viewBox="0 0 24 12" className="w-6 shrink-0 text-bone/40" aria-hidden>
                <path d="M0 6h20M16 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            )}
          </div>
        ))}
      </div>
      <p className="label mt-6 text-mute">Chaque requête traverse toutes les couches, dans cet ordre. Aucune ne fait confiance à la précédente.</p>
    </Reveal>
  );
}
