-- C2/C3: admin create market + resolution rules

alter table public.markets
  add column if not exists resolution_rules text,
  add column if not exists resolution_checklist jsonb not null default '[]'::jsonb;

create or replace function public.admin_create_market(
  p_slug text,
  p_title text,
  p_description text,
  p_category text,
  p_closes_at timestamptz,
  p_resolution_rules text,
  p_resolution_checklist jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid slug';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'Title required';
  end if;

  if p_category not in ('sport', 'crypto') then
    raise exception 'Invalid category';
  end if;

  if p_resolution_rules is null or length(trim(p_resolution_rules)) = 0 then
    raise exception 'Resolution rules required';
  end if;

  if p_resolution_checklist is null
    or jsonb_typeof(p_resolution_checklist) <> 'array'
    or jsonb_array_length(p_resolution_checklist) = 0 then
    raise exception 'Resolution checklist required';
  end if;

  insert into public.markets (
    slug,
    title,
    description,
    category,
    closes_at,
    resolution_rules,
    resolution_checklist
  ) values (
    p_slug,
    trim(p_title),
    nullif(trim(p_description), ''),
    p_category,
    p_closes_at,
    trim(p_resolution_rules),
    p_resolution_checklist
  )
  returning id into v_market_id;

  return v_market_id;
end;
$$;

grant execute on function public.admin_create_market(
  text, text, text, text, timestamptz, text, jsonb
) to authenticated;

-- Backfill seed markets when columns were empty
update public.markets set
  resolution_rules = 'Рынок закроется после финала ЛЧ. Резолв: официальный победитель турнира UEFA.',
  resolution_checklist = '[
    "Событие завершено (финал ЛЧ сыгран)",
    "Победитель опубликован на uefa.com",
    "Реал Мадрид — официальный победитель"
  ]'::jsonb
where slug = 'real-madrid-ucl-2026' and resolution_rules is null;

update public.markets set
  resolution_rules = 'Резолв по цене BTC/USDT на Binance (daily close). Да — если хотя бы один день закрылся выше $150k.',
  resolution_checklist = '[
    "Дата наступила: 31.12.2026 или позже",
    "Проверена daily close на Binance BTC/USDT",
    "Зафиксирован хотя бы один close > $150 000"
  ]'::jsonb
where slug = 'btc-150k-2026' and resolution_rules is null;

update public.markets set
  resolution_rules = 'Да — если РФ примет участие в финальной стадии ЧМ-2026 (отбор или прямой допуск).',
  resolution_checklist = '[
    "Состав участников ЧМ-2026 утверждён FIFA",
    "Проверен официальный список команд",
    "Россия включена в финальную стадию"
  ]'::jsonb
where slug = 'russia-world-cup-2026' and resolution_rules is null;
