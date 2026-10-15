export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 border-b border-bone/10 pb-8">
      <div className="min-w-0">
        <div className="label flex items-center gap-3 text-mute">{eyebrow}</div>
        <h1 className="mt-4 text-[clamp(2.2rem,4vw,3.6rem)] leading-[0.98] tracking-[-0.045em]">{title}</h1>
        {description && <p className="mt-3 max-w-2xl leading-relaxed text-bone/60">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-bone/10 bg-ink-2/70 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 border-b border-bone/10 px-6 py-4">
          {title && <h2 className="label text-mute">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export const buttonClass = {
  primary:
    "inline-flex h-11 items-center gap-2 rounded-full bg-bone px-5 text-sm font-medium text-ink transition-transform duration-300 hover:scale-[1.03]",
  ghost:
    "inline-flex h-11 items-center gap-2 rounded-full border border-bone/15 px-5 text-sm text-bone/85 transition-colors hover:border-bone hover:text-bone",
  brass: "inline-flex h-11 items-center gap-2 rounded-full bg-brass px-5 text-sm font-medium text-ink transition-transform duration-300 hover:scale-[1.03]",
};
