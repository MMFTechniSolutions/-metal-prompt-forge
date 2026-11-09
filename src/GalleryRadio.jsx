// Galerie → Radio MetalPrompt (nov. 2026) — une vraie radio : on ne zappe pas, les chansons s'enchaînent.
// Une radio qui enchaîne les chansons soumises par la communauté, avec le palmarès de la semaine.
// · EN DIRECT 24/7 (nov. 2026) : tout le monde entend la même chanson au même moment. La grille est calculée
//   à partir de l'heure du serveur (src/radioSchedule.js) : chansons mélangées avec une graine fixe, annonces
//   MetalPrompt (genre « Annonce ») entre les blocs, émissions par genre selon la table radio_grille.
// · Lecteur officiel de Suno (iframe embed, autoplay) : Suno bloque la lecture directe de ses fichiers et
//   l'embed ne peut pas sauter dans la chanson. Si t'arrives en plein milieu, la chanson part du début et
//   coupe quand la suivante commence pour tout le monde → synchro dès la 2e chanson.
// · Durée de chaque chanson dans gallery.duration (remplie au besoin via /api/profile + RPC gallery_set_duration).
// · Palmarès : votes des 7 derniers jours (RPC gallery_chart) avec flèches ▲▼ vs la semaine d'avant.
//   Si la fonction n'existe pas encore en base, repli sur le total de votes (likes).
// · Écoutes comptées après 30 s (RPC gallery_play), ignorées si la fonction n'existe pas.
// · Votes, soumission (2/mois, revue) : mêmes règles qu'avant.
import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "./supabase.js";
import { onAir, isJingle, isHosted, XF, setBulletinConfig, torontoMs } from "./radioSchedule.js";

const CSS = `
.mpr{--bg:#0C0D0F;--panel:#15171B;--panel2:#1C1F24;--line:#2A2E35;--fg:#F2F1ED;--muted:#8A8F97;--ember:#FF6A2B;--ember2:#FFB36B;--ok:#5FD08A;
  --mono:"Geist Mono",ui-monospace,Menlo,monospace;color:var(--fg);font-family:"Geist",system-ui,sans-serif;line-height:1.5;
  max-width:1100px;margin:0 auto;padding:20px 16px 80px;display:flex;flex-direction:column;gap:18px}
.mpr *{box-sizing:border-box}.mpr button{font:inherit}
.mpr button:focus-visible,.mpr input:focus-visible,.mpr select:focus-visible{outline:2px solid var(--ember2);outline-offset:2px}
.mpr-head{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px 18px}
.mpr-head h2{margin:0;font-weight:800;font-size:clamp(26px,4vw,38px);letter-spacing:-.02em;line-height:1}
.mpr-head h2 span{color:var(--ember)}
.mpr-beta{font:700 11px var(--mono);font-style:normal;letter-spacing:.12em;color:var(--bg);background:var(--ember2);border-radius:6px;padding:3px 7px;vertical-align:middle;position:relative;top:-4px}
.mpr-betanote{font-size:12px;color:var(--ember2);margin:0;flex-basis:100%}
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
.mpr-pip{padding:10px 12px;gap:8px;max-width:none}
.mpr-pip .mpr-piprow{display:flex;align-items:center;gap:10px;min-width:0}
.mpr-pip .mpr-cover{width:56px;height:56px}
.mpr-pip .mpr-meta{flex:1;gap:1px}
.mpr-pip .mpr-title{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mpr-pip .mpr-artist{font-size:12px}
.mpr-pip .mpr-onair{padding:2px 7px;font-size:9px;align-self:flex-start}
.mpr-pip .mpr-play{width:42px;height:42px;font-size:16px;flex-shrink:0}
.mpr-pip .mpr-viz{height:44px;padding:6px 8px 4px}
.mpr-pip .mpr-next{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mpr-steps{margin:0;padding-left:20px;font-size:13px;line-height:1.5;color:var(--fg);display:flex;flex-direction:column;gap:4px}
.mpr-steps li::marker{color:var(--ember);font-weight:700}
.mpr-check{display:flex;gap:10px;align-items:flex-start;font-size:12px;line-height:1.45;color:var(--muted);cursor:pointer;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:10px 12px}
.mpr-check input{width:18px;height:18px;flex-shrink:0;margin-top:1px;accent-color:var(--ember)}
.mpr-ta{background:var(--bg);border:1px solid var(--line);border-radius:8px;color:var(--fg);font:inherit;font-size:14px;padding:10px 12px;width:100%;resize:vertical}

/* lecteur Suno caché : le son joue, l'animation prend sa place */
.mpr-hidden-frame{position:fixed;left:0;bottom:0;width:2px;height:2px;border:0;opacity:0.01;pointer-events:none;z-index:-1}
.mpr-viz{height:110px;border-radius:12px;background:radial-gradient(120% 90% at 50% 100%,#2a1208 0%,var(--panel2) 60%);display:flex;align-items:flex-end;justify-content:center;gap:4px;padding:14px 12px 10px;overflow:hidden}
.mpr-viz i{flex:1 1 0;max-width:12px;min-width:3px;height:12%;border-radius:3px 3px 1px 1px;background:linear-gradient(to top,var(--ember),var(--ember2));opacity:.35;transform-origin:bottom}
.mpr-viz.on i{opacity:1;animation:mprbar var(--d,0.9s) ease-in-out infinite alternate;animation-delay:var(--dl,0s)}
@keyframes mprbar{0%{height:10%}35%{height:var(--h1,70%)}70%{height:var(--h2,35%)}100%{height:var(--h3,90%)}}
.mpr-cover.on{box-shadow:0 0 0 2px var(--ember),0 0 28px -4px var(--ember);animation:mprglow 2.4s ease-in-out infinite}
@keyframes mprglow{50%{box-shadow:0 0 0 2px var(--ember2),0 0 40px 0 var(--ember)}}
.mpr-mini{position:fixed;right:16px;bottom:16px;z-index:60;display:flex;align-items:center;gap:10px;max-width:min(420px,calc(100vw - 32px));background:#15171B;border:1px solid #5a2a14;border-radius:14px;padding:8px 10px;box-shadow:0 10px 30px rgba(0,0,0,.5);color:#F2F1ED;font-family:"Geist",system-ui,sans-serif}
.mpr-mini img,.mpr-mini .ph{width:40px;height:40px;border-radius:8px;object-fit:cover;background:#1C1F24;flex-shrink:0}
.mpr-mini .t{min-width:0;flex:1;cursor:pointer;background:none;border:0;color:inherit;text-align:left;padding:0}
.mpr-mini .t small{display:block;font:600 10px "Geist Mono",monospace;letter-spacing:.1em;color:#FF6A2B}
.mpr-mini .t b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mpr-mini .mini-viz{display:flex;align-items:flex-end;gap:2px;height:18px}
.mpr-mini .mini-viz i{width:3px;height:30%;background:#FF6A2B;border-radius:2px;animation:mprbar .8s ease-in-out infinite alternate}
.mpr-mini .mini-viz i:nth-child(2){animation-delay:-.3s}.mpr-mini .mini-viz i:nth-child(3){animation-delay:-.55s}
.mpr-mini button.x{border:0;background:#FF6A2B;color:#0C0D0F;border-radius:999px;width:32px;height:32px;cursor:pointer;flex-shrink:0}
@media (prefers-reduced-motion:reduce){.mpr-viz.on i,.mpr-cover.on,.mpr-mini .mini-viz i{animation:none}.mpr-viz.on i{height:var(--h1,60%)}}
`;

