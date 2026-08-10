# Tenant isolation & encryption

## Model
- Boundary = **workspace** (team members share one workspace).
- Session cookie (`session_user_id`) is HS256 JWT with `sub = userId`.
- `workspaceId` must come from the session (or a signed internal HMAC token), never from an untrusted client alone.

## Hardening in place
1. **OAuth `state`** signed (`lib/oauth-state.ts`) for Google e-mail, Sheets, Microsoft — binds `userId`/`workspaceId` + expiry.
2. **`sendEmail`**: session path only allows own `userId`; internal path requires membership via `assertUserInWorkspace`.
3. **Mailbox resolve** (`workspace-mailer`): refuses personal mailbox if user ∉ workspace.
4. **Secrets at rest** (AES-256-GCM, `enc:v1:…`): SMTP passwords, Google/MS OAuth tokens, Fakturoid tokens. Key = `EMAIL_CREDENTIALS_SECRET` or `SESSION_SECRET`.
5. **Cron jobs** live in `lib/cron/*` (not `"use server"`) and HTTP routes require `CRON_SECRET`.
6. **Production fail-closed** without strong `SESSION_SECRET` / `CRON_SECRET` / encryption secret.

## Platform admin (`/admin`)
- **Entry:** dedicated login at `/admin/login` (not the customer `/login`).
- Access = logged-in user whose **email** is in `PLATFORM_ADMIN_EMAILS`, or any logged-in user when `PLATFORM_ADMIN_LOCAL=1` (non-production only). This is **not** `UserRole.ADMIN` (customer workspace role).
- Admin UI may show account/workspace metadata, usage, integration **status**, and lead PII for support — **never** password hashes, TOTP secrets, or OAuth/SMTP ciphertext.
- Mutations go through `app/actions/platform-admin.ts` and are written to `AdminAuditLog`.
- Impersonation sets a return cookie; `/admin` stays gated on the **current** session email (impersonated users cannot open ops).

## Ops checklist
- Set `SESSION_SECRET` (≥32 chars), `CRON_SECRET`, `EMAIL_CREDENTIALS_SECRET` in production.
- Set `PLATFORM_ADMIN_EMAILS` for ops staff who need `/admin`.
- Re-connect Google / Microsoft / e-mail after deploy so tokens are re-saved encrypted (plaintext still decrypts via migration path).
- Never expose `workspaceId` mutation endpoints without session or internal token checks.
