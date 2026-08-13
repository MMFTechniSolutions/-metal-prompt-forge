#!/usr/bin/env node
/**
 * MetalPrompt — patch d'enrichissement des sous-genres
 *
 * Usage :   node patch-genres.mjs
 *           (à lancer à la RACINE du projet, où il y a src/App.jsx)
 *
 * Ce que ça fait :
 *   1. Backup  → src/App.jsx.bak-<timestamp>
 *   2. Insère 46 sous-genres dans GENRE_FAMILIES (par époque)
 *   3. Crée    → src/genreProfiles.js  (profils pour /api/profile)
 *
 * Idempotent : relancer ne duplique rien.
 * Pour annuler : mv src/App.jsx.bak-<timestamp> src/App.jsx
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const APP = resolve('src/App.jsx');
const PROFILES = resolve('src/genreProfiles.js');

if (!existsSync(APP)) {
  console.error('❌ src/App.jsx introuvable. Lance le script à la racine du projet.');
  process.exit(1);
}

/* ── Les ajouts, ancrés sur une ligne unique de chaque époque ── */
const PATCHES = [
  {
    era: 'Années 60-70',
    anchor: '{g:"proto-metal",req:"forge"},',
    add: [
      '{g:"acid rock",req:"forge"},',
      '{g:"southern rock",req:"forge"},',
      '{g:"occult rock",req:"forge"},',
      '{g:"krautrock",req:"forge"},',
    ],
  },
  {
    era: 'Années 80',
    anchor: '{g:"grindcore",req:"forge"},',
    add: [
      '{g:"bay area thrash",req:"forge"},',
      '{g:"teutonic thrash",req:"forge"},',
      '{g:"epic doom metal",req:"forge"},',
      '{g:"first wave black metal",req:"forge"},',
      '{g:"speed thrash",req:"forge"},',
      '{g:"gothic rock",req:"forge"},',
      '{g:"industrial rock",req:"forge"},',
    ],
  },
  {
    era: 'Années 90',
    anchor: '{g:"stoner metal",req:"forge"},',
    add: [
      '{g:"old school death metal",req:"free"},',
      '{g:"death-doom",req:"forge"},',
      '{g:"raw black metal",req:"forge"},',
      '{g:"symphonic black metal",req:"forge"},',
      '{g:"melodic black metal",req:"forge"},',
      '{g:"pagan metal",req:"forge"},',
      '{g:"gothic doom",req:"forge"},',
      '{g:"stoner doom",req:"forge"},',
      '{g:"melodic hardcore",req:"forge"},',
    ],
  },
  {
    era: 'Années 2000',
    anchor: '{g:"depressive black metal",req:"elite"},',
    add: [
      '{g:"technical brutal death metal",req:"forge"},',
      '{g:"cavernous death metal",req:"forge"},',
      '{g:"war metal",req:"forge"},',
      '{g:"metallic hardcore",req:"forge"},',
      '{g:"cybergrind",req:"forge"},',
      '{g:"nu metalcore",req:"forge"},',
      '{g:"deathrock",req:"forge"},',
    ],
  },
  {
    era: 'Années 2010',
    anchor: '{g:"technical deathcore",req:"forge"},',
    add: [
      '{g:"downtempo deathcore",req:"free"},',
      '{g:"beatdown deathcore",req:"forge"},',
      '{g:"thrash revival",req:"forge"},',
      '{g:"trad doom revival",req:"forge"},',
      '{g:"blackened hardcore",req:"forge"},',
      '{g:"dissonant black metal",req:"forge"},',
    ],
  },
  {
    era: 'Années 2020',
    anchor: '{g:"modern alternative metal",req:"forge"},',
    add: [
      '{g:"trap metal",req:"forge"},',
      '{g:"rage metalcore",req:"forge"},',
      '{g:"nu-deathcore",req:"forge"},',
      '{g:"hyperpop metalcore",req:"forge"},',
      '{g:"dark hardcore",req:"forge"},',
      '{g:"neo-crust",req:"forge"},',
      '{g:"cinematic deathcore",req:"forge"},',
    ],
  },
  {
    era: 'Fusion',
    anchor: '{g:"drum and bass",req:"forge"},',
    add: [
      '{g:"dungeon synth",req:"forge"},',
      '{g:"witch house",req:"forge"},',
      '{g:"breakcore",req:"forge"},',
      '{g:"phonk",req:"forge"},',
      '{g:"noise",req:"forge"},',
      '{g:"drill",req:"forge"},',
    ],
  },
];

