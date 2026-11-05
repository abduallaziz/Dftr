-- Independent car counts: the employee counts at the wash, the accountant counts from the camera.
-- The employee never sees the accountant's number; the accountant sees the employee's number only
-- after recording their own (enforced here and in accountant-api).
alter table public.daily_reports
  add column employee_total_cars integer check (employee_total_cars between 0 and 10000);

create or replace function public.report_summary(p_from date, p_to date) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'total_expenses', coalesce((select sum(amount) from public.expenses where report_date between p_from and p_to), 0),
    'entries_count',  (select count(*) from public.expenses where report_date between p_from and p_to),
    'by_category',    coalesce((select jsonb_object_agg(category_id, s) from (
                         select category_id, sum(amount) as s from public.expenses
                         where report_date between p_from and p_to group by category_id) c), '{}'::jsonb),
    'free_large',     coalesce((select sum(free_large) from public.daily_reports where report_date between p_from and p_to), 0),
    'free_small',     coalesce((select sum(free_small) from public.daily_reports where report_date between p_from and p_to), 0),
    'mada',           coalesce((select sum(mada) from public.daily_reports where report_date between p_from and p_to), 0),
    'visa',           coalesce((select sum(visa) from public.daily_reports where report_date between p_from and p_to), 0),
    'mastercard',     coalesce((select sum(mastercard) from public.daily_reports where report_date between p_from and p_to), 0),
    'cash',           coalesce((select sum(cash) from public.daily_reports where report_date between p_from and p_to), 0),
    'total_cars',     coalesce((select sum(total_cars) from public.daily_totals where report_date between p_from and p_to), 0),
    -- free cars only on days where the accountant recorded a total, so actual = total - free is consistent
    'days_match',     (select count(*) from public.daily_reports r join public.daily_totals t using (report_date)
                         where r.report_date between p_from and p_to and r.employee_total_cars = t.total_cars),
    'days_mismatch',  (select count(*) from public.daily_reports r join public.daily_totals t using (report_date)
                         where r.report_date between p_from and p_to and r.employee_total_cars is not null
                           and r.employee_total_cars <> t.total_cars),
    'free_cars_on_total_days', coalesce((select sum(r.free_large + r.free_small) from public.daily_reports r
                         join public.daily_totals t using (report_date)
                         where r.report_date between p_from and p_to), 0)
  )
$$;

create or replace function public.report_daily(
  p_from date, p_to date,
  p_sort text default 'date', p_dir text default 'desc',
  p_limit integer default 20, p_offset integer default 0
) returns jsonb
language sql stable as $$
  with days as (
    select report_date from public.daily_reports where report_date between p_from and p_to
    union
    select report_date from public.expenses where report_date between p_from and p_to
    union
    select report_date from public.daily_totals where report_date between p_from and p_to
  ),
  per_cat as (
    select report_date, category_id, sum(amount) as s
    from public.expenses where report_date between p_from and p_to
    group by report_date, category_id
  ),
  exp as (
    select report_date, sum(s) as total, jsonb_object_agg(category_id, s) as by_category
    from per_cat group by report_date
  ),
  cnt as (
    select report_date, count(*) as n from public.expenses
    where report_date between p_from and p_to group by report_date
  ),
  rows_all as (
    select d.report_date,
           (r.report_date is not null) as has_report,
           r.free_large, r.free_small, r.mada, r.visa, r.mastercard, r.cash,
           tc.total_cars,
           case when tc.total_cars is not null then r.employee_total_cars end as employee_total_cars,
           coalesce(e.total, 0) as total_expenses,
           coalesce(e.by_category, '{}'::jsonb) as by_category,
           coalesce(c.n, 0) as entries_count
    from days d
    left join public.daily_reports r on r.report_date = d.report_date
    left join public.daily_totals tc on tc.report_date = d.report_date
    left join exp e on e.report_date = d.report_date
    left join cnt c on c.report_date = d.report_date
  ),
  ranked as (
    select r.*, row_number() over (
      order by
        case when p_sort = 'amount' and p_dir = 'asc'  then total_expenses end asc,
        case when p_sort = 'amount' and p_dir <> 'asc' then total_expenses end desc,
        case when p_sort <> 'amount' and p_dir = 'asc'  then report_date end asc,
        case when p_sort <> 'amount' and p_dir <> 'asc' then report_date end desc,
        report_date desc
    ) as rn
    from rows_all r
  )
  select jsonb_build_object(
    'total_count', (select count(*) from rows_all),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(ranked) - 'rn' order by rn) from ranked
      where rn > greatest(p_offset, 0) and rn <= greatest(p_offset, 0) + greatest(least(p_limit, 100), 1)
    ), '[]'::jsonb)
  )
$$;

revoke all on function public.report_summary(date, date)                             from public, anon, authenticated;
revoke all on function public.report_daily(date, date, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.report_summary(date, date)                             to service_role;
grant execute on function public.report_daily(date, date, text, text, integer, integer) to service_role;
