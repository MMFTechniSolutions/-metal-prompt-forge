// /api/riff.js — Logique secrète du Riff Generator (côté serveur).
// Le navigateur n'envoie que des paramètres et reçoit l'arrangement calculé.
// La bibliothèque de patterns + l'algorithme ne sont PAS exposés au client.

const STYLE_PAT = {
  thrash:   [1,0,1,0,1,0,1,0,1,1,0,1,0,1,0,1],
  death:    [1,1,0,1,1,0,1,0,1,1,0,1,1,0,1,1],
  doom:     [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
  blackened:[1,1,1,0,1,1,0,1,1,1,0,1,0,1,1,0],
  groove:   [1,0,0,1,0,1,0,0,1,0,0,1,0,0,1,0],
  rapcore:  [1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,0],
  djent:    [1,0,1,1,0,0,1,0,1,0,1,0,0,1,0,1],
  speed:    [1,0,1,0,1,1,0,1,1,0,1,0,1,1,0,1],
  slam:       [1,0,0,0,1,1,0,0,1,0,0,0,1,1,0,0],
  sludge:     [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0],
  postmetal:  [1,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0],
  grindcore:  [1,1,1,1,1,0,1,1,1,1,0,1,1,1,1,1],
  funeraldoom:[1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
  dissonant:  [1,0,1,0,0,1,1,0,1,0,0,1,0,1,0,1],
};
// Rythme de guitare ALTERNATIF (phrase B) — alterné mesure par mesure pour casser la redondance
const STYLE_PAT_B = {
  thrash:   [1,0,1,1,0,1,0,1,1,0,1,0,1,1,0,1],
  death:    [1,0,1,1,0,1,1,0,1,0,1,1,0,1,0,1],
  doom:     [1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0],
  blackened:[1,1,0,1,1,0,1,1,0,1,1,0,1,0,1,1],
  groove:   [1,0,1,0,0,1,0,1,0,0,1,0,1,0,0,1],
  rapcore:  [1,0,1,0,0,1,0,1,0,1,0,0,1,0,1,0],
  djent:    [1,0,0,1,0,1,1,0,0,1,0,1,1,0,0,1],
  speed:    [1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1],
  slam:       [1,1,0,0,1,0,0,1,1,0,0,1,1,0,0,0],
  sludge:     [1,0,0,1,0,0,0,0,1,0,0,1,0,0,0,0],
  postmetal:  [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0],
  grindcore:  [1,1,0,1,1,1,1,0,1,1,1,0,1,1,1,1],
  funeraldoom:[1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0],
  dissonant:  [1,0,0,1,1,0,1,0,0,1,1,0,1,0,1,0],
};
const BASS_PAT = {
  thrash:   [1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0],
  death:    [1,0,1,0,1,1,0,1,0,1,0,1,1,0,0,1],
  doom:     [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
  blackened:[1,0,0,1,0,0,1,0,1,0,0,1,0,0,0,1],
  groove:   [1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0],
  rapcore:  [1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0],
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
  driving:    {kick:[1,1,1,1,1,1,1,1,0,0,0,0,1,0,1,1],snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],hihat:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]},
  straight_dk:{kick:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],hihat:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]},
  bouncy:     {kick:[1,0,0,1,0,0,0,1,0,0,1,0,0,1,0,0],snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]},
  marching:   {kick:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],snare:[1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1],hihat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},
  jungle:     {kick:[1,0,1,0,0,0,0,0,0,0,0,0,1,0,0,1],snare:[0,0,1,0,1,0,0,1,0,0,1,0,0,0,1,0],hihat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},
  stomp:      {kick:[1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0],snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1],hihat:[1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0]},
  blast_china:{kick:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],snare:[0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]},
  halftime2:  {kick:[1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0],snare:[0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]},
  pocket:     {kick:[1,0,0,1,0,0,1,0,0,1,0,1,0,0,1,0],snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]},
  gallop:     {kick:[1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1],snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],hihat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]},
};
// Phrases de 16 notes (question/réponse) → le riff se développe au lieu de tourner en rond
// Phrases de 32 notes (A = question, B = réponse/développement) → moins redondant, le riff respire sur 2 mesures
const NOTE_SEQ = {
  thrash:[0,0,3,0,5,3,7,5,0,0,3,0,8,7,5,3, 0,3,5,7,5,3,0,10,8,7,5,3,7,5,3,0],
  death:[0,0,1,0,6,1,8,6,0,0,1,3,6,5,3,1, 0,1,3,1,8,6,3,1,0,6,8,6,3,1,6,0],
  doom:[0,7,5,3,0,5,3,2,0,7,8,7,5,3,2,0, 0,3,5,7,8,7,5,3,0,2,3,5,3,2,0,0],
  blackened:[0,0,1,5,0,1,6,5,0,1,5,7,6,5,1,0, 0,5,7,8,7,6,5,1,0,1,6,8,7,5,1,0],
  groove:[0,5,7,0,3,5,7,3,0,7,5,3,5,7,3,0, 0,3,0,5,3,0,7,5,0,5,3,0,7,3,5,0],
  rapcore:[0,0,5,0,3,0,5,3,0,0,5,0,3,5,0,0, 0,5,3,0,5,0,3,0,5,3,5,0,3,0,5,0],
  djent:[0,0,7,0,5,7,3,0,0,5,0,7,3,5,0,0, 0,7,0,3,0,5,0,7,3,0,5,0,7,0,3,0],
  speed:[0,3,5,7,8,7,5,3,0,5,7,10,8,7,5,0, 0,5,8,10,12,10,8,7,5,8,10,12,10,8,5,0],
  slam:[0,0,1,0,2,1,0,3,0,0,1,2,1,0,2,0, 0,1,0,3,2,1,0,2,0,3,1,0,2,1,0,0],
  sludge:[0,3,5,3,0,5,7,5,0,3,2,0,3,5,3,0, 0,5,7,8,7,5,3,0,0,3,5,3,2,0,3,0],
  postmetal:[0,7,12,7,5,7,12,10,0,5,7,12,10,7,5,0, 0,5,7,12,14,12,10,7,5,7,10,12,7,5,0,0],
  grindcore:[0,1,0,2,3,2,1,0,0,1,3,2,1,0,2,0, 0,2,3,1,0,3,2,1,0,1,2,3,1,0,2,0],
  funeraldoom:[0,0,3,0,5,3,0,0,0,0,5,3,2,0,0,0, 0,3,5,7,5,3,0,0,0,2,3,2,0,0,0,0],
  dissonant:[0,1,6,0,1,8,6,1,0,1,8,6,11,8,6,0, 0,6,8,11,8,6,1,0,0,1,11,8,6,1,8,0],
};
// #7 — sous-genres additionnels (réutilisent les patterns de base)
(function(_B){Object.assign(_B,{deathcore:_B.death,metalcore:_B.groove,melodicdeath:_B.death,melodicdeathcore:_B.death,brutaldeath:_B.death,techdeath:_B.dissonant,blackeneddeathcore:_B.blackened,numetal:_B.groove,beatdown:_B.groove,crossover:_B.thrash,hardcore:_B.thrash,deathgrind:_B.grindcore,mathcore:_B.dissonant,progmetal:_B.djent,powermetal:_B.speed,atmosblack:_B.blackened,symphonicblack:_B.blackened,blackgaze:_B.postmetal,industrial:_B.groove,gothic:_B.doom});})(STYLE_PAT);
(function(_B){Object.assign(_B,{deathcore:_B.death,metalcore:_B.groove,melodicdeath:_B.death,melodicdeathcore:_B.death,brutaldeath:_B.death,techdeath:_B.dissonant,blackeneddeathcore:_B.blackened,numetal:_B.groove,beatdown:_B.groove,crossover:_B.thrash,hardcore:_B.thrash,deathgrind:_B.grindcore,mathcore:_B.dissonant,progmetal:_B.djent,powermetal:_B.speed,atmosblack:_B.blackened,symphonicblack:_B.blackened,blackgaze:_B.postmetal,industrial:_B.groove,gothic:_B.doom});})(STYLE_PAT_B);
(function(_B){Object.assign(_B,{deathcore:_B.death,metalcore:_B.groove,melodicdeath:_B.death,melodicdeathcore:_B.death,brutaldeath:_B.death,techdeath:_B.dissonant,blackeneddeathcore:_B.blackened,numetal:_B.groove,beatdown:_B.groove,crossover:_B.thrash,hardcore:_B.thrash,deathgrind:_B.grindcore,mathcore:_B.dissonant,progmetal:_B.djent,powermetal:_B.speed,atmosblack:_B.blackened,symphonicblack:_B.blackened,blackgaze:_B.postmetal,industrial:_B.groove,gothic:_B.doom});})(BASS_PAT);
(function(_B){Object.assign(_B,{deathcore:_B.death,metalcore:_B.groove,melodicdeath:_B.death,melodicdeathcore:_B.death,brutaldeath:_B.death,techdeath:_B.dissonant,blackeneddeathcore:_B.blackened,numetal:_B.groove,beatdown:_B.groove,crossover:_B.thrash,hardcore:_B.thrash,deathgrind:_B.grindcore,mathcore:_B.dissonant,progmetal:_B.djent,powermetal:_B.speed,atmosblack:_B.blackened,symphonicblack:_B.blackened,blackgaze:_B.postmetal,industrial:_B.groove,gothic:_B.doom});})(NOTE_SEQ);
// transpose = décalage de hauteur (variété par section) · fill = roulement de snare en fin de phrase
const STRUCTURES = {
  loop:   {bars:[{},{transpose:3},{transpose:5},{fill:true}]},
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
  // CLIPS de toune — 4 sections distinctes (intro / couplet / refrain / breakdown)
  sec1: {bars:[{drum:'half_time'},{drum:'half_time'},{drum:'half_time',transpose:3},{drum:'standard',transpose:5,fill:true}]},
  sec2: {bars:[{},{},{transpose:3},{fill:true}]},
  sec3: {bars:[{transpose:5},{transpose:5},{transpose:7},{transpose:5,fill:true}]},
  sec4: {bars:[{drum:'breakdown'},{drum:'breakdown',transpose:-2},{drum:'half_time'},{drum:'breakdown',transpose:3,fill:true}]},
};
// ── TEMPS DE MESURE PAR STYLE (en pas de 16e ; 16 = 4/4, 14 = 7/8, 12 = 6/8/3-4, 20 = 5/4, 18 = 9/8, 10 = 5/8, 8 = 2/4) ──
// Fidèle aux conventions du genre. lvl:'mod' = surtout 4/4 qui groove (le mouvement vient de la batterie/des sections).
// lvl:'agg' = mesures impaires fréquentes (djent/math/prog/techdeath/dissonant vivent là-dedans).
const M44=[16];
const STYLE_META = {
  // Styles droits — 4/4 solide, le metal classique ; la variété vient du beat et des sections
  thrash:{lvl:'mod',meters:M44}, speed:{lvl:'mod',meters:M44}, crossover:{lvl:'mod',meters:M44},
  hardcore:{lvl:'mod',meters:M44}, grindcore:{lvl:'mod',meters:M44}, deathgrind:{lvl:'mod',meters:M44},
  beatdown:{lvl:'mod',meters:M44}, numetal:{lvl:'mod',meters:M44}, rapcore:{lvl:'mod',meters:M44},
  industrial:{lvl:'mod',meters:M44}, groove:{lvl:'mod',meters:M44}, metalcore:{lvl:'mod',meters:M44},
  melodicdeath:{lvl:'mod',meters:M44}, melodicdeathcore:{lvl:'mod',meters:M44},
  brutaldeath:{lvl:'mod',meters:M44}, slam:{lvl:'mod',meters:M44}, death:{lvl:'mod',meters:M44},
  deathcore:{lvl:'mod',meters:[16,16,16,8]},               // coupures 2/4 sur les breakdowns
  blackeneddeathcore:{lvl:'mod',meters:[16,16,16,14]},     // teinte 7/8 occasionnelle
  // Racines blues/doom + atmosphère — feel 6/8 / 12/8 récurrent
  doom:{lvl:'mod',meters:[16,16,12]}, funeraldoom:{lvl:'mod',meters:[16,16,12]},
  sludge:{lvl:'mod',meters:[16,16,12]}, gothic:{lvl:'mod',meters:[16,16,12]},
  powermetal:{lvl:'mod',meters:[16,16,12]},                // galop 4/4 + envolées 6/8
  blackened:{lvl:'mod',meters:[16,16,12]}, atmosblack:{lvl:'mod',meters:[16,16,12]},
  symphonicblack:{lvl:'mod',meters:[16,16,12]},
  blackgaze:{lvl:'mod',meters:[16,16,12,20]}, postmetal:{lvl:'mod',meters:[16,16,12,20]}, // builds post-rock
  // Styles techniques — mesures impaires fréquentes, changements de mesure dans la toune
  djent:{lvl:'agg',meters:[16,14,20,10,12]},               // 7/8, 5/4, 5/8, polymétrie
  techdeath:{lvl:'agg',meters:[16,14,12,20,18]},
  mathcore:{lvl:'agg',meters:[12,14,10,16,18,20]},         // chaos, se pose rarement en 4/4
  progmetal:{lvl:'agg',meters:[16,14,20,12,18]},
  dissonant:{lvl:'agg',meters:[16,14,18,12,20]},
};
function rpick(arr){return arr[Math.floor(Math.random()*arr.length)];}
// Choisit la mesure d'une barre : structure d'abord, sinon selon le style (avec hasard léger par génération)
function meterFor(meta,bi,prev){
  if(meta.lvl==='agg'){
    let n=rpick(meta.meters),g=0;
    while(n===prev && meta.meters.length>1 && g++<4) n=rpick(meta.meters); // évite de répéter la même mesure
    return n;
  }
  const alt=meta.meters.filter(x=>x!==16);
  if(alt.length && (bi%2===1) && Math.random()<0.4) return rpick(alt);     // teinte occasionnelle
  return 16;
}
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

