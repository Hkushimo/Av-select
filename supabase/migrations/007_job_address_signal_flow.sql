-- Migration 007: venue address and a simple signal-flow plan for each job.
-- Run in Supabase SQL Editor before using the new job fields.
alter table public.jobs
  add column if not exists address text not null default '',
  add column if not exists signal_flow jsonb not null default '[]'::jsonb;

-- Each connection has a source, a destination, and an optional signal label.
-- Limit payload size while allowing simple multi-step AV routing plans.
alter table public.jobs
  add constraint jobs_signal_flow_format_check check (
    jsonb_typeof(signal_flow) = 'array'
    and jsonb_array_length(signal_flow) <= 40
  );
