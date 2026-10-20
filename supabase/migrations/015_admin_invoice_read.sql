-- AV Select 015: let administrators review submitted technician invoices.
-- Run in the Supabase SQL Editor after migration 014.
-- Read-only for admins; does not modify, send or delete existing invoices.
-- Preserve the job association even when a technician's offer is later released.
-- The existing technician-own SELECT and INSERT policies remain unchanged.
alter table public.technician_invoices enable row level security;

drop policy if exists "admin read submitted invoices" on public.technician_invoices;
create policy "admin read submitted invoices"
 on public.technician_invoices
 for select to authenticated
 using ((select public.is_admin()));

-- The offer foreign key is nullable on deletion, so also snapshot the job association.
alter table public.technician_invoices
  add column if not exists job_id uuid references public.jobs(id) on delete set null;

create index if not exists technician_invoices_job_id_idx
  on public.technician_invoices(job_id);

-- Associate past submissions while their original offers still exist.
-- Older detached invoices remain available in the global admin list.
update public.technician_invoices i
 set job_id=o.job_id
 from public.job_offers o
 where i.offer_id=o.id and i.job_id is null;

-- Never trust a client-provided job_id: derive it from the confirmed offer.
create or replace function public.set_technician_invoice_job()
returns trigger language plpgsql security definer set search_path='' as $$
declare
 v_job_id uuid;
begin
 select o.job_id into v_job_id
 from public.job_offers o
 where o.id=new.offer_id and o.technician_id=new.technician_id;
 if v_job_id is null then
  raise exception 'Cannot link invoice without a valid technician offer';
 end if;
 new.job_id:=v_job_id;
 return new;
end;
$$;

drop trigger if exists technician_invoice_job_link on public.technician_invoices;
create trigger technician_invoice_job_link
 before insert on public.technician_invoices
 for each row execute function public.set_technician_invoice_job();
