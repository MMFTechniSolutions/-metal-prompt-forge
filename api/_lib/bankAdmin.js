// api/_lib/bankAdmin.js — Banque de grooves : écoute et approbation (propriétaire seulement, nov. 2026)
// Branché dans /api/profile (?op=bank-list / ?op=bank-set) : limite de 12 fonctions sur Vercel Hobby.
// La table melody_bank est privée (service_role) : seul ce code serveur la lit, après avoir vérifié
// que le jeton Supabase appartient à un courriel propriétaire.
import { createClient } from '@supabase/supabase-js';

const SB_URL = () => process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SB_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const OWNER_EMAILS = (process.env.OWNER_EMAILS || 'rzlajoie@gmail.com').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
const STATUSES = ['pending', 'approved', 'rejected'];

async function owner(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token || !SB_URL() || !SB_KEY()) return null;
  const sb = createClient(SB_URL(), SB_KEY(), { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);
  const email = data && data.user && data.user.email;
  return !error && email && OWNER_EMAILS.includes(email.toLowerCase()) ? sb : null;
}

export async function bankList(req, res) {
  const sb = await owner(req);
  if (!sb) return res.status(403).json({ error: 'Réservé au propriétaire' });
  const q = req.query || {};
  let sel = sb.from('melody_bank').select('id,style,famille,section,bpm,accordage,mesures,data,status,note').order('style').order('section').order('id').limit(400);
  if (STATUSES.includes(q.status)) sel = sel.eq('status', q.status);
  if (q.style) sel = sel.eq('style', String(q.style).slice(0, 40));
  const { data, error } = await sel;
  if (error) return res.status(500).json({ error: error.message });
  const { data: all } = await sb.from('melody_bank').select('style,status');
  const counts = {};
  for (const r of all || []) { const c = counts[r.style] || (counts[r.style] = { pending: 0, approved: 0, rejected: 0 }); c[r.status]++; }
  return res.status(200).json({ rows: data || [], counts });
}

export async function bankSet(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST seulement' });
  const sb = await owner(req);
  if (!sb) return res.status(403).json({ error: 'Réservé au propriétaire' });
  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  const id = String((b && b.id) || '').slice(0, 80), status = b && b.status;
  if (!id || !STATUSES.includes(status)) return res.status(400).json({ error: 'id et status (pending/approved/rejected) requis' });
  const patch = { status }; if (typeof b.note === 'string') patch.note = b.note.slice(0, 300);
  const { error } = await sb.from('melody_bank').update(patch).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true, id, status });
}
