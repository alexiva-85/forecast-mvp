-- PostgREST не различает перегрузки с default-параметрами — оставляем одну сигнатуру

drop function if exists public.admin_resolve_market(uuid, text);
