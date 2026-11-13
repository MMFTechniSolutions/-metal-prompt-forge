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
import { cleanStyle, cleanExclude, cleanStruct, hiddenSignature, bankBeat, beatWords, bankStyleFor, splitTags, uniq, DEEP_VOX, KEYS_STYLE, VOCAL_WORDS } from './recipe.js';
import { generateBank, toMidi, STYLES as BANK_STYLES } from './melodyBank.js';

const SITE = (process.env.SITE_URL || 'https://metalprompt.com').replace(/\/$/, '');
const SB_URL = () => process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SB_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const OWNER_EMAILS = (process.env.OWNER_EMAILS || 'rzlajoie@gmail.com').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
const MCP_TIERS = ['forge_pro'];   // seuls les abonnés Forge Pro ont le MCP (Forge Plus = site seulement)
const LIMITS = {
  forger_prompt: Number(process.env.MCP_LIMIT_FORGER || 100),
  creer_riff: Number(process.env.MCP_LIMIT_RIFF || 20),
  ecrire_paroles: Number(process.env.MCP_LIMIT_PAROLES || 10),   // coûte un appel IA → limite plus serrée
  forger_toune: Number(process.env.MCP_LIMIT_TOUNE || 10),
  televerser_groove: Number(process.env.MCP_LIMIT_GROOVE || 20),   // prompt + paroles (appel IA) + groove
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
    name: 'forger_toune',
    title: 'Forger une toune complète',
    description: "Toune complète en un appel, prête pour Suno : prompt Style + Exclude (son de vrai band en studio, sans synth ni foule) et paroles crues taguées par section (ou structure seule en instrumental). Donne un style/mix/année et, si tu veux, un angle pour les paroles. Avec un connecteur Suno : audio-create avec Style → style, Exclude → negative_style, Lyrics → lyrics, model v6-wild.",
    inputSchema: {
      type: 'object',
      properties: {
        idee: { type: 'string', description: "Style, mix de styles ou description, avec une année si voulu (« florida death metal 1991 »)." },
        annee: { type: 'integer', minimum: 1960, maximum: 2030, description: 'Année précise (optionnel).' },
        angle: { type: 'string', description: "Angle créatif des paroles (optionnel, sinon pigé)." },
        instrumental: { type: 'boolean', description: 'true = pas de paroles.' },
      },
      required: ['idee'],
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  {
    name: 'televerser_groove',
    title: 'Envoyer un groove de la banque à Suno (MIDI)',
    description: "EXPÉRIMENTAL — pas pour l'usage normal : en test, Suno reprend le son de l'instrument MIDI et la toune sonne sèche; le prompt seul de forger_toune sonne mieux. Envoie un groove de la banque MetalPrompt (guitare, basse, batterie, mélodie qui accote le style) directement dans un envoi MIDI Suno. Étapes : 1) appelle midi-upload-create du connecteur Suno, 2) passe ici son upload_url et ses upload_fields tels quels, avec le groove_id de forger_toune (ou le style), 3) appelle midi-upload-complete, 4) audio-create avec midi_upload_id, model v6-wild et une description qui reprend le Style, 5) pour chanter les paroles : audio-covers-create sur ce clip avec style, negative_style et lyrics.",
    inputSchema: {
      type: 'object',
      properties: {
        upload_url: { type: 'string', description: 'upload_url reçu de midi-upload-create (Suno).' },
        upload_fields: { type: 'object', additionalProperties: { type: 'string' }, description: 'upload_fields reçus de midi-upload-create, tels quels.' },
        groove_id: { type: 'string', description: 'Groove donné par forger_toune (optionnel).' },
        style: { type: 'string', description: 'Style si pas de groove_id : le groove est pigé dans ce style.' },
        bpm: { type: 'integer', minimum: 40, maximum: 300, description: 'Tempo du prompt : le groove pigé reste à ±20 BPM (optionnel).' },
        instrument_riff: { type: 'string', enum: ['auto', 'guitare', 'trombone', 'tuba', 'cuivres', 'cor', 'violoncelle', 'contrebasse', 'cordes', 'orgue', 'choeur', 'piano'], description: "Timbre MIDI du riff (défaut auto = selon le style). Suno rend mal la guitare MIDI." },
        instrument_melodie: { type: 'string', enum: ['auto', 'guitare', 'trombone', 'tuba', 'cuivres', 'cor', 'violoncelle', 'contrebasse', 'cordes', 'orgue', 'choeur', 'piano'], description: 'Timbre MIDI de la mélodie (défaut auto = selon le style).' },
        pistes: { type: 'array', items: { type: 'string', enum: ['beat', 'riff', 'basse', 'melodie'] }, description: "Pistes à envoyer. Défaut : beat + riff + basse (sans mélodie : jouée par Suno, elle sonne synthé)." },
      },
      required: ['upload_url', 'upload_fields'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
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

// ── Outils PROPRIÉTAIRE seulement (invisibles pour les abonnés) ──
const OWNER_TOOLS = [
  {
    name: 'remplir_banque',
    title: 'Remplir la banque de grooves (propriétaire)',
    description: "Génère des grooves (guitare, basse, drums) + une mélodie qui accote le style, par section (intro, couplet, refrain, breakdown), et les ajoute dans la banque privée en attente d'approbation. Retourne le compte par statut.",
    inputSchema: {
      type: 'object',
      properties: {
        par_section: { type: 'integer', minimum: 1, maximum: 5, description: 'Nombre de grooves par section et par style (défaut 2).' },
        styles: { type: 'array', items: { type: 'string', enum: BANK_STYLES }, description: 'Styles à remplir (défaut : tous).' },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
];
const OWNER_NAMES = new Set(OWNER_TOOLS.map(t => t.name));

async function toolRemplirBanque(args, ctx) {
  const per = Math.max(1, Math.min(5, Number(args.par_section) || 2));
  const styles = Array.isArray(args.styles) && args.styles.length ? args.styles.filter(x => BANK_STYLES.includes(x)) : BANK_STYLES;
  const tag = Date.now().toString(36).slice(-5);   // id unique par lot → on peut regarnir sans écraser
  const rows = await generateBank({ styles, per, tag });
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await ctx.sb.from('melody_bank').upsert(rows.slice(i, i + 100), { onConflict: 'id', ignoreDuplicates: true });
    if (error) return { error: 'Écriture banque impossible : ' + error.message };
  }
  const { data } = await ctx.sb.from('melody_bank').select('status');
  const n = (data || []).reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {});
  return { text: `${rows.length} grooves ajoutés (lot ${tag}, ${styles.length} styles × 4 sections × ${per}). Banque : ${n.pending || 0} en attente · ${n.approved || 0} approuvés · ${n.rejected || 0} rejetés.` };
}


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

  if (!signature.length && genres.length === 1 && args.signature !== false) {
    const hs = await hiddenSignature(ctx, genres[0], year);
    if (hs) { signature = hs.signature; if (!scene) scene = hs.scene; }
  }
  const pr = (await call(ctx.profile, { genre: genres[0] })).data || {};
  const body = {
    genres, drums: pr.drums || [], vocals: pr.vocals || [], guitar: pr.guitar || [], tuning: pr.tuning || [], mood: pr.mood || [],
    structs: pr.structs || ['intro', 'verse', 'chorus', 'breakdown', 'verse', 'chorus', 'outro'],
    heavy: pr.heavy, groove: pr.groove, chaos: pr.chaos, melody: pr.melody, bpm: pr.bpm,
    excl: { c: (pr.exclude || []).join(', ') },
    lang: args.langue === 'fr' ? 'fr' : 'en', emotions: {}, tier: 'pro',
    eras: era ? [era] : [], signature, year: year || null, years, scene, eraLocked: !!era, bpmManual: false, audioSrc: 'none',
    rawRecipe: true,   // le MCP applique la recette lui-même (forger_toune)
    pure: genres.length === 1,   // style pur = pas de mix pigé (test black metal 1995 → « punk rock inflections », 7 nov. 2026)
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
  return { text: lines.join('\n'), o, genres };
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
Never name or imitate any real artist or song, and never reuse a line, hook or title from an existing song.
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
    args.rhythmic ? 'Rhythmic delivery: short percussive lines of 2 to 5 words that hit on the riff accents, like a drummer would phrase them. No long sentences.' : '',
    args.structure ? `Follow this structure:\n${String(args.structure).slice(0, 1500)}` : 'Structure: [Verse] [Verse 2] [Pre-Chorus] [Chorus] [Breakdown] [Final Chorus].',
  ].filter(Boolean).join('\n');
  const r = await call(lyricsHandler, { prompt, maxTokens: 2000, userText: args.angle || '' });
  if (r.status === 422 && r.data && r.data.error) return { error: r.data.error };
  if (r.status !== 200 || !r.data || !r.data.text) return { error: 'Paroles indisponibles, réessaie.' };
  return { text: r.data.text };
}

async function pickGroove(ctx, style, bpm) {
  if (!style || !ctx.sb) return null;
  const { data } = await ctx.sb.from('melody_bank').select('id,section,bpm,accordage,mesures').eq('style', style).eq('status', 'approved').limit(50);
  // Seulement un groove au tempo proche du prompt (±20 BPM) : sinon les mots de tempo du prompt mentiraient
  const near = (data || []).filter(g => !bpm || Math.abs(g.bpm - bpm) <= 20);
  if (!near.length) return null;
  const pref = near.filter(g => g.section === 'couplet');
  const pool = pref.length ? pref : near;
  return pool[Math.floor(Math.random() * pool.length)];
}

const TUNE_NAME = { E2: 'standard E tuning', Eb2: 'Eb tuning', D2: 'D standard tuning', Db2: 'drop C# tuning', C2: 'C standard tuning', B1: 'B standard tuning' };
const meterName = m => { const u = [...new Set(m)]; if (u.length === 1 && u[0] === 16) return '4/4'; return u.map(n => n === 16 ? '4/4' : n === 12 ? '6/8' : n === 14 ? '7/8' : n === 20 ? '5/4' : n === 10 ? '5/8' : n === 18 ? '9/8' : n === 8 ? '2/4' : n + '/16').join(' + '); };



async function toolToune(args, ctx) {
  const f = await toolForger({ idee: args.idee, annee: args.annee, langue: 'fr' }, ctx);
  if (f.error) return f;
  const o = f.o, inst = !!args.instrumental, opt = { instrumental: inst, genres: f.genres };
  // Prompt seul = voie principale (7 nov. 2026) : la chaîne MIDI → Suno sonne sec, Suno reprend le son de l'instrument d'entrée.
  let style = cleanStyle(o.styleStr, opt);
  let exclude = cleanExclude(o.excludeStr, opt);
  // Voix grave demandée par la signature → ne pas l'exclure (test 7 nov. : la voix sortait trop aiguë)
  if (!inst && DEEP_VOX.test(style)) exclude = splitTags(exclude).filter(t => !/low growls?|deep vocals?|guttural/i.test(t)).concat(['high-pitched screams', 'falsetto']).filter((t, i, a) => a.indexOf(t) === i).join(', ');
  // Beat unique de la banque, décrit en mots (pas de MIDI)
  const beat = await bankBeat(ctx, f.genres, style, Number(o.bpm) || 0);
  if (beat) {
    const w = beatWords(beat);
    if (w) {
      style = style.replace(/\b\d{2,3} BPM\b/, beat.bpm + ' BPM');
      const tags = splitTags(style), at = tags.findIndex(t => /BPM/.test(t));
      tags.splice(at >= 0 ? at + 1 : tags.length, 0, '4/4', ...splitTags(w));
      style = uniq(tags).join(', ');
    }
  }
  const rhythmic = /groove|hardcore|metalcore|thrash|nu-?metal|djent|beatdown|crossover/i.test(f.genres.join(' '));
  const struct = cleanStruct(o.structStr, opt);
  // v6 = trop propre pour le metal cru (François, 7 nov.) : seulement prog, glam, metalcore radio
  const model = /prog|glam|hair metal|metalcore|post-hardcore|alternative|radio/i.test(f.genres.join(' ')) ? 'v6' : 'v6-wild';
  let lyrics = struct;
  if (!inst) {
    const p = await toolParoles({ angle: args.angle, style, structure: struct, rhythmic });
    if (p.error) return p;
    lyrics = p.text;
  }
  const lines = [
    'STYLE :', style, '',
    'EXCLUDE :', exclude, '',
    'LYRICS :', lyrics, '',
    `Modèle Suno conseillé : ${model} · Style Influence 100, Weirdness 65 max, Variety 0.`,
    `Avec le connecteur Suno : audio-create (model ${model}, style, negative_style = Exclude, lyrics${inst ? ', instrumental: true' : ''}).`,
  ];
  return { text: lines.join('\n') };
}

// ── Envoi MIDI vers Suno (nov. 2026) : le serveur poste lui-même le groove dans l'envoi pré-signé de Suno ──
const SUNO_UPLOAD_HOSTS = ['suno-uploads.s3.amazonaws.com'];
async function grooveById(ctx, id) {
  let q = ctx.sb.from('melody_bank').select('id,style,famille,section,bpm,accordage,mesures,data,status').eq('id', String(id).slice(0, 80));
  const { data } = await q.maybeSingle();
  if (!data) return null;
  return (data.status === 'approved' || ctx.owner) ? data : null;   // le proprio peut tester ce qui est en attente
}
async function grooveForStyle(ctx, txt, bpm) {
  const bs = bankStyleFor(txt);
  if (!bs) return null;
  const statuses = ctx.owner ? ['approved', 'pending'] : ['approved'];
  for (const st of statuses) {
    const { data } = await ctx.sb.from('melody_bank').select('id,style,famille,section,bpm,accordage,mesures,data,status').eq('style', bs).eq('status', st).limit(30);
    const near = (data || []).filter(g => !bpm || Math.abs(g.bpm - bpm) <= 20);
    if (near.length) { const c = near.filter(g => g.section === 'couplet'); const pool = c.length ? c : near; return pool[Math.floor(Math.random() * pool.length)]; }
  }
  return null;
}
// Instruments MIDI (General MIDI) : Suno rend mal la guitare MIDI → on choisit un timbre qu'il rend bien, selon le style.
// Point de départ (François, 7 nov. : « le trombone sonne bien en black »), à ajuster à l'oreille.
const GM = { guitare: 30, trombone: 57, tuba: 58, cuivres: 61, cor: 60, violoncelle: 42, contrebasse: 43, cordes: 48, orgue: 19, choeur: 52, piano: 0 };
const INSTR_EN = { trombone: 'trombone, brass', tuba: 'tuba, brass', cuivres: 'brass section, horns', cor: 'french horn, brass', violoncelle: 'cello, strings', contrebasse: 'double bass, upright bass', cordes: 'strings, orchestra', orgue: 'organ', choeur: 'choir', piano: 'piano' };
const INSTR_FAM = {
  tremolo: { riff: 'trombone', melodie: 'cordes' }, sombre: { riff: 'tuba', melodie: 'violoncelle' }, marecage: { riff: 'tuba', melodie: 'orgue' },
  lourd: { riff: 'tuba', melodie: 'orgue' }, planant: { riff: 'cordes', melodie: 'violoncelle' }, melo: { riff: 'violoncelle', melodie: 'cordes' },
  epique: { riff: 'cuivres', melodie: 'cordes' }, groove: { riff: 'guitare', melodie: 'cuivres' }, tordu: { riff: 'contrebasse', melodie: 'trombone' },
};
function loopedMidi(g, maxSec = 60, pistes = ['beat', 'riff', 'basse'], instr = {}) {
  const has = k => pistes.includes(k);
  const d = g.data, L = d.drums.kick.length, barSec = L * 60 / g.bpm / 4;
  const N = Math.max(1, Math.min(8, Math.floor(maxSec / barSec)));
  const rep = arr => Array.from({ length: N }, (_, k) => arr.map(n => ({ ...n, t: n.t + k * L }))).flat();
  const z = a => a.map(() => 0);
  const dr = k => Array(N).fill(has('beat') ? d.drums[k] : z(d.drums[k])).flat();
  return { bytes: toMidi({ bpm: g.bpm, leadProgram: GM[instr.melodie] ?? d.leadProgram, riffProgram: GM[instr.riff] ?? 30, guitar: has('riff') ? rep(d.guitar) : [], bass: has('basse') ? rep(d.bass) : [], melody: has('melodie') ? rep(d.melody) : [],
    drums: { kick: dr('kick'), snare: dr('snare'), hihat: dr('hihat') } }), sec: Math.round(N * barSec) };
}
async function toolTeleverser(args, ctx) {
  let u; try { u = new URL(String(args.upload_url || '')); } catch { return { error: 'upload_url invalide.' }; }
  if (u.protocol !== 'https:' || !SUNO_UPLOAD_HOSTS.includes(u.hostname)) return { error: "upload_url doit venir de midi-upload-create (Suno)." };
  const fields = args.upload_fields && typeof args.upload_fields === 'object' ? args.upload_fields : null;
  if (!fields || !fields.key || !fields.policy) return { error: 'upload_fields manquants (passe-les tels quels).' };
  const g = args.groove_id ? await grooveById(ctx, args.groove_id) : await grooveForStyle(ctx, args.style, Number(args.bpm) || 0);
  if (!g) return { error: args.groove_id ? 'Groove introuvable ou pas encore approuvé.' : 'Aucun groove approuvé pour ce style au bon tempo.' };
  const PISTES = ['beat', 'riff', 'basse', 'melodie'];
  const pistes = Array.isArray(args.pistes) && args.pistes.length ? args.pistes.filter(x => PISTES.includes(x)) : ['beat', 'riff', 'basse'];
  if (!pistes.length) return { error: 'Choisis au moins une piste (beat, riff, basse, melodie).' };
  const fam = INSTR_FAM[g.famille || ''] || { riff: 'guitare', melodie: 'cuivres' };
  const pick = (v, d) => (v && v !== 'auto' && GM[v] !== undefined) ? v : d;
  const instr = { riff: pick(args.instrument_riff, fam.riff), melodie: pick(args.instrument_melodie, fam.melodie) };
  const { bytes, sec } = loopedMidi(g, 60, pistes, instr);
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
  fd.append('file', new Blob([bytes], { type: 'audio/midi' }), 'metalprompt-groove.mid');
  const r = await fetch(u.toString(), { method: 'POST', body: fd });
  if (!r.ok) return { error: `Envoi vers Suno refusé (${r.status}). Recommence midi-upload-create (l'envoi expire après 10 minutes).` };
  return { text: [
    `Groove envoyé : ${g.id} · ${g.bpm} BPM · ${g.accordage} · ${meterName(g.mesures)} · ~${sec} s · pistes : ${pistes.join(' + ')} · riff au ${instr.riff}${pistes.includes('melodie') ? ', mélodie au ' + instr.melodie : ''}.`,
    'Suite : midi-upload-complete, puis audio-create avec midi_upload_id, model v6-wild et une description qui reprend le Style (instrumental).',
    'Pour les paroles : audio-covers-create sur ce clip avec style, negative_style et lyrics (garde le riff et la mélodie).',
    `Au cover, ajoute à negative_style : ${[...new Set(['riff', 'melodie'].filter(k => k === 'riff' ? pistes.includes('riff') : pistes.includes('melodie')).map(k => INSTR_EN[instr[k]]).filter(Boolean))].join(', ') || '(rien)'}, synth, chiptune, 8-bit, video game, MIDI — l'instrument d'entrée sert juste à porter la ligne, la toune finale reste en guitares metal.`,
  ].join('\n') };
}

const RUN = { forger_toune: toolToune, televerser_groove: toolTeleverser, forger_prompt: toolForger, creer_riff: toolRiff, ecrire_paroles: toolParoles, remplir_banque: toolRemplirBanque };

const INSTRUCTIONS = `MetalPrompt forge des prompts Suno pour le metal (« Inspiré, jamais copié »).
Le plus simple : forger_toune (tout en un), puis audio-create de Suno avec model v6-wild, style = Style, negative_style = Exclude, lyrics = Lyrics. N'utilise pas la chaîne MIDI (televerser_groove) sauf si on te le demande : elle est expérimentale et sonne sèche. Autre voie : forger_prompt → (optionnel) ecrire_paroles avec la structure reçue → (optionnel) creer_riff. Avec un connecteur Suno : Style → champ style, Exclude → champ exclude, structure + paroles → champ lyrics.
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
  if (method === 'tools/list') return ok(id, { tools: ctx.owner ? [...TOOLS, ...OWNER_TOOLS] : TOOLS });
  if (method === 'tools/call') {
    const name = params.name, run = RUN[name];
    if (!run || (OWNER_NAMES.has(name) && !ctx.owner)) return err(id, -32602, 'Outil inconnu : ' + name);
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
export const _test = { handleOne, toolForger, toolToune, toolTeleverser, toolRiff, parseEra, findGenre, bankStyleFor, TOOLS };
