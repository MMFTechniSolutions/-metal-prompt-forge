// 3) Envoie bands-cache.json dans la table Supabase band_cache (créée par supabase/migrations/20261027_band_cache.sql).
// Lancer :  $env:SUPABASE_SERVICE_ROLE_KEY = Read-Host -MaskInput "Clé service_role"
//           node scripts/batch-promo/upload-cache.mjs
import { createClient } from '@supabase/supabase-js';
import { load, chunk } from './_common.mjs';
const URL = process.env.SUPABASE_URL || 'https://wlnttrzmjfefyghxlbyb.supabase.co';
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!KEY) { console.log('✖ SUPABASE_SERVICE_ROLE_KEY absente (Supabase → Project Settings → API Keys → service_role).'); process.exit(1); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const cache = load('bands-cache.json', {});
const rows = Object.entries(cache).map(([name_key, x]) => ({ name_key, band: x.band, genre: x.genre, flavor: x.flavor || '', signature: x.signature || [], confidence: x.confidence || 'medium' }));
console.log(`Envoi de ${rows.length} groupes…`);
let ok = 0;
for (const lot of chunk(rows, 500)) {
  const { error } = await sb.from('band_cache').upsert(lot, { onConflict: 'name_key' });
  if (error) { console.log('✖', error.message); process.exit(1); }
  ok += lot.length; console.log(`  ${ok}/${rows.length}`);
}
console.log('✔ Cache envoyé. Le reverse l\'utilise dès le prochain déploiement.');
