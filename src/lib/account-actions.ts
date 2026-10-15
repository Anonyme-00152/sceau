"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";
import { requestInfo } from "./request";
import { getCurrent, requireAccess } from "./session";
import { codeMatches, decideAccount, findPendingByToken, hasActiveDirection, recentRequestsFrom, requestAccount, signupsOpen } from "./accounts";
import { audit } from "./audit";
import { setModules } from "./settings";
import type { Role } from "./db/schema";
import type { ModuleId } from "./fields";

/* ───────────── Inscription ───────────── */

export type SignupState = { error?: string; fieldErrors?: Record<string, string>; done?: boolean };

const SignupSchema = z
  .object({
    name: z.string().trim().min(2, "Indiquez votre nom complet.").max(80),
    email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(200),
    title: z.string().trim().max(80).optional(),
    password: z
      .string()
      .min(12, "12 caractères minimum.")
      .max(200)
      .refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), "Mélangez lettres et chiffres."),
    confirm: z.string(),
    note: z.string().trim().max(500).optional(),
    charter: z.literal("on", { message: "Vous devez accepter l'engagement de confidentialité." }),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Les deux mots de passe diffèrent." });

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = SignupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Vérifiez les champs signalés.", fieldErrors };
  }
  if (!(await signupsOpen())) return { error: "Les inscriptions sont fermées sur cette installation." };
  const { ip } = await requestInfo();
  if ((await recentRequestsFrom(ip)) >= 3) return { error: "Trop de demandes depuis ce poste. Réessayez dans une heure." };

  const d = parsed.data;
  await requestAccount({ name: d.name, email: d.email, title: d.title ?? "", password: d.password, note: d.note ?? "", ip });
  return { done: true };
}

/* ───────────── Validation par l'administrateur ───────────── */

const ROLES = ["direction", "gestionnaire", "lecteur"] as const;

/** Lien reçu par e-mail. Hors premier compte, il faut aussi être connecté en direction. */
export async function decideByTokenAction(token: string, formData: FormData) {
  const pending = await findPendingByToken(token);
  if (!pending) redirect(`/approbation/${token}`);
  const { ip } = await requestInfo();
  const bootstrap = !(await hasActiveDirection());
  const decision = formData.get("decision") === "refuser" ? "refuser" : "approuver";

  let approver: { id: string | null; name: string };
  let role: Role;
  if (bootstrap) {
    approver = { id: null, name: "Administrateur (lien e-mail)" };
    role = "direction";
  } else {
    const current = await getCurrent();
    if (!current?.session.ndaAt || current.session.lockedAt || current.user.role !== "direction") redirect(`/approbation/${token}`);
    approver = { id: current.user.id, name: current.user.name };
    const asked = String(formData.get("role"));
    role = (ROLES as readonly string[]).includes(asked) ? (asked as Role) : "lecteur";
  }

  await decideAccount(pending, decision, role, approver, ip);
  redirect(`/approbation/${token}?decision=${decision}`);
}

export type CodeDecisionState = { error?: string; ok?: string };

/** Code reçu par e-mail, saisi depuis la page Équipe (direction connectée). */
export async function decideByCodeAction(userId: string, _prev: CodeDecisionState, formData: FormData): Promise<CodeDecisionState> {
  const { user } = await requireAccess();
  if (user.role !== "direction") return { error: "Réservé à la direction." };
  const pending = (
    await db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, userId), eq(schema.users.status, "en-attente")))
      .limit(1)
  )[0];
  if (!pending || !pending.approvalExpiresAt || pending.approvalExpiresAt < Date.now()) return { error: "Demande introuvable ou expirée." };

  const decision = formData.get("decision") === "refuser" ? "refuser" : "approuver";
  if (decision === "approuver" && !codeMatches(pending, String(formData.get("code") ?? ""))) {
    return { error: "Code incorrect. Il figure dans l'e-mail reçu par l'administrateur." };
  }
  const asked = String(formData.get("role"));
  const role: Role = (ROLES as readonly string[]).includes(asked) ? (asked as Role) : "lecteur";
  const { ip } = await requestInfo();
  await decideAccount(pending, decision, role, { id: user.id, name: user.name }, ip);
  // Pas de revalidation ici : la ligne affiche d'abord la confirmation, puis la page se rafraîchit côté navigateur.
  return { ok: decision === "approuver" ? `${pending.name} peut maintenant se connecter.` : "Demande refusée." };
}

/* ───────────── Paramètres (modules de fiche) ───────────── */

export async function saveModulesAction(formData: FormData) {
  const { user } = await requireAccess();
  if (user.role !== "direction") return;
  const modules = formData.getAll("module").map(String) as ModuleId[];
  await setModules(modules);
  const { ip } = await requestInfo();
  await audit({ userId: user.id, actor: user.name, action: "parametres.modifies", targetType: "journal", label: `Modules : ${modules.join(", ")}`, ip });
  revalidatePath("/espace", "layout");
}
