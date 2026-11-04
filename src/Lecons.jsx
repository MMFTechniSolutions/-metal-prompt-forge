// Section Leçons de MetalPrompt (nov. 2026).
// Guitare : « Le galop » jouable. Saxo (alto/ténor) et violon : parcours pentatonique mineure,
// avec transposition automatique, bourdon et play-along. Méthodes de gammes par époque (70s → 10s).
// Son synthétisé en WebAudio (ébauche) — à remplacer par les samples du générateur Riff.
import { useState, useEffect, useRef, useMemo } from "react";

const CSS = `
.mpl{--bg:#0C0D0F;--panel:#15171B;--panel2:#1C1F24;--line:#2A2E35;--fg:#F2F1ED;--muted:#8A8F97;--ember:#FF6A2B;--ember2:#FFB36B;--ok:#5FD08A;
  --mono:"Geist Mono",ui-monospace,Menlo,monospace;color:var(--fg);font-family:"Geist",system-ui,sans-serif;font-size:15px;line-height:1.5;
  max-width:1180px;margin:0 auto;padding:20px 16px 40px;display:flex;flex-direction:column;gap:18px}
.mpl *{box-sizing:border-box}
.mpl button{font:inherit}
.mpl button:focus-visible,.mpl input:focus-visible,.mpl select:focus-visible{outline:2px solid var(--ember2);outline-offset:2px}
.mpl-top{display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px}
.mpl-top h2{margin:0;font-weight:800;font-size:22px;letter-spacing:-.01em}
.mpl-inst{display:flex;flex-wrap:wrap;gap:6px;margin-left:auto}
.mpl-inst button,.mpl-pill{font-size:14px;color:var(--muted);background:transparent;border:1px solid var(--line);border-radius:999px;padding:6px 14px;cursor:pointer}
.mpl-inst button[aria-pressed="true"]{color:var(--bg);background:var(--fg);border-color:var(--fg);font-weight:600}
.mpl-inst button:disabled{cursor:not-allowed;opacity:.5}
.mpl-inst small{font-size:10.5px;margin-left:5px;text-transform:uppercase;letter-spacing:.06em}
.mpl-pill{font-size:13px;padding:5px 12px}
.mpl-pill[aria-pressed="true"]{border-color:var(--ember);color:var(--fg)}
.mpl-grid{display:grid;grid-template-columns:290px minmax(0,1fr);gap:18px;align-items:start}
@media (max-width:860px){.mpl-grid{grid-template-columns:1fr}}
.mpl-rail{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px}
.mpl-rail h3{margin:0;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600}
.mpl-meter{height:6px;border-radius:9px;background:var(--panel2);overflow:hidden}.mpl-meter i{display:block;height:100%;background:var(--ember)}
.mpl-small{margin:0;color:var(--muted);font-size:13px}
.mpl-path{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.mpl-path button{width:100%;display:grid;grid-template-columns:26px minmax(0,1fr) auto;align-items:center;gap:10px;padding:8px;border-radius:9px;font-size:14px;background:none;border:0;color:var(--fg);text-align:left;cursor:pointer}
.mpl-path button:hover{background:var(--panel2)}
.mpl-path .n{font-family:var(--mono);font-size:12px;color:var(--muted);text-align:center}
.mpl-path .done .n{color:var(--ok)}
.mpl-path button[aria-current="true"]{background:var(--panel2);outline:1px solid var(--ember)}
.mpl-path button[aria-current="true"] .n{color:var(--ember)}
.mpl-path .lock{color:var(--muted)}
.mpl-tag{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;border-radius:6px;padding:2px 6px;border:1px solid var(--line);color:var(--muted)}
.mpl-tag.free{border-color:#3a4b3f;color:var(--ok)}.mpl-tag.pro{border-color:#5a3a26;color:var(--ember2)}
.mpl-main{display:flex;flex-direction:column;gap:16px;min-width:0}
.mpl-head{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px 20px}
.mpl-eyebrow{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--ember);font-weight:600}
.mpl-head h1{margin:2px 0 0;font-weight:800;font-size:clamp(28px,4.4vw,44px);line-height:1.05;letter-spacing:-.02em;text-wrap:balance}
.mpl-meta{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}
.mpl-chip{font-family:var(--mono);font-size:12px;color:var(--fg);background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:5px 9px}
.mpl-goal{margin:0;color:var(--muted);max-width:70ch}.mpl-goal b{color:var(--fg);font-weight:600}
.mpl-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
@media (max-width:560px){.mpl-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}
.mpl-steps button{text-align:left;cursor:pointer;background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:10px 12px;color:var(--muted);display:flex;flex-direction:column;gap:2px}
.mpl-steps b{color:var(--fg);font-size:14px;font-weight:600}.mpl-steps span{font-size:12px}
.mpl-steps button[aria-pressed="true"]{border-color:var(--ember);background:var(--panel2)}
.mpl-steps button[aria-pressed="true"] b{color:var(--ember)}
.mpl-stage{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:14px;min-width:0}
.mpl-stagehead{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px}
.mpl-stagehead p{margin:0;font-size:14px;color:var(--muted);flex:1 1 280px;min-width:0}.mpl-stagehead p b{color:var(--fg)}
.mpl-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.mpl-row label{font-size:13px;color:var(--muted)}
.mpl-box{overflow-x:auto;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:14px 10px 10px}
.mpl-tab{display:grid;grid-auto-flow:column;grid-template-rows:repeat(6,22px) 18px;width:max-content;font-family:var(--mono);font-size:13px}
.mpl-tab .lbl{color:var(--muted);padding-right:8px;display:flex;align-items:center;justify-content:flex-end}
.mpl-tab .c{width:26px;display:flex;align-items:center;justify-content:center;position:relative}
.mpl-tab .c::before{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:var(--line)}
.mpl-tab .c span{position:relative;background:var(--bg);padding:0 2px;min-width:14px;text-align:center}
.mpl-tab .c span:empty{background:transparent}
.mpl-tab .c.pm span{color:var(--ember2)}
.mpl-tab .c.on span:not(:empty){background:var(--ember);color:var(--bg);border-radius:4px}
.mpl-tab .bar{width:10px;position:relative}.mpl-tab .bar::after{content:"";position:absolute;left:4px;top:11px;bottom:7px;width:1px;background:var(--muted)}
.mpl-tab .pmrow{font-size:10px;color:var(--ember2);display:flex;align-items:center;justify-content:center}
.mpl-legend{display:flex;flex-wrap:wrap;gap:14px;font-size:12px;color:var(--muted)}.mpl-legend b{color:var(--ember2);font-family:var(--mono);font-weight:600}
.mpl-pads{display:flex;flex-wrap:wrap;gap:8px}
.mpl-pad{min-width:74px;padding:10px 12px;border-radius:12px;background:var(--panel2);border:1px solid var(--line);display:flex;flex-direction:column;align-items:center;gap:2px;transition:background .08s}
.mpl-pad b{font-size:20px;font-weight:800}.mpl-pad span{font-size:11px;color:var(--muted);font-family:var(--mono);text-align:center}
.mpl-pad.root{border-color:#5a3a26}.mpl-pad.blue{border-style:dashed}
.mpl-pad.on{background:var(--ember);border-color:var(--ember)}.mpl-pad.on b,.mpl-pad.on span{color:var(--bg)}
.mpl-seq{display:flex;flex-wrap:wrap;gap:4px;font-family:var(--mono);font-size:13px}
.mpl-seq span{padding:3px 7px;border-radius:6px;background:var(--panel2);color:var(--muted)}
.mpl-seq span.on{background:var(--fg);color:var(--bg)}
.mpl-transport{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px}
.mpl-play{font-weight:600;font-size:15px;cursor:pointer;border:0;border-radius:11px;padding:11px 20px;background:var(--ember);color:var(--bg);min-width:120px}
.mpl-play[aria-pressed="true"]{background:var(--fg)}
.mpl-ghost{font-size:14px;cursor:pointer;border:1px solid var(--line);border-radius:11px;padding:10px 14px;background:transparent;color:var(--fg)}
.mpl-ghost:hover,.mpl-steps button:hover,.mpl-pill:hover{border-color:var(--muted)}
.mpl-tempo{display:flex;align-items:center;gap:10px;flex:1 1 260px;min-width:0}
.mpl-tempo label{font-size:13px;color:var(--muted);white-space:nowrap}
.mpl-tempo input{flex:1;min-width:0;accent-color:var(--ember)}
.mpl-bpm{font-family:var(--mono);font-size:22px;font-weight:600;font-variant-numeric:tabular-nums;min-width:96px}
.mpl-bpm small{font-size:12px;color:var(--muted);font-weight:400}
.mpl-toggles{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--muted)}
.mpl-toggles label{display:flex;align-items:center;gap:6px;cursor:pointer}.mpl-toggles input{accent-color:var(--ember)}
.mpl-coach{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
@media (max-width:620px){.mpl-coach{grid-template-columns:1fr}}
.mpl-card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;min-width:0}
.mpl-card h4{margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600}
.mpl-big{font-family:var(--mono);font-size:26px;font-weight:600;font-variant-numeric:tabular-nums}
.mpl-card p{margin:0;font-size:13px;color:var(--muted)}
.mpl-dots{display:flex;gap:6px}.mpl-dots i{width:14px;height:14px;border-radius:50%;border:1px solid var(--line);background:var(--panel2)}.mpl-dots i.on{background:var(--ok);border-color:var(--ok)}
.mpl-okmsg{color:var(--ok);font-weight:600;font-size:13px}
.mpl-tips{margin:0;padding-left:18px;color:var(--muted);font-size:13px;display:flex;flex-direction:column;gap:4px}
.mpl-methods{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
@media (max-width:1000px){.mpl-methods{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:640px){.mpl-methods{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:420px){.mpl-methods{grid-template-columns:1fr}}
.mpl-method{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px;min-width:0}
.mpl-era{font-weight:800;font-size:30px;letter-spacing:-.02em;line-height:1}
.mpl-era small{display:block;font-size:12px;color:var(--muted);font-weight:500;letter-spacing:0;margin-top:4px}
.mpl-method ul{margin:0;padding-left:16px;font-size:13px;display:flex;flex-direction:column;gap:3px}
.mpl-method ul span{color:var(--muted)}
.mpl-buy{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:8px;border-top:1px solid var(--line)}
.mpl-price{white-space:nowrap;font-family:var(--mono);font-weight:600;color:var(--ember2)}
.mpl-buy button,.mpl-cta{font-size:13px;font-weight:600;cursor:pointer;border:0;border-radius:9px;padding:7px 12px;background:var(--ember);color:var(--bg)}
.mpl-pack{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;padding:12px 14px;border:1px dashed #5a3a26;border-radius:12px}
.mpl-pack p{margin:0;flex:1 1 260px;font-size:14px;color:var(--muted)}.mpl-pack p b{color:var(--fg)}
.mpl-note{font-size:12px;color:var(--muted);border-top:1px solid var(--line);padding-top:12px;margin:0}
.mpl-toast{background:var(--panel2);border:1px solid var(--ember);border-radius:10px;padding:10px 14px;font-size:14px}
@media (prefers-reduced-motion:reduce){.mpl *{transition:none!important}}
`;

