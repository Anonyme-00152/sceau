import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { DEFAULT_MODULES, MODULES, type ModuleId } from "./fields";

const KNOWN = new Set<string>(MODULES.map((m) => m.id));

/**
 * Hébergement en ligne : l'hébergeur n'est pas certifié HDS, les données de santé y sont interdites.
 * Le module Santé n'existe alors tout simplement pas (ni affiché, ni activable).
 */
export const ONLINE = process.env.SCEAU_HEBERGEMENT === "en-ligne";
export const HEALTH_ALLOWED = !ONLINE;

const allowed = (m: ModuleId) => KNOWN.has(m) && (HEALTH_ALLOWED || m !== "sante");

/** Modules de fiche actifs pour toute l'installation (réglés par la direction). */
export const getModules = cache(async (): Promise<ModuleId[]> => {
  const row = (await db.select().from(schema.settings).where(eq(schema.settings.key, "modules")).limit(1))[0];
  if (!row) return DEFAULT_MODULES.filter(allowed);
  try {
    const parsed = JSON.parse(row.value) as ModuleId[];
    return parsed.filter(allowed);
  } catch {
    return DEFAULT_MODULES.filter(allowed);
  }
});

export async function setModules(modules: ModuleId[]) {
  // Les modules verrouillés restent toujours actifs.
  const locked = MODULES.filter((m) => m.locked).map((m) => m.id);
  const value = JSON.stringify([...new Set([...locked, ...modules.filter(allowed)])]);
  await db
    .insert(schema.settings)
    .values({ key: "modules", value, updatedAt: Date.now() })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: Date.now() } });
}

export const APP_URL = (process.env.APP_URL ?? "http://localhost:3300").replace(/\/$/, "");
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

/** Inscriptions fermées par configuration (INSCRIPTIONS=fermees) ; ouvertes par défaut. */
export const SIGNUPS_CLOSED = process.env.INSCRIPTIONS === "fermees";
