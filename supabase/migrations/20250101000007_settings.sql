-- Owner-controlled switches. Read by accountant-api (enforcement happens server-side), written by admin-api.
create table public.app_settings (
  key        text primary key check (key ~ '^[a-z][a-z0-9_]{1,60}$'),
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
grant select, insert, update on public.app_settings to service_role;

insert into public.app_settings (key, value) values ('show_payments_to_accountant', 'true'::jsonb)
on conflict (key) do nothing;