let src = readFileSync(APP, 'utf8');
const original = src;
let inserted = 0, skipped = 0;
const problems = [];

for (const p of PATCHES) {
  const already = p.add.filter(a => src.includes(a));
  if (already.length === p.add.length) {
    console.log(`⏭  ${p.era} — déjà appliqué`);
    skipped++;
    continue;
  }
  if (already.length > 0) {
    problems.push(`${p.era} : partiellement appliqué (${already.length}/${p.add.length}) — je saute, vérifie à la main`);
    continue;
  }
  const i = src.indexOf(p.anchor);
  if (i === -1) {
    problems.push(`${p.era} : ancre introuvable → ${p.anchor}`);
    continue;
  }
  const end = i + p.anchor.length;
  src = src.slice(0, end) + '\n    ' + p.add.join('') + src.slice(end);
  console.log(`✅ ${p.era} — ${p.add.length} genres ajoutés`);
  inserted += p.add.length;
}

if (problems.length) {
  console.log('\n⚠️  À vérifier :');
  problems.forEach(m => console.log('   • ' + m));
}

if (src !== original) {
  const bak = APP + '.bak-' + Date.now();
  copyFileSync(APP, bak);
  writeFileSync(APP, src, 'utf8');
  console.log(`\n💾 Backup : ${bak}`);
  console.log(`✅ src/App.jsx patché — ${inserted} genres ajoutés.`);
} else if (skipped === PATCHES.length) {
  console.log('\n✅ Rien à faire, tout est déjà en place.');
} else {
  console.log('\n⚠️  Aucune modification écrite dans App.jsx.');
}

