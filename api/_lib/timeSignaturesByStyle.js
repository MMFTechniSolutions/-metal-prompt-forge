// =====================================================================
// TIME SIGNATURES BY STYLE — MetalPrompt Forge
// /api/_lib/ (recette secrète — JAMAIS dans le frontend)
//
// DEUX COUCHES par style :
//   1. ui        → affiché au user (signatures, refs, description)
//                  ⚠️ ui.references (noms de bands) = référence interne/affichage
//                  SEULEMENT — jamais injecté dans le prompt (Suno rejette
//                  les noms d'artistes de toute façon)
//   2. suno      → ce qui est réellement injecté dans le prompt
//
// RÈGLE : Suno ne parse pas les signatures numériques comme instruction
// stricte, MAIS les mentionner peut teinter le feel. Stratégie :
//   - styleTags     → champ "Style of Music" (descripteurs textuels, fiables)
//   - meterHints    → mentions numériques optionnelles ("in 7/8") — nudge
//   - structureTags → dans les lyrics, ex: [Breakdown, half-time feel]
//
// ARCHÉTYPES (optionnel) : les sliders d'atmosphère pointent vers le
// plus proche. refBand = interne SEULEMENT.
// profile : axes 0-100 → darkness / aggression / technicality / atmosphere
// =====================================================================

// ---------------------------------------------------------------------
// MODÈLE RECOMMANDÉ (validé tests François 2026-07-04) :
// v4.5 > v5.5 pour le metal extrême — le 5.5 (répertoire licencié) sonne
// trop poli. À re-tester à chaque release de modèle Suno.
// ---------------------------------------------------------------------
export const RECOMMENDED_MODEL = {
  default: "v4.5",
  byStyleOverride: {},
  lastValidated: "2026-07-04",
};

// ---------------------------------------------------------------------
// VOCALS PHONÉTIQUES (validé 2026-07-04) : déformer l'orthographe
// empêche Suno de sur-articuler. Voir phoneticize.js.
// intensity : "normal" | "extreme" (grind, haché) | "stretched" (black,
// voyelles extra-longues pour shrieks tenus sur tremolo)
// Combiner avec "unintelligible guttural vocals, no clear enunciation"
// dans le Style + Weirdness ~75.
// ---------------------------------------------------------------------
export const PHONETIC_VOCALS = {
  "death-metal": { enabled: true, intensity: "normal" },
  "deathcore": { enabled: true, intensity: "normal" },
  "grindcore": { enabled: true, intensity: "extreme" },
  "tech-death": { enabled: true, intensity: "normal" },
  "black-metal": { enabled: true, intensity: "stretched" },
  "atmospheric-black": { enabled: true, intensity: "stretched" },
  "blackgaze": { enabled: true, intensity: "stretched" },
  "sludge-metal": { enabled: true, intensity: "normal" },
  // styles ajoutés 2026-07-07
  "brutal-death": { enabled: true, intensity: "normal" },
  "slam-metal": { enabled: true, intensity: "extreme" },
  "deathgrind": { enabled: true, intensity: "extreme" },
  "powerviolence": { enabled: true, intensity: "extreme" },
  "blackened-death": { enabled: true, intensity: "normal" },
  "dissonant-death": { enabled: true, intensity: "normal" },
  "funeral-doom": { enabled: true, intensity: "stretched" },
  "dsbm": { enabled: true, intensity: "stretched" },
  "symphonic-black": { enabled: true, intensity: "stretched" },
  "atmospheric-sludge": { enabled: true, intensity: "normal" },
  "melodic-deathcore": { enabled: true, intensity: "normal" },
  "technical-deathcore": { enabled: true, intensity: "normal" },
  lastValidated: "2026-07-04",
};

