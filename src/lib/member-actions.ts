"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";
import { hashPassword, seal, verifyPassword } from "./crypto";
import { generateTotpSecret } from "./totp";
import { audit, type AuditAction } from "./audit";
import { requestInfo } from "./request";
import { isElevated, requireAccess, type Current } from "./session";
import { getMember, memberFootprint, otherActiveDirections, temporaryPassword } from "./members";
import { DEMO_MODE } from "./demo";
import { ROLE_LABEL } from "./fields";
import type { Role, User } from "./db/schema";

// Gestion des comptes. Côté direction, chaque action exige l'accès renforcé (code redemandé) et est journalisée.

export type MemberActionState = { ok?: string; error?: string; needsElevation?: boolean; secret?: string };

const ROLES = ["direction", "gestionnaire", "lecteur"] as const;
const DEMO_LOCKED = "Démonstration : les comptes ne peuvent pas être modifiés.";

type Guarded = { current: Current; member: User | null } | { state: MemberActionState };

async function guard(memberId?: string): Promise<Guarded> {
  const current = await requireAccess();
  if (current.user.role !== "direction") return { state: { error: "Réservé à la direction." } };
  if (DEMO_MODE) return { state: { error: DEMO_LOCKED } };
  if (!isElevated(current.session)) return { state: { error: "Accès renforcé requis.", needsElevation: true } };
  const member = memberId ? await getMember(memberId) : null;
  if (memberId && (!member || member.status === "en-attente")) return { state: { error: "Compte introuvable." } };
  return { current, member };
}

async function log(current: Current, action: AuditAction, member: Pick<User, "id" | "name">, detail?: string) {
  const { ip } = await requestInfo();
  await audit({
    userId: current.user.id,
    actor: current.user.name,
    action,
    targetType: "user",
    targetId: member.id,
    label: detail ? `${member.name} · ${detail}` : member.name,
    ip,
  });
}

function refresh(memberId?: string) {
  revalidatePath("/espace/equipe");
  if (memberId) revalidatePath(`/espace/equipe/${memberId}`);
}

async function emailTaken(email: string, exceptId?: string) {
  const where = exceptId ? and(eq(schema.users.email, email), ne(schema.users.id, exceptId)) : eq(schema.users.email, email);
  return (await db.select({ id: schema.users.id }).from(schema.users).where(where).limit(1)).length > 0;
}

const Identity = z.object({
  name: z.string().trim().min(2, "Indiquez un nom complet.").max(80),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(200),
  title: z.string().trim().max(80).optional(),
  role: z.enum(ROLES),
});

/* ───────────── Créer un compte ───────────── */

export async function createMemberAction(_prev: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const g = await guard();
  if ("state" in g) return g.state;
  const parsed = Identity.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Vérifiez les champs." };
  const d = parsed.data;
  if (await emailTaken(d.email)) return { error: "Un compte existe déjà avec cette adresse." };

  const id = randomUUID();
  const password = temporaryPassword();
  const now = Date.now();
  await db.insert(schema.users).values({
    id,
    email: d.email,
    name: d.name,
    title: d.title || "Membre",
    role: d.role,
    passwordHash: await hashPassword(password),
    totpSecret: seal(generateTotpSecret(), `totp:${id}`),
    createdAt: now,
    status: "actif",
    approvedBy: g.current.user.name,
    approvedAt: now,
  });
  await log(g.current, "compte.cree", { id, name: d.name }, ROLE_LABEL[d.role]);
  refresh();
  return { ok: `Compte créé pour ${d.name} (${d.email}).`, secret: password };
}

/* ───────────── Identité et rôle ───────────── */

