"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/lib/auth-actions";
import { ROLE_LABEL } from "@/lib/fields";
import type { Role } from "@/lib/db/schema";
import { SealMark } from "@/components/site/SealMark";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Badge";
import { ElevationProvider, useElevation } from "./Elevation";
import { IdleLockProvider, useIdleLock } from "./IdleLock";
import { BLUR_PREF, PrivacyBlur, Watermark } from "./Watermark";
import { usePref } from "@/lib/client-store";
import { CommandPalette, type PaletteClient } from "./CommandPalette";

type ShellUser = { name: string; email: string; role: Role; title: string };

const NAV: { href: string; label: string; icon: IconName; exact?: boolean; directionOnly?: boolean }[] = [
  { href: "/espace", label: "Tableau de bord", icon: "home", exact: true },
  { href: "/espace/clients", label: "Dossiers", icon: "folder" },
  { href: "/espace/journal", label: "Journal scellé", icon: "journal" },
  { href: "/espace/equipe", label: "Équipe & sessions", icon: "team" },
  { href: "/espace/compte", label: "Mon compte", icon: "user" },
  { href: "/espace/parametres", label: "Paramètres", icon: "settings", directionOnly: true },
];

export function AppShell({
  children,
  user,
  sessionTag,
  elevatedUntil,
  lockAfter,
  clients,
  canCreate,
  demoEmail,
}: {
  children: React.ReactNode;
  user: ShellUser;
  sessionTag: string;
  elevatedUntil: number | null;
  lockAfter: number;
  clients: PaletteClient[];
  canCreate: boolean;
  demoEmail: string | null;
}) {
  const [mobileNav, setMobileNav] = useState(false);
  const pathname = usePathname();
  // Changer de page referme la navigation mobile (état dérivé, sans effet).
  const [navPath, setNavPath] = useState(pathname);
  if (navPath !== pathname) {
    setNavPath(pathname);
    setMobileNav(false);
  }

  return (
    <IdleLockProvider after={lockAfter}>
      <ElevationProvider initialUntil={elevatedUntil} demoEmail={demoEmail}>
        <div className="min-h-dvh bg-ink text-bone lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
          <Sidebar user={user} open={mobileNav} onClose={() => setMobileNav(false)} />
          <div className="flex min-w-0 flex-col">
            <Topbar onMenu={() => setMobileNav(true)} />
            <main id="contenu" className="flex-1 px-5 pb-16 pt-6 md:px-10 md:pt-8">
              {children}
            </main>
          </div>
        </div>
        <CommandPalette clients={clients} canCreate={canCreate} />
        <Watermark name={user.name} sessionTag={sessionTag} />
        <PrivacyBlur />
      </ElevationProvider>
    </IdleLockProvider>
  );
}