export const TIME_SIGNATURES_BY_STYLE = {

  // ------------------------------------------------- CLASSIQUES
  "heavy-metal": {
    ui: {
      label: "Heavy Metal",
      signatures: ["4/4", "6/8 (gallop)", "3/4"],
      references: ["Iron Maiden", "Judas Priest", "Black Sabbath"],
      description: "4/4 dominant, gallop en triolets à la Maiden, valses occasionnelles.",
    },
    suno: {
      styleTags: ["galloping rhythm", "driving mid-tempo", "classic heavy metal groove"],
      structureTags: ["[Gallop riff]", "[Twin guitar harmony, driving beat]"],
    },
  },

  "thrash-metal": {
    ui: {
      label: "Thrash Metal",
      signatures: ["4/4 rapide", "2/4 (punk beat)"],
      references: ["Metallica", "Slayer", "Kreator"],
      description: "4/4 à haute vitesse, downpicking serré, passages punk en 2/4.",
    },
    suno: {
      styleTags: ["fast palm-muted riffing", "aggressive up-tempo thrash", "tight downpicking"],
      structureTags: ["[Fast thrash riff]", "[Skank beat section]"],
    },
  },

  "speed-metal": {
    ui: {
      label: "Speed Metal",
      signatures: ["4/4 très rapide"],
      references: ["Motörhead", "Exciter"],
      description: "4/4 poussé au maximum, feel rock'n'roll accéléré.",
    },
    suno: {
      styleTags: ["breakneck tempo", "relentless driving rhythm", "speed metal energy"],
      structureTags: ["[Full speed section]"],
    },
  },

  "power-metal": {
    ui: {
      label: "Power Metal",
      signatures: ["4/4 (double kick gallop)", "3/4", "12/8"],
      references: ["Helloween", "Blind Guardian", "DragonForce"],
      description: "Gallop de double pédale en 4/4, ballades en 3/4 ou 12/8.",
    },
    suno: {
      styleTags: ["double kick gallop", "uplifting driving rhythm", "epic power metal pace"],
      structureTags: ["[Double kick gallop]", "[Epic waltz bridge]"],
    },
  },

  // ------------------------------------------------- EXTRÊME
  "death-metal": {
    ui: {
      label: "Death Metal",
      signatures: ["4/4 (blast)", "2/4"],
      references: ["Death", "Cannibal Corpse", "Morbid Angel"],
      description: "Blast beats en 4/4, changements de tempo brutaux.",
    },
    suno: {
      styleTags: ["blast beats", "relentless double kick", "brutal tempo shifts"],
      structureTags: ["[Blast beat section]", "[Slow crushing riff]"],
    },
  },

  "tech-death": {
    ui: {
      label: "Technical Death Metal",
      signatures: ["7/8", "5/4", "9/8", "changements constants"],
      references: ["Necrophagist", "Obscura", "Archspire"],
      description: "Métriques impaires enchaînées, précision chirurgicale.",
    },
    suno: {
      styleTags: ["odd time signatures", "technical riffing", "dizzying tempo changes", "math metal feel"],
      meterHints: ["in 7/8", "shifting 5/4 passages"],
      structureTags: ["[Technical odd-meter riff]", "[Sweep arpeggio section]"],
    },
  },

  "black-metal": {
    ui: {
      label: "Black Metal",
      signatures: ["4/4 (blast)", "3/4 (valse sombre)", "6/8"],
      references: ["Mayhem", "Emperor", "Darkthrone"],
      description: "Blast hypnotique en 4/4, valses funèbres en 3/4.",
    },
    suno: {
      styleTags: ["tremolo picking", "hypnotic blast beats", "cold repetitive rhythm"],
      structureTags: ["[Tremolo blast section]", "[Dark waltz passage]"],
    },
  },

  "atmospheric-black": {
    ui: {
      label: "Atmospheric Black Metal",
      signatures: ["6/8", "3/4", "4/4 lent"],
      references: ["Agalloch", "Wolves in the Throne Room", "Saor"],
      description: "Métriques ternaires flottantes, longues progressions.",
    },
    suno: {
      styleTags: ["flowing triplet feel", "expansive hypnotic rhythm", "slow-building atmosphere"],
      structureTags: ["[Atmospheric build]", "[Flowing 'waltz-like' passage]"],
    },
  },

  "grindcore": {
    ui: {
      label: "Grindcore",
      signatures: ["4/4 (blast extrême)", "2/4"],
      references: ["Napalm Death", "Pig Destroyer"],
      description: "Blast maximal, chansons ultra-courtes, chaos contrôlé.",
    },
    suno: {
      // "loud" validé 2026-07-04 : sature le mix, vocal hardcore sale
      styleTags: ["relentless blast beats", "chaotic breakneck tempo", "grindcore intensity", "loud"],
      structureTags: ["[All-out blast]", "[Abrupt stop]"],
    },
  },

  // ------------------------------------------------- DOOM / LOURD-LENT
  "doom-metal": {
    ui: {
      label: "Doom Metal",
      signatures: ["4/4 lent", "6/8", "3/4"],
      references: ["Candlemass", "Electric Wizard"],
      description: "Tempo écrasant, feel ternaire pesant.",
    },
    suno: {
      styleTags: ["crushing slow tempo", "heavy dragging rhythm", "doom-laden pace"],
      structureTags: ["[Slow crushing riff]", "[Funeral pace section]"],
    },
  },

  "sludge-metal": {
    ui: {
      label: "Sludge Metal",
      signatures: ["4/4 (swing sale)", "6/8"],
      references: ["Crowbar", "Eyehategod"],
      description: "Groove marécageux, swing traînant, feedback.",
    },
    suno: {
      styleTags: ["swampy dragging groove", "sludgy swung rhythm", "feedback-drenched"],
      structureTags: ["[Sludgy groove section]"],
    },
  },

  "stoner-metal": {
    ui: {
      label: "Stoner Metal",
      signatures: ["4/4 (shuffle)", "12/8"],
      references: ["Kyuss", "Sleep", "Electric Wizard"],
      description: "Shuffle fuzzé, groove laid-back, feel 12/8 bluesy.",
    },
    suno: {
      styleTags: ["fuzzy laid-back groove", "bluesy shuffle feel", "hypnotic stoner riff"],
      structureTags: ["[Fuzzed-out jam section]"],
    },
  },

  // ------------------------------------------------- PROG / TECHNIQUE
  "progressive-metal": {
    ui: {
      label: "Progressive Metal",
      signatures: ["7/8", "5/4", "9/16", "6/8", "13/16", "polymètres"],
      references: ["Dream Theater", "Tool", "Opeth"],
      description: "Métriques impaires signature du genre — le 9/16 de Dream Theater, le 5/4 hypnotique de Tool.",
    },
    suno: {
      styleTags: ["odd time signatures", "complex polyrhythms", "progressive song structure", "intricate rhythmic shifts"],
      meterHints: ["in 7/8", "9/16 rhythmic patterns", "shifting between 5/4 and 6/8"],
      structureTags: ["[Odd-meter instrumental section]", "[Polyrhythmic bridge]", "[Time signature shift]"],
    },
    archetypes: [
      {
        id: "virtuoso",
        refBand: "Dream Theater",
        uiLabel: "Virtuose épique",
        profile: { darkness: 25, aggression: 45, technicality: 95, atmosphere: 35 },
        sunoTags: ["virtuosic guitar and keyboard interplay", "soaring melodic vocals", "epic multi-part arrangements", "polished dynamic production"],
      },
      {
        id: "dark-organic",
        refBand: "Opeth",
        uiLabel: "Sombre organique",
        profile: { darkness: 85, aggression: 70, technicality: 65, atmosphere: 75 },
        sunoTags: ["shifting between death growls and clean melancholic vocals", "acoustic folk interludes", "dark 70s prog textures", "organic warm production"],
      },
      {
        id: "hypnotic",
        refBand: "Tool",
        uiLabel: "Hypnotique tribal",
        profile: { darkness: 65, aggression: 50, technicality: 70, atmosphere: 90 },
        sunoTags: ["hypnotic tribal drumming", "brooding basslines", "slow-building tension and release", "atmospheric spacious mix"],
      },
      {
        id: "chaotic-adventurous",
        refBand: "Between the Buried and Me",
        uiLabel: "Chaotique aventureux",
        profile: { darkness: 55, aggression: 85, technicality: 90, atmosphere: 50 },
        sunoTags: ["frantic genre-hopping passages", "harsh screams into soaring cleans", "dense technical riffing", "unpredictable dynamic swings"],
      },
    ],
  },

  "djent": {
    ui: {
      label: "Djent",
      signatures: ["4/4 (polymétrique)", "17/16", "23/16 (riffs superposés)"],
      references: ["Meshuggah", "Periphery", "Tesseract"],
      description: "Illusion polymétrique : riffs impairs superposés sur un 4/4 de batterie (la marque Meshuggah).",
    },
    suno: {
      styleTags: ["polymetric chugging", "syncopated low-tuned grooves", "djent feel", "mechanical precision"],
      meterHints: ["17/16 riff cycles over 4/4"],
      structureTags: ["[Polymetric chug section]", "[Syncopated breakdown]"],
    },
  },

  "mathcore": {
    ui: {
      label: "Mathcore",
      signatures: ["Changements constants", "11/8", "5/8", "7/16"],
      references: ["The Dillinger Escape Plan", "Converge"],
      description: "Chaos métrique organisé, ruptures permanentes.",
    },
    suno: {
      styleTags: ["chaotic meter changes", "angular dissonant riffing", "mathcore intensity", "start-stop rhythms"],
      meterHints: ["jumping between 11/8, 5/8 and 7/16"],
      structureTags: ["[Chaotic angular section]", "[Abrupt meter change]"],
    },
  },

  // ------------------------------------------------- CORE
  "metalcore": {
    ui: {
      label: "Metalcore",
      signatures: ["4/4", "half-time (breakdowns)"],
      references: ["Killswitch Engage", "As I Lay Dying", "Parkway Drive"],
      description: "4/4 énergique, breakdowns en half-time — la signature du genre.",
    },
    suno: {
      styleTags: ["syncopated chugging", "early 2000s metalcore sound", "melodic leads over heavy rhythm"],
      structureTags: ["[Breakdown, half-time feel]", "[Melodic chorus]"],
    },
  },

  "deathcore": {
    ui: {
      label: "Deathcore",
      signatures: ["4/4", "half-time / quarter-time (breakdowns)"],
      references: ["Whitechapel", "Lorna Shore", "Suicide Silence"],
      description: "Alternance blast → breakdown écrasant, quarter-time assumé.",
    },
    suno: {
      styleTags: ["crushing slow breakdowns", "blast-to-breakdown dynamics", "downtuned brutality"],
      structureTags: ["[Blast beat section]", "[Crushing breakdown, quarter-time feel]"],
    },
  },

  "melodic-hardcore": {
    ui: {
      label: "Melodic Hardcore",
      signatures: ["4/4", "half-time"],
      references: ["Counterparts", "Being As An Ocean"],
      description: "4/4 émotif, alternance intensité/retenue.",
    },
    suno: {
      styleTags: ["emotional driving rhythm", "dynamic loud-quiet shifts"],
      structureTags: ["[Half-time emotional bridge]"],
    },
  },

  // ------------------------------------------------- GROOVE / ALTERNATIF
  "groove-metal": {
    ui: {
      label: "Groove Metal",
      signatures: ["4/4 (syncopé lourd)"],
      references: ["Pantera", "Lamb of God", "Sepultura"],
      description: "4/4 mid-tempo ultra-syncopé, le stomp Pantera.",
    },
    suno: {
      styleTags: ["heavy syncopated groove", "mid-tempo stomp", "tight percussive riffing"],
      structureTags: ["[Groove riff section]", "[Half-time stomp]"],
    },
  },

  "nu-metal": {
    ui: {
      label: "Nu Metal",
      signatures: ["4/4 (feel hip-hop)"],
      references: ["Korn", "Slipknot", "Deftones"],
      description: "Groove bondissant influencé hip-hop, syncopes lourdes.",
    },
    suno: {
      styleTags: ["bouncy syncopated groove", "hip-hop influenced rhythm", "downtuned seven-string riffs"],
      structureTags: ["[Bounce riff section]", "[Quiet tense verse]"],
    },
  },

  "industrial-metal": {
    ui: {
      label: "Industrial Metal",
      signatures: ["4/4 (mécanique)"],
      references: ["Rammstein", "Ministry", "Fear Factory"],
      description: "Pulsation mécanique implacable, quantisation assumée.",
    },
    suno: {
      styleTags: ["mechanical pulsing rhythm", "industrial stomp", "machine-like precision"],
      structureTags: ["[Industrial stomp section]"],
    },
  },

  "alternative-metal": {
    ui: {
      label: "Alternative Metal",
      signatures: ["4/4", "accents déplacés", "5/4 occasionnel"],
      references: ["System of a Down", "Deftones", "Chevelle"],
      description: "Base 4/4 avec accents imprévisibles et ruptures dynamiques.",
    },
    suno: {
      styleTags: ["unpredictable accent shifts", "dynamic loud-quiet contrast", "off-kilter groove"],
      structureTags: ["[Sudden dynamic shift]"],
    },
  },

  // ------------------------------------------------- MÉLODIQUE / SYMPHONIQUE
  "melodic-death": {
    ui: {
      label: "Melodic Death Metal",
      signatures: ["4/4 (gallop Gothenburg)", "6/8"],
      references: ["At the Gates", "In Flames", "Amon Amarth"],
      description: "Gallop mélodique du son Gothenburg, harmonies jumelles.",
    },
    suno: {
      styleTags: ["melodic galloping riffs", "twin guitar harmonies", "gothenburg sound"],
      structureTags: ["[Melodic gallop section]", "[Twin lead harmony]"],
    },
  },

  "symphonic-metal": {
    ui: {
      label: "Symphonic Metal",
      signatures: ["4/4", "3/4 (valse)", "6/8"],
      references: ["Nightwish", "Epica", "Within Temptation"],
      description: "Structures orchestrales, valses épiques, crescendos.",
    },
    suno: {
      styleTags: ["cinematic orchestral sweep", "epic waltz feel", "symphonic crescendos"],
      structureTags: ["[Orchestral waltz section]", "[Cinematic crescendo]"],
    },
  },

  "folk-metal": {
    ui: {
      label: "Folk / Viking Metal",
      signatures: ["6/8 (jig)", "3/4", "4/4", "7/8 (danses balkaniques)"],
      references: ["Eluveitie", "Ensiferum", "Korpiklaani"],
      description: "Rythmes de danse folk : jigs en 6/8, polkas, métriques balkaniques.",
    },
    suno: {
      styleTags: ["folk jig rhythm", "danceable triplet feel", "traditional dance groove"],
      meterHints: ["6/8 jig feel", "7/8 balkan dance rhythm"],
      structureTags: ["[Folk jig section]", "[Drinking song chorus]"],
    },
  },

  "gothic-metal": {
    ui: {
      label: "Gothic Metal",
      signatures: ["4/4 lent", "6/8", "3/4"],
      references: ["Type O Negative", "Paradise Lost", "Moonspell"],
      description: "Tempos lents et solennels, feel ternaire mélancolique.",
    },
    suno: {
      styleTags: ["slow brooding rhythm", "melancholic waltz feel", "gothic atmosphere"],
      structureTags: ["[Slow brooding section]"],
    },
  },

  // ------------------------------------------------- POST / AVANT-GARDE
  "post-metal": {
    ui: {
      label: "Post-Metal",
      signatures: ["4/4 lent", "6/8", "5/4"],
      references: ["Neurosis", "Isis", "Cult of Luna"],
      description: "Longs crescendos, métriques étirées, dynamique en vagues.",
    },
    suno: {
      styleTags: ["slow-building dynamics", "expansive crescendos", "post-metal atmosphere"],
      structureTags: ["[Slow build]", "[Climactic crescendo]"],
    },
  },

  "avant-garde-metal": {
    ui: {
      label: "Avant-Garde Metal",
      signatures: ["Libres / imprévisibles", "polymètres", "rubato"],
      references: ["Mr. Bungle", "Ihsahn", "Imperial Triumphant"],
      description: "Aucune règle : métriques libres, collages, dissonance.",
    },
    suno: {
      styleTags: ["unpredictable experimental rhythms", "dissonant angular structures", "avant-garde chaos"],
      structureTags: ["[Experimental free section]", "[Sudden genre shift]"],
    },
  },

  "blackgaze": {
    ui: {
      label: "Blackgaze",
      signatures: ["4/4 (blast doux)", "6/8"],
      references: ["Deafheaven", "Alcest"],
      description: "Blast beats noyés dans le shoegaze, feel flottant.",
    },
    suno: {
      styleTags: ["dreamy blast beats", "shoegaze wall of sound", "floating triplet feel"],
      structureTags: ["[Dreamy blast section]", "[Ambient interlude]"],
    },
  },

  // ------------------------------------------------- GLAM / ROCK
  "glam-metal": {
    ui: {
      label: "Glam / Hair Metal",
      signatures: ["4/4 (rock)", "12/8 (power ballad)"],
      references: ["Mötley Crüe", "Def Leppard"],
      description: "4/4 rock accrocheur, power ballads en 12/8.",
    },
    suno: {
      styleTags: ["catchy rock groove", "anthemic stadium rhythm", "power ballad feel"],
      structureTags: ["[Anthemic chorus]", "[Power ballad bridge]"],
    },
  },

  // ------------------------------------------------- RACINES (60-70s)
  "hard-rock": {
    ui: { label: "Hard Rock", signatures: ["4/4", "12/8 (blues)"], references: ["AC/DC", "Guns N' Roses", "Deep Purple"], description: "4/4 rock carré, swing bluesy occasionnel." },
    suno: { styleTags: ["driving hard rock groove", "bluesy swagger", "anthemic riffs"], structureTags: ["[Guitar solo]", "[Anthemic chorus]"] },
  },
  "proto-metal": {
    ui: { label: "Proto-Metal", signatures: ["4/4 lourd", "12/8"], references: ["Blue Cheer", "Deep Purple", "early Sabbath"], description: "Blues rock alourdi, les racines du metal." },
    suno: { styleTags: ["heavy bluesy proto-metal riffs", "vintage fuzz", "raw 70s energy"], structureTags: ["[Heavy blues jam]"] },
  },
  "blues-rock": {
    ui: { label: "Blues Rock", signatures: ["12/8 (shuffle)", "4/4"], references: ["Cream", "Led Zeppelin"], description: "Shuffle blues électrifié." },
    suno: { styleTags: ["electric blues shuffle", "expressive string bends", "warm tube crunch"], structureTags: ["[Blues solo section]"] },
  },
  "punk-rock": {
    ui: { label: "Punk Rock", signatures: ["4/4 rapide", "2/4"], references: ["Ramones", "Sex Pistols"], description: "4/4 simple, rapide, trois accords." },
    suno: { styleTags: ["fast three-chord punk", "raw garage energy", "shouted gang vocals"], structureTags: ["[Fast punk verse]"] },
  },
  "hardcore-punk": {
    ui: { label: "Hardcore Punk", signatures: ["4/4 très rapide", "2/4"], references: ["Black Flag", "Minor Threat", "Bad Brains"], description: "Punk accéléré et enragé, breakdowns primitifs." },
    suno: { styleTags: ["furious hardcore punk speed", "shouted vocals", "raw aggressive energy"], structureTags: ["[Circle pit section]", "[Mosh part]"] },
  },
  "d-beat": {
    ui: { label: "D-Beat / Crust", signatures: ["4/4 (d-beat)"], references: ["Discharge", "Wolfbrigade"], description: "LE beat Discharge, martelé sans pause." },
    suno: { styleTags: ["relentless d-beat drumming", "crust punk distortion", "raw war-torn energy"], structureTags: ["[D-beat assault]"] },
  },
  "crossover-thrash": {
    ui: { label: "Crossover Thrash", signatures: ["4/4 rapide", "2/4"], references: ["S.O.D.", "Municipal Waste", "Power Trip"], description: "Punk + thrash, parts de mosh obligatoires." },
    suno: { styleTags: ["punk-infused thrash riffs", "mosh-ready breakdowns", "gang shout choruses"], structureTags: ["[Mosh part]", "[Skank beat section]"] },
  },
  "powerviolence": {
    ui: { label: "Powerviolence", signatures: ["Coups de fouet 2/4 ↔ lent"], references: ["Spazz", "Infest"], description: "Blast ultra-court alterné avec des drops sludge — chaos total." },
    suno: { styleTags: ["whiplash tempo shifts", "micro-blast bursts into sludge crawls", "frantic powerviolence chaos", "loud"], structureTags: ["[Blast burst]", "[Sudden sludge drop]", "[Abrupt stop]"] },
  },
  "beatdown-hardcore": {
    ui: { label: "Beatdown Hardcore", signatures: ["4/4 lent (stomp)", "half-time"], references: ["Bulldoze", "Sunami"], description: "Stomp lent et menaçant, mosh assumé." },
    suno: { styleTags: ["slow menacing beatdown stomps", "heavy mosh riffs", "aggressive shouted vocals"], structureTags: ["[Beatdown stomp]", "[Mosh call]"] },
  },
  "rapcore": {
    ui: { label: "Rapcore / Rap Metal", signatures: ["4/4 (groove hip-hop)"], references: ["Rage Against the Machine", "Body Count"], description: "Flow rappé sur des riffs lourds." },
    suno: { styleTags: ["rapped verses over heavy riffs", "funky aggressive groove", "bounce and attitude"], structureTags: ["[Rapped verse]", "[Heavy chorus]"] },
  },

  // ------------------------------------------------- EXTRÊME AVANCÉ
  "brutal-death": {
    ui: { label: "Brutal Death Metal", signatures: ["4/4 (blast/slam)"], references: ["Suffocation", "Defeated Sanity"], description: "Death metal densifié, slams près du chevalet." },
    suno: { styleTags: ["punishing brutal death riffs", "deep guttural vocals", "slamming grooves", "relentless blast beats"], structureTags: ["[Slam section]", "[Blast beat section]"] },
  },
  "slam-metal": {
    ui: { label: "Slam Metal", signatures: ["4/4 lent (slam)", "half-time"], references: ["Devourment", "Waking the Cadaver"], description: "Le slam comme mode de vie — gutturals liquides, groove de bulldozer." },
    suno: { styleTags: ["gurgling guttural vocals", "knuckle-dragging slam grooves", "pitch-shifted brutality", "loud"], structureTags: ["[Slam section]", "[Half-time slam groove]"] },
  },
  "deathgrind": {
    ui: { label: "Deathgrind", signatures: ["4/4 (blast)", "2/4"], references: ["Cattle Decapitation", "Misery Index"], description: "Death metal à vitesse grind." },
    suno: { styleTags: ["deathgrind intensity", "technical blast barrage", "visceral growled screams", "loud"], structureTags: ["[All-out blast]", "[Grinding riff section]"] },
  },
  "blackened-death": {
    ui: { label: "Blackened Death Metal", signatures: ["4/4 (blast)", "6/8"], references: ["Behemoth", "Belphegor"], description: "Death metal trempé dans l'atmosphère black." },
    suno: { styleTags: ["blackened death riffing", "ominous ritual atmosphere", "tremolo over double kick"], structureTags: ["[Ritualistic tremolo section]", "[Blast beat section]"] },
  },
  "dissonant-death": {
    ui: { label: "Dissonant Death Metal", signatures: ["Métriques mouvantes", "7/8", "5/4"], references: ["Ulcerate", "Gorguts"], description: "Dissonance architecturale, angles impossibles." },
    suno: { styleTags: ["dissonant angular death metal", "unsettling atonal riffs", "shifting odd meters", "cavernous atmosphere"], meterHints: ["shifting between 7/8 and 5/4"], structureTags: ["[Dissonant swell]", "[Angular riff section]"] },
  },
  "funeral-doom": {
    ui: { label: "Funeral Doom", signatures: ["4/4 extrême-lent", "6/8"], references: ["Bell Witch", "Ahab", "Mournful Congregation"], description: "Plus lent que lent, chaque note est un deuil." },
    suno: { styleTags: ["glacial funeral pace", "cavernous mournful growls", "suffocating weight", "funereal organ textures"], structureTags: ["[Funeral pace section]", "[Mournful swell]"] },
  },
  "drone-metal": {
    ui: { label: "Drone Metal", signatures: ["Sans pulsation (drone)"], references: ["Sunn O)))", "Earth"], description: "Pas de beat — des murs de fréquences qui vibrent." },
    suno: { styleTags: ["beatless droning walls of amplifier worship", "sustained low-end vibration", "ritual ambience"], structureTags: ["[Drone swell]", "[Feedback meditation]"] },
  },
  "dsbm": {
    ui: { label: "DSBM (Depressive Black)", signatures: ["4/4 lent-mid", "6/8"], references: ["Xasthur", "Silencer", "Shining"], description: "Black metal du désespoir — wails torturés, boucles hypnotiques." },
    suno: { styleTags: ["anguished tortured wails", "hypnotic depressive tremolo loops", "raw lo-fi despair", "dragging mid-tempo"], structureTags: ["[Tortured wail section]", "[Hypnotic loop]"] },
  },
  "symphonic-black": {
    ui: { label: "Symphonic Black Metal", signatures: ["4/4 (blast)", "3/4", "6/8"], references: ["Dimmu Borgir", "Emperor", "Carach Angren"], description: "Black metal orchestral, grandeur cinématique." },
    suno: { styleTags: ["orchestral black metal grandeur", "cinematic choirs over blast beats", "tremolo with symphonic layers"], structureTags: ["[Orchestral blast section]", "[Cinematic interlude]"] },
  },
  "atmospheric-sludge": {
    ui: { label: "Atmospheric Sludge", signatures: ["4/4 lent", "6/8"], references: ["Neurosis", "Amenra"], description: "Sludge élevé en cathédrale — poids + espace." },
    suno: { styleTags: ["cavernous atmospheric sludge", "slow tectonic riffs", "anguished distant screams", "expansive dynamics"], structureTags: ["[Slow build]", "[Crushing climax]"] },
  },

  // ------------------------------------------------- CORE MODERNE
  "melodic-deathcore": {
    ui: { label: "Melodic Deathcore", signatures: ["4/4", "half-time (breakdowns)"], references: ["Shadow of Intent", "Brand of Sacrifice"], description: "Deathcore avec leads mélodiques et ampleur symphonique." },
    suno: { styleTags: ["melodic deathcore leads", "crushing breakdowns under soaring melodies", "dynamic gutturals and highs"], structureTags: ["[Melodic lead section]", "[Crushing breakdown, quarter-time feel]"] },
  },
  "technical-deathcore": {
    ui: { label: "Technical Deathcore", signatures: ["4/4", "métriques brisées"], references: ["Rings of Saturn", "Viraemia"], description: "Deathcore alien — sweeps, glitchs rythmiques." },
    suno: { styleTags: ["alien technical riffing", "glitchy rhythmic stutters", "sweep arpeggios into breakdowns"], structureTags: ["[Technical flurry]", "[Glitch breakdown]"] },
  },
  "melodic-metalcore": {
    ui: { label: "Melodic Metalcore", signatures: ["4/4", "half-time"], references: ["Trivium", "All That Remains", "Bullet for My Valentine"], description: "Metalcore accrocheur, refrains clean soignés." },
    suno: { styleTags: ["melodic metalcore hooks", "clean sung choruses over harsh verses", "twin lead melodies"], structureTags: ["[Melodic chorus]", "[Breakdown, half-time feel]"] },
  },
  "modern-metalcore": {
    ui: { label: "Modern Metalcore", signatures: ["4/4", "half-time", "syncopes djent"], references: ["Architects", "Currents", "Invent Animate"], description: "Metalcore 2020s — ambiances, syncopes, production massive." },
    suno: { styleTags: ["modern metalcore atmosphere", "syncopated low-tuned grooves", "soaring cleans over screams", "massive organic mix"], structureTags: ["[Atmospheric verse]", "[Massive breakdown]"] },
  },
  "progressive-metalcore": {
    ui: { label: "Progressive Metalcore", signatures: ["7/8", "5/4", "polymètres", "4/4"], references: ["Erra", "Periphery", "Northlane"], description: "Metalcore + métriques prog + textures planantes." },
    suno: { styleTags: ["progressive metalcore", "odd-meter riffing", "ethereal clean passages", "polymetric grooves"], meterHints: ["in 7/8"], structureTags: ["[Odd-meter section]", "[Ethereal bridge]"] },
  },
  "atmospheric-metalcore": {
    ui: { label: "Atmospheric Metalcore", signatures: ["4/4", "half-time"], references: ["Invent Animate", "Thornhill"], description: "Metalcore immersif, nappes et espace." },
    suno: { styleTags: ["lush atmospheric layers", "spacious metalcore dynamics", "reverb-soaked leads"], structureTags: ["[Ambient swell]", "[Heavy drop]"] },
  },
  "arena-metalcore": {
    ui: { label: "Arena Metalcore", signatures: ["4/4 (stadium)"], references: ["Bring Me The Horizon", "Bad Omens"], description: "Metalcore taillé pour les stades — hooks énormes." },
    suno: { styleTags: ["stadium-sized metalcore hooks", "electronic accents", "huge singalong choruses"], structureTags: ["[Anthemic chorus]", "[Drop breakdown]"] },
  },
  "synth-metalcore": {
    ui: { label: "Synth Metalcore", signatures: ["4/4"], references: ["Motionless in White", "Static Dress"], description: "Metalcore chargé de synthés dark." },
    suno: { styleTags: ["dark synth layers over metalcore riffs", "industrial-tinged breakdowns", "electronic pulses"], structureTags: ["[Synth intro]", "[Electronic breakdown]"] },
  },
  "ambient-metalcore": {
    ui: { label: "Ambient Metalcore", signatures: ["4/4 flottant"], references: ["Loathe", "Holding Absence"], description: "Shoegaze + metalcore — beauté qui écrase." },
    suno: { styleTags: ["dreamy shoegaze textures into crushing riffs", "ethereal vocals over low-tuned heaviness", "ambient-to-heavy dynamics"], structureTags: ["[Dreamy passage]", "[Sudden heavy drop]"] },
  },
  "pop-metalcore": {
    ui: { label: "Pop Metalcore", signatures: ["4/4 (structure pop)"], references: ["Bad Omens", "Sleep Token"], description: "Songwriting pop, exécution metalcore." },
    suno: { styleTags: ["pop song structures with metalcore weight", "catchy melodic vocals", "polished heavy drops"], structureTags: ["[Catchy chorus]", "[Heavy drop]"] },
  },
  "electronicore": {
    ui: { label: "Electronicore", signatures: ["4/4 (EDM x core)"], references: ["Enter Shikari", "Attack Attack!"], description: "Metalcore + drops électro." },
    suno: { styleTags: ["EDM drops into breakdowns", "glitchy electronics with metalcore riffs", "rave-to-mosh energy"], structureTags: ["[EDM drop]", "[Breakdown, half-time feel]"] },
  },
  "post-hardcore": {
    ui: { label: "Post-Hardcore", signatures: ["4/4", "dynamiques fortes"], references: ["Underoath", "Thursday", "Glassjaw"], description: "Hardcore émotif et expérimental, tension/relâche." },
    suno: { styleTags: ["emotional post-hardcore dynamics", "screamed verses into soaring cleans", "angular guitar interplay"], structureTags: ["[Quiet tense verse]", "[Cathartic chorus]"] },
  },
  "progressive-post-hardcore": {
    ui: { label: "Progressive Post-Hardcore", signatures: ["Changements fréquents", "7/8"], references: ["Dance Gavin Dance", "Hail the Sun"], description: "Post-hardcore virtuose, sassy et imprévisible." },
    suno: { styleTags: ["intricate noodly guitar work", "sassy vocal swagger with screams", "unpredictable song turns"], meterHints: ["occasional 7/8 turns"], structureTags: ["[Noodly interlude]", "[Sassy verse]"] },
  },
  "modern-alternative-metal": {
    ui: { label: "Modern Alternative Metal", signatures: ["4/4", "syncopes"], references: ["Sleep Token", "Spiritbox", "Loathe"], description: "Alt-metal 2020s — R&B, électro pis lourdeur fusionnés." },
    suno: { styleTags: ["genre-blending alternative metal", "soulful vocals into crushing riffs", "electronic textures with organic weight"], structureTags: ["[Soulful verse]", "[Crushing drop]"] },
  },
  "nwobhm": {
    ui: { label: "NWOBHM", signatures: ["4/4", "6/8 (gallop)"], references: ["Iron Maiden", "Saxon", "Diamond Head"], description: "La nouvelle vague britannique — twin guitars, gallop, énergie." },
    suno: { styleTags: ["nwobhm twin guitar attack", "galloping rhythms", "soaring heavy metal vocals", "early 80s british steel sound"], structureTags: ["[Twin guitar harmony]", "[Gallop riff]"] },
  },
};

