-- 2026-11-07 : banque serveur de grooves + mélodies liés au style (base de la « toune complète »).
-- Chaque entrée = une section (intro/couplet/refrain/breakdown) d'un style : guitare, basse, drums, mélodie.
-- Le MIDI est régénéré côté serveur à partir de `data` (rien de stocké dans public/, recette protégée).
-- François écoute et approuve : seules les entrées `approved` sont pigées par le site et le MCP.
-- PAS ENCORE APPLIQUÉE — à appliquer quand François valide.

create table if not exists public.melody_bank (
  id text primary key,                         -- ex. death-couplet-1
  style text not null,                         -- clé de style de riff.js (death, melodicdeath, doom…)
  famille text not null,                       -- sombre, melo, epique, tremolo, lourd, tordu, groove, planant
  section text not null check (section in ('intro','couplet','refrain','breakdown')),
  bpm integer not null check (bpm between 40 and 300),
  accordage text not null,                     -- E2, Eb2, D2, Db2, C2, B1
  mesures integer[] not null,                  -- longueur de chaque mesure en 16e (16 = 4/4, 14 = 7/8…)
  data jsonb not null,                         -- { guitar, bass, drums, melody, leadProgram }
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  note text,                                   -- commentaire de François à l'écoute
  created_at timestamptz not null default now()
);

create index if not exists melody_bank_pick on public.melody_bank (style, section) where status = 'approved';

alter table public.melody_bank enable row level security;
-- Aucune policy : seule la clé service (serveur) lit/écrit. La banque n'est jamais exposée au navigateur.

-- Depuis le 30 oct. 2026, Supabase n'ouvre plus les nouvelles tables à l'API : GRANT explicites.
revoke all on public.melody_bank from anon, authenticated;
grant select, insert, update, delete on public.melody_bank to service_role;
