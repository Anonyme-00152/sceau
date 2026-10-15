import { SENSITIVITY_LABEL, STATUS_LABEL } from "@/lib/fields";
import type { ClientStatus, Sensitivity } from "@/lib/db/schema";

export function SensitivityBadge({ level, className = "" }: { level: Sensitivity; className?: string }) {
  const tone = {
    standard: "border-bone/20 text-bone/75",
    restreint: "border-steel/45 text-steel",
    secret: "border-danger/55 text-danger",
  }[level];
  return (
    <span className={`label inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${tone} ${className}`}>
      <span className="flex gap-[2px]" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-[3px] rounded-full bg-current"
            style={{ opacity: i <= ["standard", "restreint", "secret"].indexOf(level) ? 1 : 0.2 }}
          />
        ))}
      </span>
      {SENSITIVITY_LABEL[level]}
    </span>
  );
}

export function StatusBadge({ status }: { status: ClientStatus }) {
  const dot = { actif: "bg-moss", prospect: "bg-steel", "en-pause": "bg-mute", archive: "bg-mute-2" }[status];
  return (
    <span className="inline-flex items-center gap-2 text-sm text-bone/75">
      <span className={`size-1.5 rounded-full ${dot}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Avatar({ name, className = "size-8 text-xs" }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  // Teinte stable dérivée du nom, dans une gamme sourde.
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium text-bone ${className}`}
      style={{ backgroundColor: `hsl(${h} 12% 22%)` }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
