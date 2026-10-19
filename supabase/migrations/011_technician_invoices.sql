-- AV Select 011: lightweight self-service technician invoices.
-- Run in the Supabase SQL Editor BEFORE deploying the billing pages.
-- Retains invoices if a job or individual offer is later removed.
create table if not exists public.technician_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number bigint generated always as identity unique,
  offer_id uuid unique references public.job_offers(id) on delete set null,
  technician_id uuid not null references public.technicians(user_id) on delete cascade,
  from_name text not null check (char_length(from_name) between 1 and 200),
  from_email text not null default '',
  from_phone text not null default '',
  from_location text not null default '',
  bill_to text not null check (char_length(bill_to) between 1 and 250),
  bill_to_address text not null default '' check (char_length(bill_to_address) <= 500),
  job_title text not null check (char_length(job_title) between 1 and 200),
  job_venue text not null default '',
  job_address text not null default '',
  job_starts_at timestamptz not null,
  job_ends_at timestamptz,
  job_position text not null default '',
  original_rate text not null default '',
  hours numeric(8,2) not null check (hours > 0 and hours <= 999),
  hourly_rate numeric(12,2) not null check (hourly_rate > 0 and hourly_rate <= 100000),
  total numeric(14,2) generated always as (hours * hourly_rate) stored,
  issued_on date not null default current_date,
  due_on date not null,
  notes text not null default '' check (char_length(notes) <= 1500),
  created_at timestamptz not null default now()
);

create index if not exists technician_invoices_technician_created_idx
  on public.technician_invoices (technician_id, created_at desc);

alter table public.technician_invoices enable row level security;

create policy "technician read own invoices"
  on public.technician_invoices for select to authenticated
  using (technician_id = (select auth.uid()));

-- Technicians can invoice only THEIR confirmed, finished bookings.
-- If the event has no end time, allow billing 24 hours after its start.
create policy "technician invoice finished booking"
  on public.technician_invoices for insert to authenticated
  with check (
    technician_id = (select auth.uid())
    and offer_id is not null
    and exists (
      select 1
      from public.job_offers o
      join public.jobs j on j.id = o.job_id
      where o.id = offer_id
        and o.technician_id = (select auth.uid())
        and o.status = 'confirmed'
        and coalesce(j.ends_at, j.starts_at + interval '1 day') <= now()
    )
  );

-- No update or delete policy: saved invoices preserve their original terms.
-- PDF export/printing happens on the client; no W-9 or taxpayer IDs are stored.
