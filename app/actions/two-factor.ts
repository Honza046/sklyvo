"use server";

import { cookies } from "next/headers";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/session";
import { encryptTotpSecret, decryptTotpSecret, totpSecretNeedsReencrypt } from "@/lib/totp-crypto";
import { SKLYVO_BRAND } from "@/lib/sklyvo-brand";
import {
  PENDING_2FA_COOKIE,
  WEBAUTHN_CHALLENGE_COOKIE,
  createPending2faToken,
  getWebAuthnConfig,
  pending2faCookieOptions,
  verifyPending2faToken,
  webauthnChallengeCookieOptions,
} from "@/lib/two-factor";

async function readSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

async function setSessionCookie(userId: string) {
  const token = await createSessionToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions());
}

async function clearPending2faCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_2FA_COOKIE);
}

function normalizeTotpCode(code: string) {
  return code.replace(/\s+/g, "").trim();
}

function verifyTotpCode(secretBase32: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: SKLYVO_BRAND.name,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
  const delta = totp.validate({ token: normalizeTotpCode(code), window: 1 });
  return delta !== null;
}

export async function getTwoFactorStatus(): Promise<
  | {
      totpEnabled: boolean;
      passkeys: {
        id: string;
        name: string | null;
        createdAt: string;
        lastUsedAt: string | null;
      }[];
    }
  | { error: string }
> {
  const userId = await readSessionUserId();
  if (!userId) return { error: "Nejste přihlášeni." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      totpEnabled: true,
      passkeys: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, createdAt: true, lastUsedAt: true },
      },
    },
  });
  if (!user) return { error: "Účet nebyl nalezen." };

  return {
    totpEnabled: user.totpEnabled,
    passkeys: user.passkeys.map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt.toISOString(),
      lastUsedAt: p.lastUsedAt?.toISOString() ?? null,
    })),
  };
}

export async function beginTotpSetup(): Promise<
  { qrDataUrl: string; secret: string; otpauthUrl: string } | { error: string }
> {
  const userId = await readSessionUserId();
  if (!userId) return { error: "Nejste přihlášeni." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, totpEnabled: true },
  });
  if (!user) return { error: "Účet nebyl nalezen." };
  if (user.totpEnabled) return { error: "Authenticator je už zapnutý." };

  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: SKLYVO_BRAND.name,
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });

  const otpauthUrl = totp.toString();
  await prisma.user.update({
    where: { id: userId },
    data: { totpPendingEnc: encryptTotpSecret(secret.base32) },
  });

  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
  });

  return { qrDataUrl, secret: secret.base32, otpauthUrl };
}

export async function confirmTotpSetup(
  code: string,
): Promise<{ success: true } | { error: string }> {
  const userId = await readSessionUserId();
  if (!userId) return { error: "Nejste přihlášeni." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpPendingEnc: true, totpEnabled: true },
  });
  if (!user) return { error: "Účet nebyl nalezen." };
  if (user.totpEnabled) return { error: "Authenticator je už zapnutý." };
  if (!user.totpPendingEnc)
    return { error: "Nejdřív spusťte nastavení authenticatoru." };

  const secret = decryptTotpSecret(user.totpPendingEnc);
  if (!secret) return { error: "Neplatný stav nastavení. Spusťte znovu." };

  if (!verifyTotpCode(secret, code)) {
    return { error: "Neplatný ověřovací kód." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      totpEnabled: true,
      totpSecretEnc: encryptTotpSecret(secret),
      totpPendingEnc: null,
    },
  });

  return { success: true };
}

export async function disableTotp(input: {
  password: string;
}): Promise<{ success: true } | { error: string }> {
  const userId = await readSessionUserId();
  if (!userId) return { error: "Nejste přihlášeni." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, totpEnabled: true },
  });
  if (!user) return { error: "Účet nebyl nalezen." };
  if (!user.totpEnabled) return { error: "Authenticator není zapnutý." };

  const check = await verifyPassword(input.password, user.passwordHash);
  if (!check.ok) return { error: "Heslo není správné." };

  await prisma.user.update({
    where: { id: userId },
    data: {
      totpEnabled: false,
      totpSecretEnc: null,
      totpPendingEnc: null,
    },
  });

  return { success: true };
}

