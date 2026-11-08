// Radio MetalPrompt — grille commune (nov. 2026)
// Tout le monde calcule la même chose à partir de l'heure du serveur : même chanson, au même moment.
// · Les chansons sont mélangées avec une graine fixe par tour de liste → même ordre pour tous.
// · Une annonce (genre « Annonce ») passe après chaque bloc de SONGS_PER_ID chansons.
// · Émissions : une plage de radio_grille (jour/heure, heure de Montréal) filtre les chansons sur son genre,
//   si assez de stock (MIN_SHOW); sinon mélange général.
export const EPOCH = Date.UTC(2026, 10, 1, 4, 0, 0);   // 1er nov. 2026, 00 h 00 heure de l'Est
export const SONGS_PER_ID = 3;
export const MIN_SHOW = 6;
export const isJingle = it => /^annonce$/i.test((it && it.genre) || "");

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffled(arr, seed) { const r = rng(seed), b = arr.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

// heure locale de Montréal : jour (0 = dim.) + secondes depuis minuit
function torontoClock(ms) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Toronto", weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { day, sec: (+p.hour) * 3600 + (+p.minute) * 60 + (+p.second) };
}
export function currentShow(ms, grille) {
  if (!grille || !grille.length) return null;
  const { day, sec } = torontoClock(ms), h = sec / 3600;
  const s = grille.find(g => (g.jour == null || g.jour === day) && h >= g.heure_debut && h < g.heure_fin);
  if (!s) return null;
  return { ...s, startMs: ms - (sec - s.heure_debut * 3600) * 1000, endMs: ms + (s.heure_fin * 3600 - sec) * 1000 };
}
const genreMatch = (it, g) => { const a = (it.genre || "").toLowerCase(), b = (g || "").toLowerCase(); return a && b && (a.includes(b) || b.includes(a)); };

// un tour de liste : chansons mélangées (graine = n° du tour), une annonce après chaque bloc
function cycleOrder(songs, jingles, cycle) {
  const s = shuffled(songs, 1000 + cycle), j = shuffled(jingles, 7000), out = [];   // même suite d'annonces à chaque tour → tour de longueur fixe
  s.forEach((it, i) => { out.push(it); if (j.length && (i + 1) % SONGS_PER_ID === 0) out.push(j[Math.floor(i / SONGS_PER_ID) % j.length]); });
  return out;
}

// → { cur, start, end, next, show } ou null. start/end en ms (horloge du serveur).
// MP3 hébergé (audio_file) : joué par notre lecteur → fondu enchaîné de XF secondes.
// Sa case dans la grille dure duration − XF : la suivante embarque pendant ses XF dernières secondes.
export const XF = 4;
export const isHosted = it => !!(it && it.audio_file);
const slotLen = it => Math.max(5, it.duration - (isHosted(it) ? XF : 0));

// Entrée en rotation (8 nov. 2026) : une toune approuvée attend le début du prochain tour de liste.
// Avant : chaque ajout recalculait tout l'ordre et la radio sautait en pleine toune pour tout le monde.
// Chaque tour prend les tounes approuvées AVANT son début (approved_at); sans date → dans la rotation depuis l'époque.
const inAt = it => { const t = it.approved_at ? Date.parse(it.approved_at) : NaN; return Number.isFinite(t) ? t : -Infinity; };
const lenOf = (songs, jingles, c) => cycleOrder(songs, jingles, c).reduce((t, it) => t + slotLen(it), 0);
let memo = { key: "", cycles: [] };
// tours successifs depuis l'époque : { c, startMs, songs, jingles, L }
function cycleAt(ms, songsAll, jinglesAll, epoch) {
  const key = epoch + "|" + songsAll.map(s => s.id + ":" + s.duration + ":" + inAt(s)).join(",") + "|" + jinglesAll.map(j => j.id + ":" + j.duration + ":" + inAt(j)).join(",");
  if (memo.key !== key) memo = { key, cycles: [] };
  const C = memo.cycles;
  const make = (c, startMs) => {
    const songs = songsAll.filter(s => inAt(s) <= startMs), jingles = jinglesAll.filter(j => inAt(j) <= startMs);
    if (!songs.length) return null;
    return { c, startMs, songs, jingles, L: lenOf(songs, jingles, c) };
  };
  if (!C.length) { const f = make(0, epoch); if (!f) return null; C.push(f); }
  // plusieurs tours d'affilée avec la même liste : on saute d'un coup (tours de même longueur)
  while (true) {
    const last = C[C.length - 1], endMs = last.startMs + last.L * 1000;
    if (ms < endMs) break;
    const nextAdd = Math.min(...songsAll.concat(jinglesAll).map(inAt).filter(t => t > last.startMs).concat([Infinity]));
    let n = 1;
    if (nextAdd === Infinity || nextAdd > ms) n = Math.max(1, Math.floor((ms - last.startMs) / (last.L * 1000)));
    else n = Math.max(1, Math.floor((nextAdd - last.startMs) / (last.L * 1000)));
    const nx = { ...last, c: last.c + n, startMs: last.startMs + n * last.L * 1000 };
    if (nx.startMs >= nextAdd) { const m = make(nx.c, nx.startMs); if (!m) break; C.push(m); } else C.push(nx);
    if (C.length > 5000) C.splice(0, C.length - 50);
  }
  for (let i = C.length - 1; i >= 0; i--) if (C[i].startMs <= ms) return { cur: C[i], prev: C[i - 1] || null };
  return { cur: C[0], prev: null };
}

// → { cur, start, end, next, prev, prevStart, show } ou null. start/end en ms (horloge du serveur).
export function onAir(ms, items, grille) {
  const all = items.filter(it => it.duration > 5 && (it.sunoId || it.audio_file)).sort((a, b) => (a.id < b.id ? -1 : 1));
  const jingles = all.filter(isJingle);
  let songs = all.filter(it => !isJingle(it)), epoch = EPOCH, show = currentShow(ms, grille);
  if (show) { const f = songs.filter(it => genreMatch(it, show.genre)); if (f.length >= MIN_SHOW) { songs = f; epoch = show.startMs; } else show = null; }
  if (!songs.length) return null;
  const cy = cycleAt(ms, songs, jingles, epoch);
  if (!cy) return null;
  const { cur: cyc } = cy, order = cycleOrder(cyc.songs, cyc.jingles, cyc.c);
  const t = (ms - cyc.startMs) / 1000;
  let acc = 0;
  for (let k = 0; k < order.length; k++) {
    const d = slotLen(order[k]);
    if (t < acc + d) {
      // début arrondi à la ms : la même valeur à chaque seconde, sinon la clé du lecteur change et la chanson repart
      const start = Math.round(cyc.startMs + acc * 1000), end = start + Math.round(d * 1000);
      let next = order[k + 1];
      if (!next) { const ns = cyc.startMs + cyc.L * 1000, ss = songs.filter(s => inAt(s) <= ns), jj = jingles.filter(j => inAt(j) <= ns); next = cycleOrder(ss, jj, cyc.c + 1)[0]; }
      let prev = order[k - 1], prevStart;
      if (!prev) { const po = cycleOrder(cyc.songs, cyc.jingles, cyc.c - 1); prev = po[po.length - 1]; }
      if (prev) prevStart = start - Math.round(slotLen(prev) * 1000);
      return { cur: order[k], start, end, next, prev, prevStart, show };
    }
    acc += d;
  }
  return null;
}
