# Sklyvo (outreachagent_V2) — Context / architektonická mapa

Tento dokument shrnuje **aktuální stav** repozitáře pro předání dalšímu asistentovi: tech stack, Prisma schéma, adresáře, klíčové vazby a nedávné směry úprav. **Neobsahuje plné zdrojové kódy**, jen strukturu a účel.

---

## 1. Tech stack a základní info

| Oblast | Technologie |
|--------|-------------|
| Framework | **Next.js 16** (App Router), React 18 |
| Jazyk | **TypeScript** |
| Styly | **Tailwind CSS** 3.x, `tailwindcss-animate`, **CVA** + **clsx** / **tailwind-merge** (`cn`) |
| UI | **Radix UI** (accordion, dialog, dropdown, select, …), vlastní složka `components/ui/*` |
| DB / ORM | **PostgreSQL** přes **Prisma 5** (`DATABASE_URL`, `DIRECT_URL`) |
| Auth (hybridní) | **Supabase Auth** (OAuth Google, recovery heslo) + **vlastní session cookie** `session_user_id` vázaná na **Prisma `User`**; klasické přihlášení e-mailem/heslem přes **`loginUser`** (cookie stejná) |
| Úložiště souborů | **Supabase Storage** (např. avatary — `app/actions/user.ts`) |
| Platby | **Stripe** (SDK server + `@stripe/stripe-js` na klientovi dle potřeby) |
| AI | **Vercel AI SDK** (`ai`), **@ai-sdk/google** (Gemini) |
| Kanban DnD | **@dnd-kit/core**, **@dnd-kit/utilities** |
| Notifikace | **sonner** |
| Témata | **next-themes** |

**Název balíčku v `package.json`:** `sklyvo`.

---

## 2. Databázové schéma (Prisma)

Soubor: `prisma/schema.prisma` — PostgreSQL.

### Enumy

- **`UserRole`**: `OWNER`, `ADMIN`, `MEMBER`
- **`LeadStatus`**: `NEW`, `CONTACTED`, `REPLIED`, `MEETING_SET`, `CLOSED_WON`, `CLOSED_LOST`

### Modely a vztahy (zjednodušeně)

```
Workspace 1 ── * User
Workspace 1 ── * Lead
Workspace 1 ── * Template
Workspace 1 ── * Service
Workspace 1 ── * ActivityLog
```

- **`Workspace`**: centrální tenant — název, onboarding pole (`companyName`, `industry`, …), **billing** (`subscriptionStatus`, `trialEndsAt`, `subscriptionPeriodEnd`, Stripe ID, `planTier`), **metriky** (`creditsUsed`, `creditsTotal`, `leadsCount`, …), integrace (`webhookUrl`, `crmApiKey`), texty (`emailSignature`, `systemPrompt`).
- **`User`**: `email` (unique), `passwordHash` (u OAuth často placeholder `__oauth__…`), `workspaceId` → `Workspace`, `role`, `avatarUrl`.
- **`Lead`**: firma v CRM (`companyName`, `domain`, `placeId`, `status` enum, `value`, kontakty…) — vázáno na `workspaceId`. **Bez `onDelete: Cascade`** na workspace (mazání workspace s existujícími leady typicky selže, pokud se nepřidá cascade nebo ruční mazání).
- **`Template`**: šablony e-mailů pro workspace.
- **`Service`**: nabízené služby firmy (Sniper) — **`onDelete: Cascade`** při smazání workspace.
- **`ActivityLog`**: časová osa aktivit — **`onDelete: Cascade`** při smazání workspace.

**Kaskádové mazání (`onDelete: Cascade`)** je tedy explicitně u **`ActivityLog`** a **`Service`**. Ostatní vztahy na `Workspace` cascade nemají v schématu uvedené.

---

## 3. Adresářová struktura (zjednodušený strom)

