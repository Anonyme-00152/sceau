/**
 * Restaure une sauvegarde téléchargée depuis Paramètres → Sauvegarde.
 *   npm run restaurer -- chemin/vers/sceau-sauvegarde-AAAA-MM-JJ.json
 *   npm run restaurer -- fichier.json --force   → remplace une base qui contient déjà des données
 *
 * La base visée est celle de .env.local (installation locale) ou des variables d'environnement (en ligne).
 * La clé SCEAU_MASTER_KEY doit être la même que celle de l'installation d'origine, sinon rien ne se déchiffre.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_FILE = path.join(ROOT, ".env.local");
const FORCE = process.argv.includes("--force");
const file = process.argv.slice(2).find((a) => !a.startsWith("--"));

async function main() {
  if (!file || !existsSync(file)) {
    console.log("  Indiquez le fichier de sauvegarde : npm run restaurer -- sceau-sauvegarde-AAAA-MM-JJ.json");
    process.exit(1);
  }
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

  const { databaseConfig, isLocalDatabase } = await import("../src/lib/db/config");
  const { createClient } = await import("@libsql/client");
  const { prepareDatabase, wipeDatabase, userCount } = await import("../src/lib/bootstrap/schema");
  const { BACKUP_FORMAT, BACKUP_TABLES } = await import("../src/lib/backup");
  type BackupFile = { format: string; version: number; createdAt: string; tables: Record<string, Record<string, unknown>[]> };

  const backup = JSON.parse(readFileSync(file, "utf8")) as BackupFile;
  if (backup.format !== BACKUP_FORMAT) throw new Error("Ce fichier n'est pas une sauvegarde Sceau.");

  const config = databaseConfig();
  const local = isLocalDatabase(config.url);
  const client = createClient(config);
  console.log(`Sceau — restauration de la sauvegarde du ${backup.createdAt.slice(0, 10)} vers ${local ? config.url : "Turso (en ligne)"}`);

  await prepareDatabase(client, { local });
  if ((await userCount(client)) > 0) {
    if (!FORCE) {
      console.log("  La base contient déjà des données. Relancez avec --force pour la remplacer entièrement.");
      process.exit(1);
    }
    await wipeDatabase(client);
    await prepareDatabase(client, { local });
    console.log("  base existante vidée (--force)");
  }

  for (const table of BACKUP_TABLES) {
    const rows = backup.tables[table] ?? [];
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      await client.batch(
        chunk.map((row) => {
          const cols = Object.keys(row);
          return {
            sql: `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
            args: cols.map((c) => row[c] as string | number | null),
          };
        }),
        "write",
      );
    }
    console.log(`  ${table} : ${rows.length}`);
  }

  // Contrôle final : la chaîne d'empreintes du journal doit être intacte après restauration.
  const { verifyChain } = await import("../src/lib/audit");
  const report = await verifyChain();
  console.log(report.ok ? `  ✓ journal intègre (${report.count} entrées)` : `  ✗ journal rompu à l'entrée #${report.brokenAt}`);
  if (!report.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
