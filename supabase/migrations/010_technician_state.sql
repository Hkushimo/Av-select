-- AV Select 010: make the technician's US state separately searchable.
-- Run once in Supabase SQL Editor before deploying the updated app.
-- Preserve existing city text as-is: ambiguous entries must be confirmed by the technician.
alter table public.technicians add column if not exists state text not null default '';
-- Migrate only unambiguous state abbreviations in existing location text.
-- City-only and state-only entries remain visible and can be corrected in My Profile.
update public.technicians
set state=upper(substring(city from '(?:,|[[:space:]])[[:space:]]*([A-Za-z]{2})$')),
    city=trim(regexp_replace(city, '(?:,|[[:space:]])[[:space:]]*[A-Za-z]{2}$',''))
where state='' and upper(substring(city from '(?:,|[[:space:]])[[:space:]]*([A-Za-z]{2})$')) in
 ('AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY');