```
app/
  (dashboard)/          # route group — domovský přehled
  (auth)/               # např. update-password
  actions/              # server actions (auth, crm, billing, dashboard, …)
  api/
    webhook/route.ts           # hlavní Stripe webhook (POST)
    webhooks/stripe/route.ts   # re-export stejného POST (alias URL)
    stripe/
      webhook/route.ts       # re-export → ../webhook
      create-portal/route.ts
    access-state/route.ts
  auth/callback/route.ts      # OAuth návrat z Google (Supabase)
  crm/
    page.tsx
    crm-kanban-board.tsx
  settings/ …
  sniper/, radar/, help/, pricing/, …
  layout.tsx
  dashboard-body.tsx
components/
  app-shell.tsx
  dashboard-shell.tsx
  dashboard-*.tsx
  ui/                   # shadcn-like primitives
lib/
  prisma.ts
  utils.ts
  constants.ts
  stripe-plan-tiers.ts
  supabase/
    client.ts
    server.ts
prisma/
  schema.prisma
middleware.ts
```

Vynecháno: `node_modules`, `.next`, drobné config soubory (`postcss`, `eslint`, …).

---

## 4. Mapa klíčových souborů (kde se co děje)

| Soubor / oblast | Účel |
|-----------------|------|
| `app/layout.tsx` | Kořen layout: fonty, `ThemeProvider`, `AppShell`, `Toaster`. |
| `components/app-shell.tsx` | Client: podle cesty buď obal **`DashboardShell`** (sidebar), nebo jen `children` (login, register, …). |
| `components/dashboard-shell.tsx` | Sidebar, navigace, kredity/tarif, profil; **`getWorkspaceAccessState`** při změně `pathname` a při **`visibilitychange`** + **`router.refresh()`** pro čerstvá data. |
| `app/(dashboard)/page.tsx` | SSR přehled: `getSessionUser`, uvítání, **`DashboardBody`** v `Suspense`. `dynamic = 'force-dynamic'`. |
| `app/dashboard-body.tsx` | Metriky pipeline (počty podle `LeadStatus`), nedávná aktivita, „attention“ leady, rychlé odkazy — data přes **`getDashboardData`**. |
| `app/actions/auth.ts` | **`getSessionUser`**, **`getWorkspaceAccessState`**, `loginUser`, `registerUser`, cookie `session_user_id`; **`unstable_noStore`** u načtení session kvůli čerstvým DB datům. |
| `app/actions/crm.ts` | CRM server actions: **`getLeads`**, **`updateSingleLeadStatus`**, bulk operace, import, … |
| `app/crm/page.tsx` | CRM UI (filtry, board/list); board používá **`CrmKanbanBoard`**. |
| `app/crm/crm-kanban-board.tsx` | **@dnd-kit**: `DndContext`, `DragOverlay`, sloupce jako `useDroppable`, karty `useDraggable`; při dropu volá parent **`onLeadMoved`** → typicky **`updateSingleLeadStatus`**. |
| `app/actions/billing.ts` | **`startTrialCheckout`** — Stripe Checkout session s metadaty `workspaceId`, `userId`, `planTier`. |
| `app/pricing/page.tsx` | Ceník v UI: tarify, **Stripe Price ID** (měsíčně/ročně), volání `startTrialCheckout`. |
| `lib/stripe-plan-tiers.ts` | Jednotný **mapovací config**: `STRIPE_PRICE_ID_TO_TIER`, **`creditsForPlanTier`**, **`resolvePlanTierFromSubscription`** — používá webhook. |
| `app/api/webhook/route.ts` | **Hlavní Stripe webhook**: ověření podpisu, handlery `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`; po zápisu **`revalidatePath`**; `dynamic = 'force-dynamic'`. |
| `app/api/webhooks/stripe/route.ts` | **`export { POST } from "../../webhook/route"`** — stejná logika, jiná URL (Stripe Dashboard může mířit sem). |
| `middleware.ts` | Chrání cesty kromě veřejných; **`session_user_id`** cookie. **Bez cookie propouští prefix `/api/webhook`** — pozor: **`/api/webhooks/...`** v matcheru **není** automaticky veřejný (pokud se používá, je potřeba middleware rozšířit nebo používat `/api/webhook`). |
| `app/auth/callback/route.ts` | Po Google OAuth: **`exchangeCodeForSession`**, `getUser`, sync/ vytvoření **`User` + `Workspace`** v Prisma, nastavení **`session_user_id`**, redirect na `next` nebo `/`. |

