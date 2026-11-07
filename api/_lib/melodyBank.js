// api/_lib/melodyBank.js — Générateur de la banque serveur de grooves + mélodies par style (nov. 2026)
// Pige l'arrangement de api/riff.js (guitare, basse, drums) par section et ajoute une mélodie dans la
// gamme qui accote le style. Utilisé par l'outil MCP propriétaire « remplir_banque » (écrit direct dans
// la table privée melody_bank) et par scripts/build-melody-bank.mjs (fichiers locaux + MIDI).
// Rien ici n'est exposé au navigateur.

import riffHandler from '../riff.js';

export const STYLES = ['nwobhm','thrash','death','doom','blackened','groove','djent','speed','slam','sludge','postmetal',
  'grindcore','funeraldoom','dissonant','rapcore','deathcore','metalcore','melodicdeath','melodicdeathcore','brutaldeath',
  'techdeath','blackeneddeathcore','numetal','beatdown','crossover','hardcore','deathgrind','mathcore','progmetal',
  'powermetal','atmosblack','symphonicblack','blackgaze','industrial','gothic',
  'deathdoom','swampdeath'];
// Styles de banque qui réutilisent un pattern de riff.js (ajout 2026-11-07 : death lent/swampy, test Florida 90 BPM)
const RIFF_OF = { deathdoom: 'doom', swampdeath: 'sludge' };
export const SECTIONS = { intro: 'sec1', couplet: 'sec2', refrain: 'sec3', breakdown: 'sec4' };

// ── Gamme + rythme de mélodie par famille (ce qui « accote » le style) ──
const FAM = {
  sombre:   { scale: [0,1,3,5,7,8,10], rhy: 'croches',  styles: ['death','brutaldeath','slam','deathcore','deathgrind','grindcore','blackeneddeathcore','beatdown'] },
  melo:     { scale: [0,2,3,5,7,8,11], rhy: 'harmonie', styles: ['melodicdeath','melodicdeathcore','metalcore'] },
  epique:   { scale: [0,2,3,5,7,8,11], rhy: 'galop',    styles: ['powermetal','nwobhm','speed'] },
  tremolo:  { scale: [0,2,3,5,7,8,10], rhy: 'tremolo',  styles: ['blackened','atmosblack','symphonicblack'] },
  lourd:    { scale: [0,2,3,5,7,8,10], rhy: 'longues',  styles: ['doom','funeraldoom','gothic','sludge'] },
  tordu:    { scale: [0,1,4,6,7,10],   rhy: 'impair',   styles: ['djent','progmetal','mathcore','techdeath','dissonant'] },
  groove:   { scale: [0,3,5,6,7,10],   rhy: 'syncope',  styles: ['thrash','crossover','hardcore','groove','numetal','rapcore','industrial'] },
  planant:  { scale: [0,2,3,5,7,9,10], rhy: 'longues',  styles: ['postmetal','blackgaze'] },
  marecage: { scale: [0,1,3,5,6,7,8,10], rhy: 'lourdes', styles: ['deathdoom','swampdeath'] },   // phrygien + triton, noires lourdes
};
const BPM_FAM = { sombre: [180, 215], melo: [150, 180], epique: [160, 190], tremolo: [170, 205], lourd: [58, 80], tordu: [110, 145], groove: [100, 135], planant: [85, 110], marecage: [70, 100] };
const BPM = { slam: [95, 115], beatdown: [90, 110], thrash: [170, 200], crossover: [170, 200], hardcore: [160, 190], numetal: [95, 110], rapcore: [90, 105], grindcore: [200, 240], deathgrind: [190, 230], deathcore: [140, 170], sludge: [65, 85] };
const TUNE_FAM = { sombre: ['B1', 'C2'], melo: ['D2', 'C2'], epique: ['E2', 'Eb2'], tremolo: ['E2', 'D2'], lourd: ['C2', 'B1'], tordu: ['B1', 'Db2'], groove: ['D2', 'Db2', 'E2'], planant: ['D2', 'C2'], marecage: ['B1', 'C2'] };
const DRUMS_FAM = { sombre: 'blast_beat', melo: 'double_kick', epique: 'gallop', tremolo: 'blast_beat', lourd: 'standard', tordu: 'double_kick', groove: 'standard', planant: 'standard', marecage: 'standard' };
const famOf = s => Object.entries(FAM).find(([, f]) => f.styles.includes(s)) || ['groove', FAM.groove];
const ROOT_MIDI = { E2: 40, Eb2: 39, D2: 38, Db2: 37, C2: 36, B1: 35 };
const ri = n => Math.floor(Math.random() * n);

