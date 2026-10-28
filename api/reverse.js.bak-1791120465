// /api/reverse.js — « Reversal » : nom de groupe → sous-genre metal.
// Le client envoie un nom d'artiste/groupe ; on renvoie le sous-genre le plus proche.
// Ce sous-genre alimente ensuite /api/profile (BPM, drums, voix, sliders, accordage).
// IMPORTANT : le nom du groupe n'est JAMAIS réécrit dans le prompt final (règles Suno/ElevenLabs).
// Il sert uniquement d'intrant pour déduire le style.
import { GENRE_PROFILES } from './_genreProfiles.js';
import { cleanDescriptors } from './_lib/nameGuard.js';

const CURATED = Object.keys(GENRE_PROFILES);

const SYSTEM = `You are a precise metal/hardcore genre classifier for a music-prompt tool.
Given the name of a band or artist, identify the single sub-genre that best captures their signature sound.

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
- Death metal disambiguation, be precise: "brutal death metal" = low guttural vocals, slam riffs, no melody; "melodic death metal" = harmonized twin-guitar melodies and hooks; "technical death metal" = complex arrangements and sweeps; "death metal" = the plain classic form. Never label a band melodic death unless harmonized melodic leads are central to its sound.
- If you do not recognize the name at all, return {"genre":"","label":"","confidence":"low"}.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body) body = {};

  const band = String(body.band || body.name || '').trim().slice(0, 80);
  if (!band) return res.status(400).json({ error: 'Nom de groupe manquant' });

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Clé API non configurée' });

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
        max_tokens: 220,
        system: SYSTEM,
        messages: [{ role: 'user', content: `Band/artist name: ${band}` }],
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
    // Filet de sécurité : jamais renvoyer le nom du groupe comme "genre".
    if (genre && genre === band.toLowerCase()) genre = '';

    const matched = !!genre && !!GENRE_PROFILES[genre];
    const _bl = band.toLowerCase();
    let flavor = String(out.flavor || '').toLowerCase().trim().slice(0, 40);
    if (flavor === _bl || flavor === genre || !cleanDescriptors([flavor], [_bl]).length) flavor = '';
    // Garde-fou : le modèle glisse parfois un nom de personne malgré la consigne
    // (cas réel 2026-09-10 : « phil anselmo's aggressive vocals »). On filtre en sortie.
    const signature = cleanDescriptors(
      (Array.isArray(out.signature) ? out.signature : []).map(x => {
        const t = String(x).toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
        return t.length <= 60 ? t : t.slice(0, 60).replace(/\s+\S*$/, '');   // jamais couper en plein mot
      }),
      [_bl]
    ).slice(0, 4);
    return res.status(200).json({
      genre, flavor, signature,
      label: String(out.label || genre || '').slice(0, 60),
      confidence: ['high', 'medium', 'low'].includes(out.confidence) ? out.confidence : (genre ? 'medium' : 'low'),
      matched, // true = profil sur-mesure (préréglage curé) ; false = profil générique
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erreur serveur' });
  }
}