/* ── Profils serveur ── */
const profilesFile = `/**
 * MetalPrompt — profils par sous-genre (généré par patch-genres.mjs)
 * À importer dans /api/profile.
 *
 * La formule qui marche dans Suno v5.5 :
 *   sous-genre + BPM + accordage + feel rythmique + voix + production
 * L'accordage et le feel rythmique discriminent autant que le riff.
 *
 * \`exclude\` alimente l'ÉTAPE 4 (tags négatifs) automatiquement.
 * Aucun nom d'artiste réel — conforme aux règles Suno du 6 août 2026.
 */

export const GENRE_PROFILES = {
  // ── RACINES ──
  "acid rock":{bpm:[110,140],tuning:["standard E tuning"],drums:["bluesy shuffle","big room toms"],guitar:["fuzz riffs","wah-wah leads","pentatonic riffs"],vocals:["psychedelic vocals","raw rock vocals"],mood:["dreamy and ethereal"],heavy:4,groove:7,chaos:5,melody:7,exclude:["growl","blast beats","triggered drums","modern metal production"]},
  "southern rock":{bpm:[100,135],tuning:["standard E tuning","drop D tuning"],drums:["bluesy shuffle","swing groove"],guitar:["bluesy bends","dual guitar harmonies","pentatonic riffs"],vocals:["soulful clean singing","raw rock vocals"],mood:["warm and hopeful","groovy and headbang-worthy"],heavy:4,groove:8,chaos:2,melody:8,exclude:["growl","blast beats","drop-tuned riffs","clean digital production"]},
  "occult rock":{bpm:[95,125],tuning:["standard E tuning"],drums:["big room toms","bluesy shuffle"],guitar:["fuzz riffs","vintage overdrive licks"],vocals:["soulful clean singing","ritual chant"],mood:["sinister and dark","bittersweet and nostalgic"],heavy:5,groove:7,chaos:3,melody:7,exclude:["growl","blast beats","modern metal production","djent"]},
  "krautrock":{bpm:[110,140],tuning:["standard E tuning"],drums:["four-on-the-floor","straight rock beat"],guitar:["fuzz riffs","vintage overdrive licks"],vocals:["spoken word narration","psychedelic vocals"],mood:["serene and expansive","dreamy and ethereal"],heavy:3,groove:8,chaos:4,melody:6,exclude:["growl","blast beats","breakdown chugs","modern metal production"]},

  // ── ANNÉES 80 ──
  "bay area thrash":{bpm:[180,220],tuning:["standard E tuning"],drums:["thrash beat","skank beat","double bass drumming"],guitar:["palm muting","tremolo picking","dual guitar harmonies"],vocals:["raspy harsh vocals","gang shouts"],mood:["intense and aggressive","chaotic and frantic"],heavy:7,groove:6,chaos:7,melody:5,exclude:["guttural death growls","blast beats","drop-tuned riffs","atmospheric reverb-heavy mix"]},
  "teutonic thrash":{bpm:[190,230],tuning:["standard E tuning"],drums:["skank beat","thrash beat","blast beats"],guitar:["tremolo picking","palm muting"],vocals:["raspy harsh vocals","high-pitched screams"],mood:["raw and abrasive","dark and menacing"],heavy:8,groove:4,chaos:9,melody:2,exclude:["clean vocals","polished production","melodic","orchestral"]},
  "epic doom metal":{bpm:[85,125],tuning:["drop D tuning"],drums:["half-time groove","tom-heavy fills","tribal toms"],guitar:["palm muting","melodic lead harmonies"],vocals:["heavy metal wails","doom clean chants","baritone"],mood:["epic","majestic and grandiose"],heavy:7,groove:5,chaos:2,melody:8,exclude:["blast beats","breakdown chugs","djent","electronic"]},
  "first wave black metal":{bpm:[160,200],tuning:["standard E tuning"],drums:["thrash beat","d-beat"],guitar:["tremolo picking","palm muting"],vocals:["raspy harsh vocals","black metal shrieks"],mood:["sinister and dark","raw and abrasive"],heavy:6,groove:5,chaos:7,melody:4,exclude:["clean digital production","breakdown chugs","djent","orchestral"]},
  "speed thrash":{bpm:[195,235],tuning:["standard E tuning"],drums:["thrash beat","double bass drumming","galloping drums"],guitar:["tremolo picking","galloping riffs","melodic shred solos"],vocals:["high-pitched screams","falsetto screams"],mood:["chaotic and frantic","intense and aggressive"],heavy:7,groove:5,chaos:8,melody:5,exclude:["guttural death growls","half-time groove","atmospheric reverb-heavy mix"]},
  "gothic rock":{bpm:[100,135],tuning:["standard E tuning"],drums:["straight rock beat","tribal toms"],guitar:["ambient lead textures","open string riffs"],vocals:["baritone","melodic clean singing"],mood:["melancholic and doux-amer","sinister and dark"],heavy:3,groove:6,chaos:2,melody:8,exclude:["growl","blast beats","breakdown chugs","aggressive mix"]},
  "industrial rock":{bpm:[105,140],tuning:["drop D tuning"],drums:["programmed drums","four-on-the-floor"],guitar:["palm muting","drop-tuned riffs"],vocals:["vocal distortion","aggressive rap vocals"],mood:["dark and menacing"],heavy:6,groove:8,chaos:4,melody:5,exclude:["organic acoustic kit","analog warm tone","acoustic guitar","blues"]},

  // ── ANNÉES 90 ──
  "old school death metal":{bpm:[150,200],tuning:["drop D tuning","drop C tuning"],drums:["d-beat","groovy mid-tempo drums","blast beats"],guitar:["tremolo picking","chugging riffs","open string riffs"],vocals:["guttural death growls","low death growls"],mood:["sinister and dark","raw and abrasive"],heavy:8,groove:6,chaos:6,melody:3,exclude:["triggered drums","clean digital production","clean vocals","djent"]},
  "death-doom":{bpm:[55,90],tuning:["drop B tuning"],drums:["half-time groove","tom-heavy fills"],guitar:["palm muting","melodic lead harmonies"],vocals:["low death growls","doom clean chants"],mood:["crushing and heavy","melancholic and doux-amer"],heavy:9,groove:4,chaos:2,melody:6,exclude:["blast beats","machine-gun double bass","upbeat","euphoric"]},
  "raw black metal":{bpm:[190,250],tuning:["standard E tuning"],drums:["blast beats","hyperblast beats"],guitar:["tremolo picking","open string riffs"],vocals:["black metal shrieks","vocal distortion"],mood:["raw and abrasive","dark and menacing"],heavy:7,groove:2,chaos:10,melody:2,exclude:["clean digital production","crisp high-end mix","melodic","orchestral","tight bass"]},
  "symphonic black metal":{bpm:[170,220],tuning:["standard E tuning"],drums:["blast beats","double bass drumming"],guitar:["tremolo picking","melodic lead harmonies"],vocals:["black metal shrieks","operatic vocals","choir vocals"],mood:["epic","sinister and dark","majestic and grandiose"],heavy:7,groove:4,chaos:6,melody:8,exclude:["lo-fi raw recording","breakdown chugs","groove riffs"]},
  "melodic black metal":{bpm:[170,215],tuning:["standard E tuning","drop D tuning"],drums:["blast beats","double bass drumming"],guitar:["tremolo picking","melodic lead harmonies","dual guitar harmonies"],vocals:["black metal shrieks","raspy mid screams"],mood:["melodic and atmospheric","luminous and shimmering"],heavy:6,groove:4,chaos:6,melody:9,exclude:["slam metal","breakdown chugs","lo-fi raw recording","pig squeals"]},
  "pagan metal":{bpm:[130,190],tuning:["drop D tuning"],drums:["tribal drumming","blast beats","tribal toms"],guitar:["tremolo picking","melodic lead harmonies"],vocals:["black metal shrieks","choir vocals","ritual chant"],mood:["epic"],heavy:6,groove:5,chaos:5,melody:8,exclude:["modern metal production","breakdown chugs","electronic","djent"]},
  "gothic doom":{bpm:[70,110],tuning:["drop D tuning"],drums:["half-time groove","tom-heavy fills"],guitar:["palm muting","melodic lead harmonies"],vocals:["low death growls","soprano","operatic vocals"],mood:["melancholic and doux-amer","tender and haunting"],heavy:7,groove:4,chaos:2,melody:9,exclude:["blast beats","breakdown chugs","raw garage drums","aggressive mix"]},
  "stoner doom":{bpm:[80,120],tuning:["drop C tuning"],drums:["swing groove","half-time groove","big room toms"],guitar:["fuzz riffs","bluesy bends","wah-wah leads"],vocals:["soulful clean singing"],mood:["groovy and headbang-worthy","dreamy and ethereal"],heavy:6,groove:9,chaos:2,melody:7,exclude:["growl","blast beats","triggered drums","modern metal production"]},
  "melodic hardcore":{bpm:[150,190],tuning:["drop D tuning"],drums:["d-beat","two-step beat"],guitar:["open string riffs","melodic lead harmonies"],vocals:["tortured screams","gang shouts"],mood:["intense and aggressive","bittersweet and nostalgic"],heavy:6,groove:6,chaos:5,melody:8,exclude:["guttural death growls","blast beats","orchestral","slam metal"]},

  // ── ANNÉES 2000 ──
  "technical brutal death metal":{bpm:[200,255],tuning:["drop A tuning","8-string guitar"],drums:["hyperblast beats","gravity blast beats","machine-gun double bass"],guitar:["tapped arpeggios","tremolo picking","drop-tuned riffs"],vocals:["guttural gurgles","tunnel-throat gutturals"],mood:["crushing and heavy","chaotic and frantic"],heavy:10,groove:4,chaos:9,melody:2,exclude:["clean vocals","melodic","acoustic guitar","lo-fi raw recording"]},
  "cavernous death metal":{bpm:[150,215],tuning:["drop B tuning"],drums:["blast beats","half-time groove"],guitar:["tremolo picking","dissonant riffs"],vocals:["low death growls","vocal reverb"],mood:["dark and menacing","dissonant"],heavy:9,groove:3,chaos:8,melody:1,exclude:["melodic","clean vocals","crisp high-end mix","groove riffs"]},
  "war metal":{bpm:[200,260],tuning:["drop C tuning"],drums:["hyperblast beats","blast beats"],guitar:["tremolo picking","drop-tuned riffs"],vocals:["layered harsh vocals","guttural death growls"],mood:["chaotic and frantic","dark and menacing"],heavy:10,groove:1,chaos:10,melody:1,exclude:["melodic","clean vocals","polished production","crisp high-end mix"]},
  "metallic hardcore":{bpm:[140,180],tuning:["drop C tuning"],drums:["two-step beat","stomp breakdown drums"],guitar:["chugging riffs","dissonant riffs"],vocals:["hardcore beatdown vocals","gang shouts"],mood:["intense and aggressive","raw and abrasive"],heavy:8,groove:7,chaos:5,melody:2,exclude:["clean vocals","orchestral","melodic","melodic shred solos"]},
  "cybergrind":{bpm:[220,300],tuning:["drop C tuning"],drums:["programmed drums","hyperblast beats"],guitar:["drop-tuned riffs","dissonant riffs"],vocals:["pitched-up shrieks","guttural gurgles","vocal distortion"],mood:["chaotic and frantic","dissonant"],heavy:8,groove:3,chaos:10,melody:1,exclude:["live drums","analog warm tone","clean vocals","natural room drums"]},
  "nu metalcore":{bpm:[120,160],tuning:["drop A tuning","7-string guitar"],drums:["bounce groove","stomp breakdown drums","syncopated rhythms"],guitar:["breakdown chugs","drop-tuned riffs"],vocals:["rapped vocals","metalcore screams"],mood:["groovy and headbang-worthy","intense and aggressive"],heavy:8,groove:9,chaos:4,melody:4,exclude:["melodic shred solos","blast beats","orchestral","acoustic guitar"]},
  "deathrock":{bpm:[120,155],tuning:["standard E tuning"],drums:["tribal toms","straight rock beat"],guitar:["open string riffs","ambient lead textures"],vocals:["baritone","spoken word narration"],mood:["sinister and dark","dreamy and ethereal"],heavy:4,groove:6,chaos:4,melody:7,exclude:["growl","blast beats","breakdown chugs","modern metal production"]},

  // ── ANNÉES 2010 ──
  "downtempo deathcore":{bpm:[60,100],tuning:["drop G tuning","8-string guitar"],drums:["stomp breakdown drums","half-time groove"],guitar:["breakdown chugs","8-string staccato chugs"],vocals:["deathcore lows","tunnel-throat gutturals"],mood:["crushing and heavy","dark and menacing"],heavy:10,groove:8,chaos:3,melody:1,exclude:["blast beats","clean vocals","melodic","melodic shred solos"]},
  "beatdown deathcore":{bpm:[110,160],tuning:["drop A tuning"],drums:["stomp breakdown drums","bounce groove"],guitar:["breakdown chugs","drop-tuned riffs"],vocals:["deathcore lows","hardcore beatdown vocals"],mood:["crushing and heavy","intense and aggressive"],heavy:9,groove:9,chaos:3,melody:1,exclude:["clean vocals","melodic","polyrhythmic drums","atmospheric reverb-heavy mix"]},
  "thrash revival":{bpm:[180,220],tuning:["standard E tuning"],drums:["thrash beat","skank beat"],guitar:["tremolo picking","palm muting","melodic shred solos"],vocals:["raspy harsh vocals","gang shouts"],mood:["intense and aggressive","groovy and headbang-worthy"],heavy:7,groove:6,chaos:6,melody:5,exclude:["guttural death growls","breakdown chugs","djent","atmospheric reverb-heavy mix"]},
  "trad doom revival":{bpm:[70,105],tuning:["drop D tuning","drop C tuning"],drums:["half-time groove","big room toms"],guitar:["fuzz riffs","bluesy bends"],vocals:["doom clean chants","heavy metal wails"],mood:["crushing and heavy","sinister and dark"],heavy:7,groove:6,chaos:2,melody:7,exclude:["blast beats","triggered drums","djent","electronic"]},
  "blackened hardcore":{bpm:[170,215],tuning:["drop C tuning"],drums:["d-beat","blast beats","two-step beat"],guitar:["tremolo picking","dissonant riffs","breakdown chugs"],vocals:["black metal shrieks","hardcore beatdown vocals"],mood:["chaotic and frantic","dark and menacing"],heavy:8,groove:6,chaos:8,melody:2,exclude:["clean vocals","polished production","orchestral","melodic"]},
  "dissonant black metal":{bpm:[150,210],tuning:["drop D tuning"],drums:["blast beats","syncopated rhythms"],guitar:["dissonant riffs","tremolo picking"],vocals:["black metal shrieks","vocal reverb"],mood:["dissonant","dark and menacing"],heavy:7,groove:2,chaos:9,melody:2,exclude:["melodic","groove riffs","clean vocals","upbeat"]},

  // ── ANNÉES 2020 ──
  "trap metal":{bpm:[130,170],tuning:["drop A tuning"],drums:["programmed drums","breakbeat percussion"],guitar:["drop-tuned riffs","breakdown chugs"],vocals:["aggressive rap vocals","vocal distortion","pitched-up shrieks"],mood:["dark and menacing","chaotic and frantic"],heavy:7,groove:9,chaos:6,melody:3,exclude:["live drums","melodic shred solos","analog warm tone","orchestral"]},
  "rage metalcore":{bpm:[140,180],tuning:["drop G tuning","8-string guitar"],drums:["programmed drums","stomp breakdown drums"],guitar:["djent-style syncopated riffs","breakdown chugs"],vocals:["metalcore screams","vocal distortion"],mood:["intense and aggressive","euphoric and energetic"],heavy:8,groove:9,chaos:6,melody:5,exclude:["analog warm tone","blues rock","acoustic guitar","live drum sound"]},
  "nu-deathcore":{bpm:[120,165],tuning:["drop G tuning","9-string guitar"],drums:["bounce groove","stomp breakdown drums","blast beats"],guitar:["breakdown chugs","8-string staccato chugs"],vocals:["deathcore lows","rapped vocals","goblin vocals"],mood:["crushing and heavy","groovy and headbang-worthy"],heavy:9,groove:9,chaos:5,melody:3,exclude:["melodic shred solos","orchestral","acoustic guitar","analog warm tone"]},
  "hyperpop metalcore":{bpm:[150,185],tuning:["drop C tuning"],drums:["programmed drums","modern hybrid blast"],guitar:["djent-style syncopated riffs","ambient lead textures"],vocals:["pitched-up shrieks","modern clean and harsh mix"],mood:["euphoric and energetic","luminous and shimmering"],heavy:6,groove:8,chaos:7,melody:9,exclude:["lo-fi raw recording","analog warm tone","blues rock","doom metal"]},
  "dark hardcore":{bpm:[130,175],tuning:["drop B tuning"],drums:["two-step beat","stomp breakdown drums"],guitar:["dissonant riffs","breakdown chugs"],vocals:["hardcore beatdown vocals","tortured screams"],mood:["dark and menacing","raw and abrasive"],heavy:8,groove:7,chaos:5,melody:2,exclude:["clean vocals","melodic","orchestral","melodic shred solos"]},
  "neo-crust":{bpm:[160,200],tuning:["drop D tuning"],drums:["d-beat","blast beats","tribal toms"],guitar:["tremolo picking","melodic lead harmonies"],vocals:["tortured screams","raspy harsh vocals"],mood:["melodic and atmospheric","raw and abrasive"],heavy:7,groove:5,chaos:7,melody:7,exclude:["clean vocals","polished production","djent","slam metal"]},
  "cinematic deathcore":{bpm:[150,200],tuning:["drop G tuning","8-string guitar"],drums:["blast beats","stomp breakdown drums","gravity blast beats"],guitar:["breakdown chugs","tremolo picking","ambient lead textures"],vocals:["deathcore lows","choir vocals","operatic vocals"],mood:["epic","crushing and heavy","majestic and grandiose"],heavy:9,groove:6,chaos:6,melody:7,exclude:["lo-fi raw recording","raw garage drums","blues rock","punk rock"]},

  // ── FUSION (à mélanger, pas à jouer seuls) ──
  "dungeon synth":{bpm:[70,110],tuning:[],drums:["tribal toms","programmed drums"],guitar:[],vocals:["ritual chant","whispered spoken word"],mood:["dreamy and ethereal","serene and expansive"],heavy:1,groove:3,chaos:2,melody:8,exclude:["heavy distortion","blast beats","growl","breakdown chugs"]},
  "witch house":{bpm:[60,100],tuning:[],drums:["programmed drums","breakbeat percussion"],guitar:[],vocals:["pitch-shifted vocals","whispered spoken word"],mood:["sinister and dark","dreamy and ethereal"],heavy:3,groove:6,chaos:5,melody:5,exclude:["live drums","melodic shred solos","growl","analog warm tone"]},
  "breakcore":{bpm:[170,220],tuning:[],drums:["breakbeat percussion","programmed drums"],guitar:[],vocals:["pitched-up shrieks","vocal distortion"],mood:["chaotic and frantic","euphoric and energetic"],heavy:5,groove:8,chaos:10,melody:5,exclude:["live drums","melodic shred solos","analog warm tone","half-time groove"]},
  "phonk":{bpm:[130,160],tuning:[],drums:["programmed drums","bounce groove"],guitar:[],vocals:["pitch-shifted vocals","aggressive rap vocals"],mood:["dark and menacing","groovy and headbang-worthy"],heavy:4,groove:9,chaos:4,melody:4,exclude:["live drums","melodic shred solos","orchestral","acoustic guitar"]},
  "noise":{bpm:[60,240],tuning:[],drums:["programmed drums"],guitar:["dissonant riffs"],vocals:["vocal distortion","tortured screams"],mood:["dissonant","raw and abrasive"],heavy:7,groove:1,chaos:10,melody:1,exclude:["melodic","clean digital production","groove riffs","crisp high-end mix"]},
  "drill":{bpm:[135,150],tuning:[],drums:["programmed drums","breakbeat percussion"],guitar:[],vocals:["aggressive rap vocals"],mood:["dark and menacing","sinister and dark"],heavy:3,groove:9,chaos:3,melody:4,exclude:["live drums","melodic shred solos","orchestral","blast beats"]},
};

const _rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

/**
 * Retourne le profil d'un genre, BPM tiré au hasard dans sa plage.
 * \`fallback\` = ta logique actuelle si le genre n'a pas encore de profil.
 */
export function profileFor(genre, fallback) {
  const p = GENRE_PROFILES[genre];
  if (!p) return fallback;
  return {
    bpm: _rand(p.bpm[0], p.bpm[1]),
    tuning: p.tuning,
    drums: p.drums,
    guitar: p.guitar,
    vocals: p.vocals,
    mood: p.mood,
    heavy: p.heavy,
    groove: p.groove,
    chaos: p.chaos,
    melody: p.melody,
    exclude: p.exclude,
  };
}

export default GENRE_PROFILES;
`;

if (existsSync(PROFILES)) {
  console.log('⏭  src/genreProfiles.js existe déjà — pas écrasé.');
} else {
  writeFileSync(PROFILES, profilesFile, 'utf8');
  console.log('✅ src/genreProfiles.js créé.');
}

console.log('\n▶ Prochaine étape : npm run dev, puis onglet Genre pour vérifier.');
