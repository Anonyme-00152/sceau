import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";

export type Role = "direction" | "gestionnaire" | "lecteur";
export type AccountStatus = "en-attente" | "actif" | "refuse" | "suspendu";
export type Sensitivity = "standard" | "restreint" | "secret";
export type ClientStatus = "actif" | "prospect" | "en-pause" | "archive";
export type ClientKind = "particulier" | "entreprise";
export type EventKind = "appel" | "rendez-vous" | "email" | "note";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  role: text("role").$type<Role>().notNull(),
  passwordHash: text("password_hash").notNull(),
  // Secret TOTP chiffré (AES-256-GCM) — jamais stocké en clair.
  totpSecret: text("totp_secret").notNull(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: integer("locked_until"),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
  lastLoginAt: integer("last_login_at"),
  // Cycle de vie du compte : une inscription reste « en attente » jusqu'à validation par e-mail.
  status: text("status").$type<AccountStatus>().notNull().default("actif"),
  // Date à laquelle le membre a associé son application d'authentification (null = à faire).
  totpEnrolledAt: integer("totp_enrolled_at"),
  requestNote: text("request_note"),
  requestIp: text("request_ip"),
  // Empreintes du lien et du code de validation envoyés à l'administrateur.
  approvalTokenHash: text("approval_token_hash"),
  approvalCodeHash: text("approval_code_hash"),
  approvalExpiresAt: integer("approval_expires_at"),
  approvedBy: text("approved_by"),
  approvedAt: integer("approved_at"),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    // Empreinte SHA-256 du jeton : le jeton lui-même ne vit que dans le cookie.
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
    mfaAt: integer("mfa_at"),
    ndaAt: integer("nda_at"),
    lockedAt: integer("locked_at"),
    elevatedUntil: integer("elevated_until"),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const clients = sqliteTable(
  "clients",
  {
    id: text("id").primaryKey(),
    ref: text("ref").notNull().unique(),
    kind: text("kind").$type<ClientKind>().notNull(),
    displayName: text("display_name").notNull(),
    company: text("company"),
    sector: text("sector"),
    city: text("city"),
    country: text("country").notNull().default("France"),
    status: text("status").$type<ClientStatus>().notNull(),
    sensitivity: text("sensitivity").$type<Sensitivity>().notNull(),
    ownerId: text("owner_id").notNull().references(() => users.id),
    // Profil complet, chiffré en un seul bloc et lié à l'identifiant du dossier (AAD).
    sealed: text("sealed").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("clients_name_idx").on(t.displayName)],
);

export const clientAccess = sqliteTable(
  "client_access",
  {
    clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    grantedBy: text("granted_by").notNull(),
    grantedAt: integer("granted_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.clientId, t.userId] })],
);

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id),
    kind: text("kind").$type<EventKind>().notNull(),
    // Contenu chiffré.
    body: text("body").notNull(),
    at: integer("at").notNull(),
  },
  (t) => [index("events_client_idx").on(t.clientId)],
);

export const auditLog = sqliteTable("audit_log", {
  seq: integer("seq").primaryKey({ autoIncrement: true }),
  at: integer("at").notNull(),
  userId: text("user_id"),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  label: text("label"),
  ip: text("ip"),
  prevHash: text("prev_hash").notNull(),
  hash: text("hash").notNull(),
});

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;
