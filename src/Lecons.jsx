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
.mpl-tag.free{border-color:#3a4b3f;color:var(--ok)}.mpl-tag.pro{border-color:#2f4256;color:#8fb2f0}
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
.mpl-sax{color:var(--fg);margin-top:4px;opacity:.9}
.mpl-pad.on{background:var(--ember);border-color:var(--ember)}.mpl-pad.on b,.mpl-pad.on span,.mpl-pad.on .mpl-sax{color:var(--bg)}
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
.mpl-peek{font-size:13px;padding:7px 10px;margin-top:auto}
.mpl-peek + .mpl-buy{margin-top:0}
.mpl-back{align-self:flex-start;font-size:13px;color:var(--ember2);background:none;border:1px solid #5a3a26;border-radius:9px;padding:6px 12px;cursor:pointer}
.mpl-pick{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;max-width:360px;text-align:center;font-family:var(--mono)}
.mpl-pick div{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:8px 4px}
.mpl-pick b{display:block;font-size:24px;color:var(--ember)}.mpl-pick span{font-size:12px;color:var(--muted)}
.mpl-pick .up b{color:var(--ember2)}
.mpl-two{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:12px}
@media (max-width:760px){.mpl-two{grid-template-columns:1fr}}
.mpl-video{aspect-ratio:16/9;background:repeating-linear-gradient(135deg,var(--bg) 0 12px,var(--panel2) 12px 24px);border:1px dashed var(--line);border-radius:12px;display:grid;place-items:center;text-align:center;padding:14px;color:var(--muted);font-size:13px}
.mpl-video b{display:block;color:var(--fg);font-size:15px;margin-bottom:4px}
.mpl-ex{display:flex;flex-direction:column;gap:6px}
.mpl-ex button{display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;gap:10px;text-align:left;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:9px 10px;color:var(--fg);cursor:pointer}
.mpl-ex button[aria-current="true"]{border-color:var(--ember);background:var(--panel2)}
.mpl-ex .n{font-family:var(--mono);font-size:12px;color:var(--muted);text-align:center}
.mpl-ex .ok .n{color:var(--ok)}
.mpl-ex small{font-family:var(--mono);font-size:12px;color:var(--muted)}
.mpl-tab .pk{font-size:12px;display:flex;align-items:center;justify-content:center;color:var(--muted)}
.mpl-tab .pk.d{color:var(--ember)}.mpl-tab .pk.u{color:var(--ember2)}
.mpl-tab .pk.on{background:var(--fg);color:var(--bg);border-radius:4px}
.mpl-tuner{display:flex;flex-direction:column;gap:10px;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--bg)}
.mpl-needle{display:flex;flex-direction:column;gap:6px}
.mpl-needle-read{display:flex;align-items:baseline;gap:12px}.mpl-needle-read b{font-size:34px;font-weight:800}.mpl-needle-read b.ok{color:var(--ok)}
.mpl-needle-read span{font-family:var(--mono);font-size:13px;color:var(--muted)}
.mpl-needle-bar{position:relative;height:14px;border-radius:9px;background:linear-gradient(90deg,#3a2216,var(--panel2) 40%,#1d3326 50%,var(--panel2) 60%,#3a2216)}
.mpl-needle-bar i{position:absolute;top:-4px;width:4px;height:22px;margin-left:-2px;border-radius:3px;background:var(--ember);transition:left .08s}.mpl-needle-bar i.ok{background:var(--ok)}
.mpl-needle-lbl{display:flex;justify-content:space-between;font-size:12px;color:var(--muted)}
.mpl-listen{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding-top:10px;border-top:1px solid var(--line)}
.mpl-listen p{flex:1 1 300px;margin:0}
.mpl-listen button[aria-pressed="true"]{border-color:var(--ok);color:var(--ok)}
.mpl-score{display:flex;align-items:baseline;gap:10px}.mpl-score b{font-family:var(--mono);font-size:26px}.mpl-score b.ok{color:var(--ok)}.mpl-score span{font-size:12px;color:var(--muted)}
.mpl-tab .pk.m-ok{box-shadow:inset 0 -3px 0 var(--ok)}.mpl-tab .pk.m-bad{box-shadow:inset 0 -3px 0 var(--ember2)}.mpl-tab .pk.m-miss{box-shadow:inset 0 -3px 0 #E5484D}
.mpl-seq span.m-ok{box-shadow:inset 0 -3px 0 var(--ok)}.mpl-seq span.m-bad{box-shadow:inset 0 -3px 0 var(--ember2)}.mpl-seq span.m-miss{box-shadow:inset 0 -3px 0 #E5484D}
.mpl-keys{width:100%;max-width:700px;height:auto}
.mpl-keys .w{fill:#E9E7E1;stroke:#0C0D0F}.mpl-keys .b{fill:#111316;stroke:#0C0D0F}
.mpl-keys .w.sc{fill:#F6D2B8}.mpl-keys .w.root{fill:#FFB36B}.mpl-keys .b.sc,.mpl-keys .b.root{fill:#7a3a1c}
.mpl-keys .on{fill:var(--ember)!important}.mpl-keys .kl{font:600 10px var(--mono);fill:#0C0D0F}.mpl-keys .bd{fill:var(--ember2)}
.mpl-modal{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.66);display:grid;place-items:center;padding:16px}
.mpl-modal-box{position:relative;width:min(440px,100%);max-height:90vh;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:10px}
.mpl-modal-box h3{margin:0;font-size:24px;font-weight:800;letter-spacing:-.01em}
.mpl-modal-x{position:absolute;top:10px;right:12px;background:none;border:0;color:var(--muted);font-size:24px;cursor:pointer;line-height:1}
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
const TRANSPO = { alto: 9, tenor: 14, vln: 0, piano: 0 };         // écrit = réel + n demi-tons
const LEAD_BASE = { alto: 60, tenor: 48, vln: 60, piano: 60 };     // Do réel de base du registre
const VLN_STR = [[55, "Sol", "G"], [62, "Ré", "D"], [69, "La", "A"], [76, "Mi", "E"]];

// ───────── Guitare & basse : 10 leçons jouables chacune ─────────
// Événement : { step, len, n:[[corde, frette]...], lab, pm, acc, ghost, pinch, slap, pop, stac }
// Cordes indexées du haut (0 = plus aiguë) vers le bas, comme une tab.
// Accordages : cordes de la plus aiguë à la plus grave. drop = la grave est une quinte sous la 5e corde (power chord à un doigt).
const GTR_TUNINGS = [
  { id: "E", fr: "Standard (Mi)", en: "E standard", m: [64, 59, 55, 50, 45, 40], l: ["e", "B", "G", "D", "A", "E"], drop: false },
  { id: "D", fr: "Drop D", en: "Drop D", m: [64, 59, 55, 50, 45, 38], l: ["e", "B", "G", "D", "A", "D"], drop: true },
  { id: "Eb", fr: "Mi♭ (½ ton plus bas)", en: "E♭ standard", m: [63, 58, 54, 49, 44, 39], l: ["e♭", "B♭", "G♭", "D♭", "A♭", "E♭"], drop: false },
  { id: "Dst", fr: "Ré standard", en: "D standard", m: [62, 57, 53, 48, 43, 38], l: ["d", "A", "F", "C", "G", "D"], drop: false },
  { id: "C", fr: "Drop C", en: "Drop C", m: [62, 57, 53, 48, 43, 36], l: ["d", "A", "F", "C", "G", "C"], drop: true },
  { id: "B", fr: "Drop B", en: "Drop B", m: [61, 56, 52, 47, 42, 35], l: ["c#", "G#", "E", "B", "F#", "B"], drop: true },
];
const BASS_TUNINGS = [
  { id: "E", fr: "Standard (Mi)", en: "E standard", m: [43, 38, 33, 28], l: ["G", "D", "A", "E"], drop: false },
  { id: "D", fr: "Drop D", en: "Drop D", m: [43, 38, 33, 26], l: ["G", "D", "A", "D"], drop: true },
  { id: "Eb", fr: "Mi♭ (½ ton plus bas)", en: "E♭ standard", m: [42, 37, 32, 27], l: ["G♭", "D♭", "A♭", "E♭"], drop: false },
  { id: "Dst", fr: "Ré standard", en: "D standard", m: [41, 36, 31, 26], l: ["F", "C", "G", "D"], drop: false },
  { id: "C", fr: "Drop C", en: "Drop C", m: [41, 36, 31, 24], l: ["F", "C", "G", "C"], drop: true },
];
// Power chord écrit en drop (même frette sur 3 cordes) → en standard : 2 frettes plus loin sur les 2 cordes du dessus.
function adaptChords(p, drop) {
  if (drop) return p;
  return { ...p, ev: p.ev.map(e => (e.n.length >= 2 && e.n.some(x => x[0] === 5) ? { ...e, n: e.n.map(([st, f]) => [st, st === 5 ? f : f + 2]) } : e)) };
}
const rnd = a => a[Math.floor(Math.random() * a.length)];
function line(items) {                          // items : [len, n, opts] joués à la suite
  let step = 0; const ev = [];
  for (const [len, n, o] of items) { if (n) ev.push({ step, len, n, ...(o || {}) }); step += len; }
  return { ev, len: step };
}
const alt = i => (i % 2 ? "↑" : "↓");
const G5 = 5, GA = 4, GD = 3;                    // guitare : Ré grave, La, Ré
const pc = f => [[G5, f], [GA, f], [GD, f]];      // power chord une barre (drop D)
function gallopCells(str, chordFn, fingers) {
  const out = [], frets = [0, 0, 0, 1, 3, 5, 7];
  for (let beat = 0; beat < 8; beat++) {
    if (beat === 3 || beat === 7) { out.push([4, chordFn(rnd([3, 5, 7, 5])), { lab: fingers ? "I" : "↓", acc: true }]); continue; }
    const f = beat % 4 === 0 ? 0 : rnd(frets);
    out.push([2, [[str, f]], { pm: !fingers, lab: fingers ? "I" : "↓" }], [1, [[str, f]], { pm: !fingers, lab: fingers ? "M" : "↓" }], [1, [[str, f]], { pm: !fingers, lab: fingers ? "I" : "↑" }]);
  }
  return line(out);
}
const T = (fr, en) => [fr, en];
const GTR_LESSONS = [
  { t: T("Accordage & posture", "Tuning & posture"), tag: "free", bpm: 60, tuner: true,
    mk: () => line([5, 4, 3, 2, 1, 0].map(s => [8, [[s, 0]], { openLbl: true }])),
    goal: T("choisis ton accordage plus haut, accorde les 6 cordes, puis joue chaque corde à vide sur le tempo. Utilise les notes de référence ou l'accordeur micro.", "pick your tuning above, tune all 6 strings, then play each open string in time. Use the reference notes or the mic tuner."),
    tips: [T("Assis : la guitare sur la jambe droite, le manche un peu relevé.", "Seated: guitar on the right leg, neck slightly raised."), T("Le pouce derrière le manche, pas par-dessus.", "Thumb behind the neck, not over it."), T("Accorde toujours en montant vers la note.", "Always tune up to the note.")] },
  { t: T("Palm mute sur corde à vide", "Palm mute on the open string"), tag: "free", bpm: 120,
    mk: () => line([...Array(4)].map(() => [4, [[G5, 0]], { pm: true, lab: "↓" }]).concat([...Array(8)].map(() => [2, [[G5, 0]], { pm: true, lab: "↓" }]))),
    goal: T("étouffer la corde de Ré grave avec le tranchant de la main, en noires puis en croches, tout en coups vers le bas.", "mute the low D with the edge of your hand, quarter notes then eighths, all downstrokes."),
    tips: [T("Le tranchant de la main touche les cordes juste devant le chevalet.", "The edge of your hand touches the strings right in front of the bridge."), T("Trop loin du chevalet : la note meurt. Trop proche : pas d'effet.", "Too far from the bridge: the note dies. Too close: no effect."), T("Garde la même pression sur chaque coup.", "Keep the same pressure on every stroke.")] },
  { t: T("Le galop", "The gallop"), tag: "free", bpm: 140, gen: true,
    mk: () => gallopCells(G5, pc, false),
    goal: T("jouer le rythme croche + deux doubles (« ta-taka ») en palm mute, coup bas sur la croche, pendant 3 boucles propres au tempo cible.", "play the eighth + two sixteenths rhythm (“ta-taka”) palm-muted, downstroke on the eighth, for 3 clean loops at the target tempo."),
    tips: [T("La croche : coup vers le bas, appuyé.", "The eighth: firm downstroke."), T("Les deux doubles : bas-haut, léger.", "The two sixteenths: down-up, light."), T("Garde le poignet souple, pas l'avant-bras.", "Keep the wrist loose, not the forearm.")] },
  { t: T("Endurance en downpicking", "Downpicking endurance"), tag: "pro", bpm: 170,
    mk: () => line([0, 0, 0, 0, 3, 0, 5, 0, 0, 0, 0, 0, 6, 5, 3, 0].map(f => [2, [[G5, f]], { pm: f === 0, lab: "↓" }])),
    goal: T("tenir des croches rapides tout en coups vers le bas, deux mesures sans ralentir. C'est l'endurance des riffs thrash des années 80.", "hold fast eighth notes, all downstrokes, two bars without slowing down. That's the stamina of 80s thrash riffs."),
    tips: [T("Petits coups venant du poignet.", "Small strokes from the wrist."), T("Respire et relâche les épaules.", "Breathe and drop your shoulders."), T("Si ça brûle, baisse de 10 % et remonte.", "If it burns, drop 10% and build back up.")] },
  { t: T("Power chords", "Power chords"), tag: "pro", bpm: 120,
    mk: () => line([[4, pc(0), { lab: "↓", acc: true }], [2, [[G5, 0]], { pm: true, lab: "↓" }], [2, [[G5, 0]], { pm: true, lab: "↓" }], [4, pc(5), { lab: "↓", acc: true }], [4, pc(3), { lab: "↓", acc: true }],
      [4, pc(0), { lab: "↓", acc: true }], [2, [[G5, 0]], { pm: true, lab: "↓" }], [2, [[G5, 0]], { pm: true, lab: "↓" }], [4, pc(7), { lab: "↓", acc: true }], [4, pc(5), { lab: "↓", acc: true }]]),
    goal: T("en accordage drop, un seul doigt couche les 3 cordes graves. En standard, index sur la grave, annulaire sur les deux autres, 2 frettes plus loin (la tab s'ajuste). Enchaîne accords et chugs sans trou.", "in a drop tuning, one finger covers the 3 low strings. In standard, index on the low string, ring finger on the other two, 2 frets up (the tab adjusts). Move between chords and chugs with no gap."),
    tips: [T("Drop : un doigt à plat sur 3 cordes. Standard : index + annulaire.", "Drop: one finger flat on 3 strings. Standard: index + ring finger."), T("Relâche la pression pour glisser, pas pour lever.", "Release pressure to slide, don't lift."), T("Les autres cordes : étouffées par la main gauche.", "Other strings: muted by the fretting hand.")] },
  { t: T("Alternate picking", "Alternate picking"), tag: "pro", bpm: 140,
    mk: () => line([...Array(32)].map((_, i) => [1, [[Math.floor(i / 8) % 2 ? GA : G5, [0, 0, 0, 0, 3, 3, 5, 5][i % 8]]], { lab: alt(i), pm: true }])),
    goal: T("alterner bas-haut en doubles croches sans jamais casser le mouvement, même quand le médiator change de corde.", "alternate down-up in sixteenths without breaking the motion, even when the pick changes strings."),
    tips: [T("Les coups haut doivent sonner aussi fort que les coups bas.", "Upstrokes must sound as loud as downstrokes."), T("Juste la pointe du médiator dans la corde.", "Only the tip of the pick in the string."), T("Plus c'est rapide, plus le mouvement est petit.", "The faster, the smaller the motion.")] },
  { t: T("Tremolo picking", "Tremolo picking"), tag: "pro", bpm: 160,
    mk: () => line([0, 2, 3, 5, 7, 5, 3, 2].flatMap(f => [...Array(4)].map((_, i) => [1, [[2, f]], { lab: alt(i) }]))),
    goal: T("faire vibrer chaque note en doubles croches rapides pendant que la main gauche dessine une mélodie. Le son du black et du death.", "pick each note in fast sixteenths while the fretting hand draws a melody. The black and death metal sound."),
    tips: [T("La main droite ne s'arrête jamais en changeant de note.", "The picking hand never stops when the note changes."), T("Main droite légère, presque flottante.", "Picking hand light, almost floating."), T("Synchronise le changement de note sur le temps.", "Change notes exactly on the beat.")] },
  { t: T("Harmoniques pincées", "Pinch harmonics"), tag: "pro", bpm: 110,
    mk: () => line([...Array(6)].map(() => [2, [[G5, 0]], { pm: true, lab: "↓" }]).concat([[4, [[G5, 3]], { pinch: true, lab: "PH" }]], [...Array(6)].map(() => [2, [[G5, 0]], { pm: true, lab: "↓" }]), [[4, [[G5, 5]], { pinch: true, lab: "PH" }]])),
    goal: T("entre les chugs, faire « crier » la note : le pouce effleure la corde juste après le médiator.", "between the chugs, make the note squeal: your thumb grazes the string right after the pick."),
    tips: [T("Tiens le médiator court : le pouce dépasse à peine.", "Hold the pick short: the thumb barely sticks out."), T("Cherche le point entre les deux micros.", "Find the spot between the two pickups."), T("Ajoute du vibrato pour faire hurler la note.", "Add vibrato to make it scream.")] },
  { t: T("Syncopes & breakdown", "Syncopation & breakdowns"), tag: "pro", bpm: 100, band: true, kicks: [0, 3, 6, 10, 13],
    mk: () => line([[3, [[G5, 0]], { pm: true, lab: "↓", acc: true }], [3, [[G5, 0]], { pm: true, lab: "↓" }], [4, [[G5, 0]], { pm: true, lab: "↓" }], [3, [[G5, 0]], { pm: true, lab: "↓" }], [3, [[G5, 0]], { pm: true, lab: "↓" }],
      [3, [[G5, 0]], { pm: true, lab: "↓", acc: true }], [3, [[G5, 0]], { pm: true, lab: "↓" }], [4, [[G5, 0]], { pm: true, lab: "↓" }], [6, pc(1), { lab: "↓", acc: true }]]),
    goal: T("jouer les chugs à contretemps, collés sur la grosse caisse. Le silence entre les coups compte autant que les coups.", "play off-beat chugs locked to the kick drum. The silence between hits counts as much as the hits."),
    tips: [T("Compte les doubles dans ta tête : 1-i-et-a.", "Count the sixteenths in your head: 1-e-and-a."), T("Étouffe net après chaque coup.", "Mute cleanly after every hit."), T("Écoute la grosse caisse, pas la caisse claire.", "Listen to the kick, not the snare.")] },
  { t: T("Défi final : riff + band", "Final challenge: riff + band"), tag: "pro", bpm: 150, band: true, gen: true,
    mk: () => { const g = gallopCells(G5, pc, false); const ev = g.ev.map(e => ({ ...e })); return { ev: ev.concat(line([...Array(8)].map((_, i) => [2, [[G5, rnd([0, 0, 1, 3])]], { pm: true, lab: "↓" }]).concat([[8, pc(rnd([5, 7])), { lab: "↓", acc: true }]])).ev.map(e => ({ ...e, step: e.step + 32 }))), len: 56 }; },
    goal: T("un riff jamais vu qui mélange galop, chugs et power chords, avec le band. Lis-le et joue-le du premier coup.", "an unseen riff mixing gallop, chugs and power chords, with the band. Read it and nail it first try."),
    tips: [T("Lis une mesure d'avance.", "Read one bar ahead."), T("Si tu te perds, rattrape sur le temps 1.", "If you get lost, catch up on beat 1."), T("Nouveau riff = nouvelle tentative.", "New riff = new attempt.")] },
];
const B3 = 3, B2 = 2, B1 = 1;                    // basse : Ré grave, La, Ré
const BASS_LESSONS = [
  { t: T("Accordage & posture, sangle à la bonne hauteur", "Tuning & posture, strap at the right height"), tag: "free", bpm: 60, tuner: true,
    mk: () => line([3, 2, 1, 0].map(s => [8, [[s, 0]], { openLbl: true }])),
    goal: T("choisis ton accordage plus haut, accorde la basse, puis joue chaque corde à vide sur le tempo.", "pick your tuning above, tune the bass, then play each open string in time."),
    tips: [T("Sangle : la basse à la même hauteur assis et debout.", "Strap: the bass at the same height seated and standing."), T("Poignet gauche droit, pas cassé.", "Fretting wrist straight, not bent."), T("Accorde en montant vers la note.", "Tune up to the note.")] },
  { t: T("Jeu aux doigts : alternance index-majeur", "Fingerstyle: index-middle alternation"), tag: "free", bpm: 100,
    mk: () => line([...Array(16)].map((_, i) => [2, [[i < 8 ? B3 : B2, 0]], { lab: i % 2 ? "M" : "I" }])),
    goal: T("jouer des croches en alternant index et majeur, sans jamais répéter le même doigt.", "play eighth notes alternating index and middle, never the same finger twice."),
    tips: [T("Le doigt tire vers toi et vient s'appuyer sur la corde d'en dessous.", "The finger pulls toward you and rests on the string below."), T("Le pouce repose sur le micro.", "Thumb rests on the pickup."), T("Les deux doigts doivent sonner pareil.", "Both fingers must sound the same.")] },
  { t: T("Le galop aux doigts (école Steve Harris)", "Fingerstyle gallop (Steve Harris school)"), tag: "free", bpm: 140, gen: true,
    mk: () => gallopCells(B3, f => [[B3, f]], true),
    goal: T("jouer le galop aux doigts : index sur la croche, majeur-index sur les deux doubles. 3 boucles propres au tempo cible.", "play the gallop fingerstyle: index on the eighth, middle-index on the two sixteenths. 3 clean loops at the target tempo."),
    tips: [T("Alterne index-majeur, toujours.", "Always alternate index-middle."), T("Doigts bien droits, attaque près du manche.", "Fingers straight, pluck near the neck."), T("Attaque vers l'intérieur, pas vers le haut.", "Pluck into the body, not upward.")] },
  { t: T("Jeu au médiator : downpicking", "Pick playing: downpicking"), tag: "pro", bpm: 160,
    mk: () => line([0, 0, 0, 0, 3, 0, 5, 0, 0, 0, 0, 0, 6, 5, 3, 0].map(f => [2, [[B3, f]], { lab: "↓" }])),
    goal: T("des croches tout en coups vers le bas, avec l'attaque sèche du thrash.", "eighth notes all downstrokes, with the dry thrash attack."),
    tips: [T("Médiator épais, attaque franche.", "Thick pick, firm attack."), T("Le tranchant de la main étouffe un peu près du chevalet.", "The edge of the hand mutes a bit near the bridge."), T("Même son que la guitare : soyez une seule machine.", "Same feel as the guitar: one machine.")] },
  { t: T("Étouffer les cordes (main gauche + pouce)", "Muting strings (fretting hand + thumb)"), tag: "pro", bpm: 110,
    mk: () => line([[2, [[B3, 0]], { stac: true, lab: "I" }], [2, null], [2, [[B3, 0]], { stac: true, lab: "M" }], [2, [[B3, 3]], { stac: true, lab: "I" }], [4, [[B3, 5]], { lab: "M" }], [4, null],
      [2, [[B3, 0]], { stac: true, lab: "I" }], [2, null], [2, [[B3, 0]], { stac: true, lab: "M" }], [2, [[B3, 7]], { stac: true, lab: "I" }], [4, [[B3, 5]], { lab: "M" }], [4, null]]),
    goal: T("couper chaque note net pour que les silences s'entendent. Les notes courtes (·) s'arrêtent tout de suite.", "cut each note cleanly so the silences are heard. Short notes (·) stop right away."),
    tips: [T("Main gauche : relâche la pression sans quitter la corde.", "Fretting hand: release pressure without leaving the string."), T("Le pouce droit étouffe les cordes graves.", "Plucking thumb mutes the low strings."), T("Aucune corde ne doit résonner seule.", "No string should ring on its own.")] },
  { t: T("Ghost notes & syncopes", "Ghost notes & syncopation"), tag: "pro", bpm: 95,
    mk: () => line([0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1].map((g, i) => [2, [[g ? B2 : B3, g ? 0 : [0, 0, 3, 5, 0][i % 5]]], g ? { ghost: true, lab: "x" } : { lab: i % 2 ? "M" : "I" }])),
    goal: T("entre les vraies notes, des notes fantômes (x) presque muettes donnent le groove.", "between real notes, almost silent ghost notes (x) create the groove."),
    tips: [T("Ghost note : doigt gauche posé sur la corde sans appuyer.", "Ghost note: fretting finger resting on the string, not pressing."), T("Joue les x deux fois moins fort.", "Play the x's half as loud."), T("Garde l'alternance même sur les x.", "Keep alternating even on the x's.")] },
  { t: T("Slap (pouce)", "Slap (thumb)"), tag: "pro", bpm: 100,
    mk: () => line([0, 0, 3, 0, 5, 0, 3, 0, 0, 0, 7, 5, 3, 0, 1, 0].map(f => [2, [[B3, f]], { slap: true, lab: "T" }])),
    goal: T("frapper la corde avec l'os du pouce et rebondir, comme une baguette sur un tambour.", "hit the string with the bone of your thumb and bounce off, like a stick on a drum."),
    tips: [T("Le mouvement vient de la rotation du poignet.", "The motion comes from rotating the wrist."), T("Frappe au bout du manche, pas sur les micros.", "Hit at the end of the neck, not over the pickups."), T("Rebondis tout de suite pour laisser sonner.", "Bounce right off to let it ring.")] },
  { t: T("Popping (index qui tire)", "Popping (index pull)"), tag: "pro", bpm: 95,
    mk: () => line([["T", B3, 0], [null], ["P", B1, 0], [null], ["T", B3, 0], ["T", B3, 0], ["P", B1, 0], [null], ["T", B3, 3], [null], ["P", B1, 3], [null], ["T", B3, 5], ["T", B3, 5], ["P", B1, 5], ["P", B1, 3]]
      .map(([k, s2, f]) => [2, k ? [[s2, f]] : null, k ? { [k === "T" ? "slap" : "pop"]: true, lab: k } : null])),
    goal: T("pouce sur la note grave (T), l'index tire l'octave et la laisse claquer (P).", "thumb on the low note (T), index pulls the octave and lets it snap (P)."),
    tips: [T("L'index passe sous la corde et tire vers le haut.", "Index hooks under the string and pulls up."), T("Pas trop fort : la corde claque toute seule.", "Not too hard: the string snaps by itself."), T("T et P forment un seul mouvement de poignet.", "T and P are one wrist motion.")] },
  { t: T("Suivre la grosse caisse", "Locking with the kick drum"), tag: "pro", bpm: 120, band: true, kicks: [0, 3, 6, 8, 10, 14],
    mk: () => line([[3, [[B3, 0]], { lab: "I" }], [3, [[B3, 0]], { lab: "M" }], [2, [[B3, 3]], { lab: "I" }], [2, [[B3, 0]], { lab: "M" }], [4, [[B3, 5]], { lab: "I" }], [2, [[B3, 3]], { lab: "M" }],
      [3, [[B3, 0]], { lab: "I" }], [3, [[B3, 0]], { lab: "M" }], [2, [[B3, 7]], { lab: "I" }], [2, [[B3, 5]], { lab: "M" }], [4, [[B3, 3]], { lab: "I" }], [2, [[B3, 1]], { lab: "M" }]]),
    goal: T("chaque note tombe exactement avec la grosse caisse. Basse et kick deviennent un seul son.", "every note lands exactly with the kick. Bass and kick become one sound."),
    tips: [T("Écoute le kick avant de jouer.", "Listen to the kick before you play."), T("La fin de la note compte : coupe avec le kick suivant.", "Note endings matter: cut with the next kick."), T("Coupe le métronome, le batteur est ton métronome.", "Turn off the metronome, the drummer is your metronome.")] },
  { t: T("Défi final : ligne de basse + band", "Final challenge: bass line + band"), tag: "pro", bpm: 140, band: true, gen: true,
    mk: () => { const g = gallopCells(B3, f => [[B3, f]], true); return { ev: g.ev.concat(line([...Array(8)].map((_, i) => [2, [[i % 2 ? B1 : B3, rnd([0, 0, 3, 5])]], { lab: i % 2 ? "M" : "I" }])).ev.map(e => ({ ...e, step: e.step + 32 }))), len: 48 }; },
    goal: T("une ligne jamais vue qui mélange galop et octaves, avec le band.", "an unseen line mixing gallop and octaves, with the band."),
    tips: [T("Lis une mesure d'avance.", "Read one bar ahead."), T("Accroche-toi au kick.", "Lock onto the kick."), T("Nouveau riff = nouvelle tentative.", "New riff = new attempt.")] },
];
const GTR_PATH = GTR_LESSONS.map(l => [l.t[0], l.t[1], l.tag, l]);
const BASS_PATH = BASS_LESSONS.map(l => [l.t[0], l.t[1], l.tag, l]);
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
  ["keys", "Piano", "Piano", "melodic"], ["sax", "Saxo", "Sax", "melodic"], ["vln", "Violon", "Violin", "melodic"]];

// ───────── Générateurs de patterns (pas = double croche) ─────────
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
// ───────── Vrais sons (mêmes fichiers que le générateur Riff) ─────────
// Guitare : Karoryfer Emilyguitar, DI, CC0 — une note aux tierces mineures. Batterie : AVL Black Pearl, CC-BY-SA.
const DI_NOTES = { db2: 37, e2: 40, gb2: 42, a2: 45, c3: 48, eb3: 51, gb3: 54, a3: 57, c4: 60, eb4: 63, gb4: 66, a4: 69, c5: 72, eb5: 75, gb5: 78, a5: 81, c6: 84, d6: 86 };
const KIT = { gtr: [], drums: {}, ready: false, promise: null };
function trimLead(ctx, buf) {
  const d = buf.getChannelData(0); let pk = 0; for (let i = 0; i < Math.min(d.length, 20000); i++) pk = Math.max(pk, Math.abs(d[i]));
  let st = 0; while (st < d.length && Math.abs(d[st]) < pk * 0.05) st++; st = Math.max(0, st - 40);
  if (st < 16) return buf;
  const o = ctx.createBuffer(1, buf.length - st, buf.sampleRate); o.copyToChannel(d.subarray(st), 0); return o;
}
function loadKit(base) {
  if (KIT.promise) return KIT.promise;
  KIT.promise = (async () => {
    const ctx = new OfflineAudioContext(1, 1, 44100);
    const get = async f => { try { const r = await fetch(base + f); if (!r.ok) return null; return trimLead(ctx, await ctx.decodeAudioData(await r.arrayBuffer())); } catch { return null; } };
    const notes = await Promise.all(Object.entries(DI_NOTES).map(async ([n, m]) => ({ midi: m, f: await get("guitar/" + n + "_f_1.mp3"), mf: await get("guitar/" + n + "_mf_1.mp3") })));
    KIT.gtr = notes.filter(e => e.f || e.mf);
    for (const [k, files] of Object.entries({ kick: ["kick-1", "kick-2", "kick-3"], snare: ["snare-1", "snare-2", "snare-3"], hat: ["hihat-1", "hihat-2", "hihat-3"], crash: ["crash-1"] })) {
      const bufs = (await Promise.all(files.map(f => get("drums/" + f + ".mp3")))).filter(Boolean); if (bufs.length) KIT.drums[k] = bufs;
    }
    KIT.ready = KIT.gtr.length > 0;
    return KIT;
  })();
  return KIT.promise;
}
const nearestDI = midi => KIT.gtr.reduce((a, b) => (!a || Math.abs(b.midi - midi) < Math.abs(a.midi - midi) ? b : a), null);

function makeAudio() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
  const shaper = ctx.createWaveShaper(); const cv = new Float32Array(2048);
  for (let i = 0; i < 2048; i++) cv[i] = Math.tanh((i / 2048 * 2 - 1) * 9);
  shaper.curve = cv; const post = ctx.createBiquadFilter(); post.type = "lowpass"; post.frequency.value = 4200; shaper.connect(post); post.connect(master);
  // ampli métal + baffle simulé, doublé gauche/droite (comme le générateur Riff)
  const bq = (type, f, q, g) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; if (g != null) b.gain.value = g; return b; };
  const ws = (drive, asym) => { const n = 2048, c = new Float32Array(n), off = asym ? 0.12 : 0, norm = Math.tanh(drive * (1 + off)) - Math.tanh(drive * off);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = (Math.tanh(drive * (x + off)) - Math.tanh(drive * off)) / norm; } const w = ctx.createWaveShaper(); w.curve = c; w.oversample = "4x"; return w; };
  const amp = (pan) => {
    // moins de gain, aigus coupés avant la saturation, baffle plus sombre : fin du « fuzz » (nov. 2026)
    const nodes = [ctx.createGain(), bq("highpass", 110, 0.7), bq("peaking", 800, 0.8, 6), bq("lowpass", 4500, 0.7), ws(11.8, true), bq("highpass", 80, 0.7), bq("lowpass", 5500, 0.7), ws(2.6, false),
      bq("highpass", 80, 0.8), bq("peaking", 110, 1, 3), bq("peaking", 420, 1, -4), bq("peaking", 1800, 1, 3), bq("highshelf", 3500, null, -7), bq("lowpass", 4300, 0.8), bq("lowpass", 5000, 0.6)];
    nodes[0].gain.value = 2.0; const og = ctx.createGain(); og.gain.value = 0.44;
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); nodes[nodes.length - 1].connect(og);
    if (ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = pan; og.connect(pn); pn.connect(master); } else og.connect(master);
    return nodes[0];
  };
  let rig = null; const getRig = () => rig || (rig = [amp(-0.7), amp(0.7)]);
  let bassBus = null; const getBass = () => { if (bassBus) return bassBus; const lp = bq("lowpass", 2600, 0.7), cp = ctx.createDynamicsCompressor(), g = ctx.createGain(); g.gain.value = 1.6; cp.threshold.value = -20; cp.ratio.value = 4; lp.connect(cp); cp.connect(g); g.connect(master); return (bassBus = lp); };
  const playBuf = (buf, t, rate, gain, dest, len) => { const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; s.playbackRate.value = rate; g.gain.setValueAtTime(gain, t);
    if (len) { g.gain.setValueAtTime(gain, t + Math.max(0.02, len - 0.03)); g.gain.linearRampToValueAtTime(0.0001, t + len); } s.connect(g); g.connect(dest); s.start(t); if (len) s.stop(t + len + 0.05); };
  const drum = (k, t, gain) => { const a = KIT.drums[k]; if (!a) return false; playBuf(a[Math.floor(Math.random() * a.length)], t, 1, gain, master); return true; };
  const noise = (dur) => { const b = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ctx.createBufferSource(); s.buffer = b; return s; };
  const A = {
    ctx,
    gtr(t, freqs, pm, dur, vol = 1) {
      if (KIT.ready) {                              // vraie guitare DI → ampli → baffle
        const len = pm ? Math.min(dur, 0.17) : dur, [L, Rr] = getRig();
        [[L, 0], [Rr, 0.009]].forEach(([dst, dt], side) => {
          let dest = dst; if (pm) { const lp = bq("lowpass", 1100, 0.7); lp.connect(dst); dest = lp; }
          freqs.forEach((f, i) => { const m = 69 + 12 * Math.log2(f / 440), e = nearestDI(m); if (!e) return; const b = (pm ? e.mf : e.f) || e.f || e.mf;
            playBuf(b, t + dt, Math.pow(2, (m - e.midi) / 12) * (side ? 1.002 : 1), vol * (i ? 0.85 : 1) * (0.85 + Math.random() * 0.15) * 1.6, dest, len); });
        });
        return;
      }
      const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = pm ? 650 : 2600; lp.Q.value = pm ? 4 : 1;
      freqs.forEach(fr => [0, -7].forEach(det => { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = fr; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 0.05); }));
      lp.connect(g); g.connect(shaper);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime((pm ? 0.5 : 0.42) * vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + (pm ? Math.min(0.11, dur) : dur));
    },
    lead(t, f, dur, timbre) {                      // saxo : anche filtrée ; violon : archet lent + vibrato ; piano : marteau + déclin
      if (timbre === "piano") {
        const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(1200, t + 0.6);
        [[1, "triangle", 0.5], [2, "sine", 0.25], [3, "sine", 0.08], [1.002, "sine", 0.3]].forEach(([h, ty, a]) => { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = ty; o.frequency.value = f * h; og.gain.value = a; o.connect(og); og.connect(lp); o.start(t); o.stop(t + Math.max(dur, 0.4) + 0.6); });
        lp.connect(g); g.connect(master); const end = t + Math.max(dur, 0.4) + 0.5;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32, t + 0.004); g.gain.exponentialRampToValueAtTime(0.12, t + 0.35); g.gain.setValueAtTime(0.12, t + Math.max(dur, 0.36)); g.gain.exponentialRampToValueAtTime(0.001, end);
        return;
      }
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
    bass(t, f, dur, vol = 1, bright = 0) {          // basse : doigts (0), slap (1), pop (2)
      if (KIT.ready) {                              // corde réelle transposée, chaîne basse propre
        const m = 69 + 12 * Math.log2(f / 440), e = nearestDI(m + 12), b = (bright ? e.f : e.mf) || e.f || e.mf;
        let dest = getBass(); if (bright) { const hs = bq("highshelf", 1800, null, bright === 2 ? 12 : 8); hs.connect(dest); dest = hs; }
        playBuf(b, t, Math.pow(2, (m - e.midi) / 12), vol * 1.4, dest, Math.max(0.08, dur));
        return;
      }
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = "sawtooth"; o2.type = "sine"; o.frequency.value = f; o2.frequency.value = f; lp.type = "lowpass";
      lp.frequency.setValueAtTime([1400, 4200, 6000][bright], t); lp.frequency.exponentialRampToValueAtTime([380, 900, 1400][bright], t + 0.18); lp.Q.value = bright ? 5 : 1;
      o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.45 * vol, t + (bright ? 0.002 : 0.008)); g.gain.exponentialRampToValueAtTime(0.001, t + Math.max(0.08, dur));
      [o, o2].forEach(x => { x.start(t); x.stop(t + dur + 0.05); });
    },
    pinch(t, f, dur) {                              // harmonique pincée : sifflement aigu avec vibrato
      const o = ctx.createOscillator(), g = ctx.createGain(), v = ctx.createOscillator(), vg = ctx.createGain();
      o.type = "triangle"; o.frequency.value = f; v.frequency.value = 6.5; vg.gain.value = f * 0.015; v.connect(vg); vg.connect(o.frequency);
      o.connect(g); g.connect(shaper); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      [o, v].forEach(x => { x.start(t); x.stop(t + dur + 0.05); });
    },
    ref(f, dur) {                                   // note de référence propre (accordage)
      const t = ctx.currentTime, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = "sawtooth"; o2.type = "sine"; o.frequency.value = f; o2.frequency.value = f; lp.type = "lowpass"; lp.frequency.setValueAtTime(3000, t); lp.frequency.exponentialRampToValueAtTime(600, t + 1);
      o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      [o, o2].forEach(x => { x.start(t); x.stop(t + dur + 0.05); });
    },
    drone(f) {                                      // fondamentale + quinte, tenue
      const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
      const os = [f, f * 1.5, f / 2].map((fr, i) => { const o = ctx.createOscillator(); o.type = i === 2 ? "sine" : "triangle"; o.frequency.value = fr; o.connect(g); o.start(); return o; });
      g.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.4);
      return () => { g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setValueAtTime(g.gain.value, ctx.currentTime); g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3); os.forEach(o => o.stop(ctx.currentTime + 0.35)); };
    },
    click(t, acc) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = acc ? 1800 : 1200; o.connect(g); g.connect(master); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04); o.start(t); o.stop(t + 0.05); },
    kick(t) { if (drum("kick", t, 1.1)) return; const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); o.connect(g); g.connect(master); g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.start(t); o.stop(t + 0.3); },
    snare(t) { if (drum("snare", t, 0.9)) return; const s = noise(0.2), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = "highpass"; f.frequency.value = 1500; s.connect(f); f.connect(g); g.connect(master); g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16); s.start(t); },
    hat(t) { if (drum("hat", t, 0.35)) return; const s = noise(0.05), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = "highpass"; f.frequency.value = 7000; s.connect(f); f.connect(g); g.connect(master); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04); s.start(t); },
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

