import "server-only";
import type { Client } from "@libsql/client";

// Sauvegarde complète de l'installation, sans les sessions.
// Les profils clients et les échanges restent chiffrés : le fichier est illisible sans la clé SCEAU_MASTER_KEY.

export const BACKUP_FORMAT = "sceau-sauvegarde";
export const BACKUP_VERSION = 1;

// Ordre d'insertion compatible avec les clés étrangères.
export const BACKUP_TABLES = ["users", "settings", "clients", "client_access", "events", "audit_log"] as const;

export type Backup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  createdAt: string;
  tables: Record<(typeof BACKUP_TABLES)[number], Record<string, unknown>[]>;
};

export async function exportBackup(client: Client): Promise<Backup> {
  const tables = {} as Backup["tables"];
  for (const table of BACKUP_TABLES) {
    const order = table === "audit_log" ? " ORDER BY seq" : "";
    const res = await client.execute(`SELECT * FROM ${table}${order}`);
    tables[table] = res.rows.map((row) => Object.fromEntries(res.columns.map((c) => [c, row[c] as unknown])));
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: new Date().toISOString(), tables };
}