// ───────── Données ─────────
const NOTE_FR = ["Do","Do#","Ré","Ré#","Mi","Fa","Fa#","Sol","Sol#","La","La#","Si"];
const NOTE_EN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const PENTA = [0, 3, 5, 7, 10, 12];
const BLUES = [0, 3, 5, 6, 7, 10, 12];
const KEYS = { E: 4, D: 2, C: 0 };                    // tonalité de la toune (accordage)
const KEY_LBL = { E: ["Mi · standard", "E · standard"], D: ["Ré · drop D", "D · drop D"], C: ["Do · drop C", "C · drop C"] };
const TRANSPO = { alto: 9, tenor: 14, vln: 0 };         // écrit = réel + n demi-tons
const LEAD_BASE = { alto: 60, tenor: 48, vln: 60 };     // Do réel de base du registre
const VLN_STR = [[55, "Sol", "G"], [62, "Ré", "D"], [69, "La", "A"], [76, "Mi", "E"]];

const GTR_PATH = [
  ["Accordage drop D & posture", "Drop D tuning & posture", "free"], ["Palm mute sur corde à vide", "Palm mute on the open string", "free"],
  ["Le galop", "The gallop", "free", "gallop"], ["Endurance en downpicking", "Downpicking endurance", "pro"], ["Power chords une barre", "One-finger power chords", "pro"],
  ["Alternate picking", "Alternate picking", "pro"], ["Tremolo picking", "Tremolo picking", "pro"], ["Harmoniques pincées", "Pinch harmonics", "pro"],
  ["Syncopes & breakdown", "Syncopation & breakdowns", "pro"], ["Défi final : riff + band", "Final challenge: riff + band", "pro"],
];
const BASS_PATH = [
  ["Accordage & posture, sangle à la bonne hauteur", "Tuning & posture, strap at the right height", "free"], ["Jeu aux doigts : alternance index-majeur", "Fingerstyle: index-middle alternation", "free"],
  ["Le galop aux doigts (école Steve Harris)", "Fingerstyle gallop (Steve Harris school)", "free", "gallop"], ["Jeu au médiator : downpicking", "Pick playing: downpicking", "pro"],
  ["Étouffer les cordes (main gauche + pouce)", "Muting strings (fretting hand + thumb)", "pro"], ["Ghost notes & syncopes", "Ghost notes & syncopation", "pro"],
  ["Slap (pouce)", "Slap (thumb)", "pro"], ["Popping (index qui tire)", "Popping (index pull)", "pro"],
  ["Suivre la grosse caisse", "Locking with the kick drum", "pro"], ["Défi final : ligne de basse + band", "Final challenge: bass line + band", "pro"],
];
const PENTA_PATH = [
  ["Les 5 notes sur bourdon", "The 5 notes over a drone", "free", "notes", 60],
  ["Montée-descente au métronome", "Up and down with the metronome", "free", "updown", 90],
  ["Patterns en groupes de 3", "Patterns in groups of 3", "free", "groups3", 90],
  ["La blue note (penta blues)", "The blue note (blues scale)", "pro", "blues", 100],
  ["Phrasés de solo sur un riff", "Solo phrases over a riff", "pro", "phrase", 110],
  ["Défi : improvise 8 mesures", "Challenge: improvise 8 bars", "pro", "impro", 110],
];
const PENTA_GOAL = {
  notes: ["tenir chaque note 2 temps, bien juste sur le bourdon, en montant puis en descendant.", "hold each note for 2 beats, in tune with the drone, going up then down."],
  updown: ["enchaîner la gamme en croches, montée et descente, sans casser le tempo.", "run the scale in eighth notes, up and down, without breaking tempo."],
  groups3: ["jouer la gamme par groupes de 3 notes (1-2-3, 2-3-4…). C'est ce qui rend un solo fluide.", "play the scale in groups of 3 notes (1-2-3, 2-3-4…). That's what makes a solo flow."],
  blues: ["ajouter la quinte diminuée entre la 3e et la 4e note. C'est le son des 70s-80s.", "add the flat fifth between the 3rd and 4th notes. That's the 70s-80s sound."],
  phrase: ["rejouer une phrase de 2 mesures par-dessus un riff de band. Change de phrase quand c'est acquis.", "play back a 2-bar phrase over a band riff. Get a new phrase once it's solid."],
  impro: ["improviser 8 mesures sur le riff avec seulement ces 5 notes. Finis toujours sur la note de base.", "improvise 8 bars over the riff using only these 5 notes. Always land on the root."],
};

