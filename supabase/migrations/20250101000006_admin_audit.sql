-- Audit trail for owner edits/deletes made through admin-api.
create table public.audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  action     text not null,
  table_name text not null,
  record_key text not null,
  before     jsonb,
  after      jsonb
);
alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select, insert on public.audit_log to service_role;

-- Admin needs to change/delete rows and manage categories.
grant update, delete on public.expenses            to service_role;
grant delete         on public.daily_reports       to service_role;
grant delete         on public.daily_totals        to service_role;
grant insert, update on public.expense_categories  to service_role;
