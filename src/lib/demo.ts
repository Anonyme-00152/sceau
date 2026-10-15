import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";

export const DEMO_MODE = process.env.DEMO_MODE === "true";

// Mot de passe partagé par les comptes de démonstration (documenté dans le README).
export const DEMO_PASSWORD = "Sceau-Demo-2026!";

export async function demoAccounts() {
  if (!DEMO_MODE) return [];
  const rows = await db
    .select({ email: schema.users.email, name: schema.users.name, role: schema.users.role, title: schema.users.title })
    .from(schema.users)
    .where(eq(schema.users.isDemo, true));
  const order = { direction: 0, gestionnaire: 1, lecteur: 2 } as const;
  return rows.sort((a, b) => order[a.role] - order[b.role]);
}