// Doigtés saxophone (notes écrites : identiques pour alto, ténor, soprano, baryton).
// [main gauche 1-2-3, main droite 1-2-3, clé d'octave, clé supplémentaire]
const SAX_FING = {
  62: ["111", "111", 0, ""], 63: ["111", "111", 0, "Mib"], 64: ["111", "110", 0, ""], 65: ["111", "100", 0, ""], 66: ["111", "010", 0, ""],
  67: ["111", "000", 0, ""], 68: ["111", "000", 0, "Sol#"], 69: ["110", "000", 0, ""], 70: ["100", "000", 0, "bis"], 71: ["100", "000", 0, ""],
  72: ["010", "000", 0, ""], 73: ["000", "000", 0, ""],
};
for (let m = 74; m <= 85; m++) { const b = SAX_FING[m - 12]; SAX_FING[m] = [b[0], b[1], 1, b[3]]; }
const KEY_EN = { "Mib": "E♭", "Sol#": "G#", "bis": "bis" };
function SaxFinger({ m, fr }) {
  const f = SAX_FING[m]; if (!f) return null;
  const dot = (on, cy, k) => <circle key={k} cx="17" cy={cy} r="5.2" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" />;
  const lbl = (fr ? "doigté : " : "fingering: ") + (f[2] ? (fr ? "octave + " : "octave + ") : "") + "MG " + f[0] + " MD " + f[1] + (f[3] ? " + " + f[3] : "");
  return <svg className="mpl-sax" viewBox="0 0 34 104" width="38" height="116" role="img" aria-label={lbl}>
    <title>{lbl}</title>
    <circle cx="6" cy="7" r="4" fill={f[2] ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.2" />
    <text x="12" y="10" fontSize="7" fill="currentColor">8va</text>
    {[...f[0]].map((c, i) => dot(c === "1", 22 + i * 13, "l" + i))}
    <line x1="8" y1="56" x2="26" y2="56" stroke="currentColor" strokeWidth="1" opacity=".5" />
    {[...f[1]].map((c, i) => dot(c === "1", 66 + i * 13, "r" + i))}
    {f[3] && <text x="17" y="103" fontSize="8" textAnchor="middle" fill="currentColor" fontWeight="700">{fr ? f[3] : KEY_EN[f[3]]}</text>}
  </svg>;
}

// Détection de hauteur par autocorrélation (monophonique). Retourne la note MIDI (fractionnaire) ou null.
function detectPitch(buf, sr) {
  let rms = 0; for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  if (Math.sqrt(rms / buf.length) < 0.01) return null;
  const minL = Math.floor(sr / 1100), maxL = Math.min(Math.floor(sr / 30), buf.length - 1024); let best = -1, bestC = 0;
  for (let lag = minL; lag < maxL; lag++) { let c = 0; for (let i = 0; i < 1024; i++) c += buf[i] * buf[i + lag]; if (c > bestC) { bestC = c; best = lag; } }
  return best > 0 ? 69 + 12 * Math.log2(sr / best / 440) : null;
}

// Clavier : 2 octaves, notes de la gamme marquées, note jouée allumée.
function PianoKeys({ scale, root, cur, names }) {
  const start = root - (root % 12), keys = [], W = 26;
  const isBlack = m => [1, 3, 6, 8, 10].includes(m % 12);
  let x = 0; const whites = [], blacks = [];
  for (let m = start; m < start + 25; m++) {
    if (!isBlack(m)) { whites.push({ m, x }); x += W; } else blacks.push({ m, x: x - W * 0.32 });
  }
  const inScale = m => scale.includes(m), cls = m => (m === cur ? "on" : inScale(m) ? (m === root || m === root + 12 ? "root" : "sc") : "");
  return <svg className="mpl-keys" viewBox={`0 0 ${x + 2} 92`} role="img" aria-label="Clavier">
    {whites.map(k => <g key={k.m}><rect x={k.x + 1} y="1" width={W - 2} height="88" rx="3" className={"w " + cls(k.m)} />
      {inScale(k.m) && <text x={k.x + W / 2} y="80" textAnchor="middle" className="kl">{names[k.m % 12]}</text>}</g>)}
    {blacks.map(k => <g key={k.m}><rect x={k.x} y="1" width={W * 0.64} height="54" rx="2" className={"b " + cls(k.m)} />
      {inScale(k.m) && <circle cx={k.x + W * 0.32} cy="44" r="4" className="bd" />}</g>)}
  </svg>;
}

// ───────── Composant ─────────
export default function Lecons({ uiLang = "fr", canAccess = () => true, onPaywall = () => {}, isMember = true, onRequestAuth = () => {}, sampleBase = "/samples/", onBuyMethod = null }) {
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
  const [method, setMethod] = useState(null);
  const [buy, setBuy] = useState(null);   // { era, inst } ou { pack: true, inst }
  const [kitReady, setKitReady] = useState(KIT.ready);
  useEffect(() => { loadKit(sampleBase).then(k => setKitReady(k.ready)); }, [sampleBase]);
  const [micOn, setMicOn] = useState(false);
  const [micErr, setMicErr] = useState("");
  const [score, setScore] = useState(null);
  const [marks, setMarks] = useState({});
  const [calib, setCalib] = useState(false);
  const [latency, setLatency] = useState(() => { try { return +localStorage.getItem("mp_les_lat") || 0; } catch { return 0; } });
  const [tun, setTunState] = useState(() => { try { return JSON.parse(localStorage.getItem("mp_les_tun") || "null") || { gtr: "D", bass: "D" }; } catch { return { gtr: "D", bass: "D" }; } });
  const setTun = (k, id) => setTunState(t => { const n = { ...t, [k]: id }; try { localStorage.setItem("mp_les_tun", JSON.stringify(n)); } catch { /* stockage indisponible */ } return n; });
  const [passed, setPassed] = useState(() => { try { return JSON.parse(localStorage.getItem("mp_les_done") || "[]"); } catch { return []; } });

  const melodic = inst === "sax" || inst === "vln" || inst === "keys";
  const voice = inst === "vln" ? "vln" : inst === "keys" ? "piano" : saxType;
  const path = melodic ? PENTA_PATH : inst === "bass" ? BASS_PATH : GTR_PATH;
  const li = lesson[inst] ?? 0;
  const cur = path[li];
  const lessonType = melodic ? cur[3] : "string";
  const def = melodic ? null : cur[3];
  const target = melodic ? cur[4] : def.bpm;
  const bpm = Math.round(target * pct / 100);
  const scale = lessonType === "blues" ? BLUES : PENTA;
  const leadRoot = LEAD_BASE[voice] + KEYS[key];
  const bandRoot = 36 + KEYS[key];              // Do2 / Ré2 / Mi2 : la guitare du band
  const bestKey = "mp_les_" + inst + "_" + li;

  const tunList = inst === "bass" ? BASS_TUNINGS : GTR_TUNINGS;
  const tunObj = melodic ? null : (tunList.find(x => x.id === tun[inst]) || tunList[1]);
  const pattern = useMemo(() => (melodic ? genMelodic(lessonType) : adaptChords(def.mk(), inst === "bass" || tunObj.drop)), [melodic, lessonType, inst, li, seed, tunObj && tunObj.drop]); // eslint-disable-line react-hooks/exhaustive-deps
  const backing = melodic && (mode === "play" || mode === "challenge" || lessonType === "phrase" || lessonType === "impro");
  const leadOn = !(melodic && mode === "challenge");

  // refs lus par l'ordonnanceur
  const R = useRef({});
  R.current = { mic: micOn, latency, bass: inst === "bass", tune: tunObj ? tunObj.m : null, sband: !melodic && (mode === "play" || !!def.band), kicks: def && def.kicks, pattern, bpm, metro, mode, melodic, voice, scale, leadRoot, bandRoot, backing, leadOn, target, auto, pct };
  const audio = useRef(null), timer = useRef(null), st = useRef({ step: 0, next: 0, loops: 0 }), stopDrone = useRef(null);
  const mic = useRef({}), exp = useRef([]), cal = useRef(null);

  useEffect(() => { try { setBest(+localStorage.getItem(bestKey) || 0); } catch { setBest(0); } setClean(0); }, [bestKey]);
  useEffect(() => () => { clearInterval(timer.current); stopDrone.current && stopDrone.current(); }, []);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(""), 3500); return () => clearTimeout(id); }, [toast]);

  // bourdon : suit la tonalité et l'état de lecture
  useEffect(() => {
    stopDrone.current && stopDrone.current(); stopDrone.current = null;
    if (playing && melodic && drone && audio.current) stopDrone.current = audio.current.drone(mhz(leadRoot - 12));
  }, [playing, melodic, drone, leadRoot]);

  useEffect(() => {
    const k = inst + ":" + li;
    if (clean >= 3 && !passed.includes(k)) { const d = [...passed, k]; setPassed(d); try { localStorage.setItem("mp_les_done", JSON.stringify(d)); } catch { /* stockage indisponible */ } }
  }, [clean]); // eslint-disable-line react-hooks/exhaustive-deps
  function loopDone() {
    const r = R.current; st.current.loops++;
    setBest(b => { if (r.bpm > b) { try { localStorage.setItem(bestKey, String(r.bpm)); } catch { /* stockage indisponible */ } return r.bpm; } return b; });
    if (r.mic) {                                   // le site écoute : la boucle compte seulement si elle est jouée juste
      const k = st.current.loops - 1, endT = st.current.next, ctx = audio.current.ctx;
      setTimeout(() => evalLoop(k), Math.max(0, (endT - ctx.currentTime + 0.25) * 1000));
    } else if (r.bpm >= r.target) setClean(c => Math.min(3, c + 1));
    if (r.auto && st.current.loops % 2 === 0 && r.pct < 110) setPct(p => Math.min(110, p + 5));
  }
  function evalLoop(k) {
    const r = R.current, items = exp.current.filter(x => x.loop === k);
    exp.current = exp.current.filter(x => x.loop > k);
    if (!items.length) return;
    const hits = items.filter(x => x.hit).length, chk = items.filter(x => x.check), okN = chk.filter(x => x.hit && x.pitchOk).length;
    const good = items.filter(x => x.hit && (!x.check || x.pitchOk)).length, total = Math.round(good / items.length * 100);
    setScore({ total, rhythm: Math.round(hits / items.length * 100), notes: chk.length ? Math.round(okN / chk.length * 100) : null });
    const mk = {}; items.forEach(x => { mk[x.step] = !x.hit ? "miss" : x.check && !x.pitchOk ? "bad" : "ok"; }); setMarks(mk);
    if (total >= 90 && r.bpm >= r.target) setClean(c => Math.min(3, c + 1));
  }
  function onOnset(raw) {
    if (cal.current) { cal.current.hits.push(raw); return; }
    const t = raw - R.current.latency / 1000;
    let best = null, bd = 0.08;
    for (const x of exp.current) { if (x.hit) continue; const d = Math.abs(x.t - t); if (d < bd) { bd = d; best = x; } }
    if (!best) return;
    best.hit = true;
    if (best.check) setTimeout(() => {                // hauteur lue 50 ms après l'attaque
      const m = mic.current; if (!m.anP) return; m.anP.getFloatTimeDomainData(m.bufP);
      const pm = detectPitch(m.bufP, audio.current.ctx.sampleRate);
      if (pm != null) { const d = ((pm - best.midi) % 12 + 18) % 12 - 6; best.pitchOk = Math.abs(d) <= 0.6; }
    }, 50);
  }
  async function startMic() {
    setMicErr("");
    try {
      if (!audio.current) audio.current = makeAudio();
      const ctx = audio.current.ctx; if (ctx.state === "suspended") ctx.resume();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const src = ctx.createMediaStreamSource(stream), an = ctx.createAnalyser(), anP = ctx.createAnalyser();
      an.fftSize = 512; anP.fftSize = 4096; src.connect(an); src.connect(anP);
      const m = { stream, an, anP, buf: new Float32Array(512), bufP: new Float32Array(4096), avg: 0, prev: 0, last: 0 };
      m.timer = setInterval(() => {
        an.getFloatTimeDomainData(m.buf); let e = 0; for (let i = 0; i < 512; i++) e += m.buf[i] * m.buf[i]; const rms = Math.sqrt(e / 512), now = ctx.currentTime;
        if (rms > 0.015 && rms > m.avg * 2.2 && rms > m.prev * 1.25 && now - m.last > 0.07) { m.last = now; onOnset(now - 0.012); }
        m.prev = rms; m.avg = m.avg * 0.95 + rms * 0.05;
      }, 5);
      mic.current = m; setMicOn(true); setScore(null); setMarks({});
    } catch { setMicErr(L("Micro refusé ou indisponible. Autorise le micro, ou branche ta carte de son et réessaie.", "Mic blocked or unavailable. Allow the mic, or plug in your audio interface and try again.")); }
  }
  function stopMic() { const m = mic.current; clearInterval(m.timer); m.stream && m.stream.getTracks().forEach(t => t.stop()); mic.current = {}; setMicOn(false); setScore(null); setMarks({}); }
  function calibrate() {                            // 8 clics : le joueur gratte sur chaque clic, on mesure le délai moyen
    const A = audio.current, ctx = A.ctx, t0 = ctx.currentTime + 0.6, clicks = [];
    stop(); for (let i = 0; i < 8; i++) { const t = t0 + i * 0.6; clicks.push(t); A.click(t, i % 4 === 0); }
    cal.current = { hits: [] }; setCalib(true);
    setTimeout(() => {
      const d = cal.current.hits.map(h => { const c = clicks.reduce((a, b) => (Math.abs(b - h) < Math.abs(a - h) ? b : a)); return h - c; }).filter(x => Math.abs(x) < 0.3).sort((a, b) => a - b);
      cal.current = null; setCalib(false);
      if (d.length >= 4) { const ms = Math.round(d[Math.floor(d.length / 2)] * 1000); setLatency(ms); try { localStorage.setItem("mp_les_lat", String(ms)); } catch { /* stockage indisponible */ } setToast(L(`Calibré : ${ms} ms de délai.`, `Calibrated: ${ms} ms latency.`)); }
      else setToast(L("Pas assez de coups entendus. Monte le volume de ta guitare et recommence.", "Not enough hits heard. Turn your guitar up and try again."));
    }, (8 * 0.6 + 1.2) * 1000);
  }
  useEffect(() => () => { const m = mic.current; clearInterval(m.timer); m.stream && m.stream.getTracks().forEach(t => t.stop()); }, []);
  useEffect(() => { exp.current = []; setScore(null); setMarks({}); }, [inst, li, seed, mode]);

  function schedule() {
    const A = audio.current, ctx = A.ctx;
    while (st.current.next < ctx.currentTime + 0.12) {
      const r = R.current, t = st.current.next, sp = 60 / r.bpm / 4, s = st.current.step % r.pattern.len, loopK = Math.floor(st.current.step / r.pattern.len);
      if (r.melodic) {
        const e = r.pattern.ev.find(n => n.step === s);
        if (e && r.mic) exp.current.push({ t, loop: loopK, step: s, midi: r.leadRoot + r.scale[Math.min(e.deg, r.scale.length - 1)], check: true });
        if (e && r.leadOn && !r.mic) A.lead(t, mhz(r.leadRoot + r.scale[Math.min(e.deg, r.scale.length - 1)]), sp * e.len * 0.95, r.voice);
        if (r.backing) {
          const bs = s % 16; if (bs % 4 === 0 || bs % 4 === 2 || bs % 4 === 3) A.gtr(t, [mhz(r.bandRoot)], true, sp * (bs % 4 === 0 ? 2 : 1), 0.7);
          if (bs % 8 === 0 || bs === 14) A.kick(t); if (bs % 8 === 4) A.snare(t); if (bs % 2 === 0) A.hat(t);
        }
        if (r.metro && !r.backing && s % 4 === 0) A.click(t, s % 16 === 0);
      } else {
        const e = r.pattern.ev.find(n => n.step === s);
        if (e && r.mic) { const lo = e.n.reduce((a, b) => (b[0] > a[0] ? b : a)); exp.current.push({ t, loop: loopK, step: s, midi: r.tune[lo[0]] + lo[1], check: !e.pm && !e.ghost && e.n.length === 1 }); }
        if (e && !r.mic) {
          const fq = e.n.map(([str, f]) => mhz(r.tune[str] + f)), dur = sp * e.len * (e.stac ? 0.45 : 0.95);
          if (r.bass) fq.forEach(f => A.bass(t, f, e.ghost ? sp * 0.5 : dur, e.ghost ? 0.25 : e.acc ? 1.1 : 1, e.slap ? 1 : e.pop ? 2 : 0));
          else { A.gtr(t, fq, !!e.pm, e.pm ? sp * e.len : dur, e.acc ? 1.15 : 1); if (e.pinch) A.pinch(t, fq[0] * 6, dur); }
        }
        if (r.metro && !r.sband && s % 4 === 0) A.click(t, s % 16 === 0);
        if (r.sband) { const bs = s % 16;
          if (r.kicks) { if (r.kicks.includes(bs)) A.kick(t); if (bs === 8) A.snare(t); if (bs % 4 === 0) A.hat(t); }
          else { if (bs % 8 === 0 || bs === 14) A.kick(t); if (bs % 8 === 4) A.snare(t); if (bs % 2 === 0) A.hat(t); } }
      }
      const delay = Math.max(0, (t - ctx.currentTime) * 1000); setTimeout(() => setActive(s), delay);
      st.current.next += sp; st.current.step++;
      if (st.current.step % r.pattern.len === 0) loopDone();
    }
  }
  function start() {
    if (!audio.current) audio.current = makeAudio();
    if (audio.current.ctx.state === "suspended") audio.current.ctx.resume();
    exp.current = [];
    st.current = { step: 0, next: audio.current.ctx.currentTime + (R.current.mic ? 1.2 : 0.06), loops: 0 };   // avec le micro : 1 s pour se placer
    clearInterval(timer.current); timer.current = setInterval(schedule, 25); setPlaying(true);
  }
  function stop() { clearInterval(timer.current); timer.current = null; setPlaying(false); setActive(-1); }

  function openMethod(era) {
    if (mInst === "gtr" && era === "80s") { stop(); setMethod("gtr-80s"); window.scrollTo && window.scrollTo(0, 0); }
    else setToast(L("Dans l'ébauche, seul l'aperçu « 80s · Guitare » est bâti.", "In the draft, only the “80s · Guitar” preview is built."));
  }
  function pickInst(id) { stop(); setInst(id); setMInst(id); setMode("practice"); setPct(70); setDrone(true); }
  function pickLesson(i) {
    const row = path[i];
    if (row[2] === "pro" && !isMember) { setToast(L("Crée ton compte gratuit pour débloquer tout le parcours de base.", "Create your free account to unlock the full base path.")); onRequestAuth(); return; }
    stop(); setLesson(l => ({ ...l, [inst]: i })); setMode("practice"); setPct(70); setSeed(x => x + 1);
  }
  function pickMode(m) { setMode(m); if (m === "demo") setPct(100); if (m === "challenge") setSeed(x => x + 1); }

  const done = path.filter((_, i) => passed.includes(inst + ":" + i)).length;
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
    return { d, w: written, name: nm(written), sub: voice === "vln" ? violinFinger(real, fr) : voice === "piano" ? L("doigt ", "finger ") + (scale.length === 7 ? [1, 2, 3, 4, 1, 2, 3] : [1, 2, 3, 1, 2, 3])[d] : (tr ? L("sonne ", "sounds ") + nm(real) : ""), root: iv % 12 === 0, blue: iv === 6 };
  });
  const curEv = melodic ? pattern.ev.find(e => active >= e.step && active < e.step + e.len) : null;

  const methodFamily = M_INST.find(x => x[0] === mInst)[3];

  const buyModal = buy && <BuyModal fr={fr} item={buy} onClose={() => setBuy(null)} onBuy={onBuyMethod} />;
  if (method) return <div className="mpl"><style>{CSS}</style>
    <MethodModule fr={fr} canAccess={canAccess} onBuy={() => setBuy({ era: "80s", inst: "gtr" })} onBack={() => setMethod(null)} />{buyModal}</div>;

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
          <button aria-pressed={inst === "keys"} onClick={() => pickInst("keys")}>Piano</button>
          
          <button disabled>{L("Batterie", "Drums")}<small>{L("bientôt", "soon")}</small></button>
          <button disabled>{L("Chant", "Vocals")}<small>{L("bientôt", "soon")}</small></button>
        </div>
      </div>

      {toast && <div className="mpl-toast" role="status">{toast}</div>}
      {buyModal}

      <div className="mpl-grid">
        <aside className="mpl-rail" aria-label={L("Parcours", "Path")}>
          <h3>{melodic ? L("Parcours · Pentatonique mineure", "Path · Minor pentatonic") : inst === "bass" ? L("Parcours · Basse métal", "Path · Metal bass") : L("Parcours · Guitare métal", "Path · Metal guitar")}</h3>
          <div className="mpl-meter" aria-hidden="true"><i style={{ width: (done / path.length * 100) + "%" }} /></div>
          <p className="mpl-small">{done} {L("leçons sur", "lessons of")} {path.length} {L("réussies", "completed")}</p>
          <ol className="mpl-path">
            {path.map((row, i) => {
              const locked = row[2] === "pro" && !isMember, isDone = passed.includes(inst + ":" + i);
              return <li key={i}><button aria-current={i === li} className={isDone ? "done" : locked ? "lock" : ""} onClick={() => pickLesson(i)}>
                <span className="n">{isDone ? "✓" : String(i + 1).padStart(2, "0")}</span><span>{fr ? row[0] : row[1]}</span>
                <span className={"mpl-tag " + row[2]}>{row[2] === "free" ? L("gratuit", "free") : L("membres", "members")}</span></button></li>;
            })}
          </ol>
          <p className="mpl-note">{L("Le parcours de base est gratuit pour les membres (compte gratuit). Les méthodes par époque se vendent à part.", "The base path is free for members (free account). Era methods are sold separately.")}</p>
        </aside>

        <main className="mpl-main">
          <div className="mpl-head">
            <div>
              <div className="mpl-eyebrow">{L("Leçon", "Lesson")} {li + 1} · {melodic ? L("Pentatonique mineure", "Minor pentatonic") : inst === "bass" ? L("Basse métal", "Metal bass") : L("Guitare métal", "Metal guitar")}</div>
              <h1>{fr ? cur[0] : cur[1]}</h1>
            </div>
            <div className="mpl-meta">
              <span className="mpl-chip">{melodic ? (fr ? KEY_LBL[key][0] : KEY_LBL[key][1]) : (fr ? tunObj.fr : tunObj.en) + (inst === "bass" ? L(" · 4 cordes", " · 4-string") : "")}</span>
              <span className="mpl-chip">{L("Cible", "Target")} {target} BPM</span>
            </div>
          </div>
          <p className="mpl-goal"><b>{L("Objectif :", "Goal:")}</b> {melodic ? PENTA_GOAL[lessonType][fr ? 0 : 1]
            : def.goal[fr ? 0 : 1]}</p>

          {!melodic && <div className="mpl-stage">
            <div className="mpl-row">
              <label>{L("Accordage", "Tuning")}</label>
              {tunList.map(x => <button key={x.id} className="mpl-pill" aria-pressed={tunObj.id === x.id} onClick={() => { stop(); setTun(inst, x.id); }}>{fr ? x.fr : x.en}</button>)}
            </div>
            <p className="mpl-small">{L(`Cordes : ${[...tunObj.l].reverse().join(" ")}. `, `Strings: ${[...tunObj.l].reverse().join(" ")}. `)}{tunObj.drop || inst === "bass" ? L("Les tabs restent les mêmes : seul le son descend.", "Tabs stay the same: only the pitch drops.") : L("Accordage standard : les power chords se jouent à 2 doigts, la tab s'ajuste.", "Standard tuning: power chords use 2 fingers, the tab adjusts.")}</p>
          </div>}

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
              : inst === "keys" ? L("Main droite, une octave au-dessus de la guitare. Les chiffres sous les notes sont les doigts (1 = pouce). La main gauche peut tenir la note de base en bas.", "Right hand, an octave above the guitar. Numbers under the notes are fingers (1 = thumb). The left hand can hold the root down low.")
              : L("Le violon joue une octave au-dessus de la guitare (les riffs en drop descendent plus bas que la corde de Sol). Position 1.", "The violin plays an octave above the guitar (drop-tuned riffs go below the G string). First position.")}</p>
          </div>}

          <div className="mpl-steps" role="group" aria-label={L("Étapes de la leçon", "Lesson steps")}>
            {STEPS.map(([id, b, s]) => <button key={id} aria-pressed={mode === id} onClick={() => pickMode(id)}><b>{b}</b><span>{s}</span></button>)}
          </div>

          <section className="mpl-stage" aria-label={L("Pupitre", "Practice stand")}>
            <div className="mpl-stagehead">
              <p><b>{STEPS.find(x => x[0] === mode)[1].replace(/^\d · /, "")}.</b> {STEP_TXT[mode]}</p>
              {((!melodic && def.gen) || lessonType === "phrase") && <button className="mpl-ghost" onClick={() => setSeed(x => x + 1)}>{melodic ? L("Nouvelle phrase", "New phrase") : L("Nouveau riff", "New riff")}</button>}
            </div>

            {melodic ? <>
              <div className="mpl-pads">
                {pads.map(p => <div key={p.d} className={"mpl-pad" + (p.root ? " root" : "") + (p.blue ? " blue" : "") + (curEv && curEv.deg === p.d && leadOn ? " on" : "")}>
                  <b>{p.name}</b>{p.sub && <span>{p.sub}</span>}{inst === "sax" && <SaxFinger m={p.w} fr={fr} />}</div>)}
              </div>
              {inst === "keys" && <PianoKeys scale={scale.map(iv => leadRoot + iv)} root={leadRoot} cur={curEv && leadOn ? leadRoot + scale[Math.min(curEv.deg, scale.length - 1)] : null} names={names} />}
              {pattern.ev.length > 0 ? <div className="mpl-seq" aria-label={L("Séquence", "Sequence")}>
                {pattern.ev.map(e => <span key={e.idx} className={(curEv && curEv.idx === e.idx ? "on" : "") + (marks[e.step] ? " m-" + marks[e.step] : "")}>{pads[Math.min(e.deg, pads.length - 1)].name}</span>)}
              </div> : <p className="mpl-small">{L("Pas de partition : le band joue 4 mesures en boucle, tu improvises avec les 5 notes ci-dessus.", "No score: the band loops 4 bars, you improvise with the 5 notes above.")}</p>}
              <div className="mpl-legend"><span><b>{L("bordure orange", "orange border")}</b> {L("note de base (la tonique)", "root note")}</span>{lessonType === "blues" && <span><b>{L("pointillé", "dashed")}</b> {L("la blue note", "the blue note")}</span>}{inst === "sax" && <span><b>●</b> {L("clé enfoncée · main gauche en haut, main droite en bas · 8va = clé d'octave", "key pressed · left hand on top, right hand below · 8va = octave key")}</span>}</div>
            </> : <>
              {def.tuner && <Tuner fr={fr} tune={tunObj.m} labels={tunObj.l} getAudio={() => { if (!audio.current) audio.current = makeAudio(); if (audio.current.ctx.state === "suspended") audio.current.ctx.resume(); return audio.current; }} />}
              <div className="mpl-box"><StrTab pattern={pattern} active={active} labels={tunObj.l} marks={marks} /></div>
              <div className="mpl-legend">{inst === "bass"
                ? <><span><b>I M</b> {L("index · majeur", "index · middle")}</span><span><b>T P</b> {L("pouce (slap) · pop", "thumb (slap) · pop")}</span><span><b>x</b> {L("note fantôme", "ghost note")}</span><span><b>0</b> {L("corde à vide", "open string")}</span></>
                : <><span><b>↓ ↑</b> {L("coup bas · coup haut", "downstroke · upstroke")}</span><span><b>{L("orange", "orange")}</b> {L("palm mute", "palm mute")}</span><span><b>&gt;</b> accent</span><span><b>PH</b> {L("harmonique pincée", "pinch harmonic")}</span></>}</div>
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
            <div className="mpl-listen">
              <button className="mpl-ghost" aria-pressed={micOn} onClick={() => (micOn ? stopMic() : startMic())}>{micOn ? L("■ Arrêter l'écoute", "■ Stop listening") : L("🎙 Le site m'écoute", "🎙 Let the site listen")}</button>
              {micOn && <button className="mpl-ghost" disabled={calib} onClick={calibrate}>{calib ? L("Gratte sur chaque clic…", "Strum on every click…") : L(`Calibrer · ${latency} ms`, `Calibrate · ${latency} ms`)}</button>}
              <p className="mpl-small">{micOn ? L("Mets des écouteurs. Ta partie est coupée : c'est toi qui la joues. Chaque note est vérifiée (à temps ± 80 ms, et la bonne note quand c'est une note seule). Une boucle compte à 90 % et plus.", "Wear headphones. Your part is muted: you play it. Every note is checked (on time ± 80 ms, and the right pitch for single notes). A loop counts at 90% and up.")
                : L("Branche ta carte de son (ou utilise le micro) : le site entend ce que tu joues et valide tes boucles tout seul.", "Plug in your audio interface (or use the mic): the site hears what you play and validates your loops itself.")}</p>
              {micErr && <p className="mpl-small" style={{ color: "var(--ember2)" }}>{micErr}</p>}
            </div>
          </section>

          <div className="mpl-coach">
            <div className="mpl-card">
              <h4>{L("Boucles propres à 100 %", "Clean loops at 100%")}</h4>
              <div className="mpl-dots">{[0, 1, 2].map(i => <i key={i} className={i < clean ? "on" : ""} />)}</div>
              {micOn && <div className="mpl-score"><b className={score && score.total >= 90 ? "ok" : ""}>{score ? score.total + " %" : "—"}</b><span>{score ? L("rythme ", "rhythm ") + score.rhythm + " %" + (score.notes != null ? L(" · notes ", " · notes ") + score.notes + " %" : "") : L("Joue une boucle…", "Play a loop…")}</span></div>}
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
                ? (inst === "keys" ? [L("Poignet souple, doigts arrondis.", "Loose wrist, curved fingers."), L("Le pouce passe sous le 3e doigt pour continuer la gamme.", "The thumb passes under the 3rd finger to keep going."), L("Même force sur chaque touche : écoute l'égalité.", "Same weight on every key: listen for evenness.")]
                  : inst === "sax" ? [L("Souffle constant, appuie avec le ventre.", "Steady air, support from the belly."), L("Langue légère : « tu » sur chaque note.", "Light tongue: “tu” on each note."), L("Coins de bouche fermes, pas les dents.", "Firm mouth corners, not teeth.")]
                  : [L("Archet droit, parallèle au chevalet.", "Straight bow, parallel to the bridge."), L("Écoute le bourdon : la note doit « se fondre » dedans.", "Listen to the drone: the note should blend into it."), L("Doigts arrondis, bout du doigt sur la corde.", "Curved fingers, fingertip on the string.")])
                : def.tips.map(x => x[fr ? 0 : 1])
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
                <button className="mpl-ghost mpl-peek" onClick={() => openMethod(era)}>{L("Voir l'aperçu", "Preview")}{mInst === "gtr" && era === "80s" ? " ★" : ""}</button>
                <div className="mpl-buy"><span className="mpl-price">9,99 $</span><button onClick={() => setBuy({ era, inst: mInst })}>{L("Débloquer", "Unlock")}</button></div>
              </div>)}
            </div>
            <div className="mpl-pack">
              <p><b>{L("Pack 5 époques", "5-era pack")}</b> · {L("tout l'instrument, des 70s à aujourd'hui", "the whole instrument, 70s to today")}</p>
              <span className="mpl-price">39,99 $</span><button className="mpl-cta" onClick={() => setBuy({ pack: true, inst: mInst })}>{L("Prendre le pack", "Get the pack")}</button>
            </div>
          </section>

          <p className="mpl-note">{kitReady ? L("Son : vraie guitare enregistrée (DI) passée dans un ampli métal, vraie batterie. Saxo, violon et piano sont encore synthétisés.", "Sound: real recorded guitar (DI) through a metal amp, real drums. Sax, violin and piano are still synthesized.")
            : L("Chargement des vrais sons… (son de secours en attendant)", "Loading real sounds… (fallback sound meanwhile)")}</p>
        </main>
      </div>
    </div>
  );
}

