-- Run once in Supabase SQL editor to enable cross-device unread job activity.
create table if not exists public.job_activity_reads (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  offers_seen_at timestamptz not null default '1970-01-01T00:00:00Z',
  responses_seen_at timestamptz not null default '1970-01-01T00:00:00Z'
);
alter table public.job_activity_reads enable row level security;
drop policy if exists "read own job activity cursor" on public.job_activity_reads;
drop policy if exists "insert own job activity cursor" on public.job_activity_reads;
drop policy if exists "update own job activity cursor" on public.job_activity_reads;
create policy "read own job activity cursor" on public.job_activity_reads
  for select to authenticated using (user_id = (select auth.uid()));
create policy "insert own job activity cursor" on public.job_activity_reads
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own job activity cursor" on public.job_activity_reads
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
