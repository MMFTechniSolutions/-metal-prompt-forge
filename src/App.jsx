import { useState, useCallback, useEffect } from "react";
import { supabase } from "./supabase.js";

const RED = "#ff2e2e";
const DARK = "#0a0a0a";
const CARD = "#141414";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700;900&display=swap');
  @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
  @keyframes flicker { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:.7} 95%{opacity:1} 97%{opacity:.8} }
  @keyframes pulseRed { 0%,100%{box-shadow:0 0 0 0 #ff2e2e55} 50%{box-shadow:0 0 0 10px #ff2e2e00} }
  @keyframes slideUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
  @keyframes glitch {
    0%,100%{clip-path:inset(0 0 100% 0)}
    10%{clip-path:inset(10% 0 80% 0)}
    20%{clip-path:inset(40% 0 40% 0)}
    30%{clip-path:inset(70% 0 10% 0)}
    40%{clip-path:inset(90% 0 0% 0)}
    50%{clip-path:inset(0 0 100% 0)}
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:#0a0a0a; font-family:'Inter',system-ui,sans-serif; }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:#111; }
  ::-webkit-scrollbar-thumb { background:#ff2e2e44; border-radius:2px; }
  .nav-scroll { scrollbar-width:none; overflow-x:auto; display:flex; }
  input[type=range] {
    width:100%; -webkit-appearance:none; height:4px; border-radius:2px; outline:none; cursor:pointer;
    background: linear-gradient(to right, #ff2e2e 0%, #ff2e2e var(--pct,80%), #222 var(--pct,80%));
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance:none; width:18px; height:18px; border-radius:50%;
    background:#ff2e2e; cursor:pointer; box-shadow:0 0 10px #ff000088;
  }
  textarea:focus, input:focus { outline:none; }
  .forge-title { font-family:'Bebas Neue',sans-serif; animation:flicker 8s infinite; }
  .slide-up { animation:slideUp 0.5s ease forwards; }
  .pulse { animation:pulseRed 2s infinite; }
`;

// ── DATA ──
const GENRES = ["deathcore","metalcore","groove metal","death metal","djent","melodic deathcore","mathcore","beatdown hardcore","slam metal","nu-metal","black metal","thrash metal"];
const MOOD   = ["crushing and heavy","sinister and dark","chaotic and frantic","groovy and headbang-worthy","melodic and atmospheric","dissonant","intense and aggressive","dark and menacing","epic","raw and abrasive"];
const DRUMS  = ["blast beats","double bass drumming","half-time groove","polyrhythmic drums","breakbeat percussion","d-beat","syncopated rhythms","machine-gun double bass"];
const DRUM_PROD = ["triggered drums","live drum sound","massive snare","clicky kick drum","trashy cymbals","programmed drums"];
const VOCALS = ["guttural death growls","pig squeals","high-pitched screams","mid-range harsh vocals","clean melodic chorus vocals","gang shouts","whispered spoken word","demonic inhale vocals","falsetto screams"];
const VFX    = ["vocal reverb","vocal distortion","pitch-shifted vocals","dual vocal tracking","megaphone effect","layered vocal harmonies"];
const GUITAR = ["chugging riffs","palm muting","pinch harmonics","tremolo picking","sweep picking solos","djent-style syncopated riffs","open string riffs","legato runs","tapping","whammy bar dives"];
const TUNING = ["standard E tuning","drop D tuning","drop C tuning","drop B tuning","drop A tuning","7-string guitar","8-string guitar"];
const GPROD  = ["heavy distortion","high gain amplifier","layered guitar tracks","tight low-end guitar tone","djent-style clean tone contrast","808 sub bass guitar","wall of sound guitar"];
// ── BASS DATA ──
const BASS_STYLE = ["fingerstyle bass","picked bass","slap bass","fretless bass","muted bass","palm mute bass","aggressive bass","grinding bass"];
const BASS_TECH  = ["bass tapping","bass harmonics","bass sweep","whammy bass","bass chord strums","two-hand tapping bass","bass tremolo","bass pinch harmonics"];
const BASS_TONE  = ["distorted bass","overdriven bass","clean bass","sub bass","growling bass","scooped bass tone","mid-heavy bass","dirty bass","fuzz bass"];
const BASS_TUNING= ["bass drop A","bass drop B","bass drop C","bass drop D","5-string bass","6-string bass","8-string bass","standard bass tuning"];
const BASS_PROD  = ["bass heavy mix","bass-forward production","sub-bass boosted","tight punchy bass","808 bass","wall of low-end","chest-crushing bass"];

const SAX    = ["aggressive saxophone","baritone saxophone","alto saxophone","tenor saxophone","saxophone screech and wail","saxophone solo"];
const BRASS  = ["brass section","trumpet","trombone","french horn"];
const KEYS   = ["keyboards","synthesizer","organ","piano","theremin"];
const STRINGS= ["violin","cello","string orchestra"];
const PROD   = ["heavy production","lo-fi raw recording","modern metal production","wall of sound mixing","crisp high-end mix","analog warm tone"];
const ORG_RECORD = ["live recording","analog tape","rehearsal recording","room ambience","studio bleed","natural room sound","lo-fi raw recording","imperfect takes"];
const ORG_DRUMS  = ["live drums","natural drum room","overhead mics","snare bleed","kick bleed","human feel drumming","slightly loose tempo","natural drum dynamics","imperfect timing"];
const ORG_VOCALS = ["raw vocal take","no autotune","natural vocal imperfections","throat vocals","physical vocal strain","analog vocal chain","close mic'd vocals","wet room reverb","vocal breathiness"];
const ORG_GUITAR = ["tube amp recording","cabinet mic'd","natural pick attack","slight string buzz","analog distortion","tube saturation","live room guitar","natural feedback","amp hum"];
const ORG_AVOID  = ["perfect production","polished mix","crisp","digital","quantized","pitch corrected","over-produced","clean mix"];
const EXCL_GENRES  = ["pop","jazz","classical","country","r&b","hip hop","electronic","edm","ambient","folk","reggae","latin","disco","funk","soul","gospel","blues","indie pop","synthpop","new age"];
const EXCL_VOCALS  = ["clean vocals","autotune","pitch correction","electronic vocals","vocoder","falsetto","soft vocals","whisper vocals","pop vocals","processed vocals","digital vocal fx"];
const EXCL_PROD    = ["polished production","crisp mix","over-produced","digital production","perfect timing","quantized drums","sterile mix","radio mix"];
const EXCL_INSTRU  = ["acoustic guitar","ukulele","bossa nova","flute","harp","banjo","mandolin","steel drum"];
const THEMES = ["mort et décomposition","apocalypse","chaos intérieur","guerre et destruction","trahison","démons et obscurité","résistance et rébellion","nihilisme","vengeance","aliénation et solitude","horreur cosmique","violence et brutalité"];
const LYRIC_ATMO = ["sombre et menaçant","poétique et métaphorique","direct et violent","philosophique","narratif comme une histoire","cri de rage"];
const LYRIC_BLOCKS = [
  {v:"verse",l:"Verse x2"},{v:"prechorus",l:"Pre-Chorus"},{v:"chorus",l:"Chorus"},
  {v:"breakdown",l:"Breakdown"},{v:"halftime",l:"Half-Time"},{v:"blastsection",l:"Blast Section"},
  {v:"drop",l:"Drop"},{v:"buildup",l:"Build-up"},{v:"gangchant",l:"Gang Chant"},
  {v:"spokenword",l:"Spoken Word"},{v:"scream",l:"Scream"},{v:"riffbreak",l:"Riff Break"},
  {v:"interlude",l:"Interlude"},{v:"atmosphericbreak",l:"Atmo Break"},
  {v:"solo",l:"Guitar Solo"},{v:"bridge",l:"Bridge"},{v:"intro",l:"Intro"},{v:"outro",l:"Outro"},
];
const STRUCT_BLOCKS = [
  {k:"intro",icon:"🔥",name:"Intro",desc:"Riff d'ouverture brutal ou atmosphérique"},
  {k:"buildup",icon:"📈",name:"Build-up",desc:"Montée progressive avant explosion"},
  {k:"verse",icon:"⚡",name:"Verse",desc:"Couplet vocal haché sur riffs lourds"},
  {k:"prechorus",icon:"🌀",name:"Pre-Chorus",desc:"Tension avant le chorus"},
  {k:"chorus",icon:"💥",name:"Chorus",desc:"Hook principal, souvent plus groovy"},
  {k:"breakdown",icon:"💀",name:"Breakdown",desc:"Section lente et écrasante, riff mosh"},
  {k:"halftime",icon:"🐢",name:"Half-Time",desc:"Section groove ralentie, lourd et hypnotique"},
  {k:"blastsection",icon:"💨",name:"Blast Section",desc:"Blast beats purs, sans mélodie, chaos total"},
  {k:"drop",icon:"⬇️",name:"Drop",desc:"Chute brutale après une montée de tension"},
  {k:"solo",icon:"🎸",name:"Guitar Solo",desc:"Solo lead shredding ou mélodique"},
  {k:"interlude",icon:"🎵",name:"Interlude",desc:"Section instrumentale entre les parties"},
  {k:"atmosphericbreak",icon:"🌫️",name:"Atmospheric Break",desc:"Ambiance calme/sinistre, tension suspendue"},
  {k:"spokenword",icon:"🗣️",name:"Spoken Word",desc:"Section parlée/narrative, sans chant"},
  {k:"gangchant",icon:"👊",name:"Gang Chant",desc:"Chant collectif type mosh pit"},
  {k:"scream",icon:"😱",name:"Scream Section",desc:"Cris purs, voix seule sans musique"},
  {k:"riffbreak",icon:"🎶",name:"Riff Break",desc:"Riff seul sans voix, groove pur"},
  {k:"bridge",icon:"🌊",name:"Bridge",desc:"Section contrastée, tension dramatique"},
  {k:"outro",icon:"☠️",name:"Outro",desc:"Fin explosive ou fade chaotique"},
];

// ── TIERS CONFIG ──
const FREE_LIMIT = 1;

const TIERS = {
  free:  { id:"free",  label:"FREE",        price:"$0",      color:"#444",    badge:null },
  forge: { id:"forge", label:"⚒️ FORGE",     price:"$4.99/mois", color:"#cc6600", badge:"FORGE",
    stripe:"https://buy.stripe.com/YOUR_FORGE_LINK",
    features:[
      "✅ Prompts illimités",
      "✅ Genre, Drums, Vocals, Guitar, Basse",
      "✅ Structure & Time Signatures",
      "✅ Exclude Tags",
      "✅ BPM & Mood",
      "❌ Paroles par IA",
      "❌ Mode Organic / Anti-AI",
      "❌ Historique",
      "❌ Presets",
    ]
  },
  pro: { id:"pro", label:"🔥 FORGE PRO",   price:"$8.99/mois", color:"#ff2e2e", badge:"PRO",
    stripe:"https://buy.stripe.com/YOUR_PRO_LINK",
    features:[
      "✅ Tout de FORGE +",
      "✅ Paroles par IA illimitées",
      "✅ Mode Organic / Anti-AI",
      "✅ Historique 50 prompts",
      "✅ Tags avancés",
      "❌ Presets sauvegardables",
      "❌ Export PDF",
      "❌ Accès prioritaire features",
    ]
  },
  elite: { id:"elite", label:"💀 FORGE ELITE", price:"$14.99/mois", color:"#aa00ff", badge:"ELITE",
    stripe:"https://buy.stripe.com/YOUR_ELITE_LINK",
    features:[
      "✅ Tout de FORGE PRO +",
      "✅ Presets sauvegardables illimités",
      "✅ Export PDF du prompt",
      "✅ Accès prioritaire nouvelles features",
      "✅ Badge ELITE dans l'app",
      "✅ Support prioritaire direct",
    ]
  },
};

// ── STYLES ──
const S = {
  wrap:    { background:DARK, color:"#e0e0e0", minHeight:"100vh" },
  header:  { background:"linear-gradient(135deg,#1a0000 0%,#0a0a0a 60%)", borderBottom:`1px solid #ff2e2e33`, padding:"14px 20px 10px", textAlign:"center", position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 40px #ff000022" },
  h1:      { fontSize:"1.6rem", letterSpacing:"6px", color:RED, textShadow:"0 0 30px #ff0000" },
  sub:     { fontSize:"0.55rem", color:"#444", letterSpacing:"4px", textTransform:"uppercase", marginTop:"2px" },
  navBtn:  (a) => ({ flex:"1", minWidth:"70px", padding:"10px 4px", fontSize:"0.55rem", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", textAlign:"center", cursor:"pointer", border:"none", background:a?"#1a0000":"none", color:a?RED:"#555", borderBottom:a?`2px solid ${RED}`:"2px solid transparent", whiteSpace:"nowrap", transition:"all 0.2s" }),
  page:    { padding:"14px", maxWidth:"600px", margin:"0 auto" },
  card:    { background:CARD, border:"1px solid #1e1e1e", borderRadius:"10px", padding:"13px", marginBottom:"11px" },
  ctitle:  { fontSize:"0.58rem", textTransform:"uppercase", letterSpacing:"2px", color:RED, fontWeight:800, marginBottom:"10px" },
  tags:    { display:"flex", flexWrap:"wrap", gap:"7px" },
  tag:     (on) => ({ background:on?"#2a0000":"#181818", border:on?`1.5px solid ${RED}`:"1.5px solid #222", borderRadius:"20px", padding:"5px 12px", fontSize:"0.72rem", cursor:"pointer", color:on?"#ff7070":"#888", fontWeight:on?700:400, boxShadow:on?"0 0 10px #ff000033":"none", transition:"all 0.15s", userSelect:"none" }),
  outBox:  { background:"#0d0d0d", border:"1px solid #222", borderRadius:"8px", padding:"12px", fontSize:"0.77rem", lineHeight:1.75, color:"#ccc", wordBreak:"break-word", position:"relative", marginBottom:"12px" },
  outLbl:  { fontSize:"0.57rem", textTransform:"uppercase", letterSpacing:"2px", color:RED, fontWeight:800, marginBottom:"5px" },
  copyBtn: { position:"absolute", top:"8px", right:"8px", background:"#1c1c1c", border:"1px solid #2a2a2a", borderRadius:"5px", padding:"3px 8px", fontSize:"0.57rem", color:"#777", cursor:"pointer", textTransform:"uppercase", letterSpacing:"1px" },
  fab:     { position:"fixed", bottom:"20px", right:"16px", width:"58px", height:"58px", borderRadius:"50%", background:RED, border:"none", color:"#000", fontSize:"1.3rem", cursor:"pointer", boxShadow:"0 4px 24px #ff000099", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 },
  intBar:  { display:"flex", gap:"3px", marginTop:"5px" },
  intSeg:  (lit) => ({ flex:1, height:"4px", borderRadius:"2px", background:lit?RED:"#222", transition:"background 0.2s" }),
  structBlock: { background:"#0f0f0f", border:"1px solid #1e1e1e", borderLeft:`3px solid ${RED}`, borderRadius:"6px", padding:"10px 12px", marginBottom:"7px", display:"flex", alignItems:"center", gap:"10px" },
  togBtn:  (on) => ({ width:"28px", height:"28px", borderRadius:"50%", border:"none", background:on?"#8a0000":"#1a1a1a", color:on?RED:"#444", fontSize:"0.8rem", cursor:"pointer", flexShrink:0, transition:"all 0.2s" }),
  genBtn:  { width:"100%", padding:"14px", background:RED, border:"none", borderRadius:"8px", color:"#000", fontSize:"0.85rem", fontWeight:900, letterSpacing:"3px", textTransform:"uppercase", cursor:"pointer", boxShadow:"0 4px 24px #ff000055", marginBottom:"12px" },
};

// ── COMPONENTS ──
function Tags({ list, sel, toggle }) {
  return (
    <div style={S.tags}>
      {list.map(v => {
        const label = typeof v==="object"?v.l:v;
        const val   = typeof v==="object"?v.v:v;
        return <span key={val} style={S.tag(sel.has(val))} onClick={()=>toggle(val)}>{label}</span>;
      })}
    </div>
  );
}

function CopyBtn({ getText }) {
  const [txt, setTxt] = useState("COPY");
  const copy = () => navigator.clipboard.writeText(getText()).then(()=>{setTxt("✅");setTimeout(()=>setTxt("COPY"),1500)}).catch(()=>setTxt("ERR"));
  return <button style={S.copyBtn} onClick={copy}>{txt}</button>;
}

function Slider({ label, val, setVal }) {
  const pct = ((val-1)/9*100).toFixed(1)+"%";
  return (
    <div style={{marginBottom:"13px"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
        <span style={{fontSize:"0.67rem",textTransform:"uppercase",letterSpacing:"1px",color:"#666"}}>{label}</span>
        <span style={{fontSize:"0.85rem",fontWeight:800,color:RED}}>{val}</span>
      </div>
      <input type="range" min={1} max={10} value={val} style={{"--pct":pct}} onChange={e=>setVal(parseInt(e.target.value))} />
      <div style={S.intBar}>{Array.from({length:10},(_,i)=><div key={i} style={S.intSeg(i<val)}/>)}</div>
    </div>
  );
}

// ── PAYWALL MODAL 3 TIERS ──
function PaywallModal({ onClose, usedCount }) {
  const [selected, setSelected] = useState("pro");
  const tier = TIERS[selected];

  return (
    <div style={{ position:"fixed", inset:0, background:"#000000dd", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px", overflowY:"auto" }}>
      <div style={{ background:"#0f0f0f", border:`1px solid #333`, borderRadius:"14px", padding:"22px 18px", maxWidth:"420px", width:"100%", boxShadow:`0 0 60px #00000099` }}>

        <div style={{ textAlign:"center", marginBottom:"18px" }}>
          <div style={{ fontSize:"0.6rem", color:"#555", letterSpacing:"3px", textTransform:"uppercase", marginBottom:"6px" }}>PROMPT GRATUIT UTILISÉ</div>
          <div className="forge-title" style={{ fontSize:"1.5rem", color:"#fff", letterSpacing:"4px" }}>CHOISIS TON PLAN</div>
        </div>

        {/* Tier selector */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", marginBottom:"18px" }}>
          {Object.values(TIERS).filter(t=>t.id!=="free").map(t => (
            <div key={t.id} onClick={()=>setSelected(t.id)}
              style={{ background: selected===t.id ? "#1a0000" : "#111", border:`1.5px solid ${selected===t.id ? t.color : "#222"}`, borderRadius:"8px", padding:"10px 6px", textAlign:"center", cursor:"pointer", transition:"all 0.2s" }}>
              <div style={{ fontSize:"0.65rem", fontWeight:900, color: selected===t.id ? t.color : "#555", letterSpacing:"1px", marginBottom:"4px" }}>{t.label}</div>
              <div style={{ fontSize:"0.9rem", fontWeight:900, color:"#fff" }}>{t.price.split("/")[0]}</div>
              <div style={{ fontSize:"0.5rem", color:"#444" }}>/mois</div>
            </div>
          ))}
        </div>

        {/* Features du tier sélectionné */}
        <div style={{ background:"#0a0a0a", border:`1px solid ${tier.color}22`, borderRadius:"8px", padding:"14px", marginBottom:"16px", minHeight:"160px" }}>
          <div style={{ fontSize:"0.58rem", color:tier.color, letterSpacing:"2px", textTransform:"uppercase", fontWeight:800, marginBottom:"10px" }}>{tier.label} — INCLUS</div>
          {tier.features.map(f => (
            <div key={f} style={{ fontSize:"0.7rem", color: f.startsWith("✅") ? "#ccc" : "#333", padding:"3px 0" }}>{f}</div>
          ))}
        </div>

        {/* CTA */}
        <a href={tier.stripe} target="_blank" rel="noreferrer"
          style={{ display:"block", width:"100%", padding:"14px", background:tier.color, borderRadius:"8px", color:"#000", fontWeight:900, fontSize:"0.85rem", letterSpacing:"2px", textTransform:"uppercase", textDecoration:"none", textAlign:"center", boxShadow:`0 4px 20px ${tier.color}55`, marginBottom:"10px" }}>
          🤘 COMMENCER {tier.label}
        </a>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"10px" }}>
          {Object.values(TIERS).filter(t=>t.id!=="free"&&t.id!==selected).map(t=>(
            <a key={t.id} href={t.stripe} target="_blank" rel="noreferrer"
              style={{ display:"block", padding:"8px", background:"#111", border:`1px solid ${t.color}44`, borderRadius:"6px", color:t.color, fontSize:"0.6rem", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", textDecoration:"none", textAlign:"center" }}>
              {t.label} {t.price.split("/")[0]}
            </a>
          ))}
        </div>

        <button onClick={onClose}
          style={{ width:"100%", background:"none", border:"none", color:"#333", fontSize:"0.65rem", cursor:"pointer", textDecoration:"underline" }}>
          Continuer sans abonnement
        </button>
      </div>
    </div>
  );
}

// ── LANDING PAGE ──
function LandingPage({ onEnter }) {
  const examples = [
    { tags:"deathcore, blast beats, pig squeals, drop B tuning, 180 BPM", genre:"DEATHCORE", color:"#ff2e2e" },
    { tags:"djent, polyrhythmic drums, 7-string guitar, groovy and headbang-worthy, 140 BPM", genre:"DJENT", color:"#ff6600" },
    { tags:"black metal, tremolo picking, blast beats, sinister and dark, 200 BPM", genre:"BLACK METAL", color:"#aa00ff" },
  ];
  const [activeEx, setActiveEx] = useState(0);
  useEffect(()=>{ const t=setInterval(()=>setActiveEx(p=>(p+1)%examples.length),3000); return()=>clearInterval(t); },[]);

  return (
    <div style={{ background:DARK, minHeight:"100vh", color:"#e0e0e0" }}>
      <style>{css}</style>

      {/* HERO */}
      <div style={{ background:"linear-gradient(180deg,#1a0000 0%,#0a0a0a 100%)", padding:"50px 20px 40px", textAlign:"center", borderBottom:"1px solid #ff2e2e22", position:"relative", overflow:"hidden" }}>
        
        {/* Decorative lines */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:`linear-gradient(90deg,transparent,${RED},transparent)` }}/>
        
        <div className="forge-title" style={{ fontSize:"clamp(2.2rem,8vw,3.5rem)", color:RED, letterSpacing:"8px", textShadow:"0 0 40px #ff000088", marginBottom:"6px" }}>
          ⚰️ METAL PROMPT FORGE
        </div>
        
        <div style={{ fontSize:"0.65rem", color:"#555", letterSpacing:"5px", textTransform:"uppercase", marginBottom:"30px" }}>
          Le générateur de prompts Suno pour musiciens metal
        </div>

        {/* Live example */}
        <div style={{ maxWidth:"480px", margin:"0 auto 30px", background:"#0f0f0f", border:`1px solid ${examples[activeEx].color}33`, borderRadius:"10px", padding:"14px 16px", transition:"border-color 0.5s" }}>
          <div style={{ fontSize:"0.55rem", color:examples[activeEx].color, letterSpacing:"3px", textTransform:"uppercase", fontWeight:800, marginBottom:"8px" }}>
            EXEMPLE — {examples[activeEx].genre}
          </div>
          <div style={{ fontSize:"0.75rem", color:"#aaa", lineHeight:1.8, fontFamily:"monospace" }}>
            {examples[activeEx].tags}
          </div>
        </div>

        <button onClick={onEnter} className="pulse"
          style={{ padding:"16px 36px", background:RED, border:"none", borderRadius:"8px", color:"#000", fontSize:"1rem", fontWeight:900, letterSpacing:"3px", textTransform:"uppercase", cursor:"pointer", boxShadow:"0 6px 30px #ff000077" }}>
          🤘 LANCER L'APP
        </button>
        
        <div style={{ fontSize:"0.6rem", color:"#444", marginTop:"10px" }}>
          Gratuit · 1 prompt offert · Aucune carte requise
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ padding:"36px 20px", maxWidth:"560px", margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:"28px" }}>
          <div className="forge-title" style={{ fontSize:"1.4rem", color:"#fff", letterSpacing:"4px", marginBottom:"6px" }}>POURQUOI METAL PROMPT FORGE ?</div>
          <div style={{ fontSize:"0.72rem", color:"#555", lineHeight:1.8 }}>
            Suno génère mieux quand les prompts sont précis.<br/>On traduit ton idée metal en tags parfaits.
          </div>
        </div>

        {[
          { icon:"🎸", title:"10 onglets de personnalisation", desc:"Genre, drums, vocals, guitar, structure, paroles, organic, exclude — tout est là." },
          { icon:"✍️", title:"Paroles générées par IA", desc:"Claude compose des paroles metal uniques avec thèmes, atmosphère et anti-répétition automatique." },
          { icon:"🌿", title:"Mode Organic / Anti-AI", desc:"Des tags spéciaux pour rendre tes générations Suno plus humaines et moins robotiques." },
          { icon:"📋", title:"Prompt prêt à coller", desc:"Style tags, structure et notes de prod séparés — tu sais exactement où coller quoi dans Suno." },
          { icon:"🚫", title:"Tags d'exclusion", desc:"Dis à Suno ce qu'il doit éviter. Fini le piano qui s'invite dans ton deathcore." },
        ].map(f => (
          <div key={f.title} style={{ display:"flex", gap:"14px", padding:"14px 0", borderBottom:"1px solid #1a1a1a", alignItems:"flex-start" }}>
            <div style={{ fontSize:"1.6rem", flexShrink:0 }}>{f.icon}</div>
            <div>
              <div style={{ fontSize:"0.82rem", fontWeight:700, color:"#e0e0e0", marginBottom:"3px" }}>{f.title}</div>
              <div style={{ fontSize:"0.7rem", color:"#555", lineHeight:1.7 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* PRICING */}
      <div style={{ padding:"30px 20px", maxWidth:"560px", margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:"20px" }}>
          <div className="forge-title" style={{ fontSize:"1.3rem", color:"#fff", letterSpacing:"4px" }}>PLANS</div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:"12px" }}>
          {/* FREE */}
          <div style={{ background:CARD, border:"1px solid #222", borderRadius:"10px", padding:"16px" }}>
            <div style={{ fontSize:"0.6rem", color:"#555", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"6px" }}>GRATUIT</div>
            <div style={{ fontSize:"1.4rem", fontWeight:900, color:"#fff", marginBottom:"10px" }}>$0</div>
            {["1 prompt d'essai","Accès basique genre & drums","❌ Paroles IA","❌ Historique","❌ Organic mode"].map((f,i) => (
              <div key={f} style={{ fontSize:"0.68rem", color:i<2?"#bbb":"#333", padding:"3px 0" }}>{f}</div>
            ))}
            <button onClick={onEnter} style={{ width:"100%", marginTop:"12px", padding:"9px", background:"#1a1a1a", border:"1px solid #333", borderRadius:"6px", color:"#777", fontSize:"0.72rem", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer" }}>ESSAYER</button>
          </div>

          {/* FORGE */}
          <div style={{ background:"#110a00", border:`1px solid #cc660044`, borderRadius:"10px", padding:"16px" }}>
            <div style={{ fontSize:"0.6rem", color:"#cc6600", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"6px" }}>⚒️ FORGE</div>
            <div style={{ fontSize:"1.4rem", fontWeight:900, color:"#fff", marginBottom:"10px" }}>$4.99<span style={{fontSize:"0.7rem",color:"#555"}}>/mois</span></div>
            {["✅ Prompts illimités","✅ Genre, Drums, Vocals, Guitar, Basse","✅ Structure & Time Signatures","✅ Exclude Tags","❌ Paroles IA","❌ Organic mode"].map(f => (
              <div key={f} style={{ fontSize:"0.68rem", color:f.startsWith("✅")?"#ccc":"#333", padding:"3px 0" }}>{f}</div>
            ))}
            <a href={TIERS.forge.stripe} target="_blank" rel="noreferrer" style={{ display:"block", width:"100%", marginTop:"12px", padding:"9px", background:"#cc6600", borderRadius:"6px", color:"#000", fontSize:"0.72rem", fontWeight:900, letterSpacing:"1px", textTransform:"uppercase", textDecoration:"none", textAlign:"center" }}>⚒️ COMMENCER</a>
          </div>

          {/* PRO */}
          <div style={{ background:"#1a0000", border:`1px solid ${RED}`, borderRadius:"10px", padding:"16px", position:"relative" }}>
            <div style={{ position:"absolute", top:"-10px", right:"12px", background:RED, color:"#000", fontSize:"0.55rem", fontWeight:900, letterSpacing:"1px", padding:"3px 8px", borderRadius:"10px", textTransform:"uppercase" }}>POPULAIRE</div>
            <div style={{ fontSize:"0.6rem", color:RED, letterSpacing:"2px", textTransform:"uppercase", marginBottom:"6px" }}>🔥 FORGE PRO</div>
            <div style={{ fontSize:"1.4rem", fontWeight:900, color:"#fff", marginBottom:"10px" }}>$8.99<span style={{fontSize:"0.7rem",color:"#555"}}>/mois</span></div>
            {["✅ Tout de FORGE +","✅ Paroles par IA illimitées","✅ Mode Organic / Anti-AI","✅ Historique 50 prompts","❌ Presets","❌ Export PDF"].map(f => (
              <div key={f} style={{ fontSize:"0.68rem", color:f.startsWith("✅")?"#ccc":"#333", padding:"3px 0" }}>{f}</div>
            ))}
            <a href={TIERS.pro.stripe} target="_blank" rel="noreferrer" style={{ display:"block", width:"100%", marginTop:"12px", padding:"9px", background:RED, borderRadius:"6px", color:"#000", fontSize:"0.72rem", fontWeight:900, letterSpacing:"1px", textTransform:"uppercase", textDecoration:"none", textAlign:"center", boxShadow:`0 2px 14px #ff000055` }}>🔥 COMMENCER</a>
          </div>

          {/* ELITE */}
          <div style={{ background:"#0f0015", border:`1px solid #aa00ff44`, borderRadius:"10px", padding:"16px" }}>
            <div style={{ fontSize:"0.6rem", color:"#aa00ff", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"6px" }}>💀 FORGE ELITE</div>
            <div style={{ fontSize:"1.4rem", fontWeight:900, color:"#fff", marginBottom:"10px" }}>$14.99<span style={{fontSize:"0.7rem",color:"#555"}}>/mois</span></div>
            {["✅ Tout de FORGE PRO +","✅ Presets sauvegardables illimités","✅ Export PDF du prompt","✅ Accès prioritaire nouvelles features","✅ Badge ELITE dans l'app","✅ Support prioritaire direct"].map(f => (
              <div key={f} style={{ fontSize:"0.68rem", color:"#ccc", padding:"3px 0" }}>{f}</div>
            ))}
            <a href={TIERS.elite.stripe} target="_blank" rel="noreferrer" style={{ display:"block", width:"100%", marginTop:"12px", padding:"9px", background:"#aa00ff", borderRadius:"6px", color:"#fff", fontSize:"0.72rem", fontWeight:900, letterSpacing:"1px", textTransform:"uppercase", textDecoration:"none", textAlign:"center" }}>💀 COMMENCER</a>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ textAlign:"center", padding:"24px 20px", borderTop:"1px solid #1a1a1a", color:"#333", fontSize:"0.62rem", letterSpacing:"2px" }}>
        METAL PROMPT FORGE · BUILT FOR METALHEADS · 2026
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════
export default function App({ user, onLogout }) {
  const [view, setView] = useState("landing"); // "landing" | "app"
  const [tab, setTab] = useState("genre");
  const [showPaywall, setShowPaywall] = useState(false);

  // Tier from Supabase
  const [promptCount, setPromptCount] = useState(0);
  const [userTier, setUserTier] = useState("free");

  useEffect(() => {
    if (user?.email) {
      supabase.from('users').select('tier, prompts_used, lyrics_used')
        .eq('email', user.email).single()
        .then(({ data }) => {
          if (data) {
            setUserTier(data.tier || "free");
            setPromptCount(data.prompts_used || 0);
          }
        });
    }
  }, [user]);

  const isForge = userTier === "forge" || userTier === "pro" || userTier === "elite";
  const isPro = userTier === "pro" || userTier === "elite";
  const isElite = userTier === "elite";
  const tierColor = TIERS[userTier]?.color || "#444";
  const tierBadge = TIERS[userTier]?.badge || null;

  const LIMITS = {
    free:  { prompts: 5,   lyrics: 0 },
    forge: { prompts: 10,  lyrics: 10 },
    pro:   { prompts: 100, lyrics: 100 },
    elite: { prompts: 500, lyrics: 500 },
  };
  const limit = LIMITS[userTier] || LIMITS.free;

  const useSet = (init=[]) => {
    const [s, setS] = useState(new Set(init));
    const toggle = v => setS(p=>{ const n=new Set(p); n.has(v)?n.delete(v):n.add(v); return n; });
    return [s, toggle];
  };

  const [genres,  tGenre]  = useSet(["deathcore","metalcore"]);
  const [mood,    tMood]   = useSet(["crushing and heavy","groovy and headbang-worthy"]);
  const [drums,   tDrums]  = useSet(["blast beats","double bass drumming"]);
  const [drumP,   tDrumP]  = useSet(["triggered drums"]);
  const [vocals,  tVocal]  = useSet(["guttural death growls","pig squeals"]);
  const [vfx,     tVfx]    = useSet([]);
  const [guitar,  tGuitar] = useSet(["chugging riffs","palm muting"]);
  const [tuning,  tTuning] = useSet(["drop B tuning"]);
  const [gprod,   tGprod]  = useSet(["heavy distortion","layered guitar tracks"]);
  const [bassStyle, tBassStyle] = useSet(["fingerstyle bass"]);
  const [bassTech,  tBassTech]  = useSet([]);
  const [bassTone,  tBassTone]  = useSet(["distorted bass"]);
  const [bassTuning,tBassTuning]= useSet(["bass drop B"]);
  const [bassProd,  tBassProd]  = useSet(["sub-bass boosted"]);
  const [sax,     tSax]    = useSet([]);
  const [brass,   tBrass]  = useSet([]);
  const [keys,    tKeys]   = useSet([]);
  const [strings, tStr]    = useSet([]);
  const [prod,    tProd]   = useSet(["heavy production","modern metal production"]);
  const [orgRec,  tOrgRec] = useSet([]);
  const [orgDrm,  tOrgDrm] = useSet([]);
  const [orgVoc,  tOrgVoc] = useSet([]);
  const [orgGtr,  tOrgGtr] = useSet([]);
  const [structs, tStruct] = useSet(["intro","verse","chorus","breakdown","outro"]);
  const [themes,  tTheme]  = useSet(["mort et décomposition"]);
  const [latmo,   tLatmo]  = useSet(["sombre et menaçant"]);
  const [lblocks, tLblock] = useSet(["verse","chorus","breakdown"]);
  const [lang,    tLang]   = useSet(["en"]);
  const [lyricsHistory, setLyricsHistory] = useState([]);
  const [lyricsAngle,   setLyricsAngle]   = useState("");
  const [lyricsNarrator,setLyricsNarrator]= useState("first");
  const [lyricsTense,   setLyricsTense]   = useState("present");
  const [bannedWords,   setBannedWords]   = useState("");
  const [blockTimeSig,  setBlockTimeSig]  = useState({});
  const [globalTimeSig, setGlobalTimeSig] = useState("4/4");
  const TIME_SIGS = ["4/4","3/4","6/8","5/4","7/8","12/8","9/8","11/8","2/4","7/4","5/8","13/8"];
  const setBlockTS = (k,sig) => setBlockTimeSig(p=>({...p,[k]:sig}));
  const clearBlockTS = (k) => setBlockTimeSig(p=>{const n={...p};delete n[k];return n;});
  const [exclGenre, tExclGenre] = useSet([]);
  const [exclVocal, tExclVocal] = useSet([]);
  const [exclProd,  tExclProd]  = useSet([]);
  const [exclInst,  tExclInst]  = useSet([]);
  const [exclCustom, setExclCustom] = useState("");
  const [excludeTxt, setExcludeTxt] = useState("");
  const [heavy,  setHeavy]  = useState(9);
  const [groove, setGroove] = useState(6);
  const [chaos,  setChaos]  = useState(7);
  const [melody, setMelody] = useState(3);
  const [bpm, setBpmVal] = useState(180);
  const setBPM = v => setBpmVal(Math.max(60,Math.min(280,v)));
  const [styleTxt,    setStyleTxt]    = useState("");
  const [structTxt,   setStructTxt]   = useState("");
  const [structNotes, setStructNotes] = useState("");
  const [fullTxt,     setFullTxt]     = useState("");
  const [keywords,    setKeywords]    = useState("");
  const [lyricsTxt,   setLyricsTxt]   = useState("");
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsErr,   setLyricsErr]   = useState("");

  // History (PRO)
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mpf_history")||"[]"); } catch { return []; }
  });

  const saveToHistory = (prompt) => {
    if (!isPro && !isElite) return;
    const entry = { date: new Date().toLocaleDateString("fr-CA"), prompt, id: Date.now() };
    const updated = [entry, ...history].slice(0,50);
    setHistory(updated);
    try { localStorage.setItem("mpf_history", JSON.stringify(updated)); } catch {}
  };

  // ── GENERATE ──
  const generate = () => {
    if (promptCount >= limit.prompts) { setShowPaywall(true); return; }

    const allOrganic = [...orgRec,...orgDrm,...orgVoc,...orgGtr];
    const extraInst  = [...bassStyle,...bassTech,...bassTone,...bassTuning,...bassProd,...sax,...brass,...keys,...strings];
    const allExclude = [...exclGenre,...exclVocal,...exclProd,...exclInst,...exclCustom.split(",").map(s=>s.trim()).filter(Boolean)];
    const bpmTag = `${bpm} BPM`;
    const styleTags = [...[...genres],...[...drums],...[...guitar].slice(0,3),...[...tuning].slice(0,1),...extraInst,...[...vocals].slice(0,3),...[...mood].slice(0,3),...[...prod].slice(0,2),...allOrganic.slice(0,4),bpmTag];
    const styleStr = styleTags.join(", ");

    const ts = k => blockTimeSig[k]||globalTimeSig;
    const blockMapClean = {
      intro:`[Intro: ${ts("intro")}]`,buildup:`[Build-up: ${ts("buildup")}]`,verse:`[Verse: ${ts("verse")}]`,
      prechorus:`[Pre-Chorus: ${ts("prechorus")}]`,chorus:`[Chorus: ${ts("chorus")}]`,breakdown:`[Breakdown: ${ts("breakdown")}]`,
      halftime:`[Half-Time: ${ts("halftime")}]`,blastsection:`[Blast Section: ${ts("blastsection")}]`,drop:`[Drop: ${ts("drop")}]`,
      solo:`[Guitar Solo: ${ts("solo")}]`,interlude:`[Interlude: ${ts("interlude")}]`,atmosphericbreak:`[Atmospheric Break: ${ts("atmosphericbreak")}]`,
      spokenword:`[Spoken Word: ${ts("spokenword")}]`,gangchant:`[Gang Chant: ${ts("gangchant")}]`,scream:`[Scream Section: ${ts("scream")}]`,
      riffbreak:`[Riff Break: ${ts("riffbreak")}]`,bridge:`[Bridge: ${ts("bridge")}]`,outro:`[Outro: ${ts("outro")}]`,
    };
    const blockMapNotes = {
      intro:`Intro → ${drums.has("blast beats")?"blast beat fury":"crushing riff"}, ${ts("intro")}`,
      buildup:`Build-up → ${heavy>=8?"murs de distortion":"couches progressives"}, pas de voix, ${ts("buildup")}`,
      verse:`Verse → ${vocals.has("pig squeals")?"pig squeal + ":""}growls sur ${guitar.has("chugging riffs")?"chugging riffs":"riffs lourds"}, ${ts("verse")}`,
      prechorus:`Pre-Chorus → tension montante, ${groove>=5?"groove qui monte":"agression"}, ${ts("prechorus")}`,
      chorus:`Chorus → ${groove>=6?"riff groovy headbang":"assaut total"}, ${ts("chorus")}`,
      breakdown:`Breakdown → ${groove>=7?"groove lent, gang shouts":"mosh brutal half-time"}, ${ts("breakdown")}`,
      halftime:`Half-Time → ${bpm>160?Math.round(bpm/2)+" BPM ressenti":bpm+" BPM"}, palm-mute lourd, ${ts("halftime")}`,
      blastsection:`Blast Section → blast beats ${bpm} BPM, chaos pur, ${ts("blastsection")}`,
      drop:`Drop → silence puis riff dévastateur, ${heavy>=8?"sub-bass":"wall of sound"}, ${ts("drop")}`,
      solo:`Guitar Solo → ${guitar.has("sweep picking solos")?"sweep shred":"riff lead agressif"}, ${ts("solo")}`,
      interlude:`Interlude → instrumental, ${extraInst.length>0?extraInst[0]:"atmosphérique"}, sans voix, ${ts("interlude")}`,
      atmosphericbreak:`Atmospheric Break → ${chaos>=7?"dissonance":"calme avant tempête"}, batterie minimale, ${ts("atmosphericbreak")}`,
      spokenword:`Spoken Word → voix seule, ton ${[...latmo][0]||"menaçant"}, ${ts("spokenword")}`,
      gangchant:`Gang Chant → chant collectif, énergie mosh pit, ${ts("gangchant")}`,
      scream:`Scream Section → cri brut sans instruments, ${ts("scream")}`,
      riffbreak:`Riff Break → guitares seules, ${guitar.has("chugging riffs")?"chugging":"riff lourd"}, ${ts("riffbreak")}`,
      bridge:`Bridge → ${chaos>=7?"section chaotique":"rupture atmosphérique"}, ${ts("bridge")}`,
      outro:`Outro → ${chaos>=7?"frenzy blast beat":"breakdown final"}, ${ts("outro")}`,
    };

    const activeBlocks = [...structs];
    const structStr = activeBlocks.map(b=>blockMapClean[b]||"").filter(Boolean).join("\n");
    const structNotesTxt = activeBlocks.map(b=>blockMapNotes[b]||"").filter(Boolean).join("\n");
    const heavyD  = heavy>=8?"extremely heavy and crushing":heavy>=5?"heavy and punishing":"moderately heavy";
    const grooveD = groove>=8?"deeply groovy with headbang-inducing hooks":groove>=5?"mid-paced groovy sections":"straight aggressive";
    const chaosD  = chaos>=8?"chaotic and unpredictable":chaos>=5?"controlled chaos":"tight and structured";
    const melodyD = melody>=7?"rich melodic leads":melody>=4?"sparse melodic accents":"almost no melody, pure brutality";
    const full = `=== SUNO STYLE TAGS ===\n${styleStr}\n\n=== STRUCTURE ===\n${structStr}\n\n=== PRODUCTION NOTES ===\n${heavyD}. ${grooveD}. ${chaosD}. ${melodyD}.\nTempo: ${bpm} BPM.${extraInst.length>0?"\nInstruments: "+extraInst.join(", ")+".":""}${allOrganic.length>0?"\n\n=== ORGANIC ===\n"+allOrganic.join(", "):""}`;
    const excStr = allExclude.join(", ");
    setStyleTxt(styleStr); setExcludeTxt(excStr); setStructTxt(structStr||"(aucun bloc)"); setStructNotes(structNotesTxt); setFullTxt(full);
    
    const newCount = promptCount + 1;
    setPromptCount(newCount);
    if (user?.email) {
      supabase.from('users').upsert({ email: user.email, prompts_used: newCount }, { onConflict: 'email' });
    }
    saveToHistory(styleStr);
    setTab("output");
  };

  // ── GENERATE LYRICS ──
  const generateLyrics = async () => {
    if (!isPro) { setShowPaywall(true); return; }
    setLyricsLoading(true); setLyricsErr(""); setLyricsTxt("");
    const langStr = lang.has("fr")?"french":lang.has("mix")?"a mix of english and french":"english";
    const genreList = [...genres].join("/")||"deathcore";
    const historyWords = lyricsHistory.flatMap(h=>h.match(/\b\w{4,}\b/g)||[]).filter((w,i,a)=>a.indexOf(w)===i).slice(0,40);
    const manualBanned = bannedWords.split(",").map(s=>s.trim()).filter(Boolean);
    const allBanned = [...new Set([...historyWords,...manualBanned])];
    const blockInstr = [...lblocks].map(b=>{
      if(b==="verse")return"[Verse 1] and [Verse 2] — 4 lines each, DIFFERENT imagery";
      if(b==="prechorus")return"[Pre-Chorus] — 2 lines, build tension";
      if(b==="chorus")return"[Chorus] — 4 lines, powerful hook, brutal";
      if(b==="breakdown")return"[Breakdown] — 2-4 SHORT lines, under 6 words each, mosh rhythm";
      if(b==="halftime")return"[Half-Time] — 3 crushing lines, slow and heavy";
      if(b==="blastsection")return"[Blast Section] — 3-4 fragmented chaotic lines";
      if(b==="drop")return"[Drop] — 1-2 lines MAXIMUM, devastating";
      if(b==="gangchant")return"[Gang Chant] — 1-3 lines, simple, to be shouted";
      if(b==="solo")return"[Guitar Solo] — write: (guitar solo)";
      if(b==="outro")return"[Outro] — 2-3 lines, final statement";
      return`[${b}] — appropriate metal content`;
    }).filter(Boolean).join("\n");
    const seeds = ["Focus on physical sensations and body horror.","Use industrial and machine metaphors.","Write from the perspective of the void.","Use geological destruction metaphors.","Focus on psychological collapse."];
    const creativeSeed = seeds[Math.floor(Math.random()*seeds.length)];
    const prompt = `You are a creative ${genreList} metal lyricist. Write lyrics in ${langStr}.
NARRATOR: ${lyricsNarrator==="first"?"First person":"lyricsNarrator==='second'?'Second person':'Third person'"}.
TENSE: ${lyricsTense==="present"?"Present":"lyricsTense==='past'?'Past':'Future'"}.
THEMES: ${[...themes].join(", ")||"death, chaos"}.
ATMOSPHERE: ${[...latmo].join(", ")||"dark, menacing"}.
${lyricsAngle?`ANGLE: ${lyricsAngle}`:`CREATIVE ANGLE: ${creativeSeed}`}
${keywords?`KEYWORDS: ${keywords}.`:""}
STRUCTURE:\n${blockInstr}
RULES:
- NEVER use: darkness, blood, pain, rise, fall, burning, ashes, chains, void, shadows, broken, shattered
- FORBIDDEN: ${allBanned.slice(0,25).join(", ")||"none"}
- Each section = completely different metaphors
- Be SPECIFIC and CONCRETE
OUTPUT: ONLY raw lyrics, zero commentary.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1200,messages:[{role:"user",content:prompt}]})});
      const data = await res.json();
      const text = data.content?.find(b=>b.type==="text")?.text||"Erreur.";
      setLyricsTxt(text);
      setLyricsHistory(prev=>[...prev.slice(-2),text]);
      const newCount = promptCount+1;
      setPromptCount(newCount);
      try{localStorage.setItem("mpf_count",String(newCount));}catch{}
    } catch(e) { setLyricsErr("Erreur API : "+e.message); }
    setLyricsLoading(false);
  };

  const sendLyricsToOutput = () => { setFullTxt((fullTxt?fullTxt+"\n\n":"")+`=== PAROLES ===\n${lyricsTxt}`); setTab("output"); };

  // ── LANDING ──
  if (view==="landing") return <LandingPage onEnter={()=>setView("app")} />;

  // ── TABS ──
  const TABS = [
    {id:"genre",label:"🎸 Genre"},{id:"drums",label:"🥁 Drums"},{id:"vocals",label:"🎙️ Vocals"},
    {id:"guitar",label:"🎵 Guitar"},{id:"bass",label:"🎸 Basse"},{id:"instru",label:"🎷 Instru"},{id:"structure",label:"📐 Structure"},
    {id:"paroles",label:"✍️ Paroles"},{id:"organic",label:"🌿 Organic"},{id:"exclude",label:"🚫 Exclude"},
    {id:"output",label:"📋 Output"},
    ...(isPro||isElite?[{id:"history",label:"🕒 Historique"}]:[]),
  ];

  return (
    <div style={S.wrap}>
      <style>{css}</style>
      {showPaywall && <PaywallModal onClose={()=>setShowPaywall(false)} usedCount={promptCount} />}

      {/* HEADER */}
      <div style={S.header}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"10px" }}>
          <div className="forge-title" style={S.h1}>⚰️ Metal Prompt Forge</div>
          {tierBadge && <span style={{ background:tierColor, color: isElite?"#fff":"#000", fontSize:"0.5rem", fontWeight:900, padding:"2px 7px", borderRadius:"8px", letterSpacing:"1px" }}>{tierBadge}</span>}
        </div>
        <div style={S.sub}>Suno AI · Deathcore × Metalcore × Groove Metal</div>
        <div style={{ fontSize:"0.58rem", color:"#555", marginTop:"4px", display:"flex", justifyContent:"center", gap:"10px", alignItems:"center" }}>
          <span>{promptCount}/{limit.prompts} prompts · <a href={TIERS.pro.stripe} target="_blank" rel="noreferrer" style={{ color:RED, textDecoration:"none", fontWeight:700 }}>Voir les plans →</a></span>
          {user && <button onClick={onLogout} style={{ background:"none", border:"1px solid #333", borderRadius:"4px", color:"#555", fontSize:"0.55rem", padding:"2px 6px", cursor:"pointer" }}>Déconnexion</button>}
        </div>
      </div>

      {/* NAV */}
      <div className="nav-scroll" style={{ background:"#0f0f0f", borderBottom:"1px solid #1a1a1a" }}>
        {TABS.map(t=><button key={t.id} style={S.navBtn(tab===t.id)} onClick={()=>setTab(t.id)}>{t.label}</button>)}
      </div>

      {/* ── GENRE ── */}
      {tab==="genre" && <div style={S.page}>
        <div style={S.card}><div style={S.ctitle}>🤘 Genres principaux</div><Tags list={GENRES} sel={genres} toggle={tGenre}/></div>
        <div style={S.card}><div style={S.ctitle}>🌡️ Intensité globale</div>
          <Slider label="Heaviness" val={heavy} setVal={setHeavy}/>
          <Slider label="Groove Factor" val={groove} setVal={setGroove}/>
          <Slider label="Chaos Level" val={chaos} setVal={setChaos}/>
          <Slider label="Melodic Touch" val={melody} setVal={setMelody}/>
        </div>
        <div style={S.card}><div style={S.ctitle}>🎨 Mood / Vibe</div><Tags list={MOOD} sel={mood} toggle={tMood}/></div>
        <div style={{height:80}}/>
      </div>}

      {/* ── DRUMS ── */}
      {tab==="drums" && <div style={S.page}>
        <div style={S.card}><div style={S.ctitle}>🥁 Style de batterie</div><Tags list={DRUMS} sel={drums} toggle={tDrums}/></div>
        <div style={S.card}>
          <div style={S.ctitle}>⚡ Tempo (BPM)</div>
          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px"}}>
            <div style={{background:"#0d0d0d",border:`2px solid ${RED}`,borderRadius:"8px",padding:"8px 14px",textAlign:"center",minWidth:"76px"}}>
              <div style={{fontSize:"1.5rem",fontWeight:900,color:RED}}>{bpm}</div>
              <div style={{fontSize:"0.5rem",color:"#555",letterSpacing:"1px"}}>BPM</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
              <button onClick={()=>setBPM(bpm+5)} style={{width:"36px",height:"36px",borderRadius:"50%",background:"#1a1a1a",border:"1.5px solid #222",color:"#ccc",cursor:"pointer",fontSize:"1rem"}}>▲</button>
              <button onClick={()=>setBPM(bpm-5)} style={{width:"36px",height:"36px",borderRadius:"50%",background:"#1a1a1a",border:"1.5px solid #222",color:"#ccc",cursor:"pointer",fontSize:"1rem"}}>▼</button>
            </div>
            <div style={{flex:1}}><input type="range" min={60} max={280} value={bpm} style={{"--pct":((bpm-60)/220*100).toFixed(1)+"%"}} onChange={e=>setBPM(parseInt(e.target.value))}/></div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}>
            {[[90,"Doom"],[120,"Groove"],[140,"Metal"],[160,"Hardcore"],[180,"Deathcore"],[220,"Blast"],[260,"Grind"]].map(([v,l])=>(
              <button key={v} onClick={()=>setBPM(v)} style={{background:"#181818",border:"1px solid #222",borderRadius:"6px",padding:"5px 10px",fontSize:"0.66rem",color:"#777",cursor:"pointer"}}>{l} {v}</button>
            ))}
          </div>
        </div>
        <div style={S.card}><div style={S.ctitle}>🔧 Production batterie</div><Tags list={DRUM_PROD} sel={drumP} toggle={tDrumP}/></div>
        <div style={{height:80}}/>
      </div>}

      {/* ── VOCALS ── */}
      {tab==="vocals" && <div style={S.page}>
        <div style={S.card}><div style={S.ctitle}>🎙️ Types de voix</div><Tags list={VOCALS} sel={vocals} toggle={tVocal}/></div>
        <div style={S.card}><div style={S.ctitle}>🎛️ Effets vocaux</div><Tags list={VFX} sel={vfx} toggle={tVfx}/></div>
        <div style={{height:80}}/>
      </div>}

      {/* ── GUITAR ── */}
      {tab==="guitar" && <div style={S.page}>
        <div style={S.card}><div style={S.ctitle}>🎸 Techniques guitare</div><Tags list={GUITAR} sel={guitar} toggle={tGuitar}/></div>
        <div style={S.card}><div style={S.ctitle}>🎛️ Accordage</div><Tags list={TUNING} sel={tuning} toggle={tTuning}/></div>
        <div style={S.card}><div style={S.ctitle}>🔊 Production guitare</div><Tags list={GPROD} sel={gprod} toggle={tGprod}/></div>
        <div style={{height:80}}/>
      </div>}

      {/* ── BASSE ── */}
      {tab==="bass" && <div style={S.page}>
        <div style={{...S.card,borderColor:"#ff2e2e22",background:"#110000"}}>
          <div style={{...S.ctitle,color:RED}}>🎸 BASSE — Low-end brutal</div>
          <div style={{fontSize:"0.7rem",color:"#666",lineHeight:1.8}}>Configure le son de basse qui va écraser les côtes de ton auditeur. Ces tags s'ajoutent directement aux Style Tags.</div>
        </div>
        <div style={S.card}>
          <div style={S.ctitle}>🎸 Style de jeu</div>
          <Tags list={BASS_STYLE} sel={bassStyle} toggle={tBassStyle}/>
        </div>
        <div style={S.card}>
          <div style={S.ctitle}>🤘 Techniques avancées</div>
          <Tags list={BASS_TECH} sel={bassTech} toggle={tBassTech}/>
        </div>
        <div style={S.card}>
          <div style={S.ctitle}>🔊 Tone / Son</div>
          <Tags list={BASS_TONE} sel={bassTone} toggle={tBassTone}/>
          <div style={{marginTop:"10px",padding:"8px 10px",background:"#1a0000",border:"1px solid #5a0000",borderRadius:"6px",fontSize:"0.68rem",color:"#cc4400",lineHeight:1.7}}>
            🔑 <strong>Combo low-end recommandé :</strong><br/>
            distorted bass + sub bass + chest-crushing bass
          </div>
        </div>
        <div style={S.card}>
          <div style={S.ctitle}>🎛️ Accordage basse</div>
          <Tags list={BASS_TUNING} sel={bassTuning} toggle={tBassTuning}/>
        </div>
        <div style={S.card}>
          <div style={S.ctitle}>⚡ Production basse</div>
          <Tags list={BASS_PROD} sel={bassProd} toggle={tBassProd}/>
        </div>
        <div style={{height:80}}/>
      </div>}

      {/* ── INSTRU ── */}
      {tab==="instru" && <div style={S.page}>
        <div style={S.card}><div style={S.ctitle}>🎷 Saxophone</div><Tags list={SAX} sel={sax} toggle={tSax}/></div>
        <div style={S.card}><div style={S.ctitle}>🎺 Cuivres</div><Tags list={BRASS} sel={brass} toggle={tBrass}/></div>
        <div style={S.card}><div style={S.ctitle}>🎹 Claviers & Synth</div><Tags list={KEYS} sel={keys} toggle={tKeys}/></div>
        <div style={S.card}><div style={S.ctitle}>🎻 Cordes</div><Tags list={STRINGS} sel={strings} toggle={tStr}/></div>
        <div style={{height:80}}/>
      </div>}

      {/* ── STRUCTURE ── */}
      {tab==="structure" && <div style={S.page}>
        <div style={S.card}>
          <div style={S.ctitle}>🎼 Mesure globale</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"7px",marginBottom:"8px"}}>
            {TIME_SIGS.map(ts=><span key={ts} onClick={()=>setGlobalTimeSig(ts)} style={{...S.tag(globalTimeSig===ts),fontFamily:"monospace",fontSize:"0.8rem",fontWeight:700}}>{ts}</span>)}
          </div>
        </div>
        <div style={S.card}>
          <div style={S.ctitle}>📐 Blocs & Mesures</div>
          {STRUCT_BLOCKS.map(b=>{
            const activeSig = blockTimeSig[b.k]||globalTimeSig;
            const hasOverride = !!blockTimeSig[b.k];
            return (
              <div key={b.k} style={{...S.structBlock,flexDirection:"column",alignItems:"stretch",gap:"6px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{fontSize:"1rem"}}>{b.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.78rem",fontWeight:600,color:structs.has(b.k)?"#e0e0e0":"#444"}}>{b.name}</div>
                    <div style={{fontSize:"0.58rem",color:"#333"}}>{b.desc}</div>
                  </div>
                  <button style={S.togBtn(structs.has(b.k))} onClick={()=>tStruct(b.k)}>{structs.has(b.k)?"✓":"+"}</button>
                </div>
                {structs.has(b.k) && (
                  <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap",paddingLeft:"28px"}}>
                    <span style={{fontSize:"0.58rem",color:"#444",letterSpacing:"1px",textTransform:"uppercase"}}>Mesure:</span>
                    {TIME_SIGS.map(ts=>(
                      <span key={ts} onClick={()=>blockTimeSig[b.k]===ts?clearBlockTS(b.k):setBlockTS(b.k,ts)}
                        style={{background:activeSig===ts?(hasOverride?"#002a00":"#1a1a00"):"#111",border:`1px solid ${activeSig===ts?(hasOverride?"#4caf50":"#888800"):"#222"}`,borderRadius:"4px",padding:"3px 7px",fontSize:"0.65rem",cursor:"pointer",color:activeSig===ts?(hasOverride?"#4caf50":"#cccc00"):"#444",fontFamily:"monospace",fontWeight:activeSig===ts?700:400}}>{ts}</span>
                    ))}
                    {hasOverride && <span onClick={()=>clearBlockTS(b.k)} style={{fontSize:"0.58rem",color:"#ff5555",cursor:"pointer",padding:"3px 6px",background:"#1a0000",border:"1px solid #5a0000",borderRadius:"4px"}}>✕</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={S.card}><div style={S.ctitle}>🎚️ Production globale</div><Tags list={PROD} sel={prod} toggle={tProd}/></div>
        <div style={{height:80}}/>
      </div>}

      {/* ── PAROLES ── */}
      {tab==="paroles" && <div style={S.page}>
        <div style={S.card}><div style={S.ctitle}>☠️ Thème principal</div><Tags list={THEMES} sel={themes} toggle={tTheme}/></div>
        <div style={S.card}><div style={S.ctitle}>🌑 Atmosphère</div><Tags list={LYRIC_ATMO} sel={latmo} toggle={tLatmo}/></div>
        <div style={S.card}>
          <div style={S.ctitle}>🎯 Angle créatif (optionnel)</div>
          <input value={lyricsAngle} onChange={e=>setLyricsAngle(e.target.value)} placeholder="ex: vue d'une machine qui s'éveille, métaphores de noyade..."
            style={{width:"100%",background:"#111",border:"1px solid #222",borderRadius:"6px",padding:"10px",color:"#e0e0e0",fontSize:"0.78rem"}}/>
        </div>
        <div style={{display:"flex",gap:"10px"}}>
          <div style={{...S.card,flex:1}}>
            <div style={S.ctitle}>👁️ Narrateur</div>
            {[["first","1ère pers."],["second","2ème pers."],["third","3ème pers."]].map(([v,l])=>(
              <div key={v} onClick={()=>setLyricsNarrator(v)} style={{padding:"7px 10px",borderRadius:"6px",marginBottom:"5px",cursor:"pointer",fontSize:"0.72rem",background:lyricsNarrator===v?"#2a0000":"#111",border:`1px solid ${lyricsNarrator===v?RED:"#222"}`,color:lyricsNarrator===v?"#ff7070":"#666"}}>{l}</div>
            ))}
          </div>
          <div style={{...S.card,flex:1}}>
            <div style={S.ctitle}>⏱️ Temps verbal</div>
            {[["present","Présent"],["past","Passé"],["future","Futur"]].map(([v,l])=>(
              <div key={v} onClick={()=>setLyricsTense(v)} style={{padding:"7px 10px",borderRadius:"6px",marginBottom:"5px",cursor:"pointer",fontSize:"0.72rem",background:lyricsTense===v?"#2a0000":"#111",border:`1px solid ${lyricsTense===v?RED:"#222"}`,color:lyricsTense===v?"#ff7070":"#666"}}>{l}</div>
            ))}
          </div>
        </div>
        <div style={S.card}>
          <div style={S.ctitle}>🔑 Mots-clés</div>
          <input value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="ex: acier, fracture, signal, abîme..."
            style={{width:"100%",background:"#111",border:"1px solid #222",borderRadius:"6px",padding:"10px",color:"#e0e0e0",fontSize:"0.8rem"}}/>
        </div>
        <div style={S.card}>
          <div style={S.ctitle}>🚫 Mots bannis</div>
          <input value={bannedWords} onChange={e=>setBannedWords(e.target.value)} placeholder="ex: darkness, blood, rise, ashes..."
            style={{width:"100%",background:"#111",border:"1px solid #5a1100",borderRadius:"6px",padding:"10px",color:"#ff7070",fontSize:"0.8rem"}}/>
          {lyricsHistory.length>0 && <button onClick={()=>setLyricsHistory([])} style={{marginTop:"7px",padding:"5px 12px",background:"#1a0000",border:"1px solid #5a0000",borderRadius:"5px",color:"#ff5555",fontSize:"0.65rem",cursor:"pointer"}}>🗑️ Effacer mémoire ({lyricsHistory.length})</button>}
        </div>
        <div style={S.card}><div style={S.ctitle}>🌐 Langue</div><Tags list={[{v:"en",l:"🇺🇸 Anglais"},{v:"fr",l:"🇫🇷 Français"},{v:"mix",l:"🔀 Mix"}]} sel={lang} toggle={tLang}/></div>
        <div style={S.card}><div style={S.ctitle}>📐 Blocs à générer</div><Tags list={LYRIC_BLOCKS} sel={lblocks} toggle={tLblock}/></div>
        <button style={S.genBtn} onClick={generateLyrics} disabled={lyricsLoading}>{lyricsLoading?"⚙️ COMPOSITION...":"⚙️ GÉNÉRER LES PAROLES"}</button>
        {lyricsLoading && <div style={{textAlign:"center",padding:"20px"}}><div style={{fontSize:"1.8rem",animation:"spin 1s linear infinite",display:"inline-block"}}>⚙️</div><div style={{color:"#444",fontSize:"0.7rem",letterSpacing:"2px",marginTop:"8px"}}>CLAUDE COMPOSE...</div></div>}
        {lyricsErr && <div style={{color:"#ff5555",fontSize:"0.8rem",padding:"10px",background:"#1a0000",borderRadius:"8px",marginBottom:"10px"}}>{lyricsErr}</div>}
        {lyricsTxt && !lyricsLoading && (
          <div>
            <div style={S.outLbl}>✍️ Paroles générées</div>
            <div style={{...S.outBox,borderColor:"#ff2e2e33"}}><CopyBtn getText={()=>lyricsTxt}/><pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",fontSize:"0.8rem",lineHeight:1.9,color:"#ddd",paddingRight:"50px"}}>{lyricsTxt}</pre></div>
            <div style={{display:"flex",gap:"10px",marginBottom:"12px"}}>
              <button onClick={generateLyrics} style={{flex:1,padding:"10px",background:"#1a1a1a",border:"1px solid #222",borderRadius:"6px",color:"#888",fontSize:"0.72rem",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",cursor:"pointer"}}>🔄 Régénérer</button>
              <button onClick={sendLyricsToOutput} style={{flex:1,padding:"10px",background:"#0a1f00",border:"1px solid #4caf50",borderRadius:"6px",color:"#4caf50",fontSize:"0.72rem",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",cursor:"pointer"}}>📋 → Output</button>
            </div>
          </div>
        )}
        <div style={{height:80}}/>
      </div>}

      {/* ── ORGANIC ── */}
      {tab==="organic" && <div style={S.page}>
        <div style={{...S.card,borderColor:"#1a3a00",background:"#0a120a"}}>
          <div style={{...S.ctitle,color:"#4caf50"}}>💡 Anti-AI — Comment ça marche</div>
          <div style={{fontSize:"0.72rem",color:"#688",lineHeight:1.9}}>Ces tags poussent Suno vers un rendu plus <strong style={{color:"#8f8"}}>organique et humain</strong>. Active ce qui correspond à ton vibe.</div>
        </div>
        <div style={S.card}><div style={S.ctitle}>🎙️ Recording & Ambiance</div><Tags list={ORG_RECORD} sel={orgRec} toggle={tOrgRec}/></div>
        <div style={S.card}><div style={S.ctitle}>🥁 Batterie organique</div><Tags list={ORG_DRUMS} sel={orgDrm} toggle={tOrgDrm}/></div>
        <div style={S.card}><div style={S.ctitle}>🎙️ Voix organique</div><Tags list={ORG_VOCALS} sel={orgVoc} toggle={tOrgVoc}/></div>
        <div style={S.card}><div style={S.ctitle}>🎸 Guitares organiques</div><Tags list={ORG_GUITAR} sel={orgGtr} toggle={tOrgGtr}/></div>
        <div style={{...S.card,borderColor:"#3a0000",background:"#0f0000"}}>
          <div style={{...S.ctitle,color:"#ff5555"}}>🚫 Tags à ÉVITER (sonnent AI)</div>
          <div style={S.tags}>{ORG_AVOID.map(v=><span key={v} style={{background:"#1a0000",border:"1.5px solid #5a0000",borderRadius:"20px",padding:"5px 12px",fontSize:"0.72rem",color:"#ff5555",textDecoration:"line-through",opacity:0.6}}>{v}</span>)}</div>
        </div>
        <div style={{height:80}}/>
      </div>}

      {/* ── EXCLUDE ── */}
      {tab==="exclude" && <div style={S.page}>
        <div style={{...S.card,borderColor:"#3a0a00",background:"#0f0800"}}>
          <div style={{...S.ctitle,color:"#ff6633"}}>🚫 Comment ça fonctionne</div>
          <div style={{fontSize:"0.72rem",color:"#a86",lineHeight:1.9}}>Tags dans "Style of Music" précédés de <strong style={{color:"#ff5555"}}>"-"</strong> pour dire à Suno ce qu'il doit éviter.</div>
        </div>
        <div style={S.card}><div style={S.ctitle}>🎵 Genres à exclure</div><Tags list={EXCL_GENRES} sel={exclGenre} toggle={tExclGenre}/></div>
        <div style={S.card}><div style={S.ctitle}>🎙️ Voix à exclure</div><Tags list={EXCL_VOCALS} sel={exclVocal} toggle={tExclVocal}/></div>
        <div style={S.card}><div style={S.ctitle}>🔊 Production à exclure</div><Tags list={EXCL_PROD} sel={exclProd} toggle={tExclProd}/></div>
        <div style={S.card}><div style={S.ctitle}>🎸 Instruments à exclure</div><Tags list={EXCL_INSTRU} sel={exclInst} toggle={tExclInst}/></div>
        <div style={S.card}>
          <div style={S.ctitle}>✏️ Exclusions personnalisées</div>
          <input value={exclCustom} onChange={e=>setExclCustom(e.target.value)} placeholder="ex: piano, jazz, acoustic, soft..."
            style={{width:"100%",background:"#111",border:"1px solid #5a2200",borderRadius:"6px",padding:"10px",color:"#e0e0e0",fontSize:"0.8rem"}}/>
        </div>
        <div style={{height:80}}/>
      </div>}

      {/* ── OUTPUT ── */}
      {tab==="output" && <div style={S.page}>
        <div style={S.outLbl}>🎸 Style Tags — coller dans "Style of Music" Suno</div>
        <div style={{...S.outBox,borderColor:"#ff2e2e44",boxShadow:"0 0 12px #ff000011"}}>
          <CopyBtn getText={()=>styleTxt}/>
          <div style={{color:"#ff9090",paddingRight:"50px",fontSize:"0.8rem",lineHeight:1.8}}>{styleTxt||"Clique sur ⚙️ pour générer..."}</div>
        </div>
        {excludeTxt && <>
          <div style={S.outLbl}>🚫 Exclude Tags</div>
          <div style={{...S.outBox,borderColor:"#5a220033"}}>
            <CopyBtn getText={()=>excludeTxt.split(", ").map(t=>"-"+t).join(", ")}/>
            <div style={{color:"#ff6633",paddingRight:"50px",fontSize:"0.8rem",lineHeight:1.8,fontFamily:"monospace"}}>{excludeTxt.split(", ").map(t=>"-"+t).join(", ")}</div>
          </div>
        </>}
        <div style={S.outLbl}>📐 Structure — coller dans les paroles Suno</div>
        <div style={{...S.outBox,borderColor:"#00aa4433",background:"#050f05"}}>
          <CopyBtn getText={()=>structTxt}/>
          <div style={{background:"#0a1f0a",border:"1px solid #1a4a1a",borderRadius:"5px",padding:"6px 10px",marginBottom:"8px",fontSize:"0.6rem",color:"#4caf50",letterSpacing:"1px"}}>✅ SAFE — Balises pures uniquement</div>
          <pre style={{whiteSpace:"pre-wrap",fontFamily:"monospace",fontSize:"0.82rem",lineHeight:2,color:"#aaffaa",paddingRight:"50px"}}>{structTxt||"—"}</pre>
        </div>
        {structNotes && <>
          <div style={S.outLbl}>📋 Notes de prod — NE PAS coller dans Suno</div>
          <div style={{...S.outBox,borderColor:"#ff330022",background:"#0f0500"}}>
            <CopyBtn getText={()=>structNotes}/>
            <div style={{background:"#1f0a00",border:"1px solid #5a1a00",borderRadius:"5px",padding:"6px 10px",marginBottom:"8px",fontSize:"0.6rem",color:"#ff6633",letterSpacing:"1px"}}>⛔ RÉFÉRENCE SEULEMENT</div>
            <pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",fontSize:"0.72rem",lineHeight:1.8,color:"#aa7755",paddingRight:"50px"}}>{structNotes}</pre>
          </div>
        </>}
        <div style={S.outLbl}>📝 Prompt complet</div>
        <div style={S.outBox}>
          <CopyBtn getText={()=>fullTxt}/>
          <pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",fontSize:"0.75rem",lineHeight:1.8,color:"#bbb",paddingRight:"50px"}}>{fullTxt||"—"}</pre>
        </div>
        <div style={{...S.card,borderColor:"#1a3a1a",textAlign:"center"}}>
          <div style={{color:"#4caf50",fontSize:"0.65rem",letterSpacing:"2px",textTransform:"uppercase",fontWeight:700,marginBottom:"8px"}}>💡 Tips Suno</div>
          <div style={{fontSize:"0.7rem",color:"#555",lineHeight:1.9}}>
            • 8–12 tags optimaux dans Style of Music<br/>
            • Tags drums (blast beats, double bass) = impact maximal<br/>
            • [Breakdown] dans les paroles = breakdown garanti<br/>
            • pig squeals + guttural growls = combo deathcore parfait<br/>
            • saxophone + metal = son unique et brutal 🎷🤘
          </div>
        </div>
        <div style={{height:80}}/>
      </div>}

      {/* ── HISTORIQUE (PRO) ── */}
      {tab==="history" && (isPro||isElite) && <div style={S.page}>
        <div style={{...S.card,borderColor:"#ff2e2e22"}}>
          <div style={S.ctitle}>🕒 Historique PRO — {history.length}/50 prompts</div>
          {history.length===0 && <div style={{color:"#444",fontSize:"0.75rem",textAlign:"center",padding:"20px"}}>Aucun prompt encore. Génère quelque chose ! 🤘</div>}
          {history.map((h,i) => (
            <div key={h.id} style={{borderBottom:"1px solid #1a1a1a",padding:"10px 0"}}>
              <div style={{fontSize:"0.58rem",color:"#555",letterSpacing:"1px",marginBottom:"4px"}}>#{history.length-i} · {h.date}</div>
              <div style={{fontSize:"0.72rem",color:"#aaa",lineHeight:1.6,fontFamily:"monospace"}}>{h.prompt.slice(0,120)}...</div>
              <button onClick={()=>navigator.clipboard.writeText(h.prompt)} style={{marginTop:"5px",background:"none",border:"1px solid #222",borderRadius:"4px",color:"#555",fontSize:"0.6rem",padding:"3px 8px",cursor:"pointer"}}>COPY</button>
            </div>
          ))}
        </div>
        <div style={{height:80}}/>
      </div>}

      {/* FAB */}
      <button style={S.fab} onClick={generate} title="Générer le prompt">⚙️</button>
    </div>
  );
}
