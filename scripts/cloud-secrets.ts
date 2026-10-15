/**
 * À lancer par TOI, dans ton terminal : génère et enregistre les secrets d'un site Sceau en ligne,
 * directement dans Vercel. Personne d'autre ne les voit ; rien n'est écrit sur le disque.
 *
 *   npm run cloud:secrets -- sceau-prive     → clé de chiffrement + mot de passe d'app iCloud (saisie masquée)
 *   npm run cloud:secrets -- sceau-demo      → clé de chiffrement + secret de la remise à zéro nocturne
 *
 * La clé de chiffrement n'est JAMAIS remplacée si elle existe déjà (les données deviendraient illisibles),
 * sauf avec --remplacer-cle, à réserver à un site encore vide.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import readline from "node:readline";

const PROJECTS = ["sceau-prive", "sceau-demo"] as const;
const project = process.argv[2] as (typeof PROJECTS)[number];
const REPLACE_KEY = process.argv.includes("--remplacer-cle");

function vercel(args: string[], input?: string) {
  const res = spawnSync("vercel", args, { input, encoding: "utf8", shell: true });
  return { ok: res.status === 0, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

function setSecret(name: string, value: string, force: boolean) {
  const args = ["env", "add", name, "production", "--project", project, "--sensitive", "--yes"];
  if (force) args.push("--force");
  const res = vercel(args, value);
  if (!res.ok) throw new Error(`Échec pour ${name} :\n${res.out}`);
  console.log(`  ✓ ${name} enregistré dans Vercel (${project})`);
}

/** Saisie masquée : les caractères tapés ne s'affichent pas. */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const writer = rl as unknown as { _writeToOutput: (s: string) => void };
    let muted = false;
    writer._writeToOutput = (s: string) => {
      if (!muted || s.includes(question)) process.stdout.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer.trim());
    });
    muted = true;
  });
}

async function main() {
  if (!PROJECTS.includes(project)) {
    console.log(`  Indiquez le site : npm run cloud:secrets -- ${PROJECTS.join(" | ")}`);
    process.exit(1);
  }
  console.log(`\nSceau — secrets du site « ${project} »\n`);

  const existing = vercel(["env", "ls", "production", "--project", project]).out;
  const hasKey = /\bSCEAU_MASTER_KEY\b/.test(existing);

  if (hasKey && !REPLACE_KEY) {
    console.log("  • SCEAU_MASTER_KEY existe déjà : conservée (la changer rendrait les données illisibles).");
  } else {
    const key = randomBytes(32).toString("base64");
    setSecret("SCEAU_MASTER_KEY", key, hasKey);
    console.log("\n  ┌──────────────────────────────────────────────────────────────────┐");
    console.log("  │ CLÉ DE CHIFFREMENT — copiez-la MAINTENANT dans votre gestionnaire │");
    console.log("  │ de mots de passe. Elle ne sera plus jamais affichée.              │");
    console.log("  └──────────────────────────────────────────────────────────────────┘");
    console.log(`\n      ${key}\n`);
    console.log("  Sans elle, aucune sauvegarde ne pourra être relue.\n");
  }

  if (project === "sceau-demo") {
    setSecret("CRON_SECRET", randomBytes(32).toString("base64url"), true);
  } else {
    const pass = await askHidden("  Mot de passe pour app iCloud (Entrée pour passer) : ");
    if (pass) setSecret("SMTP_PASS", pass, true);
    else console.log("  • SMTP_PASS non modifié.");
  }

  console.log("\n  Terminé. Les secrets seront pris en compte au prochain déploiement.\n");
}

main().catch((err) => {
  console.error(`\n  ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
