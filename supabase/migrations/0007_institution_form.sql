-- Onboarding form v2: Institution name, Role, City, State, Institution type
alter table public.profiles add column if not exists institution_type text
  check (institution_type is null or institution_type in ('School','Coaching Institute','University'));
grant update (institution_type) on public.profiles to authenticated;

create or replace function public.complete_onboarding(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if coalesce(p->>'institution_type','') not in ('School','Coaching Institute','University') then
    raise exception 'invalid institution type';
  end if;
  update profiles set
    school_name      = p->>'school_name',
    designation      = p->>'designation',
    city             = p->>'city',
    state            = p->>'state',
    institution_type = p->>'institution_type',
    onboarded_at     = coalesce(onboarded_at, now()),
    last_active_at   = now()
  where id = uid;

  insert into enrollments (user_id, course_id)
  select uid, c.id from courses c where c.is_published
  on conflict do nothing;
end $$;
grant execute on function public.complete_onboarding(jsonb) to authenticated;