const ERAS = [
  ["70s", ["proto-metal · heavy", "proto-metal · heavy"]], ["80s", ["thrash · speed · shred", "thrash · speed · shred"]],
  ["90s", ["death · groove · nu", "death · groove · nu"]], ["00s", ["metalcore · djent · deathcore", "metalcore · djent · deathcore"]],
  ["10s", ["prog · djent moderne", "prog · modern djent"]],
];
const METHOD_ITEMS = {
  string: {
    "70s": [["Power chords", "Sabbath, Priest"], ["Downpicking soutenu", "le son lourd"], ["Penta blues", "les solos Iommi"], ["Bends & trilles", "le blues durci"]],
    "80s": [["Alternate picking", "le thrash"], ["Mineur harmonique + sweep", "le néo-classique"], ["Tapping", "les solos shred"], ["Tremolo picking", "le début du death"]],
    "90s": [["Drop D / drop C", "le son massif"], ["Harmoniques pincées", "le cri de la guitare"], ["Chromatisme & triton", "la dissonance"], ["Riffs syncopés", "le groove"]],
    "00s": [["Palm mute djent", "serré, percussif"], ["Breakdowns", "cordes à vide"], ["Phrygien dominant", "l'oriental metalcore"], ["Hybrid picking", "sauts de cordes"]],
    "10s": [["Polyrythmie", "3 contre 4"], ["Lydien", "le prog lumineux"], ["Thumping", "le pouce façon slap"], ["Selective picking", "legato + tapping"]],
  },
  bass: {
    "70s": [["Jeu aux doigts", "Geezer Butler"], ["Suivre le riff", "l'unisson guitare"], ["Penta mineure", "les fills"], ["Vibrato", "l'expression"]],
    "80s": [["Galop aux doigts", "Steve Harris"], ["Médiator downpicking", "le thrash"], ["Mineur harmonique", "les lignes néo-classiques"], ["Tapping", "les solos de basse"]],
    "90s": [["Slap & popping", "le funk-métal, nu-metal"], ["5 cordes / drop", "le son massif"], ["Chromatisme", "les lignes death"], ["Ghost notes", "le groove"]],
    "00s": [["Basse distortionnée", "metalcore"], ["Breakdowns avec la grosse caisse", "le verrouillage"], ["Phrygien dominant", "l'oriental"], ["Jeu au médiator rapide", "le mélodeath"]],
    "10s": [["Thumping & double thumb", "le prog moderne"], ["6 cordes, accords", "le djent"], ["Polyrythmie", "3 contre 4"], ["Tapping à deux mains", "les nappes"]],
  },
  melodic: {
    "70s": [["Penta mineure", "la base"], ["Penta blues", "la blue note"], ["Mineur naturel", "le heavy"], ["Vibrato & glissés", "l'expression"]],
    "80s": [["Mineur harmonique", "le néo-classique"], ["Arpèges rapides", "le shred"], ["Phrygien", "le thrash sombre"], ["Trilles", "la virtuosité"]],
    "90s": [["Chromatisme", "les lignes death"], ["Phrygien", "le groove lourd"], ["Locrien", "le black"], ["Triton", "la dissonance"]],
    "00s": [["Phrygien dominant", "folk & oriental"], ["Mineur harmonique", "les leads mélodeath"], ["Dorien", "les refrains"], ["Unissons", "doubler la guitare"]],
    "10s": [["Lydien", "le prog"], ["Ton par ton", "le côté étrange"], ["Polymétrie", "les décalages"], ["Textures", "l'ambiant"]],
  },
  drums: {
    "70s": [["Shuffle lourd", "le proto-metal"], ["Fills sur toms", "l'école heavy"], ["Ride & crash", "les accents"], ["Groove 4/4", "la base"]],
    "80s": [["Beat thrash", "le galop"], ["Double pédale", "croches"], ["Skank beat", "le punk thrash"], ["Fills rapides", "le speed"]],
    "90s": [["Blast beat", "traditionnel et bomb"], ["D-beat", "le crust"], ["Double pédale en doubles", "le death"], ["Groove half-time", "le groove"]],
    "00s": [["Breakdowns", "les cassures"], ["Gravity blast", "la vitesse"], ["Bounce", "le nu-metal"], ["Chinas & stacks", "les accents"]],
    "10s": [["Polyrythmie", "3 contre 4"], ["Ghost notes", "la précision"], ["Blast en 7/8", "le prog"], ["Beat-downs", "le deathcore"]],
  },
};
const M_INST = [["gtr", "Guitare", "Guitar", "string"], ["bass", "Basse", "Bass", "bass"], ["drum", "Batterie", "Drums", "drums"],
  ["keys", "Clavier", "Keys", "melodic"], ["sax", "Saxo", "Sax", "melodic"], ["vln", "Violon", "Violin", "melodic"]];

