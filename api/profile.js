// /api/profile.js — Auto-config genre (recette secrète côté serveur).
// Le client envoie juste un nom de genre, reçoit des valeurs concrètes (BPM, drums, voix, sliders, structure).
// La logique (profils par genre + structure semi-aléatoire) n'est PAS exposée au navigateur.

const _ri = n => Math.floor(Math.random() * n);
const _rand = (a, b) => a + _ri(b - a + 1);
const _pick = (arr, n) => { const c = [...arr]; const o = []; for (let i = 0; i < n && c.length; i++) o.push(c.splice(_ri(c.length), 1)[0]); return o; };

function genreProfile(g) {
  const s = (g || '').toLowerCase(), has = k => s.includes(k);
  if (has('grind')) return { bpm:[200,280], drums:['gravity blast beats','blast beats','machine-gun double bass'], vocals:['guttural death growls','high-pitched screams','pig squeals'], mood:['chaotic and frantic','crushing and heavy','raw and abrasive'], heavy:[8,10], groove:[2,5], chaos:[8,10], melody:[1,3] };
  if (has('slam')) return { bpm:[80,120], drums:['stomp breakdown drums','half-time groove','machine-gun double bass'], vocals:['deathcore lows','guttural death growls','pig squeals'], mood:['crushing and heavy','groovy and headbang-worthy','sinister and dark'], heavy:[9,10], groove:[6,9], chaos:[3,6], melody:[1,3] };
  if (has('deathcore')) return { bpm:[110,180], drums:['blast beats','double bass drumming','stomp breakdown drums','deathcore groove'], vocals:['guttural death growls','pig squeals','high-pitched screams','deathcore lows'], mood:['crushing and heavy','sinister and dark','intense and aggressive'], heavy:[8,10], groove:[5,8], chaos:[5,8], melody:[2,5] };
  if (has('black')) return { bpm:[150,210], drums:['blast beats','hyperblast beats','gravity blast beats','tremolo picking'], vocals:['black metal shrieks','high-pitched screams','raspy harsh vocals'], mood:['sinister and dark','dark and menacing','epic'], heavy:[6,9], groove:[2,5], chaos:[6,9], melody:[3,7] };
  if (has('death') || has('brutal') || has('tech')) return { bpm:[150,220], drums:['blast beats','double bass drumming','machine-gun double bass','gravity blast beats'], vocals:['guttural death growls','pig squeals','deathcore lows'], mood:['crushing and heavy','sinister and dark','chaotic and frantic'], heavy:[8,10], groove:[3,6], chaos:[6,9], melody:[1,4] };
  if (has('doom') || has('sludge') || has('funeral') || has('drone')) return { bpm:[55,90], drums:['half-time groove','tom-heavy fills','big room toms'], vocals:['tortured screams','clean melodic chorus vocals','guttural death growls'], mood:['crushing and heavy','dark and menacing','epic'], heavy:[7,10], groove:[5,8], chaos:[2,5], melody:[3,7] };
  if (has('thrash') || has('speed') || has('crossover')) return { bpm:[150,200], drums:['thrash beat','d-beat','double bass drumming'], vocals:['raspy harsh vocals','high-pitched screams','gang shouts'], mood:['intense and aggressive','raw and abrasive'], heavy:[6,9], groove:[4,7], chaos:[5,8], melody:[2,5] };
  if (has('djent') || has('progressive') || has('math')) return { bpm:[120,160], drums:['polyrhythmic drums','syncopated rhythms','djent groove','double bass drumming'], vocals:['mid-range harsh vocals','clean melodic chorus vocals'], mood:['groovy and headbang-worthy','intense and aggressive','dissonant'], heavy:[6,9], groove:[6,9], chaos:[5,8], melody:[4,8] };
  if (has('power') || has('symphonic')) return { bpm:[140,185], drums:['double bass drumming','thrash beat','groovy mid-tempo drums'], vocals:['clean melodic chorus vocals','high-pitched screams'], mood:['epic','melodic and atmospheric','intense and aggressive'], heavy:[5,8], groove:[4,7], chaos:[3,6], melody:[6,9] };
  if (has('groove') || has('nu-metal') || has('nu metal') || has('rap') || has('alternative') || has('industrial')) return { bpm:[90,130], drums:['groovy mid-tempo drums','half-time groove','bounce groove','two-step beat'], vocals:['mid-range harsh vocals','gang shouts','clean melodic chorus vocals'], mood:['groovy and headbang-worthy','intense and aggressive'], heavy:[5,8], groove:[7,10], chaos:[3,6], melody:[4,7] };
  if (has('core') || has('hardcore') || has('beatdown')) return { bpm:[125,170], drums:['stomp breakdown drums','two-step beat','double bass drumming','bounce groove','deathcore groove'], vocals:['metalcore screams','clean melodic chorus vocals','gang shouts','guttural death growls'], mood:['intense and aggressive','melodic and atmospheric'], heavy:[6,9], groove:[6,9], chaos:[4,7], melody:[4,8] };
  return { bpm:[150,185], drums:['double bass drumming','blast beats','groovy mid-tempo drums','d-beat'], vocals:['mid-range harsh vocals','raspy harsh vocals','metalcore screams'], mood:['intense and aggressive','dark and menacing'], heavy:[6,9], groove:[4,7], chaos:[4,7], melody:[2,6] };
}

function randStructure() {
  const out = ['intro','verse','chorus'];
  if (Math.random() > 0.25) out.push('breakdown');
  if (Math.random() > 0.5) out.push('prechorus');
  const extra = ['buildup','halftime','blastsection','drop','solo','bridge','gangchant','riffbreak','interlude','atmosphericbreak'];
  const n = _rand(1, 3); for (let i = 0; i < n; i++) { const e = extra[_ri(extra.length)]; if (!out.includes(e)) out.push(e); }
  out.push('outro');
  return out;
}

export default function handler(req, res) {
  let b = req.method === 'POST' ? req.body : (req.query || {});
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  const pr = genreProfile(b.genre || '');
  res.status(200).json({
    bpm: _rand(pr.bpm[0], pr.bpm[1]),
    drums: _pick(pr.drums, 1 + _ri(2)),
    vocals: _pick(pr.vocals, 1 + _ri(2)),
    mood: _pick(pr.mood, 1 + _ri(2)),
    heavy: _rand(pr.heavy[0], pr.heavy[1]),
    groove: _rand(pr.groove[0], pr.groove[1]),
    chaos: _rand(pr.chaos[0], pr.chaos[1]),
    melody: _rand(pr.melody[0], pr.melody[1]),
    structs: randStructure(),
  });
}