export async function updateMemberAction(memberId: string, _prev: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const g = await guard(memberId);
  if ("state" in g) return g.state;
  const member = g.member!;
  const parsed = Identity.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Vérifiez les champs." };
  const d = parsed.data;
  if (await emailTaken(d.email, member.id)) return { error: "Un autre compte utilise déjà cette adresse." };
  if (member.role === "direction" && d.role !== "direction" && member.status === "actif" && (await otherActiveDirections(member.id)) === 0) {
    return { error: "Il faut au moins un autre compte Direction actif avant de changer ce rôle." };
  }

  await db
    .update(schema.users)
    .set({ name: d.name, email: d.email, title: d.title || "Membre", role: d.role as Role })
    .where(eq(schema.users.id, member.id));
  const changes = [
    d.name !== member.name && "nom",
    d.email !== member.email && "e-mail",
    (d.title || "Membre") !== member.title && "fonction",
    d.role !== member.role && `rôle ${ROLE_LABEL[member.role]} → ${ROLE_LABEL[d.role]}`,
  ].filter(Boolean);
  if (changes.length) await log(g.current, "compte.modifie", { id: member.id, name: d.name }, changes.join(", "));
  refresh(member.id);
  return { ok: changes.length ? "Modifications enregistrées." : "Aucune modification." };
}

/* ───────────── Suspendre / réactiver ───────────── */

export async function setMemberStatusAction(memberId: string, status: "actif" | "suspendu"): Promise<MemberActionState> {
  const g = await guard(memberId);
  if ("state" in g) return g.state;
  const member = g.member!;
  if (member.id === g.current.user.id) return { error: "Vous ne pouvez pas suspendre votre propre compte." };
  if (status === "suspendu" && member.role === "direction" && (await otherActiveDirections(member.id)) === 0) {
    return { error: "C'est le dernier compte Direction actif : il ne peut pas être suspendu." };
  }
  await db.update(schema.users).set({ status }).where(eq(schema.users.id, member.id));
  if (status === "suspendu") await db.delete(schema.sessions).where(eq(schema.sessions.userId, member.id));
  await log(g.current, status === "suspendu" ? "compte.suspendu" : "compte.reactive", member);
  refresh(member.id);
  return { ok: status === "suspendu" ? "Compte suspendu : ses sessions sont fermées." : "Compte réactivé." };
}

/* ───────────── Mot de passe, téléphone, blocage ───────────── */

export async function resetMemberPasswordAction(memberId: string): Promise<MemberActionState> {
  const g = await guard(memberId);
  if ("state" in g) return g.state;
  const member = g.member!;
  if (member.id === g.current.user.id) return { error: "Changez votre propre mot de passe depuis « Mon compte »." };
  const password = temporaryPassword();
  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(password), failedAttempts: 0, lockedUntil: null })
    .where(eq(schema.users.id, member.id));
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, member.id));
  await log(g.current, "mot-de-passe.reinitialise", member);
  refresh(member.id);
  return { ok: "Nouveau mot de passe provisoire. Ses sessions ouvertes sont fermées.", secret: password };
}

export async function resetMemberTotpAction(memberId: string): Promise<MemberActionState> {
  const g = await guard(memberId);
  if ("state" in g) return g.state;
  const member = g.member!;
  const self = member.id === g.current.user.id;
  await db
    .update(schema.users)
    .set({ totpSecret: seal(generateTotpSecret(), `totp:${member.id}`), totpEnrolledAt: null })
    .where(eq(schema.users.id, member.id));
  // Les sessions ouvertes sont fermées ; pour soi-même, la session en cours reste ouverte.
  await db
    .delete(schema.sessions)
    .where(self ? and(eq(schema.sessions.userId, member.id), ne(schema.sessions.id, g.current.session.id)) : eq(schema.sessions.userId, member.id));
  await log(g.current, "code.reinitialise", member);
  refresh(member.id);
  return {
    ok: self
      ? "Fait : à votre prochaine connexion, un nouveau QR code s'affichera."
      : "Fait : à sa prochaine connexion, un nouveau QR code s'affichera pour associer son téléphone.",
  };
}

export async function unlockMemberAction(memberId: string): Promise<MemberActionState> {
  const g = await guard(memberId);
  if ("state" in g) return g.state;
  const member = g.member!;
  await db.update(schema.users).set({ failedAttempts: 0, lockedUntil: null }).where(eq(schema.users.id, member.id));
  await log(g.current, "compte.debloque", member);
  refresh(member.id);
  return { ok: "Compte débloqué." };
}

