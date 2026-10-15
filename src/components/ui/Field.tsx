import { useId } from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string };

export function Field({ label, hint, error, className = "", id, ...props }: Props) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="label mb-2 flex items-center justify-between text-mute">
        {label}
        {hint && <span className="normal-case tracking-normal text-mute/80">{hint}</span>}
      </label>
      <input
        id={inputId}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${inputId}-err` : undefined}
        className="h-13 w-full rounded-xl border border-bone/15 bg-ink-2 px-4 text-bone outline-none transition-colors placeholder:text-mute/60 hover:border-bone/30 focus:border-bone aria-[invalid]:border-danger/70"
        {...props}
      />
      {error && (
        <p id={`${inputId}-err`} className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({
  children,
  pending,
  className = "",
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean; variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-bone text-ink hover:bg-white",
    ghost: "border border-bone/20 text-bone hover:border-bone",
    danger: "bg-danger text-ink hover:brightness-110",
  }[variant];
  return (
    <button
      disabled={pending || props.disabled}
      className={`relative flex h-13 items-center justify-center gap-2 rounded-full px-6 font-medium transition-all duration-300 disabled:opacity-60 ${styles} ${className}`}
      {...props}
    >
      <span className={pending ? "opacity-0" : undefined}>{children}</span>
      {pending && (
        <span className="absolute inset-0 flex items-center justify-center" aria-label="Chargement">
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </span>
      )}
    </button>
  );
}
