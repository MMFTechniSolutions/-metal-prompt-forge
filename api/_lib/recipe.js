// Recette MetalPrompt partagée site + MCP (tests du 7 nov. 2026 : black 1995, groove 2004, Pantera 1994, LoG 2004).
// Vrai band en studio, style pur, signature cachée, beat de la banque en mots, voix grave, pas de « new wave ».
import { BAND_YEARS } from '../_bandYears.js';

// ── Recette « vrai band en studio » (tests black metal 1995 + groove metal 2004, 7 nov. 2026) ──
// Mots qui faisaient sortir du synth, du grid machine ou une foule de show.
export const BAD_STYLE = [
  /\b(?:raw )?live[- ]band recording\b/i, /\blive[- ]room production\b/i, /\broom mics?\b/i, /\blive recording\b/i,
  /\bsteady pulse\b/i, /\bblizzard\b/i, /\bthin no-bass\b/i, /\bdrenched in reverb\b/i, /\breverb-drenched\b/i,
];
export const VOCAL_WORDS = /\b(vocals?|voice|shrieks?|growls?|screams?|screamed|sung|singing|singer|gutturals?|rasp(y)?|choir|chant(s|ed)?|delivery)\b/i;
export const STUDIO_TAGS = 'studio album production, played by a real band in the studio, human drummer feel, natural timing, real distorted electric guitars, no keyboards';
export const DEFAULT_EXCL = ['new wave', 'synthpop', 'synth', 'keyboards', 'synth pads', 'ambient pads', 'orchestral', 'symphonic', 'electronic', '8-bit', 'MIDI', 'programmed drums', 'drum machine', 'quantized', 'robotic', 'mechanical', 'live concert', 'crowd noise', 'audience', 'applause'];
// Si le style demande des claviers/orchestre (symphonic black, industrial…), on ne les exclut pas.
export const KEYS_STYLE = /symphon|orchestr|industrial|synth|keyboard|gothic|cyber|electro/i;
export const KEYS_EXCL = new Set(['synth', 'keyboards', 'synth pads', 'ambient pads', 'orchestral', 'symphonic', 'electronic']);
export const splitTags = s => String(s || '').split(/\s*[,;]\s*/).map(x => x.trim()).filter(Boolean);
export const uniq = a => { const seen = new Set(); return a.filter(x => { const k = x.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }); };

