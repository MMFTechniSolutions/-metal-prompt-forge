-- Radio MetalPrompt EN DIRECT 24/7 (4 nov. 2026) — à coller dans Supabase > SQL Editor
-- Inclut la migration 20261104_gallery_radio.sql (écoutes + palmarès) qui n'avait pas été roulée.
alter table public.gallery add column if not exists plays integer not null default 0;
alter table public.gallery add column if not exists duration real;

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

-- durée manquante : remplie une seule fois (jamais écrasée)
create or replace function public.gallery_set_duration(gid uuid, d real)
returns void language sql security definer set search_path = public as $$
  update public.gallery set duration = d
  where id = gid and status = 'approved' and duration is null and d > 5 and d < 3600;
$$;

-- heure du serveur (ms) : tout le monde suit la même horloge
create or replace function public.radio_now()
returns double precision language sql stable as $$ select extract(epoch from now()) * 1000; $$;

-- grille d'émissions (vide = mélange général 24/7). Heures de Montréal. jour : 0 = dimanche, null = tous les jours
create table if not exists public.radio_grille (
  id bigserial primary key,
  jour smallint check (jour between 0 and 6),
  heure_debut smallint not null check (heure_debut between 0 and 23),
  heure_fin smallint not null check (heure_fin between 1 and 24),
  genre text not null,
  titre text,
  actif boolean not null default true,
  check (heure_fin > heure_debut)
);
alter table public.radio_grille enable row level security;
drop policy if exists "read grille" on public.radio_grille;
create policy "read grille" on public.radio_grille for select using (actif);

revoke all on function public.gallery_play(uuid) from public;
revoke all on function public.gallery_chart(integer) from public;
revoke all on function public.gallery_set_duration(uuid, real) from public;
grant execute on function public.gallery_play(uuid) to anon, authenticated;
grant execute on function public.gallery_chart(integer) to anon, authenticated;
grant execute on function public.gallery_set_duration(uuid, real) to anon, authenticated;
grant execute on function public.radio_now() to anon, authenticated;
grant select on public.radio_grille to anon, authenticated;

-- Exemple d'émission (plus tard, avec du stock — 6 chansons du genre minimum, sinon mélange) :
-- insert into public.radio_grille (jour, heure_debut, heure_fin, genre, titre) values (null, 20, 21, 'Thrash', '1 h Thrash');

-- ── Durées des chansons déjà à la radio ──
update public.gallery set duration=374.12 where url='https://suno.com/song/bb36391a-4f6b-44c2-a753-e21038b43d4f' and duration is null;
update public.gallery set duration=198.76 where url='https://suno.com/song/6478bbbc-1f3e-4bd5-8930-9678322e16a3' and duration is null;
update public.gallery set duration=427.44 where url='https://suno.com/song/04dda0e3-96b4-43f2-9702-963efb62aece' and duration is null;
update public.gallery set duration=240.12 where url='https://suno.com/song/727607d4-16ac-419e-8f13-9e3ca0bb9483' and duration is null;
update public.gallery set duration=219.4 where url='https://suno.com/song/3547dfba-59d4-4479-8f15-9088772551d4' and duration is null;
update public.gallery set duration=179.96 where url='https://suno.com/song/61929c6e-f823-4aa2-9471-a301c414e679' and duration is null;
update public.gallery set duration=274.88 where url='https://suno.com/song/69b5b162-7ffb-48a0-a7c2-d1d85b35d415' and duration is null;
update public.gallery set duration=234.6 where url='https://suno.com/song/f5d73dd5-4302-406d-8c11-42731e9db16c' and duration is null;
update public.gallery set duration=359.36 where url='https://suno.com/song/a31972b3-9096-4003-9679-0d08d1768d56' and duration is null;
update public.gallery set duration=382.24 where url='https://suno.com/song/66cfe333-f5da-4efa-9528-a92bc8cc08b0' and duration is null;

