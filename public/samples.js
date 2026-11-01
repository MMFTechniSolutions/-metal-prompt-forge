// ── Kit de sons MetalPrompt (2026-11-01) ──
// Lit public/samples/manifest.json (liste des fichiers) et décode les sons une seule fois.
// Pièces : kick, snare, hihat, ohat, crash (batterie) · gtrmute, gtropen (guitare).
// Pas de manifest / fichiers absents → MPDrums et MPGtr gardent la synthèse (rien ne casse).
const MPSamples = (() => {
  const S = { ready: false, kit: {} };
  const decCtx = () => new OfflineAudioContext(1, 1, 44100);

  // enlève le silence du début (les sons générés commencent souvent en retard)
  function trim(buf) {
    const d = buf.getChannelData(0); let pk = 0; for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i]));
    const th = pk * 0.06; let st = 0; while (st < d.length && Math.abs(d[st]) < th) st++;
    st = Math.max(0, st - Math.floor(buf.sampleRate * 0.002));
    if (st < 32) return buf;
    const len = buf.length - st, out = new AudioBuffer({ length: len, numberOfChannels: buf.numberOfChannels, sampleRate: buf.sampleRate });
    for (let c = 0; c < buf.numberOfChannels; c++) out.copyToChannel(buf.getChannelData(c).subarray(st), c);
    return out;
  }
  // fondamentale (autocorrélation, 45-220 Hz) — pour transposer la guitare à la bonne note
  function pitch(buf) {
    const d = buf.getChannelData(0), sr = buf.sampleRate, st = Math.floor(sr * 0.03), N = Math.min(8192, d.length - st);
    if (N < 2048) return 0;
    let best = 0, bestLag = 0;
    for (let lag = Math.floor(sr / 220); lag <= Math.floor(sr / 45); lag++) {
      let s = 0; for (let i = 0; i < N - lag; i++) s += d[st + i] * d[st + i + lag];
      if (s > best) { best = s; bestLag = lag; }
    }
    return bestLag ? sr / bestLag : 0;
  }

  async function load(base) {
    base = base || 'samples/';
    try {
      const r = await fetch(base + 'manifest.json', { cache: 'no-cache' });
      if (!r.ok) return S;
      const man = await r.json();   // { "kick": ["kick-1.mp3", …], "gtrmute": [{"file":"gtr-mute-1.mp3","hz":61.7}, …] }
      const ctx = decCtx();
      for (const [piece, files] of Object.entries(man)) {
        const list = [];
        for (const f of files) {
          const file = typeof f === 'string' ? f : f.file;
          try {
            const ab = await (await fetch(base + file)).arrayBuffer();
            const buf = trim(await ctx.decodeAudioData(ab));
            const hz = (typeof f === 'object' && f.hz) || (piece.startsWith('gtr') ? pitch(buf) : 0);
            list.push({ buf, hz });
          } catch (e) { /* fichier illisible : on saute */ }
        }
        if (list.length) S.kit[piece] = list;
      }
      S.ready = Object.keys(S.kit).length > 0;
    } catch (e) { /* pas de kit : synthèse */ }
    return S;
  }
  S.load = load;
  S.has = p => !!(S.kit[p] && S.kit[p].length);
  S.pick = p => { const a = S.kit[p]; return a[Math.floor(Math.random() * a.length)]; };
  return S;
})();
window.MPSamples = MPSamples;
MPSamples.promise = MPSamples.load();