function varyDrum(dp){
  const k=dp.kick.slice();
  if(!k[7])k[7]=1;            // pickup avant la caisse claire du milieu
  if(!k[15])k[15]=1;          // pickup en fin de mesure (relance)
  return {kick:k,snare:dp.snare,hihat:dp.hihat};
}
function rint(n){return Math.floor(Math.random()*n);}
// VARIÉTÉ DE BEAT — variation aléatoire par mesure (kicks syncopés, relances, hi-hat) tout en gardant
// le groove signature (backbeat de caisse, murs de blast). Chaque génération = un pattern différent.
function spiceDrum(dp, aggr){
  aggr = (aggr==null)?0.5:aggr;
  const kick=dp.kick.slice(), snare=dp.snare.slice(), hihat=dp.hihat.slice();
  const kdens=kick.reduce((a,b)=>a+b,0);
  // Kicks syncopés (le groove metal vient des kicks) — seulement si pas déjà saturé (blast/double kick)
  if(kdens<9){
    const addK = 1 + rint(aggr>0.6?3:2);
    for(let a=0;a<addK;a++){ const s=1+rint(15); if(!snare[s]) kick[s]=1; }
    if(Math.random()<0.45){ const cand=[]; for(let s=1;s<16;s++) if(kick[s]&&!snare[s]&&s!==8) cand.push(s); if(cand.length) kick[cand[rint(cand.length)]]=0; }
  }
  if(Math.random()<0.85) kick[0]=1;                       // garde le temps 1 la plupart du temps
  // Caisse claire : garde le backbeat, ajoute parfois UNE relance juste avant
  if(Math.random()<0.28){ const back=[]; for(let s=0;s<16;s++) if(snare[s]) back.push(s); if(back.length){ const t=back[rint(back.length)]-1; if(t>0 && !snare[t]) snare[t]=1; } }
  // Hi-hat : varie le motif (garde / croches / doubles-croches) sans casser un mur de hats
  const hdens=hihat.reduce((a,b)=>a+b,0);
  if(hdens<16){
    const hmode=rint(3);
    if(hmode===1) for(let s=0;s<16;s++) hihat[s]=(s%2===0)?1:0;
    else if(hmode===2) for(let s=0;s<16;s++) hihat[s]=1;
  }
  if(Math.random()<0.4){ const s=rint(16); hihat[s]=hihat[s]?0:1; }
  return {kick,snare,hihat};
}
// Multiplicateur de tempo par type de beat (si l'option est activée) → sections lentes/rapides pour de vrai
const TEMPO_BY_DRUM={half_time:0.8,halftime2:0.8,halfgroove:0.85,doom:0.7,funeraldoom:0.65,breakdown:0.85,stomp:0.85,slam:0.9,marching:0.85,blast_beat:1.25,gravity:1.3,bombblast:1.3,blast_china:1.25,double_kick:1.12,straight_dk:1.15,gallop:1.12,thrash:1.1,skank:1.18,driving:1.12};
function buildArrangement(p){
  const st=STRUCTURES[p.structure]||STRUCTURES.loop;
  const meta=STYLE_META[p.style]||{lvl:'mod',meters:M44};
  const out={guit:[],bass:[],kick:[],snare:[],hihat:[],trans:[],tempo:[],L:0};
  let prevN=16;
  st.bars.forEach((bar,bi)=>{
    let dp = p.custom ? p.drum : (DRUM_PAT[bar.drum||p.drumKey]||p.drum);
    if(!p.custom){
      // Styles techniques : vrai switch de beat sur les sections transposées (la mélodie monte → le beat change)
      if(!bar.drum && meta.lvl==='agg' && bar.transpose){
        const swap = DRUM_PAT[ p.drumKey==='blast_beat' ? 'double_kick' : 'blast_beat' ];
        if(swap) dp = swap;
      }
      // VARIÉTÉ : chaque mesure reçoit une variation aléatoire → jamais deux générations pareilles
      dp = spiceDrum(dp, meta.lvl==='agg' ? 0.75 : 0.5);
    }
    const useB = (bar.g==='B') || (bar.g!=='A' && bi%2===1);
    const gp = (useB && p.guitB) ? p.guitB : p.guit;               // rythme de guitare A/B
    const tr=bar.transpose||0;
    const n = bar.steps || meterFor(meta,bi,prevN);                // structure d'abord, sinon mesure selon le style
    prevN=n;
    const dkey = bar.drum||p.drumKey;
    const tmul = p.tempoVar ? (TEMPO_BY_DRUM[dkey]||1) : 1;         // vitesse de la section (option changements de tempo)
    const fillType = (!p.custom && bar.fill) ? (1+rint(3)) : 0;    // fill varié (jamais sur un groove MIDI importé)
    for(let i=0;i<n;i++){
      const j=i%16;
      out.guit.push(gp[j]);out.bass.push(p.bass[j]);
      let kk=dp.kick[j], sn=dp.snare[j], hh=dp.hihat[j];
      if(fillType && i >= n-4){
        if(fillType===1){ sn=1; }                                    // roulement de caisse (16e)
        else if(fillType===2){ sn=(i%2===0)?1:0; kk=(i%2===1)?1:0; } // kick/caisse alternés
        else { sn=(i===n-4||i>=n-2)?1:0; kk=(i===n-3)?1:0; }         // fill espacé
      }
      out.kick.push(kk); out.snare.push(sn); out.hihat.push(hh);
      out.trans.push(tr); out.tempo.push(tmul);
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

// Prompt Suno optimisé qui FIT le beat généré (recette secrète, côté serveur)
function buildPrompt(p){
  const G={thrash:'thrash metal',death:'death metal',doom:'doom metal',blackened:'black metal',groove:'groove metal',djent:'djent',speed:'speed metal',slam:'slam metal',sludge:'sludge metal',postmetal:'post-metal',grindcore:'grindcore',funeraldoom:'funeral doom',dissonant:'dissonant death metal',rapcore:'rap metal',deathcore:'deathcore',metalcore:'metalcore',melodicdeath:'melodic death metal',melodicdeathcore:'melodic deathcore',brutaldeath:'brutal death metal',techdeath:'technical death metal',blackeneddeathcore:'blackened deathcore',numetal:'nu-metal',beatdown:'beatdown hardcore',crossover:'crossover thrash',hardcore:'hardcore punk',deathgrind:'deathgrind',mathcore:'mathcore',progmetal:'progressive metal',powermetal:'power metal',atmosblack:'atmospheric black metal',symphonicblack:'symphonic black metal',blackgaze:'blackgaze',industrial:'industrial metal',gothic:'gothic metal'};
  const D={standard:'steady drums',double_kick:'double bass drumming',blast_beat:'blast beats',half_time:'half-time groove',breakdown:'breakdown',gravity:'gravity blast beats',thrash:'thrash beat',deathcore:'deathcore groove',dbeat:'d-beat',groove:'groovy drums',two_step:'two-step beat',bounce:'bounce groove',slam:'slam beat',mathcore:'mathcore drums',doom:'doom drums',skank:'skank beat',bombblast:'bomb blast beats',halfgroove:'half-time groove',tribal:'tribal toms',driving:'driving double bass',straight_dk:'straight double kick',bouncy:'bouncy groove',marching:'marching snare',jungle:'tribal toms',stomp:'stomp breakdown',blast_china:'blast beats with china cymbals',halftime2:'heavy half-time',pocket:'pocket groove',gallop:'galloping drums'};
  const T={E2:'standard E tuning',Eb2:'Eb tuning',D2:'D standard tuning',Db2:'drop C# tuning',C2:'C standard tuning',B1:'B standard tuning'};
  const bpm=p.bpm;
  const tempo=bpm>=210?'blistering fast tempo':bpm>=170?'fast tempo':bpm>=120?'mid-tempo':bpm>=90?'slow groovy tempo':'slow doom tempo';
  // Saveur par style — vocabulaire pointu qui pousse Suno dans le bon stock (incl. termes de scène)
  const FLAVOR={
    thrash:['fast tremolo picking','relentless aggression'],
    death:['guttural growls','brutal tremolo riffs'],
    doom:['crushing slow riffs','heavy doom atmosphere'],
    blackened:['tremolo picking','raw kvlt production','icy atmosphere'],
    groove:['syncopated headbang groove','thick mid-range'],
    djent:['polyrhythmic chugs','8-string guitar','tight staccato'],
    speed:['galloping riffs','high-octane energy'],
    slam:['slamming breakdowns','sub-heavy brutality'],
    sludge:['feedback-drenched','sludgy fuzz'],
    postmetal:['atmospheric build-up','cinematic dynamics'],
    grindcore:['chaotic blast beats','raw intensity'],
    funeraldoom:['funeral atmosphere','monolithic slow riffs'],
    dissonant:['dissonant chords','unsettling tension'],
    rapcore:['bouncy syncopated groove','nu-metal energy'],
    deathcore:['crushing breakdowns','chugging riffs'],metalcore:['melodic riffs','breakdown chugs'],melodicdeath:['harmonized melodic leads','tremolo riffs'],melodicdeathcore:['melodic leads','crushing breakdowns'],brutaldeath:['relentless brutal riffs','blast beats'],techdeath:['complex technical riffs','dissonant sweeps'],blackeneddeathcore:['blackened tremolo','devastating breakdowns'],numetal:['bouncy down-tuned groove','syncopated chugs'],beatdown:['heavy mosh groove','two-step chug'],crossover:['punk thrash energy','fast riffs'],hardcore:['raw punk aggression','shout-along riffs'],deathgrind:['blast-driven brutality','grinding riffs'],mathcore:['chaotic angular riffs','start-stop chaos'],progmetal:['intricate progressive riffs','odd time signatures'],powermetal:['galloping melodic riffs','soaring leads'],atmosblack:['atmospheric tremolo wall','cold ambience'],symphonicblack:['orchestral black metal','epic tremolo'],blackgaze:['shimmering tremolo wall','dreamy reverb'],industrial:['mechanical groove','cold electronic edge'],gothic:['slow heavy romantic riffs','dark melody'],
  };
  // Pépite Suno : 4-7 descripteurs FOCUS battent 15 éparpillés. Genre en premier (ancrage fort).
  // SCÈNES GÉO (signature régionale secrète, du doc encyclopédie)
  const SCENE_DB={
    norwegian:{p:'norwegian',t:['raw lo-fi black metal production','continuous tremolo picking','icy abrasive tone']},
    finnish:{p:'finnish',t:['cavernous death-doom atmosphere','crude analog production','crushing slow dread']},
    swedish:{p:'swedish',t:['HM-2 buzzsaw guitar tone','melodic death harmonies','d-beat drive']},
    german:{p:'german',t:['teutonic thrash aggression','dry martial production','relentless tight downpicking']},
    american:{p:'american',t:['polished modern production','tight scooped-mid guitars','punchy groove']},
    canadian:{p:'canadian',t:['technical progressive death edge','crisp modern production','dissonant precision']},
    quebecois:{p:'québécois',t:['raw underground cold atmosphere','frostbitten tremolo','lo-fi grimness']},
    bayarea:{p:'Bay Area',t:['fast relentless downpicked thrash','tight palm-muted tritone power chords','skank beat into sudden half-time china breakdowns','scooped-mid crossover crunch']},
    florida:{p:'Florida',t:['Morrisound death metal clarity and punch','triggered machine-gun blast beats','phrygian harmonic-minor death riffs','chromatic octave-glide tremolo']},
    stockholm:{p:'Stockholm',t:['low 8-string djent chugs','asymmetrical polymetric riffing in 7/8 and 17/16','razor-tight noise-gated staccato','kick desynced over a steady 4/4 backbeat']},
    gothenburg:{p:'Gothenburg',t:['twin-guitar harmonized leads in thirds and sixths','HM-2 buzzsaw guitar tone','melodic aeolian tremolo riffs','d-beat and double-kick cavalcades']},
    neoclassical:{p:'European neoclassical',t:['neoclassical sweep-picked arpeggios','harmonic-minor and phrygian-dominant runs','baroque pedal-point shredding','ternary 6/8 triplet feel']},
    nola:{p:'NOLA',t:['swampy feedback-drenched sludge','southern groove','filthy down-tuned riffs']},
    french:{p:'French',t:['shimmering textural tremolo wall','lush add9 and maj7 open chords','atmospheric drowned blast beats','post-rock to blast dynamic swells']},
    brazilian:{p:'Brazilian',t:['raw chaotic proto-black savagery','savage lo-fi production','primitive blast assault']},
  };
  const _sc=SCENE_DB[p.scene];
  const genre=(_sc?_sc.p+' ':'')+(G[p.style]||'metal');
  // Formule verifiee Suno : sous-genre + elements + VOIX + MIX + MOOD, genre ancre debut ET fin
  const VOX={thrash:'raspy aggressive male vocals',death:'guttural death growls',doom:'deep doom vocals',blackened:'black metal shrieks',groove:'powerful mid-range growls',djent:'mid-range harsh vocals',speed:'high-pitched aggressive vocals',slam:'ultra-low guttural vocals',sludge:'raw screaming vocals',postmetal:'distant atmospheric vocals',grindcore:'high-low screaming vocals',funeraldoom:'agonized low growls',dissonant:'tortured growls',rapcore:'aggressive rapped vocals',deathcore:'guttural growls and high screams',metalcore:'harsh screams with clean hooks',melodicdeath:'melodic death growls',melodicdeathcore:'growls with clean choruses',brutaldeath:'deep guttural growls',techdeath:'guttural death growls',blackeneddeathcore:'guttural growls and blackened shrieks',numetal:'aggressive shouted vocals',beatdown:'hardcore beatdown shouts',crossover:'shouted punk vocals',hardcore:'raw hardcore shouts',deathgrind:'guttural and shrieked vocals',mathcore:'frantic screamed vocals',progmetal:'mixed clean and harsh vocals',powermetal:'soaring clean high vocals',atmosblack:'distant blackened shrieks',symphonicblack:'theatrical blackened shrieks',blackgaze:'distant screamed vocals',industrial:'distorted harsh vocals',gothic:'deep baritone vocals'};
  const MIX={blackened:'raw kvlt production',grindcore:'raw punishing production',sludge:'thick abrasive production',funeraldoom:'cavernous production',doom:'vintage heavy production',dissonant:'dense aggressive production'};
  const MOOD={thrash:'aggressive and relentless',death:'brutal and dark',doom:'crushing and bleak',blackened:'cold and sinister',groove:'groovy and headbang-worthy',djent:'technical and precise',speed:'high-octane',slam:'violent and pit-ready',sludge:'filthy and abrasive',postmetal:'epic and cinematic',grindcore:'chaotic and violent',funeraldoom:'funereal and monolithic',dissonant:'unsettling and dark',rapcore:'bouncy and aggressive'};
  const vox=VOX[p.style]||'aggressive harsh male vocals';
  const mix=MIX[p.style]||'modern polished mix, scooped mids, tight bass';
  const mood=MOOD[p.style]||'dark and aggressive';
  const flav=(FLAVOR[p.style]||['chugging riffs','downtuned']).slice(0, _sc?1:2);
  const scTags=_sc?_sc.t.slice(0,3):[];
  const tags=[genre, T[p.root]||'', bpm+' BPM '+tempo, D[p.drumKey]||'heavy drums', ...flav, ...scTags, vox, mix, 'very loud guitars and drums', mood, genre];
  return tags.filter(Boolean).join(', ');
}

// MODE AUTO — déduit les paramètres du riff depuis le prompt texte (recette protégée serveur).
// Aucun nom de groupe : uniquement genres, scènes, lieux, tempos, accordages, grooves.
const FREE_SUB={slam:'death',sludge:'doom',postmetal:'blackgaze',grindcore:'deathgrind',funeraldoom:'doom',dissonant:'techdeath'};
function parsePrompt(text){
  const t=(' '+(text||'').toLowerCase()+' ');
  const has=(...ws)=>ws.some(w=>t.includes(w));
  // genre — du plus spécifique au plus général (l'ordre compte)
  const STYLE_KW=[
    ['blackeneddeathcore','blackened deathcore'],['melodicdeathcore','melodic deathcore'],
    ['deathcore','deathcore'],['metalcore','metalcore'],
    ['melodicdeath','melodic death','melodeath','gothenburg'],
    ['brutaldeath','brutal death'],['techdeath','technical death','tech death'],
    ['deathgrind','deathgrind','goregrind'],['grindcore','grindcore','grind'],
    ['dissonant','dissonant','dissonance'],['funeraldoom','funeral doom'],
    ['sludge','sludge'],['doom','doom'],
    ['postmetal','post-metal','post metal'],['blackgaze','blackgaze'],
    ['djent','djent','thall'],['progmetal','progressive metal','prog metal'],
    ['powermetal','power metal'],['symphonicblack','symphonic black'],
    ['atmosblack','atmospheric black'],['blackened','black metal','blackened','kvlt'],
    ['slam','slam'],['numetal','nu-metal','nu metal'],['beatdown','beatdown'],
    ['hardcore','hardcore'],['crossover','crossover'],['mathcore','mathcore'],
    ['industrial','industrial'],['gothic','gothic'],['speed','speed metal'],
    ['groove','groove metal'],['death','death metal','brutal death','death'],
    ['thrash','thrash'],
  ];
  let style='thrash';
  for(const row of STYLE_KW){const st=row[0];if(row.slice(1).some(k=>t.includes(k))){style=st;break;}}
  // scène régionale (lieux + signatures, pas de noms de groupes)
  const SCENE_KW={
    bayarea:['bay area','san francisco'],florida:['florida','tampa','morrisound'],
    stockholm:['stockholm','polymetric','polymeter','polyrythm','8-string','8 string'],
    gothenburg:['gothenburg','goteborg','melodic death','melodeath','buzzsaw'],
    neoclassical:['neoclassical','neo-classical','baroque','sweep picking','sweeps'],
    norwegian:['norwegian','norway'],finnish:['finnish','finland'],
    swedish:['swedish','sweden','hm-2','hm2'],german:['german','germany','teutonic'],
    canadian:['canadian','canada','quebec','quebec'],nola:['nola','new orleans','louisiana'],
    brazilian:['brazil','brazilian'],french:['french','blackgaze'],american:['american']
  };
  let scene='';
  for(const k in SCENE_KW){if(SCENE_KW[k].some(w=>t.includes(w))){scene=k;break;}}
  // tempo
  let bpm=160;const m=t.match(/(\d{2,3})\s*bpm/);
  if(m){bpm=parseInt(m[1]);}
  else if(has('hyperblast','blistering','260','280')) bpm=240;
  else if(has('blast')) bpm=210;
  else if(has('fast','rapide','uptempo','up-tempo','speed')) bpm=185;
  else if(has('mid-tempo','midtempo','mid tempo','groovy','bounce')) bpm=120;
  else if(has('slow','doom','funeral','crawl','lent','sludge')) bpm=80;
  bpm=Math.max(60,Math.min(280,bpm));
  // accordage
  let tuning='Db2';
  if(has('8-string','8 string','f# standard','f standard','drop g','drop f')) tuning='B1';
  else if(has('b standard','7-string','7 string','drop a','drop b')) tuning='B1';
  else if(has('c standard','drop c')) tuning='C2';
  else if(has('d standard','drop d')) tuning='D2';
  else if(has('eb','e flat','d# standard','half step down','half-step down')) tuning='Eb2';
  else if(has('e standard','standard e','open e')) tuning='E2';
  // groove batterie
  let drumKey='double_kick';
  if(has('blast')) drumKey='blast_beat';
  else if(has('breakdown')) drumKey='breakdown';
  else if(has('d-beat','dbeat','d beat')) drumKey='dbeat';
  else if(has('gallop','galloping')) drumKey='gallop';
  else if(has('half-time','halftime','half time')) drumKey='half_time';
  else if(has('skank','grind')) drumKey='skank';
  else if(has('slam')) drumKey='slam';
  else if(has('two-step','two step')) drumKey='two_step';
  else if(has('groove','bounce')) drumKey='groove';
  // structure — le beat SUIT une structure de toune (sections) par défaut, pas une simple boucle
  let structure='versechorus';
  if(has('full song','complete song','toune compl','intro','outro','bridge')) structure='fullsong';
  else if(has('breakdown')) structure='vbd';
  else if(has('build','crescendo','buildup','intro to')) structure='buildup';
  else if(has('blast assault','wall of blast','all-out blast')) structure='blastassault';
  else if(has('doom','funeral','crawl')) structure='doomcrawl';
  else if(has('verse','chorus','couplet','refrain')) structure='versechorus';
  if(has('loop','boucle','one bar','1 bar','single bar','riff only','just a riff')) structure='loop';
  return {style,scene,bpm,tuning,drumKey,structure};
}

export default function handler(req, res){
  let b = req.method === 'POST' ? req.body : (req.query || {});
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};

  const tier = b.tier || 'free';

  // MODE AUTO : déduit tout depuis le prompt texte (recette protégée)
  let auto = null;
  if (b.auto && typeof b.promptText === 'string') {
    auto = parsePrompt(b.promptText);
    if (ELITE_STYLES.includes(auto.style) && tier !== 'elite' && tier !== 'eliteplus') {
      auto.style = FREE_SUB[auto.style] || 'death';   // substitut libre, pas de 403 en auto
    }
  }

  const style = auto ? auto.style : (STYLE_PAT[b.style] ? b.style : 'thrash');

  // Gating serveur : styles Elite réservés aux comptes Elite (mode manuel)
  if (!auto && ELITE_STYLES.includes(style) && tier !== 'elite' && tier !== 'eliteplus') {
    return res.status(403).json({ error: 'Style Elite — abonnement Elite requis' });
  }

  const drumKey = auto ? auto.drumKey : (DRUM_PAT[b.drums] ? b.drums : 'double_kick');
  const SECTION = {1:'sec1',2:'sec2',3:'sec3',4:'sec4'};
  const secKey = SECTION[parseInt(b.section)] || null;
  // groove importé par l'utilisateur (MIDI parsé côté client) — reste à l'utilisateur, jamais stocké
  const cd = b.customDrum;
  const customDrum = (cd && Array.isArray(cd.kick) && Array.isArray(cd.snare) && Array.isArray(cd.hihat)) ? { kick: cd.kick.slice(0, 16), snare: cd.snare.slice(0, 16), hihat: cd.hihat.slice(0, 16) } : null;
  const p = {
    style,
    bpm: auto ? auto.bpm : Math.max(60, Math.min(280, parseInt(b.bpm) || 160)),
    root: auto ? auto.tuning : (b.tuning || 'Db2'),
    dist: Math.max(10, Math.min(100, parseInt(b.dist) || 80)),
    drumKey,
    structure: secKey ? secKey : (auto ? auto.structure : (STRUCTURES[b.structure] ? b.structure : 'loop')),
    lead: b.lead || 'none',
    scene: auto ? auto.scene : (b.scene || '').toLowerCase(),
    guit: TREMOLO.includes(style) ? [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] : STYLE_PAT[style],
    guitB: TREMOLO.includes(style) ? [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] : (STYLE_PAT_B[style]||STYLE_PAT[style]),
    bass: BASS_PAT[style],
    drum: customDrum || DRUM_PAT[drumKey],
    custom: !!customDrum,
    noteSeq: NOTE_SEQ[style],
    tempoVar: !!(auto ? (b.tempoVar||b.promptText&&/tempo change|change de tempo|dynamic tempo|accel|ritard|slow to fast|fast to slow/i.test(b.promptText)) : b.tempoVar),
  };

  const arr = buildArrangement(p);
  const leadVoice = (p.lead && p.lead !== 'none') ? (LEAD_VOICE[p.lead] || LEAD_VOICE.synth) : null;
  // Tablature/partition : réservée Elite
  const tab = (tier === 'elite' || tier === 'eliteplus') ? buildTab(p) : '🔒 Tablature ASCII — reservee aux comptes Elite';

  return res.status(200).json({
    style: p.style, bpm: p.bpm, root: p.root, dist: p.dist, scene: p.scene,
    drumKey: p.drumKey, structure: p.structure, lead: p.lead,
    noteSeq: p.noteSeq, guit: p.guit, bass: p.bass, drum: p.drum, atmos: ATMOS.includes(p.style),
    arr, leadVoice, leadRhy: leadVoice ? LEAD_RHY : null, tab,
  });
}
