// /api/riff.js — Logique secrète du Riff Generator (côté serveur).
// Le navigateur n'envoie que des paramètres et reçoit l'arrangement calculé.
// La bibliothèque de patterns + l'algorithme ne sont PAS exposés au client.

const STYLE_PAT = {
  thrash:   [1,0,1,0,1,0,1,0,1,1,0,1,0,1,0,1],
  death:    [1,1,0,1,1,0,1,0,1,1,0,1,1,0,1,1],
  doom:     [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
  blackened:[1,1,1,0,1,1,0,1,1,1,0,1,0,1,1,0],
  groove:   [1,0,0,1,0,1,0,0,1,0,0,1,0,0,1,0],
  djent:    [1,0,1,1,0,0,1,0,1,0,1,0,0,1,0,1],
  speed:    [1,0,1,0,1,1,0,1,1,0,1,0,1,1,0,1],
  slam:       [1,0,0,0,1,1,0,0,1,0,0,0,1,1,0,0],
  sludge:     [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0],
  postmetal:  [1,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0],
  grindcore:  [1,1,1,1,1,0,1,1,1,1,0,1,1,1,1,1],
  funeraldoom:[1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
  dissonant:  [1,0,1,0,0,1,1,0,1,0,0,1,0,1,0,1],
};
const BASS_PAT = {
  thrash:   [1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0],
  death:    [1,0,1,0,1,1,0,1,0,1,0,1,1,0,0,1],
  doom:     [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
  blackened:[1,0,0,1,0,0,1,0,1,0,0,1,0,0,0,1],
  groove:   [1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0],
  djent:    [1,0,0,1,0,1,0,0,1,0,0,0,1,0,1,0],
  speed:    [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
  slam:       [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
  sludge:     [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0],
  postmetal:  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
  grindcore:  [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
  funeraldoom:[1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
  dissonant:  [1,0,0,1,0,1,0,0,1,0,0,1,0,0,1,0],
};
const DRUM_PAT = {
  standard:   {kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],snare:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]},
  double_kick:{kick:[1,0,1,0,1,0,1,0,1,1,0,1,0,1,1,0],snare:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],hihat:[1,1,0,1,1,0,1,0,1,1,0,1,1,0,1,0]},
  blast_beat: {kick:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],snare:[0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],hihat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]},
  half_time:  {kick:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0],snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]},
  breakdown:  {kick:[1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0],snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1],hihat:[1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0]},
  gravity:    {kick:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],snare:[0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]},
  thrash:     {kick:[1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0],snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],hihat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]},
  deathcore:  {kick:[1,0,1,1,0,0,1,0,1,0,1,1,0,1,0,0],snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1],hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]},
  dbeat:      {kick:[1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,0],snare:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]},
  groove:     {kick:[1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,0],snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]},
  two_step:   {kick:[1,0,0,0,1,0,1,0,1,0,0,0,1,0,1,0],snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]},
  bounce:     {kick:[1,0,0,1,0,0,1,1,0,0,1,0,0,1,1,0],snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]},
  slam:       {kick:[1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0],snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],hihat:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0]},
  mathcore:   {kick:[1,0,1,0,0,1,0,1,1,0,0,1,0,1,0,0],snare:[0,0,1,0,1,0,0,1,0,1,0,0,1,0,1,0],hihat:[1,1,0,1,0,1,1,0,1,0,1,1,0,1,0,1]},
  doom:       {kick:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],hihat:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]},
  skank:      {kick:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],snare:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],hihat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]},
  bombblast:  {kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],snare:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],hihat:[0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1]},
  halfgroove: {kick:[1,0,0,1,0,0,0,0,1,0,1,0,0,0,0,0],snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]},
  tribal:     {kick:[1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1],snare:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],hihat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},
};
// Phrases de 16 notes (question/réponse) → le riff se développe au lieu de tourner en rond
const NOTE_SEQ = {
  thrash:[0,0,3,0,5,3,7,5,0,0,3,0,8,7,5,3],
  death:[0,0,1,0,6,1,8,6,0,0,1,3,6,5,3,1],
  doom:[0,7,5,3,0,5,3,2,0,7,8,7,5,3,2,0],
  blackened:[0,0,1,5,0,1,6,5,0,1,5,7,6,5,1,0],
  groove:[0,5,7,0,3,5,7,3,0,7,5,3,5,7,3,0],
  djent:[0,0,7,0,5,7,3,0,0,5,0,7,3,5,0,0],
  speed:[0,3,5,7,8,7,5,3,0,5,7,10,8,7,5,0],
  slam:[0,0,1,0,2,1,0,3,0,0,1,2,1,0,2,0],
  sludge:[0,3,5,3,0,5,7,5,0,3,2,0,3,5,3,0],
  postmetal:[0,7,12,7,5,7,12,10,0,5,7,12,10,7,5,0],
  grindcore:[0,1,0,2,3,2,1,0,0,1,3,2,1,0,2,0],
  funeraldoom:[0,0,3,0,5,3,0,0,0,0,5,3,2,0,0,0],
  dissonant:[0,1,6,0,1,8,6,1,0,1,8,6,11,8,6,0],
};
// transpose = décalage de hauteur (variété par section) · fill = roulement de snare en fin de phrase
const STRUCTURES = {
  loop:   {bars:[{}]},
  vbd:    {bars:[{},{},{drum:'breakdown'},{drum:'breakdown',fill:true}]},
  irbo:   {bars:[{drum:'half_time'},{},{transpose:5},{drum:'breakdown',fill:true}]},
  drop:   {bars:[{drum:'half_time'},{drum:'double_kick',transpose:3},{drum:'blast_beat',transpose:5},{drum:'breakdown',fill:true}]},
  djent7: {bars:[{},{steps:14,transpose:3},{},{steps:14,drum:'breakdown',fill:true}]},
  prog:   {bars:[{steps:14},{steps:12,transpose:5},{transpose:7},{steps:20,fill:true}]},
  // structures longues / multi-sections
  buildup:    {bars:[{drum:'half_time'},{drum:'standard'},{drum:'double_kick',transpose:3},{drum:'blast_beat',transpose:5,fill:true}]},
  versechorus:{bars:[{drum:'groove'},{drum:'groove'},{drum:'standard',transpose:5},{drum:'standard',transpose:5,fill:true}]},
  fullsong:   {bars:[{drum:'half_time'},{drum:'groove'},{drum:'groove'},{drum:'standard',transpose:5},{drum:'standard',transpose:5},{drum:'breakdown'},{drum:'double_kick',transpose:7},{drum:'breakdown',fill:true}]},
  breakdownfest:{bars:[{drum:'breakdown'},{drum:'slam',transpose:-2},{drum:'breakdown',transpose:3},{drum:'breakdown',fill:true}]},
  blastassault:{bars:[{drum:'blast_beat'},{drum:'blast_beat',transpose:3},{drum:'gravity',transpose:5},{drum:'blast_beat',fill:true}]},
  doomcrawl:  {bars:[{drum:'doom'},{drum:'doom'},{drum:'half_time',transpose:5},{drum:'doom',fill:true}]},
  gallop:     {bars:[{drum:'thrash'},{drum:'thrash'},{drum:'thrash',transpose:5},{drum:'double_kick',transpose:7,fill:true}]},
  odyssey:    {bars:[{steps:14,drum:'mathcore'},{steps:12,drum:'mathcore',transpose:3},{steps:16,transpose:5},{steps:18,drum:'breakdown',fill:true}]},
};
const LEAD_RHY=[1,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0];
const LEAD_VOICE={
  saxophone:{wave:'sawtooth',cut:2200,q:3},
  violon:{wave:'sawtooth',cut:3600,q:1.2},
  synth:{wave:'square',cut:4200,q:1},
  cuivres:{wave:'square',cut:1700,q:4},
  guitarelec:{wave:'sawtooth',cut:4200,q:1.4},
  guitarclass:{wave:'triangle',cut:2600,q:0.9,pluck:true},
};
const ELITE_STYLES=['slam','sludge','postmetal','grindcore','funeraldoom','dissonant'];
const TREMOLO=['blackened','postmetal','funeraldoom','dissonant'];   // guitare trémolo continue (mur black metal)
const ATMOS=['blackened','postmetal','funeraldoom','dissonant','sludge','doom']; // nappe de cordes symphonique

