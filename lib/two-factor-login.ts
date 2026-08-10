import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  PENDING_2FA_COOKIE,
  createPending2faToken,
  pending2faCookieOptions,
} from "@/lib/two-factor";

/**
 * After successful password check in loginUser — sets pending 2FA cookie.
 * Not a server action (must not be client-callable with arbitrary userId).
 */
export async function issuePending2faIfNeeded(userId: string): Promise<
  | { requires2fa: false }
  | {
      requires2fa: true;
      methods: ("totp" | "passkey")[];
    }
> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      totpEnabled: true,
      _count: { select: { passkeys: true } },
    },
  });
  if (!user) return { requires2fa: false };

  const methods: ("totp" | "passkey")[] = [];
  if (user.totpEnabled) methods.push("totp");
  if (user._count.passkeys > 0) methods.push("passkey");
  if (methods.length === 0) return { requires2fa: false };

  const token = await createPending2faToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(PENDING_2FA_COOKIE, token, pending2faCookieOptions());
  return { requires2fa: true, methods };
}
