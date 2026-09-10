// /api/forge.js — Assemblage du prompt Suno côté serveur (la "recette" secrète).
// Le client envoie les sélections brutes, le serveur renvoie le prompt déjà calculé.

import { TIME_SIGNATURES_BY_STYLE } from './_lib/timeSignaturesByStyle.js';
import { cleanDescriptors } from './_lib/nameGuard.js';

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
  // ── MÉTRIQUES MIXTES (validé par François 2026-09-06 : une séquence de mesures EN TÊTE du Style teinte tout le morceau) ──
  // Table : chiffrage → découpage type (metal & jazz fusion)
  // Texte nu, sans parenthèses : non documentées dans le champ Style, et le test manuel donne mieux sans.
  const METERS = {
    '3/4':'3/4 (waltz feel)', '4/4':'4/4 (2+2)', '6/8':'6/8 (3+3 triplet feel)', '12/8':'12/8 (heavy shuffle)',
    '5/4':'5/4 (3+2)', '5/8':'5/8 (3+2 stabs)', '7/4':'7/4 (4+3 floating)', '7/8':'7/8 (2+2+3)',
    '9/8':'9/8 (2+2+2+3 balkan)', '11/8':'11/8 (3+3+3+2)', '13/8':'13/8 (2+3 cells)', '15/8':'15/8 (2+3 cells)',
  };
  const _joinMeters = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const meters = A('meters').map(x => String(x).trim()).filter(x => METERS[x]).slice(0, 5);
  // ── SÉQUENCE AUTO PAR GENRE ──
  // Tirets, pas de virgules ni de parenthèses : la séquence reste UN item pondéré que Suno lit
  // comme une progression (avec des virgules il en choisirait un seul). Validé par François.
  // Seuls les genres qui utilisent VRAIMENT des mesures impaires en ont une — un thrash reste en 4/4.
  const METER_SEQ = {
    'progressive-metal':   ['7/8','4/4','5/4','9/8'],
    'progressive-metalcore':['7/8','4/4','5/4'],
    'progressive-post-hardcore':['7/8','4/4','6/8'],
    'mathcore':            ['11/8','4/4','7/8','5/8'],
    'djent':               ['4/4','7/8','11/8'],
    'tech-death':          ['7/8','4/4','5/8','9/8'],
    'dissonant-death':     ['5/4','7/8','4/4'],
    'avant-garde-metal':   ['5/4','7/8','13/8','4/4'],
    'post-metal':          ['4/4','6/8','7/4'],
    'atmospheric-sludge':  ['4/4','6/8','12/8'],
    'sludge-metal':        ['4/4','6/8','12/8'],
    'doom-metal':          ['12/8','6/8','4/4'],
    'epic-doom':           ['12/8','6/8','4/4'],
    'funeral-doom':        ['12/8','6/8','4/4'],
    'drone-metal':         ['12/8'],
    'folk-metal':          ['6/8','4/4','12/8'],
    'gothic-metal':        ['6/8','4/4'],
    'symphonic-metal':     ['4/4','6/8','3/4'],
    'neoclassical':        ['4/4','6/8','3/4'],
    'atmospheric-black':   ['4/4','6/8'],
    'blackgaze':           ['4/4','6/8'],
    'jazz-fusion':         ['7/4','5/4','9/8','4/4'],
  };
  const _gtxtEarly = genres.map(x => String(x).toLowerCase()).join(' ');
  const _sidEarly = (STYLE_ID_MAP.find(([re]) => re.test(_gtxtEarly)) || [])[1];
  const _autoSeq = (!meters.length && _sidEarly && METER_SEQ[_sidEarly]) ? METER_SEQ[_sidEarly] : null;
  const _mList = meters.length ? meters : (_autoSeq || []);
  // Formulation calquée sur la réécriture de Suno lui-même : « in alternating 7/8 (2+2+3) and 5/4 (3+2) »
  const meterLead = _mList.length >= 2 ? 'in alternating ' + _joinMeters(_mList.map(m => METERS[m]).filter(Boolean))
                  : _mList.length === 1 ? 'in ' + METERS[_mList[0]]
                  : '';
  const meterAuto = !!_autoSeq;
  // Défense en profondeur : le client peut renvoyer une signature d'une session précédente.
  let signature = cleanDescriptors(A('signature').map(x => String(x).trim())).slice(0, 4);
  // ── SIGNATURES PAR SOUS-GENRE ──
  // Calibrées sur ce que font réellement les groupes de référence de chaque style, mais écrites
  // en pure description sonore : AUCUN nom de groupe ne sort jamais d'ici (règle Suno, et de toute
  // façon il les rejette). Sert quand l'utilisateur coche un genre au lieu de passer par /api/reverse,
  // qui lui fournit déjà une signature. Une signature venue du reverse a toujours priorité.
  const GENRE_SIGNATURE = {
    'deathcore':            ['open-note breakdowns with bass drops', 'pig squeal and low false-chord alternation', 'triggered click kick'],
    'melodic-deathcore':    ['harmonized minor leads over breakdowns', 'clean-to-growl chorus lift', 'triggered click kick'],
    'technical-deathcore':  ['sweep-picked arpeggio runs between chugs', 'off-grid syncopated breakdowns'],
    'death-metal':          ['tremolo-picked chromatic riffing', 'low false-chord growls', 'blast beats with ride bell'],
    'melodic-death':        ['twin-guitar harmonies in thirds', 'mid-range rasp over melodic riffing', 'd-beat into blast transitions'],
    'tech-death':           ['fretless bass fills upfront in the mix', 'dissonant arpeggio sweeps', 'hyperspeed gravity blasts'],
    'brutal-death':         ['slam riffs at the bridge pickup', 'inhaled tunnel-throat gutturals', 'snare-heavy triggered blasts'],
    'slam-metal':           ['half-time slam breakdowns', 'inhaled gutturals', 'pinch-harmonic squeals on the low string'],
    'dissonant-death':      ['atonal chord voicings sliding out of tune', 'cavernous reverb on everything', 'unresolved tritone stacks'],
    'black-metal':          ['tremolo picking over blast beats', 'thin trebly guitar with no low end', 'shrieked rasps buried in the mix'],
    'atmospheric-black':    ['tremolo wall of guitars under long reverb', 'distant buried shrieks', 'slow crescendo over blast beats'],
    'symphonic-black':      ['orchestral strings doubling the tremolo line', 'theatrical shrieks', 'choir pad under blast beats'],
    'dsbm':                 ['hypnotic repeating tremolo loop', 'raw lo-fi tape hiss', 'anguished distant screams'],
    'blackgaze':            ['shoegaze reverb over tremolo picking', 'major-key open chords with add9', 'buried screams under the guitars'],
    'thrash-metal':         ['fast downpicked palm-muted riffing', 'gallop rhythms', 'shouted mid-range vocals', 'scooped-mid guitar tone'],
    'crossover-thrash':     ['punk d-beat under thrash riffing', 'gang shout choruses', 'mosh-call breakdowns'],
    'heavy-metal':          ['twin-guitar harmonies in thirds', 'gallop rhythm on the low string', 'soaring clean high vocals'],
    'nwobhm':               ['twin-guitar harmony leads', 'gallop rhythms', 'vintage tube amp break-up'],
    'power-metal':          ['continuous double kick under harmonized leads', 'soaring high clean vocals', 'anthemic layered choruses'],
    'metalcore':            ['aeolian melodic riff into open-note breakdown', 'harsh verse to clean sung chorus', 'guitars panned hard'],
    'melodic-metalcore':    ['harmonized octave leads over chugs', 'harsh-to-clean chorus lift', 'crushed parallel drum compression'],
    'progressive-metalcore':['ambient clean guitar over odd-time chugs', 'harsh verse to soaring clean chorus', 'polyrhythmic breakdowns'],
    'djent':                ['8-string palm-muted polymetric chugs', 'ultra-tight noise gate between notes', 'ambient clean lead over the groove'],
    'progressive-metal':    ['odd-time riff cycles resolving on 4/4', 'clean-to-distorted dynamic shifts', 'lead bass counter-melody'],
    'mathcore':             ['abrupt start-stop riff cuts', 'atonal dissonant chord stabs', 'panic-chord screams'],
    'groove-metal':         ['syncopated mid-tempo chugging', 'pinch harmonics on the accents', 'American pentatonic blues-rock shred solos', 'colossal punchy snare'],
    'nu-metal':             ['bouncy down-tuned 7-string riffing', 'sung-to-screamed vocal switching', 'turntable scratches and samples'],
    'industrial-metal':     ['mechanical programmed drum loops', 'processed robotic vocal layer', 'cold synth pad under the riff'],
    'doom-metal':           ['slow tritone riffing dragging behind the beat', 'vintage fuzz tone', 'mournful clean vocals'],
    'epic-doom':            ['grandiose slow riffing', 'operatic clean vocals', 'thick warm vintage saturation'],
    'funeral-doom':         ['glacially slow chords with long decay', 'funeral organ pad', 'subterranean growls'],
    'sludge-metal':         ['feedback-drenched slow riffing', 'shrieked raw vocals', 'dirty saturated bass'],
    'stoner-metal':         ['fuzzed-out bluesy riffing', 'warm analog low-mids', 'laid-back behind-the-beat drums'],
    'post-metal':           ['long crescendo from clean arpeggios to wall of distortion', 'sparse distant vocals', 'ride-heavy dynamic drumming'],
    'folk-metal':           ['fiddle and tin whistle doubling the riff', 'gang chant choruses', 'stomping 6/8 dance rhythm'],
    'gothic-metal':         ['female clean and male growl trading lines', 'church organ pad', 'melancholic minor string arrangement'],
    'symphonic-metal':      ['full orchestra doubling the guitars', 'operatic soprano lead', 'choir on the chorus'],
    'grindcore':            ['sub-minute song bursts', 'alternating shrieks and gutturals', 'raw blown-out blast beats'],
    'hardcore-punk':        ['two-step d-beat drive', 'shouted gang vocals', 'raw live-room production'],
    'beatdown-hardcore':    ['half-time stomp breakdowns', 'shouted tough-guy vocals', 'floor-tom heavy drumming'],
    'post-hardcore':        ['clean-to-screamed dynamic shifts', 'delay-drenched clean guitar', 'melodic bass carrying the verse'],
  };
  if (!signature.length && _sidEarly && GENRE_SIGNATURE[_sidEarly]) signature = GENRE_SIGNATURE[_sidEarly].slice(0, 3);

  // ── INFLUENCES HISTORIQUES PAR SOUS-GENRE ──
  // C'est le MÉLANGE qui fait qu'un morceau « sonne comme » quelque chose, pas le sous-genre seul :
  // le groove metal sans ses racines glam et southern rock reste générique. Suno fait déjà ça
  // spontanément (« thrash metal with groove-metal and southern-rock inflections » dans sa réécriture).
  // Ce sont des GENRES, jamais des noms de groupes. Appliqué seulement si un seul genre est coché.
  const GENRE_BLEND = {
    'groove-metal':        ['glam metal', 'southern rock'],
    'thrash-metal':        ['hardcore punk', 'NWOBHM'],
    'crossover-thrash':    ['hardcore punk'],
    'speed-metal':         ['NWOBHM'],
    'death-metal':         ['thrash metal'],
    'melodic-death':       ['NWOBHM','swedish death metal'],
    'tech-death':          ['jazz fusion'],
    'brutal-death':        ['hardcore punk'],
    'deathcore':           ['beatdown hardcore', 'death metal'],
    'melodic-deathcore':   ['melodic death metal'],
    'black-metal':         ['punk rock'],
    'atmospheric-black':   ['post-rock'],
    'blackgaze':           ['shoegaze'],
    'symphonic-black':     ['film score orchestration'],
    'dsbm':                ['post-punk'],
    'metalcore':           ['melodic death metal', 'hardcore punk'],
    'melodic-metalcore':   ['melodic death metal'],
    'progressive-metalcore':['post-rock'],
    'djent':               ['progressive rock', 'jazz fusion'],
    'progressive-metal':   ['70s progressive rock'],
    'mathcore':            ['hardcore punk', 'free jazz'],
    'nu-metal':            ['hip hop', 'funk'],
    'rapcore':             ['hip hop'],
    'industrial-metal':    ['EBM', 'electronic body music'],
    'doom-metal':          ['blues rock'],
    'epic-doom':           ['NWOBHM'],
    'funeral-doom':        ['dark ambient'],
    'stoner-metal':        ['70s psychedelic blues rock'],
    'sludge-metal':        ['hardcore punk', 'doom metal'],
    'atmospheric-sludge':  ['post-rock'],
    'post-metal':          ['post-rock'],
    'folk-metal':          ['traditional folk'],
    'gothic-metal':        ['gothic rock', 'darkwave'],
    'symphonic-metal':     ['classical orchestration','gothic metal'],
    'power-metal':         ['NWOBHM', 'neoclassical'],
    'neoclassical':        ['baroque classical'],
    'grindcore':           ['hardcore punk','crust punk'],
    'deathgrind':          ['crust punk'],
    'powerviolence':       ['hardcore punk'],
    'hardcore-punk':       ['punk rock'],
    'beatdown-hardcore':   ['groove metal'],
    'post-hardcore':       ['emo'],
    'heavy-metal':         ['blues rock','psychedelic rock'],
    'glam-metal':          ['glam rock','pop metal'],
    'alternative-metal':   ['grunge'],
    'avant-garde-metal':   ['free jazz', 'contemporary classical'],
    'drone-metal':         ['dark ambient'],
  };
  // L'ÉPOQUE change le mélange, pas juste la production : le groove metal de 1990 garde des leads
  // glam et power metal, celui de 2005 est passé au hardcore et à l'industriel. Même genre, autre son.
  const BLEND_BY_ERA = {
    'groove-metal':   { '80s':['glam metal','power metal'], '90s':['glam metal','southern rock'], '2000s':['new wave of american metal','metalcore'], '2010s':['new wave of american metal','djent'], '2020s':['metalcore','djent'] },
    'thrash-metal':   { '80s':['NWOBHM','hardcore punk'], '90s':['groove metal'], '2000s':['new wave of american metal'], '2010s':['crossover thrash'], '2020s':['crossover thrash'] },
    'heavy-metal':    { '60s-70s':['blues rock','psychedelic rock'], '80s':['NWOBHM','glam metal'] },
    'nwobhm':         { '80s':['punk rock','blues rock'] },
    'glam-metal':     { '80s':['glam rock','pop metal'] },
    'alternative-metal':{ '90s':['grunge','hard alternative'], '2000s':['nu-metal'] },
    'death-metal':    { '80s':['thrash metal','hardcore punk'], '90s':['thrash metal'], '2010s':['dissonant death metal'], '2020s':['dissonant death metal'] },
    'black-metal':    { '80s':['punk rock','thrash metal'], '90s':['punk rock'], '2010s':['post-rock'], '2020s':['post-rock'] },
    'metalcore':      { '90s':['hardcore punk','death metal'], '2000s':['melodic death metal','new wave of american metal'], '2010s':['post-rock','pop'], '2020s':['nu-metal','pop'] },
    'deathcore':      { '2000s':['beatdown hardcore','death metal'], '2010s':['djent','death metal'], '2020s':['symphonic metal','blackened death metal'] },
    'nu-metal':       { '90s':['hip hop','funk'], '2000s':['alternative rock','hip hop'], '2020s':['trap','shoegaze'] },
    'doom-metal':     { '60s-70s':['blues rock','psychedelic rock'], '80s':['NWOBHM'], '2010s':['post-rock'] },
    'power-metal':    { '80s':['NWOBHM','neoclassical'], '2000s':['symphonic metal','neoclassical'] },
    'post-hardcore':  { '90s':['emo','noise rock'], '2000s':['emo','pop punk'] },
    'industrial-metal':{ '90s':['EBM','groove metal'], '2010s':['electronic body music','djent'] },
  };
  const _eraKeyEarly = ['60s-70s','80s','90s','2000s','2010s','2020s'].find(k => A('eras').some(e => String(e).startsWith(k)));
  const _blendEra = (_sidEarly && _eraKeyEarly && BLEND_BY_ERA[_sidEarly] && BLEND_BY_ERA[_sidEarly][_eraKeyEarly]) ? BLEND_BY_ERA[_sidEarly][_eraKeyEarly] : null;
  const blendAuto = genres.length === 1 ? (_blendEra || (_sidEarly && GENRE_BLEND[_sidEarly]) || []).slice(0, 2) : [];   // anchors sonores du « reverse » (groupe → style)
  // Époque (couche 3 du style stack) : le client envoie les familles d'époque des genres choisis
  const ERA_TAG = { '60s-70s':'1970s analog tape production', '80s':'1980s production', '90s':'1990s production', '2000s':'2000s production', '2010s':'2010s modern production', '2020s':'2020s modern production' };
  const _eras = A('eras').map(x => String(x));
  const _eraKey = Object.keys(ERA_TAG).find(k => _eras.some(e => e.startsWith(k)));
  const eraTag = _eraKey ? ERA_TAG[_eraKey] : '';
  const _vintageEra = /^(60s-70s|80s|90s)$/.test(_eraKey || '');
  const blockRhythm = b.blockRhythm || {};
  const heavy = +b.heavy || 5, groove = +b.groove || 5, chaos = +b.chaos || 5, melody = +b.melody || 5;
  const bpm = Math.max(60, Math.min(280, +b.bpm || 180));
  const lang = b.lang || 'en';
  const L = (fr, en) => lang === 'fr' ? fr : en;

  const rFor = k => blockRhythm[k] ? ' | ' + String(blockRhythm[k]).replace(/[\[\]|:]/g, '') : '';
  const tempoWord = ''; // v5.5 : plus de mot vague de tempo, le BPM chiffré suffit
  const _tempoWordOld = bpm >= 210 ? 'blistering fast tempo' : bpm >= 170 ? 'fast tempo' : bpm >= 120 ? 'mid-tempo' : bpm >= 90 ? 'slow groovy tempo' : 'slow doom tempo';
  // ENCYCLOPÉDIE → calibration par genre (temps de mesure, gamme/mode, production, tuning par défaut) — secret serveur
  const _gtxt = genres.map(x => String(x).toLowerCase()).join(' ');
  const _worldGenreEarly = /folk|viking|pagan|nordic|celtic|irish|oriental|middle.?eastern|arabic/.test(_gtxt);
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
    [/viking|pagan|nordic/, {ts:(_rs<0.5?'6/8':'4/4'), scale:'nyckelharpa and hurdy-gurdy drone under galloping riffs, tagelharpa melody, war-drum march, gang chants', prod:'organic pagan-metal mix, acoustic folk instruments upfront, hall reverb', tuning:'standard'}],
    [/celtic|irish/, {ts:(_rs<0.5?'6/8':'4/4'), scale:'fiddle and tin whistle jig melodies over riffs, uilleann pipes, bodhrán 6/8 dance rhythm', prod:'organic celtic-metal mix, acoustic instruments upfront', tuning:'standard'}],
    [/oriental|middle.?eastern|arabic/, {ts:'4/4', scale:'oud and darbuka over phrygian dominant riffs, quarter-tone ornamented lead, hand claps', prod:'organic oriental-metal mix, acoustic percussion upfront', tuning:'D standard'}],
    [/folk/, {ts:(_rs<0.5?'6/8':'4/4'), scale:'folk dance melodies, fiddle and accordion leads over riffs, acoustic guitar strumming, stomping 6/8 rhythm', prod:'organic folk-metal mix, acoustic instruments upfront', tuning:'standard'}],
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
  let scaleTag = _db.scale || '';
  const genreProdTag = _db.prod || '';
  const autoTuning = _db.tuning || '';
  // Recommandation de modèle Suno par genre (mieux / bon / moins bon)
  let modelRec;
  // Suno v6 (9 sept. 2026) : v6 / v6-wild / v6-mini — TOUS les modèles précédents (v5.5, v5, v4.5) sont retirés.
  if (/raw|kvlt|old.?school|grind|crust|d.?beat|war metal|primitive|dsbm|lo.?fi/.test(_gtxt))
    modelRec = { best:'v6-wild', good:'v6', weak:'v6-mini', why: L('sorties moins prévisibles = le grain cru et l\'imperfection', 'less predictable output = raw grit and imperfection') };
  else if (/avant|experimental|dissonant|math|noise/.test(_gtxt))
    modelRec = { best:'v6-wild', good:'v6', weak:'v6-mini', why: L('variation recherchée sur les genres tordus', 'wanted variance on the weird genres') };
  else if (/djent|prog|tech|symphonic|metalcore|deathcore|power|melodic|industrial/.test(_gtxt))
    modelRec = { best:'v6', good:'v6-wild', weak:'v6-mini', why: L('précision et mix poli — v6 est le modèle fiable', 'precision and polished mix — v6 is the reliable one') };
  else
    modelRec = { best:'v6', good:'v6-wild', weak:'v6-mini', why: L('qualité globale', 'best overall quality') };
  modelRec.note = L('v6 = modèle courant (9 sept. 2026). v6-wild : plus varié. v6-mini : plus rapide, offert à tous. Les anciens modèles sont retirés.', 'v6 = current model (Sept 9, 2026). v6-wild: more varied. v6-mini: faster, free tier. Older models are retired.');

  // Recommandation phonétique (voir /api/_lib/phoneticize.js) — validé 2026-07-04 :
  // déformer l'orthographe empêche Suno de sur-articuler les vocaux harsh.
  let phonetic = { enabled: false, intensity: null, why: null };
  if (/grind|crust|d.?beat|powerviolence|slam/.test(_gtxt))
    phonetic = { enabled: true, intensity: 'extreme', why: L('bouillie hachée — percussion vocale','chopped mush — vocals as percussion') };
  else if (/black|dsbm|depressive|funeral|war metal/.test(_gtxt))
    phonetic = { enabled: true, intensity: 'stretched', why: L('voyelles extra-longues pour shrieks tenus sur tremolo','extra-long vowels for sustained shrieks over tremolo') };
  else if (/death|brutal|sludge/.test(_gtxt))
    phonetic = { enabled: true, intensity: 'normal', why: L('growls sales, pas sur-articulés','dirty growls, not over-enunciated') };
  const conf = [];   // v6 : déclaré tôt — les garde-fous de conflit écrivent dedans pendant l'assemblage
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
  // v6 (spec 2026-09-10) : chaque émotion injecte des termes de PRODUCTION / jeu / texture vocale.
  // Les adjectifs abstraits (angry, cold, terrified…) faisaient moyenner Suno vers un mix commercial tiède.
  const EMO = {
    rage:         { light:['driving aggressive drumming'],        mid:['fast blast beats, dissonant minor chugs'],              strong:['fast aggressive blast beats, dissonant minor chugs, raw distorted shout'] },
    melancholy:   { light:['clean arpeggiated guitar'],           mid:['clean arpeggiated guitar, minor key progression'],      strong:['clean arpeggiated guitar, minor key progression, acoustic layering'] },
    despair:      { light:['slow tempo, weeping guitar bend'],    mid:['slow doom tempo, weeping guitar bend'],                 strong:['slow doom tempo, weeping guitar bend, strained cracked cleans, funeral pace'] },
    triumph:      { light:['major-third harmonized leads'],       mid:['harmonized twin-guitar leads, wide layered chorus'],    strong:['harmonized twin-guitar leads, gang chorus stack, double kick gallop, wide reverb tail'] },
    coldness:     { light:['dry drum room'],                      mid:['dry drum room, sterile HM-2 guitar tone'],              strong:['dry drum room, sterile HM-2 guitar tone, cavernous dark reverb'] },
    defiance:     { light:['driving mid-tempo groove'],           mid:['driving mid-tempo groove, heavy palm-muted riffs'],     strong:['driving mid-tempo groove, heavy palm-muted riffs, shouted cadence'] },
    dread:        { light:['dissonant tritone chords'],           mid:['dissonant tritone chords, sudden stops'],               strong:['dissonant tritone chords, piercing black metal shrieks, sudden stops'] },
    transcendence:{ light:['open sustained chords, long reverb'], mid:['tremolo wall of guitars, long plate reverb'],           strong:['tremolo wall of guitars, infinite plate reverb, sustained pad layer, slow crescendo'] },
    madness:      { light:['irregular accents'],                  mid:['abrupt tempo shifts, atonal pinch harmonics'],          strong:['abrupt tempo shifts, atonal pinch harmonics, panned vocal layers, unstable time feel'] },
    profanation:  { light:['low chanted layer'],                  mid:['low latin chant layer, church organ drone'],            strong:['low latin chant layer, church organ drone, inverted tritone riffs, tape-saturated mix'] },
    serenity:     { light:['sustained clean guitar'],             mid:['sustained clean guitar, soft brushed drums'],           strong:['sustained clean guitar, soft brushed drums, airy room reverb, no distortion'] },
    joy:          { light:['major key progression'],              mid:['major key progression, bright picked leads'],           strong:['major key progression, bright picked leads, upbeat backbeat, hand claps'] },
    hope:          { light:['rising chord progression'],          mid:['rising chord progression, delayed clean lead'],         strong:['rising chord progression, delayed clean lead, building drum swell, soaring clean vocal'] },
    warmth:       { light:['analog tape saturation'],             mid:['analog tape saturation, warm low-mids'],                strong:['analog tape saturation, warm low-mids, vintage tube amp tone, close-mic vocals'] },
    wonder:       { light:['wide stereo pads'],                   mid:['wide stereo pads, glockenspiel accents'],               strong:['wide stereo pads, glockenspiel accents, lydian melodic lead, deep hall reverb'] },
    clarity:      { light:['tight dry mix'],                      mid:['tight dry mix, articulate picking'],                    strong:['tight dry mix, articulate picking, separated stereo guitars, crisp transient drums'] },
    reverence:    { light:['choir layer'],                        mid:['choir layer, pipe organ pad'],                          strong:['choir layer, pipe organ pad, cathedral reverb, slow half-time drums'] },
    unity:        { light:['gang vocal accents'],                 mid:['gang shouted refrain, four-on-the-floor kick'],         strong:['gang shouted refrain, crowd-sized double-tracked chorus, pounding floor toms'] },
    grace:        { light:['legato clean lead'],                  mid:['legato clean lead, string pad underneath'],             strong:['legato clean lead, string pad underneath, fingerpicked acoustic, soft dynamics'] },
    radiance:     { light:['bright high-end mix'],                mid:['bright high-end mix, shimmering delay'],                strong:['bright high-end mix, shimmering delay, octave-up lead layer, wide chorus effect'] },
  };
  const EMO_LABEL = { rage:'Rage', melancholy:'Mélancolie', despair:'Désespoir', triumph:'Triomphe', coldness:'Froideur', defiance:'Défiance', dread:'Effroi', transcendence:'Transcendance', madness:'Démence', profanation:'Profanation', serenity:'Sérénité', joy:'Joie', hope:'Espoir', warmth:'Chaleur', wonder:'Émerveillement', clarity:'Clarté', reverence:'Sacré', unity:'Unité', grace:'Grâce', radiance:'Lumière' };
  const emoLimit = EMO_LIMIT[tier] != null ? EMO_LIMIT[tier] : 2;
  const emoActive = EMO_ORDER
    .map((id, i) => ({ id, i, val: Math.max(0, Math.min(100, +emotions[id] || 0)) }))
    .filter(e => e.i < emoLimit && e.val > 0)
    .sort((a, c) => c.val - a.val);
  // v6 : DOMINANTE UNIQUE. Seule l'émotion la plus haute (> 50) entre dans le prompt —
  // cumuler des attributs faisait se contredire les consignes et lissait le mix.
  const EMO_THRESHOLD = 50;
  const emoTags = [], emoLabels = [];
  const emoDom = emoActive.length && emoActive[0].val > EMO_THRESHOLD ? emoActive[0] : null;
  if (emoDom) {
    const lvl = emoDom.val > 80 ? 'strong' : emoDom.val > 65 ? 'mid' : 'light';
    ((EMO[emoDom.id] || {})[lvl] || []).forEach(t => emoTags.push(t));
  }
  emoActive.forEach(e => emoLabels.push(EMO_LABEL[e.id] + ' ' + e.val + '%' + (emoDom && e.id === emoDom.id ? ' ← dominante' : ' (ignorée)')));
  // v6 : à tempo rapide, on retire les mentions de lenteur (contradiction de mix/tempo)
  const _noSlow = t => bpm > 140 ? String(t).replace(/\b(slow doom tempo|funeral pace|slow)\b,?\s*/gi, '').replace(/\s*,\s*,/g, ',').replace(/^[,\s]+|[,\s]+$/g, '') : t;
  const emotionTags = dedup(emoTags.map(_noSlow).filter(Boolean)).slice(0, 2);
  const OPP = [['triumph','despair'],['triumph','melancholy'],['transcendence','profanation'],['coldness','rage'],['rage','serenity'],['despair','hope'],['coldness','warmth'],['dread','wonder'],['madness','clarity'],['profanation','reverence'],['melancholy','joy']];
  const emoConf = [];
  OPP.forEach(([a, c]) => { if ((+emotions[a]||0) >= 60 && (+emotions[c]||0) >= 60) emoConf.push(L(EMO_LABEL[a]+' + '+EMO_LABEL[c]+' à fond se contredisent — seule la dominante est envoyée à Suno.', EMO_LABEL[a]+' + '+EMO_LABEL[c]+' both high — only the dominant one is sent to Suno.')); });
  if (emoActive.length && !emoDom) emoConf.push(L('Aucune émotion au-dessus de 50 % — monte la principale pour qu\'elle teinte la production.', 'No emotion above 50% — raise the main one so it shapes the production.'));
  if (emoActive.length > 1 && emoDom) emoConf.push(L('Émotions secondaires ignorées (dominante unique) : ' + emoActive.slice(1).map(e => EMO_LABEL[e.id]).join(', '), 'Secondary emotions ignored (single dominant): ' + emoActive.slice(1).map(e => EMO_LABEL[e.id]).join(', ')));

  // Temps de mesure → DESCRIPTEURS TEXTUELS (validé : Suno ignore les chiffres
  // seuls comme instruction; les descripteurs marchent, les chiffres en hint
  // teintent le feel). Le timeSig numérique reste pour l'affichage UI.
  let rhythmTags = [], rhythmStructTags = [];
  const _sid = (STYLE_ID_MAP.find(([re]) => re.test(_gtxt)) || [])[1];
  if (_sid && TIME_SIGNATURES_BY_STYLE[_sid]) {
    const _s = TIME_SIGNATURES_BY_STYLE[_sid].suno;
    rhythmTags = [...(_s.styleTags || []).slice(0, 2), ...(_s.meterHints || []).slice(0, 1)];
    if (bpm > 140) rhythmTags = rhythmTags.filter(t => !/slow|funeral|half-time|dragging/i.test(String(t)));   // v6 : pas de « slow » à tempo rapide
    rhythmStructTags = (_s.structureTags || []).slice(0, 2);
  }

  // ── v6 : mots vides bannis (ils ne décrivent aucun son → Suno moyenne) ──
  const BANNED = /\b(epic|brutal|heavy|masterpiece|intense|aggressive|furious)\b/gi;
  const TECHNICAL = /(palm.?mut|blast|chug|riff|mix|low end|tone|reverb|drum|guitar|bass|vocal|tempo|production|breakdown|groove|kick|snare|tuning|BPM|meter|picking|chord)/i;
  const scrub = t => {
    const s0 = String(t || '').trim();
    if (!s0) return '';
    if (TECHNICAL.test(s0)) return s0;                                   // descripteur technique → intact
    BANNED.lastIndex = 0;
    if (!BANNED.test(s0)) return s0;                                     // rien à nettoyer
    const r = s0.replace(BANNED, '').replace(/\s+and\s+and\s+/gi, ' and ').replace(/(^|,)\s*and\s+/gi, '$1 ').replace(/\s+and\s*(,|$)/gi, '$1').replace(/\s*,\s*,/g, ',').replace(/^[,\s]+|[,\s]+$/g, '').replace(/\s+/g, ' ');
    return r.split(/\s+/).filter(Boolean).length >= 2 ? r : '';          // sinon : mot vide → retiré
  };
  const scrubList = a => dedup(a.map(scrub).filter(Boolean));
  // v6 : jamais « doom » nu au-dessus de 140 BPM — on précise progressive, sinon Suno rend un mid-tempo tiède
  const _doomFast = bpm > 140 && /doom/.test(_gtxt) && !/progressive|avant/.test(_gtxt);
  const genresSafe = _doomFast ? genres.map(g => /doom/i.test(String(g)) ? 'progressive ' + g : g) : genres;
  if (_doomFast) conf.push(L('Doom à ' + bpm + ' BPM : contradiction — le prompt dit « progressive doom » pour rester cohérent.', 'Doom at ' + bpm + ' BPM: contradiction — the prompt says "progressive doom" to stay coherent.'));
  if (bpm > 140) scaleTag = scaleTag.replace(/\bslow\s+/gi, '').replace(/\s+dragging behind the beat/gi, '');
  const bpmTag = bpm + ' BPM';
  const _brid = g => String(g).trim() + '-influenced';   // bridge de fusion (guide 2026-07-28) : « black metal » → « black metal-influenced »
  // Clé explicite (guide v5.5 : tonalité en tag plain, ex. "E minor") — dérivée du tuning
  const _tunTxt = String(tuning[0] || autoTuning || '').toLowerCase();
  const _root = (_tunTxt.match(/(?:drop|^)\s*([a-g]#?)\b/) || _tunTxt.match(/\b([a-g]#?)\s*standard/) || [])[1];
  const _major = /ionian|lydian|mixolydian|major/.test(String(_db.scale || '')) && !/minor/.test(String(_db.scale || ''));
  const keyTag = _root ? _root.toUpperCase() + (_major ? ' major' : ' minor') : ((!_tunTxt || /^standard$/.test(_tunTxt.trim())) ? 'E minor' : '');
  // Vocal en premier (validé 2026-07-04) : Suno pèse plus fort le début du
  // Style — pour les vocaux harsh, les consignes vocales OUVRENT le prompt.
  // dedup garde la première occurrence, donc pas de doublon plus loin.
  const _vTxt0 = vocals.map(x => String(x).toLowerCase()).join(' ');
  const harshVox = /growl|scream|guttural|shriek|harsh|pig squeal|fry|roar|rasp/.test(_vTxt0) || phonetic.enabled;
  const voxLead = harshVox ? [...vocals.slice(0, 3), ...vrange.slice(0, 1)] : [];
  // rhythmTags injectés tôt (priorité recette) — le budget coupe la fin, pas eux
  const fullTagsRaw = dedup([...(meterLead?[meterLead, bpmTag]:[]), ...genresSafe.slice(0, 1), ...voxLead, ...genresSafe.slice(1), ...blendAuto.map(_brid), ...signature, bpmTag, tempoWord, ...(eraTag?[eraTag]:[]), ...rhythmTags, ...drums, ...guitar.slice(0, 3), ...leadInst.slice(0, 3), ...bassInst.slice(0, 2), ...(tuning.length?tuning.slice(0,1):(autoTuning?[autoTuning]:[])), ...(keyTag?[keyTag]:[]), ...vocals.slice(0, 3), ...vrange.slice(0, 2), ...mood.slice(0, 3), ...(scaleTag?[scaleTag]:[]), ...secret, ...emotionTags, ...(genreProdTag?[genreProdTag]:[]), ...(prod.length ? prod.slice(0, 2) : ['very loud drums and guitars, aggressive mix']), ...allOrganic.slice(0, 4), ...globalRhythm]);
  // Budget : au-delà de ~480 car., Suno dilue/ignore — on coupe par la fin
  const STYLE_BUDGET = 480;
  const fullTags = scrubList(fullTagsRaw);
  while (fullTags.length > 8 && fullTags.join(', ').length > STYLE_BUDGET) fullTags.pop();
  const compactCore = dedup([...(meterLead?[meterLead, bpmTag]:[]), ...genresSafe.slice(0, 1), ...voxLead.slice(0, 2), ...genresSafe.slice(1, 2).map(_brid), ...signature.slice(0, 2), bpmTag, tempoWord, ...(eraTag?[eraTag]:[]), ...secret, ...emotionTags.slice(0,1), ...drums.slice(0, 2), ...guitar.slice(0, 1), ...leadInst.slice(0, 1), ...vocals.slice(0, 1), ...mood.slice(0, 1), ...rhythmTags.slice(0, 1)]);
  const overflow = fullTags.filter(x => !compactCore.includes(x));
  // ── PROMPT "RICHE" (tournure fluide groupée par « ; », optimisée Suno v4.5+) ──
  // Genre-fusion ; dynamiques/structure ; voix ; instruments/riffs ; accordage+tonalités ; mood+émotions ; tempo/changements
  const _lc = x => String(x).toLowerCase();
  const _gl = dedup(genresSafe.map(x => String(x).trim())).filter(Boolean);
  const genreClause = _gl.length >= 2 ? (_gl[0] + ', ' + _gl.slice(1, 3).map(_brid).join(', '))
                    : blendAuto.length ? (_gl[0] || 'metal') + ' with ' + _joinMeters(blendAuto) + ' inflections'
                    : (_gl[0] || 'metal');

  const _hasAtmos = melody >= 6 || structs.some(s => /atmospheric|interlude|intro|clean/.test(s)) || allOrganic.some(o => /acoustic|clean|ambient/.test(_lc(o)));
  const _hasHeavy = heavy >= 6 || drums.some(d => /blast|double/.test(_lc(d))) || structs.some(s => /breakdown|blast|drop|halftime/.test(s));
  let dynamicsClause = '';
  if (_hasHeavy && _hasAtmos) dynamicsClause = 'dynamic long-form song alternating distorted sections and clean atmospheric passages';
  else if (_hasHeavy) dynamicsClause = heavy >= 8 ? 'wall-of-distortion sections, pounding low end' : 'driving momentum, palm-muted drive';
  else if (_hasAtmos) dynamicsClause = 'clean atmospheric passages, evolving arrangement';

  const _hasClean = /clean|melodic sing|baritone|choir|spoken|croon/.test(_vTxt0);
  let vocalsClause = '';
  if (vocals.length) {
    if (harshVox && _hasClean) {
      const _h = dedup(vocals.filter(v => /growl|scream|guttural|shriek|harsh|rasp|roar|squeal/.test(_lc(v)))).slice(0, 2);
      const _c = dedup(vocals.filter(v => /clean|melodic|baritone|choir|spoken|croon/.test(_lc(v)))).slice(0, 2);
      vocalsClause = (_h.join(', ') || 'harsh vocals') + ' alternating with ' + (_c.join(', ') || 'clean vocals');
    } else vocalsClause = dedup([...vocals.slice(0, 3), ...vrange.slice(0, 1)]).join(', ');
  } else if (harshVox) vocalsClause = 'raw distorted harsh vocals';

  // Genres "world" : faible confiance Suno → l'anchor instrumental (scaleTag) passe AVANT les guitares (guide AI Unfiltered 2026-07-06)
  const _worldGenre = _worldGenreEarly;
  // Guide 2026-07-28 : 5-8 tags = sweet spot, >10 la fin est dépriorisée → clauses resserrées
  const instrumentsClause = dedup(_worldGenre
    ? [...signature, (scaleTag || ''), ...guitar.slice(0, 1), ...drums.slice(0, 1), ...leadInst.slice(0, 2), ...bassInst.slice(0, 1)]
    : [...signature, ...guitar.slice(0, 1), (scaleTag || ''), ...drums.slice(0, 1), ...leadInst.slice(0, 2), ...bassInst.slice(0, 1)]).filter(Boolean).join(', ');

  const _tun = tuning[0] || autoTuning || '';
  // Modes → DESCRIPTIF (Suno lit mal les noms de modes ; le descriptif marche mieux — cf. guide God Mode)
  const MODE_DESC = { 'phrygian dominant':'dark exotic Middle-Eastern flavor', 'phrygian':'dark Spanish flamenco tension', 'harmonic minor':'neoclassical dramatic minor', 'melodic minor':'sophisticated jazzy minor', 'dorian':'jazzy soulful minor', 'aeolian':'natural melancholic minor', 'locrian':'unstable dissonant tension', 'lydian':'dreamy floating bright', 'mixolydian':'bluesy dominant groove', 'ionian':'bright major', 'minor':'dark minor' };
  const _found = String(scaleTag).match(/phrygian dominant|harmonic minor|melodic minor|phrygian|dorian|aeolian|mixolydian|ionian|locrian|lydian|minor/g) || [];
  const _uniqModes = [...new Set(_found)].slice(0, 2);
  const _tonality = _uniqModes.length ? _uniqModes.map(m => MODE_DESC[m] || m).join(', ') : '';
  const tuningToneClause = dedup([_tun, keyTag, _tonality, eraTag].filter(Boolean)).join(', ');

  const moodClause = scrubList([...mood.slice(0, 2)]).join(', ');

  const _rhythmDyn = [];
  if (chaos >= 6 || /prog|math|djent|tech|post/.test(_gtxt)) _rhythmDyn.push('frequent time-signature changes');
  if (_hasHeavy && _hasAtmos) _rhythmDyn.push('soft-to-heavy builds and sudden drops');   // seulement si la dynamique existe vraiment
  const rhythmDynClause = dedup([...(meterLead?[]:[bpmTag]), tempoWord, ...rhythmTags.slice(0, 1), ..._rhythmDyn]).join(', ');   // BPM déjà en tête si métriques

  // v6 : époque vintage + low end moderne = contradiction → on retire les tags modernes
  const _dropModern = t => _vintageEra && /modern|surgical|digital|triggered|bone-crushing low end|ultra-fast noise gate|polished/i.test(String(t));
  if (_vintageEra && (secret.some(_dropModern) || /modern|triggered|surgical/i.test(genreProdTag)))
    conf.push(L('Production ' + eraTag + ' + son moderne : incompatible — remplacé par l\'équivalent d\'époque.', 'Production ' + eraTag + ' + modern tone: incompatible — swapped for the period equivalent.'));
  // v6 : en époque vintage on ÉCHANGE le son moderne contre son équivalent d'époque (on ne perd pas le slider Lourdeur)
  const VINTAGE_SWAP = { 'bone-crushing low end': 'thick saturated analog low end', 'locked-in and surgical': 'tight live-room performance' };
  const _secretClean = scrubList(secret.map(x => _dropModern(x) ? (VINTAGE_SWAP[String(x)] || '') : x).filter(Boolean));
  const _prodClean = scrubList([...(genreProdTag && !_dropModern(genreProdTag) ? [genreProdTag] : []), ...prod.slice(0, 2)]);
  // ORDRE SPEC v6 : [sous-genre/métriques] ; [textures & instruments] ; [voix] ; [mixage & tonalité] — 6 blocs max
  const _b1 = dedup([meterLead, genreClause, bpmTag].filter(Boolean)).join(', ');
  const _b2 = scrubList([instrumentsClause, ...emotionTags].filter(Boolean)).join(', ');
  const _b3 = scrub(vocalsClause);
  const _b4 = dedup([tuningToneClause, ..._prodClean, moodClause].filter(Boolean)).join(', ');
  const _b5 = dedup([..._secretClean.slice(0, 1), scrub(dynamicsClause), rhythmDynClause].filter(Boolean)).join(', ');
  const richClauses = [_b1, _b2, _b3, _b4, _b5].filter(x => x && String(x).trim()).slice(0, 6);
  const RICH_BUDGET = 600;   // guide : au-delà, les derniers tags sont dépriorisés (limite dure Suno = 1000)   // v4.5+ tolère ~1000 car. ; on coupe des clauses par la fin si trop long (jamais le genre/mood)
  // dedup GLOBAL : en liste de virgules, un doublon (ex. le BPM répété) prend du poids pour rien
  const _flatten = arr => dedup(arr.join(', ').split(/,\s*/).map(x => x.trim()).filter(Boolean)).join(', ');
  let styleStr = _flatten(richClauses);
  while (richClauses.length > 4 && styleStr.length > RICH_BUDGET) { richClauses.splice(richClauses.length - 2, 1); styleStr = _flatten(richClauses); }
  const styleStrC = scrubList(compactCore).slice(0, 10).join(', ');   // guide : >10 tags, la fin est ignorée   // version compacte inchangée (fallback court)
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
  const coverStr = scrubList(coverCore).join(', ');
  const _climax = chaos >= 7 ? 'blast beat outro' : groove >= 7 ? 'crushing breakdown climax' : melody >= 7 ? 'melodic guitar solo climax' : 'final breakdown';
  const extendStr = 'continue with the same vibe and energy, keep ' + bpmTag + ' and ' + _g1 + (leadInst.length ? ', keep the ' + leadInst[0] : '') + ', stay consistent in tempo and instrumentation, build into a ' + _climax;

  // ── détecteur de conflits ──
  const lc = x => String(x).toLowerCase();
  const vTxt = vocals.map(lc).join(' ');
  if (/clean|melodic sing|clean sing/.test(vTxt) && /growl|scream|guttural|pig squeal|shriek|harsh/.test(vTxt)) conf.push(L('Voix claires + voix extrêmes ensemble — Suno peut hésiter.', 'Clean + extreme vocals together — Suno may waver.'));
  if (bpm < 110 && drums.some(d => /blast/.test(lc(d)))) conf.push(L('Blast beats avec un BPM bas — monte le tempo pour rester cohérent.', 'Blast beats with a low BPM — raise the tempo to stay consistent.'));
  if (allOrganic.some(o => /imperfect|loose|human|drift|drunk/.test(lc(o)))) conf.push(L('Tag organique de timing lâche actif — enlève-le si tu veux un BPM serré.', 'Loose-timing organic tag active — remove it for a tight BPM.'));
  if (genres.length > 2) conf.push(L(genres.length + ' genres sélectionnés — garde 1-2 max, sinon Suno se mélange.', genres.length + ' genres selected — keep 1-2 max or Suno gets confused.'));
  if ((guitar.length + extraInst.length) > 4) conf.push(L('Beaucoup d\'instruments — Suno gère mieux 3-4 max.', 'Many instruments — Suno handles 3-4 best.'));

  conf.push(...emoConf);
  if (_worldGenre) conf.push(L('Genre folk/world : Suno a peu de données — garde les instruments précis dans le prompt et régénère 2-3 fois.', 'Folk/world genre: Suno has little training data — keep the specific instruments in the prompt and regenerate 2-3 times.'));
  // #8/T12 — Exclude AUTO CONTEXTUEL : exclut le non-metal SAUF ce que le genre choisi utilise
  const NON_METAL = ['pop','EDM','autotune','country','jazz','acoustic pop'];   // court (guide : négatifs vagues sous-performent — le positif fait le travail)
  const ALLOW = [
    {re:/symphonic|orchestral|epic/, keep:['orchestral','strings','choir','classical']},
    {re:/folk|pagan|viking|celtic|nordic|oriental|middle.?eastern|arabic/, keep:['flute','acoustic','folk','violin','accordion']},
    {re:/avant|jazz|experimental|prog|fusion/, keep:['jazz','saxophone','clean','classical']},
    {re:/gothic|doom|funeral/, keep:['piano','organ','strings','clean']},
    {re:/industrial|cyber|electronic/, keep:['edm','electronic','synth','synthpop']},
    {re:/rap|nu.?metal/, keep:['hip hop','trap','rap']},
  ];
  const keep = new Set();
  ALLOW.forEach(m => { if (m.re.test(_gtxt)) m.keep.forEach(k => keep.add(k.toLowerCase())); });
  const baseExcl = /rap|nu.?metal/.test(_gtxt) ? NON_METAL : [...NON_METAL, 'hip hop'];
  const autoExcl = baseExcl.filter(x => ![...keep].some(k => x.toLowerCase().includes(k)));
  const excStr = dedup([...allExclude, ...autoExcl]).slice(0, 8).join(', ');

  // Description courte en anglais par section -> Suno la lit comme instruction (entre crochets)
  const NAME = { intro: 'Intro', buildup: 'Build-up', verse: 'Verse', prechorus: 'Pre-Chorus', chorus: 'Chorus', breakdown: 'Breakdown', halftime: 'Half-Time', blastsection: 'Blast Section', drop: 'Drop', solo: 'Guitar Solo', interlude: 'Interlude', atmosphericbreak: 'Atmospheric Break', spokenword: 'Spoken Word', gangchant: 'Gang Chant', scream: 'Scream Section', riffbreak: 'Riff Break', bridge: 'Bridge', outro: 'Outro' };
  // v6 : descriptions TECHNIQUES (jeu + production), jamais d'adjectif d'humeur
  const _tunTag0 = String(tuning[0] || autoTuning || '').replace(/\s+/g, ' ').trim();
  const _tunTag = /^standard$/i.test(_tunTag0) ? '' : _tunTag0;
  const DESC = {
    intro: drums.includes('blast beats') ? 'blast beats, tremolo picking' : (_tunTag ? _tunTag + ' crushing riff' : 'palm-muted opening riff'),
    buildup: (heavy >= 8 ? 'layered wall of distortion' : 'layered build, rising drums') + ', no vocals',
    verse: (vocals.includes('pig squeals') ? 'pig squeals and ' : '') + 'growls over ' + (guitar.includes('chugging riffs') ? 'chugging riffs' : 'palm-muted riffs'),
    prechorus: 'rising drum fill, held guitar chord',
    chorus: groove >= 6 ? 'syncopated groove riff, double-tracked vocals' : 'full band, double kick, wide chorus',
    breakdown: groove >= 7 ? 'half-time groove, shouted gang vocals' : 'low tuned open-note breakdown, pounding floor toms',
    halftime: 'half-time feel, heavy palm mutes',
    blastsection: 'blast beats, tremolo guitars',
    drop: 'full stop, then single low chord',
    solo: guitar.includes('sweep picking solos') ? 'sweep-picking lead, no vocals' : 'lead guitar solo, no vocals',
    interlude: 'instrumental, clean guitar',
    atmosphericbreak: chaos >= 7 ? 'dissonant clean guitar, reverb tail' : 'clean guitar, ambient pad',
    spokenword: 'spoken vocals only, sparse backing',
    gangchant: 'shouted group vocals, pounding floor toms',
    scream: 'single sustained scream, band hit',
    riffbreak: 'guitars and drums only, no vocals',
    bridge: chaos >= 7 ? 'shifting time signature, dissonant chords' : 'clean guitar, building drums',
    outro: chaos >= 7 ? 'blast beats, fading feedback' : 'final breakdown, ringing feedback',
  };
  // Séparateur = PIPE (vérifié 2026-09-10) : les guides de métatags et un test jour-1 de v6
  // confirment « [Bridge | whispered French bridge] ». La virgule provoque un « instructional
  // collapse » (tous les éléments au même niveau) et peut être chantée. Le reste de l'app
  // (vocalMix, duo) utilisait déjà le pipe — on garde UNE seule syntaxe.
  const blockTag = k => '[' + NAME[k] + ' | ' + DESC[k] + rFor(k) + ']';
  // v6 : ordre linéaire — rien après l'outro, et on ferme sur [End]
  const _hasOutro = structs.includes('outro');
  const _structsOrdered = [...structs.filter(x => x !== 'outro'), ...(_hasOutro ? ['outro'] : [])];
  if (_hasOutro && structs[structs.length - 1] !== 'outro')
    conf.push(L('Des sections étaient placées après l\'Outro — elles ont été remontées avant (Suno ne chante rien après un outro).', 'Sections were placed after the Outro — moved before it (Suno sings nothing after an outro).'));
  const blocksClean = [..._structsOrdered.map(x => NAME[x] ? blockTag(x) : '').filter(Boolean), '[End]'];
  const structStr = blocksClean.join('\n');   // v5.5 : crochets = sections seulement, BPM/mesure restent dans Style
  const overflowLine = overflow.length ? '[' + overflow.join(', ') + ']' : '';
  const structStrC = [overflowLine, ...blocksClean].filter(Boolean).join('\n');
  const structNotesTxt = ''; // notes par section maintenant DANS la structure (entre crochets)

  // ── RÉGLAGES « More Options » de Suno v6 ──
  // Calé sur le VRAI panneau (capture 2026-09-10) : Exclude Styles, Vocal Gender (Male/Female),
  // Duration (Custom/Auto), Max Mode (Off/On), Weirdness %, Style Influence %, Audio Influence %,
  // Variety (label Low/Medium/High — PAS un pourcentage), Personalize/My Taste (Off/On).
  const _clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));
  const _weird = _clamp(30 + chaos * 4.5, 25, 78);                      // curseur Chaos de l'app -> Weirdness
  const _nConf = conf.length;
  // Style Influence : la doc Suno ne donne aucune plage (juste Loose <-> Strong, défaut 50).
  // Règle retenue : un prompt SANS contradiction supporte l'adhérence max ; chaque conflit détecté
  // laisse un peu de marge à Suno pour arbitrer plutôt que de rendre la contradiction telle quelle.
  const _styleInf = _clamp(100 - _nConf * 8 - (genres.length > 1 ? 5 : 0), 60, 100);
  // Variety : échelle réelle du panneau = 0 / Normal / High / Extra / Max (ce n'est pas un %).
  // 0 = les deux prises se ressemblent au maximum, utile quand on teste une modif de prompt.
  // Variety, d'après la doc Suno, « ajuste et met à jour tes prompts de style » : c'est la licence de
  // RÉÉCRITURE que tu donnes à Suno. Observé en High : il reformule tout le prompt en prose.
  // Notre prompt est précis par construction → on reste bas, sauf demande explicite d'exploration.
  const _varietyLbl = chaos >= 9 ? 'High' : chaos >= 6 ? 'Normal' : '0';
  const _vTxtAll = vocals.concat(vrange).join(' ');
  const sliderRec = {
    weirdness: _weird,
    styleInfluence: _styleInf,
    variety: _varietyLbl,                                              // label, pas un %
    audioInfluence: 65,                                                // n'apparaît qu'avec une source audio (upload OU Cover)
    maxMode: structs.length >= 6,
    duration: structs.length >= 6 ? 'Custom' : 'Auto',
    personalize: false,                                                // My Taste OFF quand on teste un prompt
    vocalGender: /female|soprano|femme|mezzo/i.test(_vTxtAll) ? 'Female'
               : /male|baritone|tenor|homme|growl|guttural|shriek|scream|roar/i.test(_vTxtAll) ? 'Male'
               : L('laisse vide', 'leave unset'),
    why: L(
      (_nConf ? _nConf + ' conflit' + (_nConf > 1 ? 's' : '') + ' détecté' + (_nConf > 1 ? 's' : '') + ' → Style Influence baissé pour laisser Suno arbitrer.'
              : 'Prompt sans contradiction → Style Influence poussé au maximum.') + ' Variety « ' + _varietyLbl + ' » = la licence de réécriture que tu donnes à Suno : en High il reformule ton prompt au complet. Reste bas pour que TES tags soient respectés.',
      (_nConf ? _nConf + ' conflict' + (_nConf > 1 ? 's' : '') + ' detected → Style Influence lowered so Suno can resolve it.'
              : 'No contradiction in the prompt → Style Influence pushed to the max.') + ' Variety "' + _varietyLbl + '" = how much rewriting you allow Suno: on High it reformulates your whole prompt. Keep it low so YOUR tags are respected.'),
    audioNote: L('Audio Influence n\'apparaît qu\'avec une source audio : un WAV téléversé (Riff / Mélodie) OU un Cover. Haut = garde la mélodie et le rythme de la source ; bas = Suno réinterprète. En Cover avec un prompt modifié, baisse-le à 30-50 pour que le nouveau style prenne le dessus.',
                 'Audio Influence only appears with an audio source: an uploaded WAV (Riff / Melody) OR a Cover. High = keeps the source melody and rhythm; low = Suno reinterprets. On a Cover with a changed prompt, drop it to 30-50 so the new style wins.'),
  };

  // v6 — Song Editor : on sélectionne UNE section sur la timeline puis « Replace Section »,
  // et la boîte de prompt réécrit cette section-là. Les instructions sont donc ciblées par section.
  const _voxE = (vocals[0] || 'harsh vocals');
  const _leadE = leadInst[0] || (guitar.includes('sweep picking solos') ? 'sweep-picking guitar' : 'lead guitar');
  const _drumE = drums[0] || 'blast beats';
  const EDIT_BY_SECTION = {
    intro:            'open with ' + (_tunTag ? _tunTag + ' ' : '') + 'guitar only, no drums, let the last chord ring',
    buildup:          'build tension: add a rising drum roll and a held guitar chord, no vocals',
    verse:            'keep the riff, make the ' + _voxE + ' drier and further forward in the mix',
    prechorus:        'lift it: hold one chord, drop the drums to toms, then a full-band hit at the end',
    chorus:           'bigger hook: double-track the vocals, widen the guitars, add a high harmony',
    breakdown:        'half-time and heavier, add shouted gang vocals and pounding floor toms',
    halftime:         'slow it to half-time, heavy palm mutes, let the low end dominate',
    blastsection:     'faster ' + _drumE + ', tremolo guitars, no breaks',
    drop:             'full stop, then one low chord with long reverb',
    solo:             'replace with a longer ' + _leadE + ' solo, keep the backing riff identical',
    interlude:        'instrumental only: clean guitar and ambient pad, no drums',
    atmosphericbreak: 'strip it down to clean guitar and reverb, no distortion',
    spokenword:       'spoken vocals only over a sparse backing, no riff',
    gangchant:        'shouted group vocals, everyone in unison, pounding floor toms',
    scream:           'one sustained scream over a single band hit',
    riffbreak:        'guitars and drums only, cut the vocals entirely',
    bridge:           'change the feel: different chords, clean guitar, build back into the riff',
    outro:            'end on ringing feedback, let the last chord decay',
  };
  const editPrompts = structs.filter(k => EDIT_BY_SECTION[k] && NAME[k])
    .map(k => ({ section: NAME[k], prompt: EDIT_BY_SECTION[k] }))
    .filter((v, i2, arr) => arr.findIndex(x => x.section === v.section) === i2)
    .slice(0, 6);
  const editStr = editPrompts.map(e => e.section + ' → ' + e.prompt).join('\n');

  const heavyD = heavy >= 8 ? 'extremely heavy and crushing' : heavy >= 5 ? 'heavy and punishing' : 'moderately heavy';
  const grooveD = groove >= 8 ? 'deeply groovy' : groove >= 5 ? 'mid-paced groovy' : 'straight aggressive';
  const chaosD = chaos >= 8 ? 'chaotic and unpredictable' : chaos >= 5 ? 'controlled chaos' : 'tight and structured';
  const melodyD = melody >= 7 ? 'rich melodic leads' : melody >= 4 ? 'sparse melodic accents' : 'pure brutality';

  const excludeBlock = excStr ? '\n\nEXCLUDE: ' + excStr.split(', ').map(x => '-' + x).join(', ') : '';
  const organicBlock = allOrganic.length > 0 ? '\nOrganic: ' + allOrganic.join(', ') : '';
  // ════════ PASSE DE CRITIQUE : le générateur note sa propre sortie ════════
  // Chaque manque coûte des points ET vient avec le geste correctif exact (onglet + action).
  const _nTags = styleStr.split(', ').filter(Boolean).length;
  const issues = [];
  const _ko = (pts, fr, en, tab, fix) => issues.push({ pts, msg: L(fr, en), tab, fix });
  if (conf.length) _ko(conf.length * 6, conf.length + ' contradiction' + (conf.length > 1 ? 's' : '') + ' dans le prompt — vois la liste des conflits juste au-dessus.', conf.length + ' contradiction' + (conf.length > 1 ? 's' : '') + ' in the prompt — see the conflict list above.', null);
  if (genres.length === 0) _ko(20, 'Aucun genre choisi — c\'est le tag qui porte tout le reste.', 'No genre selected — that is the tag everything else hangs on.', 'genre');
  else if (genres.length > 2) _ko(10, genres.length + ' genres : garde-en 1 ou 2, au-delà Suno mélange au lieu de fusionner.', genres.length + ' genres: keep 1 or 2, beyond that Suno blends instead of fusing.', 'genre', 'trimGenres');
  if (!emoDom && Object.keys(emotions).length) _ko(8, 'Aucune émotion au-dessus de 50 % — monte ta dominante, sinon rien ne teinte la production.', 'No emotion above 50% — raise your dominant one or nothing shapes the production.', 'genre', 'raiseEmo');
  if (!vocals.length && !harshVox) _ko(8, 'Aucun type de voix choisi — Suno improvise, et c\'est souvent du chant clair générique.', 'No vocal type selected — Suno improvises, usually generic clean singing.', 'vocals', 'fillGenre');
  if (!drums.length) _ko(6, 'Aucun pattern de batterie — onglet Drums, c\'est ce qui donne le genre au premier coup d\'oreille.', 'No drum pattern — Drums tab; it is what identifies the genre in the first second.', 'drums', 'fillGenre');
  if (!guitar.length && !leadInst.length) _ko(6, 'Aucune technique de guitare ni instrument lead — le riff reste vague.', 'No guitar technique or lead instrument — the riff stays vague.', 'instrums', 'fillGenre');
  if (structs.length < 3) _ko(8, 'Moins de 3 sections : le morceau va tourner en rond. Onglet Structure.', 'Fewer than 3 sections: the song will loop on itself. Structure tab.', 'structure', 'autoStruct');
  if (_nTags < 8) _ko(12, 'Prompt trop maigre (' + _nTags + ' éléments) — ajoute des textures, une production, une tonalité.', 'Prompt too thin (' + _nTags + ' items) — add textures, a production, a tonality.', 'genre', 'fillGenre');
  else if (styleStr.length > 800) _ko(6, 'Prompt long (' + styleStr.length + ' car.) — les derniers éléments pèsent moins.', 'Long prompt (' + styleStr.length + ' chars) — the last items carry less weight.', null);
  if (_worldGenre && !signature.length && !leadInst.length) _ko(8, 'Genre folk/world sans instrument nommé — Suno n\'a presque pas de données, il va dériver vers du « world music » générique.', 'Folk/world genre with no named instrument — Suno has little data and will drift to generic world music.', 'instrums', 'fillGenre');
  if (!tuning.length && !autoTuning) _ko(4, 'Aucun accordage — onglet Genre, il fixe la lourdeur réelle du riff.', 'No tuning — Genre tab; it sets the actual heaviness of the riff.', 'genre', 'fillGenre');
  const score = Math.max(0, Math.min(100, 100 - issues.reduce((a, x) => a + x.pts, 0)));
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';
  const critic = {
    score, grade,
    issues: issues.sort((a, b) => b.pts - a.pts).slice(0, 6),
    verdict: L(
      score >= 90 ? 'Prompt solide : rien à corriger, envoie-le.' : score >= 75 ? 'Bon prompt, deux détails le rendraient plus précis.' : score >= 60 ? 'Ça va marcher, mais Suno va devoir deviner plusieurs choses.' : 'Prompt trop vague — Suno va rendre du metal générique.',
      score >= 90 ? 'Solid prompt: nothing to fix, send it.' : score >= 75 ? 'Good prompt, two details would sharpen it.' : score >= 60 ? 'It will work, but Suno has to guess several things.' : 'Prompt too vague — Suno will return generic metal.'),
  };

  const full = '=== STYLE TAGS (-> Style of Music) ===\n' + styleStr + excludeBlock +
    '\n\n=== STRUCTURE (-> top of Lyrics) ===\n' + structStr +
    '\n\n=== PRODUCTION NOTES (keep for yourself) ===\n' + heavyD + '. ' + grooveD + '. ' + chaosD + '. ' + melodyD + '. ' + bpmTag + '.' + organicBlock;

  return res.status(200).json({ styleStr, styleStrC, structStr, structStrC, structNotes: structNotesTxt, excludeStr: excStr, conflicts: conf, emotionsActive: emoLabels, critic, blendAuto, meterLead, meterAuto, coverStr, extendStr, editStr, editPrompts, sliderRec, timeSig, modelRec, phonetic, rhythmStructTags });
}
