-- Popup interval in seconds (allows a 20-second test interval)
alter table public.modules add column if not exists popup_interval_seconds int;
update public.modules set popup_interval_seconds = popup_interval_minutes * 60 where popup_interval_seconds is null;
alter table public.modules alter column popup_interval_seconds set default 900;
alter table public.modules alter column popup_interval_seconds set not null;
grant select (popup_interval_seconds) on public.modules to anon, authenticated;
