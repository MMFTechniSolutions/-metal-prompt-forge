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

  // ── Vraie guitare DI (Karoryfer Emilyguitar, CC0) : une note aux tierces mineures, 2 forces, 3 variantes ──
  const DI = { ready: false, notes: [], ir: null };
  const DI_NOTES = { db2: 37, e2: 40, gb2: 42, a2: 45, c3: 48, eb3: 51, gb3: 54, a3: 57, c4: 60, eb4: 63 };
  function trimLead(buf) {   // le MP3 ajoute un petit silence au début
    const d = buf.getChannelData(0); let pk = 0; for (let i = 0; i < Math.min(d.length, 20000); i++) pk = Math.max(pk, Math.abs(d[i]));
    let st = 0; while (st < d.length && Math.abs(d[st]) < pk * 0.05) st++; st = Math.max(0, st - 40);
    if (st < 16) return buf;
    const o = new AudioBuffer({ length: buf.length - st, numberOfChannels: 1, sampleRate: buf.sampleRate }); o.copyToChannel(d.subarray(st), 0); return o;
  }
  async function loadDI(base) {
    base = base || 'samples/guitar/';
    const ctx = new OfflineAudioContext(1, 1, 44100), list = [];
    await Promise.all(Object.entries(DI_NOTES).map(async ([n, m]) => {
      const e = { midi: m, f: [], mf: [] };
      for (const v of ['f', 'mf']) for (const r of [1, 2, 3]) {
        try { const res = await fetch(base + n + '_' + v + '_' + r + '.mp3'); if (!res.ok) continue; e[v].push(trimLead(await ctx.decodeAudioData(await res.arrayBuffer()))); } catch (x) {}
      }
      if (e.f.length || e.mf.length) list.push(e);
    }));
    list.sort((a, b) => a.midi - b.midi); DI.notes = list; DI.ready = list.length > 0;
    try { const r = await fetch(base + '../cab.wav'); if (r.ok) DI.ir = await ctx.decodeAudioData(await r.arrayBuffer()); } catch (x) {}   // IR de baffle optionnel (samples/cab.wav)
    return DI;
  }
  function diNote(midi) { let best = null; for (const e of DI.notes) if (!best || Math.abs(e.midi - midi) < Math.abs(best.midi - midi)) best = e; return best; }

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
    ];
    if (DI.ir) { const cv = ctx.createConvolver(); cv.buffer = DI.ir; nodes.push(cv, bq(ctx, 'highpass', 70, 0.7)); }   // vrai baffle (IR)
    else nodes.push(
      // ── baffle 4x12 + micro (simulé) ──
      bq(ctx, 'highpass', 75, 0.8),
      bq(ctx, 'peaking', 115, 1.0, 4),          // thump du baffle
      bq(ctx, 'peaking', 480, 1.0, -5),         // creux des mids metal
      bq(ctx, 'peaking', 2400, 1.2, 4),         // mordant
      bq(ctx, 'lowpass', 5200, 0.9),            // le haut-parleur coupe le fizz
      bq(ctx, 'lowpass', 6500, 0.6));
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
    // kit enregistré (public/samples : gtrmute / gtropen) : transposé à la bonne note, sans ré-ampli (le son est déjà distorsionné)
    const piece = mute ? 'gtrmute' : 'gtropen';
    if (window.MPSamples && MPSamples.has(piece)) {
      const len = mute ? Math.min(dur, 0.35) : dur;
      [[r.L, 0, 1], [r.R, 0.008, 1.0025]].forEach(([a, dt, det]) => {
        const smp = MPSamples.pick(piece), s = ctx.createBufferSource();
        s.buffer = smp.buf;
        s.playbackRate.value = (smp.hz ? rootHz / smp.hz : 1) * det;
        const gn = ctx.createGain(), t0 = t + dt, vel = 0.85 + Math.random() * 0.15;
        gn.gain.setValueAtTime(vel * 4.5, t0);
        gn.gain.setValueAtTime(vel * 4.5, t0 + Math.max(0.02, len - 0.03));
        gn.gain.linearRampToValueAtTime(0.0001, t0 + len);
        s.connect(gn); gn.connect(a.output);
        s.start(t0); s.stop(t0 + len + 0.05);
      });
      return;
    }
    if (DI.ready) {   // vraie guitare DI → ampli → baffle
      const len = mute ? Math.min(dur, 0.17) : dur;
      const notes = [[rootHz, 1], [rootHz * 1.4983, 0.85]]; if (!mute) notes.push([rootHz * 2, 0.5]);
      [[r.L, 0], [r.R, 0.009]].forEach(([a, dt], side) => {
        const dest = mute ? (() => { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.connect(a.input); return lp; })() : a.input;   // palm mute : la paume étouffe
        notes.forEach(([f, g]) => {
          const midi = 69 + 12 * Math.log2(f / 440), e = diNote(midi); if (!e) return;
          const arr = (mute ? e.mf : e.f).length ? (mute ? e.mf : e.f) : (e.f.length ? e.f : e.mf);
          const s = ctx.createBufferSource(); s.buffer = arr[(Math.floor(Math.random() * arr.length) + side) % arr.length];
          s.playbackRate.value = Math.pow(2, (midi - e.midi) / 12) * (side ? 1.002 : 1);
          const gn = ctx.createGain(), t0 = t + dt, vel = g * (0.85 + Math.random() * 0.15) * 1.6;
          gn.gain.setValueAtTime(vel, t0); gn.gain.setValueAtTime(vel, t0 + Math.max(0.02, len - 0.03)); gn.gain.linearRampToValueAtTime(0.0001, t0 + len);
          s.connect(gn); gn.connect(dest); s.start(t0); s.stop(t0 + len + 0.05);
        });
      });
      return;
    }
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

  return { rig, dispose, play, string, loadDI, DI };
})();
window.MPGtr = MPGtr;
MPGtr.diPromise = MPGtr.loadDI();
