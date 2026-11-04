// Galerie → Radio MetalPrompt (nov. 2026)
// Une radio qui enchaîne les chansons soumises par la communauté, avec le palmarès de la semaine.
// · Lecture continue avec le lecteur officiel de Suno (iframe embed, autoplay) : Suno bloque la lecture directe
//   de ses fichiers audio depuis d'autres sites. La durée vient de /api/profile?suno= pour enchaîner tout seul.
//   Modes Palmarès / Aléatoire / par genre.
// · Palmarès : votes des 7 derniers jours (RPC gallery_chart) avec flèches ▲▼ vs la semaine d'avant.
//   Si la fonction n'existe pas encore en base, repli sur le total de votes (likes).
// · Écoutes comptées après 30 s (RPC gallery_play), ignorées si la fonction n'existe pas.
// · Votes, soumission (2/mois, revue) : mêmes règles qu'avant.
import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "./supabase.js";

const CSS = `
.mpr{--bg:#0C0D0F;--panel:#15171B;--panel2:#1C1F24;--line:#2A2E35;--fg:#F2F1ED;--muted:#8A8F97;--ember:#FF6A2B;--ember2:#FFB36B;--ok:#5FD08A;
  --mono:"Geist Mono",ui-monospace,Menlo,monospace;color:var(--fg);font-family:"Geist",system-ui,sans-serif;line-height:1.5;
  max-width:1100px;margin:0 auto;padding:20px 16px 80px;display:flex;flex-direction:column;gap:18px}
.mpr *{box-sizing:border-box}.mpr button{font:inherit}
.mpr button:focus-visible,.mpr input:focus-visible,.mpr select:focus-visible{outline:2px solid var(--ember2);outline-offset:2px}
.mpr-head{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px 18px}
.mpr-head h2{margin:0;font-weight:800;font-size:clamp(26px,4vw,38px);letter-spacing:-.02em;line-height:1}
.mpr-head h2 span{color:var(--ember)}
.mpr-head p{margin:0;color:var(--muted);font-size:14px;flex:1 1 280px}
.mpr-onair{display:inline-flex;align-items:center;gap:6px;font:600 11px var(--mono);letter-spacing:.12em;color:var(--ember);border:1px solid #5a2a14;border-radius:999px;padding:4px 10px}
.mpr-onair i{width:8px;height:8px;border-radius:50%;background:var(--ember)}
.mpr-onair.live i{animation:mprp 1.2s ease-in-out infinite}
@keyframes mprp{50%{opacity:.25}}
@media (prefers-reduced-motion:reduce){.mpr-onair.live i{animation:none}}
.mpr-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:18px;align-items:start}
@media (max-width:880px){.mpr-grid{grid-template-columns:1fr}}
.mpr-card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:16px}
.mpr-now{display:flex;flex-direction:column;gap:14px}
.mpr-nowtop{display:flex;gap:16px;align-items:center;min-width:0}
.mpr-cover{width:132px;height:132px;flex-shrink:0;border-radius:12px;object-fit:cover;background:var(--panel2);border:1px solid var(--line)}
@media (max-width:480px){.mpr-cover{width:96px;height:96px}}
.mpr-meta{min-width:0;display:flex;flex-direction:column;gap:4px}
.mpr-eyebrow{font:600 11px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ember2)}
.mpr-title{font-weight:800;font-size:clamp(20px,3vw,28px);line-height:1.1;letter-spacing:-.01em;overflow-wrap:anywhere}
.mpr-artist{color:var(--muted);font-size:14px}
.mpr-frame{width:100%;height:170px;border:0;border-radius:12px;background:var(--panel2)}
.mpr-bar{height:6px;border-radius:9px;background:var(--panel2);overflow:hidden;cursor:pointer}.mpr-bar i{display:block;height:100%;background:var(--ember)}
.mpr-time{display:flex;justify-content:space-between;font:12px var(--mono);color:var(--muted);margin-top:4px}
.mpr-ctrl{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.mpr-btn{border:1px solid var(--line);background:transparent;color:var(--fg);border-radius:11px;padding:9px 13px;cursor:pointer;font-size:15px}
.mpr-btn:hover{border-color:var(--muted)}
.mpr-play{border:0;background:var(--ember);color:var(--bg);border-radius:999px;width:54px;height:54px;font-size:20px;cursor:pointer}
.mpr-vote{margin-left:auto;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--panel2);color:var(--fg);border-radius:999px;padding:8px 14px;cursor:pointer;font-weight:600}
.mpr-vote[aria-pressed="true"]{background:var(--ember);border-color:var(--ember);color:var(--bg)}
.mpr-modes{display:flex;flex-wrap:wrap;gap:6px}
.mpr-pill{font-size:13px;color:var(--muted);background:transparent;border:1px solid var(--line);border-radius:999px;padding:5px 12px;cursor:pointer}
.mpr-pill[aria-pressed="true"]{border-color:var(--ember);color:var(--fg)}
.mpr-next{font-size:13px;color:var(--muted)}.mpr-next b{color:var(--fg);font-weight:600}
.mpr-msg{font-size:13px;color:var(--ember2)}
.mpr-chart h3,.mpr-all h3{margin:0 0 10px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600}
.mpr-chart ol,.mpr-all ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.mpr-row{width:100%;display:grid;grid-template-columns:34px 36px 44px minmax(0,1fr) auto;align-items:center;gap:10px;padding:7px 8px;border-radius:10px;background:none;border:0;color:var(--fg);text-align:left;cursor:pointer}
.mpr-row:hover{background:var(--panel2)}
.mpr-row[aria-current="true"]{background:var(--panel2);outline:1px solid var(--ember)}
.mpr-rank{font:800 20px var(--mono);text-align:center;font-variant-numeric:tabular-nums}
.mpr-row:nth-child(-n+3) .mpr-rank{color:var(--ember)}
.mpr-mv{font:600 11px var(--mono);text-align:center}.mpr-mv.up{color:var(--ok)}.mpr-mv.down{color:#E5484D}.mpr-mv.new{color:var(--ember2)}.mpr-mv.same{color:var(--muted)}
.mpr-thumb{width:44px;height:44px;border-radius:8px;object-fit:cover;background:var(--panel2)}
.mpr-rt{min-width:0}.mpr-rt b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mpr-rt span{display:block;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mpr-num{font:12px var(--mono);color:var(--muted);text-align:right;white-space:nowrap}
.mpr-num b{display:block;color:var(--fg);font-size:14px}
.mpr-all .mpr-row{grid-template-columns:44px minmax(0,1fr) auto}
.mpr-ext{font-size:12px;color:var(--ember2);text-decoration:none;border:1px solid #5a2a14;border-radius:8px;padding:4px 8px}
.mpr-empty{color:var(--muted);font-size:14px;text-align:center;padding:24px 8px}
.mpr-cta{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.mpr-primary{border:0;background:var(--ember);color:var(--bg);font-weight:700;border-radius:10px;padding:10px 16px;cursor:pointer}
.mpr-link{color:#8b9bff;font-size:13px;font-weight:600;text-decoration:none}
.mpr-form{display:flex;flex-direction:column;gap:9px}
.mpr-form input,.mpr-form select{background:var(--bg);border:1px solid var(--line);border-radius:8px;color:var(--fg);font:inherit;font-size:14px;padding:10px 12px;width:100%}
.mpr-small{font-size:12px;color:var(--muted);margin:0}
`;

