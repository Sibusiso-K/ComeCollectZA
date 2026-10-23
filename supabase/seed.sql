-- Demo seed. Run once, after 0001_init.sql, in the Supabase SQL editor.
-- Centre names and coordinates are invented for demo purposes. Coordinates are approximate.
-- Demo operator and reclaimer accounts are created through Supabase Auth, then linked to these rows.

insert into materials (code, label, token) values
  ('PET', 'PET bottles', 'pet'),
  ('HDPE', 'HDPE', 'hdpe'),
  ('CAN_AL', 'Cans', 'can'),
  ('CARDBOARD', 'Cardboard', 'card'),
  ('PAPER_WHITE', 'Paper', 'paper'),
  ('GLASS', 'Glass', 'glass'),
  ('OTHER', 'Other', 'paper')
on conflict (code) do nothing;

insert into centres (id, name, area_id, location, hours) values
  ('11111111-1111-4111-8111-111111111111', 'Demo Centre Orlando East', 'orlando-east',
   extensions.st_setsrid(extensions.st_makepoint(27.9100, -26.2485), 4326)::extensions.geography, 'Mon to Sat 07:00 to 17:00'),
  ('22222222-2222-4222-8222-222222222222', 'Demo Centre Klipspruit', 'klipspruit',
   extensions.st_setsrid(extensions.st_makepoint(27.8650, -26.2700), 4326)::extensions.geography, 'Mon to Sat 07:30 to 16:30'),
  ('33333333-3333-4333-8333-333333333333', 'Demo Centre Alexandra', 'alexandra',
   extensions.st_setsrid(extensions.st_makepoint(28.0930, -26.1040), 4326)::extensions.geography, 'Mon to Fri 08:00 to 16:00')
on conflict (id) do nothing;

-- Prices in cents per kg. Anchored on the 2026 reports: PET about R3.80, cans about R10.20.
insert into prices (centre_id, material, cents_per_kg) values
  ('11111111-1111-4111-8111-111111111111', 'PET', 380),
  ('11111111-1111-4111-8111-111111111111', 'CAN_AL', 1020),
  ('11111111-1111-4111-8111-111111111111', 'CARDBOARD', 90),
  ('11111111-1111-4111-8111-111111111111', 'GLASS', 40),
  ('22222222-2222-4222-8222-222222222222', 'PET', 350),
  ('22222222-2222-4222-8222-222222222222', 'CAN_AL', 1000),
  ('22222222-2222-4222-8222-222222222222', 'CARDBOARD', 85),
  ('22222222-2222-4222-8222-222222222222', 'GLASS', 40),
  ('33333333-3333-4333-8333-333333333333', 'PET', 365),
  ('33333333-3333-4333-8333-333333333333', 'CAN_AL', 990),
  ('33333333-3333-4333-8333-333333333333', 'CARDBOARD', 95),
  ('33333333-3333-4333-8333-333333333333', 'GLASS', 35);

-- Run once. Re-running adds duplicate price rows; delete from prices first if you need to reseed.
