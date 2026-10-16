-- AV Select migration 006: booking confirmation and safe technician account deletion.
-- Run once in Supabase SQL Editor BEFORE using Confirm booking or Delete technician.
alter table public.job_offers drop constraint if exists job_offers_status_check;
alter table public.job_offers add constraint job_offers_status_check
  check (status in ('pending','accepted','confirmed','declined','cancelled'));

-- Existing redeemed invites may point at the auth account being deleted.
-- Retain the used-token audit while permitting auth.users deletion.
alter table public.technician_invites drop constraint if exists technician_invites_claimed_by_fkey;
alter table public.technician_invites
  add constraint technician_invites_claimed_by_fkey
  foreign key (claimed_by) references auth.users(id) on delete set null;

-- The rest of the technician's data cascades through:
-- auth.users -> profiles -> technicians -> job_offers / skill_ratings,
-- and auth.users -> profiles -> job_activity_reads.
-- No client access to Auth administration is added.
