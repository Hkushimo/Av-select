-- Run once in Supabase SQL Editor before enabling link-only technician invites.
-- Tokens are SHA-256 hashes; the actual invitation URL is never stored.
create table if not exists public.technician_invites (
  token_hash text primary key,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  claimed_at timestamptz,
  claimed_by uuid references auth.users(id)
);
create index if not exists technician_invites_expiry_idx on public.technician_invites(expires_at);
alter table public.technician_invites enable row level security;
-- No client-side policies: only the Supabase server secret can create, inspect, or redeem these tokens.
revoke all on public.technician_invites from anon, authenticated;
