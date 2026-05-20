-- E3: заявки на вывод (заготовка без PSP; баланс не списывается до интеграции E2/E4)

insert into public.rate_limit_rules (action, max_requests, window_seconds)
values ('withdrawal_request', 3, 3600)
on conflict (action) do nothing;

create table public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(18, 4) not null check (amount > 0),
  method text not null check (method in ('bank', 'card', 'crypto')),
  details text check (details is null or length(trim(details)) <= 500),
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'completed', 'cancelled')
  ),
  admin_note text check (admin_note is null or length(trim(admin_note)) <= 2000),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index withdrawal_requests_user_created_idx
  on public.withdrawal_requests (user_id, created_at desc);

create index withdrawal_requests_status_created_idx
  on public.withdrawal_requests (status, created_at desc);

create unique index withdrawal_requests_one_pending_per_user
  on public.withdrawal_requests (user_id)
  where status = 'pending';

alter table public.withdrawal_requests enable row level security;

create policy "withdrawal_requests read own" on public.withdrawal_requests
  for select using (auth.uid() = user_id);

revoke insert, update, delete on public.withdrawal_requests from anon, authenticated;

create or replace function public.submit_withdrawal_request(
  p_amount numeric,
  p_method text,
  p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance numeric;
  v_request_id uuid;
  v_details text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.assert_rate_limit('withdrawal_request');

  if p_method not in ('bank', 'card', 'crypto') then
    raise exception 'Invalid withdrawal method';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid amount';
  end if;

  if p_amount > 1000000 then
    raise exception 'Amount too large';
  end if;

  v_details := nullif(trim(p_details), '');
  if v_details is not null and length(v_details) > 500 then
    raise exception 'Details too long';
  end if;

  select balance into v_balance from public.profiles where id = v_user_id;
  if v_balance is null then
    raise exception 'Profile not found';
  end if;

  if p_amount > v_balance then
    raise exception 'Insufficient balance';
  end if;

  insert into public.withdrawal_requests (user_id, amount, method, details)
  values (v_user_id, p_amount, p_method, v_details)
  returning id into v_request_id;

  return v_request_id;
exception
  when unique_violation then
    raise exception 'Withdrawal already pending';
end;
$$;

grant execute on function public.submit_withdrawal_request(numeric, text, text)
  to authenticated;

create or replace function public.list_my_withdrawal_requests(p_limit integer default 50)
returns table (
  id uuid,
  amount numeric,
  method text,
  details text,
  status text,
  created_at timestamptz,
  reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select
    w.id,
    w.amount,
    w.method,
    w.details,
    w.status,
    w.created_at,
    w.reviewed_at
  from public.withdrawal_requests w
  where w.user_id = v_user_id
  order by w.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$$;

grant execute on function public.list_my_withdrawal_requests(integer) to authenticated;
