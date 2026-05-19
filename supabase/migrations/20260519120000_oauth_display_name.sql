-- D3: имя из OAuth (Google/GitHub) в профиле при регистрации
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
    values (
      new.id,
      coalesce(
        nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
        nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
        nullif(trim(new.raw_user_meta_data->>'name'), ''),
        nullif(trim(new.raw_user_meta_data->>'user_name'), ''),
        split_part(coalesce(new.email, 'user'), '@', 1)
      )
    );
  return new;
end;
$$;
