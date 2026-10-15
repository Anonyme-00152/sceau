"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { seal, sealJson, sha256 } from "@/lib/crypto";
import { audit, verifyChain } from "@/lib/audit";
import { requestInfo } from "@/lib/request";
import { isElevated, requireAccess } from "@/lib/session";
import { canCreate, canEdit, canManageAccess, hasAccess, revealRule } from "@/lib/access";
import { fieldLabel, fieldValue, getClientMeta, nextRef, readProfile } from "@/lib/clients";
import { SECTIONS, type CustomField, type Profile } from "@/lib/fields";
import type { ClientKind, ClientStatus, EventKind, Sensitivity } from "@/lib/db/schema";

/* ───────────── Révélation d'une donnée scellée ───────────── */

export type RevealResult =
  | { ok: true; value: string }
  | { ok: false; error: string; needsElevation?: boolean };

export async function revealFieldAction(clientId: string, key: string): Promise<RevealResult> {
  const { user, session } = await requireAccess();
  const meta = await getClientMeta(clientId);
  if (!meta || !(await hasAccess(user.id, clientId))) return { ok: false, error: "Accès refusé." };
  const { client } = meta;
  const profile = readProfile(client);
  const field = fieldValue(key, profile);
  if (!field) return { ok: false, error: "Champ inconnu." };

  const rule = revealRule(user, client, key, field.sensitive);
  if (!rule.allowed) return { ok: false, error: rule.reason ?? "Révélation non autorisée." };
  if (rule.needsElevation && !isElevated(session)) return { ok: false, error: "Accès renforcé requis.", needsElevation: true };

  const { ip } = await requestInfo();
  await audit({
    userId: user.id,
    actor: user.name,
    action: "champ.revele",
    targetType: "client",
    targetId: client.id,
    label: `${client.ref} · ${fieldLabel(key, profile)}`,
    ip,
  });
  return { ok: true, value: field.value };
}

export async function logCopyAction(clientId: string, key: string) {
  const { user } = await requireAccess();
  const meta = await getClientMeta(clientId);
  if (!meta || !(await hasAccess(user.id, clientId))) return;
  const profile = readProfile(meta.client);
  const { ip } = await requestInfo();
  await audit({
    userId: user.id,
    actor: user.name,
    action: "champ.copie",
    targetType: "client",
    targetId: clientId,
    label: `${meta.client.ref} · ${fieldLabel(key, profile)}`,
    ip,
  });
}

/* ───────────── Création et modification d'un dossier ───────────── */

export type ClientFormState = { error?: string; fieldErrors?: Record<string, string> };

const MetaSchema = z.object({
  kind: z.enum(["particulier", "entreprise"]),
  displayName: z.string().trim().min(2, "Nom trop court.").max(120),
  status: z.enum(["actif", "prospect", "en-pause", "archive"]),
  sensitivity: z.enum(["standard", "restreint", "secret"]),
  city: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  sector: z.string().trim().max(80).optional(),
});

function readCustom(formData: FormData, previous: CustomField[]): CustomField[] {
  const ids = formData.getAll("custom.id").map(String);
  const labels = formData.getAll("custom.label").map(String);
  const values = formData.getAll("custom.value").map(String);
  const sensitive = new Set(formData.getAll("custom.sensitive").map(String));
  const out: CustomField[] = [];
  ids.forEach((rawId, i) => {
    const label = labels[i]?.trim().slice(0, 80);
    if (!label) return;
    const id = rawId || randomUUID();
    const prev = previous.find((p) => p.id === rawId);
    const isSensitive = sensitive.has(rawId || `new-${i}`) || sensitive.has(id);
    let value = (values[i] ?? "").slice(0, 2000);
    // Valeur sensible laissée vide en modification : on conserve l'ancienne, jamais renvoyée au navigateur.
    if (!value && prev?.sensitive) value = prev.value;
    out.push({ id, label, value, sensitive: isSensitive });
  });
  return out.slice(0, 40);
}

function readProfileForm(formData: FormData, previous: Profile): Profile {
  const values: Record<string, string> = { ...previous.values };
  for (const section of SECTIONS) {
    for (const f of section.fields) {
      const raw = formData.get(`f.${f.key}`);
      if (raw === null) continue;
      const v = String(raw).slice(0, f.multiline ? 8000 : 400);
      if (f.sensitive && !v && formData.get(`clear.${f.key}`) !== "on") continue;
      values[f.key] = v;
    }
  }
  return { values, custom: readCustom(formData, previous.custom) };
}

