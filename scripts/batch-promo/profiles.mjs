// 1) Génère les profils des sous-genres de l'app qui n'en ont pas (Opus, crédit promo).
// Sortie : api/_genreProfilesExtra.js (fusionné dans GENRE_PROFILES; les profils faits à la main gardent priorité)
//          + scripts/batch-promo/profils-a-valider.csv (à relire dans Excel)
// Lancer : node scripts/batch-promo/profiles.mjs        (--dry = juste la liste, sans appel)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, DIR, APP_GENRES, VOCAB, claude, needKey, pool, chunk, bilan, MODEL } from './_common.mjs';
import { GENRE_PROFILES } from '../../api/_genreProfiles.js';

const extraFile = path.join(ROOT, 'api/_genreProfilesExtra.js');
const already = await import('../../api/_genreProfilesExtra.js').then(m => m.GENRE_PROFILES_EXTRA || {}).catch(() => ({}));
const curated = Object.keys(GENRE_PROFILES).filter(k => !already[k]);
const missing = APP_GENRES.filter(g => !GENRE_PROFILES[g]);
console.log(`Sous-genres app : ${APP_GENRES.length} | profils faits main : ${curated.length} | déjà générés : ${Object.keys(already).length} | à générer : ${missing.length}`);
if (process.argv.includes('--dry')) { console.log(missing.join(', ')); process.exit(0); }
await needKey();

const exemples = Object.fromEntries(['deathcore', 'melodic hardcore', 'gothic doom', 'thrash revival', 'dungeon synth'].filter(k => GENRE_PROFILES[k]).map(k => [k, GENRE_PROFILES[k]]));
const SYSTEM = `You are a veteran metal producer and music historian building presets for a Suno prompt tool.
For each sub-genre given, write ONE profile describing its typical, authentic sound — the way the genre really sounds, not a generic metal default.
Use ONLY values from these closed vocabularies (copy them exactly):
- drums (2-3): ${VOCAB.drums.join(' | ')}
- guitar (2-3): ${VOCAB.guitar.join(' | ')}
- vocals (1-3): ${VOCAB.vocals.join(' | ')}
- tuning (1-2): ${VOCAB.tuning.join(' | ')}
- mood (1-2): ${VOCAB.mood.join(' | ')}
Other fields: bpm = [min,max] realistic range; heavy, groove, chaos, melody = integers 1-10; exclude = 3-5 short Suno negative tags (sounds that would betray the genre).
For non-metal genres (electronic, ambient, rock), still pick the closest vocabulary values; instrumental genres may use "whispered spoken word" or the softest fitting vocal.
Never name a real band or person. Never use "pig squeals" (renders badly).
Exact format of existing profiles: ${JSON.stringify(exemples)}
Respond with STRICT JSON only: {"<sub-genre>": {profile}, ...} — one key per requested sub-genre, exact names.`;

const pickAllowed = (arr, allowed, max) => [...new Set((Array.isArray(arr) ? arr : []).map(String).filter(v => allowed.includes(v)))].slice(0, max);
const int = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
function clean(p) {
  if (!p || typeof p !== 'object') return null;
  let bpm = Array.isArray(p.bpm) ? p.bpm.map(n => int(n, 40, 300, 120)).sort((a, b) => a - b) : null;
  if (!bpm || bpm.length < 2) return null;
  const o = {
    bpm: [bpm[0], bpm[bpm.length - 1]],
    tuning: pickAllowed(p.tuning, VOCAB.tuning, 2),
    drums: pickAllowed(p.drums, VOCAB.drums, 3),
    guitar: pickAllowed(p.guitar, VOCAB.guitar, 3),
    vocals: pickAllowed(p.vocals, VOCAB.vocals, 3).filter(v => v !== 'pig squeals'),
    mood: pickAllowed(p.mood, VOCAB.mood, 2),
    heavy: int(p.heavy, 1, 10, 5), groove: int(p.groove, 1, 10, 5), chaos: int(p.chaos, 1, 10, 5), melody: int(p.melody, 1, 10, 5),
    exclude: (Array.isArray(p.exclude) ? p.exclude : []).map(x => String(x).toLowerCase().trim()).filter(x => x && x.length < 40).slice(0, 5),
  };
  if (!o.drums.length || !o.vocals.length || !o.mood.length || !o.tuning.length) return null;
  return o;
}

const out = { ...already };
const lots = chunk(missing, 6);
let rates = [];
await pool(lots, 3, async (lot, k) => {
  try {
    const r = await claude(SYSTEM, `Sub-genres: ${lot.join(' ; ')}`);
    for (const g of lot) { const c = clean(r[g]); if (c) out[g] = c; else rates.push(g); }
    console.log(`lot ${k + 1}/${lots.length} ✔ ${lot.join(', ')}`);
  } catch (e) { rates.push(...lot); console.log(`lot ${k + 1} ✖ ${e.message}`); }
});

const keys = Object.keys(out).sort();
fs.writeFileSync(extraFile, `// Profils GÉNÉRÉS (${MODEL}, ${new Date().toISOString().slice(0, 10)}) pour les sous-genres sans profil fait main.\n// Relire scripts/batch-promo/profils-a-valider.csv. Les profils de _genreProfiles.js gardent priorité.\nexport const GENRE_PROFILES_EXTRA = {\n${keys.map(k => `  ${JSON.stringify(k)}:${JSON.stringify(out[k])},`).join('\n')}\n};\n`);
const csv = ['sous-genre;bpm;accordage;drums;guitare;voix;ambiance;lourd;groove;chaos;mélodie;exclude',
  ...keys.map(k => { const p = out[k]; return [k, p.bpm.join('-'), p.tuning.join(' / '), p.drums.join(' / '), p.guitar.join(' / '), p.vocals.join(' / '), p.mood.join(' / '), p.heavy, p.groove, p.chaos, p.melody, p.exclude.join(' / ')].map(x => `"${x}"`).join(';'); })].join('\n');
fs.writeFileSync(path.join(DIR, 'profils-a-valider.csv'), '﻿' + csv);
console.log(`\n✔ ${keys.length} profils générés → api/_genreProfilesExtra.js + profils-a-valider.csv`);
if (rates.length) console.log(`⚠ À relancer (rejetés/erreur) : ${rates.join(', ')}  → relance le script, il reprend juste ceux-là`);
bilan();