// ───────── Générateurs de patterns (pas = double croche) ─────────
function genGallop() {
  const ev = [], frets = [0, 0, 0, 1, 3, 5, 7];
  for (let beat = 0; beat < 8; beat++) {
    if (beat === 3 || beat === 7) { ev.push({ step: beat * 4, chord: [3, 5, 7, 5][Math.floor(Math.random() * 4)], len: 4 }); continue; }
    const f = beat % 4 === 0 ? 0 : frets[Math.floor(Math.random() * frets.length)];
    [0, 2, 3].forEach(s => ev.push({ step: beat * 4 + s, fret: f, pm: true, len: s === 0 ? 2 : 1 }));
  }
  return { kind: "gtr", ev, len: 32 };
}
function seqFrom(degIdx, stepLen) {           // degIdx : index dans la gamme ; durées égales, complétées à la mesure
  const ev = degIdx.map((d, i) => ({ step: i * stepLen, deg: d, len: stepLen, idx: i }));
  const total = ev.length * stepLen, pad = (16 - (total % 16)) % 16;
  if (pad) ev[ev.length - 1].len += pad;
  return { ev, len: total + pad };
}
function genPhrase() {
  const cells = [[2, 2], [4], [1, 1, 2], [2, 1, 1], [3, 1], [2, 2]];
  const ev = []; let step = 0, d = Math.floor(Math.random() * 3) + 1, i = 0;
  while (step < 28) {
    const cell = cells[Math.floor(Math.random() * cells.length)];
    for (const l of cell) { if (step >= 28) break; ev.push({ step, deg: d, len: l, idx: i++ }); step += l;
      d = Math.max(0, Math.min(5, d + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)])); }
  }
  ev.push({ step: 28, deg: 0, len: 4, idx: i });
  return { ev, len: 32 };
}
function genMelodic(type) {
  if (type === "notes") return seqFrom([0, 1, 2, 3, 4, 5, 4, 3, 2, 1], 8);
  if (type === "updown") return seqFrom([0, 1, 2, 3, 4, 5, 5, 4, 3, 2, 1, 0], 2);
  if (type === "groups3") return seqFrom([0, 1, 2, 1, 2, 3, 2, 3, 4, 3, 4, 5, 5, 4, 3, 4, 3, 2, 3, 2, 1, 2, 1, 0], 2);
  if (type === "blues") return seqFrom([0, 1, 2, 3, 4, 5, 6, 6, 5, 4, 3, 2, 1, 0], 2);
  if (type === "phrase") return genPhrase();
  return { ev: [], len: 64 };                // impro : le band seul, 4 mesures
}

// ───────── Audio ─────────
function makeAudio() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
  const shaper = ctx.createWaveShaper(); const cv = new Float32Array(2048);
  for (let i = 0; i < 2048; i++) cv[i] = Math.tanh((i / 2048 * 2 - 1) * 9);
  shaper.curve = cv; const post = ctx.createBiquadFilter(); post.type = "lowpass"; post.frequency.value = 4200; shaper.connect(post); post.connect(master);
  const noise = (dur) => { const b = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ctx.createBufferSource(); s.buffer = b; return s; };
  const A = {
    ctx,
    gtr(t, freqs, pm, dur, vol = 1) {
      const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = pm ? 650 : 2600; lp.Q.value = pm ? 4 : 1;
      freqs.forEach(fr => [0, -7].forEach(det => { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = fr; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 0.05); }));
      lp.connect(g); g.connect(shaper);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime((pm ? 0.5 : 0.42) * vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + (pm ? Math.min(0.11, dur) : dur));
    },
    lead(t, f, dur, timbre) {                      // saxo : anche filtrée ; violon : archet lent + vibrato
      const vln = timbre === "vln", o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = "sawtooth"; o2.type = vln ? "sawtooth" : "square"; o.frequency.value = f; o2.frequency.value = f; o2.detune.value = vln ? 6 : -4;
      const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = vln ? 5.6 : 4.8; vg.gain.value = f * (vln ? 0.006 : 0.004);
      vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
      lp.type = "lowpass"; lp.frequency.value = vln ? 3200 : 1900; lp.Q.value = vln ? 0.7 : 2.2;
      const m2 = ctx.createGain(); m2.gain.value = vln ? 0.6 : 0.35; o.connect(lp); o2.connect(m2); m2.connect(lp); lp.connect(g); g.connect(master);
      const att = vln ? 0.07 : 0.03, pk = 0.2;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + att); g.gain.setValueAtTime(pk * 0.85, t + Math.max(att, dur - 0.06)); g.gain.linearRampToValueAtTime(0, t + dur);
      [o, o2, vib].forEach(x => { x.start(t); x.stop(t + dur + 0.05); });
    },
    bass(t, f, dur) {                               // basse aux doigts : rond, attaque douce
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = "sawtooth"; o2.type = "sine"; o.frequency.value = f; o2.frequency.value = f; lp.type = "lowpass"; lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(380, t + 0.18);
      o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.45, t + 0.008); g.gain.exponentialRampToValueAtTime(0.001, t + Math.max(0.08, dur));
      [o, o2].forEach(x => { x.start(t); x.stop(t + dur + 0.05); });
    },
    drone(f) {                                      // fondamentale + quinte, tenue
      const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
      const os = [f, f * 1.5, f / 2].map((fr, i) => { const o = ctx.createOscillator(); o.type = i === 2 ? "sine" : "triangle"; o.frequency.value = fr; o.connect(g); o.start(); return o; });
      g.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.4);
      return () => { g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setValueAtTime(g.gain.value, ctx.currentTime); g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3); os.forEach(o => o.stop(ctx.currentTime + 0.35)); };
    },
    click(t, acc) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = acc ? 1800 : 1200; o.connect(g); g.connect(master); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04); o.start(t); o.stop(t + 0.05); },
    kick(t) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); o.connect(g); g.connect(master); g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.start(t); o.stop(t + 0.3); },
    snare(t) { const s = noise(0.2), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = "highpass"; f.frequency.value = 1500; s.connect(f); f.connect(g); g.connect(master); g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16); s.start(t); },
    hat(t) { const s = noise(0.05), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = "highpass"; f.frequency.value = 7000; s.connect(f); f.connect(g); g.connect(master); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04); s.start(t); },
  };
  return A;
}
const mhz = m => 440 * Math.pow(2, (m - 69) / 12);