function parseMeta(formData: FormData) {
  return MetaSchema.safeParse({
    kind: formData.get("kind"),
    displayName: formData.get("displayName"),
    status: formData.get("status"),
    sensitivity: formData.get("sensitivity"),
    city: formData.get("city") || undefined,
    country: formData.get("country") || undefined,
    sector: formData.get("sector") || undefined,
  });
}

export async function createClientAction(_prev: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const { user } = await requireAccess();
  if (!canCreate(user)) return { error: "Votre rôle ne permet pas de créer un dossier." };
  const parsed = parseMeta(formData);
  if (!parsed.success) return { error: "Vérifiez les champs signalés.", fieldErrors: flatten(parsed.error) };

  const id = randomUUID();
  const ref = await nextRef();
  const now = Date.now();
  const profile = readProfileForm(formData, { values: {}, custom: [] });
  const m = parsed.data;
  const { ip } = await requestInfo();

  await db.insert(schema.clients).values({
    id,
    ref,
    kind: m.kind as ClientKind,
    displayName: m.displayName,
    company: m.kind === "entreprise" ? profile.values.raisonSociale || m.displayName : null,
    sector: m.sector ?? null,
    city: m.city ?? null,
    country: m.country || "France",
    status: m.status as ClientStatus,
    sensitivity: m.sensitivity as Sensitivity,
    ownerId: user.id,
    sealed: sealJson(profile, `client:${id}`),
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(schema.clientAccess).values({ clientId: id, userId: user.id, grantedBy: "création", grantedAt: now });
  await audit({ userId: user.id, actor: user.name, action: "client.cree", targetType: "client", targetId: id, label: `${ref} · ${m.displayName}`, ip });
  revalidatePath("/espace", "layout");
  redirect(`/espace/clients/${id}`);
}

export async function updateClientAction(clientId: string, _prev: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const { user } = await requireAccess();
  const meta = await getClientMeta(clientId);
  if (!meta || !(await hasAccess(user.id, clientId)) || !canEdit(user)) return { error: "Modification non autorisée." };
  const parsed = parseMeta(formData);
  if (!parsed.success) return { error: "Vérifiez les champs signalés.", fieldErrors: flatten(parsed.error) };

  const previous = readProfile(meta.client);
  const profile = readProfileForm(formData, previous);
  const m = parsed.data;
  const { ip } = await requestInfo();

  await db
    .update(schema.clients)
    .set({
      kind: m.kind as ClientKind,
      displayName: m.displayName,
      company: m.kind === "entreprise" ? profile.values.raisonSociale || m.displayName : null,
      sector: m.sector ?? null,
      city: m.city ?? null,
      country: m.country || "France",
      status: m.status as ClientStatus,
      sensitivity: m.sensitivity as Sensitivity,
      sealed: sealJson(profile, `client:${clientId}`),
      updatedAt: Date.now(),
    })
    .where(eq(schema.clients.id, clientId));
  await audit({
    userId: user.id,
    actor: user.name,
    action: "client.modifie",
    targetType: "client",
    targetId: clientId,
    label: `${meta.client.ref} · ${m.displayName}`,
    ip,
  });
  revalidatePath("/espace", "layout");
  redirect(`/espace/clients/${clientId}`);
}

function flatten(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0])] = issue.message;
  return out;
}

/* ───────────── Échanges ───────────── */

export async function addEventAction(clientId: string, _prev: { error?: string; ok?: number }, formData: FormData) {
  const { user } = await requireAccess();
  const meta = await getClientMeta(clientId);
  if (!meta || !(await hasAccess(user.id, clientId)) || !canEdit(user)) return { error: "Action non autorisée." };
  const kind = String(formData.get("kind")) as EventKind;
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  if (!["appel", "rendez-vous", "email", "note"].includes(kind) || body.length < 2) return { error: "Décrivez l'échange." };
  const id = randomUUID();
  const now = Date.now();
  const { ip } = await requestInfo();
  await db.insert(schema.events).values({ id, clientId, userId: user.id, kind, body: seal(body, `event:${id}`), at: now });
  await db.update(schema.clients).set({ updatedAt: now }).where(eq(schema.clients.id, clientId));
  await audit({ userId: user.id, actor: user.name, action: "echange.ajoute", targetType: "client", targetId: clientId, label: meta.client.ref, ip });
  revalidatePath(`/espace/clients/${clientId}`);
  return { ok: now };
}

