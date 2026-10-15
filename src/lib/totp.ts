import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { safeEqual } from "./crypto";

// Codes à usage unique basés sur le temps (RFC 6238) : SHA-1, 6 chiffres, pas de 30 s.
// Compatible avec toute application d'authentification (Google Authenticator, 1Password, Aegis…).

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const TOTP_PERIOD = 30;

export function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32Decode(secret: string): Buffer {
  const clean = secret.replace(/=+$/, "").toUpperCase();
  let bits = "";
  for (const c of clean) {
    const v = ALPHABET.indexOf(c);
    if (v < 0) throw new Error("Secret base32 invalide.");
    bits += v.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac("sha1", base32Decode(secret)).update(buf).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const code = (mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

export function totpNow(secret: string, at = Date.now()): { code: string; remaining: number } {
  const step = Math.floor(at / 1000 / TOTP_PERIOD);
  const remaining = TOTP_PERIOD - (Math.floor(at / 1000) % TOTP_PERIOD);
  return { code: hotp(secret, step), remaining };
}

// Tolère un pas de décalage d'horloge de part et d'autre.
export function verifyTotp(secret: string, code: string, at = Date.now()): boolean {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const step = Math.floor(at / 1000 / TOTP_PERIOD);
  return [-1, 0, 1].some((d) => safeEqual(hotp(secret, step + d), clean));
}
