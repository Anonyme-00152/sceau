import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { and, count, eq, gte } from "drizzle-orm";
import QRCode from "qrcode";
import { db, schema } from "./db";
import { hashPassword, randomToken, seal, sha256, unseal } from "./crypto";
import { generateTotpSecret } from "./totp";
import { audit } from "./audit";
import { mailLayout, sendMail } from "./mail";
import { ADMIN_EMAIL, APP_URL, SIGNUPS_CLOSED } from "./settings";
import type { Role, User } from "./db/schema";

// Circuit des comptes : une inscription crée un compte « en attente ».
// L'administrateur reçoit par e-mail un lien et un code de validation ; sans l'un d'eux, le compte reste bloqué.

export const APPROVAL_TTL = 7 * 24 * 3_600_000;

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function hasActiveDirection() {
  const rows = await db
    .select({ n: count() })
    .from(schema.users)
    .where(and(eq(schema.users.role, "direction"), eq(schema.users.status, "actif")));
  return (rows[0]?.n ?? 0) > 0;
}

/**
 * Les inscriptions sont-elles possibles ? Fermées par configuration, sauf tant qu'aucun compte Direction
 * n'existe : c'est ainsi que le propriétaire crée le tout premier compte, validé par le lien reçu par e-mail.
 */
export async function signupsOpen() {
  if (!SIGNUPS_CLOSED) return true;
  return !(await hasActiveDirection());
}

export async function recentRequestsFrom(ip: string) {
  const rows = await db
    .select({ n: count() })
    .from(schema.users)
    .where(and(eq(schema.users.requestIp, ip), gte(schema.users.createdAt, Date.now() - 3_600_000)));
  return rows[0]?.n ?? 0;
}

export async function requestAccount(input: { name: string; email: string; title: string; password: string; note: string; ip: string }) {
  const existing = (await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, input.email)).limit(1))[0];
  // Adresse déjà connue : on répond comme si tout allait bien, sans rien créer (pas d'énumération des comptes).
  if (existing) return;

  const id = randomUUID();
  const token = randomToken(32);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = Date.now();
  const bootstrap = !(await hasActiveDirection());

  await db.insert(schema.users).values({
    id,
    email: input.email,
    name: input.name,
    title: input.title || "Membre",
    role: bootstrap ? "direction" : "lecteur",
    passwordHash: await hashPassword(input.password),
    totpSecret: seal(generateTotpSecret(), `totp:${id}`),
    status: "en-attente",
    createdAt: now,
    requestNote: input.note || null,
    requestIp: input.ip,
    approvalTokenHash: sha256(token),
    approvalCodeHash: sha256(`${id}:${code}`),
    approvalExpiresAt: now + APPROVAL_TTL,
  });
  await audit({ userId: id, actor: input.name, action: "compte.demande", targetType: "user", targetId: id, label: input.email, ip: input.ip });

  const link = `${APP_URL}/approbation/${token}`;
  const when = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(now);
  const lines = [
    ["Nom", input.name],
    ["E-mail", input.email],
    ["Fonction", input.title || "—"],
    ["Message", input.note || "—"],
    ["Date", when],
    ["Origine", input.ip],
  ];
  const text = [
    "Nouvelle demande d'accès à Sceau.",
    "",
    ...lines.map(([k, v]) => `${k} : ${v}`),
    "",
    `Pour valider, ouvrez ce lien sur le poste où Sceau est installé : ${link}`,
    `Ou saisissez ce code dans Sceau, page Équipe : ${code.slice(0, 3)} ${code.slice(3)}`,
    "",
    bootstrap ? "Premier compte de l'installation : il recevra le rôle Direction." : "Vous choisirez son rôle au moment de valider.",
    "Le lien et le code expirent dans 7 jours. Si vous ne reconnaissez pas cette demande, ignorez ce message.",
  ].join("\n");
  const html = mailLayout(
    "Nouvelle demande d'accès",
    `<table role="presentation" style="width:100%;border-collapse:collapse;margin:8px 0 20px">${lines
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 0;color:#8f897d;width:110px;vertical-align:top">${k}</td><td style="padding:6px 0;color:#efe9dd">${escapeHtml(v)}</td></tr>`,
      )
      .join("")}</table>