export function cleanStyle(style, { instrumental, genres }) {
  const keys = KEYS_STYLE.test(genres.join(' '));
  let tags = splitTags(style).filter(t => !BAD_STYLE.some(re => re.test(t)));
  // « new wave » dans un prompt metal = synthé 80s dans Suno (test 7 nov. 2026)
  if (!/new wave|synth/i.test(genres.join(' '))) tags = tags.map(t => t.replace(/\bnew wave of (american|british|traditional) heavy metal\b/gi, (m, w) => w === 'american' ? '2000s american heavy metal' : w === 'british' ? 'early 1980s british heavy metal' : 'traditional heavy metal').replace(/\bnew wave of american metal\b/gi, '2000s american heavy metal'));
  // Style pur : enlève un mix que l'utilisateur n'a pas demandé (« black metal with punk rock inflections »)
  if (genres.length === 1) {
    tags = tags.map(t => t.replace(/\s+with\s+[^,]*\binflections?\b/i, '').trim());
    if (!/punk|hardcore|crossover|crust|grind/i.test(genres[0])) tags = tags.filter(t => !/\bpunk\b/i.test(t));
  }
  tags = tags.map(t => t.replace(/\s*\b(blizzard|drenched in reverb|thin no-bass)\b\s*/gi, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (instrumental) tags = tags.filter(t => !VOCAL_WORDS.test(t));
  // Traits de signature qui contredisent l'Exclude (claviers, électro, son radio) → dehors, sauf style à claviers
  if (!keys) tags = tags.filter(t => !/keyboard|synth|electronic|samples?\b|organ|polished|radio-ready/i.test(t));
  const studio = splitTags(STUDIO_TAGS).filter(t => !(keys && /no keyboards/.test(t)));
  return uniq([...(instrumental ? ['instrumental'] : []), ...tags, ...studio]).join(', ');
}
export function cleanExclude(excl, { genres, instrumental }) {
  const keys = KEYS_STYLE.test(genres.join(' '));
  let tags = splitTags(excl);
  const add = DEFAULT_EXCL.filter(t => !(keys && KEYS_EXCL.has(t)));
  if (keys) tags = tags.filter(t => !KEYS_EXCL.has(t.toLowerCase()));
  // En instrumental, inutile d'exclure des types de voix : ça gaspille le champ
  if (instrumental) tags = tags.filter(t => !VOCAL_WORDS.test(t));
  return uniq([...tags, ...add]).join(', ');
}
// Structure : aucun tag vocal en instrumental, et des sections fidèles au genre
export const GENRE_NO = [
  [/black/, /\b(half-?time|breakdown|palm mutes?|chorus)\b/i],
  [/groove|thrash|nwobhm|heavy/, /\bblast\b/i],
];
export function cleanStruct(struct, { instrumental, genres }) {
  const g = genres.join(' ').toLowerCase();
  const black = /black/.test(g);
  const lines = String(struct || '').split('\n').map(l => l.trim()).filter(Boolean);
  const out = [];
  for (let line of lines) {
    const m = line.match(/^\[([^\]|]+)(?:\|\s*([^\]]*))?\]$/);
    if (!m) { if (!instrumental) out.push(line); continue; }
    let name = m[1].trim(), cue = (m[2] || '').trim();
    if (/^end$/i.test(name)) { out.push('[End]'); continue; }
    if (instrumental) {
      if (/chorus|chant|gang|choir|vocal|scream|spoken/i.test(name)) name = black ? 'Tremolo Riff' : 'Groove Riff';
      if (/verse/i.test(name)) name = 'Verse';
      cue = cue.split(/\s*,\s*/).filter(c => c && !VOCAL_WORDS.test(c)).join(', ');
    }
    if (!KEYS_STYLE.test(g)) cue = cue.split(/\s*,\s*/).filter(c => c && !/pad|synth|keyboard|organ|ambient/i.test(c)).join(', ');
    if (/atmospheric|ambient/i.test(name) && !KEYS_STYLE.test(g) && !/post|atmos|doom|gaze/.test(g)) continue;
    const bad = GENRE_NO.find(([re]) => re.test(g));
    if (bad && (bad[1].test(name) || bad[1].test(cue))) {
      if (bad[1].test(name)) continue;        // section qui fait pas le genre (half-time en black, blast en groove) → on l'enlève
      cue = cue.split(/\s*,\s*/).filter(c => !bad[1].test(c)).join(', ');
    }
    if (instrumental && !cue) cue = black ? 'tremolo guitars, blast beats' : 'guitars and drums';
    out.push(cue ? `[${name} | ${cue}]` : `[${name}]`);
  }
  // pas deux sections identiques de suite
  return out.filter((l, i) => l !== out[i - 1]).join('\n');
}


// Genre forgé → style de la banque (le plus précis d'abord)
export const BANK_MAP = [
  [/death.?doom|swamp|florida death/, 'deathdoom'], [/symphonic black/, 'symphonicblack'], [/atmospheric black/, 'atmosblack'], [/blackgaze/, 'blackgaze'],
  [/blackened death.?core/, 'blackeneddeathcore'], [/melodic death.?core/, 'melodicdeathcore'], [/melodic death|gothenburg|melodeath/, 'melodicdeath'],
  [/brutal death/, 'brutaldeath'], [/tech(nical)? death/, 'techdeath'], [/dissonant/, 'dissonant'], [/deathgrind/, 'deathgrind'], [/grind/, 'grindcore'],
  [/slam/, 'slam'], [/death.?core/, 'deathcore'], [/metalcore/, 'metalcore'], [/beatdown/, 'beatdown'], [/math.?core/, 'mathcore'], [/hardcore/, 'hardcore'],
  [/crossover/, 'crossover'], [/thrash/, 'thrash'], [/speed/, 'speed'], [/power/, 'powermetal'], [/nwobhm|heavy metal/, 'nwobhm'], [/djent/, 'djent'],
  [/prog/, 'progmetal'], [/nu.?metal/, 'numetal'], [/rap/, 'rapcore'], [/industrial/, 'industrial'], [/groove/, 'groove'], [/funeral/, 'funeraldoom'],
  [/sludge/, 'sludge'], [/goth/, 'gothic'], [/post.?metal/, 'postmetal'], [/doom/, 'doom'], [/black/, 'blackened'], [/death/, 'death'],
];
export const bankStyleFor = txt => { const t = String(txt || '').toLowerCase().replace(/power chords?/g, ''); const m = BANK_MAP.find(([re]) => re.test(t)); return m ? m[1] : null; };


