// Où se trouve la base : fichier local (installation sur un PC) ou Turso (en ligne).
// Partagé par l'application et par les scripts — aucune dépendance serveur.

export function databaseConfig() {
  const url = process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL ?? "file:./data/sceau.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;
  return { url, authToken };
}

export const isLocalDatabase = (url: string) => url.startsWith("file:");
