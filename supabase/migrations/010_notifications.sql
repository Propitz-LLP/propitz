-- In-app notifications: the notification centre behind the top-bar bell.
-- One row per investor-facing event, created alongside the matching email
-- (best-effort — see recordNotification in src/lib/notifications/inapp.ts).
-- Satisfies plan tasks S7-05 and the S6-06 "in-app notification created" gap.
--
-- Write path: src/lib/notifications/inapp (recordNotification) → src/lib/db/notifications.
-- Writes come from admin/system flows via the service-role client. Investors
-- read and mark-read their OWN rows through the RLS-bound client — own-row
-- policies key on auth.uid(), which DOES match (unlike the jwt-role policies;
-- see CLAUDE.md "RLS trap").

create table if not exists notifications (
  id            text primary key,
  "investorId"  uuid not null references investors(id) on delete cascade,
  type          text not null,                     -- e.g. 'kyc.approved', 'transaction.confirmed'
  title         text not null,
  body          text not null,
  link          text,                              -- optional in-app deep link, e.g. '/transactions'
  "readAt"      timestamptz,                        -- null = unread
  "createdAt"   timestamptz not null default now()
);

-- Bell queries are always "this investor, newest first" — and the unread count
-- is a filter on the same. Partial index keeps the unread lookup cheap.
create index if not exists notifications_investor_created_idx
  on notifications ("investorId", "createdAt" desc);
create index if not exists notifications_unread_idx
  on notifications ("investorId") where "readAt" is null;

alter table notifications enable row level security;

-- Investors read their own notifications (RLS-bound client, auth.uid() matches).
drop policy if exists "Investors can read own notifications" on notifications;
create policy "Investors can read own notifications"
  on notifications for select using (auth.uid() = "investorId");

-- Investors can mark their own notifications read. with check keeps the row
-- theirs — an update cannot reassign investorId to someone else.
drop policy if exists "Investors can update own notifications" on notifications;
create policy "Investors can update own notifications"
  on notifications for update
  using (auth.uid() = "investorId")
  with check (auth.uid() = "investorId");

-- Admin/service-role bypasses RLS, but declare full access for consistency.
drop policy if exists "Admins have full access" on notifications;
create policy "Admins have full access"
  on notifications for all using (auth.jwt() ->> 'role' = 'admin');
