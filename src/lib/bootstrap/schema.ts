import type { Client } from "@libsql/client";

// Schéma de la base, partagé par l'installation locale, la compilation en ligne et la remise à zéro de la démo.

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  role TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  totp_secret TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER,
  status TEXT NOT NULL DEFAULT 'actif',
  totp_enrolled_at INTEGER,
  request_note TEXT,
  request_ip TEXT,
  approval_token_hash TEXT,
  approval_code_hash TEXT,
  approval_expires_at INTEGER,
  approved_by TEXT,
  approved_at INTEGER
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  mfa_at INTEGER,
  nda_at INTEGER,
  locked_at INTEGER,
  elevated_until INTEGER,
  ip TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  display_name TEXT NOT NULL,
  company TEXT,
  sector TEXT,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'France',
  status TEXT NOT NULL,
  sensitivity TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  sealed TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS clients_name_idx ON clients(display_name);
CREATE TABLE IF NOT EXISTS client_access (
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by TEXT NOT NULL,
  granted_at INTEGER NOT NULL,
  PRIMARY KEY (client_id, user_id)
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS events_client_idx ON events(client_id);
CREATE TABLE IF NOT EXISTS audit_log (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  user_id TEXT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  label TEXT,
  ip TEXT,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_ip_idx ON audit_log(ip, at);
`;

// Colonnes ajoutées après la première version : une base plus ancienne est complétée sans perte.
const USER_COLUMNS: [string, string][] = [
  ["status", "TEXT NOT NULL DEFAULT 'actif'"],
  ["totp_enrolled_at", "INTEGER"],
  ["request_note", "TEXT"],
  ["request_ip", "TEXT"],
  ["approval_token_hash", "TEXT"],
  ["approval_code_hash", "TEXT"],
  ["approval_expires_at", "INTEGER"],
  ["approved_by", "TEXT"],
  ["approved_at", "INTEGER"],
];

/** Crée les tables manquantes et met à niveau une base existante. Renvoie les colonnes ajoutées. */
export async function prepareDatabase(client: Client, { local }: { local: boolean }) {
  // Le mode WAL n'a de sens que pour un fichier local ; Turso gère lui-même la journalisation.
  await client.executeMultiple((local ? "PRAGMA journal_mode = WAL;" : "") + "PRAGMA foreign_keys = ON;" + DDL);

  const existing = new Set((await client.execute("PRAGMA table_info(users)")).rows.map((r) => String(r.name)));
  const added: string[] = [];
  for (const [col, type] of USER_COLUMNS) {
    if (existing.has(col)) continue;
    await client.execute(`ALTER TABLE users ADD COLUMN ${col} ${type}`);
    if (col === "totp_enrolled_at") await client.execute("UPDATE users SET totp_enrolled_at = created_at");
    added.push(col);
  }
  return added;
}

/** Vide entièrement la base (tables supprimées puis recréées par prepareDatabase). */
export async function wipeDatabase(client: Client) {
  await client.executeMultiple(
    [
      "PRAGMA foreign_keys = OFF;",
      "DROP TABLE IF EXISTS events;",
      "DROP TABLE IF EXISTS client_access;",
      "DROP TABLE IF EXISTS clients;",
      "DROP TABLE IF EXISTS sessions;",
      "DROP TABLE IF EXISTS audit_log;",
      "DROP TABLE IF EXISTS settings;",
      "DROP TABLE IF EXISTS users;",
      "PRAGMA foreign_keys = ON;",
    ].join("\n"),
  );
}

export async function userCount(client: Client) {
  const res = await client.execute("SELECT COUNT(*) AS n FROM users");
  return Number(res.rows[0].n);
}

/** Enregistre les modules de fiche actifs, sans écraser un choix déjà fait. */
export async function ensureModules(client: Client, modules: string[]) {
  await client.execute({
    sql: "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('modules', ?, ?)",
    args: [JSON.stringify(modules), Date.now()],
  });
}