-- ── Chansons Biofall Dominion (photo MetalPrompt) ajoutées à la radio ──
insert into public.gallery (title, artist, genre, url, image_url, duration, status)
select v.title, v.artist, v.genre, v.url, v.image_url, v.duration, 'approved'
from (values
  ('Seattle Grunge 1991','Biofall Dominion','Grunge','https://suno.com/song/6e2c6616-2bf3-41fe-a155-c7b9707ffeae','https://cdn1.suno.ai/5cf886c5-78e9-4c23-9cdd-73763cac38de.jpeg',149.8),
  ('Texas Groove 1992','Biofall Dominion','Groove','https://suno.com/song/23094a92-01b4-470c-8263-a0e6427a78b9','https://cdn1.suno.ai/c39686d6-5167-42ab-a3a0-633cc0af1931.jpeg',149.96),
  ('Bay Area Thrash 1986','Biofall Dominion','Thrash Metal','https://suno.com/song/1c111453-68ee-4a61-a3fa-6cf9e0c32d0d','https://cdn1.suno.ai/475bc466-104b-45d3-9e24-57a513ee131b.jpeg',149.92),
  ('NWOBHM 1982','Biofall Dominion','NWOBHM','https://suno.com/song/e85be69d-9253-49cf-9fec-c5ab6d778523','https://cdn1.suno.ai/429f28db-09c5-40ef-8f16-988e4214f6c9.jpeg',148.8),
  ('Coming Back Up (version longue A)','Biofall Dominion','Nu-Metal','https://suno.com/song/f9cc1fa1-a502-4142-bd92-4732682f167f','https://cdn1.suno.ai/d383fa40-e042-4056-a9db-761c0bbccfcd.jpeg',246.6),
  ('Nine-Piece Nu-Metal 1999','Biofall Dominion','Nu-Metal','https://suno.com/song/ee3ec429-d55e-49fe-bba2-578807a1be88','https://cdn1.suno.ai/3ec6a882-6363-4a43-a357-e3f1af5f01e6.jpeg',119.88),
  ('Black Metal 1993','Biofall Dominion','Black Metal','https://suno.com/song/61ed26dd-1219-4eb1-8b05-db225b5c214b','https://cdn1.suno.ai/4619cd53-794c-4971-8059-74944b7814de.jpeg',89.84),
  ('Florida Death 1996','Biofall Dominion','Death Metal','https://suno.com/song/e992028f-9828-4e9b-9e70-128cac691976','https://cdn1.suno.ai/4619cd53-794c-4971-8059-74944b7814de.jpeg',151.12),
  ('Swamp of the Damned','Biofall Dominion','Death Metal','https://suno.com/song/9e48c252-0ce2-4f59-878b-0a4deaffb3d0','https://cdn1.suno.ai/7d5e8421-3102-4a77-ad55-97eb28c1c46d.jpeg',254.76),
  ('The snow will bury every word you swore was true.','Biofall Dominion','Melodic Death','https://suno.com/song/fc48654f-c63a-47be-b2ad-70863c93ef7d','https://cdn1.suno.ai/image_large_fc48654f-c63a-47be-b2ad-70863c93ef7d.jpeg',413.64),
  ('The Still Point','Biofall Dominion','Autre','https://suno.com/song/b32ca0ec-9fac-4150-ada3-ab8d24c9a70b','https://cdn1.suno.ai/image_large_b32ca0ec-9fac-4150-ada3-ab8d24c9a70b.jpeg',402.8),
  ('Crown_of_Blackened','Biofall Dominion','Black Metal','https://suno.com/song/7a002d8e-79b9-4728-8caa-35caac87f64a','https://cdn1.suno.ai/c9313e25-04ab-41d2-9170-7be61e83154b.jpeg',319.92),
  ('Rebellion Carved in Stone','Biofall Dominion','Autre','https://suno.com/song/0355c8d7-1d6d-455a-8e59-3309cabebb85','https://cdn1.suno.ai/66e0968a-2f3b-415c-a8c7-17f616cd1f4d.jpeg',218.84),
  ('The Feast Beneath Our Feet','Biofall Dominion','Black Metal','https://suno.com/song/82e1ac04-1b7a-40e2-a5b1-8d65e1bea3e2','https://cdn1.suno.ai/02fedd07-4390-4dcb-98f3-95691542e518.jpeg',226.04),
  ('New Mornings Reek','Biofall Dominion','Metalcore','https://suno.com/song/9c45c7b6-d447-4c31-a57f-edf3dbb09c0a','https://cdn1.suno.ai/1ac2fe79-9c24-4a82-99cd-15fd2052d2c5.jpeg',218.8)
) as v(title, artist, genre, url, image_url, duration)
where not exists (select 1 from public.gallery g where g.url = v.url);

-- ── Annonces MetalPrompt (genre « Annonce » : une après chaque bloc de 3 chansons, hors palmarès) ──
-- Les rendre PUBLIQUES dans Suno, sinon le lecteur intégré les joue pas.
-- Pour changer de prise : remplacer l'id par l'autre version (même titre dans ta bibliothèque Suno).
insert into public.gallery (title, artist, genre, url, duration, status)
select v.title, 'MetalPrompt', 'Annonce', v.url, v.duration, 'approved'
from (values
  ('MetalPrompt Radio ID 1', 'https://suno.com/song/a62b7bba-e9b6-4468-b104-f74963f0bea1', 15.2),
  ('MetalPrompt Radio ID 2', 'https://suno.com/song/1b7465c2-faff-4657-a33d-e83d09bb7217', 14.8),
  ('MetalPrompt Radio ID 3', 'https://suno.com/song/804dbba4-1ca3-4e20-b229-665af6529cc1', 14.8),
  ('MetalPrompt Radio ID 4 (advertise)', 'https://suno.com/song/64beb701-e2e2-42b3-b34f-d77e5abd22c7', 15.2)
) as v(title, url, duration)
where not exists (select 1 from public.gallery g where g.url = v.url);