---

## 6. Design 2.0 (Matej) vs. produkční UI

Kořenový repozitář (`matejmix/sklyvo`, port **3001**) je **designový sandbox** — `/login`, `/workspace`, `/design` bez DB a bez auth.

Produkční app v **`Backend/`** (port **3000**) přebírá vizuál přes:

| Reference (root) | Produkce (Backend) |
|----------------|-------------------|
| `components/login-screen-v2.tsx` | `components/sklyvo/login-screen.tsx` + `auth.css` |
| `components/workspace-v2.tsx` | `components/dashboard-shell.tsx` + `dashboard/dashboard-overview.tsx` |
| `components/design-system-v2.tsx` | `components/sklyvo/app-ui.css` (tokeny, tlačítka, sidebar) |

**Pravidlo pro úpravy:** logiku a data měnit jen v `Backend/`. Z rootu kopírovat layout, barvy a spacing — ne routy ani placeholder data.

---

## 7. Auth (detail)

### Dva režimy přihlášení

1. **E-mail + heslo** (`/login`): formulář volá server action **`loginUser`** → ověření proti Prisma `User.passwordHash` → cookie **`session_user_id`** (httpOnly).
2. **Google přes Supabase** (`/login`, `/register`): `signInWithOAuth({ provider: 'google', redirectTo: …/auth/callback })`.

### Callback `/auth/callback`

- Route: **`app/auth/callback/route.ts`** (GET).
- Kroky: přečtení `code` z query → **`createSupabaseServerClient`** → **`exchangeCodeForSession`** → **`getUser`** → podle e-mailu **najít nebo vytvořit** záznam v **Prisma** (`User` + nový `Workspace` při prvním přihlášení) → nastavit cookie **`session_user_id`** na **Prisma `User.id`** (ne Supabase UUID) → redirect.

### Middleware

- Veřejné: `/login`, `/register`, `/recovery`, `/update-password`, **`/auth/callback`**, `/api/access-state`.
- Stripe webhooky bez session: aktuálně **`pathname.startsWith('/api/webhook')`** (singular).

### Supabase pomocné moduly

- `lib/supabase/client.ts` — browser client (`@supabase/ssr`).
- `lib/supabase/server.ts` — server client pro callback / SSR.

---

## 6. Stripe a webhooky

### Ceník / plan config

- **UI a Price ID**: `app/pricing/page.tsx` — pole plánů (`tier`, měsíční/roční `stripePriceId*`, marketingové texty včetně kreditů).
- **Logika tarifu a kreditů pro backend**: **`lib/stripe-plan-tiers.ts`** — mapa price ID → `STARTER` / `PRO` / … a funkce **`creditsForPlanTier`** (varianta C: STARTER **1000**, PRO **2500**, PREMIUM **6000**, AGENCY 3000/7000/15000), trial **`TRIAL_CREDITS` = 40**, free **10**. **`resolvePlanTierFromSubscription`** (metadata `planTier` nebo první známý price na subscription).

### Kde je webhook

- **Implementace:** jeden soubor **`app/api/webhook/route.ts`** (POST, `STRIPE_WEBHOOK_SECRET`, Stripe API verze z kódu).
- **Alias:** `app/api/webhooks/stripe/route.ts` a `app/api/stripe/webhook/route.ts` re-exportují stejný `POST`.

### Typické eventy (zpracování v `app/api/webhook/route.ts`)

