import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Candidate key materials — newest first.
 * After SESSION_SECRET rotation, old TOTP blobs still decrypt via legacy keys,
 * then get re-encrypted on next successful verify.
 */
function candidateKeyMaterials(): string[] {
  const keys = [
    process.env.TOTP_SECRET_KEY?.trim(),
    process.env.SESSION_SECRET?.trim(),
    process.env.NEXTAUTH_SECRET?.trim(),
    // Historical local fallbacks (pre-SESSION_SECRET / early sklyvo-dev)
    "sklyvo-dev-totp-key",
    "dev-only-session-secret-change-me-32b",
  ].filter((k): k is string => Boolean(k && k.length > 0));

  return Array.from(new Set(keys));
}

function keyFromMaterial(material: string): Buffer {
  return createHash("sha256").update(material).digest();
}

function getTotpKey(): Buffer {
  const preferred =
    process.env.TOTP_SECRET_KEY?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "sklyvo-dev-totp-key";
  return keyFromMaterial(preferred);
}

export function encryptTotpSecret(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getTotpKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

function tryDecryptWithKey(payload: string, key: Buffer): string | null {
  try {
    const [ivB64, tagB64, dataB64] = payload.split(":");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

export function decryptTotpSecret(payload: string): string | null {
  for (const material of candidateKeyMaterials()) {
    const plain = tryDecryptWithKey(payload, keyFromMaterial(material));
    if (plain) return plain;
  }
  return null;
}

/** True when payload decrypts only with a non-primary key (needs re-encrypt). */
export function totpSecretNeedsReencrypt(payload: string): boolean {
  const primary = tryDecryptWithKey(payload, getTotpKey());
  if (primary) return false;
  return decryptTotpSecret(payload) != null;
}
