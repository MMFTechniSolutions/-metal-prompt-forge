// =====================================================================
// PHONETICIZE — MetalPrompt Forge
// /api/_lib/ (recette secrète — JAMAIS dans le frontend)
//
// Déforme l'orthographe des paroles pour empêcher Suno de sur-articuler
// les vocaux harsh. Validé 2026-07-04 (v4.5, Weirdness ~75, avec
// "unintelligible guttural vocals, no clear enunciation" dans le Style).
//
// Intensités (voir PHONETIC_VOCALS dans timeSignaturesByStyle.js) :
//   normal    → death, deathcore, tech-death, sludge
//   extreme   → grindcore (bouillie hachée, fragments)
//   stretched → black, atmospheric black, blackgaze (voyelles extra-longues)
//
// Règles :
//   - Les lignes de structure tags [ ... ] ne sont JAMAIS touchées
//   - Le nombre de syllabes reste stable (le rythme de la toune tient)
//   - Déterministe : même input = même output (seed simple par ligne)
// =====================================================================

const WORD_SUBS = {
  the: "thu", of: "uv", and: "an", was: "wuz", is: "iz",
  i: "ah", your: "yer", you: "yu", to: "tu", into: "intu",
  never: "nevr", ever: "evr", all: "aall", now: "nah",
  what: "wut", when: "wen", where: "wer", they: "thay",
  from: "frum", upon: "upaahn", beneath: "beneeth",
  choir: "kwyer", blood: "bluud", work: "wurrk", obey: "obeyy",
};

const INTENSITY = {
  normal:    { stretchMin: 2, stretchMax: 3, wordRate: 0.45, dropFinals: true },
  extreme:   { stretchMin: 3, stretchMax: 5, wordRate: 0.75, dropFinals: true },
  stretched: { stretchMin: 5, stretchMax: 8, wordRate: 0.55, dropFinals: true },
};

function seededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

// Étire le bon groupe de voyelles : fall → faaall, stone → stooone
// e muet final (stone, burned, waves) → étirer le groupe précédent;
// jamais étirer un y initial (yer → yeeer, pas yyyer).
function stretchVowels(word, repeat) {
  const groups = [...word.matchAll(/[aeiouy]+/gi)];
  if (!groups.length) return word;

  let gi = groups.length - 1;
  const last = groups[gi];
  const afterLast = word.slice(last.index + last[0].length);
  if (gi > 0 && last[0].toLowerCase() === "e" && /^(d|s|)$/i.test(afterLast)) {
    gi -= 1;
  }

  const g = groups[gi];
  let vowels = g[0];
  let idx = g.index;
  if (vowels[0].toLowerCase() === "y" && idx === 0 && vowels.length > 1) {
    idx += 1;
    vowels = vowels.slice(1);
  }

  const ch = vowels[0];
  return (
    word.slice(0, idx) + ch.repeat(repeat + 1) + vowels.slice(1) +
    word.slice(idx + vowels.length)
  );
}

function dropFinalConsonant(word, rng) {
  if (word.length < 4 || rng() > 0.3) return word;
  if (/[dgt]$/i.test(word)) return word.slice(0, -1) + "'";
  return word;
}

function deformWord(word, params, rng) {
  const m = word.match(/^([^a-zA-Z']*)([a-zA-Z']+)([^a-zA-Z']*)$/);
  if (!m) return word;
  const [, pre, core, post] = m;
  const lower = core.toLowerCase();

  let out = WORD_SUBS[lower] ?? core;

  if (rng() < params.wordRate && out.length > 2) {
    const repeat = params.stretchMin +
      Math.floor(rng() * (params.stretchMax - params.stretchMin + 1));
    out = stretchVowels(out, repeat);
  }
  if (params.dropFinals) out = dropFinalConsonant(out, rng);

  if (core === core.toUpperCase() && core.length > 1) out = out.toUpperCase();
  else if (core[0] === core[0].toUpperCase())
    out = out[0].toUpperCase() + out.slice(1);

  return pre + out + post;
}

/**
 * Déforme des paroles pour vocaux harsh.
 * @param {string} lyrics - paroles complètes (avec structure tags)
 * @param {"normal"|"extreme"|"stretched"} intensity
 * @returns {string} paroles phonétisées, structure tags intacts
 */
export function phoneticize(lyrics, intensity = "normal") {
  const params = INTENSITY[intensity] ?? INTENSITY.normal;

  return lyrics
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        return line;
      }
      const rng = seededRandom(trimmed + intensity);
      return line
        .split(/(\s+)/)
        .map((tok) => (/\S/.test(tok) ? deformWord(tok, params, rng) : tok))
        .join("");
    })
    .join("\n");
}

/**
 * Phonétise seulement si le style le demande + toggle user actif.
 */
export function phoneticizeForStyle(lyrics, styleId, phoneticConfig, userToggle = true) {
  const conf = phoneticConfig[styleId];
  if (!userToggle || !conf?.enabled) return lyrics;
  return phoneticize(lyrics, conf.intensity);
}
