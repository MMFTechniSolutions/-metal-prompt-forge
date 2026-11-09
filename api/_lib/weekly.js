// Tache quotidienne (Vercel Cron, nov. 2026) - greffee sur /api/profile?op=weekly (limite de 12 fonctions Hobby).
// 1) Chaque jour : une lecture Supabase, pour que le projet gratuit ne tombe pas en pause (7 jours sans activite).
// 2) Le lundi (heure de l'Est) : publie le defi de la semaine dans le salon #defi du Discord (style + annee piges).
// Protegee par CRON_SECRET : Vercel Cron envoie " Authorization: Bearer <CRON_SECRET> ".
// Test manuel : GET /api/profile?op=weekly&force=1 avec le meme en-tete (publie meme si ce n'est pas lundi; jamais 2 fois la meme semaine).
import crypto from 'node:crypto';
import { FAMILLES } from '../_genreFamilies.js';

const APP_ID = '1568777992321368298';
const SITE = 'https://metalprompt.com';
const ORANGE = 0xff6a2b;
const API = 'https://discord.com/api/v10';

// Familles metal seulement (pas rock ni electro), avec une fourchette d'annees credible pour chacune.
const YEARS = {
  heavy: [1978, 1992], thrash: [1984, 2006], death: [1988, 2016], black: [1991, 2014],
  doom: [1987, 2015], grind: [1988, 2012], hardcore: [1983, 2010], metalcore: [2000, 2020],
  nu: [1994, 2006], prog: [1992, 2020], folk: [1995, 2015],
};

// Semaine ISO (ex. 2026-W46) en heure de l'Est
function easternNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, weekday: p.weekday };
}
function isoWeek({ y, m, d }) {
  const t = new Date(Date.UTC(y, m - 1, d));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return { year: t.getUTCFullYear(), week: Math.ceil(((t - y0) / 86400000 + 1) / 7) };
}

// Pige deterministe par semaine : relancer la tache donne le meme defi.
function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function pickChallenge(tag) {
  const r = seeded(crypto.createHash('sha256').update('metalprompt-defi:' + tag).digest().readUInt32BE(0));
  const fams = Object.keys(YEARS).filter(f => FAMILLES[f]);
  const fam = fams[Math.floor(r() * fams.length)];
  const style = FAMILLES[fam].g[Math.floor(r() * FAMILLES[fam].g.length)];
  const [a, b] = YEARS[fam];
  return { style, year: a + Math.floor(r() * (b - a + 1)) };
}

async function keepSupabaseAwake() {
  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) return 'supabase: variables manquantes';
  const r = await fetch(`${base}/rest/v1/gallery?select=id&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  return `supabase: ${r.status}`;
}

const bot = token => (path, init = {}) => fetch(API + path, { ...init, headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });

// Trouve le salon du defi : variable DISCORD_DEFI_CHANNEL_ID, sinon un salon texte nomme " defi " / " defi " / " challenge ".
async function findChannel(call) {
  if (process.env.DISCORD_DEFI_CHANNEL_ID) return process.env.DISCORD_DEFI_CHANNEL_ID;
  const guilds = await (await call('/users/@me/guilds')).json();
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  for (const g of Array.isArray(guilds) ? guilds : []) {
    const chans = await (await call(`/guilds/${g.id}/channels`)).json();
    const hit = (Array.isArray(chans) ? chans : []).find(c => c.type === 0 && /defi|challenge/.test(norm(c.name)));
    if (hit) return hit.id;
  }
  return null;
}

async function postChallenge(tag, week) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return 'discord: DISCORD_BOT_TOKEN manquant';
  const call = bot(token);
  const channel = await findChannel(call);
  if (!channel) return 'discord: salon #defi introuvable';

  // Jamais deux fois la meme semaine (Cron peut relancer)
  const recent = await (await call(`/channels/${channel}/messages?limit=20`)).json();
  if ((Array.isArray(recent) ? recent : []).some(m => m.author?.id === APP_ID && (m.embeds || []).some(e => (e.footer?.text || '').includes(tag))))
    return `discord: defi ${tag} deja publie`;

  const { style, year } = pickChallenge(tag);
  const idea = `${style} ${year}`;
  const body = {
    embeds: [{
      color: ORANGE,
      title: `\u{1F525} Weekly Challenge #${week} - ${style.toUpperCase()} ${year}`,
      description: [
        `This week's sound: **${style}**, produced like it's **${year}**.`,
        '',
        '1. Forge your prompt in MetalPrompt (button below).',
        '2. Make your track in Suno and post the link here before Sunday night.',
        '3. The most liked track plays first on MetalPrompt Radio.',
        '',
        '\u{1F3C6} Monthly winner gets **1 month of Forge Plus**.',
      ].join('\n'),
      footer: { text: `Influenced, never copied. - ${tag}` },
    }],
    components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Forge it', url: `${SITE}/?forge=${encodeURIComponent(idea)}` }] }],
  };
  const r = await call(`/channels/${channel}/messages`, { method: 'POST', body: JSON.stringify(body) });
  return r.ok ? `discord: defi publie (${idea})` : `discord: erreur ${r.status}`;
}

export default async function weekly(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ ok: false });
  const now = easternNow();
  const { year, week } = isoWeek(now);
  const tag = `${year}-W${String(week).padStart(2, '0')}`;
  const out = [await keepSupabaseAwake().catch(e => `supabase: ${e.message}`)];
  const monday = now.weekday === 'Mon';
  if (monday || (req.query && req.query.force === '1')) out.push(await postChallenge(tag, week).catch(e => `discord: ${e.message}`));
  return res.status(200).json({ ok: true, tag, monday, log: out });
}