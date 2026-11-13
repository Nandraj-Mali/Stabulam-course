-- Quizzes removed from the course: modules now complete when the video is watched.
delete from public.quiz_questions;

-- Private bucket for module resources (PDFs, slides, sheets…).
-- Admins upload directly; learners get short-lived signed URLs from the server.
insert into storage.buckets (id, name, public, file_size_limit)
values ('resources', 'resources', false, 52428800)
on conflict (id) do update set public = false;

drop policy if exists "resources admin read" on storage.objects;
create policy "resources admin read" on storage.objects for select
  using (bucket_id = 'resources' and public.is_admin());
drop policy if exists "resources admin insert" on storage.objects;
create policy "resources admin insert" on storage.objects for insert
  with check (bucket_id = 'resources' and public.is_admin());
drop policy if exists "resources admin update" on storage.objects;
create policy "resources admin update" on storage.objects for update
  using (bucket_id = 'resources' and public.is_admin());
drop policy if exists "resources admin delete" on storage.objects;
create policy "resources admin delete" on storage.objects for delete
  using (bucket_id = 'resources' and public.is_admin());
