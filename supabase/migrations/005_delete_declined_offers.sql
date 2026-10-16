-- AV Select migration 005
-- Declining an offer deletes its database row, while accepting still records acceptance.
-- Keep all checks inside the existing security-definer RPC; no technician DELETE policy required.
create or replace function public.respond_to_offer(p_offer_id uuid,p_response text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_response not in ('accepted','declined') then
    raise exception 'Invalid response';
  end if;

  if p_response = 'declined' then
    delete from public.job_offers
     where id = p_offer_id
       and technician_id = (select auth.uid())
       and status = 'pending';
  else
    update public.job_offers
       set status = 'accepted', responded_at = now()
     where id = p_offer_id
       and technician_id = (select auth.uid())
       and status = 'pending';
  end if;

  if not found then
    raise exception 'Offer unavailable';
  end if;
end;
$$;
revoke all on function public.respond_to_offer(uuid,text) from public;
grant execute on function public.respond_to_offer(uuid,text) to authenticated;

-- Remove previously declined offers too. This is permanent.
delete from public.job_offers where status = 'declined';
