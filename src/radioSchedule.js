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
function baseOnAir(ms, items, grille) {
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

// ── Bulletin météo + bonne nouvelle (8 nov. 2026) ──
// 3 fois par jour (7 h, 12 h, 17 h, heure de Montréal) : à la fin de la toune en cours, un bulletin de
// BULLETIN_LEN secondes passe pour tout le monde, puis la grille reprend (décalée d'autant).
// Seulement à partir du 9 nov. 2026 7 h : rien ne change dans le passé, donc aucun saut au déploiement.
export const BULLETIN_LEN = 55;   // FR ~46 s au 1er essai : marge
const BULLETIN_HOURS = [7, 12, 17];
// Désactivé tant que la clé ELEVENLABS_API_KEY n'est pas dans Vercel (sinon 40 s de silence) : mettre la date de départ ici
const BULLETIN_FROM = Date.UTC(2026, 10, 9, 11, 0, 0);   // allumé : 9 nov. 2026, 6 h heure de l'Est (1er bulletin à 7 h)
// ── Capsules podcast « comment marche MetalPrompt » (8 nov. 2026) ──
// 4 fois par jour, même mécanique que le bulletin : chaque auditeur entend la capsule de SA langue,
// le créneau dure la plus longue des deux (FR/EN), donc tout le monde reste synchro.
const PODCAST_HOURS = [9, 14, 20, 22];
const PODCAST_FROM = Date.UTC(2026, 10, 9, 13, 0, 0);    // 9 nov. 2026, 8 h heure de l'Est (1re capsule à 9 h)
const POD_FR = [["fr-a-1",130.0],["fr-a-2",127.2],["fr-a-3",126.4],["fr-a-4",132.4],["fr-a-5",125.5],["fr-a-6",130.0],["fr-a-7",129.1],["fr-b-1",135.2],["fr-b-2",138.8],["fr-b-3",134.8],["fr-b-4",135.4],["fr-c-1",143.6],["fr-c-2",144.4],["fr-c-3",146.5],["fr-c-4",141.3]];
const POD_EN = [["en-a-1",126.9],["en-a-2",126.1],["en-a-3",127.5],["en-a-4",124.4],["en-a-5",130.1],["en-a-6",126.0],["en-a-7",125.6],["en-a-8",127.6],["en-a-9",125.6],["en-a-10",126.7],["en-a-11",130.3],["en-a-12",122.3],["en-a-13",133.3],["en-a-14",124.7],["en-a-15",125.5],["en-a-16",126.6]];
let bulletinCfg = { lang: "fr", base: "" };
export function setBulletinConfig(c) { bulletinCfg = { ...bulletinCfg, ...c }; }
const pad = n => String(n).padStart(2, "0");
export function torontoMs(y, m, d, h) {
  for (const off of [4, 5]) {
    const t = Date.UTC(y, m - 1, d, h + off);
    if (Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", hour: "numeric", hourCycle: "h23" }).format(t)) === h) return t;
  }
  return Date.UTC(y, m - 1, d, h + 5);
}
// n° de capsule pour un créneau : pas « aléatoire » mais qui passe toutes les capsules (pas premiers entre eux)
function podPick(key) {
  const [y, m, d, h] = key.split("-").map(Number);
  const k = Math.round(Date.UTC(y, m - 1, d) / 864e5) * PODCAST_HOURS.length + PODCAST_HOURS.indexOf(h);
  const gcd = (a, b) => (b ? gcd(b, a % b) : a), at = (arr, st) => { while (gcd(st, arr.length) !== 1) st++; return arr[((k * st) % arr.length + arr.length) % arr.length]; };
  const fr = at(POD_FR, 7), en = at(POD_EN, 7);
  return { fr, en, len: Math.ceil(Math.max(fr[1], en[1])) + 1 };
}
function specialLen(s) { return s.kind === "p" ? podPick(s.key).len * 1000 : BULLETIN_LEN * 1000; }
// créneaux (ms, clé « AAAA-MM-JJ-HH », sorte) entre deux instants
function slotsBetween(a, b) {
  const out = [], day = 864e5;
  for (let t = a - day; t <= b + day; t += day) {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(t).split("-").map(Number);
    for (const [hours, kind, from] of [[BULLETIN_HOURS, "b", BULLETIN_FROM], [PODCAST_HOURS, "p", PODCAST_FROM]]) for (const h of hours) {
      const ms = torontoMs(p[0], p[1], p[2], h);
      if (ms >= a && ms <= b && ms >= from && !out.some(o => o.ms === ms)) out.push({ ms, kind, key: `${p[0]}-${pad(p[1])}-${pad(p[2])}-${pad(h)}` });
    }
  }
  return out.sort((x, y) => x.ms - y.ms);
}
export function bulletinItem(key) {
  const url = bulletinCfg.base ? `${bulletinCfg.base}/storage/v1/object/public/radio/bulletins/${key}-${bulletinCfg.lang === "en" ? "en" : "fr"}.mp3` : null;
  return { id: "bulletin-" + key, slot: key, isBulletin: true, genre: "Annonce", title: bulletinCfg.lang === "en" ? "Weather + good news" : "Météo + bonne nouvelle",
    artist: "MetalPrompt Radio", duration: BULLETIN_LEN, audio_file: url };
}
export function podcastItem(key) {
  const p = podPick(key), en = bulletinCfg.lang === "en", f = en ? p.en : p.fr;
  return { id: "podcast-" + key, slot: key, isBulletin: true, genre: "Annonce", title: en ? "How MetalPrompt works" : "Comment marche MetalPrompt",
    artist: "MetalPrompt Radio", duration: p.len, audio_file: `/radio/podcast/${f[0]}.mp3` };
}
const specialItem = s => (s.kind === "p" ? podcastItem(s.key) : bulletinItem(s.key));
let bmemo = { key: "", list: [] };
export function onAir(ms, items, grille) {
  if (ms < BULLETIN_FROM) return baseOnAir(ms, items, grille);
  const pk = items.map(i => i.id + ":" + i.duration + ":" + (i.approved_at || "")).join(",") + "|" + (grille || []).length;
  if (bmemo.key !== pk) bmemo = { key: pk, list: [] };
  const list = bmemo.list;
  // complète la liste des créneaux spéciaux jusqu'à maintenant (début réel = fin de la toune en cours au créneau)
  let D = list.length ? list[list.length - 1].D + list[list.length - 1].L : 0;
  const from = list.length ? list[list.length - 1].slot + 1 : BULLETIN_FROM;
  for (const s of slotsBetween(from, ms)) {
    const b = baseOnAir(s.ms - D, items, grille);
    const start = b ? b.end + D : s.ms, L = specialLen(s);
    list.push({ slot: s.ms, key: s.key, kind: s.kind, start, D, L });
    D += L;
  }
  let shift = 0, prevB = null;
  for (const x of list) {
    if (x.start > ms) break;
    if (ms < x.start + x.L) {
      const after = baseOnAir(x.start - x.D + 1, items, grille);
      const before = baseOnAir(x.start - x.D - 1, items, grille);
      return { cur: specialItem(x), start: x.start, end: x.start + x.L, next: after && after.cur, prev: before && before.cur,
        prevStart: before ? before.start + x.D : undefined, show: null };
    }
    shift = x.D + x.L; prevB = x;
  }
  const a = baseOnAir(ms - shift, items, grille);
  if (!a) return a;
  const out = { ...a, start: a.start + shift, end: a.end + shift, prevStart: a.prevStart !== undefined ? a.prevStart + shift : undefined };
  if (prevB && out.start === prevB.start + prevB.L) { out.prev = specialItem(prevB); out.prevStart = prevB.start; }
  // le prochain créneau tombe-t-il pendant cette toune ? alors la suivante est ce créneau
  const nx = slotsBetween(ms, out.end).find(s => !list.some(x => x.slot === s.ms));
  if (nx) out.next = specialItem(nx);
  return out;
}
