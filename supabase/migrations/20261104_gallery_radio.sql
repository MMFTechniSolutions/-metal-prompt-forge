-- Radio MetalPrompt : compteur d'écoutes + palmarès de la semaine (nov. 2026)
alter table public.gallery add column if not exists plays integer not null default 0;

create or replace function public.gallery_play(gid uuid)
returns void language sql security definer set search_path = public as $$
  update public.gallery set plays = plays + 1 where id = gid and status = 'approved';
$$;

create or replace function public.gallery_chart(p_days integer default 7)
returns table(gallery_id uuid, votes_week bigint, votes_prev bigint)
language sql stable security definer set search_path = public as $$
  with d as (select ((now() at time zone 'America/Toronto')::date) as today)
  select g.id,
         count(v.*) filter (where v.vote_day > d.today - p_days),
         count(v.*) filter (where v.vote_day <= d.today - p_days and v.vote_day > d.today - 2*p_days)
  from public.gallery g cross join d
  left join public.gallery_votes v on v.gallery_id = g.id
  where g.status = 'approved'
  group by g.id;
$$;

revoke all on function public.gallery_play(uuid) from public;
revoke all on function public.gallery_chart(integer) from public;
grant execute on function public.gallery_play(uuid) to anon, authenticated;
grant execute on function public.gallery_chart(integer) to anon, authenticated;
