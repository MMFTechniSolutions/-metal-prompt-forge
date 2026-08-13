#!/usr/bin/env node
/**
 * MetalPrompt — patch #2 : la lignée HARDCORE
 *
 * Usage :   node patch-hardcore.mjs
 *           (à la RACINE du projet, après patch-genres.mjs)
 *
 * Ce que ça fait :
 *   1. Backup  → src/App.jsx.bak-<timestamp>
 *   2. Insère 18 sous-genres hardcore dans GENRE_FAMILIES
 *   3. Ajoute leurs profils dans src/genreProfiles.js (fusion, pas écrasement)
 *
 * Idempotent : relancer ne duplique rien.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const APP = resolve('src/App.jsx');
const PROFILES = resolve('src/genreProfiles.js');

if (!existsSync(APP)) {
  console.error('❌ src/App.jsx introuvable. Lance le script à la racine du projet.');
  process.exit(1);
}

/* ── PARTIE 1 : GENRE_FAMILIES ─────────────────────────────── */

const PATCHES = [
  {
    era: 'Années 80',
    anchor: '{g:"industrial rock",req:"forge"},',
    add: [
      '{g:"youth crew hardcore",req:"forge"},',
      '{g:"nyhc",req:"forge"},',
      '{g:"straight edge hardcore",req:"forge"},',
      '{g:"thrashcore",req:"forge"},',
      '{g:"oi!",req:"forge"},',
    ],
  },
  {
    era: 'Années 90',
    anchor: '{g:"melodic hardcore",req:"forge"},',
    add: [
      '{g:"chaotic hardcore",req:"forge"},',
      '{g:"screamo",req:"forge"},',
      '{g:"emoviolence",req:"forge"},',
      '{g:"tough guy hardcore",req:"forge"},',
      '{g:"crust punk",req:"forge"},',
    ],
  },
  {
    era: 'Années 2000',
    anchor: '{g:"deathrock",req:"forge"},',
    add: [
      '{g:"easycore",req:"forge"},',
      '{g:"mosh metal",req:"forge"},',
      '{g:"grindviolence",req:"forge"},',
    ],
  },
  {
    era: 'Années 2010',
    anchor: '{g:"dissonant black metal",req:"forge"},',
    add: [
      '{g:"modern hardcore",req:"free"},',
      '{g:"downtempo hardcore",req:"forge"},',
      '{g:"beatdown revival",req:"forge"},',
    ],
  },
  {
    era: 'Années 2020',
    anchor: '{g:"cinematic deathcore",req:"forge"},',
    add: [
      '{g:"hardcore revival",req:"forge"},',
      '{g:"rap hardcore",req:"forge"},',
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
    problems.push(`${p.era} : partiellement appliqué (${already.length}/${p.add.length}) — je saute`);
    continue;
  }
  const i = src.indexOf(p.anchor);
  if (i === -1) {
    problems.push(`${p.era} : ancre introuvable → ${p.anchor} (as-tu roulé patch-genres.mjs avant ?)`);
    continue;
  }
  const end = i + p.anchor.length;
  src = src.slice(0, end) + '\n    ' + p.add.join('') + src.slice(end);
  console.log(`✅ ${p.era} — ${p.add.length} genres hardcore ajoutés`);
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
  console.log(`✅ src/App.jsx patché — ${inserted} genres hardcore ajoutés.`);
} else if (skipped === PATCHES.length) {
  console.log('\n✅ App.jsx : rien à faire, déjà en place.');
}

/* ── PARTIE 2 : profils ────────────────────────────────────── */

const HARDCORE_PROFILES = `
  // ── LIGNÉE HARDCORE ──
  "youth crew hardcore":{bpm:[170,210],tuning:["standard E tuning"],drums:["d-beat","two-step beat","straight rock beat"],guitar:["palm muting","open string riffs"],vocals:["gang shouts","raspy harsh vocals"],mood:["intense and aggressive","triumphant and radiant"],heavy:5,groove:7,chaos:4,melody:5,exclude:["guttural death growls","blast beats","melodic shred solos","orchestral"]},
  "nyhc":{bpm:[150,190],tuning:["drop D tuning"],drums:["two-step beat","stomp breakdown drums"],guitar:["chugging riffs","groove riffs"],vocals:["hardcore beatdown vocals","gang shouts"],mood:["intense and aggressive","dark and menacing"],heavy:7,groove:8,chaos:4,melody:2,exclude:["clean vocals","melodic shred solos","orchestral","atmospheric reverb-heavy mix"]},
  "straight edge hardcore":{bpm:[175,215],tuning:["standard E tuning"],drums:["d-beat","two-step beat"],guitar:["palm muting","open string riffs"],vocals:["gang shouts","tortured screams"],mood:["intense and aggressive","defiant"],heavy:6,groove:7,chaos:5,melody:4,exclude:["guttural death growls","blast beats","orchestral","doom metal"]},
  "thrashcore":{bpm:[210,260],tuning:["standard E tuning"],drums:["thrash beat","d-beat","blast beats"],guitar:["tremolo picking","palm muting"],vocals:["raspy harsh vocals","gang shouts"],mood:["chaotic and frantic","raw and abrasive"],heavy:7,groove:5,chaos:9,melody:2,exclude:["clean vocals","melodic shred solos","half-time groove","atmospheric reverb-heavy mix"]},
  "oi!":{bpm:[150,185],tuning:["standard E tuning"],drums:["straight rock beat","four-on-the-floor"],guitar:["palm muting","pentatonic riffs"],vocals:["gang shouts","raw rock vocals"],mood:["festif et rassembleur","intense and aggressive"],heavy:4,groove:8,chaos:3,melody:6,exclude:["guttural death growls","blast beats","breakdown chugs","orchestral"]},

  "chaotic hardcore":{bpm:[180,230],tuning:["drop C tuning"],drums:["math metal drums","blast beats","syncopated rhythms"],guitar:["dissonant riffs","open string riffs"],vocals:["tortured screams","screamo screams"],mood:["chaotic and frantic","dissonant"],heavy:8,groove:4,chaos:10,melody:2,exclude:["clean vocals","groove riffs","polished production","melodic shred solos"]},
  "screamo":{bpm:[150,200],tuning:["standard E tuning","drop D tuning"],drums:["d-beat","tom-heavy fills"],guitar:["open string riffs","ambient lead textures"],vocals:["screamo screams","whisper-to-scream dynamics"],mood:["mélancolique et doux-amer","chaotic and frantic"],heavy:5,groove:5,chaos:8,melody:7,exclude:["guttural death growls","breakdown chugs","djent","triggered drums"]},
  "emoviolence":{bpm:[200,270],tuning:["standard E tuning"],drums:["blast beats","d-beat"],guitar:["open string riffs","tremolo picking"],vocals:["screamo screams","tortured screams"],mood:["chaotic and frantic","raw and abrasive"],heavy:6,groove:3,chaos:10,melody:5,exclude:["clean vocals","polished production","groove riffs","long intros"]},
  "tough guy hardcore":{bpm:[130,170],tuning:["drop B tuning"],drums:["stomp breakdown drums","two-step beat","bounce groove"],guitar:["breakdown chugs","chugging riffs"],vocals:["hardcore beatdown vocals","gang shouts"],mood:["crushing and heavy","dark and menacing"],heavy:8,groove:9,chaos:3,melody:1,exclude:["clean vocals","melodic","melodic shred solos","atmospheric reverb-heavy mix"]},
  "crust punk":{bpm:[160,205],tuning:["drop D tuning"],drums:["d-beat","blast beats"],guitar:["fuzz riffs","tremolo picking"],vocals:["raspy harsh vocals","tortured screams"],mood:["raw and abrasive","dark and menacing"],heavy:7,groove:5,chaos:7,melody:3,exclude:["clean vocals","polished production","triggered drums","melodic shred solos"]},

  "easycore":{bpm:[160,190],tuning:["standard E tuning","drop D tuning"],drums:["two-step beat","straight rock beat"],guitar:["palm muting","melodic lead harmonies"],vocals:["melodic clean singing","gang shouts"],mood:["euphoric and energetic","warm and hopeful"],heavy:4,groove:7,chaos:3,melody:9,exclude:["guttural death growls","blast beats","doom metal","dissonant riffs"]},
  "mosh metal":{bpm:[125,165],tuning:["drop A tuning"],drums:["stomp breakdown drums","bounce groove"],guitar:["breakdown chugs","drop-tuned riffs"],vocals:["hardcore beatdown vocals","deathcore lows"],mood:["crushing and heavy","groovy and headbang-worthy"],heavy:9,groove:9,chaos:3,melody:1,exclude:["clean vocals","melodic shred solos","orchestral","acoustic guitar"]},
  "grindviolence":{bpm:[210,280],tuning:["drop C tuning"],drums:["blast beats","hyperblast beats","stomp breakdown drums"],guitar:["drop-tuned riffs","dissonant riffs"],vocals:["guttural gurgles","tortured screams"],mood:["chaotic and frantic","raw and abrasive"],heavy:9,groove:4,chaos:10,melody:1,exclude:["clean vocals","melodic","polished production","long intros"]},

  "modern hardcore":{bpm:[140,180],tuning:["drop C tuning"],drums:["two-step beat","stomp breakdown drums"],guitar:["chugging riffs","dissonant riffs"],vocals:["hardcore beatdown vocals","tortured screams"],mood:["intense and aggressive","dark and menacing"],heavy:8,groove:8,chaos:5,melody:3,exclude:["clean vocals","melodic shred solos","orchestral","doom metal"]},
  "downtempo hardcore":{bpm:[70,110],tuning:["drop G tuning","8-string guitar"],drums:["stomp breakdown drums","half-time groove"],guitar:["breakdown chugs","8-string staccato chugs"],vocals:["deathcore lows","hardcore beatdown vocals"],mood:["crushing and heavy","dark and menacing"],heavy:10,groove:8,chaos:2,melody:1,exclude:["blast beats","clean vocals","melodic","melodic shred solos"]},
  "beatdown revival":{bpm:[120,160],tuning:["drop A tuning"],drums:["stomp breakdown drums","bounce groove","two-step beat"],guitar:["breakdown chugs","chugging riffs"],vocals:["hardcore beatdown vocals","gang shouts"],mood:["crushing and heavy","intense and aggressive"],heavy:9,groove:9,chaos:3,melody:1,exclude:["clean vocals","melodic","orchestral","polyrhythmic drums"]},

  "hardcore revival":{bpm:[155,195],tuning:["drop D tuning","drop C tuning"],drums:["two-step beat","d-beat","stomp breakdown drums"],guitar:["chugging riffs","open string riffs"],vocals:["gang shouts","hardcore beatdown vocals"],mood:["intense and aggressive","festif et rassembleur"],heavy:7,groove:8,chaos:5,melody:4,exclude:["guttural death growls","melodic shred solos","orchestral","atmospheric reverb-heavy mix"]},
  "rap hardcore":{bpm:[130,170],tuning:["drop B tuning"],drums:["bounce groove","stomp breakdown drums","breakbeat percussion"],guitar:["breakdown chugs","groove riffs"],vocals:["aggressive rap vocals","hardcore beatdown vocals"],mood:["groovy and headbang-worthy","dark and menacing"],heavy:8,groove:9,chaos:4,melody:3,exclude:["melodic shred solos","blast beats","orchestral","acoustic guitar"]},
`;

if (!existsSync(PROFILES)) {
  console.log('\n⚠️  src/genreProfiles.js introuvable — roule patch-genres.mjs d\'abord.');
} else {
  let prof = readFileSync(PROFILES, 'utf8');
  if (prof.includes('"youth crew hardcore"')) {
    console.log('⏭  genreProfiles.js — profils hardcore déjà présents.');
  } else {
    const ANCHOR = '\n};\n\nconst _rand';
    const i = prof.indexOf(ANCHOR);
    if (i === -1) {
      console.log('\n⚠️  genreProfiles.js : ancre introuvable, ajoute les profils à la main.');
    } else {
      const bak = PROFILES + '.bak-' + Date.now();
      copyFileSync(PROFILES, bak);
      prof = prof.slice(0, i) + '\n' + HARDCORE_PROFILES + prof.slice(i);
      writeFileSync(PROFILES, prof, 'utf8');
      console.log(`💾 Backup : ${bak}`);
      console.log('✅ src/genreProfiles.js — 18 profils hardcore ajoutés.');
    }
  }
}

console.log('\n▶ npm run dev, puis onglet Genre.');
