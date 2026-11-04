-- Demandes d'annonceurs pour la Radio MetalPrompt (4 nov. 2026) — déjà appliqué en prod
-- Écriture seulement pour le public; lecture dans le tableau Supabase (radio_annonceurs)
create table if not exists public.radio_annonceurs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  nom text not null check (char_length(nom) between 1 and 120),
  entreprise text check (entreprise is null or char_length(entreprise) <= 160),
  courriel text not null check (char_length(courriel) between 5 and 200 and courriel ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message text not null check (char_length(message) between 5 and 2000),
  accepte boolean not null check (accepte),
  user_id uuid default auth.uid(),
  statut text not null default 'nouveau'
);
alter table public.radio_annonceurs enable row level security;
drop policy if exists "envoyer demande" on public.radio_annonceurs;
create policy "envoyer demande" on public.radio_annonceurs for insert to anon, authenticated with check (accepte and statut = 'nouveau');
grant insert on public.radio_annonceurs to anon, authenticated;
grant usage on sequence public.radio_annonceurs_id_seq to anon, authenticated;

alter table public.gallery add column if not exists conditions_acceptees boolean not null default false;
