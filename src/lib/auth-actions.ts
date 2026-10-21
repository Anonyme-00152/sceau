"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";
import { hashPassword, unseal, verifyPassword } from "./crypto";
import { verifyTotp } from "./totp";
import { audit } from "./audit";
import { requestInfo } from "./request";
import { clearSessionCookie, createSession, getCurrent, requireAccess } from "./session";
import { ELEVATION_TTL, IP_WINDOW, LOCKOUT_DURATION, MAX_FAILED_ATTEMPTS, MAX_FAILURES_PER_IP } from "./constants";
import { failuresFromIp } from "./activity";
import { enrollmentData } from "./accounts";
import { rememberEngagement, rememberedEngagement } from "./engagement";
import type { User } from "./db/schema";

export type EnrollData = { qr: string; secret: string; issuer: string };
export type AuthState = {
  error?: string;
  step?: "password" | "code" | "enroll";
  email?: string;
  ok?: boolean;
  enroll?: EnrollData;
};

const STATUS_MESSAGE = {
  "en-attente": "Votre compte attend la validation de l'administrateur. Vous serez prévenu par e-mail.",
  refuse: "Cette demande d'accès n'a pas été validée.",
  suspendu: "Ce compte est suspendu. Contactez la direction.",
} as const;

async function registerFailure(user: User) {
  const attempts = user.failedAttempts + 1;
  const locked = attempts >= MAX_FAILED_ATTEMPTS;
  await db
    .update(schema.users)
    .set({ failedAttempts: locked ? 0 : attempts, lockedUntil: locked ? Date.now() + LOCKOUT_DURATION : user.lockedUntil })
    .where(eq(schema.users.id, user.id));
  return locked;
}

function lockedMessage(until: number) {
  const minutes = Math.max(1, Math.ceil((until - Date.now()) / 60_000));
  return `Trop de tentatives. Compte bloqué ${minutes} min.`;
}

/* ───────────── Étape 1 : mot de passe ───────────── */

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = LoginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { step: "password", error: "Renseignez un e-mail et un mot de passe valides." };
  const { email, password } = parsed.data;
  const { ip } = await requestInfo();

  // Limite par adresse IP : empêche d'essayer des mots de passe sur de nombreux comptes à la suite.
  if ((await failuresFromIp(ip, IP_WINDOW)) >= MAX_FAILURES_PER_IP) {
    await audit({ userId: null, actor: "inconnu", action: "connexion.bloquee", targetType: "user", label: `${email} · limite par adresse`, ip });
    return { step: "password", email, error: "Trop de tentatives depuis cette connexion. Réessayez dans 15 minutes." };
  }

  const user = (await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1))[0];

  if (user?.lockedUntil && user.lockedUntil > Date.now()) {
    await audit({ userId: user.id, actor: user.name, action: "connexion.bloquee", targetType: "user", targetId: user.id, ip });
    return { step: "password", email, error: lockedMessage(user.lockedUntil) };
  }

  // Sans compte, on calcule quand même un hachage : le temps de réponse ne trahit pas l'existence de l'adresse.
  const ok = user ? await verifyPassword(password, user.passwordHash) : (await hashPassword(password), false);

  if (!user || !ok) {
    const locked = user ? await registerFailure(user) : false;
    await audit({
      userId: user?.id ?? null,
      actor: user?.name ?? "inconnu",
      action: locked ? "connexion.bloquee" : "connexion.echec",
      targetType: "user",
      targetId: user?.id ?? null,
      label: email,
      ip,
    });
    return {
      step: "password",
      email,
      // Même message que l'adresse existe ou non : rien ne trahit les comptes enregistrés.
      error: locked
        ? lockedMessage(Date.now() + LOCKOUT_DURATION)
        : "Identifiants incorrects. Vérifiez l'adresse et le mot de passe : après 5 essais, le compte se bloque 5 minutes.",
    };
  }

  // Le statut n'est révélé qu'après un mot de passe correct : impossible de sonder les comptes.
  if (user.status !== "actif") return { step: "password", email, error: STATUS_MESSAGE[user.status] };

  await createSession(user.id);
  // Première connexion : associer l'application d'authentification avant tout.
  if (!user.totpEnrolledAt) return { step: "enroll", email, enroll: await enrollmentData(user) };
  return { step: "code", email };
}

/* ───────────── Étape 2 : code à usage unique ───────────── */