<p style="margin:0 0 18px"><a href="${link}" style="display:inline-block;background:#cba35c;color:#0d0c0a;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">Examiner la demande</a></p>
<p style="margin:0 0 6px;color:#8f897d">Ou saisissez ce code dans Sceau, page Équipe :</p>
<p style="margin:0 0 20px;font-family:ui-monospace,monospace;font-size:28px;letter-spacing:.2em;color:#efe9dd">${code.slice(0, 3)} ${code.slice(3)}</p>
<p style="margin:0;color:#8f897d;font-size:13px">${
      bootstrap ? "Premier compte de l'installation : il recevra le rôle Direction." : "Vous choisirez son rôle au moment de valider."
    } Le lien et le code expirent dans 7 jours. Si vous ne reconnaissez pas cette demande, ignorez ce message.</p>`,
  );
  if (!ADMIN_EMAIL) console.warn("[sceau] ADMIN_EMAIL non défini dans .env.local : la demande est déposée dans data/outbox.");
  await sendMail({ to: ADMIN_EMAIL || "administrateur@localhost", subject: `Sceau — demande d'accès de ${input.name}`, text, html });
}

/** Demandes en attente encore valides (non expirées). */
export async function listPendingRequests() {
  return db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.status, "en-attente"), gte(schema.users.approvalExpiresAt, Date.now())))
    .orderBy(schema.users.createdAt);
}

export async function findPendingByToken(token: string) {
  const user = (
    await db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.approvalTokenHash, sha256(token)), eq(schema.users.status, "en-attente")))
      .limit(1)
  )[0];
  if (!user || !user.approvalExpiresAt || user.approvalExpiresAt < Date.now()) return null;
  return user;
}

export function codeMatches(user: User, code: string) {
  const clean = code.replace(/\s/g, "");
  return !!user.approvalCodeHash && /^\d{6}$/.test(clean) && sha256(`${user.id}:${clean}`) === user.approvalCodeHash;
}

export async function decideAccount(user: User, decision: "approuver" | "refuser", role: Role, approver: { id: string | null; name: string }, ip: string) {
  const now = Date.now();
  await db
    .update(schema.users)
    .set({
      status: decision === "approuver" ? "actif" : "refuse",
      role,
      approvedBy: approver.name,
      approvedAt: now,
      approvalTokenHash: null,
      approvalCodeHash: null,
      approvalExpiresAt: null,
    })
    .where(eq(schema.users.id, user.id));
  await audit({
    userId: approver.id,
    actor: approver.name,
    action: decision === "approuver" ? "compte.approuve" : "compte.refuse",
    targetType: "user",
    targetId: user.id,
    label: `${user.name} · ${user.email}`,
    ip,
  });

  // Prévenir la personne (réel si SMTP est configuré, sinon dépôt local).
  const ok = decision === "approuver";
  await sendMail({
    to: user.email,
    subject: ok ? "Sceau — votre accès est validé" : "Sceau — votre demande d'accès",
    text: ok
      ? `Bonjour ${user.name},\n\nVotre accès à Sceau est validé. À votre première connexion, vous associerez une application d'authentification à votre compte.\n\n${APP_URL}/connexion`
      : `Bonjour ${user.name},\n\nVotre demande d'accès à Sceau n'a pas été retenue.`,
    html: mailLayout(
      ok ? "Votre accès est validé" : "Votre demande d'accès",
      ok
        ? `<p>Bonjour ${escapeHtml(user.name)},</p><p>Votre accès à Sceau est validé. À votre première connexion, vous associerez une application d'authentification (Google Authenticator, 1Password, Aegis…) à votre compte.</p><p><a href="${APP_URL}/connexion" style="color:#cba35c">Se connecter</a></p>`
        : `<p>Bonjour ${escapeHtml(user.name)},</p><p>Votre demande d'accès à Sceau n'a pas été retenue.</p>`,
    ),
  });
}

/** QR code et clé manuelle pour associer l'application d'authentification (première connexion). */
export async function enrollmentData(user: User) {
  const secret = unseal(user.totpSecret, `totp:${user.id}`);
  const uri = `otpauth://totp/${encodeURIComponent(`Sceau:${user.email}`)}?secret=${secret}&issuer=Sceau&algorithm=SHA1&digits=6&period=30`;
  const qr = await QRCode.toDataURL(uri, { margin: 1, width: 240, color: { dark: "#0d0c0a", light: "#efe9dd" } });
  return { qr, secret: secret.replace(/(.{4})/g, "$1 ").trim() };
}
