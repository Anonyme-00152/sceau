import * as THREE from "three";

// Contour de cire : un cercle déformé par quelques harmoniques, comme une goutte écrasée.
export function waxRadius(a: number) {
  return (
    1 +
    0.055 * Math.sin(a * 5 + 0.6) +
    0.035 * Math.sin(a * 9 + 1.7) +
    0.022 * Math.cos(a * 13 + 0.3) +
    0.012 * Math.sin(a * 23 + 2.1)
  );
}

export function createSealGeometry() {
  const shape = new THREE.Shape();
  const steps = 220;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = waxRadius(a);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    steps: 1,
    curveSegments: 1,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.11,
    bevelOffset: -0.02,
    bevelSegments: 14,
  });
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

// Relief du cachet, dessiné sur un canvas puis utilisé comme carte de relief (bump map).
// Clair = en relief, sombre = en creux.
export function createSealBumpTexture(size = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  // L'échelle UV de l'extrusion couvre environ [-1.25, 1.25] : 1 unité = size / 2.5 pixels.
  const unit = size / 2.5;

  ctx.fillStyle = "rgb(128,128,128)";
  ctx.fillRect(0, 0, size, size);
  ctx.filter = "blur(3px)";

  // Bourrelet périphérique, légèrement irrégulier.
  ctx.strokeStyle = "rgb(205,205,205)";
  ctx.lineWidth = unit * 0.07;
  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const a = (i / 200) * Math.PI * 2;
    const r = waxRadius(a) * unit * 0.82;
    const x = c + Math.cos(a) * r;
    const y = c + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  // Anneau intérieur net.
  ctx.strokeStyle = "rgb(190,190,190)";
  ctx.lineWidth = unit * 0.022;
  ctx.beginPath();
  ctx.arc(c, c, unit * 0.6, 0, Math.PI * 2);
  ctx.stroke();

  // Inscription circulaire.
  const text = "CONFIDENTIEL · SCELLÉ · CLOISONNÉ · TRACÉ · ";
  ctx.fillStyle = "rgb(200,200,200)";
  ctx.font = `600 ${Math.round(unit * 0.085)}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const radius = unit * 0.7;
  const chars = [...text];
  chars.forEach((ch, i) => {
    const a = (i / chars.length) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.translate(c + Math.cos(a) * radius, c + Math.sin(a) * radius);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });

  // Serrure centrale, en creux.
  ctx.fillStyle = "rgb(40,40,40)";
  const k = unit * 0.2;
  ctx.beginPath();
  ctx.arc(c, c - k * 0.55, k * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(c - k * 0.32, c - k * 0.2);
  ctx.lineTo(c + k * 0.32, c - k * 0.2);
  ctx.lineTo(c + k * 0.55, c + k * 1.35);
  ctx.lineTo(c - k * 0.55, c + k * 1.35);
  ctx.closePath();
  ctx.fill();

  // Fines craquelures de cire.
  ctx.filter = "blur(1px)";
  ctx.strokeStyle = "rgba(90,90,90,0.55)";
  ctx.lineWidth = 1.2;
  let s = 7;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const r0 = unit * (0.86 + r() * 0.12);
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
    ctx.lineTo(c + Math.cos(a + (r() - 0.5) * 0.08) * (r0 + unit * 0.12), c + Math.sin(a + (r() - 0.5) * 0.08) * (r0 + unit * 0.12));
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.repeat.set(1 / 2.5, 1 / 2.5);
  texture.offset.set(0.5, 0.5);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}
