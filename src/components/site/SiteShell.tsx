"use client";

import { SmoothScroll } from "./SmoothScroll";
import { SoundProvider } from "./sound";
import { Cursor } from "./Cursor";
import { Header } from "./Header";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <SoundProvider>
      <SmoothScroll>
        <a
          href="#contenu"
          className="label fixed left-4 top-4 z-[60] -translate-y-24 rounded-full bg-brass px-4 py-3 text-ink transition-transform focus:translate-y-0"
        >
          Aller au contenu
        </a>
        <Header />
        <Cursor />
        {children}
      </SmoothScroll>
    </SoundProvider>
  );
}
