// /api/reverse.js — « Reversal » : nom de groupe → sous-genre metal.
// Le client envoie un nom d'artiste/groupe ; on renvoie le sous-genre le plus proche.
// Ce sous-genre alimente ensuite /api/profile (BPM, drums, voix, sliders, accordage).
// IMPORTANT : le nom du groupe n'est JAMAIS réécrit dans le prompt final (règles Suno/ElevenLabs).
// Il sert uniquement d'intrant pour déduire le style.
import { GENRE_PROFILES } from './_genreProfiles.js';

const CURATED = Object.keys(GENRE_PROFILES);

const SYSTEM = `You are a precise metal/hardcore genre classifier for a music-prompt tool.
Given the name of a band or artist, identify the single sub-genre that best captures their signature sound.

Prefer returning one of these curated sub-genres when it fits well (they carry the best presets):
${CURATED.join(', ')}.

If none of the curated names fits, return the most accurate standard metal/rock/hardcore sub-genre name (English, lowercase), e.g. "melodic death metal", "power metal", "djent", "groove metal", "nu-metal", "progressive metal", "sludge metal", "metalcore", "deathcore", "thrash metal", "black metal", "doom metal".

Rules:
- Respond with STRICT JSON only, no prose, no markdown: {"genre":"<sub-genre>","label":"<short human label>","confidence":"high|medium|low"}
- "genre" must be a genre name only — NEVER an artist/band/album/song name.
- If the band shifted styles across its career, pick the sound it is most known for.
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
        max_tokens: 120,
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
    return res.status(200).json({
      genre,
      label: String(out.label || genre || '').slice(0, 60),
      confidence: ['high', 'medium', 'low'].includes(out.confidence) ? out.confidence : (genre ? 'medium' : 'low'),
      matched, // true = profil sur-mesure (préréglage curé) ; false = profil générique
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erreur serveur' });
  }
}
