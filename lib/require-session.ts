import { redirect } from "next/navigation";
import { readSessionUserId } from "@/lib/session-cookie";

/** Server-side session check (replaces Edge middleware auth). */
export async function requireSessionUserId(): Promise<string> {
  const userId = await readSessionUserId();
  if (!userId) {
    redirect("/login");
  }
  return userId;
}
