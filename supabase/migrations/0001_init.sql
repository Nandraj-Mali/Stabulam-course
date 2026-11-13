-- =====================================================================
-- Stabulam: initial schema
-- Run this whole file in Supabase → SQL Editor (or `supabase db push`).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  email text unique not null,
  phone text unique,
  role text not null default 'student' check (role in ('student','admin')),
  school_name text,
  designation text,
  city text,
  state text,
  school_board text,
  student_count text,
  whatsapp text,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  last_active_at timestamptz
);

create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  brand_name text not null default 'Stabulam',
  brand_tagline text default 'School',
  logo_url text,
  hero jsonb not null default '{}'::jsonb,
  whatsapp_number text default '919999999999',
  whatsapp_message text default 'Hi! I have a question about the course.',
  footer_text text default '© Stabulam. All rights reserved.',
  certificate jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  cover_url text,
  is_free boolean not null default true,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses on delete cascade,
  position int not null,
  title text not null,
  subtitle text,
  cover_url text,
  video_provider_id text,          -- Bunny Stream video GUID
  video_url text,                  -- optional direct/HLS URL (testing / fallback)
  duration_seconds int not null default 0,
  summary text,
  takeaways jsonb not null default '[]'::jsonb,
  resources jsonb not null default '[]'::jsonb,
  pass_percent int not null default 60,
  popup_enabled boolean not null default false,
  popup_interval_minutes int not null default 15,
  popup_type text not null default 'attention' check (popup_type in ('attention','message')),
  popup_content jsonb not null default '{}'::jsonb,
  is_published boolean not null default true,
  unique (course_id, position)
);

create table if not exists public.enrollments (
  user_id uuid references public.profiles on delete cascade,
  course_id uuid references public.courses on delete cascade,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, course_id)
);

create table if not exists public.module_progress (
  user_id uuid references public.profiles on delete cascade,
  module_id uuid references public.modules on delete cascade,
  watched_seconds int not null default 0,
  max_position int not null default 0,
  last_position int not null default 0,
  video_completed boolean not null default false,
  quiz_passed boolean not null default false,
  best_score int,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_id)
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules on delete cascade,
  position int not null default 0,
  question text not null,
  options jsonb not null,
  correct_index int not null,
  explanation text
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  module_id uuid not null references public.modules on delete cascade,
  answers jsonb,
  score int,
  passed boolean,
  created_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id text primary key,
  user_id uuid not null references public.profiles on delete cascade,
  course_id uuid not null references public.courses on delete cascade,
  issued_at timestamptz not null default now(),
  revoked boolean not null default false,
  unique (user_id, course_id)
);

create index if not exists modules_course_idx on public.modules(course_id, position);
create index if not exists quiz_q_module_idx on public.quiz_questions(module_id, position);
create index if not exists attempts_user_idx on public.quiz_attempts(user_id, module_id);

-- ---------------------------------------------------------------------
-- HELPERS
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- New auth user -> profile row
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, phone, whatsapp)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'phone', '')
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Phone -> email lookup for "login with phone". Service role only.
create or replace function public.get_email_by_phone(p_phone text)
returns text language sql stable security definer set search_path = public as $$
  select email from profiles where phone = p_phone limit 1;
$$;
revoke all on function public.get_email_by_phone(text) from public, anon, authenticated;

-- Is phone already taken? (used on signup)
create or replace function public.phone_exists(p_phone text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where phone = p_phone);
$$;
grant execute on function public.phone_exists(text) to anon, authenticated;

-- Has the module got any quiz questions?
create or replace function public.module_has_quiz(p_module uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from quiz_questions where module_id = p_module);
$$;

