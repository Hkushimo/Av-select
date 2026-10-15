-- Run in Supabase SQL editor. Do not enable public signups in Auth settings.
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,email text not null,role text not null check(role in ('admin','technician')),created_at timestamptz not null default now());
create table public.technicians(user_id uuid primary key references public.profiles(id) on delete cascade,full_name text not null default '',phone text not null default '',city text not null default '',travel text not null default 'regional',roles text[] not null default '{}',equipment text[] not null default '{}',other_skills text not null default '',completed_at timestamptz);
create table public.skill_ratings(id bigint generated always as identity primary key,technician_id uuid not null references public.technicians(user_id) on delete cascade,skill text not null,level integer not null check(level between 1 and 5),rated_by uuid not null references public.profiles(id),updated_at timestamptz not null default now(),unique(technician_id,skill));
create table public.jobs(id uuid primary key default gen_random_uuid(),title text not null,venue text not null default '',starts_at timestamptz not null,ends_at timestamptz,rate text not null default '',details text not null default '',status text not null default 'draft' check(status in ('draft','open','closed')),created_by uuid references public.profiles(id),created_at timestamptz default now());
create table public.job_requirements(job_id uuid references public.jobs(id) on delete cascade,skill text not null,min_level int not null check(min_level between 1 and 5),required boolean not null default true,primary key(job_id,skill));
create table public.job_offers(id uuid primary key default gen_random_uuid(),job_id uuid not null references public.jobs(id) on delete cascade,technician_id uuid not null references public.technicians(user_id),status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),responded_at timestamptz,created_at timestamptz default now(),unique(job_id,technician_id));
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin') $$;
alter table public.profiles enable row level security;
alter table public.technicians enable row level security;
alter table public.skill_ratings enable row level security;
alter table public.jobs enable row level security;
alter table public.job_requirements enable row level security;
alter table public.job_offers enable row level security;
create policy "profile read own or admin" on public.profiles for select to authenticated using(id=(select auth.uid()) or public.is_admin());
create policy "admin manage profiles" on public.profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "technician read own or admin" on public.technicians for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy "technician insert own" on public.technicians for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.profiles where id=(select auth.uid()) and role='technician'));
create policy "technician update own or admin" on public.technicians for update to authenticated using(user_id=(select auth.uid()) or public.is_admin()) with check(user_id=(select auth.uid()) or public.is_admin());
create policy "admin manage ratings" on public.skill_ratings for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "technician read ratings" on public.skill_ratings for select to authenticated using(technician_id=(select auth.uid()));
create policy "admin manage jobs" on public.jobs for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "technician read offered jobs" on public.jobs for select to authenticated using(exists(select 1 from public.job_offers o where o.job_id=jobs.id and o.technician_id=(select auth.uid())));
create policy "admin manage requirements" on public.job_requirements for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "technician read offered requirements" on public.job_requirements for select to authenticated using(exists(select 1 from public.job_offers o where o.job_id=job_requirements.job_id and o.technician_id=(select auth.uid())));
create policy "admin manage offers" on public.job_offers for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "technician read own offers" on public.job_offers for select to authenticated using(technician_id=(select auth.uid()));
-- Technician offer acceptance must be performed through a narrow RPC; no direct UPDATE policy.
create function public.respond_to_offer(p_offer_id uuid,p_response text) returns void language plpgsql security definer set search_path='' as $$ begin if p_response not in ('accepted','declined') then raise exception 'Invalid response';end if;update public.job_offers set status=p_response,responded_at=now() where id=p_offer_id and technician_id=auth.uid() and status='pending';if not found then raise exception 'Offer unavailable';end if;end $$;
revoke all on function public.respond_to_offer(uuid,text) from public;
grant execute on function public.respond_to_offer(uuid,text) to authenticated;
-- First admin bootstrap: create an Auth user via Supabase dashboard, then insert profile with their UUID using SQL editor.
-- Never expose a service-role key to the browser.