export async function beginPasskeyRegistration(): Promise<
  { options: PublicKeyCredentialCreationOptionsJSON } | { error: string }
> {
  const userId = await readSessionUserId();
  if (!userId) return { error: "Nejste přihlášeni." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      passkeys: { select: { credentialId: true, transports: true } },
    },
  });
  if (!user) return { error: "Účet nebyl nalezen." };

  const { rpID, rpName } = getWebAuthnConfig();
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email,
    userDisplayName: user.name?.trim() || user.email,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: user.passkeys.map((p) => ({
      id: p.credentialId,
      transports: (p.transports?.split(",") ?? undefined) as
        AuthenticatorTransportFuture[] | undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(
    WEBAUTHN_CHALLENGE_COOKIE,
    JSON.stringify({ type: "reg", userId, challenge: options.challenge }),
    webauthnChallengeCookieOptions(),
  );

  return { options: options as PublicKeyCredentialCreationOptionsJSON };
}

export async function finishPasskeyRegistration(input: {
  response: RegistrationResponseJSON;
  name?: string;
}): Promise<{ success: true } | { error: string }> {
  const userId = await readSessionUserId();
  if (!userId) return { error: "Nejste přihlášeni." };

  const cookieStore = await cookies();
  const raw = cookieStore.get(WEBAUTHN_CHALLENGE_COOKIE)?.value;
  cookieStore.delete(WEBAUTHN_CHALLENGE_COOKIE);
  if (!raw) return { error: "Vypršela výzva pro passkey. Zkuste to znovu." };

  let expected: { type: string; userId: string; challenge: string };
  try {
    expected = JSON.parse(raw);
  } catch {
    return { error: "Neplatná výzva pro passkey." };
  }
  if (expected.type !== "reg" || expected.userId !== userId) {
    return { error: "Neplatná výzva pro passkey." };
  }

  const { rpID, origin } = getWebAuthnConfig();
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: input.response,
      expectedChallenge: expected.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch {
    return { error: "Ověření passkey selhalo." };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { error: "Ověření passkey selhalo." };
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  await prisma.passkeyCredential.create({
    data: {
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      transports: credential.transports?.join(",") ?? null,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      name: input.name?.trim() || "Passkey",
    },
  });

  return { success: true };
}

export async function deletePasskey(input: {
  id: string;
  password: string;
}): Promise<{ success: true } | { error: string }> {
  const userId = await readSessionUserId();
  if (!userId) return { error: "Nejste přihlášeni." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return { error: "Účet nebyl nalezen." };

  const check = await verifyPassword(input.password, user.passwordHash);
  if (!check.ok) return { error: "Heslo není správné." };

  const deleted = await prisma.passkeyCredential.deleteMany({
    where: { id: input.id, userId },
  });
  if (deleted.count === 0) return { error: "Passkey nenalezen." };

  return { success: true };
}

export async function verifyLoginTotp(
  code: string,
): Promise<{ success: true } | { error: string }> {
  const cookieStore = await cookies();
  const userId = await verifyPending2faToken(
    cookieStore.get(PENDING_2FA_COOKIE)?.value,
  );
  if (!userId)
    return { error: "Vypršela dvoufázová výzva. Přihlaste se znovu." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpEnabled: true, totpSecretEnc: true, disabledAt: true },
  });
  if (!user?.totpEnabled || !user.totpSecretEnc) {
    return { error: "Authenticator není u tomto účtu aktivní." };
  }
  if (user.disabledAt) {
    await clearPending2faCookie();
    return { error: "Tento účet byl deaktivován. Kontaktujte podporu." };
  }

  const secret = decryptTotpSecret(user.totpSecretEnc);
  if (!secret) {
    console.error("[2fa] totpSecretEnc decrypt failed — SESSION_SECRET mismatch?");
    // Broken blob after secret rotation — clear so the user is not permanently locked out.
    // They must re-enroll authenticator from Profil after next password login.
    await prisma.user.update({
      where: { id: userId },
      data: {
        totpEnabled: false,
        totpSecretEnc: null,
        totpPendingEnc: null,
      },
    });
    await clearPending2faCookie();
    return {
      error:
        "Authenticator je poškozený (změna šifrovacího klíče). Přihlaste se znovu heslem a 2FA znovu zapněte v profilu.",
    };
  }
  if (!verifyTotpCode(secret, code)) {
    return { error: "Neplatný ověřovací kód." };
  }

  // Po rotaci SESSION_SECRET přepiš blob aktuálním klíčem.
  if (totpSecretNeedsReencrypt(user.totpSecretEnc)) {
    await prisma.user.update({
      where: { id: userId },
      data: { totpSecretEnc: encryptTotpSecret(secret) },
    });
  }

  await clearPending2faCookie();
  await setSessionCookie(userId);
  return { success: true };
}

export async function beginLoginPasskey(): Promise<
  { options: PublicKeyCredentialRequestOptionsJSON } | { error: string }
> {
  const cookieStore = await cookies();
  const userId = await verifyPending2faToken(
    cookieStore.get(PENDING_2FA_COOKIE)?.value,
  );
  if (!userId)
    return { error: "Vypršela dvoufázová výzva. Přihlaste se znovu." };

  const passkeys = await prisma.passkeyCredential.findMany({
    where: { userId },
    select: { credentialId: true, transports: true },
  });
  if (passkeys.length === 0) {
    return { error: "Účet nemá žádný passkey." };
  }

  const { rpID } = getWebAuthnConfig();
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: passkeys.map((p) => ({
      id: p.credentialId,
      transports: (p.transports?.split(",") ?? undefined) as
        AuthenticatorTransportFuture[] | undefined,
    })),
    userVerification: "preferred",
  });

  cookieStore.set(
    WEBAUTHN_CHALLENGE_COOKIE,
    JSON.stringify({ type: "auth", userId, challenge: options.challenge }),
    webauthnChallengeCookieOptions(),
  );

  return { options: options as PublicKeyCredentialRequestOptionsJSON };
}

