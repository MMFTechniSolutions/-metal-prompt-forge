-- 2026-11-06 : palier Forge Pro (5,99 $/mois = Forge Plus + accès MCP)
-- Nouvelle valeur de tier : 'forge_pro' (le code « payant = tier != free » la reconnaît déjà partout).
-- Ici : compteur d'appels MCP par jour et par outil (limites anti-pillage de la recette).
-- PAS ENCORE APPLIQUÉE — à appliquer quand François valide.

create table if not exists public.mcp_usage (
  user_id uuid not null,
  day date not null,
  tool text not null,
  count integer not null default 0,
  primary key (user_id, day, tool)
);

alter table public.mcp_usage enable row level security;
-- Aucune policy : seule la clé service (serveur) lit/écrit. Personne d'autre ne voit les compteurs.

-- Depuis le 30 oct. 2026, Supabase n'ouvre plus les nouvelles tables à l'API : GRANT explicites.
-- Table serveur seulement → service_role uniquement (pas anon, pas authenticated).
revoke all on public.mcp_usage from anon, authenticated;
grant select, insert, update, delete on public.mcp_usage to service_role;

-- Incrément atomique : retourne le nouveau compte (le serveur compare à la limite).
create or replace function public.mcp_bump(p_user uuid, p_day date, p_tool text)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.mcp_usage (user_id, day, tool, count)
  values (p_user, p_day, p_tool, 1)
  on conflict (user_id, day, tool) do update set count = public.mcp_usage.count + 1
  returning count;
$$;

revoke all on function public.mcp_bump(uuid, date, text) from public, anon, authenticated;
grant execute on function public.mcp_bump(uuid, date, text) to service_role;
