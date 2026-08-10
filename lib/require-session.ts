import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/** Server-side session check (replaces Edge middleware auth). */
export async function requireSessionUserId(): Promise<string> {
 const token = (await cookies()).get(SESSION_COOKIE)?.value;
 const userId = await verifySessionToken(token);
 if (!userId) {
 redirect("/login");
 }
 return userId;
}
