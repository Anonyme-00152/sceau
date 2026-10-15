"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uSpin;
  attribute vec3 aScatter;
  attribute vec3 aOrbit;
  attribute float aSeed;
  varying float vAlpha;
  varying float vAccent;

  vec3 rotateY(vec3 p, float a) {
    float c = cos(a), s = sin(a);
    return vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
  }

  void main() {
    // Chaque particule converge à son rythme : la nuée se resserre de l'extérieur vers l'anneau.
    float p = smoothstep(0.0, 1.0, clamp(uProgress * 1.6 - aSeed * 0.6, 0.0, 1.0));

    vec3 scatter = aScatter + vec3(
      sin(uTime * 0.21 + aSeed * 31.0),
      cos(uTime * 0.17 + aSeed * 17.0),
      sin(uTime * 0.13 + aSeed * 11.0)
    ) * 0.22;

    float speed = 0.12 + aSeed * 0.22;
    vec3 orbit = rotateY(aOrbit, uTime * speed * uSpin);
    // Anneau incliné vers la caméra.
    float tilt = -0.42;
    orbit = vec3(orbit.x, orbit.y * cos(tilt) - orbit.z * sin(tilt), orbit.y * sin(tilt) + orbit.z * cos(tilt));

    vec3 pos = mix(scatter, orbit, p);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (0.45 + aSeed * 0.9) / -mv.z;

    vAlpha = (0.25 + 0.75 * fract(aSeed * 7.13)) * (0.55 + 0.45 * p);
    vAccent = step(0.94, fract(aSeed * 3.71));
  }
`;

const fragment = /* glsl */ `
  varying float vAlpha;
  varying float vAccent;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d);
    vec3 bone = vec3(0.93, 0.92, 0.89);
    vec3 brass = vec3(0.86, 0.69, 0.4);
    gl_FragColor = vec4(mix(bone, brass, vAccent), a * vAlpha);
  }
`;

// Positions calculées une fois, de façon déterministe : la nuée est identique à chaque visite.
function buildGeometry(count: number) {
  let s = 42;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const scatter = new Float32Array(count * 3);
  const orbit = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // Nuée : coquille épaisse, aplatie en profondeur pour rester dans le cadre.
    const u = r() * 2 - 1;
    const t = r() * Math.PI * 2;
    const rad = 2.6 + Math.pow(r(), 0.7) * 5.2;
    const k = Math.sqrt(1 - u * u);
    scatter[i * 3] = Math.cos(t) * k * rad * 1.35;
    scatter[i * 3 + 1] = u * rad * 0.75;
    scatter[i * 3 + 2] = Math.sin(t) * k * rad * 0.6 - 1.2;

    // Anneau : plusieurs bandes, densité plus forte près du cachet.
    const band = r();
    const ringR = band < 0.55 ? 1.55 + r() * 0.35 : band < 0.85 ? 2.02 + r() * 0.22 : 2.38 + r() * 0.36;
    const a = r() * Math.PI * 2;
    orbit[i * 3] = Math.cos(a) * ringR;
    orbit[i * 3 + 1] = (r() - 0.5) * 0.06 * ringR;
    orbit[i * 3 + 2] = Math.sin(a) * ringR;

    seeds[i] = r();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
  g.setAttribute("aOrbit", new THREE.BufferAttribute(orbit, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);
  return g;
}

export function Particles({
  count,
  progressRef,
  scrollRef,
  reduced,
}: {
  count: number;
  progressRef: React.RefObject<number>;
  scrollRef: React.RefObject<number>;
  reduced: boolean;
}) {
  const dpr = useThree((s) => s.viewport.dpr);
  const material = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => buildGeometry(count), [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uSize: { value: 26 },
      uPixelRatio: { value: 1 },
      uSpin: { value: 1 },
    }),
    [],
  );

  useFrame((_, delta) => {
    const m = material.current;
    if (!m) return;
    if (!reduced) m.uniforms.uTime.value += delta;
    m.uniforms.uProgress.value = progressRef.current ?? 1;
    m.uniforms.uPixelRatio.value = dpr;
    m.uniforms.uSpin.value = 1 + (scrollRef.current ?? 0) * 2.5;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