function violinFinger(m, fr) {
  for (let i = VLN_STR.length - 1; i >= 0; i--) {
    const [open, nfr, nen] = VLN_STR[i], d = m - open;
    if (d >= 0 && d <= 7) {
      const finger = d === 0 ? (fr ? "à vide" : "open") : d <= 2 ? "1" : d <= 4 ? "2" : d === 5 ? "3" : d === 6 ? "3↑" : "4";
      return (fr ? "corde " + nfr : nen + " string") + " · " + (d === 0 ? finger : (fr ? "doigt " : "finger ") + finger);
    }
  }
  return "";
}

// ───────── Composant ─────────
export default function Lecons({ uiLang = "fr", canAccess = () => true, onPaywall = () => {} }) {
  const fr = uiLang === "fr", L = (a, b) => (fr ? a : b);
  const [inst, setInst] = useState("gtr");
  const [saxType, setSaxType] = useState("alto");
  const [key, setKey] = useState("E");
  const [lesson, setLesson] = useState({ gtr: 2, bass: 2, sax: 0, vln: 0 });
  const [mode, setMode] = useState("practice");
  const [seed, setSeed] = useState(0);
  const [pct, setPct] = useState(70);
  const [metro, setMetro] = useState(true);
  const [auto, setAuto] = useState(false);
  const [drone, setDrone] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(-1);
  const [clean, setClean] = useState(0);
  const [best, setBest] = useState(0);
  const [toast, setToast] = useState("");
  const [mInst, setMInst] = useState("gtr");

  const melodic = inst === "sax" || inst === "vln";
  const voice = inst === "vln" ? "vln" : saxType;
  const path = melodic ? PENTA_PATH : inst === "bass" ? BASS_PATH : GTR_PATH;
  const li = lesson[inst] ?? 0;
  const cur = path[li];
  const lessonType = melodic ? cur[3] : "gallop";
  const target = melodic ? cur[4] : 140;
  const bpm = Math.round(target * pct / 100);
  const scale = lessonType === "blues" ? BLUES : PENTA;
  const leadRoot = LEAD_BASE[voice] + KEYS[key];
  const bandRoot = 36 + KEYS[key];              // Do2 / Ré2 / Mi2 : la guitare du band
  const bestKey = "mp_les_" + inst + "_" + li;

  const pattern = useMemo(() => (melodic ? genMelodic(lessonType) : genGallop()), [melodic, lessonType, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const backing = melodic && (mode === "play" || mode === "challenge" || lessonType === "phrase" || lessonType === "impro");
  const leadOn = !(melodic && mode === "challenge");

  // refs lus par l'ordonnanceur
  const R = useRef({});
  R.current = { bass: inst === "bass", pattern, bpm, metro, mode, melodic, voice, scale, leadRoot, bandRoot, backing, leadOn, target, auto, pct };
  const audio = useRef(null), timer = useRef(null), st = useRef({ step: 0, next: 0, loops: 0 }), stopDrone = useRef(null);

  useEffect(() => { try { setBest(+localStorage.getItem(bestKey) || 0); } catch { setBest(0); } setClean(0); }, [bestKey]);
  useEffect(() => () => { clearInterval(timer.current); stopDrone.current && stopDrone.current(); }, []);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(""), 3500); return () => clearTimeout(id); }, [toast]);

  // bourdon : suit la tonalité et l'état de lecture
  useEffect(() => {
    stopDrone.current && stopDrone.current(); stopDrone.current = null;
    if (playing && melodic && drone && audio.current) stopDrone.current = audio.current.drone(mhz(leadRoot - 12));
  }, [playing, melodic, drone, leadRoot]);

  function loopDone() {
    const r = R.current; st.current.loops++;
    setBest(b => { if (r.bpm > b) { try { localStorage.setItem(bestKey, String(r.bpm)); } catch { /* stockage indisponible */ } return r.bpm; } return b; });
    if (r.bpm >= r.target) setClean(c => Math.min(3, c + 1));
    if (r.auto && st.current.loops % 2 === 0 && r.pct < 110) setPct(p => Math.min(110, p + 5));
  }
  function schedule() {
    const A = audio.current, ctx = A.ctx;
    while (st.current.next < ctx.currentTime + 0.12) {
      const r = R.current, t = st.current.next, sp = 60 / r.bpm / 4, s = st.current.step % r.pattern.len;
      if (r.melodic) {
        const e = r.pattern.ev.find(n => n.step === s);
        if (e && r.leadOn) A.lead(t, mhz(r.leadRoot + r.scale[Math.min(e.deg, r.scale.length - 1)]), sp * e.len * 0.95, r.voice);
        if (r.backing) {
          const bs = s % 16; if (bs % 4 === 0 || bs % 4 === 2 || bs % 4 === 3) A.gtr(t, [mhz(r.bandRoot)], true, sp * (bs % 4 === 0 ? 2 : 1), 0.7);
          if (bs % 8 === 0 || bs === 14) A.kick(t); if (bs % 8 === 4) A.snare(t); if (bs % 2 === 0) A.hat(t);
        }
        if (r.metro && !r.backing && s % 4 === 0) A.click(t, s % 16 === 0);
      } else {
        const e = r.pattern.ev.find(n => n.step === s), f = m => mhz((r.bass ? 26 : 38) + m);
        if (e && r.bass) A.bass(t, f(e.chord != null ? e.chord : e.fret), sp * e.len * (e.chord != null ? 0.95 : 0.8));
        else if (e) { if (e.chord != null) A.gtr(t, [f(e.chord), f(e.chord + 7), f(e.chord + 12)], false, sp * e.len * 0.95); else A.gtr(t, [f(e.fret)], true, sp * e.len); }
        if (r.metro && r.mode !== "play" && s % 4 === 0) A.click(t, s % 16 === 0);
        if (r.mode === "play") { if (s % 8 === 0 || s % 16 === 14) A.kick(t); if (s % 8 === 4) A.snare(t); if (s % 2 === 0) A.hat(t); }
      }
      const delay = Math.max(0, (t - ctx.currentTime) * 1000); setTimeout(() => setActive(s), delay);
      st.current.next += sp; st.current.step++;
      if (st.current.step % r.pattern.len === 0) loopDone();
    }
  }
  function start() {
    if (!audio.current) audio.current = makeAudio();
    if (audio.current.ctx.state === "suspended") audio.current.ctx.resume();
    st.current = { step: 0, next: audio.current.ctx.currentTime + 0.06, loops: 0 };
    clearInterval(timer.current); timer.current = setInterval(schedule, 25); setPlaying(true);
  }
  function stop() { clearInterval(timer.current); timer.current = null; setPlaying(false); setActive(-1); }

  function pickInst(id) { stop(); setInst(id); setMInst(id); setMode("practice"); setPct(70); setDrone(true); }
  function pickLesson(i) {
    const row = path[i];
    if (row[2] === "pro" && !canAccess("forge")) { onPaywall(); return; }
    if (!melodic && !row[3]) { setToast(L("Cette leçon arrive dans la version complète. Seul « Le galop » est jouable dans l'ébauche.", "This lesson comes in the full version. Only “The gallop” is playable in the draft.")); return; }
    stop(); setLesson(l => ({ ...l, [inst]: i })); setMode("practice"); setPct(70); setSeed(x => x + 1);
  }
  function pickMode(m) { setMode(m); if (m === "demo") setPct(100); if (m === "challenge") setSeed(x => x + 1); }

  const done = melodic ? li : 2;              // leçons réussies affichées (démo)
  const STEPS = [
    ["demo", L("1 · Démo", "1 · Demo"), L("Écoute", "Listen")],
    ["practice", L("2 · Pratique", "2 · Practice"), L("Boucle, monte le tempo", "Loop, raise the tempo")],
    ["play", L("3 · Play-along", "3 · Play-along"), L("Avec le band", "With the band")],
    ["challenge", L("4 · Défi", "4 · Challenge"), melodic ? L("Le band seul, à toi de jouer", "Band only, your turn") : L("Riff jamais vu", "Unseen riff")],
  ];
  const STEP_TXT = {
    demo: L("Écoute au tempo cible, sans jouer. Suis les notes des yeux.", "Listen at the target tempo without playing. Follow the notes."),
    practice: L("Commence lent. Quand 2 boucles passent sans accroc, monte de 5 %.", "Start slow. When 2 loops are clean, go up 5%."),
    play: L("Avec une batterie et une guitare. Dans la vraie version : une toune complète générée avec Suno.", "With drums and a guitar. In the full version: a complete Suno-generated song."),
    challenge: melodic ? L("La mélodie se coupe : tu joues seul par-dessus le band. Les notes restent affichées.", "The melody drops out: you play alone over the band. Notes stay on screen.")
      : L("Un riff que t'as jamais vu, même technique. Lis la tab et joue-le du premier coup.", "A riff you've never seen, same technique. Read the tab and nail it first try."),
  };

  // notes affichées
  const names = fr ? NOTE_FR : NOTE_EN, tr = TRANSPO[voice];
  const nm = m => names[((m % 12) + 12) % 12];
  const pads = scale.map((iv, d) => {
    const real = leadRoot + iv, written = real + tr;
    return { d, name: nm(written), sub: voice === "vln" ? violinFinger(real, fr) : (tr ? L("sonne ", "sounds ") + nm(real) : ""), root: iv % 12 === 0, blue: iv === 6 };
  });
  const curEv = melodic ? pattern.ev.find(e => active >= e.step && active < e.step + e.len) : null;

  const methodFamily = M_INST.find(x => x[0] === mInst)[3];

  return (
    <div className="mpl">
      <style>{CSS}</style>
      <div className="mpl-top">
        <h2>{L("Leçons", "Lessons")}</h2>
        <div className="mpl-inst" role="group" aria-label={L("Instrument", "Instrument")}>
          <button aria-pressed={inst === "gtr"} onClick={() => pickInst("gtr")}>{L("Guitare", "Guitar")}</button>
          <button aria-pressed={inst === "bass"} onClick={() => pickInst("bass")}>{L("Basse", "Bass")}</button>
          <button aria-pressed={inst === "sax"} onClick={() => pickInst("sax")}>{L("Saxo", "Sax")}</button>
          <button aria-pressed={inst === "vln"} onClick={() => pickInst("vln")}>{L("Violon", "Violin")}</button>
          
          <button disabled>{L("Batterie", "Drums")}<small>{L("bientôt", "soon")}</small></button>
          <button disabled>{L("Chant", "Vocals")}<small>{L("bientôt", "soon")}</small></button>
        </div>
      </div>

      {toast && <div className="mpl-toast" role="status">{toast}</div>}

      <div className="mpl-grid">
        <aside className="mpl-rail" aria-label={L("Parcours", "Path")}>
          <h3>{melodic ? L("Parcours · Pentatonique mineure", "Path · Minor pentatonic") : inst === "bass" ? L("Parcours · Basse métal", "Path · Metal bass") : L("Parcours · Guitare métal", "Path · Metal guitar")}</h3>
          <div className="mpl-meter" aria-hidden="true"><i style={{ width: (done / path.length * 100) + "%" }} /></div>
          <p className="mpl-small">{done} {L("leçons sur", "lessons of")} {path.length} {L("réussies", "completed")}</p>
          <ol className="mpl-path">
            {path.map((row, i) => {
              const locked = row[2] === "pro" && !canAccess("forge"), isDone = i < done;
              return <li key={i}><button aria-current={i === li} className={isDone ? "done" : locked ? "lock" : ""} onClick={() => pickLesson(i)}>
                <span className="n">{isDone ? "✓" : String(i + 1).padStart(2, "0")}</span><span>{fr ? row[0] : row[1]}</span>
                <span className={"mpl-tag " + row[2]}>{row[2] === "free" ? L("gratuit", "free") : "plus"}</span></button></li>;
            })}
          </ol>
          <p className="mpl-note">{L("Les 3 premières leçons de chaque instrument sont gratuites. La suite : Forge Plus.", "The first 3 lessons of each instrument are free. The rest: Forge Plus.")}</p>
        </aside>

        <main className="mpl-main">
          <div className="mpl-head">
            <div>
              <div className="mpl-eyebrow">{L("Leçon", "Lesson")} {li + 1} · {melodic ? L("Pentatonique mineure", "Minor pentatonic") : inst === "bass" ? L("Jeu aux doigts", "Fingerstyle") : L("Technique main droite", "Picking hand")}</div>
              <h1>{fr ? cur[0] : cur[1]}</h1>
            </div>
            <div className="mpl-meta">
              <span className="mpl-chip">{melodic ? (fr ? KEY_LBL[key][0] : KEY_LBL[key][1]) : inst === "bass" ? L("Drop D · 4 cordes", "Drop D · 4-string") : "Drop D"}</span>
              <span className="mpl-chip">{L("Cible", "Target")} {target} BPM</span>
            </div>
          </div>
          <p className="mpl-goal"><b>{L("Objectif :", "Goal:")}</b> {melodic ? PENTA_GOAL[lessonType][fr ? 0 : 1]
            : inst === "bass" ? L("jouer le galop aux doigts : index sur la croche, majeur-index sur les deux doubles, sans jamais répéter le même doigt deux fois de suite. 3 boucles propres au tempo cible.", "play the gallop fingerstyle: index on the eighth, middle-index on the two sixteenths, never the same finger twice in a row. 3 clean loops at the target tempo.")
            : L("jouer le rythme croche + deux doubles (« ta-taka ») en palm mute, tout en coups vers le bas sur la croche, pendant 3 boucles propres au tempo cible.",
                "play the eighth + two sixteenths rhythm (“ta-taka”) palm-muted, downstroke on the eighth, for 3 clean loops at the target tempo.")}</p>

          {melodic && <div className="mpl-stage">
            <div className="mpl-row">
              {inst === "sax" && <>
                <label>{L("Ton saxo", "Your sax")}</label>
                {[["alto", L("Alto (Mib)", "Alto (E♭)")], ["tenor", L("Ténor (Sib)", "Tenor (B♭)")]].map(([id, lb]) =>
                  <button key={id} className="mpl-pill" aria-pressed={saxType === id} onClick={() => setSaxType(id)}>{lb}</button>)}
                <span style={{ width: 12 }} />
              </>}
              <label>{L("La toune est en", "The song is in")}</label>
              {Object.keys(KEYS).map(k => <button key={k} className="mpl-pill" aria-pressed={key === k} onClick={() => setKey(k)}>{fr ? KEY_LBL[k][0] : KEY_LBL[k][1]}</button>)}
            </div>
            <p className="mpl-small">{inst === "sax"
              ? L(`Notes écrites pour sax ${saxType === "alto" ? "alto" : "ténor"} : on transpose pour toi. Tu lis « ${pads[0].name} », ça sonne ${nm(leadRoot)}.`, `Notes written for ${saxType} sax: we transpose for you. You read “${pads[0].name}”, it sounds ${nm(leadRoot)}.`)
              : L("Le violon joue une octave au-dessus de la guitare (les riffs en drop descendent plus bas que la corde de Sol). Position 1.", "The violin plays an octave above the guitar (drop-tuned riffs go below the G string). First position.")}</p>
          </div>}

          <div className="mpl-steps" role="group" aria-label={L("Étapes de la leçon", "Lesson steps")}>
            {STEPS.map(([id, b, s]) => <button key={id} aria-pressed={mode === id} onClick={() => pickMode(id)}><b>{b}</b><span>{s}</span></button>)}
          </div>

          <section className="mpl-stage" aria-label={L("Pupitre", "Practice stand")}>
            <div className="mpl-stagehead">
              <p><b>{STEPS.find(x => x[0] === mode)[1].replace(/^\d · /, "")}.</b> {STEP_TXT[mode]}</p>
              {(!melodic || lessonType === "phrase") && <button className="mpl-ghost" onClick={() => setSeed(x => x + 1)}>{melodic ? L("Nouvelle phrase", "New phrase") : L("Nouveau riff", "New riff")}</button>}
            </div>

            {melodic ? <>
              <div className="mpl-pads">
                {pads.map(p => <div key={p.d} className={"mpl-pad" + (p.root ? " root" : "") + (p.blue ? " blue" : "") + (curEv && curEv.deg === p.d && leadOn ? " on" : "")}>
                  <b>{p.name}</b>{p.sub && <span>{p.sub}</span>}</div>)}
              </div>
              {pattern.ev.length > 0 ? <div className="mpl-seq" aria-label={L("Séquence", "Sequence")}>
                {pattern.ev.map(e => <span key={e.idx} className={curEv && curEv.idx === e.idx ? "on" : ""}>{pads[Math.min(e.deg, pads.length - 1)].name}</span>)}
              </div> : <p className="mpl-small">{L("Pas de partition : le band joue 4 mesures en boucle, tu improvises avec les 5 notes ci-dessus.", "No score: the band loops 4 bars, you improvise with the 5 notes above.")}</p>}
              <div className="mpl-legend"><span><b>{L("bordure orange", "orange border")}</b> {L("note de base (la tonique)", "root note")}</span>{lessonType === "blues" && <span><b>{L("pointillé", "dashed")}</b> {L("la blue note", "the blue note")}</span>}</div>
            </> : <>
              <div className="mpl-box"><GtrTab pattern={pattern} active={active} bass={inst === "bass"} /></div>
              {inst === "bass" ? <div className="mpl-legend"><span><b>0</b> {L("corde à vide (Ré grave en drop D)", "open string (low D in drop D)")}</span><span><b>3 5 7</b> {L("frettes sur la même corde", "frets on the same string")}</span><span><b>I M I</b> {L("index · majeur · index", "index · middle · index")}</span></div>
              : <div className="mpl-legend"><span><b>PM</b> {L("palm mute (main sur les cordes près du chevalet)", "palm mute (hand on the strings near the bridge)")}</span><span><b>0</b> {L("corde à vide", "open string")}</span><span><b>5 5 5</b> {L("power chord une barre", "one-finger power chord")}</span></div>}
            </>}

            <div className="mpl-transport">
              <button className="mpl-play" aria-pressed={playing} onClick={() => (playing ? stop() : start())}>{playing ? L("■ Arrêter", "■ Stop") : L("▶ Jouer", "▶ Play")}</button>
              <div className="mpl-tempo">
                <label htmlFor="mpl-tempo">Tempo</label>
                <input id="mpl-tempo" type="range" min="50" max="110" step="5" value={pct} onChange={e => setPct(+e.target.value)} />
                <div className="mpl-bpm">{bpm} <small>BPM · {pct} %</small></div>
              </div>
              <div className="mpl-toggles">
                <label><input type="checkbox" checked={metro} onChange={e => setMetro(e.target.checked)} /> {L("Métronome", "Metronome")}</label>
                {melodic && <label><input type="checkbox" checked={drone} onChange={e => setDrone(e.target.checked)} /> {L("Bourdon", "Drone")}</label>}
                <label><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /> {L("+5 % auto", "+5% auto")}</label>
              </div>
            </div>
          </section>

          <div className="mpl-coach">
            <div className="mpl-card">
              <h4>{L("Boucles propres à 100 %", "Clean loops at 100%")}</h4>
              <div className="mpl-dots">{[0, 1, 2].map(i => <i key={i} className={i < clean ? "on" : ""} />)}</div>
              {clean >= 3 ? <span className="mpl-okmsg">{L("Leçon réussie. La suivante est débloquée.", "Lesson passed. The next one is unlocked.")}</span>
                : <p>{L(`Atteins ${target} BPM pour qu'une boucle compte.`, `Reach ${target} BPM for a loop to count.`)}</p>}
            </div>
            <div className="mpl-card">
              <h4>{L("Ton meilleur tempo", "Your best tempo")}</h4>
              <div className="mpl-big">{best ? best + " BPM" : "—"}</div>
              <p>{L("Sauvegardé sur cet appareil.", "Saved on this device.")}</p>
            </div>
            <div className="mpl-card">
              <h4>{L("Conseils", "Tips")}</h4>
              <ul className="mpl-tips">{(melodic
                ? (inst === "sax" ? [L("Souffle constant, appuie avec le ventre.", "Steady air, support from the belly."), L("Langue légère : « tu » sur chaque note.", "Light tongue: “tu” on each note."), L("Coins de bouche fermes, pas les dents.", "Firm mouth corners, not teeth.")]
                  : [L("Archet droit, parallèle au chevalet.", "Straight bow, parallel to the bridge."), L("Écoute le bourdon : la note doit « se fondre » dedans.", "Listen to the drone: the note should blend into it."), L("Doigts arrondis, bout du doigt sur la corde.", "Curved fingers, fingertip on the string.")])
                : inst === "bass" ? [L("Alterne index-majeur, toujours.", "Always alternate index-middle."), L("Le pouce repose sur le micro ou la corde Mi.", "Thumb rests on the pickup or the E string."), L("Attaque la corde vers l'intérieur, pas vers le haut.", "Pluck into the body, not upward.")]
                : [L("La croche : coup vers le bas, appuyé.", "The eighth: firm downstroke."), L("Les deux doubles : bas-haut, léger.", "The two sixteenths: down-up, light."), L("Garde le poignet souple, pas l'avant-bras.", "Keep the wrist loose, not the forearm.")]
              ).map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          </div>

          <section className="mpl-stage" aria-label={L("Méthodes par époque", "Era methods")}>
            <div className="mpl-stagehead">
              <p><b>{L("Méthodes par époque.", "Era methods.")}</b> {L("Gammes + techniques + riffs d'exercice générés à l'infini, dans le son de l'époque. Chaque méthode est adaptée à l'instrument (transposée pour le saxo, rudiments pour la batterie).",
                "Scales + techniques + endlessly generated practice riffs in the sound of the era. Each method fits the instrument (transposed for sax, rudiments for drums).")}</p>
            </div>
            <div className="mpl-row" role="group" aria-label={L("Instrument de la méthode", "Method instrument")}>
              {M_INST.map(([id, a, b]) => <button key={id} className="mpl-pill" aria-pressed={mInst === id} onClick={() => setMInst(id)}>{fr ? a : b}</button>)}
            </div>
            <div className="mpl-methods">
              {ERAS.map(([era, sub]) => <div key={era} className="mpl-method">
                <div className="mpl-era">{era}<small>{fr ? sub[0] : sub[1]}</small></div>
                <ul>{METHOD_ITEMS[methodFamily][era].map(([a, b]) => <li key={a}>{a} <span>· {b}</span></li>)}</ul>
                <div className="mpl-buy"><span className="mpl-price">9,99 $</span><button onClick={onPaywall}>{L("Débloquer", "Unlock")}</button></div>
              </div>)}
            </div>
            <div className="mpl-pack">
              <p><b>{L("Pack 5 époques", "5-era pack")}</b> · {L("tout l'instrument, des 70s à aujourd'hui", "the whole instrument, 70s to today")}</p>
              <span className="mpl-price">39,99 $</span><button className="mpl-cta" onClick={onPaywall}>{L("Prendre le pack", "Get the pack")}</button>
            </div>
          </section>

          <p className="mpl-note">{L("Version préliminaire : le son est synthétisé dans le navigateur. La version finale utilisera les vrais samples du générateur Riff et des play-alongs Suno.",
            "Preview version: sound is synthesized in the browser. The final version will use real Riff generator samples and Suno play-alongs.")}</p>
        </main>
      </div>
    </div>
  );
}

