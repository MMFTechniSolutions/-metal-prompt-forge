// 4) Ajoute l'époque (son signature) à chaque groupe du cache : 60s-70s, 80s, 90s, 2000s, 2010s, 2020s.
// Lancer : node scripts/batch-promo/eras.mjs   puis   node scripts/batch-promo/upload-cache.mjs
import { claude, needKey, pool, chunk, save, load, bilan } from './_common.mjs';
await needKey();
const ERAS = ['60s-70s', '80s', '90s', '2000s', '2010s', '2020s'];
const cache = load('bands-cache.json', {});
const todo = Object.entries(cache).filter(([, x]) => !x.era);
console.log(`Groupes sans époque : ${todo.length} / ${Object.keys(cache).length}`);
const SYS = `For each band, give the era whose production and sound best match the band's signature sound (the period it is most known for, not just its formation year).
Allowed values only: ${ERAS.join(', ')}.
Respond with STRICT JSON only: {"<band exactly as given>": "<era>", ...}`;
let fait = 0;
await pool(chunk(todo, 60), 4, async (lot, k) => {
  try {
    const r = await claude(SYS, `Bands:\n${lot.map(([, x]) => x.band).join('\n')}`, 4000);
    for (const [key, x] of lot) { const e = String(r[x.band] || '').trim(); if (ERAS.includes(e)) cache[key].era = e; }
    fait += lot.length; save('bands-cache.json', cache);
    console.log(`  lot ${k + 1} ✔ (${fait}/${todo.length})`);
  } catch (e) { console.log(`  lot ${k + 1} ✖ ${e.message} (relance pour reprendre)`); }
});
const n = Object.values(cache).filter(x => x.era).length;
console.log(`\n✔ ${n} groupes ont une époque. Étape suivante : node scripts/batch-promo/upload-cache.mjs`);
bilan();
