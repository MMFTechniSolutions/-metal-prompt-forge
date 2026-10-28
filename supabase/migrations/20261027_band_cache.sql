-- Cache de groupes pour /api/reverse (pré-classés avec Opus, oct. 2026). Lu côté serveur seulement (service_role).
-- À coller dans Supabase → SQL Editor → Run. GRANT inclus dans la même migration (règle Supabase du 30 oct. 2026).
create table if not exists public.band_cache (
  name_key   text primary key,
  band       text not null,
  genre      text not null,
  flavor     text not null default '',
  signature  text[] not null default '{}',
  confidence text not null default 'medium' check (confidence in ('high','medium','low')),
  created_at timestamptz not null default now()
);
alter table public.band_cache enable row level security;
revoke all on public.band_cache from anon, authenticated;
grant select, insert, update, delete on public.band_cache to service_role;
