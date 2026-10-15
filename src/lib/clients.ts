import "server-only";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { unseal, unsealJson } from "./crypto";
import { accessibleIds, canEdit, canManageAccess, revealRule } from "./access";
import { FIELD_INDEX, displayValue, maskShape, visibleSections, type CustomField, type ModuleId, type Profile } from "./fields";
import type { Client, ClientStatus, Sensitivity, User } from "./db/schema";

export type ClientRow = Pick<
  Client,
  "id" | "ref" | "kind" | "displayName" | "company" | "sector" | "city" | "country" | "status" | "sensitivity" | "updatedAt"
> & { ownerName: string; access: boolean; members: number };

export async function listClients(
  user: User,
  filters: { q?: string; status?: string; sensitivity?: string } = {},
): Promise<ClientRow[]> {
  const ids = await accessibleIds(user.id);
  const conditions = [];
  if (filters.q) {
    const q = `%${filters.q.trim()}%`;
    conditions.push(or(like(schema.clients.displayName, q), like(schema.clients.ref, q), like(schema.clients.city, q), like(schema.clients.sector, q)));
  }
  if (filters.status) conditions.push(eq(schema.clients.status, filters.status as ClientStatus));
  if (filters.sensitivity) conditions.push(eq(schema.clients.sensitivity, filters.sensitivity as Sensitivity));
  // Hors direction, on ne liste que les dossiers accessibles : l'existence même des autres reste invisible.
  if (user.role !== "direction") {
    if (ids.size === 0) return [];
    conditions.push(inArray(schema.clients.id, [...ids]));
  }

  const members = db
    .select({ clientId: schema.clientAccess.clientId, n: sql<number>`count(*)`.as("n") })
    .from(schema.clientAccess)
    .groupBy(schema.clientAccess.clientId)
    .as("members");

  const rows = await db
    .select({
      id: schema.clients.id,
      ref: schema.clients.ref,
      kind: schema.clients.kind,
      displayName: schema.clients.displayName,
      company: schema.clients.company,
      sector: schema.clients.sector,
      city: schema.clients.city,
      country: schema.clients.country,
      status: schema.clients.status,
      sensitivity: schema.clients.sensitivity,
      updatedAt: schema.clients.updatedAt,
      ownerName: schema.users.name,
      members: members.n,
    })
    .from(schema.clients)
    .innerJoin(schema.users, eq(schema.clients.ownerId, schema.users.id))
    .leftJoin(members, eq(members.clientId, schema.clients.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.clients.updatedAt));

  return rows.map((r) => ({ ...r, members: Number(r.members ?? 0), access: ids.has(r.id) }));
}

export async function getClientMeta(id: string) {
  const rows = await db
    .select({ client: schema.clients, ownerName: schema.users.name })
    .from(schema.clients)
    .innerJoin(schema.users, eq(schema.clients.ownerId, schema.users.id))
    .where(eq(schema.clients.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export function readProfile(client: Pick<Client, "id" | "sealed">): Profile {
  return unsealJson<Profile>(client.sealed, `client:${client.id}`);
}

export type FieldView =
  | { key: string; label: string; state: "plain"; value: string; multiline?: boolean; wide?: boolean }
  | {
      key: string;
      label: string;
      state: "sealed";
      shape: string;
      empty: boolean;
      critical: boolean;
      allowed: boolean;
      needsElevation: boolean;
      reason?: string;
      multiline?: boolean;
      wide?: boolean;
    };

/** Vue d'un dossier : les champs sensibles quittent le serveur masqués, jamais en clair. */
export function buildFieldViews(user: User, client: Client, profile: Profile, modules: readonly ModuleId[]) {
  const sections = visibleSections(modules, client.kind).map((section) => ({
    id: section.id,
    index: section.index,
    label: section.label,
    fields: section.fields
      .map((f): FieldView | null => {
        const value = profile.values[f.key] ?? "";
        // Un champ vide n'a rien à afficher, scellé ou non.
        if (!value) return null;
        if (!f.sensitive) {
          return { key: f.key, label: f.label, state: "plain", value: displayValue(f, value), multiline: f.multiline, wide: f.wide };
        }
        const rule = revealRule(user, client, f.key);
        return {
          key: f.key,
          label: f.label,
          state: "sealed",
          shape: maskShape(value.length),
          empty: !value,
          critical: !!f.critical,
          allowed: rule.allowed,
          needsElevation: rule.needsElevation,
          reason: rule.reason,
          multiline: f.multiline,
          wide: f.wide,
        };
      })
      .filter((f): f is FieldView => f !== null),
  })).filter((s) => s.fields.length > 0);

  const custom: FieldView[] = profile.custom.map((c) => {
    if (!c.sensitive) return { key: `custom:${c.id}`, label: c.label, state: "plain", value: c.value };
    const rule = revealRule(user, client, `custom:${c.id}`, true);
    return {
      key: `custom:${c.id}`,
      label: c.label,
      state: "sealed",
      shape: maskShape(c.value.length),
      empty: !c.value,
      critical: false,
      allowed: rule.allowed,
      needsElevation: rule.needsElevation,
    };
  });

  return { sections, custom };
}

export function fieldLabel(key: string, profile: Profile) {
  if (key.startsWith("custom:")) return profile.custom.find((c) => `custom:${c.id}` === key)?.label ?? "Champ libre";
  return FIELD_INDEX[key]?.label ?? key;
}

export function fieldValue(key: string, profile: Profile): { value: string; sensitive: boolean } | null {
  if (key.startsWith("custom:")) {
    const c = profile.custom.find((x) => `custom:${x.id}` === key);
    return c ? { value: c.value, sensitive: c.sensitive } : null;
  }
  const def = FIELD_INDEX[key];
  if (!def) return null;
  return { value: displayValue(def, profile.values[key] ?? ""), sensitive: !!def.sensitive };
}

export async function clientMembers(clientId: string) {
  return db
    .select({
      userId: schema.users.id,
      name: schema.users.name,
      title: schema.users.title,
      role: schema.users.role,
      grantedBy: schema.clientAccess.grantedBy,
      grantedAt: schema.clientAccess.grantedAt,
    })
    .from(schema.clientAccess)
    .innerJoin(schema.users, eq(schema.clientAccess.userId, schema.users.id))
    .where(eq(schema.clientAccess.clientId, clientId))
    .orderBy(schema.clientAccess.grantedAt);
}

export async function clientEvents(clientId: string) {
  const rows = await db
    .select({ event: schema.events, author: schema.users.name })
    .from(schema.events)
    .innerJoin(schema.users, eq(schema.events.userId, schema.users.id))
    .where(eq(schema.events.clientId, clientId))
    .orderBy(desc(schema.events.at));
  return rows.map(({ event, author }) => ({
    id: event.id,
    kind: event.kind,
    at: event.at,
    author,
    body: unseal(event.body, `event:${event.id}`),
  }));
}

export async function nextRef() {
  const rows = await db.select({ ref: schema.clients.ref }).from(schema.clients);
  const max = rows.reduce((m, r) => Math.max(m, Number(r.ref.replace(/\D/g, "")) || 0), 100);
  return `SC-${String(max + 1).padStart(4, "0")}`;
}

export const permissions = (user: User) => ({ edit: canEdit(user), manage: canManageAccess(user) });

export type { CustomField };
