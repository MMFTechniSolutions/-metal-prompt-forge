// /api/_lib/mcp.js — Serveur MCP MetalPrompt (nov. 2026), palier Forge Pro.
// Branché dans /api/profile (?op=mcp) : limite de 12 fonctions sur Vercel Hobby.
// URL publique : https://metalprompt.com/mcp (réécriture dans vercel.json).
//
// Transport : MCP « Streamable HTTP » sans état (POST JSON-RPC → réponse JSON).
// Auth : OAuth 2.1 de Supabase Auth (serveur OAuth du projet). Le jeton reçu est un JWT Supabase
//        normal → validé avec sb.auth.getUser(), comme /api/melody-access.
// Accès : tier 'forge_pro' (ou propriétaire). Limites par jour et par outil (table mcp_usage).
// Recette : les outils renvoient SEULEMENT le résultat final (prompt, riff, paroles),
//           jamais les profils, la base de groupes ni les règles internes. Jamais de nom de groupe.
//
// ⚙️ Variables d'env (en plus de celles déjà en place) :
//   SITE_URL (optionnel)          = https://metalprompt.com
//   MCP_LIMIT_FORGER / MCP_LIMIT_RIFF / MCP_LIMIT_PAROLES (optionnels) = limites par jour

import { createClient } from '@supabase/supabase-js';
import forgeHandler from '../forge.js';
import reverseHandler from '../reverse.js';
import riffHandler from '../riff.js';
import lyricsHandler from '../lyrics.js';
import { lyricCard } from './lyricCard.js';
import { FAMILLES } from '../_genreFamilies.js';

const SITE = (process.env.SITE_URL || 'https://metalprompt.com').replace(/\/$/, '');
const SB_URL = () => process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SB_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const OWNER_EMAILS = (process.env.OWNER_EMAILS || 'rzlajoie@gmail.com').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
const MCP_TIERS = ['forge_pro'];   // seuls les abonnés Forge Pro ont le MCP (Forge Plus = site seulement)
const LIMITS = {
  forger_prompt: Number(process.env.MCP_LIMIT_FORGER || 100),
  creer_riff: Number(process.env.MCP_LIMIT_RIFF || 20),
  ecrire_paroles: Number(process.env.MCP_LIMIT_PAROLES || 10),   // coûte un appel IA → limite plus serrée
};
const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const PRM_URL = SITE + '/.well-known/oauth-protected-resource';

// ── Appelle un handler Vercel existant en mémoire (même recette que le site, zéro duplication) ──
function call(handler, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200, headers: {},
      status(c) { this.statusCode = c; return this; },
      setHeader(k, v) { this.headers[k] = v; return this; },
      json(d) { resolve({ status: this.statusCode, data: d }); return this; },
      send(d) { resolve({ status: this.statusCode, data: d }); return this; },
      end(d) { resolve({ status: this.statusCode, data: d }); return this; },
    };
    Promise.resolve(handler({ method: 'POST', body, query: {}, headers }, res)).catch(reject);
  });
}

