-- MP3 hébergés pour la radio (4 nov. 2026) — déjà appliqué en prod
alter table public.gallery add column if not exists audio_file text;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('radio', 'radio', true, 20971520, array['audio/mpeg'])
on conflict (id) do update set public = true, file_size_limit = 20971520, allowed_mime_types = array['audio/mpeg'];
-- seul François (compte rzlajoie) téléverse dans le bucket
drop policy if exists "radio upload proprio" on storage.objects;
create policy "radio upload proprio" on storage.objects for insert to authenticated
  with check (bucket_id = 'radio' and auth.uid() = '0831626a-4da1-4639-a991-ea69f5ae3110'::uuid);
drop policy if exists "radio update proprio" on storage.objects;
create policy "radio update proprio" on storage.objects for update to authenticated
  using (bucket_id = 'radio' and auth.uid() = '0831626a-4da1-4639-a991-ea69f5ae3110'::uuid);
drop policy if exists "radio select proprio" on storage.objects;
create policy "radio select proprio" on storage.objects for select to authenticated
  using (bucket_id = 'radio' and auth.uid() = '0831626a-4da1-4639-a991-ea69f5ae3110'::uuid);
-- les 29 MP3 (25 chansons + 4 annonces) : radio/<id Suno>.mp3 → gallery.audio_file
