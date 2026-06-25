// /api/forge.js — Assemblage du prompt Suno côté serveur (la "recette" secrète).
// Le client envoie les sélections brutes, le serveur renvoie le prompt déjà calculé.
// Personne ne voit le mapping sliders→tags ni l'ordre/la logique dans le code client.

export default function handler(req, res) {
  let b = req.method === 'POST' ? req.body : (req.query || {});
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  const A = k => Array.isArray(b[k]) ? b[k] : [];

  const genres = A('genres'), drums = A('drums'), vocals = A('vocals'), guitar = A('guitar');
  const tuning = A('tuning'), mood = A('mood'), prod = A('prod'), globalRhythm = A('globalRhythm'), vrange = A('vrange');
  const extraInst = [...A('bassStyle'), ...A('bassTech'), ...A('bassTone'), ...A('bassTuning'), ...A('bassProd'), ...A('sax'), ...A('brass'), ...A('keys'), ...A('strings')];
  const allOrganic = A('org');
  const excl = b.excl || null;
  const allExclude = excl ? [...(excl.g || []), ...(excl.v || []), ...(excl.p || []), ...(excl.i || []), ...String(excl.c || '').split(',').map(s => s.trim()).filter(Boolean)] : [];
  const structs = A('structs');
  const blockRhythm = b.blockRhythm || {};
  const heavy = +b.heavy || 5, groove = +b.groove || 5, chaos = +b.chaos || 5, melody = +b.melody || 5;
  const bpm = Math.max(60, Math.min(280, +b.bpm || 180));
  const lang = b.lang || 'en';
  const L = (fr, en) => lang === 'fr' ? fr : en;

  const rFor = k => blockRhythm[k] ? `, ${blockRhythm[k]}` : "";
  const tempoWord = bpm >= 210 ? "blistering fast tempo" : bpm >= 170 ? "fast tempo" : bpm >= 120 ? "mid-tempo" : bpm >= 90 ? "slow groovy tempo" : "slow doom tempo";
  const dedup = arr => { const s = new Set(); return arr.filter(x => { const k = String(x).toLowerCase().trim(); if (!x || s.has(k)) return false; s.add(k); return true; }); };

  // ── sauce secrète : sliders → tags subtils, fondus dans le lot ──
  const sliderTags = [];
  if (heavy >= 8) sliderTags.push("bone-crushing low end"); else if (heavy <= 3) sliderTags.push("open and breathable mix");
  if (groove >= 7) sliderTags.push("deep pocket groove"); else if (groove <= 3) sliderTags.push("relentless forward drive");
  if (chaos >= 8) sliderTags.push("unhinged dissonance"); else if (chaos <= 2) sliderTags.push("locked-in and surgical");
  if (melody >= 7) sliderTags.push("soaring melodic lead"); else if (melody <= 2) sliderTags.push("no-frills brutality");
  const secret = sliderTags;

  const fullTags = dedup([...genres, `${bpm} BPM`, tempoWord, ...drums, ...guitar.slice(0, 3), ...tuning.slice(0, 1), ...vocals.slice(0, 3), ...vrange.slice(0, 2), ...mood.slice(0, 3), ...secret, ...prod.slice(0, 2), ...allOrganic.slice(0, 4), ...globalRhythm]);
  const compactCore = dedup([...genres.slice(0, 2), `${bpm} BPM`, tempoWord, ...secret, ...drums.slice(0, 2), ...guitar.slice(0, 1), ...vocals.slice(0, 1), ...mood.slice(0, 1)]);
  const overflow = fullTags.filter(x => !compactCore.includes(x));
  const styleStr = fullTags.join(", ");
  const styleStrC = compactCore.join(", ");

  // ── détecteur de conflits ──
  const lc = x => String(x).toLowerCase();
  const vTxt = vocals.map(lc).join(" ");
  const conf = [];
  if (/clean|melodic sing|clean sing/.test(vTxt) && /growl|scream|guttural|pig squeal|shriek|harsh/.test(vTxt)) conf.push(L("Voix claires + voix extrêmes ensemble — Suno peut hésiter.", "Clean + extreme vocals together — Suno may waver."));
  if (bpm < 110 && drums.some(d => /blast/.test(lc(d)))) conf.push(L("Blast beats avec un BPM bas — monte le tempo pour rester cohérent.", "Blast beats with a low BPM — raise the tempo to stay consistent."));
  if (allOrganic.some(o => /imperfect|loose|human|drift|drunk/.test(lc(o)))) conf.push(L("Tag organique de timing « lâche » actif — enlève-le si tu veux un BPM serré.", "Loose-timing organic tag active — remove it for a tight BPM."));
  if (genres.length > 2) conf.push(L(genres.length + " genres sélectionnés — garde 1-2 max, sinon Suno se mélange.", genres.length + " genres selected — keep 1-2 max or Suno gets confused."));
  if ((guitar.length + extraInst.length) > 4) conf.push(L("Beaucoup d'instruments — Suno gère mieux 3-4 max.", "Many instruments — Suno handles 3-4 best."));

  const excStr = allExclude.join(", ");

  const blockMapClean = {
    intro: `[Intro${rFor("intro")}]`, buildup: `[Build-up${rFor("buildup")}]`, verse: `[Verse${rFor("verse")}]`,
    prechorus: `[Pre-Chorus${rFor("prechorus")}]`, chorus: `[Chorus${rFor("chorus")}]`, breakdown: `[Breakdown${rFor("breakdown")}]`,
    halftime: `[Half-Time${rFor("halftime")}]`, blastsection: `[Blast Section${rFor("blastsection")}]`, drop: `[Drop${rFor("drop")}]`,
    solo: `[Guitar Solo${rFor("solo")}]`, interlude: `[Interlude${rFor("interlude")}]`, atmosphericbreak: `[Atmospheric Break${rFor("atmosphericbreak")}]`,
    spokenword: `[Spoken Word${rFor("spokenword")}]`, gangchant: `[Gang Chant${rFor("gangchant")}]`, scream: `[Scream Section${rFor("scream")}]`,
    riffbreak: `[Riff Break${rFor("riffbreak")}]`, bridge: `[Bridge${rFor("bridge")}]`, outro: `[Outro${rFor("outro")}]`,
  };
  const blockMapNotes = {
    intro: `Intro → ${drums.includes("blast beats") ? "blast beat fury" : "crushing riff"}${rFor("intro")}`,
    buildup: `Build-up → ${heavy >= 8 ? "murs de distortion" : "couches progressives"}, pas de voix${rFor("buildup")}`,
    verse: `Verse → ${vocals.includes("pig squeals") ? "pig squeal + " : ""}growls sur ${guitar.includes("chugging riffs") ? "chugging riffs" : "riffs lourds"}${rFor("verse")}`,
    prechorus: `Pre-Chorus → tension montante${rFor("prechorus")}`,
    chorus: `Chorus → ${groove >= 6 ? "riff groovy headbang" : "assaut total"}${rFor("chorus")}`,
    breakdown: `Breakdown → ${groove >= 7 ? "groove lent, gang shouts" : "mosh brutal"}${rFor("breakdown")}`,
    halftime: `Half-Time → ${bpm > 160 ? Math.round(bpm / 2) + " BPM" : bpm + " BPM"}, palm-mute lourd${rFor("halftime")}`,
    blastsection: `Blast Section → blast beats ${bpm} BPM${rFor("blastsection")}`,
    drop: `Drop → silence puis riff dévastateur${rFor("drop")}`,
    solo: `Guitar Solo → ${guitar.includes("sweep picking solos") ? "sweep shred" : "riff lead"}${rFor("solo")}`,
    interlude: `Interlude → instrumental${rFor("interlude")}`,
    atmosphericbreak: `Atmospheric Break → ${chaos >= 7 ? "dissonance" : "calme"}${rFor("atmosphericbreak")}`,
    spokenword: `Spoken Word → voix seule${rFor("spokenword")}`,
    gangchant: `Gang Chant → chant collectif${rFor("gangchant")}`,
    scream: `Scream Section → cri brut${rFor("scream")}`,
    riffbreak: `Riff Break → guitares seules${rFor("riffbreak")}`,
    bridge: `Bridge → ${chaos >= 7 ? "chaotique" : "atmosphérique"}${rFor("bridge")}`,
    outro: `Outro → ${chaos >= 7 ? "frenzy blast" : "breakdown final"}${rFor("outro")}`,
  };
  const blocksClean = structs.map(x => blockMapClean[x] || "").filter(Boolean);
  const structStr = [`[${bpm} BPM]`, ...blocksClean].join("\n");
  const overflowLine = overflow.length ? `[${overflow.join(", ")}]` : "";
  const structStrC = [`[${bpm} BPM]`, overflowLine, ...blocksClean].filter(Boolean).join("\n");
  const structNotesTxt = structs.map(x => blockMapNotes[x] || "").filter(Boolean).join("\n");

  const heavyD = heavy >= 8 ? "extremely heavy and crushing" : heavy >= 5 ? "heavy and punishing" : "moderately heavy";
  const grooveD = groove >= 8 ? "deeply groovy" : groove >= 5 ? "mid-paced groovy" : "straight aggressive";
  const chaosD = chaos >= 8 ? "chaotic and unpredictable" : chaos >= 5 ? "controlled chaos" : "tight and structured";
  const melodyD = melody >= 7 ? "rich melodic leads" : melody >= 4 ? "sparse melodic accents" : "pure brutality";
  const full = `=== STYLE TAGS (→ Style of Music) ===\n${styleStr}${excStr ? `\n\nEXCLUDE: ${excStr.split(", ").map(x => "-" + x).join(", ")}` : ""}

=== STRUCTURE (→ top of Lyrics) ===
${structStr}

=== PRODUCTION NOTES (keep for yourself) ===
${heavyD}. ${grooveD}. ${chaosD}. ${melodyD}. ${bpm} BPM.${allOrganic.length > 0 ? "\nOrganic: " + allOrganic.join(", ") : ""}`;

  return res.status(200).json({ styleStr, styleStrC, structStr, structStrC, structNotes: structNotesTxt, excludeStr: excStr, full, conflicts: conf });
}
