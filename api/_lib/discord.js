// Bot Discord MetalPrompt (nov. 2026) — interactions HTTP (pas de passerelle, pas de serveur 24/7).
// Greffé sur /api/profile (op=discord) à cause de la limite de 12 fonctions Vercel Hobby.
// Endpoint public : https://metalprompt.com/discord  (vercel.json)
// Commandes : /forge, /radio, /toune. La recette ne sort jamais dans Discord :
// /forge envoie vers le site (compte requis) avec le style déjà rempli.
import crypto from 'node:crypto';

const APP_ID = '1568777992321368298';
const PUBLIC_KEY = 'c5123b8a55576d7809cf63fe3c2c0d0b1299fb4ecc35dbad4934ce84486f3fa3';
const SITE = 'https://metalprompt.com';
const EPHEMERAL = 64;
const GREEN = 0x2fe06a, ORANGE = 0xff6a2b;

// Clé publique Ed25519 brute (32 octets) → format SPKI DER pour node:crypto
const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const pubKey = crypto.createPublicKey({ key: Buffer.concat([SPKI_PREFIX, Buffer.from(PUBLIC_KEY, 'hex')]), format: 'der', type: 'spki' });

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verify(raw, sig, ts) {
  try {
    if (!sig || !ts) return false;
    return crypto.verify(null, Buffer.concat([Buffer.from(ts, 'utf8'), raw]), pubKey, Buffer.from(sig, 'hex'));
  } catch { return false; }
}

const opt = (data, name) => ((data && data.options) || []).find(o => o.name === name)?.value;
const fr = locale => !locale || String(locale).startsWith('fr');
const L = (locale, a, b) => (fr(locale) ? a : b);
const linkBtn = (label, url) => ({ type: 1, components: [{ type: 2, style: 5, label, url }] });

async function topRadio() {
  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) return null;
  const u = `${base}/rest/v1/gallery?select=title,artist,url,likes,genre&status=eq.approved&order=likes.desc,created_at.desc&limit=3`;
  const r = await fetch(u, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  return r.ok ? r.json() : null;
}

async function onCommand(i) {
  const name = i.data && i.data.name;
  const loc = i.locale;

  if (name === 'forge') {
    const style = String(opt(i.data, 'style') || '').trim().slice(0, 80);
    const annee = opt(i.data, 'annee');
    const idea = [style, annee].filter(Boolean).join(' ');
    const url = `${SITE}/?forge=${encodeURIComponent(idea)}`;
    return { type: 4, data: { flags: EPHEMERAL,
      embeds: [{ color: ORANGE, title: `🔥 ${idea || 'MetalPrompt'}`,
        description: L(loc,
          'Ton prompt Suno est prêt à forger : style, voix, époque, BPM et Exclude, calibrés pour ce son.\nClique pour l\'ouvrir dans MetalPrompt (compte gratuit).',
          'Your Suno prompt is ready to forge: style, vocals, era, BPM and Exclude, tuned for this sound.\nClick to open it in MetalPrompt (free account).'),
        footer: { text: L(loc, 'Inspiré, jamais copié.', 'Influenced, never copied.') } }],
      components: [linkBtn(L(loc, 'Forger dans MetalPrompt', 'Forge in MetalPrompt'), url)] } };
  }

  if (name === 'radio') {
    const top = await topRadio().catch(() => null);
    const lines = (top || []).map((t, k) => `**${['🥇', '🥈', '🥉'][k]} ${t.title}** — ${t.artist}${t.genre ? ` · ${t.genre}` : ''} · ❤ ${t.likes || 0}\n${t.url}`);
    return { type: 4, data: {
      embeds: [{ color: GREEN, title: L(loc, '🎙️ ON AIR — Radio MetalPrompt', '🎙️ ON AIR — MetalPrompt Radio'),
        description: lines.length ? lines.join('\n\n') : L(loc, 'La radio se remplit — sois le premier à passer en ondes.', 'The radio is filling up — be the first on air.') }],
      components: [linkBtn(L(loc, 'Écouter la Radio', 'Listen to the Radio'), `${SITE}/?tab=galerie`)] } };
  }

  if (name === 'toune') {
    return { type: 4, data: { flags: EPHEMERAL,
      embeds: [{ color: GREEN, title: L(loc, '🎙️ Passe ta toune en ondes', '🎙️ Get your song on air'),
        description: L(loc,
          'Soumets ta chanson Suno à la Radio MetalPrompt (2 par mois, approuvées avant diffusion). Les plus aimées passent en premier.',
          'Submit your Suno song to MetalPrompt Radio (2 per month, approved before airing). The most liked play first.') }],
      components: [linkBtn(L(loc, 'Soumettre ma toune', 'Submit my song'), `${SITE}/?tab=galerie`)] } };
  }

  return { type: 4, data: { flags: EPHEMERAL, content: L(loc, 'Commande inconnue.', 'Unknown command.') } };
}

export default async function discordHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const raw = await readRaw(req);
  if (!verify(raw, req.headers['x-signature-ed25519'], req.headers['x-signature-timestamp'])) return res.status(401).end('invalid request signature');
  let i; try { i = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).end(); }
  if (i.type === 1) return res.status(200).json({ type: 1 });                 // PING
  if (i.type === 2) return res.status(200).json(await onCommand(i));          // commande
  return res.status(400).end();
}

// Enregistrement des commandes (idempotent : écrase avec la même liste). GET /api/profile?op=discord-register
export const COMMANDS = [
  { name: 'forge', description: 'Forge a Suno metal prompt (style + year)',
    description_localizations: { fr: 'Forger un prompt Suno metal (style + année)' },
    options: [
      { type: 3, name: 'style', description: 'Metal style, e.g. death-doom, melodic deathcore', description_localizations: { fr: 'Style metal, ex. death-doom, deathcore mélodique' }, required: true },
      { type: 4, name: 'annee', name_localizations: { 'en-US': 'year', 'en-GB': 'year' }, description: 'Production year (1970-2030)', description_localizations: { fr: 'Année de production (1970-2030)' }, required: false, min_value: 1970, max_value: 2030 } ] },
  { name: 'radio', description: 'Top 3 on MetalPrompt Radio', description_localizations: { fr: 'Top 3 de la Radio MetalPrompt' } },
  { name: 'toune', description: 'Submit your Suno song to the Radio', description_localizations: { fr: 'Soumettre ta toune Suno à la Radio' } },
];

export async function registerCommands(req, res) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return res.status(500).json({ ok: false, error: 'DISCORD_BOT_TOKEN manquant dans Vercel' });
  const r = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/commands`, {
    method: 'PUT', headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(COMMANDS) });
  const d = await r.json().catch(() => ({}));
  return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, commands: Array.isArray(d) ? d.map(c => c.name) : d });
}