function GtrTab({ pattern, active, bass }) {
  const STR = bass ? ["G", "D", "A", "D"] : ["e", "B", "G", "D", "A", "D"], cells = [], N = STR.length, lo = N - 3;
  STR.forEach(s => cells.push(<div key={"l" + s + cells.length} className="lbl">{s}</div>));
  cells.push(<div key="l-pm" />);
  for (let stp = 0; stp < pattern.len; stp++) {
    if (stp === 16) for (let k = 0; k <= N; k++) cells.push(<div key={"b" + k} className={k < N ? "bar" : ""} />);
    const e = pattern.ev.find(n => n.step === stp);
    for (let s = 0; s < N; s++) {
      let txt = "", pm = false;
      if (e) { if (e.chord != null && (bass ? s === N - 1 : s >= lo)) txt = String(e.chord); else if (e.fret != null && s === N - 1) { txt = String(e.fret); pm = !bass; } }
      cells.push(<div key={stp + "-" + s} className={"c" + (pm ? " pm" : "") + (active === stp ? " on" : "")}><span>{txt}</span></div>);
    }
    cells.push(<div key={stp + "-pm"} className="pmrow">{e && e.pm && !bass && stp % 4 === 0 ? "PM" : ""}</div>);
  }
  return <div className="mpl-tab" style={{ gridTemplateRows: `repeat(${N},22px) 18px` }} aria-label="Tablature">{cells}</div>;
}