// Rythmes (positions en 16e dans une mesure de n pas, durée en pas)
function rhythm(kind, n) {
  const ev = [];
  if (kind === 'longues') { for (let s = 0; s < n; s += 8) ev.push([s, Math.min(8, n - s)]); }
  else if (kind === 'tremolo') { for (let s = 0; s < n; s++) ev.push([s, 1]); }
  else if (kind === 'galop') { for (let s = 0; s < n; s += 4) { ev.push([s, 2]); if (s + 2 < n) ev.push([s + 2, 1]); if (s + 3 < n) ev.push([s + 3, 1]); } }
  else if (kind === 'impair') { let s = 0; const g = [3, 3, 2, 3, 2, 3]; let i = ri(g.length); while (s < n) { const d = Math.min(g[i++ % g.length], n - s); ev.push([s, d]); s += d; } }
  else if (kind === 'syncope') { const pos = [0, 3, 6, 8, 10, 13].filter(x => x < n); pos.forEach((p, i) => ev.push([p, (pos[i + 1] ?? n) - p])); }
  else if (kind === 'lourdes') { const pos = [0, 4, 6, 8, 12].filter(x => x < n); pos.forEach((p, i) => ev.push([p, (pos[i + 1] ?? n) - p])); }
  else if (kind === 'harmonie') { for (let s = 0; s < n; s += 2) ev.push([s, 2]); }
  else { for (let s = 0; s < n; s += 2) ev.push([s, 2]); }   // croches
  return ev;
}

// Mélodie : un motif de 4-6 degrés, répété et varié, qui finit sur la tonique; suit la transposition du riff
function melody(style, arr, fam) {
  const { scale, rhy } = fam;
  const motif = [0]; const L = 4 + ri(3);
  for (let i = 1; i < L; i++) { const d = (Math.random() < 0.7 ? 1 : 2) * (Math.random() < 0.5 ? 1 : -1); motif.push(Math.max(-2, Math.min(scale.length + 2, motif[i - 1] + d))); }
  const deg = k => { const o = Math.floor(k / scale.length), m = ((k % scale.length) + scale.length) % scale.length; return scale[m] + 12 * o; };
  const notes = []; let off = 0; let mi = 0;
  arr.bars.forEach((n, b) => {
    const tr = arr.trans[off] || 0;
    const ev = rhythm(rhy, n);
    const last = b === arr.bars.length - 1;
    ev.forEach(([s, d], i) => {
      let k = motif[mi % motif.length];
      if (rhy === 'tremolo') k = motif[Math.floor(s / 4) % motif.length];   // même note sur un temps
      else mi++;
      if (b === 2 && Math.random() < 0.4) k += 1;                          // variation au 3e passage
      if (last && i === ev.length - 1) k = 0;                              // finit sur la tonique
      notes.push({ t: off + s, d, p: deg(k) + tr });
    });
    off += n;
  });
  return notes;
}

