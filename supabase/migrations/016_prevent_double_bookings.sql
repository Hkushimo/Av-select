-- AV Select 016: prevent double-booking confirmed technicians.
-- Apply AFTER migrations 001-015. Pending and accepted offers remain allowed.
-- Two reservations that touch exactly at end/start are NOT overlapping.
-- A job without ends_at occupies its first 24 hours, consistent with billing.
--
-- Transaction-scoped advisory locks serialize confirmations and date edits for
-- the same technician (including confirmations by two different admins).
-- Existing confirmed bookings are NOT silently changed by this migration.

create or replace function public.prevent_overlapping_confirmed_offer()
returns trigger
language plpgsql security definer set search_path=''
as $$
declare
 v_start timestamptz;
 v_end timestamptz;
begin
 if new.status <> 'confirmed' then return new; end if;

 -- Same lock key is used when an administrator edits a confirmed job's dates.
 perform pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended(new.technician_id::text, 20261021)
 );

 select j.starts_at, coalesce(j.ends_at, j.starts_at + interval '1 day')
 into v_start, v_end
 from public.jobs j where j.id=new.job_id;

 if v_start is null or v_end<=v_start then
  raise exception 'A valid job start and end time are required to confirm a booking';
 end if;

 if exists (
  select 1
  from public.job_offers other
  join public.jobs other_job on other_job.id=other.job_id
  where other.technician_id=new.technician_id
    and other.status='confirmed'
    and other.id is distinct from new.id
    and other.job_id<>new.job_id
    and tstzrange(other_job.starts_at,
      coalesce(other_job.ends_at,other_job.starts_at+interval '1 day'),'[)')
      && tstzrange(v_start,v_end,'[)')
 ) then
  raise exception 'Booking conflict: this technician is already confirmed for another overlapping job. Release the conflicting booking or change the schedule first.';
 end if;
 return new;
end;
$$;

drop trigger if exists prevent_overlapping_confirmed_offer on public.job_offers;
create trigger prevent_overlapping_confirmed_offer
before insert or update of status, technician_id, job_id
on public.job_offers
for each row execute function public.prevent_overlapping_confirmed_offer();

-- A job schedule edit cannot move an existing confirmed crew member onto
-- another confirmed booking. Lock every booked technician in UUID order so
-- multi-person edits and concurrent confirmations cannot bypass the check.
create or replace function public.prevent_overlapping_job_schedule()
returns trigger
language plpgsql security definer set search_path=''
as $$
declare
 v_tech_id uuid;
 v_end timestamptz;
begin
 if new.starts_at is not distinct from old.starts_at
    and new.ends_at is not distinct from old.ends_at then
  return new;
 end if;

 v_end:=coalesce(new.ends_at,new.starts_at+interval '1 day');
 if v_end<=new.starts_at then
  raise exception 'End time must be later than start time';
 end if;

 for v_tech_id in
  select distinct o.technician_id from public.job_offers o
  where o.job_id=new.id and o.status='confirmed'
  order by o.technician_id
 loop
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_tech_id::text, 20261021)
  );
 end loop;

 if exists (
  select 1 from public.job_offers booked
  join public.job_offers other
    on other.technician_id=booked.technician_id
    and other.job_id<>new.id
    and other.status='confirmed'
  join public.jobs other_job on other_job.id=other.job_id
  where booked.job_id=new.id and booked.status='confirmed'
    and tstzrange(new.starts_at,v_end,'[)')
      && tstzrange(other_job.starts_at,
        coalesce(other_job.ends_at,other_job.starts_at+interval '1 day'),'[)')
 ) then
  raise exception 'Schedule conflict: one or more confirmed technicians are already booked on another job at the new time.';
 end if;
 return new;
end;
$$;

drop trigger if exists prevent_overlapping_job_schedule on public.jobs;
create trigger prevent_overlapping_job_schedule
before update of starts_at, ends_at on public.jobs
for each row execute function public.prevent_overlapping_job_schedule();

-- Report any pre-existing overlapping confirmations for manual review.
-- No bookings are deleted automatically.
select a.technician_id,a.job_id as first_job,b.job_id as conflicting_job
from public.job_offers a
join public.jobs ja on ja.id=a.job_id
join public.job_offers b on b.technician_id=a.technician_id
 and b.status='confirmed' and b.job_id>a.job_id
join public.jobs jb on jb.id=b.job_id
where a.status='confirmed'
  and tstzrange(ja.starts_at,coalesce(ja.ends_at,ja.starts_at+interval '1 day'),'[)')
   && tstzrange(jb.starts_at,coalesce(jb.ends_at,jb.starts_at+interval '1 day'),'[)');
