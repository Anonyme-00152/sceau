import "server-only";
import { and, count, desc, eq, gte, like, sql, type SQL } from "drizzle-orm";
import { db, schema } from "./db";
import type { User } from "./db/schema";

// Portée du journal : la direction voit tout, les autres membres leurs propres actions.
function scope(user: User): SQL | undefined {
  return user.role === "direction" ? undefined : eq(schema.auditLog.userId, user.id);
}

export async function recentActivity(user: User, limit = 8) {
  return db.select().from(schema.auditLog).where(scope(user)).orderBy(desc(schema.auditLog.seq)).limit(limit);
}

export const PAGE_SIZE = 40;

export async function listAudit(user: User, opts: { page?: number; action?: string; q?: string }) {
  const page = Math.max(1, opts.page ?? 1);
  const conditions = [scope(user)];
  if (opts.action) conditions.push(like(schema.auditLog.action, `${opts.action}%`));
  if (opts.q) conditions.push(sql`(${schema.auditLog.actor} LIKE ${`%${opts.q}%`} OR ${schema.auditLog.label} LIKE ${`%${opts.q}%`})`);
  const where = and(...conditions.filter(Boolean));
  const [rows, total] = await Promise.all([
    db
      .select()
      .from(schema.auditLog)
      .where(where)
      .orderBy(desc(schema.auditLog.seq))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(schema.auditLog).where(where),
  ]);
  return { rows, total: total[0]?.n ?? 0, page, pages: Math.max(1, Math.ceil((total[0]?.n ?? 0) / PAGE_SIZE)) };
}

export async function revealsToday(userId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const rows = await db
    .select({ n: count() })
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.userId, userId), eq(schema.auditLog.action, "champ.revele"), gte(schema.auditLog.at, start.getTime())));
  return rows[0]?.n ?? 0;
}

/** Échecs d'identification depuis une adresse IP sur une fenêtre récente (limite anti-force brute). */
export async function failuresFromIp(ip: string, windowMs: number) {
  const rows = await db
    .select({ n: count() })
    .from(schema.auditLog)
    .where(
      and(
        eq(schema.auditLog.ip, ip),
        gte(schema.auditLog.at, Date.now() - windowMs),
        sql`${schema.auditLog.action} IN ('connexion.echec', 'connexion.bloquee', 'code.echec')`,
      ),
    );
  return rows[0]?.n ?? 0;
}

/** Connexion précédente (celle d'avant la session en cours). */
export async function previousLogin(userId: string) {
  const rows = await db
    .select({ at: schema.auditLog.at })
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.userId, userId), eq(schema.auditLog.action, "connexion.reussie")))
    .orderBy(desc(schema.auditLog.seq))
    .limit(1)
    .offset(1);
  return rows[0]?.at ?? null;
}

/** Le membre a-t-il déjà consulté ce dossier il y a moins de 5 minutes ? */
export async function recentlyConsulted(userId: string, clientId: string) {
  const rows = await db
    .select({ seq: schema.auditLog.seq })
    .from(schema.auditLog)
    .where(
      and(
        eq(schema.auditLog.userId, userId),
        eq(schema.auditLog.targetId, clientId),
        eq(schema.auditLog.action, "client.consulte"),
        gte(schema.auditLog.at, Date.now() - 5 * 60_000),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function failedLoginsLastDays(days: number) {
  const since = Date.now() - days * 86_400_000;
  const rows = await db
    .select({ n: count() })
    .from(schema.auditLog)
    .where(and(like(schema.auditLog.action, "connexion.%"), sql`${schema.auditLog.action} != 'connexion.reussie'`, gte(schema.auditLog.at, since)));
  return rows[0]?.n ?? 0;
}