/* ───────────── Cloisonnement : accès par dossier ───────────── */

export async function grantAccessAction(clientId: string, formData: FormData) {
  const { user } = await requireAccess();
  const targetId = String(formData.get("userId") ?? "");
  const self = targetId === user.id;
  // La direction gère les accès ; elle peut aussi s'inscrire elle-même, ce qui est journalisé comme tel.
  if (!canManageAccess(user)) return;
  const meta = await getClientMeta(clientId);
  const target = (await db.select().from(schema.users).where(eq(schema.users.id, targetId)).limit(1))[0];
  if (!meta || !target || (await hasAccess(targetId, clientId))) return;
  const { ip } = await requestInfo();
  await db.insert(schema.clientAccess).values({ clientId, userId: targetId, grantedBy: user.name, grantedAt: Date.now() });
  await audit({
    userId: user.id,
    actor: user.name,
    action: "acces.accorde",
    targetType: "client",
    targetId: clientId,
    label: `${meta.client.ref} · ${self ? "auto-inscription" : target.name}`,
    ip,
  });
  revalidatePath(`/espace/clients/${clientId}`);
  revalidatePath("/espace/clients");
}

export async function revokeAccessAction(clientId: string, formData: FormData) {
  const { user } = await requireAccess();
  const targetId = String(formData.get("userId") ?? "");
  if (!canManageAccess(user)) return;
  const meta = await getClientMeta(clientId);
  if (!meta || meta.client.ownerId === targetId) return; // le titulaire garde toujours l'accès
  const target = (await db.select().from(schema.users).where(eq(schema.users.id, targetId)).limit(1))[0];
  if (!target) return;
  const { ip } = await requestInfo();
  await db
    .delete(schema.clientAccess)
    .where(and(eq(schema.clientAccess.clientId, clientId), eq(schema.clientAccess.userId, targetId)));
  await audit({
    userId: user.id,
    actor: user.name,
    action: "acces.retire",
    targetType: "client",
    targetId: clientId,
    label: `${meta.client.ref} · ${target.name}`,
    ip,
  });
  revalidatePath(`/espace/clients/${clientId}`);
  revalidatePath("/espace/clients");
}

/* ───────────── Sessions & journal ───────────── */

export async function revokeSessionAction(formData: FormData) {
  const { user, session } = await requireAccess();
  const target = String(formData.get("sessionId") ?? "");
  const row = (await db.select().from(schema.sessions).where(eq(schema.sessions.id, target)).limit(1))[0];
  if (!row || row.id === session.id) return;
  if (row.userId !== user.id && !canManageAccess(user)) return;
  const owner = (await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, row.userId)).limit(1))[0];
  const { ip } = await requestInfo();
  await db.delete(schema.sessions).where(eq(schema.sessions.id, target));
  await audit({
    userId: user.id,
    actor: user.name,
    action: "session.revoquee",
    targetType: "session",
    targetId: sha256(target).slice(0, 12),
    label: owner?.name,
    ip,
  });
  revalidatePath("/espace/equipe");
}

export async function revokeOtherSessionsAction() {
  const { user, session } = await requireAccess();
  const { ip } = await requestInfo();
  await db.delete(schema.sessions).where(and(eq(schema.sessions.userId, user.id), ne(schema.sessions.id, session.id)));
  await audit({ userId: user.id, actor: user.name, action: "session.revoquee", targetType: "session", label: "toutes les autres sessions", ip });
  revalidatePath("/espace/equipe");
}

export async function verifyChainAction() {
  const { user } = await requireAccess();
  const report = await verifyChain();
  const { ip } = await requestInfo();
  await audit({
    userId: user.id,
    actor: user.name,
    action: "journal.verifie",
    targetType: "journal",
    label: report.ok ? `${report.count} entrées intègres` : `rupture à #${report.brokenAt}`,
    ip,
  });
  revalidatePath("/espace/journal");
  return report;
}
