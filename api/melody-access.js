// /api/melody-access.js — Contrôle d'accès au générateur de mélodie.
// Réservé aux ABONNÉS PAYANTS. Un seul abonnement : la règle est « tout sauf free ».
// Vérifie le token Supabase du client et lit le tier côté serveur (anti-triche),
// même méthode que /api/lyria.
//
// ⚙️ Variables d'env (déjà présentes pour Lyria) :
//   SUPABASE_URL                = https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   = clé service_role (SECRÈTE, jamais côté client)

import { createClient } from '@supabase/supabase-js';

// Un compte a accès dès qu'il a un abonnement, càd un tier qui n'est PAS gratuit.
// (Robuste au renommage/simplification des plans : pas de liste en dur.)
function isPaid(tier) {
  const t = (tier || '').toString().trim().toLowerCase();
  return t !== '' && t !== 'free';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ allowed: false, error: 'POST seulement' });

  const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SB_URL || !SB_SERVICE) {
    return res.status(500).json({ allowed: false, error: 'Config serveur manquante (variables env).' });
  }

  // 1) AUTH — token Supabase envoyé par le client (Authorization: Bearer ...)
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ allowed: false, error: 'Non authentifié.' });

  const sb = createClient(SB_URL, SB_SERVICE);
  const { data: ud, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !ud?.user?.email) return res.status(401).json({ allowed: false, error: 'Session invalide.' });
  const email = ud.user.email;

  // 2) TIER — lu côté serveur (le client ne peut pas le falsifier)
  const { data: row, error: rErr } = await sb.from('users').select('tier').eq('email', email).single();
  if (rErr || !row) return res.status(403).json({ allowed: false, error: 'Profil introuvable.' });

  const tier = row.tier || 'free';
  const allowed = isPaid(tier);
  return res.status(allowed ? 200 : 402).json({ allowed, tier });
}