// ---------------------------------------------------------------------
// Helper : tags Suno d'un style (backend seulement)
// ---------------------------------------------------------------------
export function getSunoRhythmTags(styleId, { includeMeterHints = true } = {}) {
  const style = TIME_SIGNATURES_BY_STYLE[styleId];
  if (!style) return { styleTags: [], structureTags: [] };
  const { styleTags = [], meterHints = [], structureTags = [] } = style.suno;
  return {
    styleTags: includeMeterHints ? [...styleTags, ...meterHints] : styleTags,
    structureTags,
  };
}

// ---------------------------------------------------------------------
// Helper : archétype le plus proche des sliders d'atmosphère
// sliders = { darkness, aggression, technicality, atmosphere } (0-100)
// ---------------------------------------------------------------------
export function pickArchetype(styleId, sliders) {
  const style = TIME_SIGNATURES_BY_STYLE[styleId];
  if (!style?.archetypes?.length) return null;
  let best = null;
  let bestDist = Infinity;
  for (const arch of style.archetypes) {
    const dist = Object.keys(arch.profile).reduce((sum, axis) => {
      const d = (sliders[axis] ?? 50) - arch.profile[axis];
      return sum + d * d;
    }, 0);
    if (dist < bestDist) {
      bestDist = dist;
      best = arch;
    }
  }
  return { id: best.id, uiLabel: best.uiLabel, sunoTags: best.sunoTags };
}

