-- How each expense was paid. Default is cash; the employee can switch it to credit card when registering.
alter table public.expenses
  add column payment_method text not null default 'cash'
  check (payment_method in ('cash', 'card'));