export async function verifyCodeAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const current = await getCurrent();
  if (!current) return { step: "password", error: "Délai dépassé. Recommencez la connexion." };
  if (current.session.mfaAt) redirect("/engagement");

  const { user, session } = current;
  const { ip } = await requestInfo();
  const code = String(formData.get("code") ?? "");
  const secret = unseal(user.totpSecret, `totp:${user.id}`);

  if (!verifyTotp(secret, code)) {
    const locked = await registerFailure(user);
    await audit({ userId: user.id, actor: user.name, action: "code.echec", targetType: "session", ip });
    if (locked) {
      await db.delete(schema.sessions).where(eq(schema.sessions.id, session.id));
      await clearSessionCookie();
      return { step: "password", email: user.email, error: lockedMessage(Date.now() + LOCKOUT_DURATION) };
    }
    if (!user.totpEnrolledAt) {
      const enroll = await enrollmentData(user);
      return {
        step: "enroll",
        email: user.email,
        enroll,
        error: `Code refusé. Lisez bien l'entrée « ${enroll.issuer} » et vérifiez que l'heure du téléphone est réglée automatiquement.`,
      };
    }
    return { step: "code", email: user.email, error: "Code refusé. Saisissez celui affiché maintenant : il change toutes les 30 secondes." };
  }

  const now = Date.now();
  await db.update(schema.sessions).set({ mfaAt: now }).where(eq(schema.sessions.id, session.id));
  await db
    .update(schema.users)
    .set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: now, totpEnrolledAt: user.totpEnrolledAt ?? now })
    .where(eq(schema.users.id, user.id));
  if (!user.totpEnrolledAt) await audit({ userId: user.id, actor: user.name, action: "code.enrole", targetType: "user", targetId: user.id, ip });
  await audit({ userId: user.id, actor: user.name, action: "connexion.reussie", targetType: "session", ip });

  // Engagement déjà signé sur cet appareil depuis moins de 30 jours : il vaut pour cette session, et c'est journalisé.
  const signedUntil = await rememberedEngagement(user.id);
  if (signedUntil) {
    await db.update(schema.sessions).set({ ndaAt: Date.now() }).where(eq(schema.sessions.id, session.id));
    const until = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" }).format(signedUntil);
    await audit({
      userId: user.id,
      actor: user.name,
      action: "confidentialite.acceptee",
      targetType: "session",
      label: `appareil reconnu · valable jusqu'au ${until}`,
      ip,
    });
    redirect("/espace");
  }
  redirect("/engagement");
}

export async function cancelLoginAction() {
  const current = await getCurrent();
  if (current) await db.delete(schema.sessions).where(eq(schema.sessions.id, current.session.id));
  await clearSessionCookie();
  redirect("/connexion");
}

/* ───────────── Engagement de confidentialité ───────────── */

export async function acceptNdaAction() {
  const current = await getCurrent();
  if (!current?.session.mfaAt) redirect("/connexion");
  if (!current.session.ndaAt) {
    const { ip } = await requestInfo();
    await db.update(schema.sessions).set({ ndaAt: Date.now() }).where(eq(schema.sessions.id, current.session.id));
    await audit({
      userId: current.user.id,
      actor: current.user.name,
      action: "confidentialite.acceptee",
      targetType: "session",
      label: "signé · valable 30 jours sur cet appareil",
      ip,
    });
    await rememberEngagement(current.user.id);
  }
  redirect("/espace");
}

/* ───────────── Déconnexion, verrou, accès renforcé ───────────── */

export async function logoutAction() {
  const current = await getCurrent();
  if (current) {
    const { ip } = await requestInfo();
    await db.delete(schema.sessions).where(eq(schema.sessions.id, current.session.id));
    await audit({ userId: current.user.id, actor: current.user.name, action: "deconnexion", targetType: "session", ip });
  }
  await clearSessionCookie();
  redirect("/connexion");
}

export async function lockAction(from?: string) {
  const current = await getCurrent();
  if (!current?.session.mfaAt) redirect("/connexion");
  if (!current.session.lockedAt) {
    const { ip } = await requestInfo();
    await db.update(schema.sessions).set({ lockedAt: Date.now(), elevatedUntil: null }).where(eq(schema.sessions.id, current.session.id));
    await audit({ userId: current.user.id, actor: current.user.name, action: "session.verrouillee", targetType: "session", ip });
  }
  const next = from && from.startsWith("/espace") ? `?retour=${encodeURIComponent(from)}` : "";
  redirect(`/verrou${next}`);
}

export async function unlockAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const current = await getCurrent();
  if (!current?.session.mfaAt) redirect("/connexion");
  const { user, session } = current;
  const password = String(formData.get("password") ?? "");
  const back = String(formData.get("retour") ?? "");
  const { ip } = await requestInfo();

  if (!(await verifyPassword(password, user.passwordHash))) {
    const locked = await registerFailure(user);
    if (locked) {
      await db.delete(schema.sessions).where(eq(schema.sessions.id, session.id));
      await clearSessionCookie();
      await audit({ userId: user.id, actor: user.name, action: "connexion.bloquee", targetType: "session", ip });
      redirect("/connexion");
    }
    return { error: "Mot de passe incorrect." };
  }

  await db.update(schema.sessions).set({ lockedAt: null }).where(eq(schema.sessions.id, session.id));
  await db.update(schema.users).set({ failedAttempts: 0 }).where(eq(schema.users.id, user.id));
  await audit({ userId: user.id, actor: user.name, action: "session.deverrouillee", targetType: "session", ip });
  redirect(back.startsWith("/espace") ? back : "/espace");
}

export async function elevateAction(code: string): Promise<{ ok: boolean; error?: string; until?: number }> {
  const { user, session } = await requireAccess();
  const { ip } = await requestInfo();
  const secret = unseal(user.totpSecret, `totp:${user.id}`);
  if (!verifyTotp(secret, code)) {
    await audit({ userId: user.id, actor: user.name, action: "code.echec", targetType: "session", ip });
    return { ok: false, error: "Code refusé. Saisissez celui affiché maintenant : il change toutes les 30 secondes." };
  }
  const until = Date.now() + ELEVATION_TTL;
  await db.update(schema.sessions).set({ elevatedUntil: until }).where(eq(schema.sessions.id, session.id));
  await audit({ userId: user.id, actor: user.name, action: "session.elevee", targetType: "session", ip });
  return { ok: true, until };
}