function buildArrangement(p){
  const st=STRUCTURES[p.structure]||STRUCTURES.loop;
  const out={guit:[],bass:[],kick:[],snare:[],hihat:[],trans:[],L:0};
  st.bars.forEach(bar=>{
    const dp = p.custom ? p.drum : (DRUM_PAT[bar.drum||p.drumKey]||p.drum);
    const tr=bar.transpose||0;
    const n=bar.steps||16;
    for(let i=0;i<n;i++){
      const j=i%16;
      out.guit.push(p.guit[j]);out.bass.push(p.bass[j]);
      out.kick.push(dp.kick[j]);
      out.snare.push((bar.fill && i >= n - 4) ? 1 : dp.snare[j]);
      out.hihat.push(dp.hihat[j]);
      out.trans.push(tr);
    }
  });
  out.L=out.guit.length;
  return out;
}

function buildTab(p){
  const TUNE={E2:'E ',Eb2:'Eb',D2:'D ',Db2:'C#',C2:'C ',B1:'B '};
  const low=TUNE[p.root]||'E ';
  const isDrop=(p.root==='Db2');
  let ni=0;const rootC=[],fifthC=[];
  for(let s=0;s<16;s++){
    if(p.guit[s]){const f=p.noteSeq[ni%p.noteSeq.length];ni++;rootC.push((''+f).padEnd(2,'-'));fifthC.push((''+(isDrop?f:f+2)).padEnd(2,'-'));}
    else{rootC.push('--');fifthC.push('--');}
  }
  const empty=Array(16).fill('--').join('-');
  const gtr=['e |'+empty+'|','B |'+empty+'|','G |'+empty+'|','D |'+empty+'|','A |'+fifthC.join('-')+'|',low+'|'+rootC.join('-')+'|'].join('\n');
  const bassC=[];for(let s=0;s<16;s++)bassC.push(p.bass[s]?'0-':'--');
  const bass=low+'|'+bassC.join('-')+'|';
  const dl=(lbl,pat,sym)=>lbl+'|'+pat.map(v=>v?sym:'-').join('')+'|';
  const drums=[dl('HH',p.drum.hihat,'x'),dl('SN',p.drum.snare,'o'),dl('KK',p.drum.kick,'o')].join('\n');
  const shape=isDrop?'Drop — 1 doigt (meme case)':'Standard — quinte +2 cases';
  const TNAME={E2:'Standard E',Eb2:'Eb',D2:'D Standard',Db2:'Drop D/C#',C2:'C Standard',B1:'B Standard'};
  let leadStr='';
  if(p.lead&&p.lead!=='none'){
    const ROOT_PC={E2:4,Eb2:3,D2:2,Db2:1,C2:0,B1:11};
    const NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    let li=0;const notes=[];
    for(let s=0;s<16;s++){if(LEAD_RHY[s]){const semi=p.noteSeq[li%p.noteSeq.length]+12;li++;notes.push(NAMES[((ROOT_PC[p.root]||4)+semi)%12]);}}
    leadStr='\n\n// LEAD ('+p.lead+') — notes (octave +1):\n'+notes.join('  ');
  }
  return '// '+p.style+' · '+(TNAME[p.root]||p.root)+' · '+p.bpm+' BPM · PM=palm mute\n'+
    '// GUITARE (power chords · '+shape+')\n'+gtr+'\n\n'+
    '// BASSE (pedale de fondamentale)\n'+bass+'\n\n'+
    '// BATTERIE  (x=hihat · o=snare/kick)\n'+drums+leadStr;
}

