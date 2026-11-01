// ── Guitare metal MetalPrompt (2026-11-01) ──
// Corde pincée (Karplus-Strong) → ampli à 2 étages de gain → baffle 4x12 simulé, doublée gauche/droite.
// Remplace les dents de scie « électro ». Aucun sample, aucun CDN : marche en lecture ET dans l'export WAV.
const MPGtr = (() => {
  const cache = new Map();

  // Corde pincée. mute = palm mute (court, sourd, « chug »).
  function string(ctx, freq, mute, variant) {
    const sr = ctx.sampleRate;
    const key = sr + '|' + Math.round(freq * 10) + '|' + (mute ? 1 : 0) + '|' + variant;
    if (cache.has(key)) return cache.get(key);
    const len = mute ? 0.32 : 1.8;
    const N = Math.max(2, Math.round(sr / freq));
    const out = new Float32Array(Math.floor(len * sr));
    const ring = new Float32Array(N);
    // attaque du médiator : bruit filtré (plus sombre en palm mute)
    let lp = 0, seed = 12345 + variant * 7919 + Math.round(freq);
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1; };
    const bright = mute ? 0.35 : 0.7;
    for (let i = 0; i < N; i++) { lp += bright * (rnd() - lp); ring[i] = lp; }
    let mean = 0; for (let i = 0; i < N; i++) mean += ring[i]; mean /= N;
    for (let i = 0; i < N; i++) ring[i] -= mean;
    const damp = mute ? 0.93 : 0.9965;          // perte par période
    const w = mute ? 0.62 : 0.5;                // plus de filtrage = plus sourd
    let idx = 0, post = 0;
    for (let i = 0; i < out.length; i++) {
      const cur = ring[idx], nxt = ring[(idx + 1) % N];
      ring[idx] = damp * (w * cur + (1 - w) * nxt);
      post += (mute ? 0.25 : 0.9) * (cur - post);   // palm mute : la paume coupe les aigus
      out[i] = post;
      idx = (idx + 1) % N;
    }
    // petite rampe d'entrée/sortie (pas de clic)
    const fi = Math.min(64, out.length), fo = Math.min(Math.floor(0.02 * sr), out.length);
    for (let i = 0; i < fi; i++) out[i] *= i / fi;
    for (let i = 0; i < fo; i++) out[out.length - 1 - i] *= i / fo;
    const buf = ctx.createBuffer(1, out.length, sr);
    buf.copyToChannel(out, 0);
    cache.set(key, buf);
    return buf;
  }

  function shaper(ctx, drive, asym) {
    const n = 2048, c = new Float32Array(n);
    const off = asym ? 0.12 : 0, norm = Math.tanh(drive * (1 + off)) - Math.tanh(drive * off);
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1) * 2 - 1;
      c[i] = (Math.tanh(drive * (x + off)) - Math.tanh(drive * off)) / norm;
    }
    const s = ctx.createWaveShaper(); s.curve = c; s.oversample = '4x'; return s;
  }
  function bq(ctx, type, f, q, g) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; if (g != null) b.gain.value = g; return b; }

  // Un ampli + baffle. dist = 10..100 (curseur Distorsion).
  function amp(ctx, out, pan, dist) {
    const d = Math.max(0.1, Math.min(1, (dist || 80) / 100));
    const nodes = [
      ctx.createGain(),
      bq(ctx, 'highpass', 120, 0.7),            // serre le bas avant le gain (pas de bouette)
      bq(ctx, 'peaking', 760, 0.9, 7),          // boost « tube screamer »
      shaper(ctx, 6 + 22 * d, true),            // étage 1 (lampes, asymétrique)
      bq(ctx, 'highpass', 80, 0.7),
      bq(ctx, 'lowpass', 7000, 0.7),
      shaper(ctx, 2 + 5 * d, false),            // étage 2
      // ── baffle 4x12 + micro ──
      bq(ctx, 'highpass', 75, 0.8),
      bq(ctx, 'peaking', 115, 1.0, 4),          // thump du baffle
      bq(ctx, 'peaking', 480, 1.0, -5),         // creux des mids metal
      bq(ctx, 'peaking', 2400, 1.2, 4),         // mordant
      bq(ctx, 'lowpass', 5200, 0.9),            // le haut-parleur coupe le fizz
      bq(ctx, 'lowpass', 6500, 0.6),
    ];
    nodes[0].gain.value = 2.2;
    const og = ctx.createGain(); og.gain.value = 0.16;
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
    nodes[nodes.length - 1].connect(og);
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; og.connect(p); p.connect(out); }
    else og.connect(out);
    return { input: nodes[0], output: og };
  }

  // Deux prises doublées gauche/droite, comme en studio.
  function rig(ctx, out, dist) {
    return { L: amp(ctx, out, -0.7, dist), R: amp(ctx, out, 0.7, dist) };
  }
  function dispose(r) { if (!r) return; [r.L, r.R].forEach(a => { try { a.output.disconnect(); } catch (e) {} }); }

  // Power chord (fondamentale + quinte, octave en jeu ouvert) sur les deux prises.
  function play(ctx, r, rootHz, t, dur, mute) {
    const v = Math.random() < 0.5 ? 0 : 1;
    const notes = [[rootHz, 1], [rootHz * 1.4983, 0.8]];
    if (!mute) notes.push([rootHz * 2, 0.45]);
    const len = mute ? Math.min(dur, 0.3) : dur;
    [[r.L, 0, 1], [r.R, 0.008, 1.0025]].forEach(([a, dt, rate], side) => {
      notes.forEach(([f, g]) => {
        const s = ctx.createBufferSource();
        s.buffer = string(ctx, f, mute, (v + side) % 2);
        s.playbackRate.value = rate;
        const gn = ctx.createGain();
        const t0 = t + dt, vel = g * (0.85 + Math.random() * 0.15);
        gn.gain.setValueAtTime(vel, t0);
        gn.gain.setValueAtTime(vel, t0 + Math.max(0.02, len - 0.03));
        gn.gain.linearRampToValueAtTime(0.0001, t0 + len);
        s.connect(gn); gn.connect(a.input);
        s.start(t0); s.stop(t0 + len + 0.05);
      });
    });
  }

  return { rig, dispose, play, string };
})();
window.MPGtr = MPGtr;
