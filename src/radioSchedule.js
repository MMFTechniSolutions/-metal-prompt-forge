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
export function onAir(ms, items, grille) {
  const all = items.filter(it => it.duration > 5 && it.sunoId).sort((a, b) => (a.id < b.id ? -1 : 1));
  const jingles = all.filter(isJingle);
  let songs = all.filter(it => !isJingle(it)), epoch = EPOCH, show = currentShow(ms, grille);
  if (show) { const f = songs.filter(it => genreMatch(it, show.genre)); if (f.length >= MIN_SHOW) { songs = f; epoch = show.startMs; } else show = null; }
  if (!songs.length) return null;
  const L = cycleOrder(songs, jingles, 0).reduce((t, it) => t + it.duration, 0);   // longueur fixe d'un tour
  const T = (ms - epoch) / 1000, cycle = Math.floor(T / L);
  let t = T - cycle * L, acc = 0;
  const order = cycleOrder(songs, jingles, cycle);
  for (let k = 0; k < order.length; k++) {
    const d = order[k].duration;
    if (t < acc + d) {
      const start = ms - (t - acc) * 1000, end = start + d * 1000;
      const next = order[k + 1] || cycleOrder(songs, jingles, cycle + 1)[0];
      return { cur: order[k], start, end, next, show };
    }
    acc += d;
  }
  return null;
}
