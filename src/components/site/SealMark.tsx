// Marque Sceau : un cachet de cire au bord irrégulier, percé d'une serrure.
// Le contour est calculé une fois, de façon déterministe.

function waxPath(cx: number, cy: number, r: number, points = 28) {
  let d = "";
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2;
    const wobble = 1 + 0.055 * Math.sin(a * 5 + 0.6) + 0.035 * Math.sin(a * 9 + 1.7) + 0.02 * Math.cos(a * 13);
    const x = cx + Math.cos(a) * r * wobble;
    const y = cy + Math.sin(a) * r * wobble;
    d += i === 0 ? `M${x.toFixed(2)} ${y.toFixed(2)}` : ` L${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d + " Z";
}

const OUTER = waxPath(16, 16, 14.2);

export function SealMark({ className = "", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path d={OUTER} fill="currentColor" />
      <circle cx="16" cy="16" r="9.6" fill="none" stroke="var(--seal-inner, #0b0b0c)" strokeWidth="1.1" opacity="0.9" />
      <path
        d="M16 10.6a2.9 2.9 0 0 1 1.55 5.35l1.05 5.15h-5.2l1.05-5.15A2.9 2.9 0 0 1 16 10.6z"
        fill="var(--seal-inner, #0b0b0c)"
      />
    </svg>
  );
}
