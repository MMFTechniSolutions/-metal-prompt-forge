// /api/forge.js — Assemblage du prompt Suno côté serveur (la "recette" secrète).
// Le client envoie les sélections brutes, le serveur renvoie le prompt déjà calculé.

import { TIME_SIGNATURES_BY_STYLE } from './_lib/timeSignaturesByStyle.js';

// Mapping regex genre → clé du module temps de mesure (ordre = priorité :
// les spécifiques AVANT les génériques)
const STYLE_ID_MAP = [
  // composés spécifiques d'abord
  [/blackened.?deathcore/, 'deathcore'],
  [/blackened.?death/, 'blackened-death'],
  [/blackgaze|post.?black/, 'blackgaze'],
  [/atmospheric.?black/, 'atmospheric-black'],
  [/symphonic.?black/, 'symphonic-black'],
  [/depressive|dsbm/, 'dsbm'],
  [/melodic.?deathcore/, 'melodic-deathcore'],
  [/technical.?deathcore/, 'technical-deathcore'],
  [/tech.?death/, 'tech-death'],
  [/melodic.?death/, 'melodic-death'],
  [/brutal.?death|brutal/, 'brutal-death'],
  [/slam/, 'slam-metal'],
  [/dissonant/, 'dissonant-death'],
  [/deathgrind|goregrind/, 'deathgrind'],
  [/deathcore/, 'deathcore'],
  [/death/, 'death-metal'],
  [/black/, 'black-metal'],
  [/powerviolence/, 'powerviolence'],
  [/grind/, 'grindcore'],
  [/funeral/, 'funeral-doom'],
  [/drone/, 'drone-metal'],
  [/atmospheric.?sludge/, 'atmospheric-sludge'],
  [/sludge/, 'sludge-metal'],
  [/djent/, 'djent'],
  [/mathcore|math/, 'mathcore'],
  // variantes metalcore avant le générique
  [/melodic.?metalcore/, 'melodic-metalcore'],
  [/progressive.?metalcore/, 'progressive-metalcore'],
  [/atmospheric.?metalcore/, 'atmospheric-metalcore'],
  [/arena.?metalcore/, 'arena-metalcore'],
  [/synth.?metalcore/, 'synth-metalcore'],
  [/ambient.?metalcore/, 'ambient-metalcore'],
  [/pop.?metalcore/, 'pop-metalcore'],
  [/modern.?metalcore/, 'modern-metalcore'],
  [/electronicore/, 'electronicore'],
  [/metalcore/, 'metalcore'],
  [/progressive.?post.?hardcore/, 'progressive-post-hardcore'],
  [/post.?hardcore/, 'post-hardcore'],
  [/beatdown/, 'beatdown-hardcore'],
  [/hardcore.?punk|powerviolence/, 'hardcore-punk'],
  [/rapcore|rap.?metal/, 'rapcore'],
  [/d.?beat|crust/, 'd-beat'],
  [/punk.?rock/, 'punk-rock'],
  [/prog/, 'progressive-metal'],
  [/nu.?metal/, 'nu-metal'],
  [/industrial/, 'industrial-metal'],
  [/groove/, 'groove-metal'],
  [/stoner/, 'stoner-metal'],
  [/post.?metal/, 'post-metal'],
  [/doom/, 'doom-metal'],
  [/folk|viking|pagan|celtic/, 'folk-metal'],
  [/gothic/, 'gothic-metal'],
  [/symphonic/, 'symphonic-metal'],
  [/power/, 'power-metal'],
  [/crossover/, 'crossover-thrash'],
  [/thrash/, 'thrash-metal'],
  [/speed/, 'speed-metal'],
  [/glam|hair/, 'glam-metal'],
  [/avant|experimental/, 'avant-garde-metal'],
  [/modern.?alternative/, 'modern-alternative-metal'],
  [/alternative/, 'alternative-metal'],
  [/nwobhm/, 'nwobhm'],
  [/proto.?metal/, 'proto-metal'],
  [/blues.?rock/, 'blues-rock'],
  [/hard.?rock/, 'hard-rock'],
  [/heavy/, 'heavy-metal'],
];