const GENRES = ["Deathcore", "Metalcore", "Djent", "Death Metal", "Black Metal", "Thrash", "Groove", "Doom", "Melodic Death", "Blackgaze", "Power Metal", "Nu-Metal", "Grunge", "Autre"];
const fmt = s => (!isFinite(s) ? "0:00" : Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0"));

// barres de l'animation : hauteurs et vitesses fixes (pas de hasard à chaque rendu)
const BARS = Array.from({ length: 28 }, (_, i) => { const r = k => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1; return { "--h1": 35 + r(1) * 60 + "%", "--h2": 15 + r(2) * 45 + "%", "--h3": 45 + r(3) * 55 + "%", "--d": 0.55 + r(4) * 0.7 + "s", "--dl": -r(5) + "s" }; });

export default function GalleryRadio({ user, onRequestAuth, uiLang = "fr", discordUrl, visible = true, onOpen }) {
  const L = (fr, en) => (uiLang === "fr" ? fr : en);
  setBulletinConfig({ lang: uiLang === "en" ? "en" : "fr", base: (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "") });
  // Bulletin météo + bonne nouvelle : demande au serveur de le préparer un peu avant (7 h, 12 h, 17 h, heure de Montréal)
  useEffect(() => {
    const lang = uiLang === "en" ? "en" : "fr";
    const tick = () => {
      const now = Date.now();
      const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(now).split("-").map(Number);
      for (const h of []) {   // bulletin éteint (voir radioSchedule.js)
        const at = torontoMs(p[0], p[1], p[2], h);
        if (now > at - 15 * 60e3 && now < at + 60 * 60e3) {
          const key = `${p[0]}-${String(p[1]).padStart(2, "0")}-${String(p[2]).padStart(2, "0")}-${String(h).padStart(2, "0")}`;
          const k = "mpr-bulletin-" + key + "-" + lang;
          try { if (sessionStorage.getItem(k)) continue; sessionStorage.setItem(k, "1"); } catch { /* rien */ }
          fetch(`/api/profile?op=bulletin&slot=${key}&lang=${lang}`).catch(() => {});
        }
      }
    };
    tick(); const t = setInterval(tick, 60e3); return () => clearInterval(t);
  }, [uiLang]);
  const [items, setItems] = useState([]);
  const [chart, setChart] = useState(null);          // { id: {week, prev} } ou null si la fonction n'existe pas
  const [loading, setLoading] = useState(true);
  const [grille, setGrille] = useState([]);
  const [playing, setPlaying] = useState(false);       // l'auditeur a appuyé sur ▶ (le navigateur l'exige pour le son)
  const [now, setNow] = useState(Date.now());
  const [joinedLate, setJoinedLate] = useState(false);
  const clockOff = useRef(0);                           // écart horloge locale → serveur
  const [voted, setVoted] = useState(() => new Set());
  const [todayVote, setTodayVote] = useState(null);
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", artist: "", genre: "Deathcore", url: "" });
  const [formMsg, setFormMsg] = useState("");
  const [okSong, setOkSong] = useState(false);                       // disclaimer soumission
  const [showAd, setShowAd] = useState(false);
  const [ad, setAd] = useState({ nom: "", entreprise: "", courriel: "", message: "" });
  const [okAd, setOkAd] = useState(false), [adMsg, setAdMsg] = useState(""), [adSent, setAdSent] = useState(false);
  const counted = useRef(new Set()), listenStart = useRef(0), healing = useRef(new Set());
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
    supabase.from("radio_grille").select("*").eq("actif", true).then(({ data, error }) => { if (on && !error && data) setGrille(data); }, () => {});
    const t0 = Date.now();
    supabase.rpc("radio_now").then(({ data, error }) => { if (on && !error && data) clockOff.current = Number(data) - (t0 + Date.now()) / 2; }, () => {});
    return () => { on = false; };
  }, []);
  // horloge de la radio (serveur) — tic chaque seconde
  useEffect(() => { const t = setInterval(() => setNow(Date.now() + clockOff.current), 1000); return () => clearInterval(t); }, []);
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

  const songsOnly = useMemo(() => items.filter(it => !isJingle(it)), [items]);
  // palmarès classé : votes de la semaine (ou total si pas de fonction), puis écoutes, puis date
  const ranked = useMemo(() => {
    const score = it => (chart ? (chart[it.id]?.week || 0) : (it.likes || 0));
    const rows = songsOnly.map(it => ({ it, score: score(it) })).sort((a, b) => b.score - a.score || (b.it.plays || 0) - (a.it.plays || 0) || new Date(b.it.created_at) - new Date(a.it.created_at));
    let prevRank = null;
    if (chart) {                                         // rang de la semaine d'avant pour les flèches
      const pr = songsOnly.map(it => ({ id: it.id, s: chart[it.id]?.prev || 0 })).sort((a, b) => b.s - a.s);
      prevRank = {}; pr.forEach((r, i) => { prevRank[r.id] = r.s > 0 ? i + 1 : null; });
    }
    return rows.map((r, i) => {
      let mv = "same", mvTxt = "=";
      if (prevRank) { const p = prevRank[r.it.id]; if (!r.score) { mv = "same"; mvTxt = "–"; } else if (p == null) { mv = "new"; mvTxt = L("NEW", "NEW"); } else if (p > i + 1) { mv = "up"; mvTxt = "▲" + (p - i - 1); } else if (p < i + 1) { mv = "down"; mvTxt = "▼" + (i + 1 - p); } }
      return { ...r, rank: i + 1, mv, mvTxt };
    });
  }, [songsOnly, chart]); // eslint-disable-line react-hooks/exhaustive-deps

  const sunoId = it => ((it.url || "").match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) || [])[0] || null;
  const pool = useMemo(() => items.map(it => ({ ...it, sunoId: sunoId(it), duration: Number(it.duration) || 0 })), [items]);

  // durée manquante → lue une fois sur Suno, enregistrée pour tout le monde
  useEffect(() => {
    pool.filter(it => it.sunoId && !it.duration && !healing.current.has(it.id)).slice(0, 5).forEach(it => {
      healing.current.add(it.id);
      fetch("/api/profile?suno=" + encodeURIComponent(it.url)).then(r => r.json()).then(j => {
        const d = Number(j.duration); if (!(d > 5)) return;
        supabase.rpc("gallery_set_duration", { gid: it.id, d }).then(() => {}, () => {});
        setItems(xs => xs.map(x => (x.id === it.id ? { ...x, duration: d } : x)));
      }).catch(() => {});
    });
  }, [pool]);

  // ce qui joue en ce moment, pour tout le monde
  const air = useMemo(() => onAir(now, pool, grille), [now, pool, grille]);
  const cur = air ? air.cur : null, nxt = air ? air.next : null;
  const pos = air ? Math.max(0, (now - air.start) / 1000) : 0, dur = air ? (air.end - air.start) / 1000 : 0;
  const slot = air ? air.cur.id + ":" + air.start : "";

  // nouvelle chanson à l'antenne → on note l'heure d'écoute (écoute comptée après 30 s)
  useEffect(() => { listenStart.current = Date.now(); }, [slot, playing]);
  useEffect(() => {
    if (!playing || !cur || isJingle(cur) || counted.current.has(cur.id)) return;
    if ((Date.now() - listenStart.current) / 1000 > 30) {
      counted.current.add(cur.id);
      supabase.rpc("gallery_play", { gid: cur.id }).then(({ error }) => { if (!error) setItems(xs => xs.map(x => (x.id === cur.id ? { ...x, plays: (x.plays || 0) + 1 } : x))); }, () => {});
    }
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!playing) setJoinedLate(false); }, [playing]);
  const firstSlot = useRef("");

  // ── Lecteur maison pour les MP3 hébergés (audio_file) ──
  // 2 lecteurs audio qui se relaient : fondu enchaîné de XF s, position exacte (synchro), et ça continue
  // écran barré (la page joue du son, le téléphone la laisse tourner). Les chansons sans MP3 passent par Suno.
  const els = useRef(null), poolRef = useRef(pool), grilleRef = useRef(grille);
  poolRef.current = pool; grilleRef.current = grille;
  const getEls = () => { if (!els.current) els.current = [0, 1].map(() => { const a = new Audio(); a.preload = "auto"; a.dataset.id = ""; return a; }); return els.current; };
  const unlock = () => getEls().forEach(a => { if (!a.src) { a.muted = true; a.play().then(() => { a.pause(); a.muted = false; }, () => { a.muted = false; }); } });
  function syncAudio() {
    const E = getEls(), t = Date.now() + clockOff.current, a = onAir(t, poolRef.current, grilleRef.current);
    const want = [];
    if (a && isHosted(a.cur)) {
      const p = (t - a.start) / 1000, slotS = (a.end - a.start) / 1000;
      let v = 1;
      if (a.prev && isHosted(a.prev) && p < XF) v = p / XF;                       // la nouvelle monte
      if (!isHosted(a.next) && slotS - p < XF) v = Math.min(v, Math.max(0, (slotS - p) / XF)); // fondu avant une chanson Suno
      if (a.cur.isBulletin && slotS - p < 3) v = Math.min(v, Math.max(0, (slotS - p) / 3));     // bulletin/capsule : fin en douceur
      want.push({ it: a.cur, pos: p, vol: v });
      if (a.prev && isHosted(a.prev) && p < XF) want.push({ it: a.prev, pos: (t - a.prevStart) / 1000, vol: Math.max(0, 1 - p / XF) }); // l'autre descend
    }
    const pre = a && isHosted(a.next) && (a.end - t) < 30000 ? a.next : null;
    const used = new Set();
    want.forEach(w => {
      let el = E.find(x => x.dataset.id === w.it.id && !used.has(x)) || E.find(x => !used.has(x) && !want.some(o => o.it.id === x.dataset.id));
      if (!el) return; used.add(el);
      if (el.dataset.id !== w.it.id) {
        el.dataset.id = w.it.id; el.src = w.it.audio_file; el.currentTime = w.pos;
        const fb = w.it.fallback;   // fichier introuvable (ex. bulletin pas fabriqué) → plan B
        el.onerror = fb ? () => { el.onerror = null; el.src = fb; el.play().catch(() => {}); } : null;
      }
      else if (el.readyState > 0 && Math.abs(el.currentTime - w.pos) > 1.5 && w.pos < (el.duration || 1e9) - 0.5) el.currentTime = w.pos;
      el.volume = Math.min(1, Math.max(0, w.vol));
      if (el.paused && !el.ended) el.play().catch(() => {});
    });
    E.forEach(el => {
      if (used.has(el)) return;
      if (!el.paused) el.pause();
      if (pre && !E.some(x => x.dataset.id === pre.id)) { el.dataset.id = pre.id; el.src = pre.audio_file; el.load(); }   // précharge la suivante
    });
  }
  useEffect(() => {
    if (!playing) { if (els.current) els.current.forEach(a => a.pause()); return; }
    syncAudio(); const iv = setInterval(syncAudio, 250);
    return () => clearInterval(iv);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps
  // ── Capsule « Vous écoutez MetalPrompt Radio » (8 nov. 2026) ──
  // Le lecteur Suno (iframe) prend quelques secondes à partir : une capsule de ~4 s couvre le trou au début
  // de chaque toune Suno. Rien dans la grille : juste chez l'auditeur, donc tout le monde reste synchro.
  const capsule = useRef(null), capsuleSlot = useRef("");
  useEffect(() => {
    if (!playing || !cur || isHosted(cur) || capsuleSlot.current === slot) return;
    capsuleSlot.current = slot;
    if (pos > 6) return;   // arrivé en plein milieu : pas de capsule
    try {
      if (!capsule.current) { capsule.current = new Audio(); capsule.current.preload = "auto"; }
      const a = capsule.current;
      a.src = uiLang === "fr" ? "/radio/capsule-fr.mp3" : "/radio/capsule-en.mp3";
      a.volume = 0.9; a.currentTime = 0; a.play().catch(() => {});
    } catch { /* pas de son, pas grave */ }
  }, [slot, playing]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!playing && capsule.current) capsule.current.pause(); }, [playing]);
  // écran de verrouillage : titre, pochette, bouton arrêt
  useEffect(() => {
    if (!("mediaSession" in navigator) || !cur) return;
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({ title: isJingle(cur) ? "MetalPrompt Radio" : cur.title, artist: isJingle(cur) ? L("En direct 24/7", "Live 24/7") : cur.artist, album: "Radio MetalPrompt", artwork: cur.image_url ? [{ src: cur.image_url, sizes: "512x512", type: "image/jpeg" }] : [] });
      navigator.mediaSession.setActionHandler("pause", () => { userStopped.current = true; setPlaying(false); });
      navigator.mediaSession.setActionHandler("stop", () => { userStopped.current = true; setPlaying(false); });
      navigator.mediaSession.setActionHandler("play", () => { userStopped.current = false; setPlaying(true); });
    } catch { /* navigateur sans contrôles */ }
  }, [slot]); // eslint-disable-line react-hooks/exhaustive-deps
  function listen() {
    if (playing) { userStopped.current = true; setPlaying(false); return; }
    userStopped.current = false; unlock();
    firstSlot.current = slot; setJoinedLate(pos > 8 && !isHosted(cur)); setPlaying(true);
  }
  useEffect(() => { if (playing && slot !== firstSlot.current) setJoinedLate(false); }, [slot, playing]);

  // départ automatique : la radio part dès qu'on ouvre l'onglet (le clic sur l'onglet compte comme geste
  // pour le navigateur). Si la page a été ouverte directement sans aucun clic, le navigateur bloque le son :
  // la radio part alors au premier toucher/clic n'importe où sur la page. ■ l'arrête pour de bon.
  const userStopped = useRef(false);
  const startNow = () => { if (userStopped.current || playing || !cur) return; unlock(); firstSlot.current = slot; setJoinedLate(pos > 8 && !isHosted(cur)); setPlaying(true); };
  useEffect(() => {
    if (!visible || !cur || playing || userStopped.current) return;
    const ua = typeof navigator !== "undefined" && navigator.userActivation;
    if (!ua || ua.hasBeenActive) { startNow(); return; }
    const go = () => startNow();
    window.addEventListener("pointerdown", go, { once: true }); window.addEventListener("keydown", go, { once: true });
    return () => { window.removeEventListener("pointerdown", go); window.removeEventListener("keydown", go); };
  }, [visible, cur && cur.id, playing]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!okSong) { setFormMsg(L("Coche la case des conditions pour envoyer.", "Check the terms box to send.")); return; }
    setFormMsg(L("Envoi…", "Sending…"));
    let url = form.url.trim(), audio_url = null, image_url = null, duration = null;
    if (/suno\.(com|ai)/i.test(url)) {
      try { const r = await fetch("/api/profile?suno=" + encodeURIComponent(url)); if (r.ok) { const j = await r.json(); url = j.url || url; audio_url = j.audio || null; image_url = j.image || null; duration = j.duration || null; } } catch { /* lien gardé tel quel */ }
    }
    const { error } = await supabase.from("gallery").insert({ title: form.title.trim(), artist: form.artist.trim() || (user.email ? user.email.split("@")[0] : "anon"), genre: form.genre, url, audio_url, image_url, duration, conditions_acceptees: true, status: "pending" });
    if (error) {
      if (error.code === "42501") { setFormMsg(L("Limite atteinte : 2 chansons par membre par mois. 🤘", "Limit reached: 2 tracks per member per month. 🤘")); return; }
      if (error.code === "23505") { setFormMsg(L("Cette chanson a déjà été soumise.", "This track was already submitted.")); return; }
      if (error.code === "23514") { setFormMsg(L("Lien refusé : Suno, Spotify, YouTube ou SoundCloud seulement.", "Link refused: Suno, Spotify, YouTube or SoundCloud only.")); return; }
      setFormMsg(L("Erreur — réessaie.", "Error — try again.")); return;
    }
    setFormMsg(L("Merci! Ta chanson est en attente d'approbation. Une fois approuvée, tu pourras nous transmettre le MP3 si tu veux. 🤘", "Thanks! Your track is awaiting approval. Once approved, you can send us the MP3 if you want. 🤘"));
    setForm({ title: "", artist: "", genre: "Deathcore", url: "" }); setOkSong(false);
  }

  // demande d'annonceur → table radio_annonceurs (lecture par François seulement)
  const setA = (k, v) => setAd(a => ({ ...a, [k]: v }));
  async function sendAd() {
    if (!ad.nom.trim() || !ad.courriel.trim() || ad.message.trim().length < 5) { setAdMsg(L("Nom, courriel et message requis.", "Name, email and message required.")); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ad.courriel.trim())) { setAdMsg(L("Courriel invalide.", "Invalid email.")); return; }
    if (!okAd) { setAdMsg(L("Coche la case pour envoyer.", "Check the box to send.")); return; }
    setAdMsg(L("Envoi…", "Sending…"));
    const { error } = await supabase.from("radio_annonceurs").insert({ nom: ad.nom.trim(), entreprise: ad.entreprise.trim() || null, courriel: ad.courriel.trim(), message: ad.message.trim(), accepte: true });
    if (error) { setAdMsg(L("Erreur — réessaie, ou écris-nous sur Discord.", "Error — try again, or write us on Discord.")); return; }
    setAdSent(true); setAdMsg(L("Merci! On te revient par courriel. 🤘", "Thanks! We'll get back to you by email. 🤘"));
    setAd({ nom: "", entreprise: "", courriel: "", message: "" }); setOkAd(false);
  }

  const top = ranked.slice(0, 10);
  const curRank = cur ? ranked.find(r => r.it.id === cur.id) : null;

  // ── Fenêtre flottante (« Détacher ») : Document Picture-in-Picture (Chrome/Edge ordi, reste par-dessus
  // les autres fenêtres), sinon petite fenêtre popup. Le son reste joué par la page : rien ne coupe.
  const [pipWin, setPipWin] = useState(null);
  const canPip = typeof window !== "undefined" && ("documentPictureInPicture" in window || !(window.matchMedia && window.matchMedia("(pointer: coarse)").matches));
  async function detach() {
    if (pipWin) { pipWin.close(); return; }
    let w = null;
    try {
      if ("documentPictureInPicture" in window) w = await window.documentPictureInPicture.requestWindow({ width: 360, height: 190 });
      else w = window.open("", "mpradio", "width=380,height=230,menubar=no,toolbar=no,location=no,status=no");
    } catch { w = null; }
    if (!w) return;
    w.document.title = "Radio MetalPrompt";
    document.querySelectorAll('link[rel="stylesheet"]').forEach(l => w.document.head.appendChild(l.cloneNode(true)));
    w.document.body.style.cssText = "margin:0;background:#0C0D0F";
    w.addEventListener("pagehide", () => setPipWin(null));
    if (!playing) { userStopped.current = false; unlock(); setPlaying(true); }
    setPipWin(w);
  }
  useEffect(() => () => { if (pipWin) pipWin.close(); }, [pipWin]);

  return (<>
    {pipWin && cur && createPortal(<div className="mpr mpr-pip">
      <style>{CSS}</style>
      <div className="mpr-piprow">
        {cur.image_url ? <img className={"mpr-cover" + (playing ? " on" : "")} src={cur.image_url} alt="" /> : <div className="mpr-cover" />}
        <div className="mpr-meta">
          <span className={"mpr-onair" + (playing ? " live" : "")}><i />{L("EN DIRECT", "LIVE")}</span>
          <div className="mpr-title">{isJingle(cur) ? L("Annonce MetalPrompt", "MetalPrompt station ID") : cur.title}</div>
          <div className="mpr-artist">{isJingle(cur) ? "Radio MetalPrompt" : cur.artist}</div>
        </div>
        <button className="mpr-play" onClick={listen} aria-label={playing ? L("Arrêter", "Stop") : L("Écouter en direct", "Listen live")}>{playing ? "■" : "▶"}</button>
      </div>
      <div className={"mpr-viz" + (playing ? " on" : "")} aria-hidden="true">{BARS.map((st, i) => <i key={i} style={st} />)}</div>
      {dur > 0 && <div className="mpr-bar"><i style={{ width: Math.min(100, pos / dur * 100) + "%" }} /></div>}
      {nxt && <div className="mpr-next">{L("Prochaine : ", "Up next: ")}<b>{isJingle(nxt) ? L("annonce", "station ID") : nxt.title}</b></div>}
    </div>, pipWin.document.body)}
    <style>{CSS}</style>
    {playing && cur && !isHosted(cur) && <iframe key={slot} className="mpr-hidden-frame" title={cur.title} src={`https://suno.com/embed/${cur.sunoId}?autoplay=1`} allow="autoplay; encrypted-media" aria-hidden="true" tabIndex={-1} />}
    {!visible && playing && cur && <div className="mpr-mini" role="region" aria-label={L("Radio MetalPrompt en direct", "MetalPrompt Radio live")}>
      {cur.image_url ? <img src={cur.image_url} alt="" /> : <span className="ph" />}
      <button className="t" onClick={() => onOpen && onOpen()} title={L("Ouvrir la radio", "Open the radio")}>
        <small>● {L("RADIO EN DIRECT", "RADIO LIVE")}</small>
        <b>{isJingle(cur) ? L("Annonce MetalPrompt", "MetalPrompt station ID") : cur.title + " — " + cur.artist}</b>
      </button>
      <span className="mini-viz" aria-hidden="true"><i /><i /><i /></span>
      <button className="x" onClick={() => { userStopped.current = true; setPlaying(false); }} aria-label={L("Arrêter la radio", "Stop the radio")}>■</button>
    </div>}
    <div className="mpr" style={visible ? undefined : { display: "none" }}>
      <div className="mpr-head">
        <div>
          <span className={"mpr-onair" + (cur ? " live" : "")}><i />{cur ? L("EN DIRECT 24/7", "LIVE 24/7") : L("RADIO", "RADIO")}</span>
          <h2 style={{ marginTop: 8 }}>Radio <span>MetalPrompt</span> <em className="mpr-beta">BETA</em></h2>
        </div>
        <p className="mpr-betanote">{L("La radio est en bêta : des petits bugs sont possibles (coupures, changement de chanson). Dis-le-nous sur Discord, ça nous aide à l'améliorer.", "The radio is in beta: small bugs may happen (cuts, song changes). Tell us on Discord, it helps us improve it.")}</p>
      </div>

      <div className="mpr-grid">
        <section className="mpr-card mpr-now" aria-label={L("En ondes", "Now playing")}>
          {loading ? <div className="mpr-empty">{L("Chargement…", "Loading…")}</div>
            : !cur ? <div className="mpr-empty">{L("Aucune chanson à la radio pour l'instant. Soumets la tienne!", "No tracks on the radio yet. Submit yours!")}</div>
            : <>
              <div className="mpr-nowtop">
                {cur.image_url ? <img className={"mpr-cover" + (playing ? " on" : "")} src={cur.image_url} alt="" /> : <div className={"mpr-cover" + (playing ? " on" : "")} />}
                <div className="mpr-meta">
                  <div className="mpr-eyebrow">{isJingle(cur) ? L("Annonce MetalPrompt", "MetalPrompt station ID") : <>{air.show ? (air.show.titre || air.show.genre) + " · " : ""}{curRank ? "#" + curRank.rank + L(" au palmarès", " on the chart") : ""}{cur.genre ? " · " + cur.genre : ""}</>}</div>
                  <div className="mpr-title">{cur.title}</div>
                  <div className="mpr-artist">{cur.artist}</div>
                  {!isJingle(cur) && <a className="mpr-link" href={cur.url} target="_blank" rel="noopener noreferrer">{L("Voir sur Suno ↗", "View on Suno ↗")}</a>}
                </div>
              </div>
              <div className={"mpr-viz" + (playing ? " on" : "")} aria-hidden="true">{BARS.map((st, i) => <i key={i} style={st} />)}</div>
              {!playing && <div className="mpr-small">{L("La radio joue en direct pour tout le monde. Touche la page (ou ▶) pour embarquer.", "The radio is live for everyone. Tap the page (or ▶) to tune in.")}</div>}
              {playing && joinedLate && <div className="mpr-small">{L("T'embarques en cours de chanson : elle part du début pour toi, t'es en synchro dès la prochaine.", "You tuned in mid-song: it starts from the top for you, you're in sync from the next one.")}</div>}
              {dur > 0 && <div>
                <div className="mpr-bar" role="progressbar" aria-label={L("Position en direct", "Live position")} aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(pos)}><i style={{ width: Math.min(100, pos / dur * 100) + "%" }} /></div>
                <div className="mpr-time"><span>{L("en direct ", "live ")}{fmt(pos)}</span><span>{L("suivante dans ", "next in ")}{fmt(Math.max(0, dur - pos))}</span></div>
              </div>}
              <div className="mpr-ctrl">
                <button className="mpr-play" onClick={listen} aria-label={playing ? L("Arrêter", "Stop") : L("Écouter en direct", "Listen live")}>{playing ? "■" : "▶"}</button>
                {canPip && <button className="mpr-btn" onClick={detach} title={L("Ouvrir le lecteur dans une petite fenêtre flottante", "Open the player in a small floating window")}>{pipWin ? L("⧉ Rattacher", "⧉ Dock") : L("⧉ Détacher", "⧉ Pop out")}</button>}
                {!isJingle(cur) && <button className="mpr-vote" aria-pressed={voted.has(cur.id)} onClick={() => toggleVote(cur.id)}>🤘 {voted.has(cur.id) ? L("Voté", "Voted") : L("Voter", "Vote")}</button>}
              </div>
              {msg && <div className="mpr-msg" role="status">{msg}</div>}
              {nxt && <div className="mpr-next">{L("Prochaine : ", "Up next: ")}<b>{isJingle(nxt) ? L("annonce MetalPrompt", "MetalPrompt station ID") : nxt.title}</b>{isJingle(nxt) ? "" : " · " + nxt.artist}</div>}
            </>}
        </section>

        <section className="mpr-card mpr-chart" aria-label={L("Palmarès", "Chart")}>
          <h3>{chart ? L("Palmarès de la semaine", "This week's chart") : L("Palmarès", "Chart")}</h3>
          {top.length === 0 ? <div className="mpr-empty">{L("Le palmarès se remplit avec vos votes.", "The chart fills up with your votes.")}</div> :
            <ol>{top.map(r => <li key={r.it.id}>
              <a className="mpr-row" aria-current={cur && cur.id === r.it.id} href={r.it.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <span className="mpr-rank">{r.rank}</span>
                <span className={"mpr-mv " + r.mv}>{chart ? r.mvTxt : ""}</span>
                {r.it.image_url ? <img className="mpr-thumb" src={r.it.image_url} alt="" loading="lazy" /> : <span className="mpr-thumb" />}
                <span className="mpr-rt"><b>{r.it.title}</b><span>{r.it.artist}{r.it.genre ? " · " + r.it.genre : ""}</span></span>
                <span className="mpr-num"><b>{r.score} 🤘</b>{r.it.plays ? r.it.plays + L(" écoutes", " plays") : ""}</span>
              </a></li>)}</ol>}
          <p className="mpr-small" style={{ marginTop: 10 }}>{L("1 vote par jour · 1 vote par chanson. Le palmarès compte les votes des 7 derniers jours.", "1 vote per day · 1 vote per track. The chart counts the last 7 days of votes.")}</p>
        </section>
      </div>

      <section className="mpr-card">
        <div className="mpr-cta">
          <button className="mpr-primary" onClick={() => setShowForm(v => !v)}>{showForm ? L("Fermer", "Close") : L("Passer ma chanson à la radio", "Get my track on the radio")}</button>
          {discordUrl && <a className="mpr-link" href={discordUrl} target="_blank" rel="noopener noreferrer">{L("Rejoins la communauté sur Discord →", "Join the community on Discord →")}</a>}
        </div>
        {showForm && <div className="mpr-form" style={{ marginTop: 12 }}>
          <p className="mpr-small">{L("Gratuit avec un compte · 2 chansons par mois. Seuls les liens Suno publics jouent à la radio.", "Free with an account · 2 tracks per month. Only public Suno links play on the radio.")}</p>
          <ol className="mpr-steps">
            <li>{L("Tu soumets le lien de ta chanson pour approbation.", "You submit your song's link for approval.")}</li>
            <li>{L("On l'écoute. Une fois approuvée, elle passe à la radio.", "We listen to it. Once approved, it goes on the radio.")}</li>
            <li>{L("Ensuite, si tu veux (optionnel), tu pourras nous transmettre le MP3 : meilleure qualité de diffusion, fondu entre les chansons et lecture même écran barré.", "Then, if you want (optional), you can send us the MP3: better broadcast quality, crossfade between songs and playback even with the screen locked.")}</li>
          </ol>
          <input placeholder={L("Titre de la chanson", "Track title")} value={form.title} onChange={e => setF("title", e.target.value)} />
          <input placeholder={L("Nom d'artiste (optionnel)", "Artist name (optional)")} value={form.artist} onChange={e => setF("artist", e.target.value)} />
          <select value={form.genre} onChange={e => setF("genre", e.target.value)}>{GENRES.map(g => <option key={g} value={g}>{g}</option>)}</select>
          <input placeholder="https://suno.com/song/…" value={form.url} onChange={e => setF("url", e.target.value)} />
          <label className="mpr-check"><input type="checkbox" checked={okSong} onChange={e => setOkSong(e.target.checked)} />
            <span>{L("Je confirme que cette chanson est ma création ou que j'ai les droits pour la partager, que le lien Suno est public, et qu'elle ne contient ni haine, ni harcèlement, ni contenu illégal. J'autorise MetalPrompt à la diffuser gratuitement sur la radio et sur ses réseaux pour faire la promotion de la radio. MetalPrompt peut refuser ou retirer une chanson en tout temps, sans préavis. Si je transmets le MP3, il sert seulement à la radio et il est supprimé si je retire ma chanson. Je reste propriétaire de ma chanson et je peux demander son retrait quand je veux.",
              "I confirm this song is my own work or that I have the rights to share it, that the Suno link is public, and that it contains no hate, harassment or illegal content. I allow MetalPrompt to broadcast it for free on the radio and on its social channels to promote the radio. MetalPrompt may refuse or remove a song at any time, without notice. If I send the MP3, it is only used for the radio and is deleted if I remove my song. I keep ownership of my song and can ask for its removal whenever I want.")}</span></label>
          <button className="mpr-primary" onClick={submit} disabled={!okSong} style={okSong ? undefined : { opacity: .5, cursor: "not-allowed" }}>{L("Envoyer", "Send")}</button>
          {formMsg && <div className="mpr-small" style={{ color: "var(--ok)" }} role="status">{formMsg}</div>}
        </div>}
      </section>

      <section className="mpr-card" aria-label={L("Annoncer sur la radio", "Advertise on the radio")}>
        <div className="mpr-cta">
          <div style={{ flex: "1 1 240px" }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{L("Tu veux annoncer sur la radio?", "Want to advertise on the radio?")}</div>
            <p className="mpr-small">{L("Ta marque, ton show, ton band ou ta boutique entre deux chansons, pour un public 100 % metal.", "Your brand, show, band or shop between songs, for a 100% metal audience.")}</p>
          </div>
          <button className="mpr-primary" onClick={() => setShowAd(v => !v)}>{showAd ? L("Fermer", "Close") : L("Envoie-nous un message", "Send us a message")}</button>
        </div>
        {showAd && !adSent && <div className="mpr-form" style={{ marginTop: 12 }}>
          <input placeholder={L("Ton nom", "Your name")} value={ad.nom} maxLength={120} onChange={e => setA("nom", e.target.value)} autoComplete="name" />
          <input placeholder={L("Entreprise / band (optionnel)", "Company / band (optional)")} value={ad.entreprise} maxLength={160} onChange={e => setA("entreprise", e.target.value)} autoComplete="organization" />
          <input type="email" placeholder={L("Ton courriel", "Your email")} value={ad.courriel} maxLength={200} onChange={e => setA("courriel", e.target.value)} autoComplete="email" />
          <textarea className="mpr-ta" placeholder={L("Ce que tu veux annoncer, quand, ton budget…", "What you want to advertise, when, your budget…")} value={ad.message} maxLength={2000} rows={4} onChange={e => setA("message", e.target.value)} />
          <label className="mpr-check"><input type="checkbox" checked={okAd} onChange={e => setOkAd(e.target.checked)} />
            <span>{L("J'ai compris : envoyer ce formulaire ne réserve aucune place et n'engage personne. MetalPrompt approuve chaque annonce et peut en refuser une sans donner de raison. Le prix, la durée et le texte sont convenus par écrit avant la diffusion. Le contenu doit être légal, sans haine ni fausse représentation. Mes coordonnées servent seulement à me répondre; elles ne sont ni vendues ni partagées.",
              "I understand: sending this form reserves no spot and commits no one. MetalPrompt approves every ad and may refuse one without giving a reason. Price, length and script are agreed in writing before airing. Content must be legal, with no hate or misrepresentation. My contact info is only used to reply to me; it is never sold or shared.")}</span></label>
          <button className="mpr-primary" onClick={sendAd} disabled={!okAd} style={okAd ? undefined : { opacity: .5, cursor: "not-allowed" }}>{L("Envoyer", "Send")}</button>
          {adMsg && <div className="mpr-small" style={{ color: "var(--ember2)" }} role="status">{adMsg}</div>}
        </div>}
        {adSent && <div className="mpr-small" style={{ color: "var(--ok)", marginTop: 10 }} role="status">{adMsg}</div>}
      </section>
    </div>
  </>);
}
