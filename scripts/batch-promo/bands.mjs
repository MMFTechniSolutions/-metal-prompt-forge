// 2) Cache de groupes : liste ~2000-3000 groupes (par sous-genre) puis les classe (genre + couleur + signature) avec Opus.
// Reprend là où il était si on le relance (fichiers bands-list.json / bands-cache.json).
// Lancer : node scripts/batch-promo/bands.mjs            (--liste = étape A seulement, --max=N = limite de groupes)
import { APP_GENRES, claude, needKey, pool, chunk, save, load, bilan } from './_common.mjs';
await needKey();
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const norm = s => String(s).toLowerCase().normalize('NFKC').replace(/^the\s+/, '').replace(/\s+/g, ' ').trim();

// ── Étape A : liste de groupes par sous-genre
let liste = load('bands-list.json', {});
const aFaire = APP_GENRES.filter(g => !liste[g]);
if (aFaire.length) {
  console.log(`Étape A : groupes pour ${aFaire.length} sous-genres…`);
  const SYS_A = `You are a metal and heavy-music encyclopedia. For each sub-genre, list up to 20 real, verifiable bands or artists strongly associated with it: about 12 well-known and 8 respected underground ones (include some from Québec and Canada when they exist). Real names only, exact spelling, no duplicates, no made-up names. If a genre has fewer real representatives, list fewer.
Respond with STRICT JSON only: {"<sub-genre>": ["Band", ...], ...}`;
  await pool(chunk(aFaire, 8), 3, async (lot, k) => {
    try { const r = await claude(SYS_A, `Sub-genres: ${lot.join(' ; ')}`); for (const g of lot) if (Array.isArray(r[g])) liste[g] = r[g].map(String).slice(0, 25); save('bands-list.json', liste); console.log(`  A lot ${k + 1} ✔`); }
    catch (e) { console.log(`  A lot ${k + 1} ✖ ${e.message}`); }
  });
}
const tous = new Map();
for (const arr of Object.values(liste)) for (const b of arr) { const k = norm(b); if (k && !tous.has(k)) tous.set(k, b); }
console.log(`Groupes uniques : ${tous.size}`);
if (process.argv.includes('--liste')) { bilan(); process.exit(0); }

// ── Étape B : classement
const cache = load('bands-cache.json', {});
const max = parseInt(arg('max', '100000'), 10);
const restants = [...tous.entries()].filter(([k]) => !cache[k]).slice(0, max);
console.log(`Étape B : ${restants.length} groupes à classer (déjà faits : ${Object.keys(cache).length})`);
const SYS_B = `You are a precise metal/hardcore genre classifier for a music-prompt tool. For each band:
- "genre": the single sub-genre that best captures the sound it is MOST known for. MUST be copied exactly from this list: ${APP_GENRES.join(', ')}.
- "flavor": a second sub-genre from the SAME list that clearly colors its sound, or "" if it is a pure example. Never invent a flavor; when unsure use "".
- "signature": 2-4 short lowercase sonic anchors a music model can render (instruments, techniques, production, vocal mechanics), each under 90 characters, no commas. ABSOLUTE RULE: never name a person or a band, no possessives, no comparisons. Do not use "pig squeals".
- "confidence": "high" if you clearly know this band, "medium" if partly, "low" if you are guessing.
Death metal precision: "brutal death metal" = low gutturals, slam riffs, no melody; "melodic death metal" = harmonized twin-guitar melodies; "technical death metal" = complex arrangements; "deathcore" = death metal + metalcore breakdowns.
Respond with STRICT JSON only: {"<band exactly as given>": {"genre":"","flavor":"","signature":[],"confidence":""}, ...}`;
const okGenre = new Set(APP_GENRES);
let fait = 0;
await pool(chunk(restants, 25), 4, async (lot, k) => {
  try {
    const r = await claude(SYS_B, `Bands:\n${lot.map(([, b]) => b).join('\n')}`);
    for (const [key, b] of lot) {
      const x = r[b] || r[Object.keys(r).find(n => norm(n) === key)];
      if (!x || !okGenre.has(String(x.genre).toLowerCase())) continue;
      const genre = String(x.genre).toLowerCase(), fl = String(x.flavor || '').toLowerCase();
      cache[key] = { band: b, genre, flavor: okGenre.has(fl) && fl !== genre ? fl : '',
        signature: (Array.isArray(x.signature) ? x.signature : []).map(s => String(s).toLowerCase().replace(/,/g, ' ').trim()).filter(s => s && s.length <= 100 && !/pig squeal/.test(s)).slice(0, 4),
        confidence: ['high', 'medium', 'low'].includes(x.confidence) ? x.confidence : 'medium' };
    }
    fait += lot.length; save('bands-cache.json', cache);
    console.log(`  B lot ${k + 1} ✔ (${fait}/${restants.length})`);
  } catch (e) { console.log(`  B lot ${k + 1} ✖ ${e.message} (relance le script pour reprendre)`); }
});
const n = Object.keys(cache).length, hi = Object.values(cache).filter(x => x.confidence === 'high').length;
console.log(`\n✔ Cache : ${n} groupes (${hi} sûrs) → scripts/batch-promo/bands-cache.json. Dis à Claude « cache prêt » pour l'envoyer dans Supabase.`);
bilan();
