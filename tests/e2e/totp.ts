import { createHmac } from "node:crypto";

// RFC 6238 time-based one-time passwords, computed locally so an E2E run never depends on an
// external authenticator. The implementation is deliberately small and explicit: the whole point is
// that a reader can see exactly which factors the fixture is asserting against.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function decodeBase32(secret: string): Buffer {
  const normalized = secret.replace(/=+$/g, "").toUpperCase();
  let bits = "";
  for (const character of normalized) {
    const value = ALPHABET.indexOf(character);
    if (value < 0) throw new Error("The local TOTP fixture is unavailable.");
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes = bits.match(/.{8}/g)?.map((part) => parseInt(part, 2)) ?? [];
  return Buffer.from(bytes);
}

export function totp(secret: string, now = Date.now()): string {
  const key = decodeBase32(secret);
  const counter = Math.floor(now / 30_000);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return (binary % 1_000_000).toString().padStart(6, "0");
}

/**
 * A six digit code that no current or near-future time window accepts.
 *
 * A deliberately wrong code proves the challenge is actually verified; a missing or malformed code
 * would only prove the field is required, which the browser enforces on its own.
 */
export function invalidTotp(secret: string, now = Date.now()): string {
  const validWindowCodes = new Set([-90, -60, -30, 0, 30, 60, 90].map((offset) => totp(secret, now + offset)));
  for (let candidate = 0; candidate < 1_000_000; candidate += 1) {
    const code = candidate.toString().padStart(6, "0");
    if (!validWindowCodes.has(code)) return code;
  }
  throw new Error("Local TOTP fixture is unavailable.");
}