function StrTab({ pattern, active, labels, marks = {} }) {
  const N = labels.length, cells = [], at = {};
  pattern.ev.forEach(e => { at[e.step] = e; });
  let curE = null;
  labels.forEach((l, i) => cells.push(<div key={"l" + i} className="lbl">{l}</div>));
  cells.push(<div key="lpk" />);
  for (let stp = 0; stp < pattern.len; stp++) {
    if (stp > 0 && stp % 16 === 0) for (let k = 0; k <= N; k++) cells.push(<div key={"b" + stp + "-" + k} className={k < N ? "bar" : ""} />);
    const e = at[stp]; if (e) curE = e;
    const on = curE && active >= curE.step && active < curE.step + curE.len && e === curE;
    for (let s = 0; s < N; s++) {
      const hit = e && e.n.find(x => x[0] === s);
      cells.push(<div key={stp + "-" + s} className={"c" + (e && e.pm ? " pm" : "") + (on ? " on" : "")}><span>{hit ? (e.ghost ? "x" : String(hit[1])) + (e.stac ? "·" : "") : ""}</span></div>);
    }
    cells.push(<div key={stp + "-pk"} className={"pk" + (e ? (e.lab === "↑" || e.lab === "M" || e.lab === "P" ? " u" : " d") : "") + (on ? " on" : "") + (marks[stp] ? " m-" + marks[stp] : "")}>{e ? (e.acc ? ">" : "") + (e.openLbl ? labels[e.n[0][0]] : (e.lab || "")) : ""}</div>);
  }
  return <div className="mpl-tab" style={{ gridTemplateRows: `repeat(${N},22px) 18px` }} aria-label="Tablature">{cells}</div>;
}

