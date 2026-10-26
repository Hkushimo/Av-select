-- Apply after 017, before deploying the updated app. Existing instants are unchanged.
-- NULL marks legacy jobs whose venue zone must be confirmed by an administrator.
begin;
alter table public.jobs add column time_zone text;
alter table public.job_offers
 add column agreed_basis text check (agreed_basis in ('hourly','day')),
 add column agreed_amount numeric(12,2) check (agreed_amount > 0 and agreed_amount <= 100000);
alter table public.technician_invoices add column job_time_zone text;

create function public.offer_amount(p_label text, p_basis text) returns numeric
language plpgsql immutable set search_path='' as $$
declare v_match text[]; v_amount numeric;
begin
 if p_basis not in ('hourly','day') then return null; end if;
 if p_basis='hourly' and p_label ~* '(/[[:space:]]*days?|per[[:space:]]+day|daily)[[:space:]]*$' then return null; end if;
 if p_basis='day' and p_label ~* '(/[[:space:]]*(hr|hrs|hour|hours)|per[[:space:]]+hour|hourly)[[:space:]]*$' then return null; end if;
 v_match:=regexp_match(trim(p_label), '^[$]?[[:space:]]*([0-9]{1,3}(,[0-9]{3})+|[0-9]+)([.][0-9]{1,2})?[[:space:]]*(/[[:space:]]*(hr|hrs|hour|hours|day|days)|per[[:space:]]+(hour|day)|hourly|daily)?$', 'i');
 if v_match is null then return null; end if;
 v_amount:=replace(v_match[1],',','')::numeric+coalesce(v_match[3],'0')::numeric;
 if v_amount<=0 or v_amount>100000 then return null; end if;
 return v_amount;
end $$;

-- Preserve unparseable legacy terms for review; do not guess a monetary amount.
update public.job_offers o set agreed_basis=j.rate_basis,
 agreed_amount=public.offer_amount(coalesce(nullif(trim(o.offer_rate),''),j.rate),j.rate_basis),
 offer_rate=coalesce(nullif(trim(o.offer_rate),''),j.rate)
from public.jobs j where j.id=o.job_id;

create function public.guard_job_terms() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.time_zone is not null and not exists(select 1 from pg_catalog.pg_timezone_names where name=new.time_zone)
 then raise exception 'Choose a valid venue time zone'; end if;
 if (tg_op='INSERT' and new.time_zone is null) or
    (tg_op='UPDATE' and old.time_zone is not null and new.time_zone is null)
 then raise exception 'Choose the venue time zone'; end if;
 if coalesce(new.ends_at,new.starts_at+interval '1 day')<=new.starts_at then
  raise exception 'End time must be later than start time';
 end if;
 -- UPDATE already holds the parent job row lock. Offer creation takes that same lock.
 if tg_op='UPDATE' and new.rate_basis is distinct from old.rate_basis and exists(
  select 1 from public.job_offers where job_id=new.id and status<>'cancelled'
 ) then raise exception 'Release all active offers before changing the pay structure'; end if;
 return new;
end $$;
create trigger guard_job_terms before insert or update on public.jobs
for each row execute function public.guard_job_terms();

create function public.freeze_offer_terms() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_job public.jobs%rowtype; v_label text;
begin
 if tg_op='UPDATE' then
  if new.job_id is distinct from old.job_id or new.technician_id is distinct from old.technician_id
   or new.offer_rate is distinct from old.offer_rate or new.agreed_basis is distinct from old.agreed_basis
   or new.agreed_amount is distinct from old.agreed_amount or new.offer_position is distinct from old.offer_position
  then raise exception 'Offer terms are fixed. Release and reissue the offer to change them'; end if;
 end if;
 select * into v_job from public.jobs where id=new.job_id for update;
 if not found then raise exception 'Job not found'; end if;
 if tg_op='INSERT' then
  if v_job.time_zone is null then raise exception 'Confirm the venue time zone before sending offers'; end if;
  if v_job.status<>'open' then raise exception 'Open the job before sending offers'; end if;
  v_label:=coalesce(nullif(trim(new.offer_rate),''),v_job.rate);
  new.agreed_basis:=v_job.rate_basis;
  new.agreed_amount:=public.offer_amount(v_label,v_job.rate_basis);
  if new.agreed_amount is null then raise exception 'Enter a valid agreed hourly or day rate'; end if;
  new.offer_rate:=v_label;
 elsif old.status='cancelled' and new.status<>'cancelled' then
  raise exception 'Release and reissue cancelled offers';
 end if;
 return new;