export default function handler(req, res) {
  let b = req.method === 'POST' ? req.body : (req.query || {});
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  const A = k => Array.isArray(b[k]) ? b[k] : [];

  const genres = A('genres'), drums = A('drums'), vocals = A('vocals'), guitar = A('guitar');
  const tuning = A('tuning'), mood = A('mood'), prod = A('prod'), globalRhythm = A('globalRhythm'), vrange = A('vrange');
  const bassInst = [...A('bassStyle'), ...A('bassTech'), ...A('bassTone'), ...A('bassTuning'), ...A('bassProd')];
  const leadInst = [...A('sax'), ...A('brass'), ...A('keys'), ...A('strings')];   // instruments mélodiques (sax, cuivres, claviers, cordes)
  const extraInst = [...bassInst, ...leadInst];
  const allOrganic = A('org');
  const excl = b.excl || null;
  const allExclude = excl ? [...(excl.g || []), ...(excl.v || []), ...(excl.p || []), ...(excl.i || []), ...String(excl.c || '').split(',').map(s => s.trim()).filter(Boolean)] : [];
  const structs = A('structs');
  const blockRhythm = b.blockRhythm || {};
  const heavy = +b.heavy || 5, groove = +b.groove || 5, chaos = +b.chaos || 5, melody = +b.melody || 5;
  const bpm = Math.max(60, Math.min(280, +b.bpm || 180));
  const lang = b.lang || 'en';
  const L = (fr, en) => lang === 'fr' ? fr : en;

  const rFor = k => blockRhythm[k] ? ', ' + blockRhythm[k] : '';
  const tempoWord = bpm >= 210 ? 'blistering fast tempo' : bpm >= 170 ? 'fast tempo' : bpm >= 120 ? 'mid-tempo' : bpm >= 90 ? 'slow groovy tempo' : 'slow doom tempo';
  // ENCYCLOPÉDIE → calibration par genre (temps de mesure, gamme/mode, production, tuning par défaut) — secret serveur
  const _gtxt = genres.map(x => String(x).toLowerCase()).join(' ');
  const _rs = Math.random();
  const GENRE_DB = [
    [/djent/, {ts:(_rs<0.5?'7/8':'4/4'), scale:'polymetric minor-2nd and tritone riffs', prod:'surgical mix, ultra-fast noise gate, scooped 400Hz', tuning:'Drop A 8-string'}],
    [/prog|math/, {ts:(_rs<0.5?'5/4':'7/8'), scale:'odd-time modulating riffs', prod:'clean digital precision', tuning:'Drop C'}],
    [/tech.?death/, {ts:(_rs<0.5?'7/8':'4/4'), scale:'dissonant chromatic arpeggios, fretless bass', prod:'precise clean brutal mix', tuning:'C standard'}],
    [/brutal|slam/, {ts:'4/4', scale:'chromatic slam riffs near the bridge', prod:'thick brutal triggered mix', tuning:'A standard'}],
    [/melodic.?death/, {ts:'4/4', scale:'harmonized minor twin-guitar leads', prod:'polished melodic mix', tuning:'D standard'}],
    [/deathcore/, {ts:'4/4', scale:'phrygian breakdowns, slam riffs', prod:'crushing triggered mix, guitars panned 100%', tuning:'Drop A'}],
    [/death/, {ts:'4/4', scale:'phrygian dominant chromatic tremolo riffs', prod:'massive percussive mix, triggered kick', tuning:'D standard'}],
    [/symphonic.?black/, {ts:'4/4', scale:'tremolo over orchestral arrangements', prod:'cinematic orchestral mix', tuning:'standard'}],
    [/blackgaze|post.?black/, {ts:'4/4', scale:'consonant ionian and mixolydian, add9 maj7 sus2 open chords', prod:'wall of sound, infinite algorithmic reverb', tuning:'standard'}],
    [/depressive|dsbm/, {ts:'4/4', scale:'melancholic hypnotic tremolo loops', prod:'raw lo-fi reverb', tuning:'standard'}],
    [/black/, {ts:'4/4', scale:'dissonant chromatic tremolo, open chords', prod:'lo-fi abrasive, thin no-bass blizzard distortion', tuning:'standard'}],
    [/funeral/, {ts:'4/4', scale:'abyssal slow tritone', prod:'suffocating funereal mix, funeral synths', tuning:'B standard'}],
    [/drone/, {ts:'free-form drone', scale:'sustained pedal-point drone on fifths', prod:'room ambience, octave fuzz, no compression', tuning:'A standard'}],
    [/sludge/, {ts:'4/4', scale:'tritone riffs dragging behind the beat', prod:'feedback-drenched dirty saturation', tuning:'Drop B'}],
    [/stoner/, {ts:'4/4', scale:'fuzzy bluesy psychedelic riffs', prod:'fuzz-drenched warm low-mids', tuning:'Drop D'}],
    [/post.?metal/, {ts:'4/4', scale:'slow narrative I-flatVI cadence, 9th and 11th chords', prod:'dynamic clean-to-massive crescendo', tuning:'Drop C'}],
    [/epic.?doom/, {ts:'4/4', scale:'grandiose tritone epic melodies', prod:'thick warm operatic space', tuning:'C standard'}],
    [/doom/, {ts:(_rs<0.5?'6/8':'4/4'), scale:'tritone bluesy slow riffs', prod:'thick warm vintage saturation', tuning:'C standard'}],
    [/grind/, {ts:'4/4', scale:'chaotic buzzing chromatic microsong', prod:'raw chaotic blast mix', tuning:'C standard'}],
    [/folk|viking|pagan|celtic/, {ts:(_rs<0.5?'6/8':'4/4'), scale:'folk dance melodies, fiddle and tin whistle leads over riffs', prod:'organic folk-metal mix, acoustic instruments upfront', tuning:'standard'}],
    [/gothic/, {ts:'4/4', scale:'melancholic minor with dramatic strings', prod:'acoustic-to-saturated, beauty-and-the-beast vocals', tuning:'standard'}],
    [/symphonic/, {ts:'4/4', scale:'classical leitmotivs and choral ruptures', prod:'full orchestra over double kick', tuning:'standard'}],
    [/neoclassical/, {ts:'4/4', scale:'harmonic minor, diminished-7 arpeggios, sweep picking, pedal point', prod:'virtuosic baroque shred', tuning:'standard'}],
    [/power/, {ts:'4/4', scale:'harmonic minor galloping leads', prod:'bombastic, continuous double kick', tuning:'standard'}],
    [/metalcore/, {ts:'4/4', scale:'aeolian melodic riffs with breakdowns', prod:'tight mix, compressed kick/snare, guitars panned 100%', tuning:'Drop C'}],
    [/nu.?metal/, {ts:'4/4', scale:'bouncy syncopated groove', prod:'turntables, samples, industrial textures', tuning:'Drop, 7-string'}],
    [/industrial/, {ts:'4/4', scale:'rigid repetitive mechanical riffs', prod:'electronic drums, machine samples, cold synths', tuning:'Drop C'}],
    [/groove/, {ts:'4/4', scale:'syncopated chugging riffs', prod:'colossal punchy drums', tuning:'D standard'}],
    [/crossover/, {ts:'4/4', scale:'punk-thrash riffs with mosh parts', prod:'raw fast mix', tuning:'E standard'}],
    [/thrash|speed/, {ts:'4/4', scale:'fast downpicked chromatic riffs', prod:'scooped mids, punchy double kick', tuning:'E standard'}],
    [/nwobhm|heavy/, {ts:'4/4', scale:'twin-guitar harmonies in thirds', prod:'vintage tube warmth', tuning:'E standard'}],
  ];
  let _db = {}; for (const [re, v] of GENRE_DB){ if (re.test(_gtxt)){ _db = v; break; } }
  let timeSig = _db.ts || '4/4';
  if (timeSig === '4/4' && chaos >= 8 && _rs < 0.5) timeSig = _rs < 0.25 ? '7/8' : '5/4';
  const scaleTag = _db.scale || '';
  const genreProdTag = _db.prod || '';
  const autoTuning = _db.tuning || '';
  // Recommandation de modèle Suno par genre (mieux / bon / moins bon)
  let modelRec;
  if (/raw|kvlt|old.?school|grind|crust|d.?beat|war metal|primitive/.test(_gtxt))
    modelRec = { best:'v4.5', good:'v4', weak:'v5', why: L('pour le grain cru — v5 lisse trop la crasse','for raw grit — v5 over-polishes') };
  else if (/black|funeral|atmospheric|blackgaze|post-?metal|sludge|doom/.test(_gtxt))
    modelRec = { best:'v4.5', good:'v5', weak:'v4', why: L('grain + atmosphère','grit + atmosphere') };
  else if (/djent|prog|tech|symphonic|metalcore|deathcore|power|melodic|industrial/.test(_gtxt))
    modelRec = { best:'v5', good:'v4.5', weak:'v4', why: L('clarté et séparation modernes','modern clarity and separation') };
  else
    modelRec = { best:'v5', good:'v4.5', weak:'v4', why: L('qualité globale','best overall quality') };
  // Recommandation phonétique (voir /api/_lib/phoneticize.js) — validé 2026-07-04 :
  // déformer l'orthographe empêche Suno de sur-articuler les vocaux harsh.
  let phonetic = { enabled: false, intensity: null, why: null };
  if (/grind|crust|d.?beat|powerviolence|slam/.test(_gtxt))
    phonetic = { enabled: true, intensity: 'extreme', why: L('bouillie hachée — percussion vocale','chopped mush — vocals as percussion') };
  else if (/black|dsbm|depressive|funeral|war metal/.test(_gtxt))
    phonetic = { enabled: true, intensity: 'stretched', why: L('voyelles extra-longues pour shrieks tenus sur tremolo','extra-long vowels for sustained shrieks over tremolo') };
  else if (/death|brutal|sludge/.test(_gtxt))
    phonetic = { enabled: true, intensity: 'normal', why: L('growls sales, pas sur-articulés','dirty growls, not over-enunciated') };
  const dedup = arr => { const s = new Set(); return arr.filter(x => { const k = String(x).toLowerCase().trim(); if (!x || s.has(k)) return false; s.add(k); return true; }); };

  // ── sauce secrète : sliders → tags subtils, fondus dans le lot ──
  const sliderTags = [];
  if (heavy >= 8) sliderTags.push('bone-crushing low end'); else if (heavy <= 3) sliderTags.push('open and breathable mix');
  if (groove >= 7) sliderTags.push('deep pocket groove'); else if (groove <= 3) sliderTags.push('relentless forward drive');
  if (chaos >= 8) sliderTags.push('unhinged dissonance'); else if (chaos <= 2) sliderTags.push('locked-in and surgical');
  if (melody >= 7) sliderTags.push('soaring melodic lead'); else if (melody <= 2) sliderTags.push('no-frills brutality');
  const secret = sliderTags;

  // ── MOTEUR D'ÉMOTIONS (recette secrète) — 10 émotions, gated 2/4/6/10, dominance + conflits ──
  const tier = b.tier || 'free';
  const emotions = (b.emotions && typeof b.emotions === 'object') ? b.emotions : {};
  const EMO_ORDER = ['rage','melancholy','despair','triumph','coldness','defiance','dread','transcendence','madness','profanation','serenity','joy','hope','warmth','wonder','clarity','reverence','unity','grace','radiance'];
  const EMO_LIMIT = { free:2, forge:20, pro:20, elite:20, eliteplus:20 };
  const EMO = {
    rage:         { light:['aggressive energy'],            mid:['furious aggression','relentless attack'],   strong:['blind savage fury','berserk intensity','venomous rage'] },
    melancholy:   { light:['melancholic undertone'],        mid:['melancholic sorrowful melody'],              strong:['crushing sorrow','weeping melodic leads','mournful atmosphere'] },
    despair:      { light:['bleak undertone'],              mid:['hopeless and bleak'],                        strong:['suffocating despair','hopeless void','crushing emptiness'] },
    triumph:      { light:['uplifting edge'],               mid:['triumphant victorious'],                     strong:['epic triumphant glory','soaring heroic anthems','victorious grandeur'] },
    coldness:     { light:['cold atmosphere'],              mid:['icy cold frostbitten'],                      strong:['glacial frostbitten cold','kalt and lifeless','frozen desolation'] },
    defiance:     { light:['defiant tone'],                 mid:['rebellious anthemic defiance'],              strong:['fist-raising revolt anthem','uncompromising defiance','militant fury'] },
    dread:        { light:['ominous undertone'],            mid:['ominous looming horror'],                    strong:['paralyzing dread','unheimlich creeping terror','suffocating menace'] },
    transcendence:{ light:['atmospheric expanse'],          mid:['transcendent cosmic atmosphere'],            strong:['cosmic transcendence','astral vastness','ego-death euphoria'] },
    madness:      { light:['unstable edge'],                mid:['deranged unhinged'],                         strong:['psychotic madness','schizophrenic chaos','deranged frenzy'] },
    profanation:  { light:['blasphemous undertone'],        mid:['blasphemous sacrilegious'],                  strong:['blasphemous desecration','sacrilegious ritual','profane blackened ritual'] },
    // ── ÉMOTIONS LUMIÈRE (miroirs des sombres) ──
    serenity:     { light:['calm undertone'],               mid:['serene peaceful passages'],                  strong:['deep meditative serenity','weightless calm','still-water tranquility'] },
    joy:          { light:['bright uplifting edge'],        mid:['joyful energetic melody'],                   strong:['euphoric celebration','radiant joyful anthems','unbridled elation'] },
    hope:         { light:['hopeful undertone'],            mid:['hopeful rising melody'],                     strong:['soaring hopeful crescendos','light breaking through darkness','hope reborn from ashes'] },
    warmth:       { light:['warm organic tone'],            mid:['warm embracing atmosphere'],                 strong:['golden enveloping warmth','sunlit analog warmth','comforting embrace'] },
    wonder:       { light:['sense of wonder'],              mid:['wide-eyed cosmic wonder'],                   strong:['awe-struck celestial wonder','breathtaking vastness','starlit astonishment'] },
    clarity:      { light:['clear focused tone'],           mid:['lucid crystalline clarity'],                 strong:['crystal-clear transcendent focus','pristine shimmering textures','enlightened calm'] },
    reverence:    { light:['solemn reverent undertone'],    mid:['sacred ceremonial atmosphere'],              strong:['sacred choral reverence','liturgical grandeur','divine luminous ritual'] },
    unity:        { light:['anthemic togetherness'],        mid:['unifying gang-vocal brotherhood'],           strong:['arena-wide unity chants','shoulder-to-shoulder anthem','triumphant collective voice'] },
    grace:        { light:['graceful melodic touch'],       mid:['elegant flowing grace'],                     strong:['weightless ethereal grace','delicate sublime beauty','fragile tenderness'] },
    radiance:     { light:['luminous shimmer'],             mid:['radiant glowing soundscape'],                strong:['blinding radiant climax','sunburst wall of light','incandescent brilliance'] },
  };
  const EMO_LABEL = { rage:'Rage', melancholy:'Mélancolie', despair:'Désespoir', triumph:'Triomphe', coldness:'Froideur', defiance:'Défiance', dread:'Effroi', transcendence:'Transcendance', madness:'Démence', profanation:'Profanation', serenity:'Sérénité', joy:'Joie', hope:'Espoir', warmth:'Chaleur', wonder:'Émerveillement', clarity:'Clarté', reverence:'Sacré', unity:'Unité', grace:'Grâce', radiance:'Lumière' };
  const emoLimit = EMO_LIMIT[tier] != null ? EMO_LIMIT[tier] : 2;
  const emoActive = EMO_ORDER
    .map((id, i) => ({ id, i, val: Math.max(0, Math.min(100, +emotions[id] || 0)) }))
    .filter(e => e.i < emoLimit && e.val > 0)
    .sort((a, c) => c.val - a.val);
  const emoTags = [], emoLabels = [];
  emoActive.forEach((e, rank) => {
    const lvl = e.val > 70 ? 'strong' : e.val >= 40 ? 'mid' : 'light';
    const pool = (EMO[e.id] || {})[lvl] || [];
    (rank === 0 ? pool.slice(0, 2) : pool.slice(0, 1)).forEach(t => emoTags.push(t));
    emoLabels.push(EMO_LABEL[e.id] + ' ' + e.val + '%');
  });
  const emotionTags = dedup(emoTags).slice(0, 4);
  const OPP = [['triumph','despair'],['triumph','melancholy'],['transcendence','profanation'],['coldness','rage'],['rage','serenity'],['despair','hope'],['coldness','warmth'],['dread','wonder'],['madness','clarity'],['profanation','reverence'],['melancholy','joy']];
  const emoConf = [];
  OPP.forEach(([a, c]) => { if ((+emotions[a]||0) >= 60 && (+emotions[c]||0) >= 60) emoConf.push(L(EMO_LABEL[a]+' + '+EMO_LABEL[c]+' à fond se contredisent — baisse-en une.', EMO_LABEL[a]+' + '+EMO_LABEL[c]+' both high — they fight, lower one.')); });

  // Temps de mesure → DESCRIPTEURS TEXTUELS (validé : Suno ignore les chiffres
  // seuls comme instruction; les descripteurs marchent, les chiffres en hint
  // teintent le feel). Le timeSig numérique reste pour l'affichage UI.
  let rhythmTags = [], rhythmStructTags = [];
  const _sid = (STYLE_ID_MAP.find(([re]) => re.test(_gtxt)) || [])[1];
  if (_sid && TIME_SIGNATURES_BY_STYLE[_sid]) {
    const _s = TIME_SIGNATURES_BY_STYLE[_sid].suno;
    rhythmTags = [...(_s.styleTags || []).slice(0, 2), ...(_s.meterHints || []).slice(0, 1)];
    rhythmStructTags = (_s.structureTags || []).slice(0, 2);
  }

  const bpmTag = bpm + ' BPM';
  // Vocal en premier (validé 2026-07-04) : Suno pèse plus fort le début du
  // Style — pour les vocaux harsh, les consignes vocales OUVRENT le prompt.
  // dedup garde la première occurrence, donc pas de doublon plus loin.
  const _vTxt0 = vocals.map(x => String(x).toLowerCase()).join(' ');
  const harshVox = /growl|scream|guttural|shriek|harsh|pig squeal|fry|roar|rasp/.test(_vTxt0) || phonetic.enabled;
  const voxLead = harshVox ? [...vocals.slice(0, 3), ...vrange.slice(0, 1)] : [];
  // rhythmTags injectés tôt (priorité recette) — le budget coupe la fin, pas eux
  const fullTagsRaw = dedup([...voxLead, ...genres, bpmTag, tempoWord, ...rhythmTags, ...drums, ...guitar.slice(0, 3), ...leadInst.slice(0, 3), ...bassInst.slice(0, 2), ...(tuning.length?tuning.slice(0,1):(autoTuning?[autoTuning]:[])), ...vocals.slice(0, 3), ...vrange.slice(0, 2), ...mood.slice(0, 3), ...(scaleTag?[scaleTag]:[]), ...secret, ...emotionTags, ...(genreProdTag?[genreProdTag]:[]), ...prod.slice(0, 2), ...allOrganic.slice(0, 4), ...globalRhythm]);
  // Budget : au-delà de ~480 car., Suno dilue/ignore — on coupe par la fin
  const STYLE_BUDGET = 480;
  const fullTags = [...fullTagsRaw];
  while (fullTags.length > 8 && fullTags.join(', ').length > STYLE_BUDGET) fullTags.pop();
  const compactCore = dedup([...voxLead.slice(0, 2), ...genres.slice(0, 2), bpmTag, tempoWord, ...secret, ...emotionTags.slice(0,1), ...drums.slice(0, 2), ...guitar.slice(0, 1), ...leadInst.slice(0, 1), ...vocals.slice(0, 1), ...mood.slice(0, 1), ...rhythmTags.slice(0, 1)]);
  const overflow = fullTags.filter(x => !compactCore.includes(x));
  // ── PROMPT "RICHE" (tournure fluide groupée par « ; », optimisée Suno v4.5+) ──
  // Genre-fusion ; dynamiques/structure ; voix ; instruments/riffs ; accordage+tonalités ; mood+émotions ; tempo/changements
  const _lc = x => String(x).toLowerCase();
  const _gl = dedup(genres.map(x => String(x).trim())).filter(Boolean);
  const genreClause = _gl.length >= 2 ? (_gl[0] + ' meets ' + _gl.slice(1, 3).join(' and ')) : (_gl[0] || 'metal');

  const _hasAtmos = melody >= 6 || structs.some(s => /atmospheric|interlude|intro|clean/.test(s)) || allOrganic.some(o => /acoustic|clean|ambient/.test(_lc(o)));
  const _hasHeavy = heavy >= 6 || drums.some(d => /blast|double/.test(_lc(d))) || structs.some(s => /breakdown|blast|drop|halftime/.test(s));
  let dynamicsClause = '';
  if (_hasHeavy && _hasAtmos) dynamicsClause = 'dynamic long-form song shifting between crushing heavy sections and mellow atmospheric passages';
  else if (_hasHeavy) dynamicsClause = heavy >= 8 ? 'relentless crushing intensity' : 'heavy driving momentum';
  else if (_hasAtmos) dynamicsClause = 'atmospheric, dynamic and evolving';

  const _hasClean = /clean|melodic sing|baritone|choir|spoken|croon/.test(_vTxt0);
  let vocalsClause = '';
  if (vocals.length) {
    if (harshVox && _hasClean) {
      const _h = dedup(vocals.filter(v => /growl|scream|guttural|shriek|harsh|rasp|roar|squeal/.test(_lc(v)))).slice(0, 2);
      const _c = dedup(vocals.filter(v => /clean|melodic|baritone|choir|spoken|croon/.test(_lc(v)))).slice(0, 2);
      vocalsClause = (_h.join(', ') || 'harsh vocals') + ' alternating with ' + (_c.join(', ') || 'clean vocals');
    } else vocalsClause = dedup([...vocals.slice(0, 3), ...vrange.slice(0, 1)]).join(', ');
  } else if (harshVox) vocalsClause = 'aggressive harsh vocals';

  const instrumentsClause = dedup([...guitar.slice(0, 2), (scaleTag || ''), ...drums.slice(0, 2), ...leadInst.slice(0, 3), ...bassInst.slice(0, 1)].filter(Boolean)).join(', ');

  const _tun = tuning[0] || autoTuning || '';
  // Modes → DESCRIPTIF (Suno lit mal les noms de modes ; le descriptif marche mieux — cf. guide God Mode)
  const MODE_DESC = { 'phrygian dominant':'dark exotic Middle-Eastern flavor', 'phrygian':'dark Spanish flamenco tension', 'harmonic minor':'neoclassical dramatic minor', 'melodic minor':'sophisticated jazzy minor', 'dorian':'jazzy soulful minor', 'aeolian':'natural melancholic minor', 'locrian':'unstable dissonant tension', 'lydian':'dreamy floating bright', 'mixolydian':'bluesy dominant groove', 'ionian':'bright major', 'minor':'dark minor' };
  const _found = String(scaleTag).match(/phrygian dominant|harmonic minor|melodic minor|phrygian|dorian|aeolian|mixolydian|ionian|locrian|lydian|minor/g) || [];
  const _uniqModes = [...new Set(_found)].slice(0, 2);
  const _tonality = _uniqModes.length ? _uniqModes.map(m => MODE_DESC[m] || m).join(', ') : '';
  const tuningToneClause = dedup([_tun, _tonality].filter(Boolean)).join(', ');

  const moodClause = dedup([...mood.slice(0, 3), ...emotionTags]).join(', ');

  const _rhythmDyn = [];
  if (chaos >= 6 || /prog|math|djent|tech|post/.test(_gtxt)) _rhythmDyn.push('frequent time-signature changes');
  _rhythmDyn.push('soft-to-heavy builds and sudden drops');
  const rhythmDynClause = dedup([bpmTag, tempoWord, ...rhythmTags.slice(0, 1), ..._rhythmDyn]).join(', ');

  const richClauses = [genreClause, dynamicsClause, vocalsClause, instrumentsClause, tuningToneClause, moodClause, ...secret.slice(0, 1), rhythmDynClause].filter(x => x && String(x).trim());
  const RICH_BUDGET = 1000;   // v4.5+ tolère ~1000 car. ; on coupe des clauses par la fin si trop long (jamais le genre/mood)
  let styleStr = richClauses.join('; ');
  while (richClauses.length > 4 && styleStr.length > RICH_BUDGET) { richClauses.splice(richClauses.length - 2, 1); styleStr = richClauses.join('; '); }
  const styleStrC = compactCore.join(', ');   // version compacte inchangée (fallback court)
  // T11 — prompts secondaires : COVER (sous-genre dominant) + EXTEND (callback cohérent)
  const _g1 = genres[0] || 'metal';
  const _g2 = genres[1] || null;
  const FUSIONS = [
    [/black/,/death/,'blackened death metal'],[/death/,/doom/,'death-doom'],[/death/,/(core|metalcore)/,'deathcore'],
    [/melodic/,/death/,'melodic death metal'],[/doom/,/(sludge|punk|hardcore)/,'sludge metal'],[/black/,/(shoegaze|post|gaze)/,'blackgaze'],
    [/death/,/grind/,'deathgrind'],[/thrash/,/(punk|hardcore|crossover)/,'crossover thrash'],[/symphonic/,/black/,'symphonic black metal'],
    [/power/,/symphonic/,'symphonic power metal'],[/metalcore/,/(djent|prog)/,'progressive metalcore'],[/doom/,/death/,'death-doom'],
  ];
  let fusionName = null;
  if (_g2){ const _a=String(_g1).toLowerCase(), _b=String(_g2).toLowerCase(); for (const [r1,r2,nm] of FUSIONS){ if ((r1.test(_a)&&r2.test(_b))||(r1.test(_b)&&r2.test(_a))){ fusionName=nm; break; } } }
  const coverCore = fusionName
    ? dedup([fusionName, bpmTag, tempoWord, ...secret, ...emotionTags.slice(0,1), ...vocals.slice(0,1), ...mood.slice(0,1), ...leadInst.slice(0,1)])
    : _g2
      ? dedup([_g2, _g1, bpmTag, tempoWord, ...secret, ...emotionTags.slice(0,1), ...vocals.slice(0,1), ...mood.slice(0,1), ...leadInst.slice(0,1)])
      : dedup([_g1, 'heavier and more extreme', bpmTag, tempoWord, ...secret, ...emotionTags.slice(0,1), ...vocals.slice(0,1), ...leadInst.slice(0,1)]);
  const coverStr = coverCore.join(', ');
  const _climax = chaos >= 7 ? 'blast beat outro' : groove >= 7 ? 'crushing breakdown climax' : melody >= 7 ? 'melodic guitar solo climax' : 'final breakdown';
  const extendStr = 'continue with the same vibe and energy, keep ' + bpmTag + ' and ' + _g1 + (leadInst.length ? ', keep the ' + leadInst[0] : '') + ', stay consistent in tempo and instrumentation, build into a ' + _climax;

  // ── détecteur de conflits ──
  const lc = x => String(x).toLowerCase();
  const vTxt = vocals.map(lc).join(' ');
  const conf = [];
  if (/clean|melodic sing|clean sing/.test(vTxt) && /growl|scream|guttural|pig squeal|shriek|harsh/.test(vTxt)) conf.push(L('Voix claires + voix extrêmes ensemble — Suno peut hésiter.', 'Clean + extreme vocals together — Suno may waver.'));
  if (bpm < 110 && drums.some(d => /blast/.test(lc(d)))) conf.push(L('Blast beats avec un BPM bas — monte le tempo pour rester cohérent.', 'Blast beats with a low BPM — raise the tempo to stay consistent.'));
  if (allOrganic.some(o => /imperfect|loose|human|drift|drunk/.test(lc(o)))) conf.push(L('Tag organique de timing lâche actif — enlève-le si tu veux un BPM serré.', 'Loose-timing organic tag active — remove it for a tight BPM.'));
  if (genres.length > 2) conf.push(L(genres.length + ' genres sélectionnés — garde 1-2 max, sinon Suno se mélange.', genres.length + ' genres selected — keep 1-2 max or Suno gets confused.'));
  if ((guitar.length + extraInst.length) > 4) conf.push(L('Beaucoup d\'instruments — Suno gère mieux 3-4 max.', 'Many instruments — Suno handles 3-4 best.'));

  conf.push(...emoConf);
  // #8/T12 — Exclude AUTO CONTEXTUEL : exclut le non-metal SAUF ce que le genre choisi utilise
  const NON_METAL = ['pop','EDM','dance pop','synthpop','autotune','happy upbeat','country','reggaeton','disco','jazz','R&B','soul ballad','acoustic pop','lo-fi beats','easy listening','elevator music','kids music','cheerful'];
  const ALLOW = [
    {re:/symphonic|orchestral|epic/, keep:['orchestral','strings','choir','classical']},
    {re:/folk|pagan|viking|celtic/, keep:['flute','acoustic','folk','violin','accordion']},
    {re:/avant|jazz|experimental|prog|fusion/, keep:['jazz','saxophone','clean','classical']},
    {re:/gothic|doom|funeral/, keep:['piano','organ','strings','clean']},
    {re:/industrial|cyber|electronic/, keep:['edm','electronic','synth','synthpop']},
    {re:/rap|nu.?metal/, keep:['hip hop','trap','rap']},
  ];
  const keep = new Set();
  ALLOW.forEach(m => { if (m.re.test(_gtxt)) m.keep.forEach(k => keep.add(k.toLowerCase())); });
  const baseExcl = /rap|nu.?metal/.test(_gtxt) ? NON_METAL : [...NON_METAL, 'hip hop beat', 'trap beat'];
  const autoExcl = baseExcl.filter(x => ![...keep].some(k => x.toLowerCase().includes(k)));
  const excStr = dedup([...allExclude, ...autoExcl]).join(', ');

  // Description courte en anglais par section -> Suno la lit comme instruction (entre crochets)
  const NAME = { intro: 'Intro', buildup: 'Build-up', verse: 'Verse', prechorus: 'Pre-Chorus', chorus: 'Chorus', breakdown: 'Breakdown', halftime: 'Half-Time', blastsection: 'Blast Section', drop: 'Drop', solo: 'Guitar Solo', interlude: 'Interlude', atmosphericbreak: 'Atmospheric Break', spokenword: 'Spoken Word', gangchant: 'Gang Chant', scream: 'Scream Section', riffbreak: 'Riff Break', bridge: 'Bridge', outro: 'Outro' };
  const DESC = {
    intro: drums.includes('blast beats') ? 'blast beat fury' : 'crushing riff',
    buildup: (heavy >= 8 ? 'wall of distortion' : 'layered build') + ', no vocals',
    verse: (vocals.includes('pig squeals') ? 'pig squeal + ' : '') + 'growls over ' + (guitar.includes('chugging riffs') ? 'chugging riffs' : 'heavy riffs'),
    prechorus: 'rising tension',
    chorus: groove >= 6 ? 'groovy headbang riff' : 'full assault',
    breakdown: groove >= 7 ? 'slow groove, gang shouts' : 'brutal mosh',
    halftime: 'half-time feel, heavy palm mutes',
    blastsection: 'pure blast beats',
    drop: 'silence then devastating riff',
    solo: guitar.includes('sweep picking solos') ? 'sweep-picking shred' : 'lead riff',
    interlude: 'instrumental',
    atmosphericbreak: chaos >= 7 ? 'dissonant, eerie' : 'calm',
    spokenword: 'spoken vocals only',
    gangchant: 'gang chant',
    scream: 'raw scream',
    riffbreak: 'guitars only',
    bridge: chaos >= 7 ? 'chaotic' : 'atmospheric',
    outro: chaos >= 7 ? 'blast frenzy' : 'final breakdown',
  };
  const blockTag = k => '[' + NAME[k] + ', ' + DESC[k] + rFor(k) + ']';
  const blocksClean = structs.map(x => NAME[x] ? blockTag(x) : '').filter(Boolean);
  const structStr = ['[' + bpmTag + ', ' + timeSig + ']', ...blocksClean].join('\n');
  const overflowLine = overflow.length ? '[' + overflow.join(', ') + ']' : '';
  const structStrC = ['[' + bpmTag + ', ' + timeSig + ']', overflowLine, ...blocksClean].filter(Boolean).join('\n');
  const structNotesTxt = ''; // notes par section maintenant DANS la structure (entre crochets)

  const heavyD = heavy >= 8 ? 'extremely heavy and crushing' : heavy >= 5 ? 'heavy and punishing' : 'moderately heavy';
  const grooveD = groove >= 8 ? 'deeply groovy' : groove >= 5 ? 'mid-paced groovy' : 'straight aggressive';
  const chaosD = chaos >= 8 ? 'chaotic and unpredictable' : chaos >= 5 ? 'controlled chaos' : 'tight and structured';
  const melodyD = melody >= 7 ? 'rich melodic leads' : melody >= 4 ? 'sparse melodic accents' : 'pure brutality';

  const excludeBlock = excStr ? '\n\nEXCLUDE: ' + excStr.split(', ').map(x => '-' + x).join(', ') : '';
  const organicBlock = allOrganic.length > 0 ? '\nOrganic: ' + allOrganic.join(', ') : '';
  const full = '=== STYLE TAGS (-> Style of Music) ===\n' + styleStr + excludeBlock +
    '\n\n=== STRUCTURE (-> top of Lyrics) ===\n' + structStr +
    '\n\n=== PRODUCTION NOTES (keep for yourself) ===\n' + heavyD + '. ' + grooveD + '. ' + chaosD + '. ' + melodyD + '. ' + bpmTag + '.' + organicBlock;

  return res.status(200).json({ styleStr, styleStrC, structStr, structStrC, structNotes: structNotesTxt, excludeStr: excStr, conflicts: conf, emotionsActive: emoLabels, coverStr, extendStr, timeSig, modelRec, phonetic, rhythmStructTags });
}