// Accordeur : notes de référence + micro (carte de son ou micro du téléphone), détection par autocorrélation.
function Tuner({ fr, tune, labels, getAudio }) {
  const L = (a, b) => (fr ? a : b);
  const [mic, setMic] = useState(null), [read, setRead] = useState(null), [err, setErr] = useState("");
  const raf = useRef(0), stream = useRef(null);
  useEffect(() => () => { cancelAnimationFrame(raf.current); stream.current && stream.current.getTracks().forEach(t => t.stop()); }, []);
  const order = tune.map((m, i) => [m, i]).sort((a, b) => a[0] - b[0]);
  async function startMic() {
    setErr("");
    try {
      const A = getAudio(), ctx = A.ctx;
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      stream.current = s; const src = ctx.createMediaStreamSource(s), an = ctx.createAnalyser(); an.fftSize = 4096; src.connect(an);
      const buf = new Float32Array(an.fftSize); setMic(true);
      const loop = () => {
        an.getFloatTimeDomainData(buf);
        let rms = 0; for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i]; rms = Math.sqrt(rms / buf.length);
        if (rms > 0.01) {
          const sr = ctx.sampleRate, minL = Math.floor(sr / 700), maxL = Math.floor(sr / 35); let best = -1, bestC = 0;
          for (let lag = minL; lag < maxL; lag++) { let c = 0; for (let i = 0; i < 2048; i++) c += buf[i] * buf[i + lag]; if (c > bestC) { bestC = c; best = lag; } }
          if (best > 0) {
            const f = sr / best, m = 69 + 12 * Math.log2(f / 440);
            const [tm, ti] = order.reduce((a, b) => (Math.abs(b[0] - m) < Math.abs(a[0] - m) ? b : a));
            setRead({ str: labels[ti], cents: Math.round((m - tm) * 100), f: Math.round(f * 10) / 10 });
          }
        }
        raf.current = requestAnimationFrame(loop);
      };
      loop();
    } catch { setErr(L("Micro refusé ou indisponible. Autorise le micro, ou branche ta carte de son et réessaie. Sinon, accorde à l'oreille avec les notes de référence.", "Mic blocked or unavailable. Allow the mic, or plug in your audio interface and try again. Otherwise tune by ear with the reference notes.")); }
  }
  function stopMic() { cancelAnimationFrame(raf.current); stream.current && stream.current.getTracks().forEach(t => t.stop()); stream.current = null; setMic(null); setRead(null); }
  const c = read ? Math.max(-50, Math.min(50, read.cents)) : 0, ok = read && Math.abs(read.cents) <= 5;
  return <div className="mpl-tuner">
    <div className="mpl-row"><label>{L("Notes de référence", "Reference notes")}</label>
      {order.map(([m, i]) => <button key={i} className="mpl-pill" onClick={() => getAudio().ref(mhz(m), 2.2)}>{labels[i]}</button>)}
      <span style={{ flex: 1 }} />
      <button className="mpl-ghost" onClick={() => (mic ? stopMic() : startMic())}>{mic ? L("■ Couper le micro", "■ Stop mic") : L("🎙 Accordeur micro", "🎙 Mic tuner")}</button>
    </div>
    {mic && <div className="mpl-needle">
      <div className="mpl-needle-read"><b className={ok ? "ok" : ""}>{read ? read.str : "—"}</b><span>{read ? (read.cents > 0 ? "+" : "") + read.cents + " cents · " + read.f + " Hz" : L("Joue une corde à vide…", "Play an open string…")}</span></div>
      <div className="mpl-needle-bar"><i style={{ left: (50 + c) + "%" }} className={ok ? "ok" : ""} /></div>
      <div className="mpl-needle-lbl"><span>{L("trop bas", "flat")}</span><span>{ok ? L("juste ✓", "in tune ✓") : ""}</span><span>{L("trop haut", "sharp")}</span></div>
    </div>}
    {err && <p className="mpl-small">{err}</p>}
  </div>;
}