export default function handler(req, res){
  let b = req.method === 'POST' ? req.body : (req.query || {});
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};

  const tier = b.tier || 'free';
  const style = STYLE_PAT[b.style] ? b.style : 'thrash';

  // Gating serveur : styles Elite réservés aux comptes Elite
  if (ELITE_STYLES.includes(style) && tier !== 'elite') {
    return res.status(403).json({ error: 'Style Elite — abonnement Elite requis' });
  }

  const drumKey = DRUM_PAT[b.drums] ? b.drums : 'double_kick';
  // groove importé par l'utilisateur (MIDI parsé côté client) — reste à l'utilisateur, jamais stocké
  const cd = b.customDrum;
  const customDrum = (cd && Array.isArray(cd.kick) && Array.isArray(cd.snare) && Array.isArray(cd.hihat)) ? { kick: cd.kick.slice(0, 16), snare: cd.snare.slice(0, 16), hihat: cd.hihat.slice(0, 16) } : null;
  const p = {
    style,
    bpm: Math.max(60, Math.min(280, parseInt(b.bpm) || 160)),
    root: b.tuning || 'Db2',
    dist: Math.max(10, Math.min(100, parseInt(b.dist) || 80)),
    drumKey,
    structure: STRUCTURES[b.structure] ? b.structure : 'loop',
    lead: b.lead || 'none',
    guit: TREMOLO.includes(style) ? [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] : STYLE_PAT[style],
    bass: BASS_PAT[style],
    drum: customDrum || DRUM_PAT[drumKey],
    custom: !!customDrum,
    noteSeq: NOTE_SEQ[style],
  };

  const arr = buildArrangement(p);
  const leadVoice = (p.lead && p.lead !== 'none') ? (LEAD_VOICE[p.lead] || LEAD_VOICE.synth) : null;
  // Tablature/partition : réservée Elite
  const tab = (tier === 'elite') ? buildTab(p) : '🔒 Tablature ASCII — reservee aux comptes Elite';

  return res.status(200).json({
    style: p.style, bpm: p.bpm, root: p.root, dist: p.dist,
    drumKey: p.drumKey, structure: p.structure, lead: p.lead,
    noteSeq: p.noteSeq, guit: p.guit, bass: p.bass, drum: p.drum, atmos: ATMOS.includes(p.style),
    arr, leadVoice, leadRhy: leadVoice ? LEAD_RHY : null, tab,
  });
}
