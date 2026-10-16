import "server-only";
import { randomInt } from "node:crypto";
import { and, count, eq, gt, isNotNull, ne } from "drizzle-orm";
import { db, schema } from "./db";
import type { User } from "./db/schema";

// Gestion des comptes de l'équipe : lectures partagées par les pages et les actions.

export async function getMember(id: string) {
  return (await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1))[0] ?? null;
}

/** Comptes Direction actifs, hors le membre indiqué : il en faut toujours au moins un. */
export async function otherActiveDirections(excludeId: string) {
  const rows = await db
    .select({ n: count() })
    .from(schema.users)
    .where(and(eq(schema.users.role, "direction"), eq(schema.users.status, "actif"), ne(schema.users.id, excludeId)));
  return rows[0]?.n ?? 0;
}

export function isLocked(member: Pick<User, "lockedUntil">) {
  return !!member.lockedUntil && member.lockedUntil > Date.now();
}

export async function memberFootprint(id: string) {
  const [owned, events, access] = await Promise.all([
    db.select({ n: count() }).from(schema.clients).where(eq(schema.clients.ownerId, id)),
    db.select({ n: count() }).from(schema.events).where(eq(schema.events.userId, id)),
    db.select({ n: count() }).from(schema.clientAccess).where(eq(schema.clientAccess.userId, id)),
  ]);
  return { owned: owned[0]?.n ?? 0, events: events[0]?.n ?? 0, access: access[0]?.n ?? 0 };
}

export async function memberSessions(id: string) {
  return db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.userId, id), isNotNull(schema.sessions.mfaAt), gt(schema.sessions.expiresAt, Date.now())));
}

/** Mot de passe provisoire lisible à voix haute : 4 groupes de 4, sans caractères ambigus (0/O, 1/l/I). */
export function temporaryPassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  for (;;) {
    const groups = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join(""));
    const value = groups.join("-");
    if (/\d/.test(value) && /[a-zA-Z]/.test(value)) return value;
  }
}