// Achat d'une méthode par époque (ou du pack). Paiement branché par la prop onBuyMethod ; sinon « bientôt en vente ».
function BuyModal({ fr, item, onClose, onBuy }) {
  const L = (a, b) => (fr ? a : b);
  const inst = M_INST.find(x => x[0] === item.inst) || M_INST[0], instName = fr ? inst[1] : inst[2];
  const fam = METHOD_ITEMS[inst[3]];
  const title = item.pack ? L(`Pack 5 époques · ${instName}`, `5-era pack · ${instName}`) : L(`Méthode ${item.era} · ${instName}`, `${item.era} method · ${instName}`);
  const price = item.pack ? "39,99 $" : "9,99 $";
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return <div className="mpl-modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="mpl-modal-box">
      <button className="mpl-modal-x" onClick={onClose} aria-label={L("Fermer", "Close")}>×</button>
      <div className="mpl-eyebrow">{L("Méthode par époque", "Era method")}</div>
      <h3>{title}</h3>
      <div className="mpl-big" style={{ color: "var(--ember2)" }}>{price} <small style={{ fontSize: 13, color: "var(--muted)" }}>{L("paiement unique, à vie", "one-time, lifetime")}</small></div>
      {item.pack
        ? <p className="mpl-small">{L("Les 5 époques (70s, 80s, 90s, 00s, 10s) pour cet instrument : 20 modules, une centaine d'exercices, riffs générés à l'infini et play-alongs.", "All 5 eras (70s to 10s) for this instrument: 20 modules, about a hundred exercises, endless generated riffs and play-alongs.")}</p>
        : <ul className="mpl-tips">{(fam[item.era] || []).map(([a, b]) => <li key={a}><b style={{ color: "var(--fg)" }}>{a}</b> · {b}</li>)}<li>{L("Défi final + badge de l'époque", "Final challenge + era badge")}</li></ul>}
      <p className="mpl-small">{L("Environ 20 exercices progressifs, tempo cible, riffs d'exercice générés dans le son de l'époque, validation par le micro ou la carte de son.", "About 20 progressive exercises, target tempo, practice riffs generated in the era's sound, mic or audio-interface checking.")}</p>
      {onBuy
        ? <button className="mpl-play" style={{ width: "100%" }} onClick={() => onBuy(item)}>{L("Acheter", "Buy")} · {price}</button>
        : <><button className="mpl-play" style={{ width: "100%", opacity: .55, cursor: "not-allowed" }} disabled>{L("Bientôt en vente", "Coming soon")}</button>
          <p className="mpl-small" style={{ textAlign: "center" }}>{L("Les méthodes ouvrent avec la section Leçons. Le module 1 de la méthode 80s guitare est déjà jouable en aperçu.", "Methods open with the Lessons section. Module 1 of the 80s guitar method is already playable as a preview.")}</p></>}
    </div>
  </div>;
}

