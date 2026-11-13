-- Bonuses: unlocked together with the certificate when the course is completed.
create table if not exists public.bonuses (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses on delete cascade,
  position int not null default 1,
  title text not null,
  summary text,
  thumbnail_url text,
  file_path text,          -- path in the private "resources" bucket
  file_name text,
  file_size bigint,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists bonuses_course_idx on public.bonuses(course_id, position);

alter table public.bonuses enable row level security;
drop policy if exists "bonuses read" on public.bonuses;
create policy "bonuses read" on public.bonuses for select using (is_published or public.is_admin());
drop policy if exists "bonuses admin write" on public.bonuses;
create policy "bonuses admin write" on public.bonuses for all
  using (public.is_admin()) with check (public.is_admin());
-- the private file path is only read by the server (service role)
revoke select on public.bonuses from anon, authenticated;
grant select (id, course_id, position, title, summary, thumbnail_url, file_name, file_size, is_published, created_at)
  on public.bonuses to anon, authenticated;

-- 5 draft bonuses to fill in from Admin → Bonuses
insert into public.bonuses (course_id, position, title, summary)
select c.id, g, 'Bonus ' || g, 'Describe what this bonus PDF contains.'
from public.courses c, generate_series(1, 5) g
where c.id = (select id from public.courses order by created_at limit 1)
  and not exists (select 1 from public.bonuses b where b.course_id = c.id);