// ── Écriture MIDI (SMF type 1, 480 ticks/noire, 16e = 120 ticks) ──
const vlq = v => { const b = [v & 0x7f]; while ((v >>= 7)) b.unshift((v & 0x7f) | 0x80); return b; };
function track(events) {   // events: [tick, bytes[]]
  events.sort((a, b) => a[0] - b[0] || (a[1][0] & 0xf0) - (b[1][0] & 0xf0));
  const data = []; let last = 0;
  for (const [t, by] of events) { data.push(...vlq(t - last), ...by); last = t; }
  data.push(0, 0xff, 0x2f, 0);
  return [0x4d, 0x54, 0x72, 0x6b, ...[24, 16, 8, 0].map(s => (data.length >> s) & 255), ...data];
}
function noteTrack(ch, program, notes, vel) {
  const ev = [[0, [0xc0 | ch, program]]];
  for (const n of notes) { const p = Math.max(0, Math.min(127, n.p)); ev.push([n.t * 120, [0x90 | ch, p, n.v || vel]]); ev.push([(n.t + n.d) * 120 - 5, [0x80 | ch, p, 0]]); }
  return track(ev);
}
export function toMidi(e) {
  const us = Math.round(60000000 / e.bpm);
  const meta = track([[0, [0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255]]]);
  const DR = { kick: 36, snare: 38, hihat: 42 };
  const drums = []; for (const k of ['kick', 'snare', 'hihat']) e.drums[k].forEach((v, t) => v && drums.push({ t, d: 1, p: DR[k], v: k === 'hihat' ? 70 : 110 }));
  const tr = [meta,
    noteTrack(0, e.riffProgram ?? 30, e.guitar.flatMap(n => [n, { ...n, p: n.p + 7 }]), 100),   // power chords
    noteTrack(1, 33, e.bass, 100),
    noteTrack(2, e.leadProgram, e.melody, 92),
    noteTrack(9, 0, drums, 100)];
  const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, tr.length, 0x01, 0xe0];
  return Uint8Array.from([...head, ...tr.flat()]);
}

function call(body) {
  return new Promise(r => riffHandler({ method: 'POST', body }, { status() { return this; }, json: d => r(d) }));
}

// Notes guitare/basse : durée jusqu'au coup suivant (max 2 pas, palm mute)
function strum(arr, key, root, octave) {
  const out = [];
  for (let i = 0; i < arr.L; i++) {
    const v = arr[key][i]; if (v == null) continue;
    let d = 1; while (i + d < arr.L && arr[key][i + d] == null && d < 2) d++;
    out.push({ t: i, d, p: root + octave + v + (arr.trans[i] || 0) });
  }
  return out;
}

// Génère des entrées. opts.styles = liste (défaut : tous), opts.per = nb par section, opts.tag = suffixe d'id unique
export async function generateBank({ styles = STYLES, per = 2, tag = '' } = {}) {
  const out = [];
  for (const style of styles) {
    if (!STYLES.includes(style)) continue;
    const [famName, fam] = famOf(style);
    for (const [section, structure] of Object.entries(SECTIONS)) {
      for (let k = 0; k < per; k++) {
        const [lo, hi] = BPM[style] || BPM_FAM[famName];
        const r = await call({ style: RIFF_OF[style] || style, structure, tier: 'elite', drums: DRUMS_FAM[famName], bpm: lo + ri(hi - lo + 1), tuning: TUNE_FAM[famName][ri(TUNE_FAM[famName].length)] });
        const a = r.arr; const root = ROOT_MIDI[r.root] || 40;
        out.push({
          id: `${style}-${section}-${tag ? tag + '-' : ''}${k + 1}`, style, famille: famName, section, bpm: r.bpm, accordage: r.root, mesures: a.bars,
          data: {
            guitar: strum(a, 'note', root, 0), bass: strum(a, 'bnote', root, -12),
            drums: { kick: a.kick, snare: a.snare, hihat: a.hihat },
            melody: melody(style, a, fam).map(n => ({ ...n, p: n.p + root + 24 })),
            leadProgram: famName === 'lourd' || famName === 'marecage' || famName === 'planant' ? 49 : famName === 'tremolo' ? 48 : 30,
          },
        });
      }
    }
  }
  return out;
}
