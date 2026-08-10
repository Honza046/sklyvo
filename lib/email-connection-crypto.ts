/**
 * AES-256-GCM at-rest encryption for mailbox / OAuth secrets.
 * Format: `enc:v1:<ivB64>:<tagB64>:<cipherB64>`
 * Legacy SMTP payloads without prefix are still decrypted the old way.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";

function getEncryptionKey(): Buffer {
  const secret =
    process.env.EMAIL_CREDENTIALS_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    "";
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "EMAIL_CREDENTIALS_SECRET or SESSION_SECRET required for credential encryption",
      );
    }
    return createHash("sha256")
      .update("sklyvo-dev-email-credentials-key")
      .digest();
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

/** @deprecated alias — SMTP paths */
export function encryptEmailSecret(plainText: string): string {
  return encryptSecret(plainText);
}

function decryptPayload(payload: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = payload.split(":");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv(
      ALGORITHM,
      getEncryptionKey(),
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

/**
 * Decrypt secret. Supports enc:v1:… and legacy iv:tag:data.
 * If value is not encrypted (plaintext OAuth migration), returns as-is.
 */
export function decryptSecret(payload: string | null | undefined): string | null {
  const raw = payload?.trim();
  if (!raw) return null;

  if (raw.startsWith(PREFIX)) {
    return decryptPayload(raw.slice(PREFIX.length));
  }

  // Legacy SMTP format (3 base64 parts)
  if (raw.includes(":") && raw.split(":").length === 3) {
    const legacy = decryptPayload(raw);
    if (legacy != null) return legacy;
  }

  // Plaintext migration path (pre-encryption Google/MS tokens)
  return raw;
}

/** @deprecated alias */
export function decryptEmailSecret(payload: string): string | null {
  return decryptSecret(payload);
}

export function isEncryptedSecret(payload: string | null | undefined): boolean {
  const raw = payload?.trim();
  if (!raw) return false;
  if (raw.startsWith(PREFIX)) return true;
  return raw.includes(":") && raw.split(":").length === 3;
}
