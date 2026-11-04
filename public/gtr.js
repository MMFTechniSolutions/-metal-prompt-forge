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
  const DI_NOTES = { db2: 37, e2: 40, gb2: 42, a2: 45, c3: 48, eb3: 51, gb3: 54, a3: 57, c4: 60, eb4: 63, gb4: 66, a4: 69, c5: 72, eb5: 75, gb5: 78, a5: 81, c6: 84, d6: 86 };
  const _loaded = new Set();
  function trimLead(buf) {   // le MP3 ajoute un petit silence au début
    const d = buf.getChannelData(0); let pk = 0; for (let i = 0; i < Math.min(d.length, 20000); i++) pk = Math.max(pk, Math.abs(d[i]));
    let st = 0; while (st < d.length && Math.abs(d[st]) < pk * 0.05) st++; st = Math.max(0, st - 40);
    if (st < 16) return buf;
    const o = new AudioBuffer({ length: buf.length - st, numberOfChannels: 1, sampleRate: buf.sampleRate }); o.copyToChannel(d.subarray(st), 0); return o;
  }
  // maxMidi : le Riff (rythmique) n'a besoin que des notes graves (≤ Eb4) ; la Mélodie charge tout le manche
  async function loadDI(base, maxMidi) {
    base = base || 'samples/guitar/'; maxMidi = maxMidi || 63;
    const ctx = new OfflineAudioContext(1, 1, 44100), list = DI.notes.slice();
    await Promise.all(Object.entries(DI_NOTES).filter(([n, m]) => m <= maxMidi && !_loaded.has(n)).map(async ([n, m]) => {
      _loaded.add(n);
      const e = { midi: m, f: [], mf: [] };
      for (const v of ['f', 'mf']) for (const r of [1, 2, 3]) {
        try { const res = await fetch(base + n + '_' + v + '_' + r + '.mp3'); if (!res.ok) continue; e[v].push(trimLead(await ctx.decodeAudioData(await res.arrayBuffer()))); } catch (x) {}
      }
      if (e.f.length || e.mf.length) list.push(e);
    }));
    list.sort((a, b) => a.midi - b.midi); DI.notes = list; DI.ready = list.length > 0;
    if (!DI.ir && !DI._irTried) try { DI._irTried = true; const r = await fetch(base + '../cab.wav'); if (r.ok) DI.ir = await ctx.decodeAudioData(await r.arrayBuffer()); } catch (x) {}   // IR de baffle optionnel (samples/cab.wav)
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
    // nov. 2026 : moins de gain (le « fuzz » venait de 2 étages trop poussés), coupe des aigus AVANT la saturation
    // (moins de grésillement généré) et baffle plus sombre (un vrai 4x12 coupe vers 4-5 kHz).
    const d = Math.max(0.1, Math.min(1, (dist || 80) / 100));
    const nodes = [
      ctx.createGain(),
      bq(ctx, 'highpass', 110, 0.7),            // serre le bas avant le gain (pas de bouette)
      bq(ctx, 'peaking', 800, 0.8, 6),          // boost « tube screamer »
      bq(ctx, 'lowpass', 4500, 0.7),            // pas d'aigus dans la saturation = pas de fizz
      shaper(ctx, 3 + 11 * d, true),            // étage 1 (lampes, asymétrique)
      bq(ctx, 'highpass', 80, 0.7),
      bq(ctx, 'lowpass', 5500, 0.7),
      shaper(ctx, 1.2 + 1.8 * d, false),        // étage 2, léger
    ];
    if (DI.ir) { const cv = ctx.createConvolver(); cv.buffer = DI.ir; nodes.push(cv, bq(ctx, 'highpass', 70, 0.7)); }   // vrai baffle (IR)
    else nodes.push(
      // ── baffle 4x12 + micro (simulé) ──
      bq(ctx, 'highpass', 80, 0.8),
      bq(ctx, 'peaking', 110, 1.0, 3),          // thump du baffle
      bq(ctx, 'peaking', 420, 1.0, -4),         // creux des mids metal
      bq(ctx, 'peaking', 1800, 1.0, 3),         // mordant, plus bas = moins agressif
      bq(ctx, 'highshelf', 3500, null, -7),     // le haut-parleur tombe après 3,5 kHz
      bq(ctx, 'lowpass', 4300, 0.8),
      bq(ctx, 'lowpass', 5000, 0.6));
    nodes[0].gain.value = 2.0;
    const og = ctx.createGain(); og.gain.value = 0.22;
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
      const notes = [[rootHz, 1], [rootHz * 1.4983, 0.75]]; if (!mute) notes.push([rootHz * 2, 0.3]);   // moins de notes empilées = moins d'intermodulation (fizz)
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

  // ── Note de mélodie (page Mélodie) : vraie guitare DI, en son metal (ampli) ou clair ──
  const _leadRigs = new WeakMap();
  function leadRig(ctx, dest, mode) {
    let m = _leadRigs.get(dest); if (!m) { m = {}; _leadRigs.set(dest, m); }
    if (m[mode]) return m[mode];
    let input;
    if (mode === 'metal') input = amp(ctx, dest, 0, 70).input;   // un seul ampli, au centre, gain un peu moins fort pour que la ligne chante
    else { const lp = bq(ctx, 'lowpass', 6500, 0.7), hp = bq(ctx, 'highpass', 90, 0.7), g = ctx.createGain(); g.gain.value = 0.9; hp.connect(lp); lp.connect(g); g.connect(dest); input = hp; }
    return (m[mode] = input);
  }
  function lead(ctx, dest, midi, t, dur, mode, prevMidi) {
    const e = diNote(midi); if (!e) return false;
    const arr = e.f.length ? e.f : e.mf;
    const s = ctx.createBufferSource(); s.buffer = arr[Math.floor(Math.random() * arr.length)];
    const rate = Math.pow(2, (midi - e.midi) / 12);
    if (prevMidi != null && prevMidi !== midi) {   // glissé (phrasé « Filant »)
      s.playbackRate.setValueAtTime(rate * Math.pow(2, (prevMidi - midi) / 12), t);
      s.playbackRate.linearRampToValueAtTime(rate, t + Math.min(dur * 0.4, 0.12));
    } else s.playbackRate.value = rate;
    const g = ctx.createGain(), len = Math.min(dur * 1.05, 2.3), vol = mode === 'metal' ? 1.4 : 1.1;
    g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(vol, t + Math.max(0.02, len - 0.05)); g.gain.linearRampToValueAtTime(0.0001, t + len);
    s.connect(g); g.connect(leadRig(ctx, dest, mode)); s.start(t); s.stop(t + len + 0.05);
    return true;
  }
  return { rig, dispose, play, string, loadDI, DI, lead };
})();
window.MPGtr = MPGtr;
MPGtr.diPromise = MPGtr.loadDI();
