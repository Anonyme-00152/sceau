"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ClientFormState } from "@/app/espace/actions";
import { SENSITIVITY_LABEL, STATUS_LABEL, visibleSections, type FieldDef, type ModuleId } from "@/lib/fields";
import { Icon } from "@/components/ui/Icon";

type Meta = {
  kind: "particulier" | "entreprise";
  displayName: string;
  status: keyof typeof STATUS_LABEL;
  sensitivity: keyof typeof SENSITIVITY_LABEL;
  city: string;
  country: string;
  sector: string;
};

type CustomRow = { key: string; id: string; label: string; value: string; sensitive: boolean; hasValue: boolean };

const LEVELS = [
  { value: "standard", label: "Standard", text: "Données sensibles masquées, révélation journalisée." },
  { value: "restreint", label: "Restreint", text: "Liste d'accès courte, surveillance renforcée." },
  { value: "secret", label: "Secret", text: "Accès renforcé exigé pour toute donnée sensible." },
] as const;

const inputClass =
  "h-12 w-full rounded-xl border border-bone/12 bg-ink px-4 text-bone outline-none transition-colors placeholder:text-mute/70 hover:border-bone/25 focus:border-bone";

export function ClientForm({
  mode,
  action,
  meta,
  values,
  sealedFilled,
  custom,
  cancelHref,
  modules,
}: {
  mode: "create" | "edit";
  action: (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  meta: Meta;
  values: Record<string, string>;
  sealedFilled: Record<string, boolean>;
  custom: Omit<CustomRow, "key">[];
  cancelHref: string;
  modules: ModuleId[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [kind, setKind] = useState(meta.kind);
  // Les rubriques suivent le type de client (particulier / entreprise) et les modules activés par la direction.
  const sections = visibleSections(modules, kind);
  const [rows, setRows] = useState<CustomRow[]>(custom.map((c) => ({ ...c, key: c.id })));
  const fe = state.fieldErrors ?? {};

  const addRow = () =>
    setRows((r) => [...r, { key: crypto.randomUUID(), id: "", label: "", value: "", sensitive: true, hasValue: false }]);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-10 xl:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label="Sections du formulaire" className="hidden xl:block">
        <ul className="sticky top-28 space-y-1">
          <li>
            <a href="#identification" className="label flex gap-3 rounded-lg px-3 py-2 text-mute hover:text-bone">
              <span className="text-brass">00</span> Dossier
            </a>
          </li>
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="label flex gap-3 rounded-lg px-3 py-2 text-mute hover:text-bone">
                <span className="text-brass">{s.index}</span> {s.label}
              </a>
            </li>
          ))}
          <li>
            <a href="#libres" className="label flex gap-3 rounded-lg px-3 py-2 text-mute hover:text-bone">
              <span className="text-brass">{String(sections.length + 1).padStart(2, "0")}</span> Champs libres
            </a>
          </li>
        </ul>
      </nav>

      <div className="min-w-0 space-y-6">
        <FormPanel id="identification" index="00" title="Dossier">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <span className="label text-mute">Type</span>
              <div className="mt-2 inline-flex rounded-full border border-bone/12 p-1" role="radiogroup" aria-label="Type de client">
                {(["particulier", "entreprise"] as const).map((k) => (
                  <label key={k} className="cursor-pointer">
                    <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="peer sr-only" />
                    <span className="block rounded-full px-4 py-2 text-sm text-bone/70 transition-colors peer-checked:bg-bone peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brass">
                      {k === "particulier" ? "Particulier" : "Entreprise"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <Input label="Nom affiché" name="displayName" defaultValue={meta.displayName} required error={fe.displayName} className="md:col-span-2" placeholder={kind === "entreprise" ? "Raison sociale" : "Prénom Nom"} />
            <div>
              <label htmlFor="status" className="label text-mute">Statut</label>
              <select id="status" name="status" defaultValue={meta.status} className={`${inputClass} mt-2`}>
                {Object.entries(STATUS_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <Input label="Secteur" name="sector" defaultValue={meta.sector} placeholder="Ex. Immobilier" />
            <Input label="Ville" name="city" defaultValue={meta.city} />
            <Input label="Pays" name="country" defaultValue={meta.country} />
            <fieldset className="md:col-span-2">
              <legend className="label text-mute">Niveau de confidentialité</legend>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                {LEVELS.map((l) => (
                  <label key={l.value} className="cursor-pointer">
                    <input type="radio" name="sensitivity" value={l.value} defaultChecked={meta.sensitivity === l.value} className="peer sr-only" />
                    <span
                      className={`block h-full rounded-2xl border border-bone/12 p-4 transition-colors peer-checked:bg-bone/[0.05] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brass ${
                        l.value === "secret" ? "peer-checked:border-danger" : l.value === "restreint" ? "peer-checked:border-steel" : "peer-checked:border-bone"
                      }`}
                    >
                      <span className={`block text-sm font-medium ${l.value === "secret" ? "text-danger" : l.value === "restreint" ? "text-steel" : "text-bone"}`}>{l.label}</span>
                      <span className="mt-1 block text-sm leading-snug text-mute">{l.text}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </FormPanel>

        {sections.map((s) => (
          <FormPanel key={s.id} id={s.id} index={s.index} title={s.label}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {s.fields.map((f) => {
                const keepHint = mode === "edit" && !!f.sensitive && !!sealedFilled[f.key];
                return (
                  <div key={f.key} className={f.wide || f.multiline ? "md:col-span-2" : undefined}>
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor={`f-${f.key}`} className="label flex items-center gap-2 text-mute">
                        {f.sensitive && <Icon name="lock" className="size-3.5 text-brass" />}
                        {f.label}
                        {f.critical && <span className="text-danger">· critique</span>}
                      </label>
                      {keepHint && (
                        <label className="label flex cursor-pointer items-center gap-2 text-mute">
                          <input type="checkbox" name={`clear.${f.key}`} className="accent-[var(--color-brass)]" />
                          Effacer
                        </label>
                      )}
                    </div>
                    <FieldInput def={f} value={f.sensitive ? "" : values[f.key] ?? ""} keepHint={keepHint} />
                  </div>
                );
              })}
            </div>
          </FormPanel>
        ))}

        <FormPanel id="libres" index={String(sections.length + 1).padStart(2, "0")} title="Champs libres">
          <p className="-mt-1 mb-5 text-sm leading-relaxed text-mute">
            Tout ce que les rubriques ne prévoient pas. Les champs marqués « scellé » sont masqués et leur révélation est
            journalisée.
          </p>
          <ul className="space-y-3">
            {rows.map((row, i) => (
              <li key={row.key} className="grid grid-cols-1 gap-3 rounded-2xl border border-bone/10 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto_auto] md:items-center">
                <input type="hidden" name="custom.id" value={row.id} />
                <input
                  name="custom.label"
                  defaultValue={row.label}
                  placeholder="Intitulé"
                  aria-label="Intitulé du champ"
                  className={inputClass}
                  maxLength={80}
                />
                <input
                  name="custom.value"
                  defaultValue={row.sensitive ? "" : row.value}
                  placeholder={row.sensitive && row.hasValue ? "•••••• scellé — saisir pour remplacer" : "Valeur"}
                  aria-label="Valeur du champ"
                  className={inputClass}
                  autoComplete="off"
                />
                <label className="label flex cursor-pointer items-center gap-2 px-2 text-mute">
                  <input
                    type="checkbox"
                    name="custom.sensitive"
                    value={row.id || `new-${i}`}
                    defaultChecked={row.sensitive}
                    className="accent-[var(--color-brass)]"
                  />
                  Scellé
                </label>
                <button
                  type="button"
                  onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
                  className="justify-self-end rounded-full p-2 text-mute transition-colors hover:text-danger"
                  aria-label="Supprimer ce champ"
                >
                  <Icon name="close" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={addRow}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-dashed border-bone/25 px-4 py-2.5 text-sm text-bone/80 transition-colors hover:border-bone hover:text-bone"
          >
            <Icon name="plus" className="size-4" />
            Ajouter un champ
          </button>
        </FormPanel>

        <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-bone/10 bg-ink-2/90 px-5 py-4 backdrop-blur-xl">
          <p className={`text-sm ${state.error ? "text-danger" : "text-mute"}`} role={state.error ? "alert" : undefined}>
            {state.error ?? "À l'enregistrement, le profil complet est chiffré en AES-256-GCM."}
          </p>
          <div className="flex items-center gap-3">
            <Link href={cancelHref} className="inline-flex h-11 items-center rounded-full px-5 text-sm text-bone/70 hover:text-bone">
              Annuler
            </Link>
            <button
              disabled={pending}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-brass px-6 text-sm font-medium text-ink transition-transform hover:scale-[1.03] disabled:opacity-60"
            >
              <Icon name="lock" className="size-4" />
              {pending ? "Scellement…" : mode === "create" ? "Créer et sceller" : "Enregistrer et sceller"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

// Saisie adaptée au type du champ. Une valeur scellée n'est jamais pré-remplie : vide = inchangée.
function FieldInput({ def, value, keepHint }: { def: FieldDef; value: string; keepHint: boolean }) {
  const common = { id: `f-${def.key}`, name: `f.${def.key}`, defaultValue: value, autoComplete: "off" };
  const sealedHint = "•••••• scellé — saisir pour remplacer";

  if (def.type === "select" || def.type === "yesno") {
    return (
      <select {...common} className={`${inputClass} mt-2`}>
        <option value="">{keepHint ? "— inchangé (scellé) —" : "—"}</option>
        {def.options?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  if (def.type === "textarea") {
    return <textarea {...common} rows={4} placeholder={keepHint ? sealedHint : def.placeholder} className={`${inputClass} mt-2 h-auto resize-y py-3 leading-relaxed`} />;
  }
  const type = def.type === "date" ? "date" : def.type === "email" ? "email" : def.type === "tel" ? "tel" : def.type === "number" ? "number" : "text";
  return (
    <input
      {...common}
      type={type}
      min={def.type === "number" ? 0 : undefined}
      inputMode={def.type === "tel" ? "tel" : undefined}
      placeholder={keepHint ? sealedHint : def.placeholder}
      className={`${inputClass} mt-2 ${def.sensitive && def.type !== "date" ? "font-mono" : ""} [color-scheme:dark]`}
    />
  );
}

function FormPanel({ id, index, title, children }: { id: string; index: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 rounded-3xl border border-bone/10 bg-ink-2/70 p-6 md:p-8">
      <h2 className="mb-6 flex items-center gap-3 text-xl tracking-[-0.02em]">
        <span className="label text-brass">{index}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Input({
  label,
  error,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; name: string }) {
  const id = `i-${props.name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label text-mute">
        {label}
      </label>
      <input id={id} aria-invalid={!!error || undefined} className={`${inputClass} mt-2 aria-[invalid]:border-danger/70`} {...props} />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
