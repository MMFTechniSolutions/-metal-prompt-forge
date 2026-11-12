-- Suivi des retours des membres (11 nov. 2026)
-- last_seen_at : dernière visite connectée. user_visits : 1 ligne par membre par jour (heure de l'Est).
-- Tout passe par touch_last_seen() (security definer) : aucun accès direct à la table pour anon/authenticated.

alter table public.users add column if not exists last_seen_at timestamptz;

create table if not exists public.user_visits (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);
alter table public.user_visits enable row level security;
revoke all on public.user_visits from anon, authenticated;
grant select, insert, update, delete on public.user_visits to service_role;

create or replace function public.touch_last_seen()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text;
  v_day date := (now() at time zone 'America/Toronto')::date;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then return; end if;
  update public.users
     set last_seen_at = now()
   where email = v_email
     and (last_seen_at is null or last_seen_at < now() - interval '10 minutes');
  insert into public.user_visits (user_id, day)
  values (auth.uid(), v_day)
  on conflict do nothing;
end $function$;

revoke all on function public.touch_last_seen() from public, anon;
grant execute on function public.touch_last_seen() to authenticated, service_role;
