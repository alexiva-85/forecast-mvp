-- D6: жалобы пользователей · A13: история ставки комиссии

insert into public.rate_limit_rules (action, max_requests, window_seconds)
values ('content_report', 5, 3600)
on conflict (action) do nothing;

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  subject_type text not null check (subject_type in ('market', 'user')),
  subject_id uuid not null,
  reason text not null check (
    reason in ('misleading', 'offensive', 'spam', 'other')
  ),
  details text check (details is null or length(trim(details)) <= 2000),
  status text not null default 'pending' check (
    status in ('pending', 'reviewed', 'dismissed', 'action_taken')
  ),
  admin_note text check (admin_note is null or length(trim(admin_note)) <= 2000),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index content_reports_status_created_idx
  on public.content_reports (status, created_at desc);

create index content_reports_subject_idx
  on public.content_reports (subject_type, subject_id);

create unique index content_reports_one_pending_per_reporter_subject
  on public.content_reports (reporter_id, subject_type, subject_id)
  where status = 'pending';

alter table public.content_reports enable row level security;

create policy "content_reports insert own" on public.content_reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

create or replace function public.submit_content_report(
  p_subject_type text,
  p_subject_slug text,
  p_reason text,
  p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_subject_id uuid;
  v_report_id uuid;
  v_details text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.assert_rate_limit('content_report');

  if p_subject_type not in ('market', 'user') then
    raise exception 'Invalid subject type';
  end if;

  if p_reason not in ('misleading', 'offensive', 'spam', 'other') then
    raise exception 'Invalid reason';
  end if;

  v_details := nullif(trim(p_details), '');
  if v_details is not null and length(v_details) > 2000 then
    raise exception 'Details too long';
  end if;

  if p_subject_type = 'market' then
    select id into v_subject_id
    from public.markets
    where slug = trim(p_subject_slug);
    if v_subject_id is null then
      raise exception 'Market not found';
    end if;
  else
    begin
      v_subject_id := trim(p_subject_slug)::uuid;
    exception
      when invalid_text_representation then
        raise exception 'User not found';
    end;
    if not exists (select 1 from public.profiles where id = v_subject_id) then
      raise exception 'User not found';
    end if;
    if v_subject_id = v_user_id then
      raise exception 'Cannot report yourself';
    end if;
  end if;

  insert into public.content_reports (
    reporter_id,
    subject_type,
    subject_id,
    reason,
    details
  ) values (
    v_user_id,
    p_subject_type,
    v_subject_id,
    p_reason,
    v_details
  )
  returning id into v_report_id;

  return v_report_id;
exception
  when unique_violation then
    raise exception 'Report already pending';
end;
$$;

grant execute on function public.submit_content_report(text, text, text, text)
  to authenticated;

create or replace function public.admin_reports_list(
  p_status text default 'pending',
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  created_at timestamptz,
  status text,
  subject_type text,
  subject_id uuid,
  subject_slug text,
  subject_title text,
  reason text,
  details text,
  reporter_id uuid,
  reporter_display_name text,
  admin_note text,
  reviewed_at timestamptz,
  reviewer_display_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select
    r.id,
    r.created_at,
    r.status,
    r.subject_type,
    r.subject_id,
    case
      when r.subject_type = 'market' then m.slug
      else coalesce(p_sub.display_name, p_sub.id::text)
    end as subject_slug,
    case
      when r.subject_type = 'market' then m.title
      else coalesce(p_sub.display_name, 'Пользователь')
    end as subject_title,
    r.reason,
    r.details,
    r.reporter_id,
    p_rep.display_name as reporter_display_name,
    r.admin_note,
    r.reviewed_at,
    p_rev.display_name as reviewer_display_name
  from public.content_reports r
  join public.profiles p_rep on p_rep.id = r.reporter_id
  left join public.markets m on r.subject_type = 'market' and m.id = r.subject_id
  left join public.profiles p_sub on r.subject_type = 'user' and p_sub.id = r.subject_id
  left join public.profiles p_rev on p_rev.id = r.reviewed_by
  where p_status is null or p_status = 'all' or r.status = p_status
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

grant execute on function public.admin_reports_list(text, int, int) to authenticated;

create or replace function public.admin_pending_reports_count()
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  return (
    select count(*)::int
    from public.content_reports
    where status = 'pending'
  );
end;
$$;

grant execute on function public.admin_pending_reports_count() to authenticated;

create or replace function public.admin_update_content_report(
  p_report_id uuid,
  p_status text,
  p_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old record;
  v_note text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_status not in ('reviewed', 'dismissed', 'action_taken') then
    raise exception 'Invalid status';
  end if;

  v_note := nullif(trim(p_admin_note), '');
  if v_note is not null and length(v_note) > 2000 then
    raise exception 'Admin note too long';
  end if;

  select * into v_old from public.content_reports where id = p_report_id;
  if v_old.id is null then
    raise exception 'Report not found';
  end if;

  if v_old.status <> 'pending' then
    raise exception 'Report already processed';
  end if;

  update public.content_reports
  set
    status = p_status,
    admin_note = v_note,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_report_id;

  perform public.log_admin_action(
    'report.update',
    'platform',
    p_report_id,
    null,
    format('Жалоба: %s → %s', v_old.reason, p_status),
    jsonb_build_object(
      'report_id', p_report_id,
      'subject_type', v_old.subject_type,
      'subject_id', v_old.subject_id,
      'reason', v_old.reason,
      'old_status', v_old.status,
      'new_status', p_status
    )
  );
end;
$$;

grant execute on function public.admin_update_content_report(uuid, text, text)
  to authenticated;

create or replace function public.admin_fee_rate_history_list(
  p_limit int default 30
)
returns table (
  id uuid,
  created_at timestamptz,
  admin_id uuid,
  admin_display_name text,
  summary text,
  old_rate numeric,
  new_rate numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select
    l.id,
    l.created_at,
    l.admin_id,
    p.display_name as admin_display_name,
    l.summary,
    (l.metadata->>'old_rate')::numeric as old_rate,
    (l.metadata->>'new_rate')::numeric as new_rate
  from public.admin_audit_log l
  join public.profiles p on p.id = l.admin_id
  where l.action = 'platform.set_fee_rate'
  order by l.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
end;
$$;

grant execute on function public.admin_fee_rate_history_list(int) to authenticated;