end $$;
create trigger freeze_offer_terms before insert or update on public.job_offers
for each row execute function public.freeze_offer_terms();

-- Runs before invoice calculation. Locks prevent terms/schedule changing mid-submit.
create function public.validate_invoice_dates() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_job public.jobs%rowtype; v_offer public.job_offers%rowtype;
 v_day jsonb; v_date date; v_first date; v_last date; v_today date; v_out timestamp;
begin
 select j.* into v_job from public.jobs j join public.job_offers o on o.job_id=j.id
 where o.id=new.offer_id for update of j;
 select * into v_offer from public.job_offers where id=new.offer_id for update;
 if v_offer.id is null or v_offer.technician_id is distinct from auth.uid()
  or new.technician_id is distinct from auth.uid() or v_offer.status<>'confirmed'
 then raise exception 'A confirmed booking owned by you is required'; end if;
 if v_job.time_zone is null then raise exception 'Ask the admin to confirm the venue time zone before invoicing'; end if;
 if v_offer.agreed_amount is null then raise exception 'Ask the admin to release and reissue this booking with a valid agreed rate'; end if;
 v_first:=(v_job.starts_at at time zone v_job.time_zone)::date;
 v_last:=((coalesce(v_job.ends_at,v_job.starts_at+interval '1 day')-interval '1 microsecond') at time zone v_job.time_zone)::date;
 v_today:=(now() at time zone v_job.time_zone)::date;
 new.issued_on:=v_today;
 if new.due_on is null or new.due_on<new.issued_on then raise exception 'Due date cannot be before the invoice date'; end if;
 if jsonb_typeof(new.work_days) is distinct from 'array' or jsonb_array_length(new.work_days) not between 1 and 366
 then raise exception 'Add at least one valid work day'; end if;
 for v_day in select value from jsonb_array_elements(new.work_days) loop
  if coalesce(v_day->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid work date'; end if;
  v_date:=(v_day->>'date')::date;
  if v_date<v_first or v_date>v_last then raise exception 'Work dates must fall within the job dates. Ask the admin to update the schedule for additional work days'; end if;
  if v_date>v_today then raise exception 'Cannot invoice future work'; end if;
  if coalesce(v_day->>'time_in','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
   or coalesce(v_day->>'time_out','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  then raise exception 'Enter valid Time in and Time out'; end if;
  v_out:=v_date+(v_day->>'time_out')::time;
  if (v_day->>'time_out')::time < (v_day->>'time_in')::time then v_out:=v_out+interval '1 day'; end if;
  if v_out>(now() at time zone v_job.time_zone) then raise exception 'Cannot invoice a shift that has not finished'; end if;
 end loop;
 new.job_time_zone:=v_job.time_zone;
 return new;
end $$;
create trigger a_validate_invoice_dates before insert on public.technician_invoices
for each row execute function public.validate_invoice_dates();

-- The replacement calculation below uses immutable offer snapshots.

create or replace function public.calculate_technician_invoice()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  v_basis text;
  v_label text;
  v_rate_match text[];
  v_rate numeric;
  v_job public.jobs%rowtype;
  v_offer public.job_offers%rowtype;
  v_tech public.technicians%rowtype;
  v_email text;
  v_day jsonb;
  v_date date;
  v_gross_hours numeric;
  v_in_minutes integer;
  v_out_minutes integer;
  v_duration_minutes integer;
  v_time_in text;
  v_time_out text;
  v_billable_hours numeric;
  v_total_hours numeric:=0;
  v_total numeric:=0;
  v_count integer:=0;
  v_unique_dates text[]:='{}';
  v_lunch_taken boolean;
begin
  -- Existing invoices are untouched because this is an INSERT-only trigger.
  -- Never allow a new client to pass "legacy" and bypass rate verification.
  if new.billing_basis not in ('hourly','day') then
    raise exception 'Choose the job pay structure before creating an invoice';
  end if;

  if auth.uid() is distinct from new.technician_id then
    raise exception 'Cannot invoice another technician';
  end if;

  select o.* into v_offer from public.job_offers o
   where o.id=new.offer_id and o.technician_id=new.technician_id and o.status='confirmed';
  if not found then raise exception 'A confirmed booking is required'; end if;
  select j.* into v_job from public.jobs j where j.id=v_offer.job_id
   and coalesce(j.ends_at,j.starts_at+interval '1 day')<=now();
  if not found then raise exception 'The booking must finish before invoicing'; end if;
  select t.* into v_tech from public.technicians t where t.user_id=new.technician_id;
  if not found then raise exception 'Technician profile not found'; end if;
  select p.email into v_email from public.profiles p where p.id=new.technician_id;

  v_basis:=v_offer.agreed_basis;
  if new.billing_basis<>v_basis then
    raise exception 'Billing basis no longer matches the job';
  end if;
  v_label:=v_offer.offer_rate;
  v_rate:=v_offer.agreed_amount;
  if v_rate is null or v_basis is null then raise exception 'Booking pay terms need admin review'; end if;

  if jsonb_typeof(new.work_days) <> 'array'
     or jsonb_array_length(new.work_days) not between 1 and 366 then
    raise exception 'Add at least one day with hours worked';
  end if;
  for v_day in select value from jsonb_array_elements(new.work_days) loop
    if jsonb_typeof(v_day)<>'object'
      or coalesce(v_day->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      or (v_day->>'hours') is null then
      raise exception 'Invalid daily work log';
    end if;
    v_date:=(v_day->>'date')::date;
    if (v_day->>'date')=any(v_unique_dates) then
      raise exception 'Each work date must be unique';
    end if;
    v_unique_dates:=array_append(v_unique_dates,v_day->>'date');
    -- Validate local 24-hour clock times and calculate overnight shifts.
    v_time_in:=v_day->>'time_in';
    v_time_out:=v_day->>'time_out';
    if v_time_in is null or v_time_out is null
       or v_time_in !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or v_time_out !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      raise exception 'Enter valid Time in and Time out for each work day';
    end if;
    v_in_minutes:=split_part(v_time_in,':',1)::integer*60+split_part(v_time_in,':',2)::integer;
    v_out_minutes:=split_part(v_time_out,':',1)::integer*60+split_part(v_time_out,':',2)::integer;
    v_duration_minutes:=mod(v_out_minutes-v_in_minutes+1440,1440);
    if v_duration_minutes=0 then
      raise exception 'Time in and Time out cannot be the same';
    end if;
    v_gross_hours:=round(v_duration_minutes::numeric/60,2);
    -- Reject altered client-supplied hours.
    if (v_day->>'hours')::numeric is distinct from v_gross_hours then
      raise exception 'Entered hours do not match the work times';
    end if;

    v_lunch_taken:=coalesce((v_day->>'lunch_taken')::boolean,false);
    -- Exactly one hour, only when "Lunch taken" and actual hours exceed 10.
    v_billable_hours:=v_gross_hours
      - case when v_lunch_taken and v_gross_hours>10 then 1 else 0 end;

    v_total_hours:=v_total_hours+v_billable_hours;
    if v_basis='day' then
      v_total:=v_total+v_rate
        +round(greatest(v_billable_hours-10,0)*v_rate*1.5/10,2);
    else
      -- Hourly jobs have no day-rate minimum. 10 billable hours at base
      -- rate; each additional billable hour is charged at 1.5× that rate.
      v_total:=v_total
        +round(least(v_billable_hours,10)*v_rate,2)
        +round(greatest(v_billable_hours-10,0)*v_rate*1.5,2);
    end if;
    v_count:=v_count+1;
  end loop;
  if v_count=0 or v_total_hours<=0 or v_total_hours>999 then
    raise exception 'Invalid total billable hours';
  end if;

  -- Immutable invoice snapshot: use the authoritative offer and job, not client prices.
  new.from_name:=v_tech.full_name;
  new.from_email:=coalesce(v_email,'');
  new.from_phone:=v_tech.phone;
  new.from_location:=concat_ws(', ',nullif(v_tech.city,''),nullif(v_tech.state,''));
  new.job_title:=v_job.title;
  new.job_venue:=v_job.venue;
  new.job_address:=v_job.address;
  new.job_starts_at:=v_job.starts_at;
  new.job_ends_at:=v_job.ends_at;
  new.job_position:=v_offer.offer_position;
  new.original_rate:=v_label;
  new.agreed_rate:=v_rate;
  new.hours:=v_total_hours;
  new.hourly_rate:=case when v_basis='day' then round(v_rate/10,2) else v_rate end;
  new.billed_total:=v_total;
  -- Server-generated invoice rule marker; client cannot choose legacy billing.
  new.overtime_policy:='after_10_1_5';
  return new;
end;
$$;


commit;