// ── Texte libre → époque / année (copie de parseEra dans src/App.jsx) ──
function parseEra(txt) {
  let rest = String(txt || ''), era = '', year = '';
  const dec = y => y < 1980 ? '60s-70s' : y < 1990 ? '80s' : y < 2000 ? '90s' : y < 2010 ? '2000s' : y < 2020 ? '2010s' : '2020s';
  let m = rest.match(/\b(19[6-9]\d|20[0-2]\d)(?:'?s)?\b/);
  if (m) { era = dec(+m[1]); if (!/s$/i.test(m[0])) year = m[1]; rest = rest.replace(m[0], ' '); }
  else if ((m = rest.match(/(?:ann[ée]es\s+)?\b([6-9]0)'?s\b|ann[ée]es\s+([6-9]0)\b/i))) { era = dec(1900 + (+(m[1] || m[2]))); rest = rest.replace(m[0], ' '); }
  rest = rest.replace(/\s+/g, ' ').replace(/^[\s,;·–-]+|[\s,;·–-]+$/g, '').trim();
  return { era, rest, year, dec };
}
const GENRE_SET = new Set(Object.values(FAMILLES).flatMap(f => f.g.map(g => g.toLowerCase())));
const findGenre = p => { const k = String(p || '').toLowerCase().trim(); return !k ? null : GENRE_SET.has(k) ? k : GENRE_SET.has(k + ' metal') ? k + ' metal' : null; };

// ── Auth : jeton OAuth Supabase → utilisateur + tier ──
async function authenticate(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token || !SB_URL() || !SB_KEY()) return null;
  const sb = createClient(SB_URL(), SB_KEY(), { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);
  const u = data && data.user;
  if (error || !u || !u.email) return null;
  const owner = OWNER_EMAILS.includes(u.email.toLowerCase());
  const { data: row } = await sb.from('users').select('tier,tier_expires_at').eq('email', u.email).maybeSingle();
  let tier = String((row && row.tier) || 'free').trim().toLowerCase();
  if (row && row.tier_expires_at && new Date(row.tier_expires_at).getTime() < Date.now()) tier = 'free';
  return { sb, token, user: u, tier, allowed: owner || MCP_TIERS.includes(tier), owner };
}

async function bump(ctx, tool) {
  if (ctx.owner) return { ok: true };
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
  const { data, error } = await ctx.sb.rpc('mcp_bump', { p_user: ctx.user.id, p_day: day, p_tool: tool });
  if (error) return { ok: false, msg: 'Compteur indisponible, réessaie plus tard.' };
  const lim = LIMITS[tool] || 20;
  return Number(data) > lim ? { ok: false, msg: `Limite du jour atteinte pour cet outil (${lim}/jour). Ça repart demain.` } : { ok: true };
}

// ════════════════ OUTILS ════════════════
const TOOLS = [
  {
    name: 'forger_prompt',
    title: 'Forger un prompt Suno metal',
    description: "Forge un prompt Suno optimisé pour du metal, à partir d'un style, d'un mix de styles (« A + B »), d'une description et/ou d'une année précise (ex. « florida death metal 1996 », « progressive death + jazz 2018 », « doom lent avec orgue »). Retourne le champ Style, le champ Exclude et la structure à mettre en haut des paroles. Inspiré, jamais copié : aucun nom d'artiste n'est écrit dans le prompt.",
    inputSchema: {
      type: 'object',
      properties: {
        idee: { type: 'string', description: "Style, mix de styles ou description, avec une année si voulu (« thrash 1986 »)." },
        annee: { type: 'integer', minimum: 1960, maximum: 2030, description: "Année précise (optionnel, sinon tirée de l'idée)." },
        langue: { type: 'string', enum: ['fr', 'en'], description: 'Langue des notes (le prompt Suno reste en anglais). Défaut : en.' },
      },
      required: ['idee'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'creer_riff',
    title: 'Créer un riff (tablature)',
    description: "Génère un riff de guitare/basse et un pattern de batterie à partir d'un prompt Style (idéalement celui de forger_prompt). Retourne la tablature, le tempo, l'accordage et la structure — utile comme base ou comme amorce audio.",
    inputSchema: {
      type: 'object',
      properties: { style: { type: 'string', description: 'Le prompt Style (ou une description courte du style).' } },
      required: ['style'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'ecrire_paroles',
    title: 'Écrire des paroles metal',
    description: "Écrit des paroles metal en anglais, crues et concrètes (pas de « poésie IA »), taguées par section pour Suno. Donne un angle créatif ; le thème et l'atmosphère sont pigés selon le style.",
    inputSchema: {
      type: 'object',
      properties: {
        angle: { type: 'string', description: "L'angle créatif (« une nuit de garde dans une usine de biogaz »). Vide = pigé au hasard." },
        style: { type: 'string', description: 'Le style visé (ex. « progressive death metal, 2018 » ou le prompt Style).' },
        structure: { type: 'string', description: 'Structure à suivre (optionnel), ex. la structure de forger_prompt.' },
      },
      required: ['style'],
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
];

async function toolForger(args, ctx) {
  const idee = String(args.idee || '').slice(0, 300);
  let { era, rest, year, dec } = parseEra(idee);
  if (args.annee) { year = String(args.annee); era = dec(+args.annee); }
  if (!rest) return { error: "Donne au moins un style (ex. « black metal 1993 »)." };

  let genres = [], signature = [], years = [], scene = null;
  const parts = rest.split(/\s*(?:,|\+|\/|&|\bet\b|\band\b)\s*/i).map(s => s.trim()).filter(Boolean);
  const known = parts.map(findGenre);
  if (parts.length && parts.length <= 3 && known.every(Boolean)) {
    genres = [...new Set(known)].slice(0, 2);
  } else {
    // Description libre → même détection que le site (le texte n'est jamais écrit dans le prompt)
    const r = await call(reverseHandler, { band: rest }, { authorization: 'Bearer ' + ctx.token });
    const d = r.data || {};
    if (r.status !== 200 || !d.genre) {
      // Plan B sans IA : le plus long sous-genre connu contenu dans chaque morceau (« florida death metal » → death metal)
      const loose = parts.map(p => [...GENRE_SET].filter(g => p.toLowerCase().includes(g)).sort((x, y) => y.length - x.length)[0]).filter(Boolean);
      if (!loose.length) return { error: "Style pas reconnu. Essaie un sous-genre (« melodic death metal ») ou une description plus claire." };
      genres = [...new Set(loose)].slice(0, 2);
    } else {
    genres = [d.genre, d.flavor].filter(Boolean).slice(0, 2);
    signature = Array.isArray(d.signature) ? d.signature : [];
    years = Array.isArray(d.years) ? d.years : [];
    scene = d.scene || null;
    if (!era && d.era) era = d.era;
    }
  }

  const pr = (await call(ctx.profile, { genre: genres[0] })).data || {};
  const body = {
    genres, drums: pr.drums || [], vocals: pr.vocals || [], guitar: pr.guitar || [], tuning: pr.tuning || [], mood: pr.mood || [],
    structs: pr.structs || ['intro', 'verse', 'chorus', 'breakdown', 'verse', 'chorus', 'outro'],
    heavy: pr.heavy, groove: pr.groove, chaos: pr.chaos, melody: pr.melody, bpm: pr.bpm,
    excl: { c: (pr.exclude || []).join(', ') },
    lang: args.langue === 'fr' ? 'fr' : 'en', emotions: {}, tier: 'pro',
    eras: era ? [era] : [], signature, year: year || null, years, scene, eraLocked: !!era, bpmManual: false, audioSrc: 'none',
  };
  const f = await call(forgeHandler, body);
  if (f.status !== 200 || !f.data || !f.data.styleStr) return { error: 'Erreur de génération, réessaie.' };
  const o = f.data;
  const lines = [
    'STYLE (champ Style de Suno) :', o.styleStr, '',
    'EXCLUDE (champ Exclude de Suno) :', o.excludeStr || '(rien)', '',
    'STRUCTURE (en haut du champ Lyrics) :', o.structStr || '', '',
    `Genre(s) : ${genres.join(' + ')}${o.year ? ' · ' + o.year : era ? ' · ' + era : ''} · ${o.bpm || ''} BPM${o.timeSig ? ' · ' + o.timeSig : ''}`,
  ];
  if (o.modelRec) lines.push('Modèle Suno conseillé : ' + (typeof o.modelRec === 'string' ? o.modelRec : [o.modelRec.best, o.modelRec.good && '(sinon ' + o.modelRec.good + ')', o.modelRec.why && '— ' + o.modelRec.why].filter(Boolean).join(' ')));
  if (o.critic) lines.push(`Note du prompt : ${o.critic.grade} (${o.critic.score}/100)`);
  lines.push('', 'Réglages Suno conseillés : Style Influence 100, Weirdness 65 max, Variety désactivé.');
  return { text: lines.join('\n') };
}

async function toolRiff(args) {
  const r = await call(riffHandler, { auto: true, promptText: String(args.style || '').slice(0, 2000), tier: 'pro' });
  const d = r.data || {};
  if (r.status !== 200 || !d.tab) return { error: 'Riff impossible pour ce style, réessaie.' };
  return { text: [`Riff ${d.style} · ${d.bpm} BPM · accordage ${d.root} · structure ${d.structure}`, '', d.tab].join('\n') };
}

const LYRIC_RULES = `Write raw, real metal lyrics in English, like a professional songwriter, not like an AI.
Method: object writing. Start from one concrete lived moment: a place, objects, the senses (sight, sound, smell, taste, touch, body). Clear point of view (I or you).
Do: concrete scenes and nouns, uneven line lengths, near rhymes rather than perfect rhymes, plain blunt words.
Avoid: AI-poetry words (flicker, whisper, echoes, tapestry, shadows, chains, crown, fire, darkness, throne, abyss, ethereal), abstract lines with no image, every line the same rhythm, too many perfect rhymes.
Never name or imitate any real artist or song.
Format for Suno: section tags in square brackets ([Verse], [Pre-Chorus], [Chorus], [Breakdown], [Bridge], [Outro]); breakdown lines in CAPITALS; the final chorus repeats the chorus with one twist that changes its meaning. Output ONLY the tagged lyrics, nothing else.`;

async function toolParoles(args) {
  const style = String(args.style || '').slice(0, 600);
  const c = await call((req, res) => lyricCard(req.body, res), { genres: [style], era: (style.match(/\b(19|20)\d\d\b/) || [''])[0] });
  const card = (c.status === 200 && c.data) || {};
  const nm = x => (x && (x.en || x.text || x.label)) || (typeof x === 'string' ? x : '');
  const angle = String(args.angle || '').slice(0, 300) || nm(card.theme);
  const prompt = [
    LYRIC_RULES, '',
    `Style: ${style}`,
    `Creative angle: ${angle}`,
    card.atmo ? `Atmosphere: ${nm(card.atmo)}` : '',
    card.pov ? `Point of view: ${nm(card.pov)}` : '',
    card.arc ? `Arc: ${nm(card.arc)}` : '',
    Array.isArray(card.images) && card.images.length ? `Concrete images to use: ${card.images.map(nm).filter(Boolean).join('; ')}` : '',
    Array.isArray(card.words) && card.words.length ? `Vocabulary palette (use some, not all): ${[...card.words, ...(card.verbs || [])].join(', ')}` : '',
    args.structure ? `Follow this structure:\n${String(args.structure).slice(0, 1500)}` : 'Structure: [Verse] [Verse 2] [Pre-Chorus] [Chorus] [Breakdown] [Final Chorus].',
  ].filter(Boolean).join('\n');
  const r = await call(lyricsHandler, { prompt, maxTokens: 2000 });
  if (r.status !== 200 || !r.data || !r.data.text) return { error: 'Paroles indisponibles, réessaie.' };
  return { text: r.data.text };
}

const RUN = { forger_prompt: toolForger, creer_riff: toolRiff, ecrire_paroles: toolParoles };

const INSTRUCTIONS = `MetalPrompt forge des prompts Suno pour le metal (« Inspiré, jamais copié »).
Flux conseillé : forger_prompt → (optionnel) ecrire_paroles avec la structure reçue → (optionnel) creer_riff. Avec un connecteur Suno : Style → champ style, Exclude → champ exclude, structure + paroles → champ lyrics.
Ne jamais écrire de nom de groupe, d'artiste ou de chanson dans un prompt ni dans des paroles.`;

// ════════════════ JSON-RPC ════════════════
const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const err = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
const toolText = (text, isError = false) => ({ content: [{ type: 'text', text }], isError });

async function handleOne(msg, ctx) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return err(msg && msg.id, -32600, 'Requête invalide');
  const { id, method, params = {} } = msg;
  const isNotif = id === undefined || id === null;
  if (method.startsWith('notifications/')) return null;
  if (method === 'initialize') {
    const v = PROTOCOL_VERSIONS.includes(params.protocolVersion) ? params.protocolVersion : PROTOCOL_VERSIONS[0];
    return ok(id, { protocolVersion: v, capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'metalprompt', title: 'MetalPrompt', version: '1.0.0' }, instructions: INSTRUCTIONS });
  }
  if (method === 'ping') return ok(id, {});
  if (method === 'tools/list') return ok(id, { tools: TOOLS });
  if (method === 'tools/call') {
    const name = params.name, run = RUN[name];
    if (!run) return err(id, -32602, 'Outil inconnu : ' + name);
    if (!ctx.allowed) return ok(id, toolText(`Le connecteur MetalPrompt est réservé au plan Forge Pro (5,99 $ US/mois). Passe à Forge Pro sur ${SITE} (Voir les plans).`, true));
    const b = await bump(ctx, name);
    if (!b.ok) return ok(id, toolText(b.msg, true));
    try {
      const r = await run(params.arguments || {}, ctx);
      return ok(id, r.error ? toolText(r.error, true) : toolText(r.text));
    } catch {
      return ok(id, toolText('Erreur serveur MetalPrompt, réessaie.', true));
    }
  }
  return isNotif ? null : err(id, -32601, 'Méthode inconnue : ' + method);
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version');
  res.setHeader('Access-Control-Expose-Headers', 'WWW-Authenticate, Mcp-Session-Id');
}

// Métadonnées « protected resource » (RFC 9728) : dit au client MCP où se connecter (Supabase Auth).
export function protectedResourceMetadata(req, res) {
  cors(res);
  return res.status(200).json({
    resource: SITE + '/mcp',
    authorization_servers: [SB_URL().replace(/\/$/, '') + '/auth/v1'],
    bearer_methods_supported: ['header'],
    scopes_supported: ['openid', 'email', 'profile'],
    resource_name: 'MetalPrompt',
    resource_documentation: SITE,
  });
}

export default async function mcpHandler(req, res, deps = {}) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json(err(null, -32000, 'POST seulement (Streamable HTTP sans état)')); }

  const auth = await authenticate(req);
  if (!auth) {
    res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${PRM_URL}"`);
    return res.status(401).json(err(null, -32001, 'Connexion MetalPrompt requise'));
  }
  const ctx = { ...auth, profile: deps.profile };

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return res.status(400).json(err(null, -32700, 'JSON invalide')); } }
  const batch = Array.isArray(body);
  const out = (await Promise.all((batch ? body : [body]).map(m => handleOne(m, ctx)))).filter(Boolean);
  if (!out.length) return res.status(202).end();
  return res.status(200).json(batch ? out : out[0]);
}

// Tests locaux (scripts/test-mcp.mjs)
export const _test = { handleOne, toolForger, toolRiff, parseEra, findGenre, TOOLS };
