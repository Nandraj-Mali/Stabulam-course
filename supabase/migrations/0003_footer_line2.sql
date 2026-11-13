-- Second footer line, editable from Admin → Site settings
alter table public.site_settings add column if not exists footer_text_2 text default 'Made for schools across India';
update public.site_settings set footer_text_2 = 'Made for schools across India' where id = 1 and footer_text_2 is null;
