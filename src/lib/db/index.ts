import "server-only";
import { createClient, type Client as LibsqlClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { databaseConfig } from "./config";

const globalForDb = globalThis as unknown as { __sceauLibsql?: LibsqlClient };

const client = globalForDb.__sceauLibsql ?? createClient(databaseConfig());

if (process.env.NODE_ENV !== "production") globalForDb.__sceauLibsql = client;

export const db = drizzle(client, { schema });
/** Client libSQL brut, pour les opérations hors ORM (sauvegarde, remise à zéro de la démo). */
export const libsql = client;
export { schema };
