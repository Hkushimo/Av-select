alter table public.technicians add column if not exists avatar_path text;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('technician-avatars','technician-avatars',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
create policy "avatar owner upload" on storage.objects for insert to authenticated with check (
bucket_id='technician-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text
and exists(select 1 from public.profiles where id=(select auth.uid()) and role='technician'));
create policy "avatar owner or admin read" on storage.objects for select to authenticated using (
bucket_id='technician-avatars' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_admin()));
create policy "avatar owner delete" on storage.objects for delete to authenticated using (
bucket_id='technician-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