const GENRES = ["Deathcore", "Metalcore", "Djent", "Death Metal", "Black Metal", "Thrash", "Groove", "Doom", "Melodic Death", "Blackgaze", "Power Metal", "Nu-Metal", "Grunge", "Autre"];
const fmt = s => (!isFinite(s) ? "0:00" : Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0"));
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

export default function GalleryRadio({ user, onRequestAuth, uiLang = "fr", discordUrl }) {
  const L = (fr, en) => (uiLang === "fr" ? fr : en);
  const [items, setItems] = useState([]);
  const [chart, setChart] = useState(null);          // { id: {week, prev} } ou null si la fonction n'existe pas
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("chart");          // chart | shuffle | genre:<g>
  const [queue, setQueue] = useState([]);
  const [qi, setQi] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0), [dur, setDur] = useState(0);
  const [voted, setVoted] = useState(() => new Set());
  const [todayVote, setTodayVote] = useState(null);
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", artist: "", genre: "Deathcore", url: "" });
  const [formMsg, setFormMsg] = useState("");
  const counted = useRef(new Set()), durs = useRef({}), tick = useRef(null), startAt = useRef(0);
  const [frameKey, setFrameKey] = useState(0);
  const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });

  // chansons + palmarès
  useEffect(() => {
    let on = true;
    supabase.from("gallery").select("*").eq("status", "approved").order("likes", { ascending: false }).order("created_at", { ascending: false })
      .then(({ data }) => { if (on) { setItems(data || []); setLoading(false); } }, () => { if (on) setLoading(false); });
    supabase.rpc("gallery_chart", { p_days: 7 }).then(({ data, error }) => {
      if (!on || error || !data) return;
      const m = {}; data.forEach(r => { m[r.gallery_id] = { week: Number(r.votes_week) || 0, prev: Number(r.votes_prev) || 0 }; }); setChart(m);
    }, () => {});
    return () => { on = false; };
  }, []);
  // mes votes
  useEffect(() => {
    let on = true;
    if (!user) { setVoted(new Set()); setTodayVote(null); return; }
    supabase.from("gallery_votes").select("gallery_id,vote_day").then(({ data }) => {
      if (!on) return; const rows = data || [];
      setVoted(new Set(rows.map(v => v.gallery_id))); const t = rows.find(v => v.vote_day === today()); setTodayVote(t ? t.gallery_id : null);
    });
    return () => { on = false; };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // palmarès classé : votes de la semaine (ou total si pas de fonction), puis écoutes, puis date
  const ranked = useMemo(() => {
    const score = it => (chart ? (chart[it.id]?.week || 0) : (it.likes || 0));
    const rows = items.map(it => ({ it, score: score(it) })).sort((a, b) => b.score - a.score || (b.it.plays || 0) - (a.it.plays || 0) || new Date(b.it.created_at) - new Date(a.it.created_at));
    let prevRank = null;
    if (chart) {                                         // rang de la semaine d'avant pour les flèches
      const pr = items.map(it => ({ id: it.id, s: chart[it.id]?.prev || 0 })).sort((a, b) => b.s - a.s);
      prevRank = {}; pr.forEach((r, i) => { prevRank[r.id] = r.s > 0 ? i + 1 : null; });
    }
    return rows.map((r, i) => {
      let mv = "same", mvTxt = "=";
      if (prevRank) { const p = prevRank[r.it.id]; if (!r.score) { mv = "same"; mvTxt = "–"; } else if (p == null) { mv = "new"; mvTxt = L("NEW", "NEW"); } else if (p > i + 1) { mv = "up"; mvTxt = "▲" + (p - i - 1); } else if (p < i + 1) { mv = "down"; mvTxt = "▼" + (i + 1 - p); } }
      return { ...r, rank: i + 1, mv, mvTxt };
    });
  }, [items, chart]); // eslint-disable-line react-hooks/exhaustive-deps

  const sunoId = it => ((it.url || "").match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) || [])[0] || null;
  const playable = useMemo(() => ranked.filter(r => sunoId(r.it)).map(r => r.it), [ranked]);
  const genres = useMemo(() => [...new Set(playable.map(i => i.genre).filter(Boolean))], [playable]);

  // file d'attente selon le mode
  function buildQueue(m, startId) {
    let q = m === "chart" ? playable : m === "shuffle" ? shuffle(playable) : playable.filter(i => "genre:" + i.genre === m);
    if (startId) { const k = q.findIndex(i => i.id === startId); if (k > 0) q = [...q.slice(k), ...q.slice(0, k)]; }
    return q;
  }
  useEffect(() => { if (!queue.length && playable.length) setQueue(buildQueue(mode)); }, [playable]); // eslint-disable-line react-hooks/exhaustive-deps

  const cur = queue[qi] || null, nxt = queue.length > 1 ? queue[(qi + 1) % queue.length] : null;

  // lecteur : iframe Suno (autoplay) + minuterie sur la durée pour passer à la suivante
  async function durationOf(it) {
    if (durs.current[it.id] != null) return durs.current[it.id];
    try { const r = await fetch("/api/profile?suno=" + encodeURIComponent(it.url)); const j = await r.json(); durs.current[it.id] = j.duration || 0; } catch { durs.current[it.id] = 0; }
    return durs.current[it.id];
  }
  useEffect(() => {
    clearInterval(tick.current); setPos(0); setDur(0);
    if (!playing || !cur) return;
    let alive = true; startAt.current = Date.now();
    durationOf(cur).then(d => { if (alive) setDur(d || 0); });
    tick.current = setInterval(() => {
      const t = (Date.now() - startAt.current) / 1000; setPos(t);
      if (t > 30 && !counted.current.has(cur.id)) {           // une écoute = 30 s, une fois par session
        counted.current.add(cur.id);
        supabase.rpc("gallery_play", { gid: cur.id }).then(({ error }) => { if (!error) setItems(xs => xs.map(x => (x.id === cur.id ? { ...x, plays: (x.plays || 0) + 1 } : x))); }, () => {});
      }
      const d = durs.current[cur.id];
      if (d && t > d + 2) next();                               // fin de la chanson → la suivante
    }, 500);
    return () => { alive = false; clearInterval(tick.current); };
  }, [playing, cur && cur.id, frameKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = () => { if (queue.length) setQi(i => (i + 1) % queue.length); };
  const prev = () => { if (pos > 4) { setFrameKey(k => k + 1); return; } if (queue.length) setQi(i => (i - 1 + queue.length) % queue.length); };
  function pickMode(m) { setMode(m); const q = buildQueue(m, m === "chart" ? null : cur && cur.id); setQueue(q); setQi(0); }
  function playItem(id) { const q = buildQueue(mode, id); if (!q.length || q[0].id !== id) { const all = buildQueue("chart", id); setMode("chart"); setQueue(all); } else setQueue(q); setQi(0); setPlaying(true); }

  // votes (mêmes règles : 1 par jour, 1 par chanson)
  const bump = (id, d) => { setItems(xs => xs.map(x => (x.id === id ? { ...x, likes: Math.max(0, (x.likes || 0) + d) } : x))); setChart(c => (c ? { ...c, [id]: { ...(c[id] || { prev: 0 }), week: Math.max(0, ((c[id] || {}).week || 0) + d) } } : c)); };
  async function toggleVote(id) {
    if (!user) { onRequestAuth && onRequestAuth(); return; }
    setMsg("");
    if (voted.has(id)) {
      if (todayVote !== id) { setMsg(L("T'as déjà voté pour celle-là. Un vote par chanson. 🤘", "You already voted for this one. One vote per track. 🤘")); return; }
      setVoted(v => { const n = new Set(v); n.delete(id); return n; }); setTodayVote(null); bump(id, -1);
      const { error } = await supabase.from("gallery_votes").delete().eq("gallery_id", id).eq("user_id", user.id);
      if (error) { setVoted(v => new Set(v).add(id)); setTodayVote(id); bump(id, 1); }
      return;
    }
    if (todayVote) { setMsg(L("Ton vote du jour est déjà donné. Reviens demain! 🤘", "Today's vote is used. Come back tomorrow! 🤘")); return; }
    setVoted(v => new Set(v).add(id)); setTodayVote(id); bump(id, 1);
    const { error } = await supabase.from("gallery_votes").insert({ gallery_id: id, user_id: user.id });
    if (error) {
      setVoted(v => { const n = new Set(v); n.delete(id); return n; }); setTodayVote(null); bump(id, -1);
      setMsg(error.code === "23505" ? L("Ton vote du jour est déjà donné. Reviens demain! 🤘", "Today's vote already used. Come back tomorrow! 🤘") : L("Erreur — réessaie.", "Error — try again."));
    }
  }

  // soumission (inchangée)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function submit() {
    if (!user) { onRequestAuth && onRequestAuth(); return; }
    if (!form.title.trim() || !form.url.trim()) { setFormMsg(L("Titre et lien requis.", "Title and link required.")); return; }
    setFormMsg(L("Envoi…", "Sending…"));
    let url = form.url.trim(), audio_url = null, image_url = null;
    if (/suno\.(com|ai)/i.test(url)) {
      try { const r = await fetch("/api/profile?suno=" + encodeURIComponent(url)); if (r.ok) { const j = await r.json(); url = j.url || url; audio_url = j.audio || null; image_url = j.image || null; } } catch { /* lien gardé tel quel */ }
    }
    const { error } = await supabase.from("gallery").insert({ title: form.title.trim(), artist: form.artist.trim() || (user.email ? user.email.split("@")[0] : "anon"), genre: form.genre, url, audio_url, image_url, status: "pending" });
    if (error) {
      if (error.code === "42501") { setFormMsg(L("Limite atteinte : 2 chansons par membre par mois. 🤘", "Limit reached: 2 tracks per member per month. 🤘")); return; }
      if (error.code === "23505") { setFormMsg(L("Cette chanson a déjà été soumise.", "This track was already submitted.")); return; }
      if (error.code === "23514") { setFormMsg(L("Lien refusé : Suno, Spotify, YouTube ou SoundCloud seulement.", "Link refused: Suno, Spotify, YouTube or SoundCloud only.")); return; }
      setFormMsg(L("Erreur — réessaie.", "Error — try again.")); return;
    }
    setFormMsg(L("Merci! Ta chanson sera revue, puis elle passera à la radio. 🤘", "Thanks! Your track will be reviewed, then it goes on the radio. 🤘"));
    setForm({ title: "", artist: "", genre: "Deathcore", url: "" });
  }

  const top = ranked.slice(0, 10);
  const curRank = cur ? ranked.find(r => r.it.id === cur.id) : null;

  return (
    <div className="mpr">
      <style>{CSS}</style>
      <div className="mpr-head">
        <div>
          <span className={"mpr-onair" + (playing ? " live" : "")}><i />{playing ? L("EN ONDES", "ON AIR") : L("RADIO", "RADIO")}</span>
          <h2 style={{ marginTop: 8 }}>Radio <span>MetalPrompt</span></h2>
        </div>
        <p>{L("Les chansons de la communauté, en continu. Vote pour ta préférée du jour : le palmarès se refait chaque semaine.", "Community tracks, non-stop. Vote for your favorite of the day: the chart resets every week.")}</p>
      </div>

      <div className="mpr-grid">
        <section className="mpr-card mpr-now" aria-label={L("En ondes", "Now playing")}>
          {loading ? <div className="mpr-empty">{L("Chargement…", "Loading…")}</div>
            : !cur ? <div className="mpr-empty">{L("Aucune chanson à la radio pour l'instant. Soumets la tienne!", "No tracks on the radio yet. Submit yours!")}</div>
            : <>
              <div className="mpr-nowtop">
                {cur.image_url ? <img className="mpr-cover" src={cur.image_url} alt="" /> : <div className="mpr-cover" />}
                <div className="mpr-meta">
                  <div className="mpr-eyebrow">{curRank ? "#" + curRank.rank + L(" au palmarès", " on the chart") : ""}{cur.genre ? " · " + cur.genre : ""}</div>
                  <div className="mpr-title">{cur.title}</div>
                  <div className="mpr-artist">{cur.artist}</div>
                  <a className="mpr-link" href={cur.url} target="_blank" rel="noopener noreferrer">{L("Voir sur Suno ↗", "View on Suno ↗")}</a>
                </div>
              </div>
              {playing && <iframe key={cur.id + ":" + frameKey} className="mpr-frame" title={cur.title} src={`https://suno.com/embed/${sunoId(cur)}?autoplay=1`} allow="autoplay; encrypted-media" />}
              {!playing && <div className="mpr-small">{L("Appuie sur ▶ pour lancer la radio. Les chansons s'enchaînent toutes seules.", "Press ▶ to start the radio. Songs play one after another.")}</div>}
              {playing && dur > 0 && <div>
                <div className="mpr-bar" role="progressbar" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(pos)}><i style={{ width: Math.min(100, pos / dur * 100) + "%" }} /></div>
                <div className="mpr-time"><span>{fmt(pos)}</span><span>{L("suivante dans ", "next in ")}{fmt(Math.max(0, dur - pos))}</span></div>
              </div>}
              <div className="mpr-ctrl">
                <button className="mpr-btn" onClick={prev} aria-label={L("Précédente", "Previous")}>⏮</button>
                <button className="mpr-play" onClick={() => setPlaying(p => !p)} aria-label={playing ? L("Arrêter", "Stop") : L("Jouer", "Play")}>{playing ? "■" : "▶"}</button>
                <button className="mpr-btn" onClick={next} aria-label={L("Suivante", "Next")}>⏭</button>
                <button className="mpr-vote" aria-pressed={voted.has(cur.id)} onClick={() => toggleVote(cur.id)}>🤘 {voted.has(cur.id) ? L("Voté", "Voted") : L("Voter", "Vote")}</button>
              </div>
              {msg && <div className="mpr-msg" role="status">{msg}</div>}
              <div className="mpr-modes" role="group" aria-label={L("Mode de la radio", "Radio mode")}>
                <button className="mpr-pill" aria-pressed={mode === "chart"} onClick={() => pickMode("chart")}>{L("Palmarès", "Chart")}</button>
                <button className="mpr-pill" aria-pressed={mode === "shuffle"} onClick={() => pickMode("shuffle")}>{L("Aléatoire", "Shuffle")}</button>
                {genres.map(g => <button key={g} className="mpr-pill" aria-pressed={mode === "genre:" + g} onClick={() => pickMode("genre:" + g)}>{g}</button>)}
              </div>
              {nxt && <div className="mpr-next">{L("Prochaine : ", "Up next: ")}<b>{nxt.title}</b> · {nxt.artist}</div>}
            </>}
        </section>

        <section className="mpr-card mpr-chart" aria-label={L("Palmarès", "Chart")}>
          <h3>{chart ? L("Palmarès de la semaine", "This week's chart") : L("Palmarès", "Chart")}</h3>
          {top.length === 0 ? <div className="mpr-empty">{L("Le palmarès se remplit avec vos votes.", "The chart fills up with your votes.")}</div> :
            <ol>{top.map(r => <li key={r.it.id}>
              <button className="mpr-row" aria-current={cur && cur.id === r.it.id} onClick={() => (sunoId(r.it) ? playItem(r.it.id) : window.open(r.it.url, "_blank", "noopener"))}>
                <span className="mpr-rank">{r.rank}</span>
                <span className={"mpr-mv " + r.mv}>{chart ? r.mvTxt : ""}</span>
                {r.it.image_url ? <img className="mpr-thumb" src={r.it.image_url} alt="" loading="lazy" /> : <span className="mpr-thumb" />}
                <span className="mpr-rt"><b>{r.it.title}</b><span>{r.it.artist}{r.it.genre ? " · " + r.it.genre : ""}</span></span>
                <span className="mpr-num"><b>{r.score} 🤘</b>{r.it.plays ? r.it.plays + L(" écoutes", " plays") : ""}</span>
              </button></li>)}</ol>}
          <p className="mpr-small" style={{ marginTop: 10 }}>{L("1 vote par jour · 1 vote par chanson. Le palmarès compte les votes des 7 derniers jours.", "1 vote per day · 1 vote per track. The chart counts the last 7 days of votes.")}</p>
        </section>
      </div>

      <section className="mpr-card mpr-all" aria-label={L("Toutes les chansons", "All tracks")}>
        <h3>{L("Toutes les chansons", "All tracks")} · {items.length}</h3>
        {items.length === 0 && !loading ? <div className="mpr-empty">{L("Sois le premier à soumettre ta chanson.", "Be the first to submit your track.")}</div> :
          <ul>{items.map(it => <li key={it.id}>
            {sunoId(it)
              ? <button className="mpr-row" aria-current={cur && cur.id === it.id} onClick={() => playItem(it.id)}>
                  {it.image_url ? <img className="mpr-thumb" src={it.image_url} alt="" loading="lazy" /> : <span className="mpr-thumb" />}
                  <span className="mpr-rt"><b>{it.title}</b><span>{it.artist}{it.genre ? " · " + it.genre : ""}</span></span>
                  <span className="mpr-num">▶</span>
                </button>
              : <div className="mpr-row" style={{ cursor: "default" }}>
                  {it.image_url ? <img className="mpr-thumb" src={it.image_url} alt="" loading="lazy" /> : <span className="mpr-thumb" />}
                  <span className="mpr-rt"><b>{it.title}</b><span>{it.artist}{it.genre ? " · " + it.genre : ""}</span></span>
                  <a className="mpr-ext" href={it.url} target="_blank" rel="noopener noreferrer">{L("Écouter ↗", "Listen ↗")}</a>
                </div>}
          </li>)}</ul>}
      </section>

      <section className="mpr-card">
        <div className="mpr-cta">
          <button className="mpr-primary" onClick={() => setShowForm(v => !v)}>{showForm ? L("Fermer", "Close") : L("Passer ma chanson à la radio", "Get my track on the radio")}</button>
          {discordUrl && <a className="mpr-link" href={discordUrl} target="_blank" rel="noopener noreferrer">{L("Rejoins la communauté sur Discord →", "Join the community on Discord →")}</a>}
        </div>
        {showForm && <div className="mpr-form" style={{ marginTop: 12 }}>
          <p className="mpr-small">{L("Gratuit avec un compte · 2 chansons par mois · revue avant de passer en ondes. Un lien Suno passe directement à la radio. Spotify, YouTube et SoundCloud apparaissent dans la liste.", "Free with an account · 2 tracks per month · reviewed before going on air. A Suno link plays on the radio. Spotify, YouTube and SoundCloud show in the list.")}</p>
          <input placeholder={L("Titre de la chanson", "Track title")} value={form.title} onChange={e => setF("title", e.target.value)} />
          <input placeholder={L("Nom d'artiste (optionnel)", "Artist name (optional)")} value={form.artist} onChange={e => setF("artist", e.target.value)} />
          <select value={form.genre} onChange={e => setF("genre", e.target.value)}>{GENRES.map(g => <option key={g} value={g}>{g}</option>)}</select>
          <input placeholder="https://suno.com/song/…" value={form.url} onChange={e => setF("url", e.target.value)} />
          <button className="mpr-primary" onClick={submit}>{L("Envoyer", "Send")}</button>
          {formMsg && <div className="mpr-small" style={{ color: "var(--ok)" }} role="status">{formMsg}</div>}
        </div>}
      </section>
    </div>
  );
}
