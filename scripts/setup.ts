/**
 * Prépare la base : clé maîtresse, tables, données.
 *   npm run setup               → crée ce qui manque (et met à niveau une base existante)
 *   npm run reset               → repart de zéro avec les données de démonstration fictives
 *   npm run setup -- --vierge   → repart de zéro SANS démonstration, pour un usage réel
 *   npm run setup -- --build    → en ligne (compilation Vercel) : tables et mises à niveau seulement,
 *                                 démonstration uniquement si SCEAU_SEED=demo et base vide. Ne supprime jamais rien.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_FILE = path.join(ROOT, ".env.local");
const BUILD = process.argv.includes("--build");
const VIERGE = !BUILD && process.argv.includes("--vierge");
const RESET = !BUILD && (process.argv.includes("--reset") || VIERGE);
// Paramètres d'une première installation (fournis par « Lancer Sceau.bat »).
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=").trim();
const ADMIN_ARG = arg("admin");
const PORT_ARG = Number(arg("port")) || 3300;

/* ───────────── 1. Environnement (installation locale uniquement) ───────────── */

function ensureEnv() {
  let current = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
  const lines: string[] = [];
  if (!/^SCEAU_MASTER_KEY=/m.test(current)) lines.push(`SCEAU_MASTER_KEY=${randomBytes(32).toString("base64")}`);
  if (!/^DATABASE_URL=/m.test(current)) lines.push("DATABASE_URL=file:./data/sceau.db");
  if (!/^DEMO_MODE=/m.test(current)) lines.push(`DEMO_MODE=${VIERGE ? "false" : "true"}`);
  if (!/^PORT=/m.test(current)) lines.push(`PORT=${PORT_ARG}`);
  if (!/^APP_URL=/m.test(current)) lines.push(`APP_URL=http://localhost:${PORT_ARG}`);
  if (!/^ADMIN_EMAIL=/m.test(current)) {
    if (ADMIN_ARG && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_ARG)) throw new Error(`Adresse e-mail invalide : ${ADMIN_ARG}`);
    lines.push(`ADMIN_EMAIL=${ADMIN_ARG ?? ""}`);
    if (!ADMIN_ARG) console.warn("  ⚠ ADMIN_EMAIL vide : renseignez l'adresse de l'administrateur dans .env.local.");
  }
  if (!/SMTP_HOST=/m.test(current)) {
    lines.push(
      "",
      "# Envoi des e-mails de validation. Sans ces lignes, les e-mails sont déposés dans data/outbox/.",
      "# iCloud : créez un « mot de passe pour app » sur appleid.apple.com, puis décommentez :",
      "# SMTP_HOST=smtp.mail.me.com",
      "# SMTP_PORT=587",
      "# SMTP_USER=votre-adresse@icloud.com",
      "# SMTP_PASS=mot-de-passe-pour-app",
      "# SMTP_FROM=votre-adresse@icloud.com",
    );
  }
  if (VIERGE && /^DEMO_MODE=true/m.test(current)) current = current.replace(/^DEMO_MODE=true/m, "DEMO_MODE=false");
  if (lines.length || VIERGE) {
    writeFileSync(ENV_FILE, (current ? current.trimEnd() + "\n" : "") + lines.join("\n") + (lines.length ? "\n" : ""));
    if (lines.length) console.log(`  .env.local complété (${lines.filter((l) => /^[A-Z]/.test(l)).length} variable(s))`);
  }
  process.loadEnvFile(ENV_FILE);
}

/* ───────────── 2. Exécution ───────────── */

async function main() {
  console.log(`Sceau — préparation de la base${BUILD ? " (compilation en ligne)" : ""}`);
  // En ligne, les variables viennent de l'hébergeur : aucun fichier .env.local n'est créé.
  if (!BUILD) ensureEnv();
  // Sans clé, le site se publierait mais ne pourrait rien chiffrer : mieux vaut refuser la compilation.
  if (BUILD && !process.env.SCEAU_MASTER_KEY) {
    console.error("  ✗ SCEAU_MASTER_KEY absente : lancez `npm run cloud:secrets -- <projet>` puis redéployez.");
    process.exit(1);
  }
  // Site réel en ligne : le premier compte se valide par e-mail. Sans SMTP, la demande partirait dans le vide
  // et l'adresse resterait bloquée en attente.
  if (BUILD && process.env.SCEAU_HEBERGEMENT === "en-ligne" && process.env.DEMO_MODE !== "true" && !process.env.SMTP_PASS) {
    console.error("  ✗ SMTP_PASS absent : sans envoi d'e-mail, le premier compte ne pourrait pas être validé.");
    console.error("    Lancez `npm run cloud:secrets -- sceau-prive` (mot de passe pour app iCloud) puis redéployez.");
    process.exit(1);
  }

  // Imports après chargement de l'environnement : ces modules lisent la clé et l'URL à l'import.
  const { databaseConfig, isLocalDatabase } = await import("../src/lib/db/config");
  const { createClient } = await import("@libsql/client");
  const { prepareDatabase, wipeDatabase, ensureModules, userCount } = await import("../src/lib/bootstrap/schema");
  const { DEFAULT_MODULES, MODULES } = await import("../src/lib/fields");

  const config = databaseConfig();
  const local = isLocalDatabase(config.url);
  if (local) mkdirSync(path.join(ROOT, "data"), { recursive: true });
  console.log(`  base : ${local ? config.url : "Turso (en ligne)"}`);
  const client = createClient(config);

  if (RESET) {
    await wipeDatabase(client);
    console.log("  base vidée (--reset)");
  }
  const added = await prepareDatabase(client, { local });
  for (const col of added) console.log(`  colonne ajoutée : users.${col}`);

  // Modules de fiche actifs. La démonstration montre tout ; une installation réelle démarre sans le module santé.
  const demo = BUILD ? process.env.SCEAU_SEED === "demo" : !VIERGE;
  await ensureModules(client, demo ? MODULES.map((m) => m.id) : DEFAULT_MODULES);

  if (!demo) {
    console.log("  base prête, sans données de démonstration.");
    if (!BUILD) {
      console.log(`  Créez le premier compte sur ${process.env.APP_URL}/inscription : il sera validé par e-mail à ${process.env.ADMIN_EMAIL}.`);
    }
    return;
  }

  if ((await userCount(client)) > 0) {
    console.log("  données déjà présentes — rien à faire" + (BUILD ? "." : " (utilisez --reset pour repartir de zéro)."));
    return;
  }

  const { seedDemo } = await import("../src/lib/bootstrap/demo");
  const result = await seedDemo(client);
  console.log(`  ${result.members} membres, ${result.clients} dossiers, ${result.journal} entrées de journal`);
  console.log("  Comptes de démonstration : direction@ / gestion@ / lecture@sceau-demo.test");
  console.log("  Mot de passe : voir README.md");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
