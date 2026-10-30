-- AV Select migration 019. Run after 018. Old invoices stay unchanged.
-- One approved flat return call replaces standard/OT billing for that period.
begin;

alter table public.job_offers add column if not exists return_call_flat_amount numeric(12,2)
 check (return_call_flat_amount > 0 and return_call_flat_amount <= 100000);
alter table public.technician_invoices add column if not exists return_call_flat_amount numeric(12,2);

-- An optional return-call amount is managed by admins and frozen after invoicing.
create or replace function public.guard_return_call_terms()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
   if new.return_call_flat_amount is not null and not public.is_admin() then
     raise exception 'Only admins may set return-call payments'; end if;
 elsif new.return_call_flat_amount is distinct from old.return_call_flat_amount then
   if not public.is_admin() then raise exception 'Only admins may approve a return call'; end if;
   if old.status in ('cancelled','declined') then raise exception 'Inactive offers cannot change return-call terms'; end if;
   if exists(select 1 from public.technician_invoices where offer_id=old.id) then
     raise exception 'Cannot change return-call terms after invoice submission'; end if;
 end if;
 return new;
end $$;

drop trigger if exists guard_return_call_terms on public.job_offers;
create trigger guard_return_call_terms before insert or update of return_call_flat_amount
on public.job_offers for each row execute function public.guard_return_call_terms();

