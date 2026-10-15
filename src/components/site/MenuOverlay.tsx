"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useLenis } from "./SmoothScroll";

const LINKS = [
  { href: "/", label: "Accueil", index: "00" },
  { href: "/#manifeste", label: "Manifeste", index: "01" },
  { href: "/#verrous", label: "Verrous", index: "02" },
  { href: "/securite", label: "Sécurité", index: "03" },
  { href: "/connexion", label: "Entrer", index: "04", accent: true },
];

export function MenuOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lenis = useLenis();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    lenis?.stop();
    const first = panel.current?.querySelector<HTMLElement>("a");
    first?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const items = [...panel.current.querySelectorAll<HTMLElement>("a, button")];
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      lenis?.start();
    };
  }, [open, onClose, lenis]);

  return (
    <div
      id="menu-principal"
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      aria-hidden={!open}
      inert={!open}
      className="grain fixed inset-0 z-40 flex flex-col bg-ink-2 text-bone transition-[clip-path] duration-[900ms] ease-[var(--ease-quart)]"
      style={{ clipPath: open ? "inset(0 0 0 0)" : "inset(0 0 100% 0)" }}
    >
      <nav aria-label="Menu" className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-center px-5 pt-24 md:px-8">
        <ul className="flex flex-col">
          {LINKS.map((link, i) => (
            <li key={link.href} className="overflow-hidden border-b border-bone/10 first:border-t">
              <Link
                href={link.href}
                onClick={onClose}
                className="group flex items-baseline justify-between gap-6 py-3 md:py-4"
                style={{
                  transform: open ? "none" : "translateY(100%)",
                  transition: `transform 900ms var(--ease-expo) ${open ? 180 + i * 70 : 0}ms`,
                }}
              >
                <span className="flex items-baseline gap-5 md:gap-8">
                  <span className="label text-mute">{link.index}</span>
                  <span
                    className={`display text-[clamp(3.2rem,11vw,9.5rem)] transition-[color,letter-spacing] duration-500 group-hover:tracking-[0.01em] ${
                      link.accent ? "text-brass" : "group-hover:text-brass"
                    }`}
                  >
                    {link.label}
                  </span>
                </span>
                <span aria-hidden className="text-3xl opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100 md:-translate-x-6 md:text-5xl">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-end justify-between gap-4 px-5 pb-8 text-mute md:px-8">
        <p className="label">Registre client confidentiel — Projet portfolio</p>
        <p className="label">Données de démonstration fictives</p>
      </div>
    </div>
  );
}
