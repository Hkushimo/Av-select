-- AV Select 014: apply 1.5× overtime to hourly bookings after 10 billable hours per day.
-- Day rate invoices continue to use 1.5× (day rate / 10) for hours after 10.
-- Lunch deductions remain conditional on more than 10 hours actually worked.
-- Run AFTER migration 013 and BEFORE the new invoice UI.
-- Historic invoices stay unchanged; overtime_policy distinguishes original terms.

alter table public.technician_invoices
  add column if not exists overtime_policy text not null default 'legacy';

do $$ begin
 if not exists (
  select 1 from pg_constraint
  where conname='technician_invoices_overtime_policy_check'
    and conrelid='public.technician_invoices'::regclass
 ) then
  alter table public.technician_invoices
   add constraint technician_invoices_overtime_policy_check
   check (overtime_policy in ('legacy','after_10_1_5'));
 end if;
end $$;

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

  v_basis:=v_job.rate_basis;
  if new.billing_basis<>v_basis then
    raise exception 'Billing basis no longer matches the job';
  end if;
  v_label:=coalesce(nullif(trim(v_offer.offer_rate),''),nullif(trim(v_job.rate),''));
  if v_label is null then raise exception 'The booking has no agreed pay rate'; end if;
  v_rate_match:=regexp_match(v_label,
    '^[[:space:]]*[$]?[[:space:]]*([0-9][0-9,]*([.][0-9]{1,2})?)[[:space:]]*([/][[:space:]]*(hr|hrs|hour|hours|day|days)|per[[:space:]]+(hour|day)|hourly|daily)?[[:space:]]*$','i');
  if v_rate_match is null then
    raise exception 'Ask the admin to specify a simple agreed hourly or day rate';
  end if;
  if v_basis='hourly' and v_label ~* '([/][[:space:]]*days?[[:space:]]*$|per[[:space:]]+day[[:space:]]*$|daily[[:space:]]*$)' then
    raise exception 'Agreed rate says day, but the job is hourly';
  end if;
  if v_basis='day' and v_label ~* '([/][[:space:]]*(hr|hrs|hour|hours)[[:space:]]*$|per[[:space:]]+hour[[:space:]]*$|hourly[[:space:]]*$)' then
    raise exception 'Agreed rate says hourly, but the job is a day rate';
  end if;
  v_rate:=replace(v_rate_match[1],',','')::numeric;
  if v_rate<=0 or v_rate>100000 then raise exception 'Invalid agreed rate'; end if;

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

drop trigger if exists technician_invoice_calculation on public.technician_invoices;
create trigger technician_invoice_calculation
before insert on public.technician_invoices for each row
execute function public.calculate_technician_invoice();
