# Security checklist (Sklyvo) — config outside the repo

## Required env (Vercel)

- `SESSION_SECRET` — min. 32 random characters (HMAC for signed session cookies). Generate: `openssl rand -base64 48`
- `CRON_SECRET` — already used for cron routes; also signs internal workspace tokens for server-only AI/mail helpers
- Keep `GOOGLE_API_KEY` / Places / Stripe secrets **server-only** (never `NEXT_PUBLIC_*`)

After deploying signed sessions, all users must log in again (old raw user-id cookies are rejected).

## Supabase Storage (#02 / #07)

App CRM data is in Prisma/Postgres, not Supabase tables — table RLS does not apply to CRM.

For bucket `avatars`:

1. Public **read by object URL** is OK for profile pics
2. Disable **public list/enumerate** on the bucket
3. Uploads only via service role (server actions) — do not expose service role to the browser

For bucket `workspace-docs` (Úložiště):

1. Keep the bucket **private** (no public read)
2. Downloads only via **signed URLs** from server actions
3. Uploads/deletes only via service role (server actions)
4. Paths are scoped as `{workspaceId}/personal|shared/...`

## Billing hard cap (#04 / #08)

In Google Cloud (Gemini / Generative Language API):

1. Set a budget alert and a hard spending cap
2. Monitor sudden spikes from Sniper / venesis / Radar

Rate limits in-app reduce abuse; the cloud billing cap is the last line of defense.

## Manual smoke tests

1. Log out / log in (new signed cookie)
2. Change password / register (bcrypt hashes)
3. Try calling a server action with a foreign `workspaceId` without token — must fail
4. venesis `[ACTION: //evil.com|x]` — must not navigate off-site
