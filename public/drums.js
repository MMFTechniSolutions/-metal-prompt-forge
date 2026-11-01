// ── Batterie MetalPrompt, version « moins machine » (2026-11-01) ──
// Sons de batterie synthétisés plus réalistes, 4 variantes par pièce (jamais deux frappes identiques),
// dynamique humaine (accents, notes fantômes), micro-décalages, crash aux débuts de sections, et une vraie pièce (réverbe de room).
const MPDrums = (() => {
  const kits = new Map();
  const RR = 4;   // variantes par pièce (round-robin)

  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 * 2 - 1; }; }
  const env = (t, tau) => Math.exp(-t / tau);

  function kick(sr, v) {
    const r = rng(101 + v * 31), len = Math.ceil(0.42 * sr), a = new Float32Array(len);
    const f0 = 150 + v * 6, f1 = 52 + v, tauP = 0.032 + v * 0.002;
    let ph = 0, bl = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr, f = f1 + (f0 - f1) * env(t, tauP);
      ph += 2 * Math.PI * f / sr;
      const body = Math.sin(ph) * env(t, 0.17 + v * 0.01);
      const n = r(); bl += 0.35 * (n - bl);                 // batte : bruit filtré, très court
      const beater = (n - bl) * env(t, 0.0035) * 0.9;
      const knock = Math.sin(2 * Math.PI * 2800 * t) * env(t, 0.004) * 0.25;
      a[i] = Math.tanh((body * 1.1 + beater + knock) * 1.8);
    }
    return a;
  }
  function snare(sr, v) {
    const r = rng(202 + v * 53), len = Math.ceil(0.32 * sr), a = new Float32Array(len);
    let p1 = 0, lp = 0;
    const fA = 185 + v * 4, fB = 330 + v * 6;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const pe = 1 + 0.25 * env(t, 0.01);                     // la peau monte puis redescend
      const shell = (Math.sin(2 * Math.PI * fA * pe * t) + 0.6 * Math.sin(2 * Math.PI * fB * pe * t)) * env(t, 0.055);
      const n = r(); const hp = n - p1; p1 = n; lp += 0.55 * (hp - lp);
      const wires = lp * (env(t, 0.11 + v * 0.01) * 0.9 + 0.1 * env(t, 0.22));   // timbre qui « grésille »
      const crack = r() * env(t, 0.003) * 0.8;
      a[i] = Math.tanh((shell * 0.55 + wires * 1.05 + crack) * 1.4);
    }
    return a;
  }
  // cymbales : 6 carrés à rapports inharmoniques (méthode des vraies boîtes à rythmes, en mieux) + bruit
  function metal(sr, len, tau, v, bright, noiseAmt, seed) {
    const r = rng(seed + v * 97), N = Math.ceil(len * sr), a = new Float32Array(N);
    const base = 330 + v * 9, ratios = [1, 1.342, 1.2312, 1.6532, 1.9523, 2.1523];
    let p1 = 0, p2 = 0;
    for (let i = 0; i < N; i++) {
      const t = i / sr;
      let m = 0; for (const k of ratios) m += Math.sign(Math.sin(2 * Math.PI * base * k * t + k));
      const n = r();
      let x = m / 6 * (1 - noiseAmt) + n * noiseAmt;
      const h1 = x - p1; p1 = x; const h2 = h1 - p2; p2 = h1;   // passe-haut 2 fois → brillant
      a[i] = (bright ? h2 : h1) * env(t, tau) * (t < 0.002 ? t / 0.002 : 1);
    }
    return a;
  }
  function norm(a, g) { let m = 0; for (const x of a) m = Math.max(m, Math.abs(x)); if (m) for (let i = 0; i < a.length; i++) a[i] *= g / m; return a; }

  function kit(ctx) {
    const sr = ctx.sampleRate;
    if (kits.has(ctx)) return kits.get(ctx);
    const mk = arr => { const b = ctx.createBuffer(1, arr.length, sr); b.copyToChannel(arr, 0); return b; };
    const k = { kick: [], snare: [], hihat: [], ohat: [], crash: [], last: {} };
    for (let v = 0; v < RR; v++) {
      k.kick.push(mk(norm(kick(sr, v), 0.95)));
      k.snare.push(mk(norm(snare(sr, v), 0.92)));
      k.hihat.push(mk(norm(metal(sr, 0.08, 0.016 + v * 0.002, v, true, 0.45, 303), 0.55)));
      k.ohat.push(mk(norm(metal(sr, 0.5, 0.16, v, true, 0.5, 404), 0.5)));
    }
    for (let v = 0; v < 2; v++) k.crash.push(mk(norm(metal(sr, 2.2, 0.75, v + 5, false, 0.7, 505), 0.6)));
    kits.set(ctx, k);
    return k;
  }

  // Réponse impulsionnelle d'une petite pièce (room) générée
  function roomIR(ctx) {
    const sr = ctx.sampleRate, len = Math.ceil(0.7 * sr), b = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c), r = rng(900 + c * 17); let lp = 0;
      for (let i = 0; i < len; i++) { const t = i / sr; lp += 0.3 * (r() - lp); d[i] = lp * env(t, 0.16) * (t < 0.006 ? 0 : 1); }
    }
    return b;
  }
  // Bus batterie : compresseur doux + room. Retourne le nœud d'entrée.
  function bus(ctx, out) {
    const input = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.006; comp.release.value = 0.12; comp.knee.value = 8;
    const dry = ctx.createGain(); dry.gain.value = 0.9;
    const conv = ctx.createConvolver(); conv.buffer = roomIR(ctx);
    const wet = ctx.createGain(); wet.gain.value = 0.28;
    const lo = ctx.createBiquadFilter(); lo.type = 'highpass'; lo.frequency.value = 200;   // pas de boue dans la room
    input.connect(comp); comp.connect(dry); dry.connect(out);
    comp.connect(lo); lo.connect(conv); conv.connect(wet); wet.connect(out);
    return input;
  }

  // Dynamique humaine selon la position dans la mesure (16es)
  function vel(name, step) {
    const pos = step % 4, jit = 1 + (Math.random() * 2 - 1) * 0.08;
    if (name === 'hihat') return (pos === 0 ? 0.95 : pos === 2 ? 0.72 : 0.5) * jit;
    if (name === 'kick') return (pos === 0 ? 1 : 0.85) * jit;
    if (name === 'snare') return (pos === 0 ? 1 : 0.78) * jit;
    return jit;
  }
  const PAN = { kick: 0, snare: 0.05, hihat: -0.35, ohat: -0.35, crash: 0.45 };
  function hit(ctx, k, input, name, t, v) {
    // 1) vrai kit enregistré (AVL Black Pearl, 5 niveaux de force) : la force de frappe choisit l'échantillon
    const rec = REC[name];
    let arr, i;
    if (rec && rec.length) {
      arr = rec;
      const n = rec.length, base = Math.max(0, Math.min(n - 1, Math.round(Math.min(1, v) * (n - 1))));
      i = Math.max(0, Math.min(n - 1, base + (Math.random() < 0.35 ? (Math.random() < 0.5 ? -1 : 1) : 0)));   // ±1 niveau au hasard = jamais deux coups identiques
      v = Math.min(1, v) * 0.6 + 0.4;                                                                     // le niveau de l'échantillon porte déjà la dynamique
    } else {
    // 2) kit ElevenLabs (MPSamples) ou 3) synthèse
    const smp = window.MPSamples && MPSamples.has(name) ? MPSamples.kit[name].map(x => x.buf) : null;
    arr = smp || k[name]; if (!arr || !arr.length) return;
    i = Math.floor(Math.random() * arr.length);
    if (arr.length > 1 && i === k.last[name]) i = (i + 1) % arr.length;   // jamais deux fois la même variante de suite
    k.last[name] = i;
    }
    const tj = t + (name === 'hihat' ? (Math.random() - 0.5) * 0.008 : (Math.random() - 0.5) * 0.005);   // micro-décalage humain
    const s = ctx.createBufferSource(); s.buffer = arr[i];
    s.playbackRate.value = 1 + (Math.random() - 0.5) * 0.02;
    const g = ctx.createGain(); g.gain.value = v;
    s.connect(g);
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = PAN[name] || 0; g.connect(p); p.connect(input); }
    else g.connect(input);
    s.start(Math.max(0, tj));
  }
  // Une case du séquenceur : a = arrangement, step = index absolu, bars = longueurs des mesures
  function playStep(ctx, k, input, a, step, t, gain) {
    gain = gain || 1;
    const L = a.L || a.kick.length, s = step % L;
    // début de mesure ? (crash au début de la séquence et toutes les 4 mesures, si la grosse caisse frappe)
    let barStart = false, barIdx = 0;
    if (a.bars && a.bars.length) { let acc = 0; for (let b = 0; b < a.bars.length; b++) { if (acc === s) { barStart = true; barIdx = b; break; } acc += a.bars[b]; if (acc > s) break; } }
    else { barStart = s % 16 === 0; barIdx = Math.floor(s / 16); }
    const crash = barStart && barIdx % 4 === 0 && a.kick[s];
    if (crash) hit(ctx, k, input, 'crash', t, 0.75 * gain);
    if (a.kick[s]) hit(ctx, k, input, 'kick', t, vel('kick', s) * gain);
    if (a.snare[s]) hit(ctx, k, input, 'snare', t, vel('snare', s) * 0.95 * gain);
    else if (!a.kick[s] && s % 4 === 3 && a.snare[(s + 1) % L] && Math.random() < 0.18) hit(ctx, k, input, 'snare', t, 0.16 * gain);   // note fantôme avant le backbeat
    if (a.hihat[s] && !crash) {
      const open = s % 8 === 6 && !a.hihat[(s + 1) % L] && Math.random() < 0.5;   // charleston ouvert de temps en temps
      hit(ctx, k, input, open ? 'ohat' : 'hihat', t, vel('hihat', s) * 0.8 * gain);
    }
  }

  // ── Vrai kit (public/samples/drums/{pièce}-{1..5}.mp3, du plus doux au plus fort) ──
  const REC = {};
  function trimLead(buf) {   // retire le petit silence ajouté par l'encodage MP3 (sinon le drum traîne)
    const d = buf.getChannelData(0); let pk = 0; for (let i = 0; i < Math.min(d.length, 8000); i++) pk = Math.max(pk, Math.abs(d[i]));
    let st = 0; while (st < d.length && Math.abs(d[st]) < pk * 0.04) st++; st = Math.max(0, st - 20);
    if (st < 16) return buf;
    const o = new AudioBuffer({ length: buf.length - st, numberOfChannels: 1, sampleRate: buf.sampleRate }); o.copyToChannel(d.subarray(st), 0); return o;
  }
  async function loadRec(base) {
    base = base || 'samples/drums/';
    const ctx = new OfflineAudioContext(1, 1, 44100);
    await Promise.all(['kick', 'snare', 'hihat', 'ohat', 'crash', 'china', 'tom', 'floortom'].map(async p => {
      const layers = [];
      for (let v = 1; v <= 5; v++) { try { const r = await fetch(base + p + '-' + v + '.mp3'); if (r.ok) layers.push(trimLead(await ctx.decodeAudioData(await r.arrayBuffer()))); } catch (e) {} }
      if (layers.length) REC[p] = layers;
    }));
    return REC;
  }
  return { kit, bus, hit, playStep, loadRec, REC };
})();
window.MPDrums = MPDrums;
MPDrums.recPromise = MPDrums.loadRec();
