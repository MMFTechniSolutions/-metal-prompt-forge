// /api/forge.js — Assemblage du prompt Suno côté serveur (la "recette" secrète).
// Le client envoie les sélections brutes, le serveur renvoie le prompt déjà calculé.

export default function handler(req, res) {
  let b = req.method === 'POST' ? req.body : (req.query || {});
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  const A = k => Array.isArray(b[k]) ? b[k] : [];

  const genres = A('genres'), drums = A('drums'), vocals = A('vocals'), guitar = A('guitar');
  const tuning = A('tuning'), mood = A('mood'), prod = A('prod'), globalRhythm = A('globalRhythm'), vrange = A('vrange');
  const extraInst = [...A('bassStyle'), ...A('bassTech'), ...A('bassTone'), ...A('bassTuning'), ...A('bassProd'), ...A('sax'), ...A('brass'), ...A('keys'), ...A('strings')];
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
  // T10 — temps de mesure varié (pas tout en 4/4) selon le genre + chaos
  const _gtxt = genres.map(x => String(x).toLowerCase()).join(' ');
  const _rs = Math.random();
  let timeSig = '4/4';
  if (/djent|math|prog|tech|dissonant|avant/.test(_gtxt)) timeSig = _rs<0.4?'4/4':_rs<0.65?'7/8':_rs<0.85?'5/4':'9/8';
  else if (/doom|sludge|funeral|post|blackgaze|atmospheric/.test(_gtxt)) timeSig = _rs<0.55?'4/4':_rs<0.8?'6/8':'3/4';
  else if (chaos >= 8) timeSig = _rs<0.5?'4/4':_rs<0.75?'7/8':'5/4';
  else if (/groove|nu/.test(_gtxt) && _rs<0.3) timeSig = '6/8';
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
  const EMO_ORDER = ['rage','melancholy','despair','triumph','coldness','defiance','dread','transcendence','madness','profanation'];
  const EMO_LIMIT = { free:2, forge:4, pro:6, elite:10, eliteplus:10 };
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
  };
  const EMO_LABEL = { rage:'Rage', melancholy:'Mélancolie', despair:'Désespoir', triumph:'Triomphe', coldness:'Froideur', defiance:'Défiance', dread:'Effroi', transcendence:'Transcendance', madness:'Démence', profanation:'Profanation' };
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
  const OPP = [['triumph','despair'],['triumph','melancholy'],['transcendence','profanation'],['coldness','rage']];
  const emoConf = [];
  OPP.forEach(([a, c]) => { if ((+emotions[a]||0) >= 60 && (+emotions[c]||0) >= 60) emoConf.push(L(EMO_LABEL[a]+' + '+EMO_LABEL[c]+' à fond se contredisent — baisse-en une.', EMO_LABEL[a]+' + '+EMO_LABEL[c]+' both high — they fight, lower one.')); });

  const bpmTag = bpm + ' BPM';
  const fullTags = dedup([...genres, bpmTag, tempoWord, ...drums, ...guitar.slice(0, 3), ...tuning.slice(0, 1), ...vocals.slice(0, 3), ...vrange.slice(0, 2), ...mood.slice(0, 3), ...secret, ...emotionTags, ...prod.slice(0, 2), ...allOrganic.slice(0, 4), ...globalRhythm]);
  const compactCore = dedup([...genres.slice(0, 2), bpmTag, tempoWord, ...secret, ...emotionTags.slice(0,1), ...drums.slice(0, 2), ...guitar.slice(0, 1), ...vocals.slice(0, 1), ...mood.slice(0, 1)]);
  const overflow = fullTags.filter(x => !compactCore.includes(x));
  const styleStr = fullTags.join(', ');
  const styleStrC = compactCore.join(', ');
  // T11 — prompts secondaires : COVER (sous-genre dominant) + EXTEND (callback cohérent)
  const _g1 = genres[0] || 'metal';
  const _g2 = genres[1] || null;
  const coverCore = _g2
    ? dedup([_g2, _g1, bpmTag, tempoWord, ...secret, ...emotionTags.slice(0,1), ...vocals.slice(0,1), ...mood.slice(0,1)])
    : dedup([_g1, 'heavier and more extreme', bpmTag, tempoWord, ...secret, ...emotionTags.slice(0,1), ...vocals.slice(0,1)]);
  const coverStr = coverCore.join(', ');
  const _climax = chaos >= 7 ? 'blast beat outro' : groove >= 7 ? 'crushing breakdown climax' : melody >= 7 ? 'melodic guitar solo climax' : 'final breakdown';
  const extendStr = 'continue with the same vibe and energy, keep ' + bpmTag + ' and ' + _g1 + ', stay consistent in tempo and instrumentation, build into a ' + _climax;

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

  return res.status(200).json({ styleStr, styleStrC, structStr, structStrC, structNotes: structNotesTxt, excludeStr: excStr, full, conflicts: conf, emotionsActive: emoLabels, coverStr, extendStr, timeSig });
}