-- Supports old one-period JSON and new per-date shifts array.
-- All shift intervals are checked for overlaps (including across midnight).
create or replace function public.validate_invoice_dates() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_job public.jobs%rowtype; v_offer public.job_offers%rowtype;
 v_day jsonb; v_date date; v_first date; v_last date; v_today date;
 v_shift jsonb; v_shifts jsonb; v_in timestamp; v_out timestamp;
 v_seen tsrange[]:=array[]::tsrange[]; v_range tsrange; v_prior tsrange;
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
  if jsonb_typeof(v_day->'shifts')='array' then
   v_shifts:=v_day->'shifts';
  else
   v_shifts:=jsonb_build_array(jsonb_build_object(
     'time_in',v_day->>'time_in','time_out',v_day->>'time_out','hours',v_day->'hours'));
  end if;
  if jsonb_array_length(v_shifts) not between 1 and 8 then
   raise exception 'Enter 1 to 8 work periods per day';
  end if;
  for v_shift in select value from jsonb_array_elements(v_shifts) loop
   if coalesce(v_shift->>'time_in','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or coalesce(v_shift->>'time_out','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
   then raise exception 'Enter valid Time in and Time out for each work period'; end if;
   v_in:=v_date+(v_shift->>'time_in')::time;
   v_out:=v_date+(v_shift->>'time_out')::time;
   if v_out<=v_in then v_out:=v_out+interval '1 day'; end if;
   if v_out>(now() at time zone v_job.time_zone) then
    raise exception 'Cannot invoice a work period that has not finished';
   end if;
   v_range:=tsrange(v_in,v_out,'[)');
   foreach v_prior in array v_seen loop
    if v_prior && v_range then raise exception 'Work periods overlap; clock out before beginning another period'; end if;
   end loop;
   v_seen:=array_append(v_seen,v_range);
  end loop;
 end loop;
 new.job_time_zone:=v_job.time_zone;
 return new;
end $$;

-- Recalculate from the frozen individual rate and the admin-approved return amount.
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
  v_shift jsonb; v_shifts jsonb;
  v_shift_index integer; v_day_hours numeric;
  v_shift_hours numeric; v_standard_hours numeric;
  v_standard_billable numeric; v_lunch_deducted numeric;
  v_flat_count integer:=0; v_flat_day_amount numeric;
  v_pay_type text;
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
      or (v_day->>'hours') is null then raise exception 'Invalid daily work log'; end if;
    v_date:=(v_day->>'date')::date;
    if (v_day->>'date')=any(v_unique_dates) then raise exception 'Each work date must be unique'; end if;
    v_unique_dates:=array_append(v_unique_dates,v_day->>'date');
    v_day_hours:=0; v_standard_hours:=0; v_flat_day_amount:=0;
    if jsonb_typeof(v_day->'shifts')='array' then
      v_shifts:=v_day->'shifts';
    else
      v_shifts:=jsonb_build_array(jsonb_build_object(
        'time_in',v_day->>'time_in','time_out',v_day->>'time_out','hours',v_day->'hours'));
    end if;
    if jsonb_array_length(v_shifts) not between 1 and 8 then raise exception 'Enter 1 to 8 valid work periods per day'; end if;
    v_shift_index:=0;
    for v_shift in select value from jsonb_array_elements(v_shifts) loop
      v_shift_index:=v_shift_index+1;
      v_time_in:=v_shift->>'time_in'; v_time_out:=v_shift->>'time_out';
      if v_time_in is null or v_time_out is null
         or v_time_in !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
         or v_time_out !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      then raise exception 'Enter valid time in and time out for each period'; end if;
      v_in_minutes:=split_part(v_time_in,':',1)::integer*60+split_part(v_time_in,':',2)::integer;
      v_out_minutes:=split_part(v_time_out,':',1)::integer*60+split_part(v_time_out,':',2)::integer;
      v_duration_minutes:=mod(v_out_minutes-v_in_minutes+1440,1440);
      if v_duration_minutes=0 then raise exception 'Time in and time out cannot be the same'; end if;
      v_shift_hours:=round(v_duration_minutes::numeric/60,2);
      if (v_shift->>'hours') is null or (v_shift->>'hours')::numeric is distinct from v_shift_hours
      then raise exception 'Entered work period hours do not match the clock times'; end if;
      v_day_hours:=v_day_hours+v_shift_hours;
      v_pay_type:=coalesce(v_shift->>'pay_type','standard');
      if v_pay_type='return_flat' then
        if v_shift_index=1 then raise exception 'Flat return call must be a second or later period'; end if;
        if v_offer.return_call_flat_amount is null then
          raise exception 'Admin-approved return-call amount required for flat pay';
        end if;
        v_flat_count:=v_flat_count+1;
        if v_flat_count>1 then raise exception 'Only one flat return call is permitted per invoice'; end if;
        v_flat_day_amount:=v_flat_day_amount+v_offer.return_call_flat_amount;
      elsif v_pay_type='standard' then
        v_standard_hours:=v_standard_hours+v_shift_hours;
      else raise exception 'Invalid work period pay type';
      end if;
    end loop;
    if v_day_hours<=0 or v_day_hours>24 or v_day_hours<>round(v_day_hours,2)
      or (v_day->>'hours')::numeric is distinct from v_day_hours then
      raise exception 'Daily hours do not match the work periods'; end if;
    v_lunch_taken:=coalesce((v_day->>'lunch_taken')::boolean,false);
    v_lunch_deducted:=case when v_lunch_taken and v_day_hours>10 then 1 else 0 end;
    if v_standard_hours<v_lunch_deducted then raise exception 'Lunch deduction requires an hour of regular work'; end if;
    v_billable_hours:=v_day_hours-v_lunch_deducted;
    v_standard_billable:=v_standard_hours-v_lunch_deducted;
    v_total_hours:=v_total_hours+v_billable_hours;
    if v_basis='day' then
      v_total:=v_total+v_rate+round(greatest(v_standard_billable-10,0)*v_rate*1.5/10,2)+v_flat_day_amount;
    else
      v_total:=v_total+round(least(v_standard_billable,10)*v_rate,2)
        +round(greatest(v_standard_billable-10,0)*v_rate*1.5,2)+v_flat_day_amount;
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
  new.return_call_flat_amount:=v_offer.return_call_flat_amount;
  -- Server-generated invoice rule marker; client cannot choose legacy billing.
  new.overtime_policy:='after_10_1_5';
  return new;
end;
$$;

commit;
