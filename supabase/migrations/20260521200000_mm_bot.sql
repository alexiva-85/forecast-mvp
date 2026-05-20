-- E7: MM-bot service account (off-chain liquidity)

alter table public.profiles
  add column if not exists is_mm_bot boolean not null default false;

comment on column public.profiles.is_mm_bot is
  'Market-maker bot: exempt from trading rate limits (E7).';

create or replace function public.is_mm_bot()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_mm_bot from public.profiles where id = auth.uid()),
    false
  );
$$;

-- assert_rate_limit: is_mm_bot exempt — see 20260521200100_mm_bot_rate_limit_fix.sql
