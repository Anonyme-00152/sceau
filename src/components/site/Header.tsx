"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SealMark } from "./SealMark";
import { SoundToggle, useSound } from "./sound";
import { MenuOverlay } from "./MenuOverlay";

export const NAV = [
  { href: "/#manifeste", label: "Manifeste" },
  { href: "/#verrous", label: "Verrous" },
  { href: "/#espace", label: "L'espace" },
  { href: "/securite", label: "Sécurité" },
];

export function Header() {
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const { play } = useSound();

  // L'en-tête s'efface quand on descend et revient dès qu'on remonte.
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 6) return;
      setHidden(y > last && y > 160);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggle = () => {
    play(open ? "close" : "open");
    setOpen((v) => !v);
  };

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 text-bone mix-blend-difference transition-transform duration-700 ease-[var(--ease-expo)]"
        style={{ transform: hidden && !open ? "translateY(-110%)" : "none" }}
      >
        <div className="mx-auto flex h-20 items-center justify-between gap-6 px-5 md:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Sceau, accueil" data-cursor="Accueil">
            <SealMark className="size-7 [--seal-inner:#0b0b0c]" />
            <span className="text-[1.35rem] font-medium tracking-[-0.03em]">Sceau</span>
          </Link>

          <nav aria-label="Navigation principale" className="hidden items-center gap-8 lg:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="group relative label py-2">
                {item.label}
                <span className="absolute inset-x-0 -bottom-0.5 h-px origin-right scale-x-0 bg-current transition-transform duration-500 ease-[var(--ease-expo)] group-hover:origin-left group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 md:gap-5">
            <SoundToggle />
            <Link
              href="/connexion"
              className="hidden h-10 items-center gap-2 rounded-full bg-bone px-5 text-sm font-medium text-ink transition-transform duration-500 ease-[var(--ease-expo)] hover:scale-[1.04] sm:flex"
            >
              Entrer
              <span aria-hidden>↗</span>
            </Link>
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-controls="menu-principal"
              aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
              className="relative flex size-10 items-center justify-center rounded-full border border-bone/40 transition-colors hover:border-bone"
            >
              <span
                className="absolute h-px w-4 bg-bone transition-transform duration-500 ease-[var(--ease-expo)]"
                style={{ transform: open ? "rotate(45deg)" : "translateY(-3px)" }}
              />
              <span
                className="absolute h-px w-4 bg-bone transition-transform duration-500 ease-[var(--ease-expo)]"
                style={{ transform: open ? "rotate(-45deg)" : "translateY(3px)" }}
              />
            </button>
          </div>
        </div>
      </header>
      <MenuOverlay open={open} onClose={() => { play("close"); setOpen(false); }} />
    </>
  );
}
