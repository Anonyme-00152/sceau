import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { desc, eq, gt } from "drizzle-orm";
import { db, schema } from "./db";
import { randomToken, sha256 } from "./crypto";
import { requestInfo } from "./request";
import { HTTPS, MFA_WINDOW, SERVER_IDLE_TIMEOUT, SESSION_COOKIE, SESSION_TTL } from "./constants";
import type { Session, User } from "./db/schema";

export type Current = { session: Session; user: User };

export async function createSession(userId: string) {
  const token = randomToken();
  const now = Date.now();
  const { ip, userAgent } = await requestInfo();
  await db.insert(schema.sessions).values({
    id: sha256(token),
    userId,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: now + SESSION_TTL,
    ip,
    userAgent,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Cookie « Secure » dès que Sceau est servi en HTTPS ; en local (http://localhost) il reste httpOnly + SameSite strict.
    secure: HTTPS,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL / 1000,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Session courante, validée (expiration absolue, inactivité, fenêtre double facteur). */
export const getCurrent = cache(async (): Promise<Current | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const id = sha256(token);
  const rows = await db
    .select({ session: schema.sessions, user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const now = Date.now();
  const { session } = row;
  const expired =
    row.user.status !== "actif" ||
    session.expiresAt < now ||
    now - session.lastSeenAt > SERVER_IDLE_TIMEOUT ||
    (!session.mfaAt && now - session.createdAt > MFA_WINDOW);
  if (expired) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
    return null;
  }

  if (now - session.lastSeenAt > 30_000) {
    await db.update(schema.sessions).set({ lastSeenAt: now }).where(eq(schema.sessions.id, id));
    session.lastSeenAt = now;
  }
  return row;
});

/**
 * Garde de l'espace privé. Chaque page et chaque action l'appelle :
 * les layouts et les pages se rendent en parallèle, la garde ne peut pas vivre que dans le layout.
 */
export async function requireAccess(): Promise<Current> {
  const current = await getCurrent();
  if (!current) redirect("/connexion");
  if (!current.session.mfaAt) redirect("/connexion");
  if (!current.session.ndaAt) redirect("/engagement");
  if (current.session.lockedAt) redirect("/verrou");
  return current;
}

export function isElevated(session: Session) {
  return !!session.elevatedUntil && session.elevatedUntil > Date.now();
}

/** Échéance de l'accès renforcé, ou null s'il n'est pas actif. */
export function activeElevation(session: Session) {
  return isElevated(session) ? session.elevatedUntil : null;
}

/** Sessions non expirées ayant franchi le double facteur, avec le nom de leur titulaire. */
export async function activeSessions() {
  const rows = await db
    .select({ session: schema.sessions, name: schema.users.name })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(gt(schema.sessions.expiresAt, Date.now()))
    .orderBy(desc(schema.sessions.lastSeenAt));
  return rows.filter((r) => r.session.mfaAt);
}

export function actorName(user: Pick<User, "name">) {
  return user.name;
}