// ── Signature cachée (7 nov. 2026) : « groove metal 2004 » donnait la moyenne du genre (« générique »).
// On pige un groupe de la base du même genre, actif autour de l'année demandée, et on prend SA signature
// sonore + sa scène. Le nom ne sort jamais du serveur : seuls les descripteurs de son vont dans le prompt.
export async function hiddenSignature(ctx, genre, year) {
  if (!ctx.sb || !genre) return null;
  const { data } = await ctx.sb.from('band_cache').select('name_key,signature,scene,scene_from,scene_to').eq('genre', genre).limit(200);
  const rows = (data || []).filter(r => Array.isArray(r.signature) && r.signature.length);
  if (!rows.length) return null;
  const y = Number(year) || 0;
  const near = d => rows.filter(r => (BAND_YEARS[r.name_key] || []).some(a => Math.abs(a - y) <= d));
  const pool = y ? (near(1).length ? near(1) : near(3).length ? near(3) : []) : rows;
  if (!pool.length) return null;
  const r = pool[Math.floor(Math.random() * pool.length)];
  const scene = r.scene ? { label: r.scene, from: r.scene_from || null, to: r.scene_to || null } : null;
  return { signature: r.signature.map(String).slice(0, 4), scene };
}


// ── Beat de la banque en mots (7 nov. 2026) : pas de MIDI. On pige un beat de la banque au tempo du prompt et on
// décrit son kick / caisse claire / hi-hat dans le Style. Suno le joue lui-même → beat unique, recette protégée.
export const COUNT = i => { const b = Math.floor(i / 4) + 1, r = i % 4; return r === 0 ? String(b) : r === 1 ? `the e of ${b}` : r === 2 ? `the and of ${b}` : `the a of ${b}`; };
export const joinOr = a => a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
export function beatWords(g) {
  const d = g && g.data && g.data.drums; if (!d || !Array.isArray(d.kick)) return '';
  const k = d.kick.slice(0, 16), sn = (d.snare || []).slice(0, 16), hh = d.hihat || [];
  const kHits = k.map((v, i) => v ? COUNT(i) : null).filter(Boolean);
  const sHits = sn.map((v, i) => v ? i : null).filter(i => i !== null);
  const back = sHits.filter(i => i === 4 || i === 12).length === 2, half = sHits.length === 1 && sHits[0] === 8;
  const extra = sHits.filter(i => ![4, 12].includes(i)).length;
  const dens = bar => bar.reduce((a, v) => a + (v ? 1 : 0), 0);
  const bars = [0, 1, 2, 3].map(b => dens(hh.slice(b * 16, b * 16 + 16))).filter(n => n > 0);
  const hat = n => n >= 13 ? 'sixteenth-note hi-hat' : n >= 7 ? 'eighth-note hi-hat' : 'quarter-note ride';
  const hats = [...new Set(bars.map(hat))];
  const parts = [];
  if (kHits.length && kHits.length <= 7) parts.push(`syncopated kick on ${joinOr(kHits)}`);
  else if (kHits.length > 7) parts.push('busy syncopated double bass kick pattern');
  parts.push(half ? 'half-time snare on 3' : back ? `snare backbeat on 2 and 4${extra ? ' with pickup snare hits' : ''}` : 'displaced snare accents');
  if (hats.length) parts.push(hats.length > 1 ? `${hats[0]} switching to ${hats[1]}` : hats[0]);
  return parts.join(', ');
}
export async function bankBeat(ctx, genres, style, bpm) {
  const bs = bankStyleFor(genres.join(' ')) || bankStyleFor(style);
  if (!bs || !ctx.sb) return null;
  const statuses = ctx.owner ? ['approved', 'pending'] : ['approved'];
  for (const st of statuses) {
    const { data } = await ctx.sb.from('melody_bank').select('id,bpm,mesures,data').eq('style', bs).eq('status', st).limit(60);
    const ok = (data || []).filter(r => (!bpm || Math.abs(r.bpm - bpm) <= 12) && (r.mesures || []).every(m => m === 16));   // 4/4 seulement : les mesures impaires sortaient tout croche
    if (ok.length) return ok[Math.floor(Math.random() * ok.length)];
  }
  return null;
}
export const DEEP_VOX = /deep|low[- ]register|guttural|baritone|growl|low-mid/i;

