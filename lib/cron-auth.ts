/**
 * Shared auth for Vercel / external cron hitters.
 * Vercel sends: Authorization: Bearer <CRON_SECRET>
 */
export function isAuthorizedCronRequest(req: Request): boolean {
 const secret = process.env.CRON_SECRET?.trim();
 if (!secret) return false;

 const auth = req.headers.get("authorization")?.trim();
 if (!auth) return false;

 return auth === `Bearer ${secret}` || auth === secret;
}
