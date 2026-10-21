-- AV Select 017: retain submitted invoices when technician accounts are deleted.
-- Apply AFTER migration 015 (and 016 for the current rollout).
-- Existing invoice snapshots, amounts, job references, and admin SELECT policy remain.
-- Technician profile/credentials can be removed while accounting records survive.
-- Review local record-retention and privacy requirements before deleting accounts.

alter table public.technician_invoices
  drop constraint if exists technician_invoices_technician_id_fkey;

alter table public.technician_invoices
  alter column technician_id drop not null;

alter table public.technician_invoices
  add constraint technician_invoices_technician_id_fkey
  foreign key (technician_id) references public.technicians(user_id)
  on delete set null;

-- After a technician is deleted, saved invoices remain accessible to admins
-- under the existing admin invoice SELECT policy. The owner ID becomes NULL.
-- offer_id and job_id already use ON DELETE SET NULL; no deletion cascade
-- reaches the invoice row.