// ───────── Méthode 80s · Guitare — module 1 : Alternate picking ─────────
const STD = [64, 59, 55, 50, 45, 40];          // e B G D A E (accordage standard, son des 80s)
const STD_LBL = ["e", "B", "G", "D", "A", "E"];
function evs(notes, accentBeat) {               // notes : [corde, frette] par double croche
  return { len: notes.length, ev: notes.map(([str, fret], i) => ({ step: i, str, fret, pick: i % 2 ? "u" : "d", acc: accentBeat && i % 4 === 0 })) };
}
const rep = (n, x) => Array.from({ length: n }, () => x);
function thrashCells() {
  const cells = [[[5, 0], [5, 0], [5, 0], [5, 0]], [[5, 0], [5, 0], [5, 1], [5, 0]], [[5, 0], [5, 0], [5, 3], [5, 0]], [[5, 0], [5, 0], [4, 2], [5, 0]],
    [[5, 0], [5, 0], [5, 5], [5, 0]], [[5, 0], [5, 0], [5, 6], [5, 5]], [[5, 0], [5, 0], [4, 1], [4, 2]]];
  const runs = [[[5, 5], [5, 3], [5, 1], [5, 0]], [[4, 2], [4, 1], [5, 3], [5, 0]], [[5, 6], [5, 5], [5, 3], [5, 1]]];
  const out = [];
  for (let b = 0; b < 8; b++) {
    const c = b === 0 || b === 4 ? cells[0] : (b === 3 || b === 7) ? runs[Math.floor(Math.random() * runs.length)] : cells[1 + Math.floor(Math.random() * (cells.length - 1))];
    out.push(...c);
  }
  return out;
}
const M80_EX = [
  { t: ["Corde à vide en doubles", "Open string sixteenths"], bpm: 120, mk: () => evs(rep(32, [5, 0])),
    tip: ["Bas-haut-bas-haut, sans arrêt. Les coups haut doivent sonner aussi fort que les coups bas.", "Down-up-down-up, non-stop. Upstrokes must sound as loud as downstrokes."] },
  { t: ["Accent sur le temps", "Accent on the beat"], bpm: 140, mk: () => evs(rep(32, [5, 0]), true),
    tip: ["Appuie le coup bas du temps (>), relâche les trois autres. C'est ce qui fait « galoper » le thrash.", "Dig into the downstroke on the beat (>), relax the other three. That's what makes thrash drive."] },
  { t: ["Changement de corde", "String changes"], bpm: 140, mk: () => evs([0, 1, 2, 3, 4, 5, 6, 7].flatMap(b => rep(4, [b % 2 ? 4 : 5, 0]))),
    tip: ["Mi grave, La, Mi grave, La… Le médiator saute de corde sans changer l'alternance.", "Low E, A, low E, A… The pick jumps strings without breaking the alternation."] },
  { t: ["Chromatique 1-2-3-4", "Chromatic 1-2-3-4"], bpm: 110, mk: () => evs([5, 4, 3, 2].flatMap(s => [1, 2, 3, 4].map(f => [s, f])).concat([2, 3, 4, 5].flatMap(s => [4, 3, 2, 1].map(f => [s, f])))),
    tip: ["Un doigt par frette. La main gauche et la droite doivent tomber exactement ensemble.", "One finger per fret. Both hands must land exactly together."] },
  { t: ["Riff thrash", "Thrash riff"], bpm: 160, mk: () => evs([[5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 1], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 3], [5, 2],
      [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 5], [5, 0], [5, 0], [5, 0], [5, 6], [5, 0], [5, 5], [5, 3], [5, 1], [5, 0]]),
    tip: ["La corde à vide en palm mute, les notes frettées un peu plus ouvertes. L'alternance ne s'arrête jamais.", "Palm-mute the open string, let fretted notes open up a bit. The alternation never stops."] },
  { t: ["Défi : riff jamais vu", "Challenge: unseen riff"], bpm: 170, mk: () => evs(thrashCells()), challenge: true,
    tip: ["Un nouveau riff thrash à chaque clic. Lis-le, joue-le du premier coup avec le band.", "A new thrash riff on every click. Read it and nail it first try with the band."] },
];
const M80_MODS = [["Alternate picking", "Alternate picking", "free"], ["Mineur harmonique + sweep", "Harmonic minor + sweep", "pro"], ["Tapping", "Tapping", "pro"], ["Tremolo picking", "Tremolo picking", "pro"], ["Défi final : solo 16 mesures", "Final challenge: 16-bar solo", "pro"]];

