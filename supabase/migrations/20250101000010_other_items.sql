-- "Other" expenses: the employee types what he bought in his own language; the server stores the original text
-- and its Arabic / English / Bengali translations, so each reader sees it in his language.
insert into public.expense_categories (id, name_ar, name_en, name_bn, icon, sort_order) values
  ('other', 'أخرى (غير مدرج)', 'Other (not listed)', 'অন্যান্য (তালিকায় নেই)', 'ShoppingCart', 99)
on conflict (id) do nothing;

alter table public.expenses
  add column note_ar  text check (note_ar  is null or char_length(note_ar)  between 1 and 120),
  add column note_en  text check (note_en  is null or char_length(note_en)  between 1 and 120),
  add column note_bn  text check (note_bn  is null or char_length(note_bn)  between 1 and 120),
  -- language the employee actually wrote (the others are translations of it)
  add column note_src text check (note_src is null or note_src in ('ar', 'en', 'bn'));
