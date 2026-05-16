-- Run after migration in Supabase SQL Editor (or via supabase db seed)

insert into public.markets (slug, title, description, category, closes_at) values
(
  'real-madrid-ucl-2026',
  'Реал Мадрид выиграет Лигу чемпионов 2025/26',
  'Рынок закроется после финала ЛЧ. Резолв: официальный победитель турнира UEFA.',
  'sport',
  '2026-06-01T00:00:00Z'
),
(
  'btc-150k-2026',
  'Bitcoin выше $150 000 до 31 декабря 2026',
  'Резолв по цене BTC/USDT на Binance (daily close). Да — если хотя бы один день закрылся выше $150k.',
  'crypto',
  '2026-12-31T23:59:59Z'
),
(
  'russia-world-cup-2026',
  'Сборная России выйдет на ЧМ-2026',
  'Да — если РФ примет участие в финальной стадии ЧМ-2026 (отбор или прямой допуск).',
  'sport',
  '2026-06-11T00:00:00Z'
)
on conflict (slug) do nothing;
