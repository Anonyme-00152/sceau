/**
 * Vérifie l'envoi d'e-mails : envoie un message de test à l'administrateur (ADMIN_EMAIL).
 *   npm run test-mail   (ou double-clic sur « Tester l'envoi d'e-mail.bat »)
 */
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_FILE = path.join(ROOT, ".env.local");

async function main() {
  if (!existsSync(ENV_FILE)) {
    console.log("  .env.local introuvable : lancez d'abord « Lancer Sceau.bat ».");
    process.exit(1);
  }
  process.loadEnvFile(ENV_FILE);
  const { sendMail, smtpConfigured, mailLayout } = await import("../src/lib/mail");
  const to = process.env.ADMIN_EMAIL;

  if (!to) {
    console.log("  ADMIN_EMAIL est vide dans .env.local : indiquez l'adresse de l'administrateur.");
    process.exit(1);
  }
  if (!smtpConfigured()) {
    const missing = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"].filter((k) => !process.env[k]);
    console.log(`  Envoi non configuré : ${missing.join(", ")} manquant(s) dans .env.local.`);
    console.log("  Pour iCloud, collez votre « mot de passe pour app » après SMTP_PASS= puis relancez ce test.");
    process.exit(1);
  }

  console.log(`  Envoi d'un e-mail de test à ${to} via ${process.env.SMTP_HOST}…`);
  const res = await sendMail({
    to,
    subject: "Sceau — e-mail de test",
    text: "L'envoi d'e-mails de Sceau fonctionne. Les demandes d'accès arriveront à cette adresse.",
    html: mailLayout("L'envoi fonctionne", "<p>Les demandes d'accès à Sceau arriveront à cette adresse.</p>"),
  });
  if (res.sent) {
    console.log(`  ✓ E-mail envoyé. Vérifiez la boîte de réception de ${to} (et les indésirables).`);
  } else {
    console.log("  ✗ Échec de l'envoi (voir le message d'erreur ci-dessus).");
    console.log("    Causes fréquentes : mot de passe pour app incorrect, SMTP_USER ou SMTP_FROM différent de l'adresse iCloud.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
