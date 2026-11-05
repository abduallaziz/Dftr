-- Car wash reporting: core schema.
-- All access happens through Edge Functions using the service role.
-- RLS is enabled with NO policies, so anon/authenticated roles can read/write nothing.

create table public.expense_categories (
  id         text primary key check (id ~ '^[a-z][a-z0-9_]{1,40}$'),
  name_ar    text not null,
  name_en    text not null,
  name_bn    text not null,
  icon       text not null,
  is_active  boolean not null default true,
  sort_order integer not null default 0
);

create table public.daily_reports (
  report_date date primary key,
  free_large  integer not null default 0 check (free_large between 0 and 10000),
  free_small  integer not null default 0 check (free_small between 0 and 10000),
  mada        numeric(12,2) not null default 0 check (mada between 0 and 100000000),
  visa        numeric(12,2) not null default 0 check (visa between 0 and 100000000),
  mastercard  numeric(12,2) not null default 0 check (mastercard between 0 and 100000000),
  cash        numeric(12,2) not null default 0 check (cash between 0 and 100000000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.expenses (
  id          bigint generated always as identity primary key,
  category_id text not null references public.expense_categories (id),
  amount      numeric(12,2) not null check (amount > 0 and amount <= 10000000),
  -- Business date in Saudi Arabia time, assigned by the server.
  report_date date not null default ((now() at time zone 'Asia/Riyadh')::date),
  created_at  timestamptz not null default now(),
  -- Client-generated key: makes retries / double taps idempotent.
  client_key  uuid not null unique
);

create index expenses_report_date_idx on public.expenses (report_date);
create index expenses_category_date_idx on public.expenses (category_id, report_date);

alter table public.expense_categories enable row level security;
alter table public.daily_reports      enable row level security;
alter table public.expenses           enable row level security;

revoke all on public.expense_categories from anon, authenticated;
revoke all on public.daily_reports      from anon, authenticated;
revoke all on public.expenses           from anon, authenticated;

grant select, insert, update on public.daily_reports      to service_role;
grant select, insert         on public.expenses           to service_role;
grant select                 on public.expense_categories to service_role;
