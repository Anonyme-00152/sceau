import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/* ───────────────────────── Clé maîtresse ───────────────────────── */

let cachedKey: Buffer | null = null;

function masterKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.SCEAU_MASTER_KEY;
  if (!raw) throw new Error("SCEAU_MASTER_KEY manquante : lancez `npm run setup`.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("SCEAU_MASTER_KEY doit faire 32 octets (base64).");
  cachedKey = key;
  return key;
}

/* ─────────────────── Chiffrement AES-256-GCM (au repos) ─────────────────── */

// Format : v1.<iv>.<tag>.<texte chiffré>, en base64url.
// L'AAD lie chaque bloc chiffré à son dossier : un bloc copié vers un autre dossier ne se déchiffre pas.
export function seal(plaintext: string, aad: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  cipher.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".");
}

export function unseal(payload: string, aad: string): string {
  const [version, iv, tag, ct] = payload.split(".");
  if (version !== "v1" || !iv || !tag || ct === undefined) throw new Error("Bloc scellé invalide.");
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}

export function sealJson(value: unknown, aad: string): string {
  return seal(JSON.stringify(value), aad);
}

export function unsealJson<T>(payload: string, aad: string): T {
  return JSON.parse(unseal(payload, aad)) as T;
}

/* ───────────────────────── Mots de passe (scrypt) ───────────────────────── */

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64url"), hash.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scrypt(password, Buffer.from(salt, "base64url"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/* ───────────────────────── Jetons & empreintes ───────────────────────── */

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