function Sidebar({ user, open, onClose }: { user: ShellUser; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { remaining, total, lockNow } = useIdleLock();
  const [blur, setBlur] = usePref(BLUR_PREF, true);
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-bone/10 bg-ink-2 transition-transform duration-500 ease-[var(--ease-expo)] lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navigation de l'espace"
      >
        <div className="flex h-[72px] items-center justify-between px-5">
          <Link href="/espace" className="flex items-center gap-2.5">
            <SealMark className="size-7 text-brass [--seal-inner:#111113]" />
            <span className="text-[1.3rem] font-medium tracking-[-0.03em]">Sceau</span>
          </Link>
          <span className="label rounded-full border border-moss/30 px-2 py-1 text-moss">Protégé</span>
        </div>

        <nav className="mt-2 flex-1 px-3">
          <p className="label px-3 pb-3 pt-4 text-mute">Espace</p>
          <ul className="space-y-0.5">
            {NAV.filter((item) => !item.directionOnly || user.role === "direction").map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.94rem] transition-colors ${
                      active ? "bg-bone/[0.07] text-bone" : "text-bone/60 hover:bg-bone/[0.04] hover:text-bone"
                    }`}
                  >
                    {active && <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brass" />}
                    <Icon name={item.icon} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="label px-3 pb-3 pt-8 text-mute">Protection</p>
          <ElevationStatus />
          <label className="mt-1 flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-[0.94rem] text-bone/60 hover:bg-bone/[0.04]">
            <span className="flex items-center gap-3">
              <Icon name="eyeOff" />
              Flou hors focus
            </span>
            <input
              type="checkbox"
              checked={blur}
              onChange={(e) => setBlur(e.target.checked)}
              className="peer sr-only"
            />
            <span className="relative h-5 w-9 rounded-full bg-bone/15 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-bone after:transition-transform peer-checked:bg-moss/70 peer-checked:after:translate-x-4 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brass" />
          </label>
        </nav>

        <div className="space-y-3 p-3">
          <div className="rounded-2xl border border-bone/10 p-4">
            <div className="flex items-center justify-between">
              <p className="label text-mute">Verrou auto</p>
              <p className={`font-mono text-xs tabular-nums ${remaining < 60_000 ? "text-danger" : "text-bone/70"}`}>
                {minutes}:{String(seconds).padStart(2, "0")}
              </p>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-bone/10">
              <div
                className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${remaining < 60_000 ? "bg-danger" : "bg-bone/60"}`}
                style={{ width: `${(remaining / total) * 100}%` }}
              />
            </div>
            <button
              type="button"
              onClick={lockNow}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-bone/15 py-2 text-sm text-bone/80 transition-colors hover:border-bone hover:text-bone"
            >
              <Icon name="lock" className="size-4" />
              Verrouiller maintenant
            </button>
          </div>
          <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
            <Avatar name={user.name} className="size-9 text-xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-bone">{user.name}</p>
              <p className="label mt-1 text-mute">{ROLE_LABEL[user.role]}</p>
            </div>
            <form action={logoutAction}>
              <button className="rounded-full p-2 text-mute transition-colors hover:bg-bone/[0.06] hover:text-bone" aria-label="Se déconnecter" title="Se déconnecter">
                <Icon name="logout" />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}

function ElevationStatus() {
  const { until } = useElevation();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = until ? Math.max(0, until - now) : 0;
  return (
    <div className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[0.94rem]">
      <span className={`flex items-center gap-3 ${left ? "text-steel" : "text-bone/60"}`}>
        <Icon name="key" />
        Accès renforcé
      </span>
      <span className={`font-mono text-xs tabular-nums ${left ? "text-steel" : "text-mute"}`}>
        {left ? `${Math.floor(left / 60_000)}:${String(Math.floor((left % 60_000) / 1000)).padStart(2, "0")}` : "inactif"}
      </span>
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-bone/10 bg-ink/80 px-5 backdrop-blur-xl md:px-10">
      <button type="button" onClick={onMenu} className="-ml-2 rounded-full p-2 text-bone/80 lg:hidden" aria-label="Ouvrir la navigation">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M4 8h16M4 16h16" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("sceau:palette"))}
        className="flex h-11 w-full max-w-md items-center gap-3 rounded-full border border-bone/10 bg-ink-2 px-4 text-left text-sm text-mute transition-colors hover:border-bone/25"
      >
        <Icon name="search" className="size-4" />
        <span className="flex-1">Rechercher un dossier…</span>
        <kbd className="label hidden rounded-md border border-bone/15 px-1.5 py-0.5 sm:inline">Ctrl K</kbd>
      </button>
      <div className="ml-auto hidden items-center gap-2 md:flex">
        <span className="label flex items-center gap-2 rounded-full border border-bone/10 px-3 py-2 text-mute">
          <Icon name="fingerprint" className="size-3.5" />
          Filigrane actif
        </span>
        <span className="label flex items-center gap-2 rounded-full border border-bone/10 px-3 py-2 text-mute">
          <span className="size-1.5 rounded-full bg-moss" />
          Chiffrement au repos
        </span>
      </div>
    </header>
  );
}
