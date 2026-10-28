// /api/reverse.js — « Reversal » : nom de groupe → sous-genre metal.
// Le client envoie un nom d'artiste/groupe ; on renvoie le sous-genre le plus proche.
// Ce sous-genre alimente ensuite /api/profile (BPM, drums, voix, sliders, accordage).
// IMPORTANT : le nom du groupe n'est JAMAIS réécrit dans le prompt final (règles Suno/ElevenLabs).
// Il sert uniquement d'intrant pour déduire le style.
import { GENRE_PROFILES } from './_genreProfiles.js';
import { cleanDescriptors } from './_lib/nameGuard.js';
import { FAMILLES } from './_genreFamilies.js';
import { createClient } from '@supabase/supabase-js';

// ── Cache de groupes (table band_cache, pré-classée avec Opus) : réponse instantanée, gratuite et stable.
// Absent / erreur / pas trouvé → on continue avec Decisions + Claude comme avant.
const normBand = s => String(s).toLowerCase().normalize('NFKC').replace(/^the\s+/, '').replace(/\s+/g, ' ').trim();
async function fromCache(band) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || band.length > 60) return null;
  try {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const q = sb.from('band_cache').select('genre,flavor,signature,confidence').eq('name_key', normBand(band)).maybeSingle();
    const { data } = await Promise.race([q, new Promise(r => setTimeout(() => r({ data: null }), 1500))]);
    return data && data.confidence !== 'low' ? data : null;
  } catch { return null; }
}

// ── Decisions API (OpenAI, bêta) — choisit les sous-genres dans NOTRE liste, avec un % de confiance.
// Test 2026-10-27 : 19/20 vs 11/20 pour Claude seul. Claude reste appelé en parallèle pour flavor + signature,
// et reprend le genre quand Decisions n'est pas sûr. Sans OPENAI_API_KEY (ou REVERSE_DECISIONS=off) : comportement d'avant.
const SEUIL_FAMILLE = 0.5, SEUIL_SG = 0.9, MAX_SG = 3, SEUIL_2E_FAMILLE = 0.25, DECISIONS_TIMEOUT_MS = 8000;
const FAM_DE = {};
for (const [f, v] of Object.entries(FAMILLES)) for (const g of v.g) FAM_DE[g] = f;

async function decide(key, input, questions, signal) {
  const r = await fetch('https://api.openai.com/v1/decisions', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-6-luna', input, questions }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`decisions ${r.status}: ${data?.error?.message || ''}`);
  return data;
}

async function viaDecisions(band) {
  const key = process.env.OPENAI_API_KEY;
  if (!key || process.env.REVERSE_DECISIONS === 'off') return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), DECISIONS_TIMEOUT_MS);
  try {
    const input = `Input (band/artist name, or a description of a sound): ${band}`;
    const d1 = await decide(key, input, [{
      type: 'choice', name: 'famille',
      instructions: 'Which family of heavy music best describes the band or artist named in the input (its signature sound), or the sound described in the input?',
      choices: Object.entries(FAMILLES).map(([value, v]) => ({ value, description: v.d })),
    }], ctrl.signal);
    const a1 = d1.answers?.[0];
    if (!a1 || a1.type !== 'choice' || (a1.confidence ?? 0) < SEUIL_FAMILLE) return null;
    const others = (a1.probabilities || []).filter(p => p.value !== a1.choice && p.probability >= SEUIL_2E_FAMILLE)
      .sort((x, y) => y.probability - x.probability).map(p => p.value);
    const cand = [a1.choice, ...others].slice(0, 2).flatMap(f => FAMILLES[f]?.g || []);
    const d2 = await decide(key, input, cand.map((g, k) => ({
      type: 'predicate', name: `g${k}`,
      instructions: `Is "${g}" a well-known part of the signature sound of the band or artist named in the input (or clearly the sound described in the input)? Answer true only if this sub-genre clearly describes it.`,
    })), ctrl.signal);
    const picks = (d2.answers || []).map((a, k) => ({ g: cand[k], p: a.type === 'predicate' ? a.probability : 0 }))
      .filter(x => x.p >= SEUIL_SG).sort((x, y) => y.p - x.p).slice(0, MAX_SG);
    if (!picks.length) return null;
    return { picks, famille: a1.choice, confFamille: a1.confidence };
  } catch (e) {
    console.warn('[reverse] Decisions ignoré :', e.message);
    return null;
  } finally { clearTimeout(t); }
}

const CURATED = Object.keys(GENRE_PROFILES);