export async function revokeMemberSessionsAction(memberId: string): Promise<MemberActionState> {
  const g = await guard(memberId);
  if ("state" in g) return g.state;
  const member = g.member!;
  const self = member.id === g.current.user.id;
  await db
    .delete(schema.sessions)
    .where(self ? and(eq(schema.sessions.userId, member.id), ne(schema.sessions.id, g.current.session.id)) : eq(schema.sessions.userId, member.id));
  await log(g.current, "session.revoquee", member, "toutes ses sessions");
  refresh(member.id);
  return { ok: "Sessions fermées." };
}

/* ───────────── Supprimer ───────────── */

export async function deleteMemberAction(memberId: string, _prev: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const g = await guard(memberId);
  if ("state" in g) return g.state;
  const member = g.member!;
  if (member.id === g.current.user.id) return { error: "Vous ne pouvez pas supprimer votre propre compte." };
  if (member.role === "direction" && member.status === "actif" && (await otherActiveDirections(member.id)) === 0) {
    return { error: "C'est le dernier compte Direction actif : il ne peut pas être supprimé." };
  }
  if (String(formData.get("confirm") ?? "").trim().toLowerCase() !== member.email) {
    return { error: "Recopiez l'adresse e-mail du compte pour confirmer." };
  }
  const { owned, events } = await memberFootprint(member.id);
  if (owned > 0 || events > 0) {
    return {
      error: `Ce compte est titulaire de ${owned} dossier(s) et auteur de ${events} échange(s) : suspendez-le plutôt, l'historique reste ainsi lisible.`,
    };
  }
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, member.id));
  await db.delete(schema.clientAccess).where(eq(schema.clientAccess.userId, member.id));
  await db.delete(schema.users).where(eq(schema.users.id, member.id));
  await log(g.current, "compte.supprime", member, member.email);
  revalidatePath("/espace/equipe");
  redirect("/espace/equipe");
}

/* ───────────── Mon compte ───────────── */

export async function updateOwnProfileAction(_prev: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const { user } = await requireAccess();
  if (DEMO_MODE && user.isDemo) return { error: DEMO_LOCKED };
  const parsed = z
    .object({ name: z.string().trim().min(2, "Indiquez votre nom complet.").max(80), title: z.string().trim().max(80).optional() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Vérifiez les champs." };
  await db
    .update(schema.users)
    .set({ name: parsed.data.name, title: parsed.data.title || "Membre" })
    .where(eq(schema.users.id, user.id));
  const { ip } = await requestInfo();
  await audit({ userId: user.id, actor: parsed.data.name, action: "compte.modifie", targetType: "user", targetId: user.id, label: "profil", ip });
  revalidatePath("/espace", "layout");
  return { ok: "Profil enregistré." };
}

const PasswordChange = z
  .object({
    current: z.string().min(1, "Indiquez votre mot de passe actuel."),
    password: z
      .string()
      .min(12, "Nouveau mot de passe : 12 caractères minimum.")
      .max(200)
      .refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), "Nouveau mot de passe : mélangez lettres et chiffres."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Les deux nouveaux mots de passe diffèrent." });

export async function changeOwnPasswordAction(_prev: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const { user, session } = await requireAccess();
  if (DEMO_MODE && user.isDemo) return { error: DEMO_LOCKED };
  const parsed = PasswordChange.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Vérifiez les champs." };
  if (!(await verifyPassword(parsed.data.current, user.passwordHash))) return { error: "Mot de passe actuel incorrect." };
  if (parsed.data.current === parsed.data.password) return { error: "Choisissez un mot de passe différent de l'actuel." };

  await db.update(schema.users).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(schema.users.id, user.id));
  // Les autres appareils devront se reconnecter avec le nouveau mot de passe.
  await db.delete(schema.sessions).where(and(eq(schema.sessions.userId, user.id), ne(schema.sessions.id, session.id)));
  const { ip } = await requestInfo();
  await audit({ userId: user.id, actor: user.name, action: "mot-de-passe.modifie", targetType: "user", targetId: user.id, ip });
  return { ok: "Mot de passe modifié. Vos autres sessions sont fermées." };
}