function MethodModule({ fr, canAccess, onBuy, onBack }) {
  const L = (a, b) => (fr ? a : b);
  const [ex, setEx] = useState(0);
  const [seed, setSeed] = useState(0);
  const [pct, setPct] = useState(70);
  const [band, setBand] = useState(false);
  const [metro, setMetro] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(-1);
  const [clean, setClean] = useState(0);
  const [done, setDone] = useState(() => { try { return JSON.parse(localStorage.getItem("mp_m80_done") || "[]"); } catch { return []; } });
  const cur = M80_EX[ex], bpm = Math.round(cur.bpm * pct / 100);
  const pattern = useMemo(() => cur.mk(), [ex, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const R = useRef({}); R.current = { pattern, bpm, band: band || !!cur.challenge, metro, target: cur.bpm, ex };
  const audio = useRef(null), timer = useRef(null), st = useRef({ step: 0, next: 0 });
  useEffect(() => () => clearInterval(timer.current), []);
  useEffect(() => { setClean(0); }, [ex, seed]);
  useEffect(() => { if (clean >= 3 && !done.includes(ex)) { const d = [...done, ex]; setDone(d); try { localStorage.setItem("mp_m80_done", JSON.stringify(d)); } catch { /* stockage indisponible */ } } }, [clean]); // eslint-disable-line react-hooks/exhaustive-deps

  function schedule() {
    const A = audio.current, ctx = A.ctx;
    while (st.current.next < ctx.currentTime + 0.12) {
      const r = R.current, t = st.current.next, sp = 60 / r.bpm / 4, s = st.current.step % r.pattern.len, e = r.pattern.ev[s];
      if (e) { const open = e.fret === 0 && e.str === 5; A.gtr(t, [mhz(STD[e.str] + e.fret)], open, sp * (open ? 1 : 1.1), e.acc ? 1.2 : (e.pick === "u" ? 0.8 : 0.9)); }
      if (r.band) { if (s % 2 === 0) A.kick(t); if (s % 8 === 4) A.snare(t); if (s % 4 === 0) A.hat(t); }
      else if (r.metro && s % 4 === 0) A.click(t, s % 16 === 0);
      const delay = Math.max(0, (t - ctx.currentTime) * 1000); setTimeout(() => setActive(s), delay);
      st.current.next += sp; st.current.step++;
      if (st.current.step % r.pattern.len === 0 && r.bpm >= r.target) setClean(c => Math.min(3, c + 1));
    }
  }
  function start() {
    if (!audio.current) audio.current = makeAudio();
    if (audio.current.ctx.state === "suspended") audio.current.ctx.resume();
    st.current = { step: 0, next: audio.current.ctx.currentTime + 0.06 };
    clearInterval(timer.current); timer.current = setInterval(schedule, 25); setPlaying(true);
  }
  function stop() { clearInterval(timer.current); timer.current = null; setPlaying(false); setActive(-1); }
  function pickEx(i) { stop(); setEx(i); setPct(70); setSeed(x => x + 1); }
  function pickMod(i) { if (i > 0) onBuy(); }   // modules 2-5 : achat de la méthode (9,99 $ pour la méthode complète)

  // tab
  const cells = [];
  STD_LBL.forEach((l, i) => cells.push(<div key={"l" + i} className="lbl">{l}</div>));
  cells.push(<div key="lpk" />);
  pattern.ev.forEach((e, stp) => {
    if (stp > 0 && stp % 16 === 0) for (let k = 0; k <= 6; k++) cells.push(<div key={"b" + stp + k} className={k < 6 ? "bar" : ""} />);
    for (let s = 0; s < 6; s++) cells.push(<div key={stp + "-" + s} className={"c" + (e.str === 5 && e.fret === 0 ? " pm" : "") + (active === stp ? " on" : "")}><span>{s === e.str ? String(e.fret) : ""}</span></div>);
    cells.push(<div key={stp + "-pk"} className={"pk " + e.pick + (active === stp ? " on" : "")}>{e.acc ? ">" : ""}{e.pick === "d" ? "↓" : "↑"}</div>);
  });

  return <>
    <button className="mpl-back" onClick={() => { stop(); onBack(); }}>← {L("Retour aux leçons", "Back to lessons")}</button>
    <div className="mpl-grid">
      <aside className="mpl-rail" aria-label={L("Modules", "Modules")}>
        <h3>{L("Méthode 80s · Guitare", "80s method · Guitar")}</h3>
        <p className="mpl-small">{L("Thrash · speed · shred. 4 modules + défi final, environ 20 exercices.", "Thrash · speed · shred. 4 modules + final challenge, about 20 exercises.")}</p>
        <div className="mpl-meter" aria-hidden="true"><i style={{ width: (done.length / M80_EX.length * 20) + "%" }} /></div>
        <ol className="mpl-path">
          {M80_MODS.map((m, i) => <li key={i}><button aria-current={i === 0} className={i > 0 && !canAccess("forge") ? "lock" : ""} onClick={() => pickMod(i)}>
            <span className="n">{String(i + 1).padStart(2, "0")}</span><span>{fr ? m[0] : m[1]}</span>
            <span className={"mpl-tag " + m[2]}>{m[2] === "free" ? L("aperçu", "preview") : "🔒"}</span></button></li>)}
        </ol>
        <p className="mpl-note">{L("Le module 1 est offert en aperçu. La méthode complète : 9,99 $, ou incluse dans le pack 5 époques.", "Module 1 is a free preview. Full method: $9.99, or included in the 5-era pack.")}</p>
      </aside>

      <main className="mpl-main">
        <div className="mpl-head">
          <div>
            <div className="mpl-eyebrow">80s · {L("Guitare", "Guitar")} · Module 1 {L("de", "of")} 4</div>
            <h1>Alternate picking</h1>
          </div>
          <div className="mpl-meta"><span className="mpl-chip">{L("Accordage standard", "Standard tuning")}</span><span className="mpl-chip">{done.length}/{M80_EX.length} {L("exercices", "exercises")}</span></div>
        </div>

        <div className="mpl-two">
          <div className="mpl-stage">
            <p className="mpl-goal"><b>{L("Le principe :", "The idea:")}</b> {L("le médiator alterne sans jamais s'arrêter. Coup bas sur le temps et sur le « et », coup haut sur les doubles entre les deux. C'est le moteur du thrash des années 80 : chaque note sonne pareil, à n'importe quelle vitesse.",
              "the pick alternates and never stops. Downstroke on the beat and on the “and”, upstroke on the sixteenths in between. It's the engine of 80s thrash: every note sounds the same, at any speed.")}</p>
            <div className="mpl-pick" aria-label={L("Alternance", "Alternation")}>
              {[["↓", "1", "d"], ["↑", "i", "u"], ["↓", L("et", "&"), "d"], ["↑", "a", "u"]].map(([a, b, c], i) => <div key={i} className={c === "u" ? "up" : ""}><b>{a}</b><span>{b}</span></div>)}
            </div>
            <ul className="mpl-tips">
              <li>{L("Le mouvement vient du poignet, pas du coude.", "The motion comes from the wrist, not the elbow.")}</li>
              <li>{L("Médiator légèrement incliné, juste la pointe dans la corde.", "Pick slightly angled, only the tip in the string.")}</li>
              <li>{L("Petits mouvements : plus c'est rapide, plus c'est petit.", "Small motions: the faster, the smaller.")}</li>
            </ul>
          </div>
          <div className="mpl-video"><div><b>{L("Vidéo narrée · 1 min", "Narrated video · 1 min")}</b>{L("Main droite au ralenti, tab qui défile, voix en français. À produire.", "Picking hand in slow motion, scrolling tab, French voice-over. To be produced.")}</div></div>
        </div>

        <div className="mpl-two">
          <section className="mpl-stage" aria-label={L("Exercices", "Exercises")}>
            <div className="mpl-ex">
              {M80_EX.map((x, i) => <button key={i} aria-current={i === ex} className={done.includes(i) ? "ok" : ""} onClick={() => pickEx(i)}>
                <span className="n">{done.includes(i) ? "✓" : i + 1}</span><span>{fr ? x.t[0] : x.t[1]}</span><small>{x.bpm} BPM</small></button>)}
            </div>
          </section>
          <div className="mpl-card">
            <h4>{L("Boucles propres à 100 %", "Clean loops at 100%")}</h4>
            <div className="mpl-dots">{[0, 1, 2].map(i => <i key={i} className={i < clean ? "on" : ""} />)}</div>
            {clean >= 3 ? <span className="mpl-okmsg">{L("Exercice réussi.", "Exercise passed.")}</span> : <p>{L(`Atteins ${cur.bpm} BPM, 3 boucles de suite.`, `Reach ${cur.bpm} BPM, 3 loops in a row.`)}</p>}
            <h4 style={{ marginTop: 8 }}>{L("Consigne", "Instruction")}</h4>
            <p>{fr ? cur.tip[0] : cur.tip[1]}</p>
          </div>
        </div>

        <section className="mpl-stage" aria-label={L("Pupitre", "Practice stand")}>
          <div className="mpl-stagehead">
            <p><b>{L("Exercice", "Exercise")} {ex + 1} · {fr ? cur.t[0] : cur.t[1]}</b></p>
            {cur.challenge && <button className="mpl-ghost" onClick={() => setSeed(x => x + 1)}>{L("Nouveau riff", "New riff")}</button>}
          </div>
          <div className="mpl-box"><div className="mpl-tab" aria-label="Tablature">{cells}</div></div>
          <div className="mpl-legend"><span><b>↓ ↑</b> {L("coup bas · coup haut", "downstroke · upstroke")}</span><span><b>&gt;</b> {L("accent", "accent")}</span><span><b>0</b> {L("Mi grave à vide, en palm mute", "open low E, palm-muted")}</span></div>
          <div className="mpl-transport">
            <button className="mpl-play" aria-pressed={playing} onClick={() => (playing ? stop() : start())}>{playing ? L("■ Arrêter", "■ Stop") : L("▶ Jouer", "▶ Play")}</button>
            <div className="mpl-tempo">
              <label htmlFor="mpl-tempo-m">Tempo</label>
              <input id="mpl-tempo-m" type="range" min="50" max="110" step="5" value={pct} onChange={e => setPct(+e.target.value)} />
              <div className="mpl-bpm">{bpm} <small>BPM · {pct} %</small></div>
            </div>
            <div className="mpl-toggles">
              <label><input type="checkbox" checked={metro} onChange={e => setMetro(e.target.checked)} /> {L("Métronome", "Metronome")}</label>
              <label><input type="checkbox" checked={band || !!cur.challenge} disabled={!!cur.challenge} onChange={e => setBand(e.target.checked)} /> {L("Band (batterie thrash)", "Band (thrash drums)")}</label>
            </div>
          </div>
        </section>
        <p className="mpl-note">{L("Dans la version finale : play-along Suno « 1986 thrash » pour chaque exercice, et validation automatique des notes par la carte de son ou le micro.", "In the final version: a “1986 thrash” Suno play-along for each exercise, and automatic note checking through the audio interface or mic.")}</p>
      </main>
    </div>
  </>;
}
