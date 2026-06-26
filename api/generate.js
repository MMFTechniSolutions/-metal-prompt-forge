// /api/generate.js — Génération musicale sécurisée (ElevenLabs Music) + décompte de crédits.
// La clé API ElevenLabs N'EST JAMAIS exposée au client. Les crédits sont comptés côté serveur.
//
// ⚙️ À CONFIGURER avant que ça marche :
//   1. Vercel → Environment Variables :
//        ELEVENLABS_API_KEY           = ta clé ElevenLabs
//        SUPABASE_URL                 = https://xxxx.supabase.co
//        SUPABASE_SERVICE_ROLE_KEY    = la clé service_role (SECRÈTE, jamais côté client)
//   2. Supabase → table public.users : ajouter une colonne  credits  (int8, défaut 0)
//        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS credits int8 DEFAULT 0;
//   3. Ajuster COST_PER_VERSION selon le vrai ratio crédits ElevenLabs → ton crédit.
//   4. Confirmer les params du body ElevenLabs (music_length_ms, versions) dans leur doc.

import { createClient } from '@supabase/supabase-js';

const COST_PER_VERSION = 1; // 1 crédit MetalPrompt = 1 version (~3 min). TODO calibrer.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST seulement' });

  const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
  const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!ELEVEN_KEY || !SB_URL || !SB_SERVICE) {
    return res.status(500).json({ error: 'Config serveur manquante (variables env).' });
  }

  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  const prompt = (b.prompt || '').toString().slice(0, 4000);
  const versions = Math.max(1, Math.min(4, parseInt(b.versions) || 1));
  const lengthSec = Math.max(10, Math.min(300, parseInt(b.lengthSec) || 120));
  if (!prompt.trim()) return res.status(400).json({ error: 'Prompt manquant.' });

  // Garde-fou règle ElevenLabs : pas de noms d'artistes réels (style cloning interdit)
  // (filtre simple — on peut enrichir la liste plus tard)
  // if (/\b(metallica|slipknot|...)\b/i.test(prompt)) return res.status(400).json({ error: "Noms d'artistes interdits." });

  // 1) AUTH — vérifier l'utilisateur via son token Supabase (envoyé par le client)
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Non authentifié.' });
  const sb = createClient(SB_URL, SB_SERVICE);
  const { data: ud, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !ud?.user) return res.status(401).json({ error: 'Session invalide.' });
  const userId = ud.user.id;

  // 2) CRÉDITS — lire le solde côté serveur (anti-triche)
  const { data: row, error: rErr } = await sb.from('users').select('credits, tier').eq('id', userId).single();
  if (rErr || !row) return res.status(403).json({ error: 'Profil introuvable.' });
  const cost = versions * COST_PER_VERSION;
  const have = row.credits || 0;
  if (have < cost) return res.status(402).json({ error: 'Crédits insuffisants.', needed: cost, have });

  // 3) GÉNÉRER — appel ElevenLabs Music (clé serveur seulement)
  let audioB64;
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/music', {
      method: 'POST',
      headers: { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json' },
      // TODO : confirmer les noms de params exacts dans la doc ElevenLabs Music
      body: JSON.stringify({ prompt, music_length_ms: lengthSec * 1000 }),
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: 'ElevenLabs: ' + t.slice(0, 300) });
    }
    const buf = Buffer.from(await r.arrayBuffer());
    audioB64 = buf.toString('base64');
  } catch (e) {
    return res.status(502).json({ error: 'Erreur génération : ' + e.message });
  }

  // 4) DÉDUIRE les crédits APRÈS succès (on facture pas un échec)
  const left = have - cost;
  await sb.from('users').update({ credits: left }).eq('id', userId);

  return res.status(200).json({
    audio: 'data:audio/mpeg;base64,' + audioB64,
    creditsLeft: left,
    cost,
  });
}
