import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";

// Envoi d'e-mails. Avec SMTP configuré (.env.local), le message part réellement.
// Sinon — usage 100 % local, hors ligne — il est déposé dans data/outbox/ au format .eml,
// lisible par n'importe quel logiciel de messagerie (double-clic).

export type MailResult = { sent: boolean; via: "smtp" | "fichier"; detail: string };

export function smtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transport() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendMail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }): Promise<MailResult> {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "sceau@localhost";

  if (smtpConfigured()) {
    try {
      await transport().sendMail({ from: `Sceau <${from}>`, to, subject, text, html });
      return { sent: true, via: "smtp", detail: `envoyé à ${to}` };
    } catch (err) {
      console.error("[sceau] échec SMTP, dépôt local de l'e-mail :", err instanceof Error ? err.message : err);
    }
  }

  // En ligne, il n'y a pas de disque où déposer le message : seul l'envoi SMTP compte.
  if (process.env.VERCEL || process.env.SCEAU_HEBERGEMENT === "en-ligne") {
    console.error(`[sceau] e-mail NON envoyé à ${to} : configurez SMTP_HOST, SMTP_USER et SMTP_PASS sur l'hébergeur.`);
    return { sent: false, via: "fichier", detail: "SMTP non configuré en ligne" };
  }

  // Dépôt local : un fichier .eml par message.
  const outbox = path.join(process.cwd(), "data", "outbox");
  await mkdir(outbox, { recursive: true });
  const file = path.join(outbox, `${new Date().toISOString().replace(/[:.]/g, "-")}.eml`);
  const boundary = `sceau-${Date.now().toString(36)}`;
  const eml = [
    `From: Sceau <${from}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(text).toString("base64"),
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(html).toString("base64"),
    `--${boundary}--`,
    "",
  ].join("\r\n");
  await writeFile(file, eml);
  console.log(`[sceau] e-mail déposé (SMTP non configuré) : ${file}`);
  return { sent: false, via: "fichier", detail: file };
}

/** Gabarit HTML sobre, aux couleurs de Sceau. */
export function mailLayout(title: string, body: string) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#0d0c0a;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#efe9dd">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#13120f;border:1px solid #2a2722;border-radius:16px">
<tr><td style="padding:28px 28px 8px"><p style="margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#cba35c">Sceau — registre client</p>
<h1 style="margin:14px 0 0;font-size:24px;font-weight:500;color:#efe9dd">${title}</h1></td></tr>
<tr><td style="padding:8px 28px 28px;font-size:15px;line-height:1.6;color:#d8d1c3">${body}</td></tr>
</table>
<p style="max-width:560px;margin:16px auto 0;font-size:12px;color:#8f897d;text-align:center">Message automatique. Ne le transférez pas : il contient un code d'accès.</p>
</body></html>`;
}
