import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export function looksLikeBcryptHash(value: string): boolean {
  return /^\$2[aby]?\$\d{2}\$/.test(value);
}

/** OAuth placeholder hashes — never match a real password login. */
export function isOAuthPasswordPlaceholder(value: string): boolean {
  return value.startsWith("__oauth__");
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/**
 * Verify password. Supports legacy plaintext (one-time migrate to bcrypt).
 * Returns `{ ok, needsRehash }` so caller can upgrade stored hash.
 */
export async function verifyPassword(
  plain: string,
  stored: string | null | undefined,
): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (!stored) return { ok: false, needsRehash: false };
  if (isOAuthPasswordPlaceholder(stored)) {
    return { ok: false, needsRehash: false };
  }
  if (looksLikeBcryptHash(stored)) {
    const ok = await bcrypt.compare(plain, stored);
    return { ok, needsRehash: false };
  }
  // Legacy plaintext
  if (stored === plain) {
    return { ok: true, needsRehash: true };
  }
  return { ok: false, needsRehash: false };
}
