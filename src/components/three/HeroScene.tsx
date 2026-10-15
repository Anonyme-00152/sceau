"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { createSealBumpTexture, createSealGeometry } from "./sealGeometry";
import { Particles } from "./Particles";

type Shared = {
  pointerRef: React.RefObject<{ x: number; y: number }>;
  scrollRef: React.RefObject<number>;
  progressRef: React.RefObject<number>;
  reduced: boolean;
};

function Seal({ pointerRef, scrollRef, progressRef, reduced }: Shared) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  // Grand écran = 900 px CSS et plus, comme les points de rupture de la page (pas les unités 3D, qui varient avec la caméra).
  const wide = useThree((s) => s.size.width >= 900);

  const geometry = useMemo(() => createSealGeometry(), []);
  const bump = useMemo(() => createSealBumpTexture(), []);
  const materials = useMemo(() => {
    // Matrice de sceau en laiton : métal poli sur la face gravée, flanc légèrement plus mat.
    const face = new THREE.MeshPhysicalMaterial({
      color: "#c79a4e",
      metalness: 1,
      roughness: 0.3,
      clearcoat: 0.35,
      clearcoatRoughness: 0.2,
      bumpMap: bump,
      bumpScale: 3.2,
    });
    const side = new THREE.MeshPhysicalMaterial({
      color: "#a87d3a",
      metalness: 1,
      roughness: 0.38,
      clearcoat: 0.25,
      clearcoatRoughness: 0.3,
    });
    return [face, side];
  }, [bump]);

  useEffect(
    () => () => {
      geometry.dispose();
      bump.dispose();
      materials.forEach((m) => m.dispose());
    },
    [geometry, bump, materials],
  );

  const baseScale = wide ? 1.05 : 0.72;

  useFrame((state, delta) => {
    const g = group.current;
    const m = mesh.current;
    if (!g || !m) return;
    const s = scrollRef.current ?? 0;
    const p = pointerRef.current ?? { x: 0, y: 0 };
    const t = reduced ? 0 : state.clock.elapsedTime;
    const intro = progressRef.current ?? 1;
    const k = 1 - Math.pow(0.0015, delta);

    // Inclinaison vers le pointeur + lente respiration.
    m.rotation.y += (p.x * 0.45 + Math.sin(t * 0.35) * 0.12 - m.rotation.y) * k;
    m.rotation.x += (-p.y * 0.3 + s * 0.9 + Math.cos(t * 0.3) * 0.06 - m.rotation.x) * k;
    m.rotation.z = Math.sin(t * 0.2) * 0.04;

    // Apparition : léger « coup de tampon » à la fin de l'intro.
    const thump = intro < 1 ? 1 : 1 + Math.max(0, Math.sin(Math.min((t - 2.6) * 6, Math.PI))) * 0.035;
    const appear = THREE.MathUtils.smoothstep(intro, 0.15, 0.9);
    const scale = baseScale * (0.6 + 0.4 * appear) * thump * (1 - s * 0.12);
    g.scale.setScalar(scale);
  });

  return (
    <group ref={group}>
      <mesh ref={mesh} geometry={geometry} material={materials} castShadow />
    </group>
  );
}

// Point d'ancrage commun au cachet et à son anneau de particules :
// l'orbite tourne autour du cachet, où qu'il soit placé.
function Anchor({ scrollRef, reduced, children }: Pick<Shared, "scrollRef" | "reduced"> & { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const viewport = useThree((s) => s.viewport);
  const wide = useThree((s) => s.size.width >= 900);
  // Grand écran : à droite du titre. Petit écran : en bas à droite, sous les boutons, légèrement rogné.
  const baseX = wide ? viewport.width * 0.22 : viewport.width * 0.27;
  const baseY = wide ? -0.15 : -viewport.height * 0.34;

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const s = scrollRef.current ?? 0;
    const t = reduced ? 0 : state.clock.elapsedTime;
    g.position.x = baseX - s * baseX * 0.4;
    g.position.y = baseY + s * 1.4 + Math.sin(t * 0.6) * 0.04;
  });

  return (
    <group ref={group}>
      {children}
    </group>
  );
}

// Sur petit écran, l'anneau suit la taille réduite du cachet.
function Orbit({ children }: { children: React.ReactNode }) {
  const wide = useThree((s) => s.size.width >= 900);
  return <group scale={wide ? 1 : 0.7}>{children}</group>;
}

function Rig({ pointerRef, scrollRef }: Pick<Shared, "pointerRef" | "scrollRef">) {
  useFrame((state, delta) => {
    const p = pointerRef.current ?? { x: 0, y: 0 };
    const s = scrollRef.current ?? 0;
    const k = 1 - Math.pow(0.02, delta);
    state.camera.position.x += (p.x * 0.35 - state.camera.position.x) * k;
    state.camera.position.y += (p.y * 0.2 - state.camera.position.y) * k;
    state.camera.position.z = 7.5 + s * 1.2;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

function Intro({ progressRef, reduced }: Pick<Shared, "progressRef" | "reduced">) {
  const start = useRef<number | null>(null);
  useFrame((state) => {
    if (reduced) {
      progressRef.current = 1;
      return;
    }
    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = (state.clock.elapsedTime - start.current) / 2.8;
    progressRef.current = Math.min(1, 1 - Math.pow(1 - Math.min(t, 1), 3));
  });
  return null;
}

export default function HeroScene({ onReady }: { onReady?: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const scroll = useRef(0);
  const progress = useRef(0);
  const [visible, setVisible] = useState(true);
  const [dpr, setDpr] = useState(1.5);
  const [reduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [count] = useState(() => {
    if (typeof window === "undefined") return 3000;
    const small = window.innerWidth < 768;
    const cores = navigator.hardwareConcurrency || 4;
    return small || cores <= 4 ? 1800 : 4200;
  });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onScroll = () => {
      scroll.current = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.9)));
    };
    onScroll();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    // Hors champ, la scène cesse de dessiner : zéro coût GPU en bas de page.
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 });
    if (container.current) io.observe(container.current);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <div ref={container} className="absolute inset-0">
      <Canvas
        frameloop={visible ? "always" : "never"}
        dpr={[1, dpr]}
        camera={{ position: [0, 0, 7.5], fov: 30, near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ pointerEvents: "none" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          requestAnimationFrame(() => onReady?.());
        }}
        aria-hidden
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.75)} />
        <ambientLight intensity={0.18} />
        <directionalLight position={[-4, 5, 6]} intensity={2.4} color="#fff3e6" />
        <directionalLight position={[5, -2, -4]} intensity={2.6} color="#f2c17a" />
        <pointLight position={[0, 0, 4]} intensity={6} distance={9} color="#fff0d6" />
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={3} position={[0, 4, 3]} scale={[8, 1.4, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={1.6} position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} color="#fff1dc" />
          <Lightformer form="ring" intensity={4} position={[4, 1, -3]} scale={2.5} color="#ffd8a0" />
          <Lightformer form="rect" intensity={0.8} position={[0, -4, 1]} scale={[10, 1, 1]} color="#8a8a90" />
        </Environment>
        <Intro progressRef={progress} reduced={reduced} />
        <Rig pointerRef={pointer} scrollRef={scroll} />
        <Anchor scrollRef={scroll} reduced={reduced}>
          <Seal pointerRef={pointer} scrollRef={scroll} progressRef={progress} reduced={reduced} />
          <Orbit>
            <Particles count={count} progressRef={progress} scrollRef={scroll} reduced={reduced} />
          </Orbit>
        </Anchor>
      </Canvas>
    </div>
  );
}
