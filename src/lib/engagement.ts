import "server-only";
import { cookies } from "next/headers";
import { safeEqual, sign } from "./crypto";
import { ENGAGEMENT_COOKIE, ENGAGEMENT_TTL, HTTPS } from "./constants";

// L'engagement de confidentialité est signé une fois par appareil et reste valable 30 jours.
// Le cookie, signé côté serveur, contient le membre et l'échéance : il ne remplace ni le mot de passe ni le code.

export async function rememberEngagement(userId: string) {
  const until = Date.now() + ENGAGEMENT_TTL;
  const payload = `${userId}.${until}`;
  const jar = await cookies();
  jar.set(ENGAGEMENT_COOKIE, `${payload}.${sign(payload, "engagement")}`, {
    httpOnly: true,
    secure: HTTPS,
    sameSite: "strict",
    path: "/",
    maxAge: ENGAGEMENT_TTL / 1000,
  });
}

/** Échéance de l'engagement déjà signé sur cet appareil par ce membre, ou null. */
export async function rememberedEngagement(userId: string): Promise<number | null> {
  const raw = (await cookies()).get(ENGAGEMENT_COOKIE)?.value;
  if (!raw) return null;
  const [id, until, mac] = raw.split(".");
  if (id !== userId || !until || !mac || Number(until) < Date.now()) return null;
  return safeEqual(mac, sign(`${id}.${until}`, "engagement")) ? Number(until) : null;
}
