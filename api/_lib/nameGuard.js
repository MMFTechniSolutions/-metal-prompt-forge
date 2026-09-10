// ── GARDE-FOU NOMS PROPRES ──
// Un nom d'artiste dans le champ Style est contraire aux règles de Suno et expose le service.
// /api/reverse reçoit un nom de groupe en ENTRÉE ; le modèle peut renvoyer un nom de personne
// dans sa description (« phil anselmo's aggressive vocals » — cas réel, 2026-09-10).
// Ce module nettoie tout ce qui sort du reverse ET tout ce qui entre dans /api/forge.

// Marqueurs de référence à une personne ou un groupe, quelle que soit la casse.
const REF_PATTERNS = /('s|’s)\b|\b(style|styled|esque|like|alike|inspired|reminiscent|tribute|worship|homage|sounds? like|in the vein of|a la|à la|meets)\b/i;

// Tokens de noms propres les plus courants en metal (nom de famille ou pseudo suffisant).
const NAME_TOKENS = ['anselmo','dimebag','abbott','hetfield','ulrich','mustaine','hammett','halford','tipton','dickinson','harris','osbourne','iommi','butler','ward','cantrell','staley','corgan','davis','fieldy','araya','king','hanneman','schuldiner','quorthon','euronymous','vikernes','varg','ihsahn','abbath','shagrath','nergal','tarja','floor','jansen','akerfeldt','mikael','townsend','mansoor','tosin','abasi','petrucci','portnoy','labrie','rutan','vincent','keenan','maynard','patton','danzig','dio','lemmy','kilmister','cronos','fenriz','nocturno','gaahl','hoglund','stanne','bjorler','friden','stromblad','amott','tagtgren','lindberg','sanders','hoffman','digiorgio','thordendal','haake','duplantier','joe duplantier','bello','belladonna','ian','benante','cavalera','kisser','blythe','morton','adler','leach','dutkiewicz','herrera','rey','moreno','carpenter','shulman','jourgensen','reznor','manson','wharton','mcbrain','murray','smith','gers','tyler','perry','vai','malmsteen','satriani','gilbert','wylde','zakk','slash','angus','bon scott','johnson','plant','page','bonham','blackmore','gillan','lord','paice','morse','tolkki','kotipelto','kiske','hansen','weikath','schaffer','barlow','matos','andralls','kai'];

// Un item est refusé s'il porte un marqueur de référence OU contient un token de nom propre.
function looksLikeName(txt) {
  const t = String(txt || '').toLowerCase();
  if (!t) return false;
  if (REF_PATTERNS.test(t)) return true;
  return NAME_TOKENS.some(n => new RegExp('\\b' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(t));
}

// Nettoie une liste de descripteurs : retire ceux qui référencent une personne ou un groupe.
// `extra` = termes additionnels à bannir (ex. le nom de groupe tapé par l'utilisateur).
function cleanDescriptors(arr, extra = []) {
  const ex = extra.map(x => String(x || '').toLowerCase().trim()).filter(Boolean);
  return (Array.isArray(arr) ? arr : [])
    .map(x => String(x || '').trim())
    .filter(x => x && !looksLikeName(x) && !ex.some(e => x.toLowerCase().includes(e)));
}

export { looksLikeName, cleanDescriptors };
