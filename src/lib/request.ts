import "server-only";
import { headers } from "next/headers";

export async function requestInfo() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const raw = forwarded || h.get("x-real-ip") || "127.0.0.1";
  // Boucle locale IPv6 et adresses IPv4 encapsulées : affichées sous leur forme habituelle.
  const ip = raw === "::1" ? "127.0.0.1" : raw.replace(/^::ffff:/, "");
  const userAgent = (h.get("user-agent") ?? "inconnu").slice(0, 240);
  return { ip, userAgent };
}

/** Résumé lisible d'un user-agent pour l'affichage des sessions. */
export function describeAgent(ua: string | null): string {
  if (!ua) return "Appareil inconnu";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Navigateur";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "OS inconnu";
  return `${browser} · ${os}`;
}
