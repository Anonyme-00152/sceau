"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LineReveal } from "../motion";
import { SealMark } from "../SealMark";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), { ssr: false });

const POINTS = ["Chiffré AES-256-GCM", "Double clé", "Journal scellé"];

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i;

function canRender3D() {
  // ?3d force la scène, pour une démonstration sur une machine sans carte graphique.
  if (new URLSearchParams(window.location.search).has("3d")) return true;
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !SOFTWARE_RENDERER.test(renderer);
  } catch {
    return false;
  }
}

export function Hero() {
  const [mountScene, setMountScene] = useState(false);
  const [ready, setReady] = useState(false);

  // Le contenu s'affiche tout de suite ; la 3D se charge ensuite, quand le navigateur respire.
  // Sans vraie carte graphique (rendu logiciel), la 3D ralentirait toute la page : l'affiche statique reste.
  useEffect(() => {
    if (!canRender3D()) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => setMountScene(true), { timeout: 900 });
    else setTimeout(() => setMountScene(true), 200);
  }, []);

  return (
    <section id="top" className="grain relative h-[100svh] min-h-[640px] overflow-hidden bg-ink" aria-label="Introduction">
      {/* Fond : halo + mot-marque géant, derrière le cachet. */}
      <div aria-hidden className="absolute inset-0">
        <div className="absolute left-1/2 top-[44%] size-[120vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(203,163,92,0.16),transparent_62%)] md:left-[70%]" />
        <p className="display absolute inset-x-0 bottom-[-0.06em] select-none whitespace-nowrap text-center text-[32vw] text-bone/[0.07] md:text-[30vw]">
          Sceau
        </p>
      </div>

      {/* Affiche statique : visible immédiatement, puis relayée par la 3D. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-end justify-end transition-opacity duration-[1400ms] md:items-center md:pr-[13vw]"
        style={{ opacity: ready ? 0 : 1 }}
      >
        {/* Même placement que la 3D : en bas à droite et légèrement rogné sur mobile, à droite du titre sur grand écran. */}
        <div className="relative -mr-[14vw] mb-[9vh] size-[62vmin] md:m-0 md:size-[38vmin]">
          <SealMark className="size-full text-brass [--seal-inner:#4f3b18] drop-shadow-[0_30px_80px_rgba(203,163,92,0.25)]" />
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-[1400ms]"
        style={{ opacity: ready ? 1 : 0 }}
      >
        {mountScene && <HeroScene onReady={() => setReady(true)} />}
      </div>

      <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-[1600px] flex-col justify-between px-5 pb-7 pt-28 md:px-8 md:pt-32">
        <div className="max-w-[min(100%,58rem)]">
          <p className="label flex items-center gap-3 text-mute">
            <span className="h-px w-8 bg-brass" />
            Registre client confidentiel
          </p>
          <h1 className="mt-6 text-[clamp(2.7rem,6.6vw,7rem)] font-normal leading-[0.94] tracking-[-0.05em]">
            <LineReveal
              immediate
              delay={0.15}
              lines={[
                "Ce que vos clients",
                "vous confient",
                <span key="a" className="serif-accent pr-2 text-brass">
                  reste scellé.
                </span>,
              ]}
            />
          </h1>
          <p
            className="mt-7 max-w-md text-base leading-relaxed text-bone/70 opacity-0 md:text-lg"
            style={{ animation: "fade-up 1.2s var(--ease-expo) 0.75s forwards" }}
          >
            Un registre où chaque donnée est chiffrée, chaque accès nominatif, chaque consultation inscrite à jamais.
          </p>
          <div
            className="pointer-events-auto mt-9 flex flex-wrap gap-3 opacity-0"
            style={{ animation: "fade-up 1.2s var(--ease-expo) 0.9s forwards" }}
          >
            <Link
              href="/connexion"
              data-cursor="Entrer"
              className="group flex h-13 items-center gap-3 rounded-full bg-brass px-7 font-medium text-ink transition-transform duration-500 ease-[var(--ease-expo)] hover:scale-[1.03]"
            >
              Ouvrir la démonstration
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="/#manifeste"
              className="flex h-13 items-center rounded-full border border-bone/25 px-7 text-bone/90 transition-colors duration-300 hover:border-bone hover:text-bone"
            >
              Comprendre
            </Link>
          </div>
        </div>

        <div className="flex items-end justify-between gap-6">
          <ul className="hidden gap-8 md:flex">
            {POINTS.map((p, i) => (
              <li
                key={p}
                className="label flex items-center gap-2 text-bone/70 opacity-0"
                style={{ animation: `fade-up 1s var(--ease-expo) ${1.1 + i * 0.1}s forwards` }}
              >
                <span className="text-brass">+</span>
                {p}
              </li>
            ))}
          </ul>
          <p className="label flex items-center gap-3 text-bone/70">
            Défiler
            <span className="relative block h-8 w-px overflow-hidden bg-bone/15">
              <span className="absolute inset-x-0 top-0 h-1/2 bg-bone" style={{ animation: "scroll-hint 1.8s var(--ease-quart) infinite" }} />
            </span>
          </p>
        </div>
      </div>
      <style>{`
        @keyframes fade-up { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
        @keyframes scroll-hint { 0% { transform: translateY(-100%) } 100% { transform: translateY(200%) } }
      `}</style>
    </section>
  );
}