// ---------------------------------------------------------------------
// Helper : BLEND de 2-3 styles. Premier = dominant (tous ses tags).
// Les secondaires contribuent leurs 2 tags les plus distinctifs.
// Conflits tempo/feel : le dominant gagne.
// ---------------------------------------------------------------------
const CONFLICT_GROUPS = [
  ["crushing slow tempo", "breakneck tempo", "relentless driving rhythm", "chaotic breakneck tempo", "heavy dragging rhythm", "doom-laden pace", "aggressive up-tempo thrash"],
  ["mechanical precision", "machine-like precision", "sludgy swung rhythm", "bluesy shuffle feel", "swampy dragging groove"],
];

export function blendStyles(styleIds, { includeMeterHints = false, maxStyleTags = 10 } = {}) {
  const ids = styleIds.slice(0, 3);
  const styles = ids.map((id) => TIME_SIGNATURES_BY_STYLE[id]).filter(Boolean);
  if (!styles.length) return { styleTags: [], structureTags: [] };

  const styleTags = [];
  const structureTags = [];
  const taken = new Set();

  styles.forEach((style, idx) => {
    const { styleTags: tags = [], meterHints = [], structureTags: sTags = [] } = style.suno;
    const candidates = idx === 0
      ? [...tags, ...(includeMeterHints ? meterHints : [])]
      : tags.slice(0, 2);
    for (const tag of candidates) {
      if (taken.has(tag)) continue;
      const group = CONFLICT_GROUPS.find((g) => g.includes(tag));
      if (group && idx > 0 && styleTags.some((t) => group.includes(t))) continue;
      styleTags.push(tag);
      taken.add(tag);
    }
    (idx === 0 ? sTags : sTags.slice(0, 1)).forEach((t) => {
      if (!structureTags.includes(t)) structureTags.push(t);
    });
  });

  return { styleTags: styleTags.slice(0, maxStyleTags), structureTags };
}

// ---------------------------------------------------------------------
// Helper : version publique (frontend-safe)
// Ne JAMAIS exposer `suno` ni `archetypes[].refBand`/`sunoTags`.
// ---------------------------------------------------------------------
export function getPublicTimeSignatures() {
  return Object.fromEntries(
    Object.entries(TIME_SIGNATURES_BY_STYLE).map(([id, s]) => [
      id,
      {
        ...s.ui,
        archetypes: (s.archetypes ?? []).map(({ id: aid, uiLabel, profile }) => ({
          id: aid,
          uiLabel,
          profile,
        })),
      },
    ])
  );
}
