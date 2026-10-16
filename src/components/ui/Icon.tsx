// Jeu d'icônes au trait, dessiné pour Sceau (grille 24, trait 1.5).
const PATHS = {
  home: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z",
  folder: "M3.5 6.5A1.5 1.5 0 0 1 5 5h4.2l2 2H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z",
  journal: "M6 3.5h10.5L19 6v14.5H6zM9 9h7M9 12.5h7M9 16h4.5",
  user: "M12 11.5a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5zM4.5 20.5a7.5 7.5 0 0 1 15 0",
  team: "M9 11a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 9 11zm-6 8.5a6 6 0 0 1 12 0M16 4.75a3.25 3.25 0 0 1 0 6.25M18 13.6a6 6 0 0 1 3 5.9",
  lock: "M6.5 10.5V8a5.5 5.5 0 0 1 11 0v2.5M5 10.5h14v10H5zM12 14.5v2.5",
  unlock: "M6.5 10.5V8a5.5 5.5 0 0 1 10.6-2M5 10.5h14v10H5zM12 14.5v2.5",
  logout: "M14.5 4.5H19v15h-4.5M10 8l-4 4 4 4M6 12h10",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20",
  plus: "M12 5v14M5 12h14",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 14.75a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5z",
  eyeOff: "M3 3l18 18M10.6 5.6A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.7M6.6 6.6C4 8.3 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4-.9M9.9 9.9a2.75 2.75 0 0 0 3.9 3.9",
  copy: "M8.5 8.5h11v11h-11zM15.5 8.5v-4h-11v11h4",
  shield: "M12 3.5 19 6v6c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V6z",
  check: "M5 12.5 10 17.5 19.5 7",
  edit: "M4 20h4.5L19.5 9 15 4.5 4 15.5zM13 6.5l4.5 4.5",
  arrowLeft: "M19 12H5M11 6l-6 6 6 6",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  key: "M14.5 9.5a4.5 4.5 0 1 1-1.3-3.2M14.5 9.5 21 16v3.5h-3.5v-2h-2v-2h-2l-.8-.8M9.5 10a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z",
  calendar: "M4.5 6h15v14h-15zM4.5 10h15M8.5 3.5V7M15.5 3.5V7",
  mail: "M3.5 6h17v12h-17zM3.5 6.5 12 13l8.5-6.5",
  note: "M5 4h14v11l-5 5H5zM14 20v-5h5",
  close: "M6 6l12 12M18 6 6 18",
  chain: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  fingerprint: "M7 10a5 5 0 0 1 10 0v2.5M12 10v4.5a5 5 0 0 0 2 4M9.5 19.5A8 8 0 0 1 7 13.5V12M17 15.5a8 8 0 0 1-.6 2.5M4.5 8a8.5 8.5 0 0 1 15 0",
  filter: "M4 6h16M7 12h10M10 18h4",
  device: "M4 5.5h16v10H4zM2.5 19h19M9 15.5 8.5 19M15 15.5l.5 3.5",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13a7.5 7.5 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.5 7.5 0 0 0-1.7 1l-2.3-.9-2 3.4 2 1.5a7.5 7.5 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9a7.5 7.5 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 1.7-1l2.3.9 2-3.4z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "size-[18px]", label }: { name: IconName; className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
