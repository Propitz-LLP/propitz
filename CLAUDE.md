# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev            # dev server on :3000 (prefer the preview/launch.json "propitz-dev" config over raw Bash)
npm run build          # production build
npm run lint           # eslint
npx tsc --noEmit       # type-check (no test suite exists in this repo)
npx supabase db push   # apply supabase/migrations/*.sql to the remote project
```

There are no automated tests. Verification is done by type-checking plus driving the app in a browser and inspecting the Supabase DB directly (the Supabase MCP server is connected: `execute_sql`, `apply_migration`, etc.).

Supabase gotchas:
- The free-tier project auto-pauses (`INACTIVE` status, connection timeouts everywhere). Restore it via the MCP `restore_project` tool and wait for `ACTIVE_HEALTHY` before retrying.
- If `db push` reports "Remote migration versions not found", a migration was applied via the MCP `apply_migration` tool (timestamped history entry). Repair with `npx supabase migration repair --status reverted <version>` then push.
- Migrations are numbered `001_…`, `002_…` in `supabase/migrations/`. Write idempotent DDL (`if not exists` / `on conflict do nothing`) — some have been applied out-of-band.

## Architecture

Next.js App Router + Supabase (Postgres, Auth, Storage) + Vercel (hosting, Blob for public images). Domain: fractional real-estate investment platform (investors buy property units, admin manages KYC/properties/transactions).

### Route groups (`src/app/`)

- `(auth)/` — login, onboarding (KYC wizard). No layout chrome.
- `(investor)/` — dashboard, properties, transactions, documents. Layout adds TopNav + InvestorNav + KycBanner.
- `admin/` — back-office (properties, KYC queue, transactions, distributions). Guarded by `requireAdmin()` per page.
- Route protection lives in `src/lib/supabase/middleware.ts` (`updateSession`): unauthenticated → `/login`; `/admin/*` requires the `app_metadata.role === 'admin'` JWT claim. `/onboarding` is an *authenticated* route — do not add it to the auth-route list (that redirect loop has bitten before).

### Single-swap-point abstractions (`src/lib/`)

Each infrastructure concern is isolated in exactly one module, documented for a future AWS migration. Never call the underlying SDK from feature code:

- `lib/auth` — the only place that knows Supabase Auth. `getCurrentUser` / `requireAuth` / `requireAdmin` / `requireKyc` (redirects to `/onboarding/kyc?reason=kyc` unless kycStatus is Approved). Role comes from `app_metadata.role`, default `'investor'`.
- `lib/supabase/server` — `createClient()` (cookie/RLS-bound) vs `createAdminClient()` (service-role, bypasses RLS).
- `lib/db/*` — all queries (properties, investors/KYC, transactions, ownerships, documents). Feature code never queries Supabase directly.
- `lib/storage` — Supabase Storage provider behind a `StorageProvider` interface; buckets in `storage.buckets`. KYC docs live in the **private** `kyc-documents` bucket, served only via 15-min signed URLs. Property cover images use **Vercel Blob** (public URLs) instead — never put KYC/compliance documents there.
- `lib/notifications/email` — Resend behind an `EmailProvider` interface; typed senders (`sendKycApproved`, …). Send best-effort: `.catch(() => {})`.
- `lib/payments` — `razorpay.ts` gateway abstraction (order create, webhook HMAC verify, refund) and `fees.ts` (all fee math; rates come from `lib/config`, never inline).
- `lib/config` — all env access. Add new env keys here, not via scattered `process.env`.

### The RLS trap (important)

RLS policies like `auth.jwt() ->> 'role' = 'admin'` **never match** — Supabase JWTs carry `role: 'authenticated'`; this app's admin flag is in `app_metadata.role`, which those policies don't read. Consequences:

- Any read/write of *another* user's rows (admin flows) must use `createAdminClient()`. The `*Admin` functions in `lib/db` (`getPropertyByIdAdmin`, `getInvestorByIdAdmin`, …) exist for this; add to the pattern rather than "fixing" policies ad-hoc.
- RLS-client reads of the caller's *own* rows work (own-row select policies use `auth.uid()`).
- Tables may lack INSERT policies entirely (that bug orphaned signups once) — privileged inserts go through the admin client with the error checked, never ignored.

### Feature conventions (`src/features/<domain>/`)

Each domain folder holds `actions.ts` (server actions), `schemas.ts` (Zod), `components/` (client components), optionally `admin/`. Established conventions:

- Server actions: `'use server'`; first line is `requireAuth()` / `requireAdmin()` / `requireKyc()`; validate with `schema.safeParse` and return `{ error: parsed.error.flatten().fieldErrors }` or `{ error: string }` — never throw for user-facing failures; `revalidatePath(...)` after mutations; return `{ success: true, ... }`.
- Client forms: `useState` per field + `useTransition`; build `FormData`, call the action in `startTransition`, render field errors inline. See `features/properties/admin/PropertyForm.tsx` and `features/kyc/components/KycStepper.tsx` as reference implementations.
- Shared UI primitives: `components/ui/FormFields.tsx` (`Section`, `Field`), `components/ui/SuccessBanner.tsx` (reads `?created=`/`?updated=`/`?deleted=` query params). Formatting helpers (`fmtRupees`, `toWords` Indian numbering, `toSlug`) in `lib/format.ts`.
- Styling is inline `style` props + a few global classes (`card`, `badge badge-*`, `form-input`, `data-table`) and CSS variables (`--navy`, `--gold`, `--green`, `--red`, `--slate-light`, …). No Tailwind utility soup in feature components despite Tailwind being installed — match the file you're editing.

### Compliance-sensitive rules

- Aadhaar is never stored in full — mask to `XXXX XXXX nnnn` server-side before persisting (UIDAI).
- Properties with investor activity (ownerships/transactions) must never be hard-deleted — set status `Closed`; deletion actions must keep that guard.
- Unit allocation must stay atomic — use the `reserve_property_units` Postgres RPC pattern (row-guarded plpgsql function), not read-modify-write from JS.

### Project tracking

Feature work follows `C:\working\projects\Propitz_Dev_Task_Schedule.docx` (sprint plan with BRD IDs). Sprints 1–3 (auth, property listing/admin, KYC onboarding + review) are shipped; Sprint 4+ (property detail, subscription, Razorpay lifecycle, ownership ledger) is in progress — check the task list / plan file before starting a new module.
