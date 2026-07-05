// /api/lyria.js — Génération musicale via Lyria 3 (Gemini API), sécurisée + quota serveur.
// La clé Gemini N'EST JAMAIS exposée au client. Le quota est compté côté serveur (anti-triche).
//
// ⚙️ À CONFIGURER avant que ça marche :
//   1. Vercel → Environment Variables :
//        GEMINI_API_KEY               = ta clé Gemini (aistudio.google.com/apikey)
//        SUPABASE_URL                 = https://xxxx.supabase.co
//        SUPABASE_SERVICE_ROLE_KEY    = la clé service_role (SECRÈTE, jamais côté client)
//   2. Supabase → table public.users : ajouter deux colonnes
//        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS music_used  int8 DEFAULT 0;
//        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS music_month text DEFAULT '';
//   3. Ajuste MUSIC_LIMITS plus bas selon ce que tu veux offrir par tier.

import { createClient } from '@supabase/supabase-js';

// Quota mensuel de générations par tier. free=0 (payants seulement). Facile à ajuster.
const MUSIC_LIMITS = { free: 0, forge: 15, pro: 60, elite: Infinity, eliteplus: Infinity };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST seulement' });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!GEMINI_KEY || !SB_URL || !SB_SERVICE) {
    return res.status(500).json({ error: 'Config serveur manquante (variables env).' });
  }

  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  const prompt = (b.prompt || '').toString().trim().slice(0, 2000);
  if (!prompt) return res.status(400).json({ error: 'Prompt manquant.' });
  const full = !!b.full;
  const model = full ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';

  // 1) AUTH — vérifier l'utilisateur via son token Supabase (envoyé par le client)
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Non authentifié.' });
  const sb = createClient(SB_URL, SB_SERVICE);
  const { data: ud, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !ud?.user?.email) return res.status(401).json({ error: 'Session invalide.' });
  const email = ud.user.email;

  // 2) QUOTA — lire le tier + usage côté serveur (anti-triche)
  const { data: row, error: rErr } = await sb.from('users').select('tier, music_used, music_month').eq('email', email).single();
  if (rErr || !row) return res.status(403).json({ error: 'Profil introuvable.' });
  const tier = row.tier || 'free';
  const limit = MUSIC_LIMITS[tier] ?? 0;
  if (limit <= 0) return res.status(402).json({ error: 'Génération réservée aux abonnés payants.', tier });

  const month = new Date().toISOString().slice(0, 7);            // ex: 2026-06
  const used = (row.music_month === month) ? (row.music_used || 0) : 0;  // reset mensuel
  if (used >= limit) return res.status(429).json({ error: 'Quota mensuel atteint.', used, limit });

  // 3) GÉNÉRER — appel Lyria via Gemini API (clé serveur seulement)
  let audioB64 = null, mime = 'audio/mpeg', lyrics = '';
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: 'Lyria: ' + t.slice(0, 400) });
    }
    const data = await r.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const p of parts) {
      if (p.inlineData?.data) { audioB64 = p.inlineData.data; mime = p.inlineData.mimeType || mime; }
      else if (p.text) { lyrics += p.text; }
    }
    if (!audioB64) return res.status(502).json({ error: "Pas d'audio retourné.", raw: lyrics.slice(0, 300) });
  } catch (e) {
    return res.status(502).json({ error: 'Erreur génération : ' + (e?.message || e) });
  }

  // 4) DÉCOMPTER APRÈS succès (on facture pas un échec)
  const nUsed = used + 1;
  await sb.from('users').update({ music_used: nUsed, music_month: month }).eq('email', email);

  return res.status(200).json({
    model, mime, audioBase64: audioB64, lyrics,
    used: nUsed, limit: (limit === Infinity ? null : limit),
    left: (limit === Infinity ? null : Math.max(0, limit - nUsed)),
  });
}
