-- PostgREST cannot resolve overloaded admin_create_market (7 vs 8 args)
drop function if exists public.admin_create_market(
  text, text, text, text, timestamptz, text, jsonb
);
