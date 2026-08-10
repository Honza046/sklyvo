import { headers } from "next/headers";

/** Best-effort client IP for rate limiting (Vercel / proxies). */
export async function getRequestIp(): Promise<string> {
 try {
 const h = await headers();
 const forwarded = h.get("x-forwarded-for");
 if (forwarded) {
 const first = forwarded.split(",")[0]?.trim();
 if (first) return first.slice(0, 64);
 }
 const real = h.get("x-real-ip")?.trim();
 if (real) return real.slice(0, 64);
 } catch {
 // headers() outside request context
 }
 return "unknown";
}
