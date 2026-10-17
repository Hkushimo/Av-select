-- AV Select 009: independent position and pay for each technician's offer.
-- Run in Supabase SQL Editor before deploying the matching app version.
-- Existing bookings and offers are preserved, with empty new fields.
alter table public.job_offers
  add column if not exists offer_position text not null default '',
  add column if not exists offer_rate text not null default '';
