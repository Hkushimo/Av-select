-- Migration 008: one assignment role per technician, and separate signal flows per role.
-- Run once in Supabase SQL Editor before using role assignments in the app.
alter table public.jobs
  add column if not exists role_flows jsonb not null default '[]'::jsonb;
alter table public.job_offers
  add column if not exists assigned_role text not null default '';

-- Retain any existing job-level signal flow as a legacy General assignment
-- rather than discarding work already saved by an admin.
update public.jobs
set role_flows=jsonb_build_array(jsonb_build_object('role','General','connections',signal_flow))
where jsonb_array_length(signal_flow)>0 and role_flows='[]'::jsonb;

-- Existing offers were made before roles were tracked. Label these General.
update public.job_offers set assigned_role='General' where assigned_role='';

alter table public.jobs
  add constraint jobs_role_flows_format_check check (
    jsonb_typeof(role_flows)='array' and jsonb_array_length(role_flows)<=30
  );