export async function finishLoginPasskey(input: {
  response: AuthenticationResponseJSON;
}): Promise<{ success: true } | { error: string }> {
  const cookieStore = await cookies();
  const userId = await verifyPending2faToken(
    cookieStore.get(PENDING_2FA_COOKIE)?.value,
  );
  if (!userId)
    return { error: "Vypršela dvoufázová výzva. Přihlaste se znovu." };

  const raw = cookieStore.get(WEBAUTHN_CHALLENGE_COOKIE)?.value;
  cookieStore.delete(WEBAUTHN_CHALLENGE_COOKIE);
  if (!raw) return { error: "Vypršela výzva pro passkey. Zkuste to znovu." };

  let expected: { type: string; userId: string; challenge: string };
  try {
    expected = JSON.parse(raw);
  } catch {
    return { error: "Neplatná výzva pro passkey." };
  }
  if (expected.type !== "auth" || expected.userId !== userId) {
    return { error: "Neplatná výzva pro passkey." };
  }

  const cred = await prisma.passkeyCredential.findFirst({
    where: { userId, credentialId: input.response.id },
  });
  if (!cred) return { error: "Neznámý passkey." };

  const { rpID, origin } = getWebAuthnConfig();
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: input.response,
      expectedChallenge: expected.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: cred.credentialId,
        publicKey: new Uint8Array(cred.publicKey),
        counter: Number(cred.counter),
        transports: (cred.transports?.split(",") ?? undefined) as
          AuthenticatorTransportFuture[] | undefined,
      },
    });
  } catch {
    return { error: "Ověření passkey selhalo." };
  }

  if (!verification.verified) return { error: "Ověření passkey selhalo." };

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { disabledAt: true },
  });
  if (target?.disabledAt) {
    await clearPending2faCookie();
    return { error: "Tento účet byl deaktivován. Kontaktujte podporu." };
  }

  await prisma.passkeyCredential.update({
    where: { id: cred.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  });

  await clearPending2faCookie();
  await setSessionCookie(userId);
  return { success: true };
}

type PublicKeyCredentialCreationOptionsJSON = Awaited<
  ReturnType<typeof generateRegistrationOptions>
>;
type PublicKeyCredentialRequestOptionsJSON = Awaited<
  ReturnType<typeof generateAuthenticationOptions>
>;
