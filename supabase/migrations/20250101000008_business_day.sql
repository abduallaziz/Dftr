-- Business day: the working day continues past midnight until a cutoff hour (owner setting, default 04:00 Riyadh).
-- Anything recorded before the cutoff belongs to the previous calendar day.
insert into public.app_settings (key, value) values ('day_cutoff_hour', '4'::jsonb)
on conflict (key) do nothing;

create or replace function public.business_today() returns date
language sql stable as $$
  select ((now() at time zone 'Asia/Riyadh')
          - make_interval(hours => coalesce((select (value #>> '{}')::int from public.app_settings where key = 'day_cutoff_hour'), 0))
         )::date
$$;

revoke all on function public.business_today() from public, anon, authenticated;
grant execute on function public.business_today() to service_role;
