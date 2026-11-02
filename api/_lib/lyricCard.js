// Carte de paroles (nov. 2026) — servie par /api/lyrics (mode « card ») : limite de 12 fonctions sur Vercel Hobby.
// Carte de paroles : pige au hasard un thème, une atmosphère, un point de vue,
// un arc et 2-3 images concrètes, selon le genre du prompt. Zéro appel IA.
// La banque (table lyric_seeds) est lue seulement ici, avec la clé service : le client ne voit
// jamais la liste complète, juste la carte pigée (recette protégée).
import { createClient } from '@supabase/supabase-js';

let CACHE = null, CACHE_AT = 0;
const TTL = 10 * 60 * 1000;

async function loadSeeds() {
  if (CACHE && Date.now() - CACHE_AT < TTL) return CACHE;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('config');
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await sb.from('lyric_seeds').select('id,kind,en,fr,families,eras').eq('active', true);
  if (error) throw error;
  CACHE = data || []; CACHE_AT = Date.now();
  return CACHE;
}

// Familles de genres reconnues dans le texte du genre (« melodic death metal » → melodic, death).
const FAMILIES = ['death','black','doom','thrash','core','deathcore','hardcore','grind','gore','power','symphonic','heavy','folk','viking','pagan',
  'prog','djent','tech','math','mathcore','industrial','cyber','nu','groove','sludge','stoner','desert','drone','funeral','post','gothic','melodic',
  'crossover','punk','beatdown','space','war','pirate'];

function familiesOf(genres) {
  const txt = (Array.isArray(genres) ? genres : [genres]).join(' ').toLowerCase();
  return FAMILIES.filter(f => txt.includes(f));
}

// Époque du prompt (« 90s », « 1996 », « 60s-70s ») → clé d'époque de la banque de vocabulaire.
function eraOf(e) {
  const t = String(e || '').toLowerCase();
  const y = parseInt((t.match(/(19|20)\d\d/) || [])[0], 10);
  if (y) return y < 1990 ? '80s' : y < 2000 ? '90s' : y < 2010 ? '2000s' : '2010s';
  if (/60|70|80/.test(t)) return '80s';
  if (/90/.test(t)) return '90s';
  if (/2000/.test(t)) return '2000s';
  if (/2010|2020/.test(t)) return '2010s';
  return '';
}

// Pige pondérée : une entrée liée au genre pèse 3, une entrée universelle (« * ») pèse 1.
// Vocabulaire d'époque : pèse 3 si l'époque correspond, exclu sinon.
function pick(rows, fams, avoid, n = 1, era = '') {
  const pool = rows.map(r => {
    const eras = r.eras || ['*'];
    if (!eras.includes('*') && !eras.includes(era)) return { r, w: 0 };
    if (!eras.includes('*')) return { r, w: 3 };
    const hit = r.families.some(f => fams.includes(f));
    const any = r.families.includes('*');
    return { r, w: hit ? 3 : any ? 1 : (fams.length ? 0 : 1) };
  }).filter(x => x.w > 0);
  const fresh = pool.filter(x => !avoid.has(x.r.id));
  const src = fresh.length >= n ? fresh : pool;
  const out = [];
  const bag = [...src];
  while (out.length < n && bag.length) {
    const tot = bag.reduce((a, x) => a + x.w, 0);
    let t = Math.random() * tot, i = 0;
    for (; i < bag.length; i++) { t -= bag[i].w; if (t <= 0) break; }
    out.push(bag.splice(Math.min(i, bag.length - 1), 1)[0].r);
  }
  return out;
}

const pub = r => r ? { id: r.id, en: r.en, fr: r.fr } : null;

export async function lyricCard(b, res) {
  b = b || {};
  let rows;
  try { rows = await loadSeeds(); } catch (e) { return res.status(500).json({ error: 'config' }); }

  const fams = familiesOf(b.genres || []);
  const era = eraOf(b.era);
  const avoid = new Set((Array.isArray(b.avoid) ? b.avoid : []).map(Number).filter(Boolean));   // anti-répétition (dernières cartes)
  const lock = b.lock || {};                                                                      // éléments que l'utilisateur garde
  const byId = id => rows.find(r => r.id === Number(id));
  const of = k => rows.filter(r => r.kind === k);

  const card = {
    theme: pub(lock.theme && byId(lock.theme) || pick(of('theme'), fams, avoid)[0]),
    atmo:  pub(lock.atmo  && byId(lock.atmo)  || pick(of('atmo'),  fams, avoid)[0]),
    pov:   pub(lock.pov   && byId(lock.pov)   || pick(of('pov'),   fams, avoid)[0]),
    arc:   pub(lock.arc   && byId(lock.arc)   || pick(of('arc'),   fams, avoid)[0]),
    images: (Array.isArray(lock.images) && lock.images.length ? lock.images.map(byId).filter(Boolean)
            : pick(of('image'), fams, avoid, 2 + Math.floor(Math.random() * 2))).map(pub),
    // Palette de vocabulaire (genre + époque) : appuie le style visé sans copier de vraies paroles
    words: pick(of('word'), fams, new Set(), 8, era).map(r => r.en),
    verbs: pick(of('verb'), fams, new Set(), 4, era).map(r => r.en),
  };
  return res.status(200).json(card);
}
