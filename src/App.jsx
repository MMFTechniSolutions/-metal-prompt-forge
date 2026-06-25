import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase.js";

const RED = "#ff2e2e";
const DARK = "#0a0a0a";
const CARD = "#141414";

// ── i18n ──
const T = {
  en: {
    sub:"Suno AI · Deathcore × Metalcore × Groove Metal",
    tabs:{genre:"🎸 Genre",drums:"🥁 Drums",vocals:"🎙️ Vocals",instrums:"🎸 Instruments",structure:"📐 Structure",paroles:"✍️ Lyrics",organic:"🌿 Organic",exclude:"🚫 Exclude",output:"📋 Output",tuto:"📚 Learn",riff:"🔜 Soon",history:"🕒 History"},
    generate:"FORGE",generating:"FORGING...",
    step1t:"STEP 1 — Style of Music field",step1d:'Open Suno → Create → paste in "Style of Music" (max ~120 chars)',
    step2t:"STEP 2 — Lyrics field",step2d:"Paste structure blocks at the TOP of your lyrics. Suno reads them as instructions, not words to sing.",
    step3t:"STEP 3 — Production notes (DO NOT paste in Suno)",step3d:"Keep these for yourself — Suno would sing them as lyrics.",
    step4t:"STEP 4 — Exclude tags",step4d:"Add AFTER your style tags with minus sign: deathcore, -pop, -clean vocals",
    lockedMsg:"Requires",upgrade:"Upgrade →",logout:"Logout",
    warn:"⚠️ Auto-logout in 5 min (inactivity)",plans:"See plans →",prompts:"prompts",
    noPrompt:"Hit the anvil ⚒️ to forge your prompt!",
  },
  fr: {
    sub:"Suno AI · Deathcore × Metalcore × Groove Metal",
    tabs:{genre:"🎸 Genre",drums:"🥁 Drums",vocals:"🎙️ Vocals",instrums:"🎸 Instruments",structure:"📐 Structure",paroles:"✍️ Paroles",organic:"🌿 Organic",exclude:"🚫 Exclude",output:"📋 Output",tuto:"📚 Tuto",riff:"🔜 Bientôt",history:"🕒 Historique"},
    generate:"FORGER",generating:"FORGE EN COURS...",
    step1t:"ÉTAPE 1 — Champ Style of Music",step1d:'Ouvre Suno → Create → colle dans "Style of Music" (max ~120 car.)',
    step2t:"ÉTAPE 2 — Champ Paroles (Lyrics)",step2d:"Colle les blocs de structure EN HAUT de tes paroles. Suno les lit comme instructions, pas comme paroles à chanter.",
    step3t:"ÉTAPE 3 — Notes de prod (NE PAS coller dans Suno)",step3d:"Garde ces notes pour toi — Suno les chanterait comme des paroles.",
    step4t:"ÉTAPE 4 — Tags d'exclusion",step4d:"Ajoute APRÈS tes style tags avec un signe moins : deathcore, -pop, -voix claires",
    lockedMsg:"Nécessite",upgrade:"Passer au plan →",logout:"Déconnexion",
    warn:"⚠️ Déconnexion auto dans 5 min (inactivité)",plans:"Voir les plans →",prompts:"prompts",
    noPrompt:"Clique sur l'enclume ⚒️ pour forger ton prompt !",
  },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700;900&display=swap');
  @keyframes spin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes flicker   { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:.7} 95%{opacity:1} 97%{opacity:.8} }
  @keyframes pulseRed  { 0%,100%{box-shadow:0 0 0 0 #ff2e2e55} 50%{box-shadow:0 0 0 10px #ff2e2e00} }
  @keyframes slideUp   { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
  @keyframes hammerSwing {
    0%  { transform: rotate(-35deg) translateY(-6px); }
    40% { transform: rotate(18deg)  translateY(5px);  }
    65% { transform: rotate(-8deg)  translateY(2px);  }
    82% { transform: rotate(4deg)   translateY(1px);  }
    100%{ transform: rotate(0deg)   translateY(0px);  }
  }
  @keyframes spark {
    0%  { opacity:1; transform:scale(1) translate(var(--sx),var(--sy)); }
    100%{ opacity:0; transform:scale(0) translate(calc(var(--sx)*3),calc(var(--sy)*3)); }
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:#0a0a0a; font-family:'Inter',system-ui,sans-serif; }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:#111; }
  ::-webkit-scrollbar-thumb { background:#ff2e2e44; border-radius:2px; }
  .nav-scroll { scrollbar-width:none; overflow-x:auto; display:flex; flex-wrap:wrap; justify-content:center; }
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
  .slide-up    { animation:slideUp 0.5s ease forwards; }
  .pulse       { animation:pulseRed 2s infinite; }
  .hammer-anim { animation:hammerSwing 0.45s cubic-bezier(.36,.07,.19,.97) forwards; }
`;

// ── DATA ──
const GENRES_FREE  = ["deathcore","metalcore","death metal","groove metal"];
const GENRES_FORGE = ["djent","melodic deathcore","thrash metal","nu-metal"];
const GENRES_PRO   = ["mathcore","beatdown hardcore","technical death metal","blackened deathcore","melodic death metal","symphonic metal","progressive metalcore","industrial metal"];
const GENRES_ELITE = ["slam metal","black metal","sludge metal","post-metal","doom metal","progressive metal","atmospheric black metal","blackened death metal","grindcore","funeral doom","dissonant death metal","avant-garde metal"];
const GENRES_NEW = ["technical death metal","blackened deathcore","melodic death metal","symphonic metal","progressive metalcore","industrial metal","atmospheric black metal","blackened death metal","grindcore","funeral doom","dissonant death metal","avant-garde metal"];

const MOOD     = ["crushing and heavy","sinister and dark","chaotic and frantic","groovy and headbang-worthy","melodic and atmospheric","dissonant","intense and aggressive","dark and menacing","epic","raw and abrasive"];
const DRUMS    = ["blast beats","double bass drumming","half-time groove","polyrhythmic drums","breakbeat percussion","d-beat","syncopated rhythms","machine-gun double bass","gravity blast beats","hyperblast beats","skank beat","tom-heavy fills","china cymbal accents","groovy mid-tempo drums","tribal toms","stomp breakdown drums"];
const DRUM_PROD= ["triggered drums","live drum sound","massive snare","clicky kick drum","trashy cymbals","programmed drums","natural room drums","reverb-heavy drums","punchy compressed drums","organic acoustic kit","raw garage drums","tight modern production","huge ambient drums","lo-fi drum sound"];

const VOCALS_FREE  = ["guttural death growls","pig squeals","high-pitched screams","metalcore screams","raspy harsh vocals"];
const VOCALS_FORGE = ["mid-range harsh vocals","clean melodic chorus vocals","gang shouts","tortured screams","raspy mid screams","layered harsh vocals"];
const VOCALS_PRO   = ["whispered spoken word","demonic inhale vocals","falsetto screams","whisper-to-scream dynamics","guttural gurgles","fry screams"];
const VOCALS_ELITE = ["throat singing","black metal shrieks","operatic vocals","goblin vocals","spoken word narration","choir vocals","tunnel-throat gutturals"];

const VFX    = ["vocal reverb","vocal distortion","pitch-shifted vocals","dual vocal tracking","megaphone effect","layered vocal harmonies","telephone EQ vocals","reverb tail vocals","doubled screams","gated vocal fx"];
const GUITAR = ["chugging riffs","palm muting","pinch harmonics","tremolo picking","sweep picking solos","djent-style syncopated riffs","open string riffs","legato runs","tapping","whammy bar dives"];
const TUNING = ["standard E tuning","drop D tuning","drop C tuning","drop B tuning","drop A tuning","7-string guitar","8-string guitar"];
const GPROD  = ["heavy distortion","high gain amplifier","layered guitar tracks","tight low-end guitar tone","djent-style clean tone contrast","808 sub bass guitar","wall of sound guitar"];
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
const EXCL_GENRES = ["pop","jazz","classical","country","r&b","hip hop","electronic","edm","ambient","folk","reggae","latin","disco","funk","soul","gospel","blues","indie pop","synthpop","new age"];
const EXCL_VOCALS = ["clean vocals","autotune","pitch correction","electronic vocals","vocoder","falsetto","soft vocals","whisper vocals","pop vocals","processed vocals","digital vocal fx"];
const EXCL_PROD   = ["polished production","crisp mix","over-produced","digital production","perfect timing","quantized drums","sterile mix","radio mix"];
const EXCL_INSTRU = ["acoustic guitar","ukulele","bossa nova","flute","harp","banjo","mandolin","steel drum"];
const THEMES = ["mort et décomposition","apocalypse","chaos intérieur","guerre et destruction","trahison","démons et obscurité","résistance et rébellion","nihilisme","vengeance","aliénation et solitude","horreur cosmique","violence et brutalité"];
const LYRIC_ATMO = ["sombre et menaçant","poétique et métaphorique","direct et violent","philosophique","narratif comme une histoire","cri de rage"];
const THEME_TR = {"mort et décomposition":"death and decay","apocalypse":"apocalypse","chaos intérieur":"inner chaos","guerre et destruction":"war and destruction","trahison":"betrayal","démons et obscurité":"demons and darkness","résistance et rébellion":"resistance and rebellion","nihilisme":"nihilism","vengeance":"vengeance","aliénation et solitude":"alienation and solitude","horreur cosmique":"cosmic horror","violence et brutalité":"violence and brutality"};
const ATMO_TR = {"sombre et menaçant":"dark and menacing","poétique et métaphorique":"poetic and metaphorical","direct et violent":"direct and violent","philosophique":"philosophical","narratif comme une histoire":"narrative like a story","cri de rage":"cry of rage"};
const LYRIC_LANGS = [
  {v:"en",l:"🇺🇸 English"},{v:"fr",l:"🇫🇷 Français"},{v:"de",l:"🇩🇪 Deutsch"},
  {v:"es",l:"🇪🇸 Español"},{v:"sv",l:"🇸🇪 Svenska"},{v:"fi",l:"🇫🇮 Suomi"},
  {v:"no",l:"🇳🇴 Norsk"},{v:"mix",l:"🔀 Mix EN/FR"},
];
const LYRIC_LANG_MAP = {en:"english",fr:"french",de:"german",es:"spanish",sv:"swedish",fi:"finnish",no:"norwegian",mix:"a mix of english and french"};
const LYRIC_BLOCKS = [
  {v:"verse",l:"Verse x2"},{v:"prechorus",l:"Pre-Chorus"},{v:"chorus",l:"Chorus"},
  {v:"breakdown",l:"Breakdown"},{v:"halftime",l:"Half-Time"},{v:"blastsection",l:"Blast Section"},
  {v:"drop",l:"Drop"},{v:"buildup",l:"Build-up"},{v:"gangchant",l:"Gang Chant"},
  {v:"spokenword",l:"Spoken Word"},{v:"scream",l:"Scream"},{v:"riffbreak",l:"Riff Break"},
  {v:"interlude",l:"Interlude"},{v:"atmosphericbreak",l:"Atmo Break"},
  {v:"solo",l:"Guitar Solo"},{v:"bridge",l:"Bridge"},{v:"intro",l:"Intro"},{v:"outro",l:"Outro"},
];
const STRUCT_BLOCKS = [
  {k:"intro",icon:"🔥",name:"Intro",desc:"Riff d'ouverture brutal ou atmosphérique",descEn:"Brutal or atmospheric opening riff"},
  {k:"buildup",icon:"📈",name:"Build-up",desc:"Montée progressive avant explosion",descEn:"Gradual build before the explosion"},
  {k:"verse",icon:"⚡",name:"Verse",desc:"Couplet vocal haché sur riffs lourds",descEn:"Choppy vocal verse over heavy riffs"},
  {k:"prechorus",icon:"🌀",name:"Pre-Chorus",desc:"Tension avant le chorus",descEn:"Tension before the chorus"},
  {k:"chorus",icon:"💥",name:"Chorus",desc:"Hook principal, souvent plus groovy",descEn:"Main hook, often groovier"},
  {k:"breakdown",icon:"💀",name:"Breakdown",desc:"Section lente et écrasante, riff mosh",descEn:"Slow, crushing section, mosh riff"},
  {k:"halftime",icon:"🐢",name:"Half-Time",desc:"Section groove ralentie, lourd et hypnotique",descEn:"Slowed groove section, heavy and hypnotic"},
  {k:"blastsection",icon:"💨",name:"Blast Section",desc:"Blast beats purs, sans mélodie, chaos total",descEn:"Pure blast beats, no melody, total chaos"},
  {k:"drop",icon:"⬇️",name:"Drop",desc:"Chute brutale après une montée de tension",descEn:"Brutal drop after a tension build"},
  {k:"solo",icon:"🎸",name:"Guitar Solo",desc:"Solo lead shredding ou mélodique",descEn:"Shredding or melodic lead solo"},
  {k:"interlude",icon:"🎵",name:"Interlude",desc:"Section instrumentale entre les parties",descEn:"Instrumental section between parts"},
  {k:"atmosphericbreak",icon:"🌫️",name:"Atmospheric Break",desc:"Ambiance calme/sinistre, tension suspendue",descEn:"Calm/sinister ambience, suspended tension"},
  {k:"spokenword",icon:"🗣️",name:"Spoken Word",desc:"Section parlée/narrative, sans chant",descEn:"Spoken/narrative section, no singing"},
  {k:"gangchant",icon:"👊",name:"Gang Chant",desc:"Chant collectif type mosh pit",descEn:"Collective mosh-pit style chant"},
  {k:"scream",icon:"😱",name:"Scream Section",desc:"Cris purs, voix seule sans musique",descEn:"Pure screams, vocals alone, no music"},
  {k:"riffbreak",icon:"🎶",name:"Riff Break",desc:"Riff seul sans voix, groove pur",descEn:"Riff alone, no vocals, pure groove"},
  {k:"bridge",icon:"🌊",name:"Bridge",desc:"Section contrastée, tension dramatique",descEn:"Contrasting section, dramatic tension"},
  {k:"outro",icon:"☠️",name:"Outro",desc:"Fin explosive ou fade chaotique",descEn:"Explosive ending or chaotic fade"},
];
const GLOBAL_RHYTHMS = ["polyrhythmic","odd time signatures","progressive rhythms","syncopated rhythms","math metal feel","triplet feel","djent syncopation","shifting time signatures","asymmetric rhythms"];
const BLOCK_RHYTHMS = [
  {v:"straight driving rhythm",l:"Straight"},{v:"half-time feel",l:"Half-Time"},
  {v:"double-time feel",l:"Double-Time"},{v:"triplet groove",l:"Triplets"},
  {v:"syncopated",l:"Syncopé"},{v:"polyrhythmic feel",l:"Polyrhythm"},
  {v:"waltz feel",l:"Waltz (3)"},{v:"shuffle groove",l:"Shuffle"},
  {v:"odd phrasing",l:"Odd Phrase"},{v:"stop-start rhythm",l:"Stop-Start"},
  {v:"asymmetric groove",l:"Asymétrique"},{v:"pushed beat",l:"Pushed Beat"},
];

// ── TIERS ──
const TIERS = {
  free:  {id:"free",  label:"FREE",         price:"$0",       color:"#444",    badge:null},
  forge: {id:"forge", label:"⚒️ FORGE",      price:"$4.99/mois",color:"#cc6600",badge:"FORGE",stripe:"https://buy.stripe.com/4gM28t9RecTdgb88IvfQI00",
    features:["✅ Prompts illimités","✅ Genre, Drums, Vocals, Guitar, Basse","✅ Structure & Rhythm Feel","✅ BPM & Mood","❌ Paroles par IA","❌ Mode Organic / Anti-AI","❌ Exclude Tags","❌ Historique"],featuresEn:["✅ Unlimited prompts","✅ Genre, Drums, Vocals, Guitar, Bass","✅ Structure & Rhythm Feel","✅ BPM & Mood","❌ AI lyrics","❌ Organic / Anti-AI Mode","❌ Exclude Tags","❌ History"]},
  pro:   {id:"pro",   label:"🔥 FORGE PRO",  price:"$8.99/mois",color:"#ff2e2e",badge:"PRO",  stripe:"https://buy.stripe.com/3cI14pfby4mH6Ay7ErfQI01",
    features:["✅ Tout de FORGE +","✅ Paroles par IA illimitées","✅ Mode Organic / Anti-AI","✅ Historique 50 prompts","❌ Exclude Tags","❌ Presets","❌ Export PDF"],featuresEn:["✅ Everything in FORGE +","✅ Unlimited AI lyrics","✅ Organic / Anti-AI Mode","✅ History 50 prompts","❌ Exclude Tags","❌ Presets","❌ PDF export"]},
  elite: {id:"elite", label:"💀 FORGE ELITE",price:"$14.99/mois",color:"#aa00ff",badge:"ELITE",stripe:"https://buy.stripe.com/00w3cx5AYaL5cYW9MzfQI02",
    features:["✅ Tout de FORGE PRO +","✅ Exclude Tags avancés","✅ Presets sauvegardables illimités","✅ Export PDF du prompt","✅ Accès prioritaire features","✅ Badge ELITE dans l'app","✅ Support prioritaire direct"],featuresEn:["✅ Everything in FORGE PRO +","✅ Advanced Exclude Tags","✅ Unlimited savable presets","✅ Prompt PDF export","✅ Priority access to features","✅ ELITE badge in the app","✅ Direct priority support"]},
};
const payUrl = (base, email) =>
  base && !base.includes("YOUR_") && email
    ? `${base}?prefilled_email=${encodeURIComponent(email)}`
    : base;
const TIER_RANK = {free:0,forge:1,pro:2,elite:3};
const LIMITS = {free:{prompts:3,lyrics:0},forge:{prompts:Infinity,lyrics:10},pro:{prompts:Infinity,lyrics:Infinity},elite:{prompts:Infinity,lyrics:Infinity}};
const TAB_REQ = {genre:"free",drums:"free",vocals:"free",guitar:"forge",bass:"forge",instru:"forge",structure:"forge",paroles:"pro",organic:"pro",exclude:"elite",output:"free",history:"pro"};

// ── STYLES ──
const S = {
  wrap:    {background:DARK,color:"#e0e0e0",minHeight:"100vh"},
  header:  {background:"linear-gradient(135deg,#1a0000 0%,#0a0a0a 60%)",borderBottom:"1px solid #ff2e2e33",padding:"14px 20px 10px",textAlign:"center",position:"relative",boxShadow:"0 2px 40px #ff000022"},
  h1:      {fontSize:"1.6rem",letterSpacing:"6px",color:RED,textShadow:"0 0 30px #ff0000"},
  sub:     {fontSize:"0.55rem",color:"#444",letterSpacing:"4px",textTransform:"uppercase",marginTop:"2px"},
  navBtn:  (a,locked)=>({flex:"0 0 auto",padding:"7px 9px",fontSize:"0.52rem",fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",textAlign:"center",cursor:"pointer",border:"none",background:a?"#1a0000":"none",color:locked?"#2a2a2a":a?RED:"#555",borderBottom:a?`2px solid ${RED}`:"2px solid transparent",whiteSpace:"nowrap",transition:"all 0.2s"}),
  page:    {padding:"14px",maxWidth:"600px",margin:"0 auto"},
  card:    {background:CARD,border:"1px solid #1e1e1e",borderRadius:"10px",padding:"13px",marginBottom:"11px"},
  ctitle:  {fontSize:"0.58rem",textTransform:"uppercase",letterSpacing:"2px",color:RED,fontWeight:800,marginBottom:"10px"},
  tags:    {display:"flex",flexWrap:"wrap",gap:"7px"},
  tag:     (on,locked)=>({background:on?"#2a0000":locked?"#0f0f0f":"#181818",border:on?`1.5px solid ${RED}`:locked?"1.5px solid #1a1a1a":"1.5px solid #222",borderRadius:"20px",padding:"5px 12px",fontSize:"0.72rem",cursor:locked?"default":"pointer",color:on?"#ff7070":locked?"#2a2a2a":"#888",fontWeight:on?700:400,boxShadow:on?"0 0 10px #ff000033":"none",transition:"all 0.15s",userSelect:"none"}),
  outBox:  {background:"#0d0d0d",border:"1px solid #222",borderRadius:"8px",padding:"12px",fontSize:"0.77rem",lineHeight:1.75,color:"#ccc",wordBreak:"break-word",position:"relative",marginBottom:"12px"},
  outLbl:  {fontSize:"0.57rem",textTransform:"uppercase",letterSpacing:"2px",color:RED,fontWeight:800,marginBottom:"5px"},
  copyBtn: {position:"absolute",top:"8px",right:"8px",background:"#1c1c1c",border:"1px solid #2a2a2a",borderRadius:"5px",padding:"3px 8px",fontSize:"0.57rem",color:"#777",cursor:"pointer",textTransform:"uppercase",letterSpacing:"1px"},
  fab:     {position:"fixed",bottom:"20px",right:"16px",width:"62px",height:"62px",borderRadius:"50%",background:RED,border:"none",color:"#000",fontSize:"1.6rem",cursor:"pointer",boxShadow:"0 4px 24px #ff000099",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,overflow:"hidden",flexShrink:0},
  intBar:  {display:"flex",gap:"3px",marginTop:"5px"},
  intSeg:  (l)=>({flex:1,height:"4px",borderRadius:"2px",background:l?RED:"#222",transition:"background 0.2s"}),
  structBlock:{background:"#0f0f0f",border:"1px solid #1e1e1e",borderLeft:`3px solid ${RED}`,borderRadius:"6px",padding:"10px 12px",marginBottom:"7px"},
  togBtn:  (on)=>({width:"28px",height:"28px",borderRadius:"50%",border:"none",background:on?"#8a0000":"#1a1a1a",color:on?RED:"#444",fontSize:"0.8rem",cursor:"pointer",flexShrink:0,transition:"all 0.2s"}),
  genBtn:  {width:"100%",padding:"14px",background:RED,border:"none",borderRadius:"8px",color:"#000",fontSize:"0.85rem",fontWeight:900,letterSpacing:"3px",textTransform:"uppercase",cursor:"pointer",boxShadow:"0 4px 24px #ff000055",marginBottom:"12px"},
  stepNum: (c)=>({width:"24px",height:"24px",borderRadius:"50%",background:c,color:"#000",fontSize:"0.7rem",fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}),
};

// ── COMPONENTS ──
function Tags({list,sel,toggle,lockedItems=[],newItems=[],tr=null}) {
  return (
    <div style={S.tags}>
      {list.map(v=>{
        const label=typeof v==="object"?v.l:v, val=typeof v==="object"?v.v:v;
        const disp=tr&&tr[label]?tr[label]:label;
        const locked=lockedItems.includes(val);
        const isNew=newItems.includes(val);
        return <span key={val} style={S.tag(sel.has(val),locked)} onClick={()=>!locked&&toggle(val)}>{locked?"🔒 ":""}{disp}{isNew&&<span style={{marginLeft:"5px",fontSize:"0.5rem",fontWeight:900,color:"#fff",background:RED,borderRadius:"4px",padding:"1px 4px",letterSpacing:"0.5px",verticalAlign:"middle"}}>NEW</span>}</span>;
      })}
    </div>
  );
}

function CopyBtn({getText}) {
  const [txt,setTxt]=useState("COPY");
  return <button style={S.copyBtn} onClick={()=>navigator.clipboard.writeText(getText()).then(()=>{setTxt("✅");setTimeout(()=>setTxt("COPY"),1500)}).catch(()=>setTxt("ERR"))}>{txt}</button>;
}

function MiniCopy({text,style}) {
  const [txt,setTxt]=useState("COPY");
  return <button onClick={()=>navigator.clipboard.writeText(text).then(()=>{setTxt("✅ Copié");setTimeout(()=>setTxt("COPY"),1500)}).catch(()=>setTxt("ERR"))} style={style}>{txt}</button>;
}

function Slider({label,val,setVal}) {
  const pct=((val-1)/9*100).toFixed(1)+"%";
  return (
    <div style={{marginBottom:"13px"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
        <span style={{fontSize:"0.67rem",textTransform:"uppercase",letterSpacing:"1px",color:"#666"}}>{label}</span>
        <span style={{fontSize:"0.85rem",fontWeight:800,color:RED}}>{val}</span>
      </div>
      <input type="range" min={1} max={10} value={val} style={{"--pct":pct}} onChange={e=>setVal(parseInt(e.target.value))}/>
      <div style={S.intBar}>{Array.from({length:10},(_,i)=><div key={i} style={S.intSeg(i<val)}/>)}</div>
    </div>
  );
}

function HammerFab({onClick}) {
  const [hitting,setHitting]=useState(false);
  const [sparks,setSparks]=useState([]);
  const handle=()=>{
    setHitting(true);
    setSparks(Array.from({length:7},(_,i)=>({id:Date.now()+i,sx:(Math.random()*40-20)+"px",sy:(Math.random()*-30-10)+"px"})));
    setTimeout(()=>{setHitting(false);setSparks([]);onClick();},450);
  };
  return (
    <button style={S.fab} onClick={handle} title="FORGE">
      <span style={{fontSize:"1.5rem",display:"inline-block",transformOrigin:"bottom center"}} className={hitting?"hammer-anim":""}>⚒️</span>
      {sparks.map(s=>(
        <span key={s.id} style={{position:"absolute",left:"50%",top:"50%",fontSize:"0.65rem",pointerEvents:"none",animation:"spark 0.55s ease forwards","--sx":s.sx,"--sy":s.sy}}>✦</span>
      ))}
    </button>
  );
}

function LockedOverlay({req,t,email}) {
  const tier=TIERS[req];
  return (
    <div style={{...S.page,minHeight:"260px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"14px",textAlign:"center",padding:"40px 20px"}}>
      <div style={{fontSize:"3rem"}}>🔒</div>
      <div style={{fontSize:"0.9rem",fontWeight:700,color:"#e0e0e0"}}>{t.lockedMsg} <span style={{color:tier?.color||RED}}>{tier?.label}</span></div>
      <a href={payUrl(tier?.stripe,email)||"#"} target="_blank" rel="noreferrer"
        style={{padding:"10px 24px",background:tier?.color||RED,borderRadius:"7px",color:req==="elite"?"#fff":"#000",fontSize:"0.8rem",fontWeight:900,letterSpacing:"2px",textDecoration:"none",textTransform:"uppercase"}}>
        {t.upgrade}
      </a>
    </div>
  );
}

function PaywallModal({onClose,email,uiLang}) {
  const [sel,setSel]=useState("pro");
  const tier=TIERS[sel];
  const L=(fr,en)=>uiLang==="fr"?fr:en;
  return (
    <div style={{position:"fixed",inset:0,background:"#000000dd",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",overflowY:"auto"}}>
      <div style={{background:"#0f0f0f",border:"1px solid #333",borderRadius:"14px",padding:"22px 18px",maxWidth:"420px",width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:"18px"}}>
          <div style={{fontSize:"0.6rem",color:"#555",letterSpacing:"3px",textTransform:"uppercase",marginBottom:"6px"}}>{L("PROMPT GRATUIT UTILISÉ","FREE PROMPT USED")}</div>
          <div className="forge-title" style={{fontSize:"1.5rem",color:"#fff",letterSpacing:"4px"}}>{L("CHOISIS TON PLAN","CHOOSE YOUR PLAN")}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"18px"}}>
          {Object.values(TIERS).filter(t=>t.id!=="free").map(t=>(
            <div key={t.id} onClick={()=>setSel(t.id)}
              style={{background:sel===t.id?"#1a0000":"#111",border:`1.5px solid ${sel===t.id?t.color:"#222"}`,borderRadius:"8px",padding:"10px 6px",textAlign:"center",cursor:"pointer"}}>
              <div style={{fontSize:"0.65rem",fontWeight:900,color:sel===t.id?t.color:"#555",letterSpacing:"1px",marginBottom:"4px"}}>{t.label}</div>
              <div style={{fontSize:"0.9rem",fontWeight:900,color:"#fff"}}>{t.price.split("/")[0]}</div>
              <div style={{fontSize:"0.5rem",color:"#444"}}>{L("/mois","/mo")}</div>
            </div>
          ))}
        </div>
        <div style={{background:"#0a0a0a",border:`1px solid ${tier.color}22`,borderRadius:"8px",padding:"14px",marginBottom:"16px",minHeight:"160px"}}>
          <div style={{fontSize:"0.58rem",color:tier.color,letterSpacing:"2px",textTransform:"uppercase",fontWeight:800,marginBottom:"10px"}}>{tier.label} — {L("INCLUS","INCLUDED")}</div>
          {(uiLang==="en"?tier.featuresEn:tier.features)?.map(f=><div key={f} style={{fontSize:"0.7rem",color:f.startsWith("✅")?"#ccc":"#333",padding:"3px 0"}}>{f}</div>)}
        </div>
        <a href={payUrl(tier.stripe,email)} target="_blank" rel="noreferrer"
          style={{display:"block",width:"100%",padding:"14px",background:tier.color,borderRadius:"8px",color:sel==="elite"?"#fff":"#000",fontWeight:900,fontSize:"0.85rem",letterSpacing:"2px",textTransform:"uppercase",textDecoration:"none",textAlign:"center",marginBottom:"10px"}}>
          🤘 {L("COMMENCER","START")} {tier.label}
        </a>
        <button onClick={onClose} style={{width:"100%",background:"none",border:"none",color:"#333",fontSize:"0.65rem",cursor:"pointer",textDecoration:"underline"}}>{L("Continuer sans abonnement","Continue without a plan")}</button>
      </div>
    </div>
  );
}

function LandingPage({onEnter,uiLang,setUiLang,email}) {
  const examples=[
    {tags:"deathcore, blast beats, pig squeals, drop B tuning, 180 BPM",genre:"DEATHCORE",color:"#ff2e2e"},
    {tags:"djent, polyrhythmic drums, 7-string guitar, groovy and headbang-worthy, 140 BPM",genre:"DJENT",color:"#ff6600"},
    {tags:"black metal, tremolo picking, blast beats, sinister and dark, 200 BPM",genre:"BLACK METAL",color:"#aa00ff"},
  ];
  const [activeEx,setActiveEx]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setActiveEx(p=>(p+1)%examples.length),3000);return()=>clearInterval(t);},[]);
  const L=(fr,en)=>uiLang==="fr"?fr:en;
  return (
    <div style={{background:DARK,minHeight:"100vh",color:"#e0e0e0"}}>
      <style>{css}</style>
      <div style={{background:"linear-gradient(180deg,#1a0000 0%,#0a0a0a 100%)",padding:"50px 20px 40px",textAlign:"center",borderBottom:"1px solid #ff2e2e22",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:"linear-gradient(90deg,transparent,#ff2e2e,transparent)"}}/>
        <div style={{display:"flex",justifyContent:"flex-end",padding:"0 20px",marginBottom:"16px",gap:"8px"}}>
          {["en","fr"].map(l=><button key={l} onClick={()=>setUiLang(l)} style={{background:uiLang===l?"#1a0000":"none",border:`1px solid ${uiLang===l?RED:"#333"}`,borderRadius:"4px",color:uiLang===l?RED:"#555",fontSize:"0.65rem",padding:"4px 10px",cursor:"pointer",fontWeight:uiLang===l?700:400}}>{l.toUpperCase()}</button>)}
        </div>
        <div className="forge-title" style={{fontSize:"clamp(2.2rem,8vw,3.5rem)",color:RED,letterSpacing:"8px",textShadow:"0 0 40px #ff000088",marginBottom:"6px"}}>⚰️ METAL PROMPT FORGE</div>
        <div style={{fontSize:"0.65rem",color:"#555",letterSpacing:"5px",textTransform:"uppercase",marginBottom:"30px"}}>{uiLang==="fr"?"Le générateur de prompts Suno pour musiciens metal":"The Suno prompt generator for metal musicians"}</div>
        <div style={{maxWidth:"480px",margin:"0 auto 30px",background:"#0f0f0f",border:`1px solid ${examples[activeEx].color}33`,borderRadius:"10px",padding:"14px 16px",transition:"border-color 0.5s"}}>
          <div style={{fontSize:"0.55rem",color:examples[activeEx].color,letterSpacing:"3px",textTransform:"uppercase",fontWeight:800,marginBottom:"8px"}}>{L("EXEMPLE","EXAMPLE")} — {examples[activeEx].genre}</div>
          <div style={{fontSize:"0.75rem",color:"#aaa",lineHeight:1.8,fontFamily:"monospace"}}>{examples[activeEx].tags}</div>
        </div>
        <button onClick={onEnter} className="pulse" style={{padding:"16px 36px",background:RED,border:"none",borderRadius:"8px",color:"#000",fontSize:"1rem",fontWeight:900,letterSpacing:"3px",textTransform:"uppercase",cursor:"pointer",boxShadow:"0 6px 30px #ff000077"}}>
          🤘 {uiLang==="fr"?"LANCER L'APP":"LAUNCH APP"}
        </button>
        <div style={{fontSize:"0.6rem",color:"#444",marginTop:"10px"}}>{uiLang==="fr"?"Gratuit · 3 prompts offerts · Aucune carte requise":"Free · 3 prompts included · No card required"}</div>
      </div>

      {/* MISSION / POURQUOI */}
      <div style={{padding:"34px 20px",textAlign:"center",borderBottom:"1px solid #1a1a1a",background:"linear-gradient(180deg,#0d0606,#0a0a0a)"}}>
        <div style={{maxWidth:"580px",margin:"0 auto"}}>
          <div style={{fontSize:"0.6rem",color:RED,letterSpacing:"3px",fontWeight:800,textTransform:"uppercase",marginBottom:"12px"}}>{uiLang==="fr"?"Notre mission":"Our mission"}</div>
          <div style={{fontSize:"0.95rem",color:"#ddd",lineHeight:1.85}}>{uiLang==="fr"?"On était tannés d'entendre du metal IA qui sonne en plastique. Alors on a bâti l'outil qu'on voulait : un forgeron de prompts qui sort du VRAI metal — brutal, organique, humain. Notre mission : aider les musiciens à progresser, ET ouvrir la création musicale à ceux qui ne jouent pas du tout. Que l'idée brutale dans ta tête devienne une toune. 🤘":"We were sick of AI metal that sounds like plastic. So we built the tool we wanted: a prompt forge that delivers REAL metal — brutal, organic, human. Our mission: help musicians level up, AND open music creation to those who don't play at all. Turn the brutal idea in your head into a track. 🤘"}</div>
        </div>
      </div>

      <div style={{padding:"36px 20px",maxWidth:"560px",margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:"28px"}}>
          <div className="forge-title" style={{fontSize:"1.4rem",color:"#fff",letterSpacing:"4px",marginBottom:"6px"}}>{uiLang==="fr"?"POURQUOI METAL PROMPT FORGE ?":"WHY METAL PROMPT FORGE?"}</div>
          <div style={{fontSize:"0.72rem",color:"#555",lineHeight:1.8}}>{uiLang==="fr"?"Suno génère mieux quand les prompts sont précis.":"Suno generates better when prompts are precise."}</div>
        </div>
        {[
          {icon:"🎸",title:uiLang==="fr"?"11 onglets de personnalisation":"11 customization tabs",desc:uiLang==="fr"?"Genre, drums, vocals, guitar, basse, structure, paroles, organic, exclude — tout est là.":"Genre, drums, vocals, guitar, bass, structure, lyrics, organic, exclude — all here."},
          {icon:"✍️",title:uiLang==="fr"?"Paroles générées par IA":"AI-generated lyrics",desc:uiLang==="fr"?"Claude compose des paroles metal uniques avec thèmes, atmosphère et anti-répétition.":"Claude composes unique metal lyrics with themes, atmosphere and anti-repetition logic."},
          {icon:"🌿",title:uiLang==="fr"?"Mode Organic / Anti-AI":"Organic / Anti-AI Mode",desc:uiLang==="fr"?"Des tags spéciaux pour rendre tes générations Suno plus humaines.":"Special tags to make your Suno generations sound more human."},
          {icon:"📋",title:uiLang==="fr"?"Prompt prêt à coller":"Paste-ready prompt",desc:uiLang==="fr"?"Style tags, structure et notes de prod séparés — tu sais exactement où coller quoi.":"Style tags, structure and prod notes separated — you know exactly where to paste what."},
          {icon:"🚫",title:uiLang==="fr"?"Tags d'exclusion (Elite)":"Exclusion tags (Elite)",desc:uiLang==="fr"?"Dis à Suno ce qu'il doit éviter. Fini le piano qui s'invite dans ton deathcore.":"Tell Suno what to avoid. No more piano crashing your deathcore."},
        ].map(f=>(
          <div key={f.title} style={{display:"flex",gap:"14px",padding:"14px 0",borderBottom:"1px solid #1a1a1a",alignItems:"flex-start"}}>
            <div style={{fontSize:"1.6rem",flexShrink:0}}>{f.icon}</div>
            <div><div style={{fontSize:"0.82rem",fontWeight:700,color:"#e0e0e0",marginBottom:"3px"}}>{f.title}</div><div style={{fontSize:"0.7rem",color:"#555",lineHeight:1.7}}>{f.desc}</div></div>
          </div>
        ))}
      </div>

      <div style={{padding:"30px 20px",maxWidth:"560px",margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:"20px"}}><div className="forge-title" style={{fontSize:"1.3rem",color:"#fff",letterSpacing:"4px"}}>PLANS</div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:"12px"}}>
          <div style={{background:CARD,border:"1px solid #222",borderRadius:"10px",padding:"16px"}}>
            <div style={{fontSize:"0.6rem",color:"#555",letterSpacing:"2px",textTransform:"uppercase",marginBottom:"6px"}}>{L("GRATUIT","FREE")}</div>
            <div style={{fontSize:"1.4rem",fontWeight:900,color:"#fff",marginBottom:"10px"}}>$0</div>
            {(uiLang==="fr"?["3 prompts d'essai","Accès basique genre & drums","❌ Paroles IA","❌ Organic mode","❌ Exclude Tags"]:["3 free prompts","Basic genre & drums access","❌ AI lyrics","❌ Organic mode","❌ Exclude Tags"]).map((f,i)=><div key={f} style={{fontSize:"0.68rem",color:i<2?"#bbb":"#333",padding:"3px 0"}}>{f}</div>)}
            <button onClick={onEnter} style={{width:"100%",marginTop:"12px",padding:"9px",background:"#1a1a1a",border:"1px solid #333",borderRadius:"6px",color:"#777",fontSize:"0.72rem",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",cursor:"pointer"}}>{L("ESSAYER","TRY")}</button>
          </div>
          {["forge","pro","elite"].map(id=>{
            const tier=TIERS[id];
            return (
              <div key={id} style={{background:id==="pro"?"#1a0000":id==="elite"?"#0f0015":CARD,border:`1px solid ${tier.color}${id==="pro"?"":"44"}`,borderRadius:"10px",padding:"16px",position:"relative"}}>
                {id==="pro"&&<div style={{position:"absolute",top:"-10px",right:"12px",background:RED,color:"#000",fontSize:"0.55rem",fontWeight:900,letterSpacing:"1px",padding:"3px 8px",borderRadius:"10px",textTransform:"uppercase"}}>{L("POPULAIRE","POPULAR")}</div>}
                <div style={{fontSize:"0.6rem",color:tier.color,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"6px"}}>{tier.label}</div>
                <div style={{fontSize:"1.4rem",fontWeight:900,color:"#fff",marginBottom:"10px"}}>{tier.price.split("/")[0]}<span style={{fontSize:"0.7rem",color:"#555"}}>{L("/mois","/mo")}</span></div>
                {(uiLang==="en"?tier.featuresEn:tier.features)?.map(f=><div key={f} style={{fontSize:"0.68rem",color:f.startsWith("✅")?"#ccc":"#333",padding:"3px 0"}}>{f}</div>)}
                <a href={payUrl(tier.stripe,email)} target="_blank" rel="noreferrer" style={{display:"block",width:"100%",marginTop:"12px",padding:"9px",background:tier.color,borderRadius:"6px",color:id==="elite"?"#fff":"#000",fontSize:"0.72rem",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",textDecoration:"none",textAlign:"center",boxShadow:id==="pro"?`0 2px 14px #ff000055`:"none"}}>{tier.label.split(" ")[0]} {L("COMMENCER","START")}</a>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{textAlign:"center",padding:"24px 20px",borderTop:"1px solid #1a1a1a",color:"#333",fontSize:"0.62rem",letterSpacing:"2px"}}>METAL PROMPT FORGE · BUILT FOR METALHEADS · 2026</div>
    </div>
  );
}

// ══════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════
// ══════════════════════════════════════════
// PAGES LÉGALES (Loi 25 / Québec)
// ══════════════════════════════════════════
// 🔧 Remplace les champs [ ] par tes vraies infos avant publication.
const LEGAL = {
  privacy: `POLITIQUE DE CONFIDENTIALITÉ — MetalPrompt
Dernière mise à jour : 24 juin 2026

1. QUI SOMMES-NOUS
Le site MetalPrompt (« le Service ») est édité par MMF Techni-Solutions, entreprise enregistrée au Québec (NEQ : 2279516308), située au 2180 rue de Rome, Trois-Rivières (Québec) G8W 0P1. Cette politique est conforme à la Loi sur la protection des renseignements personnels dans le secteur privé du Québec (Loi 25).

2. RESPONSABLE DE LA PROTECTION DES RENSEIGNEMENTS PERSONNELS
François Lajoie-Levesque — mmftechnisolutions@gmail.com

3. RENSEIGNEMENTS RECUEILLIS
• Compte : adresse courriel, mot de passe chiffré.
• Paiement : historique d'abonnement, plan actif (via Stripe — nous ne stockons aucun numéro de carte).
• Utilisation : prompts générés, préférences, historique.
• Technique : adresse IP, type d'appareil, navigateur.
Nous n'utilisons aucun outil de suivi publicitaire ni de mesure d'audience tiers (ex. Google Analytics).

4. FINALITÉS
Créer et gérer votre compte ; fournir le Service ; traiter les paiements ; communiquer avec vous ; améliorer et sécuriser le Service ; respecter nos obligations légales. Nous ne vendons jamais vos renseignements.

5. CONSENTEMENT
En utilisant le Service, vous consentez à la collecte décrite. Vous pouvez retirer votre consentement en tout temps.

6. SOUS-TRAITANTS
Supabase (auth / base de données), Stripe (paiements), Vercel (hébergement), Google (connexion « Se connecter avec Google »). Certains traitent des données hors Québec ; nous procédons à une évaluation des facteurs relatifs à la vie privée avant toute communication hors Québec, conformément à la Loi 25.

7. CONSERVATION
Données conservées tant que le compte est actif, puis pour la durée requise par nos obligations légales. Suppression du compte possible sur demande.

8. SÉCURITÉ
Mesures raisonnables : chiffrement des mots de passe, accès restreint, fournisseurs sécurisés.

9. VOS DROITS (Loi 25)
Accès, rectification, retrait du consentement / suppression, portabilité, et plainte auprès de la Commission d'accès à l'information du Québec (CAI). Pour exercer ces droits : mmftechnisolutions@gmail.com (réponse sous 30 jours).

10. TÉMOINS (COOKIES)
Le Service utilise uniquement des témoins strictement nécessaires à son fonctionnement (session, authentification). Aucun témoin de suivi ; aucun bandeau de consentement requis.

11. INCIDENT DE CONFIDENTIALITÉ
En cas d'incident à risque sérieux, nous aviserons les personnes concernées et la CAI.

12. NOUS JOINDRE
mmftechnisolutions@gmail.com — MMF Techni-Solutions, 2180 rue de Rome, Trois-Rivières (Québec) G8W 0P1.`,

  terms: `CONDITIONS D'UTILISATION — MetalPrompt
Dernière mise à jour : 24 juin 2026

1. ACCEPTATION
En accédant au Service, édité par MMF Techni-Solutions (NEQ 2279516308), vous acceptez les présentes conditions.

2. DESCRIPTION
MetalPrompt est un outil d'aide à la création de prompts pour la génération de musique par IA (notamment Suno AI). Le Service n'est PAS affilié à Suno ni à aucune plateforme tierce ; les marques citées appartiennent à leurs propriétaires.

3. COMPTE
Vous fournissez des informations exactes, gardez votre mot de passe confidentiel et êtes responsable de l'activité de votre compte. Nous pouvons suspendre un compte en cas de violation.

4. UTILISATION ACCEPTABLE
Interdit : usage illégal/frauduleux, contournement des limitations ou de la sécurité, revente non autorisée, surcharge/piratage de l'infrastructure, génération de contenu illégal ou portant atteinte aux droits d'autrui.

5. PROPRIÉTÉ INTELLECTUELLE
Le Service (code, design, textes, marque) appartient à MMF Techni-Solutions. Les prompts que vous générez vous appartiennent ; vous êtes seul responsable de leur usage sur des plateformes tierces.

6. DISPONIBILITÉ
Service fourni sans garantie d'absence d'interruption ; il peut évoluer, être suspendu ou modifié.

7. LIMITATION DE RESPONSABILITÉ
Service fourni « tel quel ». Dans les limites de la loi, aucune responsabilité pour les dommages indirects, la perte de données ou les résultats obtenus via des plateformes tierces. Aucun résultat musical précis n'est garanti. Rien dans les présentes ne limite les droits impératifs que la loi accorde au consommateur, notamment la Loi sur la protection du consommateur du Québec.

8. DONNÉES PERSONNELLES
Voir la Politique de confidentialité, qui fait partie des présentes conditions.

9. DROIT APPLICABLE
Lois de la province de Québec et du Canada. Tribunaux compétents du district de Trois-Rivières, Québec.

10. MODIFICATIONS
La version en vigueur est celle publiée avec sa date. L'usage continu vaut acceptation.

11. CONTACT
mmftechnisolutions@gmail.com`,

  sales: `CONDITIONS GÉNÉRALES DE VENTE — MetalPrompt
Dernière mise à jour : 24 juin 2026

1. OBJET
Vente des abonnements payants du Service, édité par MMF Techni-Solutions (NEQ 2279516308), 2180 rue de Rome, Trois-Rivières (Québec) G8W 0P1, sur https://metalprompt.com.

2. INFOS AVANT L'ACHAT (CONTRAT À DISTANCE)
Avant votre paiement, nous indiquons : notre identité et nos coordonnées, la description du plan, le prix total en CAD (taxes indiquées au paiement), la fréquence de facturation et le renouvellement, les modalités de résiliation et de remboursement. Après l'achat, vous recevez par courriel une confirmation tenant lieu de copie du contrat.

3. PLANS ET PAIEMENT
Plans et prix affichés sur la page des tarifs. Paiements sécurisés par Stripe ; aucune donnée complète de carte n'est stockée. Vous autorisez le prélèvement récurrent jusqu'à résiliation. Prix modifiables pour les périodes futures, avec préavis.

4. RENOUVELLEMENT AUTOMATIQUE
Renouvellement automatique par périodes identiques au tarif en vigueur, sauf résiliation avant l'échéance. Un avis de renouvellement est transmis lorsque la loi l'exige. Vous pouvez désactiver le renouvellement en tout temps.

5. RÉSILIATION
Possible à tout moment depuis votre compte ; effet à la fin de la période déjà payée, sans nouveau prélèvement.

6. REMBOURSEMENTS
La période déjà entamée n'est pas remboursée. Cette politique ne restreint pas vos droits prévus par la loi : rien dans les présentes ne limite les droits d'annulation, de résiliation ou de remboursement accordés au consommateur par la Loi sur la protection du consommateur du Québec ou toute autre loi applicable. En cas de conflit, la loi prévaut. Demandes : mmftechnisolutions@gmail.com.

7. GARANTIES ET RESPONSABILITÉ
Service « tel quel », aucun résultat garanti. Cette clause ne porte pas atteinte aux garanties légales ni aux droits du consommateur. Dans la seule mesure permise par la loi, la responsabilité totale est limitée au montant payé sur les 12 derniers mois.

8. DROITS IMPÉRATIFS DU CONSOMMATEUR
Les protections de la Loi sur la protection du consommateur du Québec sont d'ordre public et s'appliquent même si une clause dit le contraire. Plaintes : Office de la protection du consommateur (opc.gouv.qc.ca).

9. DROIT APPLICABLE
Lois du Québec et du Canada ; tribunaux du district de Trois-Rivières, sous réserve des règles protégeant le consommateur.

10. CONTACT
mmftechnisolutions@gmail.com`,

  legal: `MENTIONS LÉGALES — MetalPrompt
Dernière mise à jour : 24 juin 2026

ÉDITEUR
MMF Techni-Solutions — NEQ : 2279516308
Adresse : 2180 rue de Rome, Trois-Rivières (Québec) G8W 0P1
Courriel : mmftechnisolutions@gmail.com
Responsable de la publication : François Lajoie-Levesque

HÉBERGEMENT
Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis — vercel.com

SERVICES TIERS
Supabase (auth / base de données), Stripe (paiements).

PROPRIÉTÉ INTELLECTUELLE
La marque « MetalPrompt », le design, les textes et le code sont protégés. Reproduction non autorisée interdite.

CONTACT
mmftechnisolutions@gmail.com`,

  about: `À PROPOS — MetalPrompt

MetalPrompt, c'est plus qu'un prompteur. C'est LA plateforme du metalhead. 🤘

NOTRE MISSION
Aider les musiciens à progresser, ET ouvrir la création musicale à ceux qui ne jouent pas du tout.

NOTRE MANIFESTE
On était tannés du metal IA qui sonne en plastique. Ces tounes plates, sans âme, crachées à la chaîne pis oubliées aussi vite. De la musique jetable.

Le metal, c'est pas ça. Le metal, ça frappe. Ça vit. Ça vient des tripes. Une vraie toune transporte une émotion, dit quelque chose — et te donne des frissons.

Alors on a bâti MetalPrompt : pas une poubelle à chansons jetables, mais une forge. Tu prends ton idée brute, ton émotion, ton message — tu les martèles, et t'en sors du vrai metal, brutal, organique, humain.

Que tu joues depuis 20 ans ou que t'aies jamais touché une guitare, peu importe. C'est un outil pour construire : du succès, de l'apprentissage, du plaisir. Pour les musiciens, jamais contre.

Si t'as du metal dans la tête, on te donne le moyen de le sortir — et de le ressentir.

NOS VALEURS
• Pas une poubelle à chansons jetables — qualité et sens avant quantité.
• La musique transporte une émotion — le but : que tu aies des frissons.
• Un outil de construction — de succès, d'apprentissage, de plaisir.
• Le son humain avant tout — organique, brut, vivant.
• Partage et croissance — on grandit ensemble.
• Pour les musiciens, jamais contre.
• Accessible à tous — pro ou débutant total.
• Honnête et direct.

UNE LETTRE DE L'ÉQUIPE

À toi, le metalhead,

On va te parler franchement. On était tannés du metal IA qui sonne en plastique — plat, sans âme, craché à la chaîne pis oublié aussi vite. De la musique jetable.

Le metal, ç'a jamais été ça. Ça frappe, ça vit, ça vient des tripes. Une vraie toune transporte une émotion — pis quand c'est la tienne qui prend vie, ça te donne des frissons.

C'est pour ça qu'on a bâti MetalPrompt. Pas une poubelle à chansons jetables : une forge. Un outil pour construire — du succès, de l'apprentissage, du plaisir.

Que tu joues depuis vingt ans ou que t'aies jamais touché une guitare, si t'as du metal dans la tête, on veut te donner le moyen de le sortir.

Pis que ce soit clair : c'est pour les musiciens. Jamais contre. On grandit ensemble.

Bienvenue dans la forge.

— L'équipe de MetalPrompt

MetalPrompt — la plateforme du metalhead. 🤘

Édité par MMF Techni-Solutions · mmftechnisolutions@gmail.com`,

  aboutEn: `ABOUT — MetalPrompt

MetalPrompt is more than a prompter. It's THE metalhead platform. 🤘

OUR MISSION
Help musicians progress, AND open music creation to those who don't play at all.

OUR MANIFESTO
We were sick of AI metal that sounds like plastic. Flat, soulless tracks, churned out and forgotten just as fast. Disposable music.

Metal was never that. It hits. It lives. It comes from the gut. A real song carries emotion, says something — and gives you chills.

That's why we built MetalPrompt: not a dumping ground for throwaway songs, but a forge. You take your raw idea, your emotion, your message — you hammer them, and out comes real metal: brutal, organic, human.

Whether you've played for twenty years or never touched a guitar, if you've got metal in your head, we want to give you the way to get it out.

And let's be clear: it's for musicians. Never against. We grow together.

A LETTER FROM THE TEAM

To you, metalhead,

We'll be straight with you. We were sick of AI metal that sounds like plastic — flat, soulless, churned out and forgotten just as fast. Disposable music.

Metal was never that. It hits, it lives, it comes from the gut. A real song carries emotion — and when it's yours coming to life, it gives you chills.

That's why we built MetalPrompt. Not a dumping ground for throwaway songs: a forge. A tool to build — success, learning, fun.

Whether you've played for twenty years or never touched a guitar, if you've got metal in your head, we want to give you the way to get it out.

And let's be clear: it's for musicians. Never against. We grow together.

Welcome to the forge.

— The MetalPrompt Team

MetalPrompt — the metalhead platform. 🤘

Published by MMF Techni-Solutions · mmftechnisolutions@gmail.com`,
};

function SiteFooter({onOpen,uiLang}){
  const fr=uiLang==="fr";
  const lk={background:"none",border:"none",color:"#666",fontSize:"0.62rem",cursor:"pointer",textDecoration:"underline",padding:"2px 6px"};
  return (
    <div style={{borderTop:"1px solid #1a1a1a",padding:"18px 12px 40px",textAlign:"center",display:"flex",flexWrap:"wrap",gap:"4px",justifyContent:"center",alignItems:"center"}}>
      <span style={{fontSize:"0.58rem",color:"#444"}}>© {new Date().getFullYear()} MetalPrompt ·</span>
      <button style={{...lk,color:RED,fontWeight:700}} onClick={()=>onOpen("about")}>{fr?"À propos":"About"}</button>
      <button style={lk} onClick={()=>onOpen("privacy")}>{fr?"Confidentialité":"Privacy"}</button>
      <button style={lk} onClick={()=>onOpen("terms")}>{fr?"Conditions d'utilisation":"Terms"}</button>
      <button style={lk} onClick={()=>onOpen("sales")}>{fr?"Conditions de vente":"Sales terms"}</button>
      <button style={lk} onClick={()=>onOpen("legal")}>{fr?"Mentions légales":"Legal notice"}</button>
    </div>
  );
}

function LegalModal({doc,onClose,uiLang}){
  if(!doc) return null;
  const fr=uiLang==="fr";
  const titles={about:fr?"À propos":"About",privacy:fr?"Politique de confidentialité":"Privacy Policy",terms:fr?"Conditions d'utilisation":"Terms of Use",sales:fr?"Conditions de vente":"Sales Terms",legal:fr?"Mentions légales":"Legal Notice"};
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1100,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"30px 12px",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0c0c0c",border:"1px solid #2a2a2a",borderRadius:"10px",maxWidth:"720px",width:"100%",padding:"24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
          <div style={{color:RED,fontSize:"0.95rem",fontWeight:900}}>{titles[doc]}</div>
          <button onClick={onClose} style={{background:"none",border:"1px solid #333",borderRadius:"4px",color:"#888",fontSize:"0.8rem",padding:"4px 10px",cursor:"pointer"}}>✕</button>
        </div>
        {!fr&&doc!=="about"&&<div style={{fontSize:"0.6rem",color:"#777",marginBottom:"10px",fontStyle:"italic"}}>Legal documents are provided in French (Québec law).</div>}
        <pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",fontSize:"0.72rem",lineHeight:1.7,color:"#bbb"}}>{doc==="about"?(fr?LEGAL.about:LEGAL.aboutEn):LEGAL[doc]}</pre>
      </div>
    </div>
  );
}

export default function App({ user, onLogout }) {
  const [view,setView]=useState("app");
  const [tab,setTab]=useState("genre");
  const [showPaywall,setShowPaywall]=useState(false);
  const [legalDoc,setLegalDoc]=useState(null);
  const [uiLang,setUiLang]=useState(()=>(navigator.language||"en").startsWith("fr")?"fr":"en");
  const t=T[uiLang]||T.en;
  const L=(fr,en)=>uiLang==="fr"?fr:en;

  // ── AUTO-LOGOUT 30min ──
  const timer=useRef(null);
  const [warnLogout,setWarnLogout]=useState(false);
  const resetTimer=useCallback(()=>{
    setWarnLogout(false);
    clearTimeout(timer.current);
    timer.current=setTimeout(()=>{
      setWarnLogout(true);
      setTimeout(()=>onLogout&&onLogout(),5*60*1000);
    },25*60*1000);
  },[onLogout]);
  useEffect(()=>{
    const evs=["mousemove","keydown","click","touchstart","scroll"];
    evs.forEach(e=>window.addEventListener(e,resetTimer,{passive:true}));
    resetTimer();
    return()=>{clearTimeout(timer.current);evs.forEach(e=>window.removeEventListener(e,resetTimer));};
  },[resetTimer]);

  // ── TIER ──
  const [promptCount,setPromptCount]=useState(0);
  const [userTier,setUserTier]=useState("free");
  useEffect(()=>{
    if(user?.email) supabase.from('users').select('tier,prompts_used').eq('email',user.email).single()
      .then(({data})=>{if(data){setUserTier(data.tier||"free");setPromptCount(data.prompts_used||0);}});
  },[user]);
  const isForge=TIER_RANK[userTier]>=1;
  const isPro=TIER_RANK[userTier]>=2;
  const isElite=TIER_RANK[userTier]>=3;
  const limit=LIMITS[userTier]||LIMITS.free;
  const tierColor=TIERS[userTier]?.color||"#444";
  const tierBadge=TIERS[userTier]?.badge||null;
  const canAccess=req=>TIER_RANK[userTier]>=TIER_RANK[req||"free"];

  const useSet=(init=[])=>{
    const [s,setS]=useState(new Set(init));
    const toggle=v=>setS(p=>{const n=new Set(p);n.has(v)?n.delete(v):n.add(v);return n;});
    return [s,toggle];
  };

  const [genres,tGenre]=useSet(["deathcore","metalcore"]);
  const [mood,tMood]=useSet(["crushing and heavy","groovy and headbang-worthy"]);
  const [drums,tDrums]=useSet(["blast beats","double bass drumming"]);
  const [drumP,tDrumP]=useSet(["triggered drums"]);
  const [vocals,tVocal]=useSet(["guttural death growls","pig squeals"]);
  const [vfx,tVfx]=useSet([]);
  const [guitar,tGuitar]=useSet(["chugging riffs","palm muting"]);
  const [tuning,tTuning]=useSet(["drop B tuning"]);
  const [gprod,tGprod]=useSet(["heavy distortion","layered guitar tracks"]);
  const [bassStyle,tBassStyle]=useSet(["fingerstyle bass"]);
  const [bassTech,tBassTech]=useSet([]);
  const [bassTone,tBassTone]=useSet(["distorted bass"]);
  const [bassTuning,tBassTuning]=useSet(["bass drop B"]);
  const [bassProd,tBassProd]=useSet(["sub-bass boosted"]);
  const [sax,tSax]=useSet([]);
  const [brass,tBrass]=useSet([]);
  const [keys,tKeys]=useSet([]);
  const [strings,tStr]=useSet([]);
  const [prod,tProd]=useSet(["heavy production","modern metal production"]);
  const [orgRec,tOrgRec]=useSet([]);
  const [orgDrm,tOrgDrm]=useSet([]);
  const [orgVoc,tOrgVoc]=useSet([]);
  const [orgGtr,tOrgGtr]=useSet([]);
  const [structs,tStruct]=useSet(["intro","verse","chorus","breakdown","outro"]);
  const [themes,tTheme]=useSet(["mort et décomposition"]);
  const [latmo,tLatmo]=useSet(["sombre et menaçant"]);
  const [lblocks,tLblock]=useSet(["verse","chorus","breakdown"]);
  const [lang,tLang]=useSet(["en"]);
  const [lyricsHistory,setLyricsHistory]=useState([]);
  const [lyricsAngle,setLyricsAngle]=useState("");
  const [lyricsNarrator,setLyricsNarrator]=useState("first");
  const [lyricsTense,setLyricsTense]=useState("present");
  const [bannedWords,setBannedWords]=useState("");
  const [blockRhythm,setBlockRhythm]=useState({});
  const [globalRhythm,tGlobalRhythm]=useSet([]);
  const setBlockR=(k,v)=>setBlockRhythm(p=>({...p,[k]:v}));
  const clearBlockR=k=>setBlockRhythm(p=>{const n={...p};delete n[k];return n;});
  const [exclGenre,tExclGenre]=useSet([]);
  const [exclVocal,tExclVocal]=useSet([]);
  const [exclProd,tExclProd]=useSet([]);
  const [exclInst,tExclInst]=useSet([]);
  const [exclCustom,setExclCustom]=useState("");
  const [heavy,setHeavy]=useState(9);
  const [groove,setGroove]=useState(6);
  const [chaos,setChaos]=useState(7);
  const [melody,setMelody]=useState(3);
  const [bpm,setBpmVal]=useState(180);
  const setBPM=v=>setBpmVal(Math.max(60,Math.min(280,v)));
  const [styleTxt,setStyleTxt]=useState("");
  const [structTxt,setStructTxt]=useState("");
  const [structNotes,setStructNotes]=useState("");
  const [excludeTxt,setExcludeTxt]=useState("");
  const [fullTxt,setFullTxt]=useState("");
  const [keywords,setKeywords]=useState("");
  const [lyricsTxt,setLyricsTxt]=useState("");
  const [lyricsLoading,setLyricsLoading]=useState(false);
  const [lyricsErr,setLyricsErr]=useState("");
  const [history,setHistory]=useState(()=>{try{return JSON.parse(localStorage.getItem("mpf_history")||"[]")}catch{return[]}});
  const saveToHistory=p=>{
    if(!isPro)return;
    const e={date:new Date().toLocaleDateString("fr-CA"),prompt:p,id:Date.now()};
    const u=[e,...history].slice(0,50);setHistory(u);
    try{localStorage.setItem("mpf_history",JSON.stringify(u))}catch{}
  };

  // ── GENERATE ──
  const generate=()=>{
    if(promptCount>=limit.prompts){setView("landing");return;}
    const allOrganic=isPro?[...orgRec,...orgDrm,...orgVoc,...orgGtr]:[];
    const allExclude=isElite?[...exclGenre,...exclVocal,...exclProd,...exclInst,...exclCustom.split(",").map(s=>s.trim()).filter(Boolean)]:[];
    const extraInst=[...bassStyle,...bassTech,...bassTone,...bassTuning,...bassProd,...sax,...brass,...keys,...strings];
    const rFor=k=>blockRhythm[k]?`, ${blockRhythm[k]}`:"";
    const styleTags=[...[...genres],...[...drums],...[...guitar].slice(0,3),...[...tuning].slice(0,1),...[...vocals].slice(0,3),...[...mood].slice(0,3),...[...prod].slice(0,2),...allOrganic.slice(0,4),...[...globalRhythm],`${bpm} BPM`];
    const styleStr=styleTags.join(", ");
    const excStr=allExclude.join(", ");
    const blockMapClean={
      intro:`[Intro${rFor("intro")}]`,buildup:`[Build-up${rFor("buildup")}]`,verse:`[Verse${rFor("verse")}]`,
      prechorus:`[Pre-Chorus${rFor("prechorus")}]`,chorus:`[Chorus${rFor("chorus")}]`,breakdown:`[Breakdown${rFor("breakdown")}]`,
      halftime:`[Half-Time${rFor("halftime")}]`,blastsection:`[Blast Section${rFor("blastsection")}]`,drop:`[Drop${rFor("drop")}]`,
      solo:`[Guitar Solo${rFor("solo")}]`,interlude:`[Interlude${rFor("interlude")}]`,atmosphericbreak:`[Atmospheric Break${rFor("atmosphericbreak")}]`,
      spokenword:`[Spoken Word${rFor("spokenword")}]`,gangchant:`[Gang Chant${rFor("gangchant")}]`,scream:`[Scream Section${rFor("scream")}]`,
      riffbreak:`[Riff Break${rFor("riffbreak")}]`,bridge:`[Bridge${rFor("bridge")}]`,outro:`[Outro${rFor("outro")}]`,
    };
    const blockMapNotes={
      intro:`Intro → ${drums.has("blast beats")?"blast beat fury":"crushing riff"}${rFor("intro")}`,
      buildup:`Build-up → ${heavy>=8?"murs de distortion":"couches progressives"}, pas de voix${rFor("buildup")}`,
      verse:`Verse → ${vocals.has("pig squeals")?"pig squeal + ":""}growls sur ${guitar.has("chugging riffs")?"chugging riffs":"riffs lourds"}${rFor("verse")}`,
      prechorus:`Pre-Chorus → tension montante${rFor("prechorus")}`,
      chorus:`Chorus → ${groove>=6?"riff groovy headbang":"assaut total"}${rFor("chorus")}`,
      breakdown:`Breakdown → ${groove>=7?"groove lent, gang shouts":"mosh brutal"}${rFor("breakdown")}`,
      halftime:`Half-Time → ${bpm>160?Math.round(bpm/2)+" BPM":bpm+" BPM"}, palm-mute lourd${rFor("halftime")}`,
      blastsection:`Blast Section → blast beats ${bpm} BPM${rFor("blastsection")}`,
      drop:`Drop → silence puis riff dévastateur${rFor("drop")}`,
      solo:`Guitar Solo → ${guitar.has("sweep picking solos")?"sweep shred":"riff lead"}${rFor("solo")}`,
      interlude:`Interlude → instrumental${rFor("interlude")}`,
      atmosphericbreak:`Atmospheric Break → ${chaos>=7?"dissonance":"calme"}${rFor("atmosphericbreak")}`,
      spokenword:`Spoken Word → voix seule${rFor("spokenword")}`,
      gangchant:`Gang Chant → chant collectif${rFor("gangchant")}`,
      scream:`Scream Section → cri brut${rFor("scream")}`,
      riffbreak:`Riff Break → guitares seules${rFor("riffbreak")}`,
      bridge:`Bridge → ${chaos>=7?"chaotique":"atmosphérique"}${rFor("bridge")}`,
      outro:`Outro → ${chaos>=7?"frenzy blast":"breakdown final"}${rFor("outro")}`,
    };
    const activeBlocks=[...structs];
    const structStr=activeBlocks.map(b=>blockMapClean[b]||"").filter(Boolean).join("\n");
    const structNotesTxt=activeBlocks.map(b=>blockMapNotes[b]||"").filter(Boolean).join("\n");
    const heavyD=heavy>=8?"extremely heavy and crushing":heavy>=5?"heavy and punishing":"moderately heavy";
    const grooveD=groove>=8?"deeply groovy":groove>=5?"mid-paced groovy":"straight aggressive";
    const chaosD=chaos>=8?"chaotic and unpredictable":chaos>=5?"controlled chaos":"tight and structured";
    const melodyD=melody>=7?"rich melodic leads":melody>=4?"sparse melodic accents":"pure brutality";
    const full=`=== STYLE TAGS (→ Style of Music) ===\n${styleStr}${excStr?`\n\nEXCLUDE: ${excStr.split(", ").map(x=>"-"+x).join(", ")}`:""}

=== STRUCTURE (→ top of Lyrics) ===
${structStr}

=== PRODUCTION NOTES (keep for yourself) ===
${heavyD}. ${grooveD}. ${chaosD}. ${melodyD}. ${bpm} BPM.${allOrganic.length>0?"\nOrganic: "+allOrganic.join(", "):""}`;
    setStyleTxt(styleStr);setStructTxt(structStr||"");setStructNotes(structNotesTxt);setExcludeTxt(excStr);setFullTxt(full);
    const nc=promptCount+1;setPromptCount(nc);
    if(user?.email) supabase.from('users').upsert({email:user.email,prompts_used:nc},{onConflict:'email'});
    saveToHistory(styleStr);
    setTab("output");
  };

  // ── GENERATE LYRICS ──
  const generateLyrics=async()=>{
    if(!isPro){setShowPaywall(true);return;}
    setLyricsLoading(true);setLyricsErr("");setLyricsTxt("");
    const selectedLang=[...lang][0]||"en";
    const langStr=LYRIC_LANG_MAP[selectedLang]||"english";
    const genreList=[...genres].join("/")||"deathcore";
    const historyWords=lyricsHistory.flatMap(h=>h.match(/\b\w{4,}\b/g)||[]).filter((w,i,a)=>a.indexOf(w)===i).slice(0,40);
    const allBanned=[...new Set([...historyWords,...bannedWords.split(",").map(s=>s.trim()).filter(Boolean)])];
    const blockInstr=[...lblocks].map(b=>{
      if(b==="verse")return"[Verse 1] and [Verse 2] — 4 lines each, DIFFERENT imagery";
      if(b==="prechorus")return"[Pre-Chorus] — 2 lines, build tension";
      if(b==="chorus")return"[Chorus] — 4 lines, powerful brutal hook";
      if(b==="breakdown")return"[Breakdown] — 2-4 SHORT lines, under 6 words, mosh rhythm";
      if(b==="halftime")return"[Half-Time] — 3 crushing slow heavy lines";
      if(b==="blastsection")return"[Blast Section] — 3-4 fragmented chaotic lines";
      if(b==="drop")return"[Drop] — 1-2 lines MAX, devastating";
      if(b==="buildup")return"[Build-up] — 3 escalating lines, last cuts off";
      if(b==="gangchant")return"[Gang Chant] — 1-3 lines, simple, for crowd shouting";
      if(b==="spokenword")return"[Spoken Word] — 4-6 narrative spoken lines";
      if(b==="scream")return"[Scream] — 1-3 raw primal lines";
      if(b==="riffbreak")return"[Riff Break] — write: (instrumental)";
      if(b==="interlude")return"[Interlude] — write: (instrumental)";
      if(b==="atmosphericbreak")return"[Atmospheric Break] — 0-2 whispered lines or (silence)";
      if(b==="solo")return"[Guitar Solo] — write: (guitar solo)";
      if(b==="bridge")return"[Bridge] — 3 contrasting lines, shift perspective";
      if(b==="intro")return"[Intro] — 0-1 menacing line or (instrumental)";
      if(b==="outro")return"[Outro] — 2-3 final devastating lines";
      return`[${b}] — appropriate metal content`;
    }).filter(Boolean).join("\n");
    const seeds=["Focus on physical sensations and body horror.","Use industrial machine metaphors.","Write from the perspective of the void.","Use geological destruction metaphors.","Focus on psychological collapse.","Use drowning and suffocation metaphors.","Architecture collapsing as metaphor.","Cosmic entity dying."];
    const creativeSeed=seeds[Math.floor(Math.random()*seeds.length)];
    const narratorMap={first:"First person (I/We)",second:"Second person (You — accusatory)",third:"Third person — detached observer"};
    const tenseMap={present:"Present tense — immediate, visceral",past:"Past tense — aftermath",future:"Future tense — prophetic doom"};
    const prompt=`You are a creative ${genreList} metal lyricist. Write lyrics in ${langStr}.
NARRATOR: ${narratorMap[lyricsNarrator]||narratorMap.first}.
TENSE: ${tenseMap[lyricsTense]||tenseMap.present}.
THEMES: ${[...themes].join(", ")||"death, chaos, darkness"}.
ATMOSPHERE: ${[...latmo].join(", ")||"dark, menacing"}.
${lyricsAngle?`ANGLE: ${lyricsAngle}`:`CREATIVE ANGLE: ${creativeSeed}`}
${keywords?`MUST USE: ${keywords}.`:""}
STRUCTURE:\n${blockInstr}
RULES:
- NEVER: darkness, blood, pain, rise, fall, burning, ashes, chains, void, shadows, broken, shattered
- FORBIDDEN WORDS: ${allBanned.slice(0,25).join(", ")||"none"}
- Each section = completely different metaphors
- Breakdown lines = under 6 words each
- Be SPECIFIC and CONCRETE, not vague
OUTPUT: ONLY raw lyrics. Zero commentary.`;
    try {
      const res=await fetch("/api/lyrics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Erreur serveur");
      const text=data.text||"Error.";
      setLyricsTxt(text);
      setLyricsHistory(prev=>[...prev.slice(-2),text]);
      const nc=promptCount+1;setPromptCount(nc);
    } catch(e){setLyricsErr("Erreur API : "+e.message);}
    setLyricsLoading(false);
  };

  const sendLyricsToOutput=()=>{setFullTxt((fullTxt?fullTxt+"\n\n":"")+`=== PAROLES ===\n${lyricsTxt}`);setTab("output");};

  if(view==="landing") return (
    <>
      <LandingPage onEnter={()=>setView("app")} uiLang={uiLang} setUiLang={setUiLang} email={user?.email}/>
      <SiteFooter onOpen={setLegalDoc} uiLang={uiLang}/>
      <LegalModal doc={legalDoc} onClose={()=>setLegalDoc(null)} uiLang={uiLang}/>
    </>
  );

  const TABS=[
    {id:"genre",req:"free"},{id:"drums",req:"free"},{id:"vocals",req:"free"},
    {id:"instrums",req:"forge"},{id:"structure",req:"forge"},
    {id:"paroles",req:"pro"},{id:"organic",req:"pro"},{id:"exclude",req:"elite"},{id:"output",req:"free"},{id:"tuto",req:"free"},{id:"riff",req:"free"},
    ...(isPro?[{id:"history",req:"pro"}]:[]),
  ];

  return (
    <div style={S.wrap}>
      <style>{css}</style>
      {showPaywall&&<PaywallModal onClose={()=>setShowPaywall(false)} email={user?.email} uiLang={uiLang}/>}

      {warnLogout&&(
        <div style={{position:"fixed",top:0,left:0,right:0,background:"#1a0000",borderBottom:`1px solid ${RED}`,padding:"8px",textAlign:"center",zIndex:500,fontSize:"0.65rem",color:"#ff9090"}}>
          {t.warn}
        </div>
      )}

      {/* HEADER + NAV (sticky) */}
      <div style={{position:"sticky",top:0,zIndex:100}}>
      <div style={S.header}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}>
          <div className="forge-title" style={S.h1}>⚰️ Metal Prompt Forge</div>
          {tierBadge&&<span style={{background:tierColor,color:isElite?"#fff":"#000",fontSize:"0.5rem",fontWeight:900,padding:"2px 7px",borderRadius:"8px",letterSpacing:"1px"}}>{tierBadge}</span>}
        </div>
        <div style={S.sub}>{t.sub}</div>
        <div style={{fontSize:"0.55rem",color:"#555",marginTop:"4px",display:"flex",justifyContent:"center",gap:"12px",alignItems:"center",flexWrap:"wrap"}}>
          <span>{promptCount} {t.prompts} · <a href={payUrl(TIERS.pro.stripe,user?.email)} target="_blank" rel="noreferrer" style={{color:RED,textDecoration:"none",fontWeight:700}}>{t.plans}</a></span>
          <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
            {["en","fr"].map(l=><button key={l} onClick={()=>setUiLang(l)} style={{background:uiLang===l?"#1a0000":"none",border:`1px solid ${uiLang===l?RED:"#333"}`,borderRadius:"3px",color:uiLang===l?RED:"#444",fontSize:"0.5rem",padding:"2px 6px",cursor:"pointer"}}>{l.toUpperCase()}</button>)}
            {user&&<button onClick={onLogout} style={{background:"none",border:"1px solid #222",borderRadius:"4px",color:"#444",fontSize:"0.5rem",padding:"2px 6px",cursor:"pointer"}}>{t.logout}</button>}
          </div>
        </div>
      </div>

      {/* NAV */}
      <div className="nav-scroll" style={{background:"#0f0f0f",borderBottom:"1px solid #1a1a1a"}}>
        {TABS.map(tb=>{
          const locked=!canAccess(tb.req);
          return <button key={tb.id} style={S.navBtn(tab===tb.id,locked)} onClick={()=>setTab(tb.id)}>
            {locked?"🔒 ":""}{t.tabs[tb.id]||tb.id}
          </button>;
        })}
      </div>
      </div>

      {/* GENRE */}
      {tab==="genre"&&<div style={S.page}>
        <div style={S.card}>
          <div style={S.ctitle}>🤘 Genres</div>
          <Tags list={GENRES_FREE} sel={genres} toggle={tGenre}/>
          <div style={{marginTop:"8px",fontSize:"0.55rem",color:"#cc6600",letterSpacing:"1px",marginBottom:"5px"}}>⚒️ FORGE</div>
          <Tags list={GENRES_FORGE} sel={genres} toggle={tGenre} lockedItems={isForge?[]:GENRES_FORGE}/>
          <div style={{marginTop:"8px",fontSize:"0.55rem",color:RED,letterSpacing:"1px",marginBottom:"5px"}}>🔥 PRO</div>
          <Tags list={GENRES_PRO} sel={genres} toggle={tGenre} lockedItems={isPro?[]:GENRES_PRO} newItems={GENRES_NEW}/>
          <div style={{marginTop:"8px",fontSize:"0.55rem",color:"#aa00ff",letterSpacing:"1px",marginBottom:"5px"}}>💀 ELITE</div>
          <Tags list={GENRES_ELITE} sel={genres} toggle={tGenre} lockedItems={isElite?[]:GENRES_ELITE} newItems={GENRES_NEW}/>
        </div>
        <div style={S.card}><div style={S.ctitle}>{L("🌡️ Intensité globale","🌡️ Overall intensity")}</div>
          <Slider label="Heaviness" val={heavy} setVal={setHeavy}/>
          <Slider label="Groove Factor" val={groove} setVal={setGroove}/>
          <Slider label="Chaos Level" val={chaos} setVal={setChaos}/>
          <Slider label="Melodic Touch" val={melody} setVal={setMelody}/>
        </div>
        <div style={S.card}><div style={S.ctitle}>🎨 Mood / Vibe</div><Tags list={MOOD} sel={mood} toggle={tMood}/></div>
        <div style={{height:80}}/>
      </div>}

      {/* DRUMS */}
      {tab==="drums"&&<div style={S.page}>
        <div style={S.card}><div style={S.ctitle}>{L("🥁 Style de batterie","🥁 Drum style")}</div><Tags list={DRUMS} sel={drums} toggle={tDrums}/></div>
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
              <button key={v} onClick={()=>setBPM(v)} style={{background:bpm===v?"#2a0000":"#181818",border:`1px solid ${bpm===v?RED:"#222"}`,borderRadius:"6px",padding:"5px 10px",fontSize:"0.66rem",color:bpm===v?"#ff7070":"#777",cursor:"pointer"}}>{l} {v}</button>
            ))}
          </div>
        </div>
        <div style={S.card}><div style={S.ctitle}>{L("🔧 Production batterie","🔧 Drum production")}</div><Tags list={DRUM_PROD} sel={drumP} toggle={tDrumP}/></div>
        <div style={{height:80}}/>
      </div>}

      {/* VOCALS */}
      {tab==="vocals"&&<div style={S.page}>
        <div style={S.card}>
          <div style={S.ctitle}>{L("🎙️ Types de voix","🎙️ Vocal types")}</div>
          <Tags list={VOCALS_FREE} sel={vocals} toggle={tVocal}/>
          <div style={{marginTop:"8px",fontSize:"0.55rem",color:"#cc6600",letterSpacing:"1px",marginBottom:"5px"}}>⚒️ FORGE</div>
          <Tags list={VOCALS_FORGE} sel={vocals} toggle={tVocal} lockedItems={isForge?[]:VOCALS_FORGE}/>
          <div style={{marginTop:"8px",fontSize:"0.55rem",color:RED,letterSpacing:"1px",marginBottom:"5px"}}>🔥 PRO</div>
          <Tags list={VOCALS_PRO} sel={vocals} toggle={tVocal} lockedItems={isPro?[]:VOCALS_PRO}/>
          <div style={{marginTop:"8px",fontSize:"0.55rem",color:"#aa00ff",letterSpacing:"1px",marginBottom:"5px"}}>💀 ELITE</div>
          <Tags list={VOCALS_ELITE} sel={vocals} toggle={tVocal} lockedItems={isElite?[]:VOCALS_ELITE}/>
        </div>
        <div style={S.card}><div style={S.ctitle}>{L("🎛️ Effets vocaux","🎛️ Vocal effects")}</div><Tags list={VFX} sel={vfx} toggle={tVfx}/></div>
        <div style={{height:80}}/>
      </div>}

      {/* GUITAR */}
      {tab==="instrums"&&(!canAccess("forge")?<LockedOverlay req="forge" t={t} email={user?.email}/>:<div style={S.page}>
        {/* --- GUITARE --- */}
        <div style={{...S.card,borderColor:"#ff2e2e33",background:"#110000",textAlign:"center"}}><div style={{...S.ctitle,color:RED,marginBottom:0}}>{L("🎸 GUITARE","🎸 GUITAR")}</div></div>
        <div style={S.card}><div style={S.ctitle}>{L("🎸 Techniques guitare","🎸 Guitar techniques")}</div><Tags list={GUITAR} sel={guitar} toggle={tGuitar}/></div>
        <div style={S.card}><div style={S.ctitle}>{L("🎛️ Accordage","🎛️ Tuning")}</div><Tags list={TUNING} sel={tuning} toggle={tTuning}/></div>
        <div style={S.card}><div style={S.ctitle}>{L("🔊 Production guitare","🔊 Guitar production")}</div><Tags list={GPROD} sel={gprod} toggle={tGprod}/></div>

        {/* --- BASSE --- */}
        <div style={{...S.card,borderColor:"#ff2e2e33",background:"#110000",textAlign:"center",marginTop:"18px"}}><div style={{...S.ctitle,color:RED,marginBottom:0}}>{L("🎸 BASSE","🎸 BASS")}</div></div>
        <div style={S.card}><div style={S.ctitle}>{L("🎸 Style de jeu","🎸 Playing style")}</div><Tags list={BASS_STYLE} sel={bassStyle} toggle={tBassStyle}/></div>
        <div style={S.card}><div style={S.ctitle}>{L("🤘 Techniques avancées","🤘 Advanced techniques")}</div><Tags list={BASS_TECH} sel={bassTech} toggle={tBassTech}/></div>
        <div style={S.card}><div style={S.ctitle}>{L("🔊 Tone / Son","🔊 Tone")}</div><Tags list={BASS_TONE} sel={bassTone} toggle={tBassTone}/></div>
        <div style={S.card}><div style={S.ctitle}>{L("🎛️ Accordage basse","🎛️ Bass tuning")}</div><Tags list={BASS_TUNING} sel={bassTuning} toggle={tBassTuning}/></div>
        <div style={S.card}><div style={S.ctitle}>{L("⚡ Production basse","⚡ Bass production")}</div><Tags list={BASS_PROD} sel={bassProd} toggle={tBassProd}/></div>

        {/* --- INSTRU --- */}
        <div style={{...S.card,borderColor:"#ff2e2e33",background:"#110000",textAlign:"center",marginTop:"18px"}}><div style={{...S.ctitle,color:RED,marginBottom:0}}>{L("🎷 AUTRES INSTRUMENTS","🎷 OTHER INSTRUMENTS")}</div></div>
        <div style={S.card}><div style={S.ctitle}>🎷 Saxophone</div><Tags list={SAX} sel={sax} toggle={tSax}/></div>
        <div style={S.card}><div style={S.ctitle}>{L("🎺 Cuivres","🎺 Brass")}</div><Tags list={BRASS} sel={brass} toggle={tBrass}/></div>
        <div style={S.card}><div style={S.ctitle}>{L("🎹 Claviers & Synth","🎹 Keys & Synth")}</div><Tags list={KEYS} sel={keys} toggle={tKeys}/></div>
        <div style={S.card}><div style={S.ctitle}>{L("🎻 Cordes","🎻 Strings")}</div><Tags list={STRINGS} sel={strings} toggle={tStr}/></div>
        <div style={{height:80}}/>
      </div>)}

      {/* STRUCTURE */}
      {tab==="structure"&&(!canAccess("forge")?<LockedOverlay req="forge" t={t} email={user?.email}/>:<div style={S.page}>
        <div style={S.card}>
          <div style={S.ctitle}>{L("🎼 Feeling rythmique global — Style Tags","🎼 Global rhythmic feel — Style Tags")}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"7px",marginBottom:"8px"}}>
            {GLOBAL_RHYTHMS.map(r=><span key={r} onClick={()=>tGlobalRhythm(r)} style={S.tag(globalRhythm.has(r),false)}>{r}</span>)}
          </div>
          <div style={{fontSize:"0.58rem",color:"#333",marginTop:"4px",lineHeight:1.6}}>{L("→ Ces tags vont dans Style of Music · Suno les comprend vraiment","→ These tags go in Style of Music · Suno really understands them")}</div>
        </div>
        <div style={S.card}>
          <div style={S.ctitle}>{L("📐 Blocs & Feeling par section","📐 Blocks & per-section feel")}</div>
          <div style={{fontSize:"0.57rem",color:"#333",marginBottom:"10px"}}>{L("Feel → s'ajoute dans la balise : ","Feel → added inside the tag: ")}<span style={{color:"#aaffaa",fontFamily:"monospace"}}>[Breakdown, half-time feel]</span></div>
          {STRUCT_BLOCKS.map(b=>{
            const hasR=!!blockRhythm[b.k];
            return (
              <div key={b.k} style={{...S.structBlock,flexDirection:"column",alignItems:"stretch",gap:"6px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{fontSize:"1rem"}}>{b.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.78rem",fontWeight:600,color:structs.has(b.k)?"#e0e0e0":"#444"}}>{b.name}</div>
                    <div style={{fontSize:"0.58rem",color:"#333"}}>{uiLang==="fr"?b.desc:(b.descEn||b.desc)}</div>
                  </div>
                  <button style={S.togBtn(structs.has(b.k))} onClick={()=>tStruct(b.k)}>{structs.has(b.k)?"✓":"+"}</button>
                </div>
                {structs.has(b.k)&&(
                  <div style={{display:"flex",alignItems:"center",gap:"5px",flexWrap:"wrap",paddingLeft:"28px"}}>
                    <span style={{fontSize:"0.55rem",color:"#333",letterSpacing:"1px",textTransform:"uppercase",flexShrink:0}}>Feel:</span>
                    {BLOCK_RHYTHMS.map(r=>(
                      <span key={r.v} onClick={()=>blockRhythm[b.k]===r.v?clearBlockR(b.k):setBlockR(b.k,r.v)}
                        style={{background:blockRhythm[b.k]===r.v?"#002a00":"#111",border:`1px solid ${blockRhythm[b.k]===r.v?"#4caf50":"#222"}`,borderRadius:"4px",padding:"3px 7px",fontSize:"0.63rem",cursor:"pointer",color:blockRhythm[b.k]===r.v?"#4caf50":"#444",fontWeight:blockRhythm[b.k]===r.v?700:400}}>
                        {r.l}
                      </span>
                    ))}
                    {hasR&&<span onClick={()=>clearBlockR(b.k)} style={{fontSize:"0.55rem",color:"#ff5555",cursor:"pointer",padding:"3px 6px",background:"#1a0000",border:"1px solid #5a0000",borderRadius:"4px"}}>✕</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={S.card}><div style={S.ctitle}>{L("🎚️ Production globale","🎚️ Global production")}</div><Tags list={PROD} sel={prod} toggle={tProd}/></div>
        <div style={{height:80}}/>
      </div>)}

      {/* PAROLES */}
      {tab==="paroles"&&(!canAccess("pro")?<LockedOverlay req="pro" t={t} email={user?.email}/>:<div style={S.page}>
        <div style={S.card}><div style={S.ctitle}>{L("☠️ Thème principal","☠️ Main theme")}</div><Tags list={THEMES} sel={themes} toggle={tTheme} tr={uiLang==="en"?THEME_TR:null}/></div>
        <div style={S.card}><div style={S.ctitle}>{L("🌑 Atmosphère","🌑 Atmosphere")}</div><Tags list={LYRIC_ATMO} sel={latmo} toggle={tLatmo} tr={uiLang==="en"?ATMO_TR:null}/></div>
        <div style={S.card}>
          <div style={S.ctitle}>{L("🎯 Angle créatif (optionnel)","🎯 Creative angle (optional)")}</div>
          <input value={lyricsAngle} onChange={e=>setLyricsAngle(e.target.value)} placeholder={L("ex: vue d'une machine qui s'éveille, métaphores de noyade...","e.g. a machine waking up, drowning metaphors...")}
            style={{width:"100%",background:"#111",border:"1px solid #222",borderRadius:"6px",padding:"10px",color:"#e0e0e0",fontSize:"0.78rem"}}/>
          <div style={{fontSize:"0.57rem",color:"#333",marginTop:"4px"}}>{L("Si vide → angle aléatoire différent à chaque fois","If empty → a different random angle each time")}</div>
        </div>
        <div style={{display:"flex",gap:"10px"}}>
          <div style={{...S.card,flex:1}}>
            <div style={S.ctitle}>{L("👁️ Narrateur","👁️ Narrator")}</div>
            {[["first",L("1ère pers.","1st person")],["second",L("2ème pers.","2nd person")],["third",L("3ème pers.","3rd person")]].map(([v,l])=>(
              <div key={v} onClick={()=>setLyricsNarrator(v)} style={{padding:"7px 10px",borderRadius:"6px",marginBottom:"5px",cursor:"pointer",fontSize:"0.72rem",background:lyricsNarrator===v?"#2a0000":"#111",border:`1px solid ${lyricsNarrator===v?RED:"#222"}`,color:lyricsNarrator===v?"#ff7070":"#666"}}>{l}</div>
            ))}
          </div>
          <div style={{...S.card,flex:1}}>
            <div style={S.ctitle}>{L("⏱️ Temps verbal","⏱️ Tense")}</div>
            {[["present",L("Présent","Present")],["past",L("Passé","Past")],["future",L("Futur","Future")]].map(([v,l])=>(
              <div key={v} onClick={()=>setLyricsTense(v)} style={{padding:"7px 10px",borderRadius:"6px",marginBottom:"5px",cursor:"pointer",fontSize:"0.72rem",background:lyricsTense===v?"#2a0000":"#111",border:`1px solid ${lyricsTense===v?RED:"#222"}`,color:lyricsTense===v?"#ff7070":"#666"}}>{l}</div>
            ))}
          </div>
        </div>
        <div style={S.card}><div style={S.ctitle}>{L("🔑 Mots-clés","🔑 Keywords")}</div>
          <input value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder={L("ex: acier, fracture, signal, abîme...","e.g. steel, fracture, signal, abyss...")}
            style={{width:"100%",background:"#111",border:"1px solid #222",borderRadius:"6px",padding:"10px",color:"#e0e0e0",fontSize:"0.8rem"}}/>
        </div>
        <div style={S.card}><div style={S.ctitle}>{L("🚫 Mots bannis","🚫 Banned words")}</div>
          <input value={bannedWords} onChange={e=>setBannedWords(e.target.value)} placeholder={L("ex: darkness, blood, rise, ashes...","e.g. darkness, blood, rise, ashes...")}
            style={{width:"100%",background:"#111",border:"1px solid #5a1100",borderRadius:"6px",padding:"10px",color:"#ff7070",fontSize:"0.8rem"}}/>
          {lyricsHistory.length>0&&<button onClick={()=>setLyricsHistory([])} style={{marginTop:"7px",padding:"5px 12px",background:"#1a0000",border:"1px solid #5a0000",borderRadius:"5px",color:"#ff5555",fontSize:"0.65rem",cursor:"pointer"}}>{L("🗑️ Effacer mémoire","🗑️ Clear memory")} ({lyricsHistory.length})</button>}
        </div>
        <div style={S.card}><div style={S.ctitle}>{L("🌐 Langue des paroles","🌐 Lyrics language")}</div><Tags list={LYRIC_LANGS} sel={lang} toggle={tLang}/></div>
        <div style={S.card}><div style={S.ctitle}>{L("📐 Blocs à générer","📐 Blocks to generate")}</div><Tags list={LYRIC_BLOCKS} sel={lblocks} toggle={tLblock}/></div>
        <button style={S.genBtn} onClick={generateLyrics} disabled={lyricsLoading}>{lyricsLoading?"⚒️ "+t.generating:L("⚒️ GÉNÉRER LES PAROLES","⚒️ GENERATE LYRICS")}</button>
        {lyricsLoading&&<div style={{textAlign:"center",padding:"20px"}}><div style={{fontSize:"1.8rem",animation:"spin 1s linear infinite",display:"inline-block"}}>⚒️</div><div style={{color:"#444",fontSize:"0.7rem",letterSpacing:"2px",marginTop:"8px"}}>{L("CLAUDE COMPOSE...","CLAUDE IS COMPOSING...")}</div></div>}
        {lyricsErr&&<div style={{color:"#ff5555",fontSize:"0.8rem",padding:"10px",background:"#1a0000",borderRadius:"8px",marginBottom:"10px"}}>{lyricsErr}</div>}
        {lyricsTxt&&!lyricsLoading&&(<div>
          <div style={S.outLbl}>{L("✍️ Paroles générées","✍️ Generated lyrics")}</div>
          <div style={{...S.outBox,borderColor:"#ff2e2e33"}}><CopyBtn getText={()=>lyricsTxt}/><pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",fontSize:"0.8rem",lineHeight:1.9,color:"#ddd",paddingRight:"50px"}}>{lyricsTxt}</pre></div>
          <div style={{display:"flex",gap:"10px",marginBottom:"12px"}}>
            <button onClick={generateLyrics} style={{flex:1,padding:"10px",background:"#1a1a1a",border:"1px solid #222",borderRadius:"6px",color:"#888",fontSize:"0.72rem",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",cursor:"pointer"}}>{L("🔄 Régénérer","🔄 Regenerate")}</button>
            <button onClick={sendLyricsToOutput} style={{flex:1,padding:"10px",background:"#0a1f00",border:"1px solid #4caf50",borderRadius:"6px",color:"#4caf50",fontSize:"0.72rem",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",cursor:"pointer"}}>📋 → Output</button>
          </div>
        </div>)}
        <div style={{height:80}}/>
      </div>)}

      {/* ORGANIC */}
      {tab==="organic"&&(!canAccess("pro")?<LockedOverlay req="pro" t={t} email={user?.email}/>:<div style={S.page}>
        <div style={{...S.card,borderColor:"#1a3a00",background:"#0a120a"}}><div style={{...S.ctitle,color:"#4caf50"}}>💡 Anti-AI</div><div style={{fontSize:"0.72rem",color:"#688",lineHeight:1.9}}>{L("Ces tags poussent Suno vers un rendu plus ","These tags push Suno toward a more ")}<strong style={{color:"#8f8"}}>{L("organique et humain","organic and human")}</strong>.</div></div>
        <div style={S.card}><div style={S.ctitle}>{L("🎙️ Recording & Ambiance","🎙️ Recording & Ambience")}</div><Tags list={ORG_RECORD} sel={orgRec} toggle={tOrgRec}/></div>
        <div style={S.card}><div style={S.ctitle}>{L("🥁 Batterie organique","🥁 Organic drums")}</div><Tags list={ORG_DRUMS} sel={orgDrm} toggle={tOrgDrm}/></div>
        <div style={S.card}><div style={S.ctitle}>{L("🎙️ Voix organique","🎙️ Organic vocals")}</div><Tags list={ORG_VOCALS} sel={orgVoc} toggle={tOrgVoc}/></div>
        <div style={S.card}><div style={S.ctitle}>{L("🎸 Guitares organiques","🎸 Organic guitars")}</div><Tags list={ORG_GUITAR} sel={orgGtr} toggle={tOrgGtr}/></div>
        <div style={{...S.card,borderColor:"#3a0000",background:"#0f0000"}}><div style={{...S.ctitle,color:"#ff5555"}}>{L("🚫 Tags à ÉVITER (sonnent AI)","🚫 Tags to AVOID (sound AI)")}</div><div style={S.tags}>{ORG_AVOID.map(v=><span key={v} style={{background:"#1a0000",border:"1.5px solid #5a0000",borderRadius:"20px",padding:"5px 12px",fontSize:"0.72rem",color:"#ff5555",textDecoration:"line-through",opacity:0.6}}>{v}</span>)}</div></div>
        <div style={{height:80}}/>
      </div>)}

      {/* EXCLUDE */}
      {tab==="exclude"&&(!canAccess("elite")?<LockedOverlay req="elite" t={t} email={user?.email}/>:<div style={S.page}>
        <div style={{...S.card,borderColor:"#3a0a00",background:"#0f0800"}}><div style={{...S.ctitle,color:"#ff6633"}}>{L("🚫 Comment ça fonctionne","🚫 How it works")}</div><div style={{fontSize:"0.72rem",color:"#a86",lineHeight:1.9}}>{L('Tags dans "Style of Music" précédés de ','Tags in "Style of Music" prefixed with ')}<strong style={{color:"#ff5555"}}>"-"</strong>{L(" pour dire à Suno ce qu'il doit éviter."," to tell Suno what to avoid.")}</div></div>
        <div style={S.card}><div style={S.ctitle}>{L("🎵 Genres à exclure","🎵 Genres to exclude")}</div><Tags list={EXCL_GENRES} sel={exclGenre} toggle={tExclGenre}/></div>
        <div style={S.card}><div style={S.ctitle}>{L("🎙️ Voix à exclure","🎙️ Vocals to exclude")}</div><Tags list={EXCL_VOCALS} sel={exclVocal} toggle={tExclVocal}/></div>
        <div style={S.card}><div style={S.ctitle}>{L("🔊 Production à exclure","🔊 Production to exclude")}</div><Tags list={EXCL_PROD} sel={exclProd} toggle={tExclProd}/></div>
        <div style={S.card}><div style={S.ctitle}>{L("🎸 Instruments à exclure","🎸 Instruments to exclude")}</div><Tags list={EXCL_INSTRU} sel={exclInst} toggle={tExclInst}/></div>
        <div style={S.card}><div style={S.ctitle}>{L("✏️ Exclusions personnalisées","✏️ Custom exclusions")}</div>
          <input value={exclCustom} onChange={e=>setExclCustom(e.target.value)} placeholder={L("ex: piano, jazz, acoustic, soft...","e.g. piano, jazz, acoustic, soft...")}
            style={{width:"100%",background:"#111",border:"1px solid #5a2200",borderRadius:"6px",padding:"10px",color:"#e0e0e0",fontSize:"0.8rem"}}/>
        </div>
        <div style={{height:80}}/>
      </div>)}

      {/* OUTPUT */}
      {tab==="riff"&&<div style={S.page}>
        <div style={{...S.card,textAlign:"center",padding:"30px 22px",borderColor:"#ff2e2e44"}}>
          <div style={{fontSize:"2.4rem",marginBottom:"6px"}}>🔜</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.7rem",letterSpacing:"2px",color:"#fff"}}>{L("BIENTÔT SUR METALPROMPT","COMING SOON ON METALPROMPT")}</div>
          <div style={{color:"#999",fontSize:"0.8rem",marginTop:"6px"}}>{L("Ce qui s'en vient — reste à l'affût 🤘","What's coming — stay tuned 🤘")}</div>
        </div>
        {[
          {i:"🎸",t:"Riff / Beat Generator",d:L("Génère riffs et patterns de batterie, avec export audio.","Generate riffs and drum patterns, with audio export.")},
          {i:"🎬",t:L("Idée express","Quick Idea"),d:L("Aperçu vidéo + maquette musicale de ton prompt avant Suno.","Video preview + musical mockup of your prompt before Suno.")},
          {i:"🎚️",t:"Mastering",d:L("Masterise ta toune Suno directement dans MetalPrompt.","Master your Suno track directly in MetalPrompt.")},
        ].map(f=>(
          <div key={f.t} style={{...S.card,display:"flex",alignItems:"center",gap:"14px"}}>
            <div style={{fontSize:"1.9rem"}}>{f.i}</div>
            <div style={{flex:1}}>
              <div style={{color:"#fff",fontWeight:800,fontSize:"0.9rem"}}>{f.t} <span style={{marginLeft:"6px",fontSize:"0.52rem",fontWeight:900,color:"#fff",background:RED,borderRadius:"6px",padding:"2px 7px",letterSpacing:"0.5px",verticalAlign:"middle"}}>{L("BIENTÔT","SOON")}</span></div>
              <div style={{color:"#888",fontSize:"0.76rem",marginTop:"3px",lineHeight:1.5}}>{f.d}</div>
            </div>
          </div>
        ))}
        <div style={{height:80}}/>
      </div>}

      {tab==="tuto"&&<div style={S.page}>
        <div style={{...S.card,textAlign:"center",padding:"26px 22px",borderColor:"#ff2e2e44"}}>
          <div style={{fontSize:"2.2rem",marginBottom:"6px"}}>📚</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.7rem",letterSpacing:"2px",color:"#fff"}}>{L("APPRENDRE LE METAL","LEARN METAL")}</div>
          <div style={{color:"#999",fontSize:"0.8rem",marginTop:"6px",lineHeight:1.5}}>{L("MetalPrompt, c'est plus qu'un prompteur — c'est ","MetalPrompt is more than a prompter — it's ")}<b style={{color:"#fff"}}>{L("LA plateforme du metalhead","THE metalhead platform")}</b>. 🤘</div>
        </div>

        <div style={S.card}>
          <div style={S.ctitle}>{L("⚡ Démarrage rapide — de 0 à toune","⚡ Quick start — from 0 to track")}</div>
          {[
            L("Choisis ton genre, ta batterie et tes voix dans les onglets.","Choose your genre, drums and vocals in the tabs."),
            L("Clique sur l'enclume ⚒️ FORGER pour générer ton prompt.","Hit the anvil ⚒️ FORGE to generate your prompt."),
            L("Onglet Output : copie le « Style of Music » et colle-le dans le champ Style de Suno.","Output tab: copy the « Style of Music » and paste it into Suno's Style field."),
            L("Colle les blocs de structure EN HAUT du champ Lyrics de Suno.","Paste the structure blocks at the TOP of Suno's Lyrics field."),
            L("Génère dans Suno, écoute, ajuste. C'est ta toune. 🤘","Generate in Suno, listen, tweak. That's your track. 🤘"),
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"12px",padding:"9px 0",borderBottom:i<4?"1px solid #1a1a1a":"none"}}>
              <div style={S.stepNum(RED)}>{i+1}</div>
              <div style={{fontSize:"0.8rem",color:"#ccc",lineHeight:1.6,paddingTop:"3px"}}>{s}</div>
            </div>
          ))}
        </div>

        <div style={S.card}>
          <div style={S.ctitle}>{L("🎓 Cliniques de musique en ligne","🎓 Online music clinics")}</div>
          <div style={{fontSize:"0.78rem",color:"#999",lineHeight:1.7,marginBottom:"14px"}}>
            {L("Des sessions live avec de vrais musiciens pour passer au niveau supérieur — riffs, mix, écriture, voix extrêmes. Que tu joues déjà ou pas du tout, on t'aide à progresser.","Live sessions with real musicians to level up — riffs, mixing, songwriting, extreme vocals. Whether you already play or not at all, we help you progress.")}
          </div>
          {[
            {i:"🎸",t:L("Riffing & composition","Riffing & songwriting"),d:L("Construire des riffs qui frappent et structurer une toune.","Build riffs that hit and structure a track.")},
            {i:"🎙️",t:L("Voix extrêmes","Extreme vocals"),d:L("Scream, growl, fry — technique et santé vocale.","Scream, growl, fry — technique and vocal health.")},
            {i:"🎚️",t:L("Mix & son metal","Mixing & metal tone"),d:L("Faire sonner gros : guitares, batterie, basse.","Make it sound huge: guitars, drums, bass.")},
          ].map(c=>(
            <div key={c.t} style={{...S.card,display:"flex",alignItems:"center",gap:"14px",marginBottom:"10px"}}>
              <div style={{fontSize:"1.8rem"}}>{c.i}</div>
              <div style={{flex:1}}>
                <div style={{color:"#fff",fontWeight:800,fontSize:"0.88rem"}}>{c.t} <span style={{marginLeft:"6px",fontSize:"0.52rem",fontWeight:900,color:"#fff",background:RED,borderRadius:"6px",padding:"2px 7px",letterSpacing:"0.5px",verticalAlign:"middle"}}>{L("BIENTÔT","SOON")}</span></div>
                <div style={{color:"#888",fontSize:"0.74rem",marginTop:"3px",lineHeight:1.5}}>{c.d}</div>
              </div>
            </div>
          ))}
          <a href="mailto:mmftechnisolutions@gmail.com?subject=Clinique%20de%20musique%20en%20ligne" style={{display:"block",textAlign:"center",marginTop:"6px",padding:"12px",background:RED,borderRadius:"8px",color:"#000",fontWeight:900,fontSize:"0.8rem",letterSpacing:"1px",textTransform:"uppercase",textDecoration:"none"}}>
            {L("🤘 Tu donnes des cliniques ? Écris-nous","🤘 You run clinics? Get in touch")}
          </a>
          <div style={{fontSize:"0.6rem",color:"#555",textAlign:"center",marginTop:"8px"}}>{L("Musiciens, profs, créateurs — proposez vos cliniques sur la plateforme.","Musicians, teachers, creators — offer your clinics on the platform.")}</div>
        </div>
        <div style={{height:80}}/>
      </div>}

      {tab==="output"&&<div style={S.page}>
        {!styleTxt&&<div style={{...S.card,textAlign:"center",padding:"30px 20px",borderColor:"#222"}}>
          <div style={{fontSize:"2.5rem",marginBottom:"10px"}}>⚒️</div>
          <div style={{fontSize:"0.82rem",color:"#444"}}>{t.noPrompt}</div>
        </div>}
        {styleTxt&&<>
          {/* STEP 1 */}
          <div style={{...S.card,borderColor:"#ff2e2e33",background:"#0d0000"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
              <div style={S.stepNum(RED)}>1</div>
              <div style={{...S.outLbl,marginBottom:0,color:RED}}>{t.step1t}</div>
            </div>
            <div style={{fontSize:"0.63rem",color:"#888",marginBottom:"10px",lineHeight:1.6}}>{t.step1d}</div>
            <div style={{background:"#0a0a0a",border:"1px solid #3a0000",borderRadius:"6px",padding:"10px",position:"relative"}}>
              <CopyBtn getText={()=>styleTxt}/>
              <div style={{color:"#ff9090",fontSize:"0.8rem",lineHeight:1.8,paddingRight:"50px",fontFamily:"monospace"}}>{styleTxt}</div>
            </div>
          </div>
          {/* STEP 2 */}
          {structTxt&&<div style={{...S.card,borderColor:"#00aa4433",background:"#030f03"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
              <div style={S.stepNum("#4caf50")}>2</div>
              <div style={{...S.outLbl,color:"#4caf50",marginBottom:0}}>{t.step2t}</div>
            </div>
            <div style={{fontSize:"0.63rem",color:"#688",marginBottom:"10px",lineHeight:1.6}}>{t.step2d}</div>
            <div style={{background:"#0a0a0a",border:"1px solid #1a4a1a",borderRadius:"6px",padding:"10px",position:"relative"}}>
              <CopyBtn getText={()=>structTxt}/>
              <pre style={{whiteSpace:"pre-wrap",fontFamily:"monospace",fontSize:"0.82rem",lineHeight:2,color:"#aaffaa",paddingRight:"50px"}}>{structTxt}</pre>
            </div>
          </div>}
          {/* STEP 3 */}
          {structNotes&&<div style={{...S.card,borderColor:"#ff440022",background:"#0a0500"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
              <div style={S.stepNum("#ff6600")}>3</div>
              <div style={{...S.outLbl,color:"#ff6633",marginBottom:0}}>{t.step3t}</div>
            </div>
            <div style={{fontSize:"0.63rem",color:"#a86",marginBottom:"10px",lineHeight:1.6}}>{t.step3d}</div>
            <div style={{background:"#0a0a0a",border:"1px solid #3a1a00",borderRadius:"6px",padding:"10px",position:"relative"}}>
              <CopyBtn getText={()=>structNotes}/>
              <pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",fontSize:"0.72rem",lineHeight:1.8,color:"#aa7755",paddingRight:"50px"}}>{structNotes}</pre>
            </div>
          </div>}
          {/* STEP 4 */}
          {excludeTxt&&<div style={{...S.card,borderColor:"#5a220022",background:"#080500"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
              <div style={S.stepNum("#ff6600")}>4</div>
              <div style={{...S.outLbl,color:"#ff6633",marginBottom:0}}>{t.step4t}</div>
            </div>
            <div style={{fontSize:"0.63rem",color:"#a86",marginBottom:"10px",lineHeight:1.6}}>{t.step4d}</div>
            <div style={{background:"#0a0a0a",border:"1px solid #3a1500",borderRadius:"6px",padding:"10px",position:"relative"}}>
              <CopyBtn getText={()=>excludeTxt.split(", ").map(x=>"-"+x).join(", ")}/>
              <div style={{color:"#ff8844",fontSize:"0.78rem",lineHeight:1.8,paddingRight:"50px",fontFamily:"monospace"}}>{excludeTxt.split(", ").map(x=>"-"+x).join(", ")}</div>
            </div>
          </div>}
          {/* FULL */}
          <div style={S.card}>
            <div style={{...S.outLbl,marginBottom:"8px"}}>{L("📄 Prompt complet","📄 Full prompt")}</div>
            <div style={{...S.outBox,border:"1px solid #1e1e1e"}}>
              <CopyBtn getText={()=>fullTxt}/>
              <pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",fontSize:"0.72rem",lineHeight:1.8,color:"#777",paddingRight:"50px"}}>{fullTxt}</pre>
            </div>
          </div>
          <div style={{...S.card,borderColor:"#1a3a1a",textAlign:"center"}}>
            <div style={{color:"#4caf50",fontSize:"0.65rem",letterSpacing:"2px",textTransform:"uppercase",fontWeight:700,marginBottom:"8px"}}>{L("💡 Tips Suno","💡 Suno tips")}</div>
            <div style={{fontSize:"0.68rem",color:"#555",lineHeight:1.9}}>
              • {L("8–12 tags max dans Style of Music","8–12 tags max in Style of Music")}<br/>
              • {L("[Breakdown, half-time feel] = changement de rythme garanti","[Breakdown, half-time feel] = guaranteed rhythm change")}<br/>
              • {L("pig squeals + guttural growls = combo deathcore parfait","pig squeals + guttural growls = perfect deathcore combo")}<br/>
              • {L("saxophone + metal = son unique et brutal 🎷🤘","saxophone + metal = unique, brutal sound 🎷🤘")}
            </div>
          </div>
        </>}
        <div style={{height:80}}/>
      </div>}

      {/* HISTORY */}
      {tab==="history"&&(isPro||isElite)&&<div style={S.page}>
        <div style={{...S.card,borderColor:"#ff2e2e22"}}>
          <div style={S.ctitle}>{L("🕒 Historique PRO","🕒 PRO History")} — {history.length}/50 prompts</div>
          {history.length===0&&<div style={{color:"#444",fontSize:"0.75rem",textAlign:"center",padding:"20px"}}>{L("Aucun prompt encore. Forge quelque chose ! 🤘","No prompts yet. Forge something! 🤘")}</div>}
          {history.map((h,i)=>(
            <div key={h.id} style={{borderBottom:"1px solid #1a1a1a",padding:"10px 0"}}>
              <div style={{fontSize:"0.58rem",color:"#555",letterSpacing:"1px",marginBottom:"4px"}}>#{history.length-i} · {h.date}</div>
              <div style={{fontSize:"0.72rem",color:"#aaa",lineHeight:1.6,fontFamily:"monospace"}}>{h.prompt.slice(0,120)}...</div>
              <MiniCopy text={h.prompt} style={{marginTop:"5px",background:"none",border:"1px solid #222",borderRadius:"4px",color:"#888",fontSize:"0.6rem",padding:"3px 8px",cursor:"pointer"}}/>
            </div>
          ))}
        </div>
        <div style={{height:80}}/>
      </div>}

      <SiteFooter onOpen={setLegalDoc} uiLang={uiLang}/>
      <LegalModal doc={legalDoc} onClose={()=>setLegalDoc(null)} uiLang={uiLang}/>
      <HammerFab onClick={generate}/>
    </div>
  );
}
