// scripts/seed-melody-bank.mjs — Envoie bank/bank.json dans la table privée melody_bank (statut pending).
// Usage : SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-melody-bank.mjs
// N'écrase jamais le statut d'une entrée déjà approuvée/rejetée (ignore les id existants).
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const bank = JSON.parse(fs.readFileSync('bank/bank.json', 'utf8'));
const rows = bank.map(e => ({
  id: e.id, style: e.style, famille: e.famille, section: e.section, bpm: e.bpm, accordage: e.accordage, mesures: e.mesures,
  data: { guitar: e.guitar, bass: e.bass, drums: e.drums, melody: e.melody, leadProgram: e.leadProgram },
}));
for (let i = 0; i < rows.length; i += 100) {
  const { error } = await sb.from('melody_bank').upsert(rows.slice(i, i + 100), { onConflict: 'id', ignoreDuplicates: true });
  if (error) { console.error(error.message); process.exit(1); }
}
console.log(rows.length + ' entrées envoyées (pending)');