- **`checkout.session.completed`** — propojení workspace se Stripe customer/subscription, `planTier`, trial kredity vs plné podle stavu subscription.
- **`customer.subscription.updated`** — sync statusu, tarifu, trial konce; vyhledání workspace podle metadat / Stripe ID.
- **`customer.subscription.deleted`** — označení zrušení předplatného.
- **`invoice.payment_failed`** — např. `PAST_DUE`.
- **`invoice.paid`** — po platbě **tvrdý reset** placeného stavu: **`ACTIVE`**, **`trialEndsAt: null`**, **`creditsTotal`** podle tarifu, sync `planTier` ze subscription; **`revalidatePath`** pro `/` a `/settings`; podrobný **`console.log`** pro Vercel logy.

**Customer portal:** `app/api/stripe/create-portal/route.ts`.

---

## 7. Dashboard (metriky, aktivita, akce)

- **Stránka:** `app/(dashboard)/page.tsx` — session, onboarding gate, layout přehledu.
- **Tělo přehledu:** `app/dashboard-body.tsx` — volá **`getDashboardData`** (`app/actions/dashboard.ts`): agregace stavů leadů, poslední aktivity (z DB / logiky v action), leady vyžadující pozornost, celková hodnota pipeline, CTA odkazy (CRM, Radar, …).
- **Načítání / skeleton:** `components/dashboard-loading.tsx`, případně `dashboard-onboarding-gate.tsx`.

---

## 8. Kanban (Pipeline CRM)

- **Stránka:** `app/crm/page.tsx` — stav leadů, filtry, board vs list; board renderuje **`CrmKanbanBoard`**.
- **DnD komponenta:** `app/crm/crm-kanban-board.tsx` — `@dnd-kit/core` (`DndContext`, `DragOverlay`, `useDraggable` / `useDroppable`), sloupce = statusy UI mapované na `LeadStatus` v DB.
- **Po puštění karty:** optimistický update v `page.tsx` + server action **`updateSingleLeadStatus`** z **`app/actions/crm.ts`** (Prisma `lead.updateMany` s `workspaceId`, `revalidatePath` dle existující implementace).

---

## 9. Aktuální stav a nedávné změny (shrnutí)

- **Stripe `invoice.paid`**: opravena synchronizace po přechodu z trialu na placeno — tarif a kredity ze **subscription / price ID**, ne jen ze zastaralého `planTier` v DB; **`ACTIVE`**, vynulování **`trialEndsAt`**, logy a **`revalidatePath`**.
- **`customer.subscription.updated`**: rozšířeno vyhledávání workspace (metadata, subscription id, customer id).
- **Alias webhook URL:** `app/api/webhooks/stripe/route.ts` (stejný handler jako `/api/webhook`).
- **Cache / čerstvá data:** `noStore` v **`getSessionUser`**, `force-dynamic` na vybraných routách (např. přehled, settings, webhook), sidebar **refetch při navigaci a visibility** + **`router.refresh()`**.
- **Sidebar billing UI:** úpravy podmínek pro trial vs placený tarif (nesvítit „trial vypršel“ při aktivním placeném plánu), konzistence kreditů.
- **Kanban:** drag & drop přes **dnd-kit** + **DragOverlay** a stabilní placeholder ve sloupci.
- **Prisma:** u **`ActivityLog`** a **`Service`** je **`onDelete: Cascade`** vůči workspace.

---

## 10. Rychlé odkazy pro nového asistenta

| Téma | Začni u |
|------|---------|
| Session / workspace v akcích | `app/actions/auth.ts` |
| CRM leady a status | `app/actions/crm.ts`, `app/crm/page.tsx` |
| Stripe ceník v kódu | `app/pricing/page.tsx` + `lib/stripe-plan-tiers.ts` |
| Webhook úpravy | `app/api/webhook/route.ts` |
| Ochrana rout | `middleware.ts` |
| DB schéma | `prisma/schema.prisma` |

---

*Dokument generován jako snapshot struktury projektu; po větších refaktorech ho aktualizujte ručně nebo nechte znovu vygenerovat.*
