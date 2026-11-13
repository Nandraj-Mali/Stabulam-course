-- Completion = reached 90% of the video (no watch-time rule); max 1.5x speed.
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
