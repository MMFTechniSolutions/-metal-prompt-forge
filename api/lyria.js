// /api/lyria.js — Génération musicale via Lyria 3 (Gemini API)
// Modèles : lyria-3-clip-preview (clip 30s) · lyria-3-pro-preview (chanson complète ~2-3 min)
// Le client envoie { prompt, full } et reçoit { audioBase64, mime, lyrics }.
// Prérequis : variable d'environnement GEMINI_API_KEY (clé depuis aistudio.google.com/apikey).

export default async function handler(req, res) {
  let b = req.method === 'POST' ? req.body : (req.query || {});
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY manquante (à ajouter dans Vercel + .env)' });

  const prompt = (b.prompt || '').toString().trim().slice(0, 2000);
  if (!prompt) return res.status(400).json({ error: 'prompt requis' });

  // clip 30s par défaut (moins cher) ; full=true → chanson complète
  const model = b.full ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: 'Lyria API: ' + t.slice(0, 400) });
    }

    const data = await r.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    let audio = null, mime = 'audio/mpeg', lyrics = '';
    for (const p of parts) {
      if (p.inlineData?.data) { audio = p.inlineData.data; mime = p.inlineData.mimeType || mime; }
      else if (p.text) { lyrics += p.text; }
    }
    if (!audio) return res.status(502).json({ error: "Pas d'audio retourné", raw: lyrics.slice(0, 400) });

    return res.status(200).json({ model, mime, audioBase64: audio, lyrics });
  } catch (e) {
    return res.status(500).json({ error: 'Lyria fetch: ' + (e?.message || e) });
  }
}
