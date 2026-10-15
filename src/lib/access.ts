import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import type { Client, User } from "./db/schema";
import { FIELD_INDEX } from "./fields";

// Cloisonnement : un dossier n'est lisible que par les personnes inscrites sur sa liste d'accès.
// La direction voit l'existence de tous les dossiers (pour gérer les accès), pas leur contenu.

export async function hasAccess(userId: string, clientId: string) {
  const rows = await db
    .select({ userId: schema.clientAccess.userId })
    .from(schema.clientAccess)
    .where(and(eq(schema.clientAccess.userId, userId), eq(schema.clientAccess.clientId, clientId)))
    .limit(1);
  return rows.length > 0;
}

export async function accessibleIds(userId: string) {
  const rows = await db
    .select({ clientId: schema.clientAccess.clientId })
    .from(schema.clientAccess)
    .where(eq(schema.clientAccess.userId, userId));
  return new Set(rows.map((r) => r.clientId));
}

export const canEdit = (user: User) => user.role !== "lecteur";
export const canCreate = (user: User) => user.role !== "lecteur";
export const canManageAccess = (user: User) => user.role === "direction";
export const canSeeRegistry = (user: User) => user.role === "direction";

export type RevealRule = { allowed: boolean; needsElevation: boolean; reason?: string };

/** Règles de révélation d'un champ sensible. */
export function revealRule(user: User, client: Pick<Client, "sensitivity">, fieldKey: string, customSensitive?: boolean): RevealRule {
  const def = FIELD_INDEX[fieldKey];
  const sensitive = def ? !!def.sensitive : !!customSensitive;
  if (!sensitive) return { allowed: true, needsElevation: false };
  const critical = !!def?.critical;
  if (critical && user.role === "lecteur") {
    return { allowed: false, needsElevation: false, reason: "Donnée critique : réservée aux gestionnaires et à la direction." };
  }
  return { allowed: true, needsElevation: critical || client.sensitivity === "secret" };
}