-- Is a module unlocked for the current user?
create or replace function public.is_module_unlocked(p_module uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  m modules%rowtype;
  prev_id uuid;
  onboarded boolean;
begin
  select * into m from modules where id = p_module and is_published;
  if not found then return false; end if;
  if public.is_admin() then return true; end if;

  select onboarded_at is not null into onboarded from profiles where id = auth.uid();
  if not coalesce(onboarded, false) then return false; end if;

  select id into prev_id from modules
   where course_id = m.course_id and is_published and position < m.position
   order by position desc limit 1;

  if prev_id is null then return true; end if;

  return exists (
    select 1 from module_progress
     where user_id = auth.uid() and module_id = prev_id and completed_at is not null
  );
end $$;
grant execute on function public.is_module_unlocked(uuid) to authenticated;

-- Internal: mark module complete when video + quiz satisfied; complete course when all done
create or replace function public._refresh_completion(p_user uuid, p_module uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_course uuid;
  total int;
  done int;
begin
  update module_progress mp
     set completed_at = coalesce(mp.completed_at, now())
   where mp.user_id = p_user and mp.module_id = p_module
     and mp.video_completed
     and (mp.quiz_passed or not public.module_has_quiz(p_module));

  select course_id into v_course from modules where id = p_module;
  select count(*) into total from modules where course_id = v_course and is_published;
  select count(*) into done from module_progress mp
    join modules m on m.id = mp.module_id
   where mp.user_id = p_user and m.course_id = v_course and m.is_published and mp.completed_at is not null;

  if total > 0 and done >= total then
    update enrollments set completed_at = coalesce(completed_at, now())
     where user_id = p_user and course_id = v_course;
  end if;
end $$;
revoke all on function public._refresh_completion(uuid, uuid) from public, anon, authenticated;

-- Video heartbeat. Called every ~15s while playing.
create or replace function public.record_heartbeat(
  p_module uuid, p_position int, p_delta int, p_duration int default 0
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  m modules%rowtype;
  mp module_progress%rowtype;
  dur int;
  allowed int;
  new_watched int;
  new_max int;
  done boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.is_module_unlocked(p_module) then raise exception 'module locked'; end if;

  select * into m from modules where id = p_module;
  dur := greatest(m.duration_seconds, coalesce(p_duration, 0));

  -- backfill duration if admin left it empty
  if m.duration_seconds = 0 and coalesce(p_duration, 0) > 0 then
    update modules set duration_seconds = p_duration where id = p_module;
  end if;

  insert into module_progress (user_id, module_id, updated_at)
  values (uid, p_module, now() - make_interval(secs => least(greatest(coalesce(p_delta, 0), 0) / 1.5, 20)))
    on conflict do nothing;
  select * into mp from module_progress where user_id = uid and module_id = p_module for update;

  -- real time since the last heartbeat, at most 1.5x playback speed
  allowed := greatest(ceil((extract(epoch from (now() - mp.updated_at)) + 2) * 1.5)::int, 0);
  -- watch time is only tracked for admin stats (not required for completion)
  new_watched := mp.watched_seconds + least(greatest(coalesce(p_delta, 0), 0), allowed, 120);
  -- furthest point can only advance as fast as 1.5x real time
  new_max := greatest(mp.max_position, least(greatest(p_position, 0), mp.max_position + allowed));
  if dur > 0 then
    new_watched := least(new_watched, dur * 3);
    new_max := least(new_max, dur);
  end if;

  done := mp.video_completed or (dur > 0 and new_max >= dur * 0.9);

  update module_progress set
    watched_seconds = new_watched,
    max_position = new_max,
    last_position = greatest(p_position, 0),
    video_completed = done,
    updated_at = now()
  where user_id = uid and module_id = p_module;

  update profiles set last_active_at = now() where id = uid;

  if done then perform public._refresh_completion(uid, p_module); end if;

  return jsonb_build_object('watched_seconds', new_watched, 'max_position', new_max,
                            'video_completed', done);
end $$;
grant execute on function public.record_heartbeat(uuid, int, int, int) to authenticated;

-- Quiz questions WITHOUT answers
create or replace function public.get_quiz(p_module uuid)
returns table (id uuid, "position" int, question text, options jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_module_unlocked(p_module) then raise exception 'module locked'; end if;
  return query select q.id, q.position, q.question, q.options
    from quiz_questions q where q.module_id = p_module order by q.position, q.id;
end $$;
grant execute on function public.get_quiz(uuid) to authenticated;

-- Submit quiz: p_answers = {"<question_id>": <option_index>, ...}
create or replace function public.submit_quiz(p_module uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  m modules%rowtype;
  total int := 0;
  correct int := 0;
  score int;
  passed boolean;
  q record;
  results jsonb := '[]'::jsonb;
  picked int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.is_module_unlocked(p_module) then raise exception 'module locked'; end if;
  select * into m from modules where id = p_module;

  if not exists (select 1 from module_progress where user_id = uid and module_id = p_module and video_completed) then
    raise exception 'finish the video first';
  end if;

  for q in select * from quiz_questions where module_id = p_module order by position, id loop
    total := total + 1;
    picked := nullif(p_answers->>(q.id::text), '')::int;
    if picked = q.correct_index then correct := correct + 1; end if;
    results := results || jsonb_build_object(
      'id', q.id, 'picked', picked, 'correct_index', q.correct_index,
      'is_correct', picked = q.correct_index, 'explanation', q.explanation);
  end loop;

  score := case when total = 0 then 100 else round(correct * 100.0 / total) end;
  passed := score >= m.pass_percent;

  insert into quiz_attempts (user_id, module_id, answers, score, passed)
  values (uid, p_module, p_answers, score, passed);

  update module_progress set
    quiz_passed = quiz_passed or passed,
    best_score = greatest(coalesce(best_score, 0), score),
    updated_at = now()
  where user_id = uid and module_id = p_module;

  perform public._refresh_completion(uid, p_module);

  return jsonb_build_object('score', score, 'passed', passed, 'correct', correct,
                            'total', total, 'pass_percent', m.pass_percent, 'results', results);
end $$;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;

-- Complete onboarding + enroll in all published courses
create or replace function public.complete_onboarding(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update profiles set
    full_name = coalesce(nullif(p->>'full_name',''), full_name),
    school_name = p->>'school_name',
    designation = p->>'designation',
    city = p->>'city',
    state = p->>'state',
    school_board = p->>'school_board',
    student_count = p->>'student_count',
    whatsapp = p->>'whatsapp',
    onboarded_at = coalesce(onboarded_at, now()),
    last_active_at = now()
  where id = uid;

  insert into enrollments (user_id, course_id)
  select uid, c.id from courses c where c.is_published
  on conflict do nothing;
end $$;
grant execute on function public.complete_onboarding(jsonb) to authenticated;

-- Issue certificate (only if course completed)
create or replace function public.issue_certificate(p_course uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cid text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select id into cid from certificates where user_id = uid and course_id = p_course;
  if cid is not null then return cid; end if;

  if not exists (select 1 from enrollments where user_id = uid and course_id = p_course and completed_at is not null) then
    raise exception 'course not completed yet';
  end if;

  cid := 'NG-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into certificates (id, user_id, course_id) values (cid, uid, p_course);
  return cid;
end $$;
grant execute on function public.issue_certificate(uuid) to authenticated;

-- Public certificate verification
create or replace function public.verify_certificate(p_id text)
returns table (id text, full_name text, school_name text, designation text,
               course_title text, issued_at timestamptz, revoked boolean)
language sql stable security definer set search_path = public as $$
  select c.id, p.full_name, p.school_name, p.designation, co.title, c.issued_at, c.revoked
    from certificates c
    join profiles p on p.id = c.user_id
    join courses co on co.id = c.course_id
   where c.id = upper(p_id);
$$;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- Admin: reset a user's progress on a module (and everything after it)
create or replace function public.admin_reset_progress(p_user uuid, p_module uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  delete from module_progress where user_id = p_user and module_id = p_module;
  update enrollments e set completed_at = null
    from modules m where m.id = p_module and e.course_id = m.course_id and e.user_id = p_user;
end $$;
grant execute on function public.admin_reset_progress(uuid, uuid) to authenticated;

-- Admin: force-complete a module for a user (manual unlock of next one)
create or replace function public.admin_complete_module(p_user uuid, p_module uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  insert into module_progress (user_id, module_id, video_completed, quiz_passed, completed_at)
  values (p_user, p_module, true, true, now())
  on conflict (user_id, module_id) do update
    set video_completed = true, quiz_passed = true, completed_at = coalesce(module_progress.completed_at, now());
  perform public._refresh_completion(p_user, p_module);
end $$;
grant execute on function public.admin_complete_module(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.site_settings   enable row level security;
alter table public.courses         enable row level security;
alter table public.modules         enable row level security;
alter table public.enrollments     enable row level security;
alter table public.module_progress enable row level security;
alter table public.quiz_questions  enable row level security;
alter table public.quiz_attempts   enable row level security;
alter table public.certificates    enable row level security;

-- profiles
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles for select
  using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update
  using (id = auth.uid() or public.is_admin());
-- users may only change safe columns (not role / onboarded_at)
revoke update on public.profiles from authenticated;
grant update (full_name, school_name, designation, city, state, school_board, student_count, whatsapp)
  on public.profiles to authenticated;

-- site settings
drop policy if exists "settings read" on public.site_settings;
create policy "settings read" on public.site_settings for select using (true);
drop policy if exists "settings admin write" on public.site_settings;
create policy "settings admin write" on public.site_settings for all
  using (public.is_admin()) with check (public.is_admin());

-- courses
drop policy if exists "courses read" on public.courses;
create policy "courses read" on public.courses for select using (is_published or public.is_admin());
drop policy if exists "courses admin write" on public.courses;
create policy "courses admin write" on public.courses for all
  using (public.is_admin()) with check (public.is_admin());

-- modules (video ids are read only via server; still fine to be selectable)
drop policy if exists "modules read" on public.modules;
create policy "modules read" on public.modules for select using (is_published or public.is_admin());
drop policy if exists "modules admin write" on public.modules;
create policy "modules admin write" on public.modules for all
  using (public.is_admin()) with check (public.is_admin());
-- hide raw video identifiers from browsers; server reads them with the service role
revoke select on public.modules from anon, authenticated;
grant select (id, course_id, position, title, subtitle, cover_url, duration_seconds, summary,
              takeaways, resources, pass_percent, popup_enabled, popup_interval_minutes,
              popup_type, popup_content, is_published)
  on public.modules to anon, authenticated;

-- enrollments / progress / attempts / certificates: own rows (writes via RPC only)
drop policy if exists "enroll read" on public.enrollments;
create policy "enroll read" on public.enrollments for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "progress read" on public.module_progress;
create policy "progress read" on public.module_progress for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "attempts read" on public.quiz_attempts;
create policy "attempts read" on public.quiz_attempts for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "certs read" on public.certificates;
create policy "certs read" on public.certificates for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "certs admin write" on public.certificates;
create policy "certs admin write" on public.certificates for update
  using (public.is_admin()) with check (public.is_admin());

-- quiz questions: admin only (students use get_quiz RPC)
drop policy if exists "quiz admin" on public.quiz_questions;
create policy "quiz admin" on public.quiz_questions for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- STORAGE (public bucket for logo + module covers)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('public-assets', 'public-assets', true)
  on conflict (id) do nothing;

drop policy if exists "assets public read" on storage.objects;
create policy "assets public read" on storage.objects for select
  using (bucket_id = 'public-assets');
drop policy if exists "assets admin write" on storage.objects;
create policy "assets admin write" on storage.objects for insert
  with check (bucket_id = 'public-assets' and public.is_admin());
drop policy if exists "assets admin update" on storage.objects;
create policy "assets admin update" on storage.objects for update
  using (bucket_id = 'public-assets' and public.is_admin());
drop policy if exists "assets admin delete" on storage.objects;
create policy "assets admin delete" on storage.objects for delete
  using (bucket_id = 'public-assets' and public.is_admin());
