insert into public.expense_categories (id, name_ar, name_en, name_bn, icon, sort_order) values
  ('water_truck',      'وايت ماء',     'Water Truck',      'পানির ট্রাক',          'Truck',    1),
  ('soap',             'صابون',        'Soap',             'সাবান',                'Droplets', 2),
  ('perfume',          'عطر',          'Perfume',          'পারফিউম',              'SprayCan', 3),
  ('dashboard_polish', 'ملمع طبلون',   'Dashboard Polish', 'ড্যাশবোর্ড পলিশ',      'Sparkles', 4),
  ('tire_polish',      'ملمع كفرات',   'Tire Polish',      'টায়ার পলিশ',          'CircleDot',5),
  ('gas',              'غاز',          'Gas',              'গ্যাস',                'Flame',    6),
  ('hand_vacuum',      'مكنسة يدوية',  'Hand Vacuum',      'হ্যান্ড ভ্যাকুয়াম',   'Wind',     7),
  ('order_shipping',   'شحن طلبية',    'Order Shipping',   'অর্ডার শিপিং',         'Package',  8)
on conflict (id) do nothing;
