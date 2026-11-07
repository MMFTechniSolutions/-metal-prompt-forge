// scripts/render-bank-preview.mjs — Aperçu audio rapide d'entrées de la banque (synthé maison, pas le vrai son)
// Usage : node scripts/render-bank-preview.mjs outDir id1 id2 ...
import fs from 'node:fs';
import path from 'node:path';

const [outDir, ...ids] = process.argv.slice(2);
const bank = JSON.parse(fs.readFileSync(path.resolve('bank/bank.json'), 'utf8'));
const SR = 44100;
const hz = p => 440 * 2 ** ((p - 69) / 12);

function render(e, loops = 2) {
  const step = 60 / e.bpm / 4, L = e.mesures.reduce((a, b) => a + b, 0);
  const N = Math.ceil(L * step * loops * SR) + SR;
  const g = new Float32Array(N), m = new Float32Array(N), d = new Float32Array(N);
  const add = (buf, t0, dur, fn) => { const s = Math.floor(t0 * SR), n = Math.floor(dur * SR); for (let i = 0; i < n && s + i < N; i++) buf[s + i] += fn(i / SR, i / n); };
  const saw = (f, t) => 2 * ((t * f) % 1) - 1;
  for (let lp = 0; lp < loops; lp++) {
    const o = lp * L * step;
    for (const n of e.guitar) for (const off of [0, 7, 12]) { const f = hz(n.p + off) * (1 + (Math.random() - .5) * .004); add(g, o + n.t * step, n.d * step * .95, (t, x) => saw(f, t) * Math.exp(-x * 2.5) * .35); }
    for (const n of e.bass) { const f = hz(n.p); add(g, o + n.t * step, n.d * step, (t, x) => Math.sin(2 * Math.PI * f * t) * .5 * (1 - x * .5)); }
    for (const n of e.melody) { const f = hz(n.p); add(m, o + n.t * step, n.d * step * .98, (t, x) => (saw(f, t) * .6 + Math.sin(2 * Math.PI * f * t) * .4) * Math.min(1, x * 20) * (1 - x * .3) * .22); }
    e.drums.kick.forEach((v, i) => v && add(d, o + i * step, .12, (t, x) => Math.sin(2 * Math.PI * (55 + 120 * Math.exp(-t * 40)) * t) * (1 - x) * .9));
    e.drums.snare.forEach((v, i) => v && add(d, o + i * step, .14, (t, x) => ((Math.random() * 2 - 1) * .7 + Math.sin(2 * Math.PI * 190 * t) * .3) * Math.exp(-x * 4) * .6));
    e.drums.hihat.forEach((v, i) => v && add(d, o + i * step, .03, (t, x) => (Math.random() * 2 - 1) * (1 - x) * .18));
  }
  const out = new Int16Array(N);
  for (let i = 0; i < N; i++) { const gd = Math.tanh(g[i] * 4) * .45; const s = Math.tanh((gd + m[i] + d[i]) * 1.1) * .9; out[i] = s * 32767; }
  return out;
}
function wav(pcm) {
  const h = Buffer.alloc(44); const len = pcm.length * 2;
  h.write('RIFF', 0); h.writeUInt32LE(36 + len, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(len, 40);
  return Buffer.concat([h, Buffer.from(pcm.buffer)]);
}
fs.mkdirSync(outDir, { recursive: true });
for (const id of ids) {
  const e = bank.find(x => x.id === id); if (!e) { console.log('absent', id); continue; }
  fs.writeFileSync(path.join(outDir, id + '.wav'), wav(render(e)));
  console.log(id, e.bpm + ' BPM', e.accordage);
}