const SYSTEM = `You are a precise metal/hardcore genre classifier for a music-prompt tool.
The input is EITHER the name of a band or artist, OR a free-text description of a sound in any language (e.g. "death metal progressif avec voix gutturales", "slow sludgy doom with organ").
Identify the single sub-genre that best captures that sound: the band's signature sound, or the sound described.

Prefer returning one of these curated sub-genres when it fits well (they carry the best presets):
${CURATED.join(', ')}.

If none of the curated names fits, return the most accurate standard metal/rock/hardcore sub-genre name (English, lowercase), e.g. "melodic death metal", "power metal", "djent", "groove metal", "nu-metal", "progressive metal", "sludge metal", "metalcore", "deathcore", "thrash metal", "black metal", "doom metal".

Also capture what makes the band's sound DISTINCT beyond the main sub-genre:
- "flavor": a SECOND genre that colors the sound (e.g. "folk metal", "70s progressive rock", "blackgaze", "jazz fusion"), or "" if the band is a pure example of its genre.
- "signature": 2-4 short sonic anchors a music model can render — instruments, techniques, production, dynamics. Lowercase, comma-free.
  ABSOLUTE RULE: never name a person or a band, and never use possessives or comparisons ("X's vocals", "X-style", "like X", "in the vein of X"). Describe the SOUND itself.
  For the singer, describe the mechanics — register, rasp, attack, phrasing, effects — e.g. "mid-range rasped shouts with bluesy swagger and ragged upper-register screams".

Rules:
- Respond with STRICT JSON only, no prose, no markdown: {"genre":"<sub-genre>","flavor":"<second genre or empty>","signature":["<anchor>","<anchor>"],"label":"<short human label>","confidence":"high|medium|low"}
- "genre" and "flavor" must be genre names only — NEVER an artist/band/album/song name.
- If the band shifted styles across its career, pick the sound it is most known for.
- If the input is a description rather than a name: classify the sound it describes. "signature" then carries the concrete details the description itself states (instruments, vocal type, production, tempo feel), translated to English — do not add a band's traits, and never guess a band from a description.
- Death metal disambiguation, be precise: "brutal death metal" = low guttural vocals, slam riffs, no melody; "melodic death metal" = harmonized twin-guitar melodies and hooks; "technical death metal" = complex arrangements and sweeps; "death metal" = the plain classic form. Never label a band melodic death unless harmonized melodic leads are central to its sound.
- If the input is a name you do not recognize at all and it does not describe a sound, return {"genre":"","label":"","confidence":"low"}.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body) body = {};

  const band = String(body.band || body.name || '').trim().slice(0, 160);   // nom de groupe OU description libre (boîte unique de l'écran Forger)
  if (!band) return res.status(400).json({ error: 'Nom de groupe manquant' });

  const hit = await fromCache(band);
  if (hit) {
    const _bl = band.toLowerCase();
    return res.status(200).json({
      genre: hit.genre, flavor: hit.flavor || '',
      signature: cleanDescriptors((hit.signature || []).map(String), [_bl]).slice(0, 4),
      label: hit.genre, confidence: hit.confidence, source: 'cache',
      genres: [hit.genre, hit.flavor].filter(Boolean), matched: !!GENRE_PROFILES[hit.genre],
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Clé API non configurée' });

  const decP = viaDecisions(band);   // part en même temps que Claude : pas de délai ajouté
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 260,
        system: SYSTEM,
        messages: [{ role: 'user', content: `Input (band/artist name, or a description of a sound): ${band}` }],
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'Erreur API' });

    const text = data.content?.find((b) => b.type === 'text')?.text || '';
    let out = {};
    try {
      const m = text.match(/\{[\s\S]*\}/);
      out = m ? JSON.parse(m[0]) : {};
    } catch { out = {}; }

    let genre = String(out.genre || '').toLowerCase().trim();
    const dec = await decP;
    let source = 'claude';
    if (dec) { genre = dec.picks[0].g; source = 'decisions'; }
    // Filet de sécurité : jamais renvoyer le nom du groupe comme "genre".
    // Exception : l'entrée EST un nom de genre (« blackgaze », « crust punk ») — là, genre === entrée est la bonne réponse.
    const _isGenreWord = /metal|core|rock|punk|doom|grind|gaze|sludge|thrash|djent|prog|folk|industrial|goth|hardcore|crust|stoner|drone/.test(genre);
    if (genre && genre === band.toLowerCase() && !GENRE_PROFILES[genre] && !_isGenreWord) genre = '';

    const matched = !!genre && !!GENRE_PROFILES[genre];
    const _bl = band.toLowerCase();
    let flavor = String(out.flavor || '').toLowerCase().trim().slice(0, 40);
    if (flavor === _bl || flavor === genre || !cleanDescriptors([flavor], [_bl]).length) flavor = '';
    // Decisions sûr → la couleur vient SEULEMENT de lui (Claude inventait parfois : Despised Icon « + industrial metal », 2026-10-27).
    // 2e choix de Decisions s'il vient d'une AUTRE famille (évite thrash + bay area thrash), sinon pas de couleur.
    if (dec) { const f2 = dec.picks.find(x => x.g !== genre && FAM_DE[x.g] !== FAM_DE[genre]); flavor = f2 ? f2.g : ''; }
    // Garde-fou : le modèle glisse parfois un nom de personne malgré la consigne
    // (cas réel 2026-09-10 : « phil anselmo's aggressive vocals »). On filtre en sortie.
    const signature = cleanDescriptors(
      (Array.isArray(out.signature) ? out.signature : []).map(x => {
        const t = String(x).toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
        if (t.length <= 100) return t;
        // trop long : on coupe au mot, puis on enlève les mots orphelins (« …with industrial », « …between growls and »)
        const cut = t.slice(0, 100).replace(/\s+\S*$/, '');
        const m = [...cut.matchAll(/\s(with|and|or|between|of|into|over|under|by|from|plus)\s/gi)].pop();   // dernier lien → on coupe AVANT lui
        return (m && m.index >= 30 ? cut.slice(0, m.index) : cut).trim();
      }),
      [_bl]
    ).slice(0, 4);
    return res.status(200).json({
      genre, flavor, signature,
      label: String((source === 'decisions' ? genre : out.label) || genre || '').slice(0, 60),
      confidence: dec ? (dec.confFamille >= 0.8 ? 'high' : 'medium')
        : ['high', 'medium', 'low'].includes(out.confidence) ? out.confidence : (genre ? 'medium' : 'low'),
      source,                                   // 'decisions' ou 'claude' (débogage)
      genres: dec ? dec.picks.map(x => x.g) : (genre ? [genre] : []),   // tous les sous-genres retenus
      matched, // true = profil sur-mesure (préréglage curé) ; false = profil générique
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erreur serveur' });
  }
}
