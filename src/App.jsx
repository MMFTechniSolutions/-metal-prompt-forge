import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase.js";

const RED = "#ff2e2e";
const DARK = "#0a0a0a";
const CARD = "#141414";

// ── i18n ──
const T = {
  en: {
    sub:"Suno AI · Deathcore × Metalcore × Groove Metal",
    tabs:{genre:"Genre",drums:"Drums",vocals:"Vocals",instrums:"Instruments",structure:"Structure",paroles:"Lyrics",organic:"Organic",exclude:"Exclude",output:"Output",tuto:"Learn",masterclass:"Masterclass",riff:"Riff",master:"Master",history:"History"},
    generate:"FORGE",generating:"FORGING...",
    step1t:"STEP 1 — Style of Music field",step1d:'Open Suno → Create → paste in "Style of Music" (max ~120 chars)',
    step2t:"STEP 2 — Lyrics field",step2d:"Paste structure blocks at the TOP of your lyrics. Suno reads them as instructions, not words to sing.",
    step3t:"STEP 3 — Production notes (DO NOT paste in Suno)",step3d:"Keep these for yourself — Suno would sing them as lyrics.",
    step4t:"STEP 4 — Exclude tags",step4d:"Add AFTER your style tags with minus sign: deathcore, -pop, -clean vocals",
    lockedMsg:"Requires",upgrade:"Upgrade →",logout:"Logout",signup:"Create free account",
    warn:"⚠️ Auto-logout in 5 min (inactivity)",plans:"See plans →",prompts:"prompts",
    noPrompt:"Hit the anvil to forge your prompt!",
  },
  fr: {
    sub:"Suno AI · Deathcore × Metalcore × Groove Metal",
    tabs:{genre:"Genre",drums:"Drums",vocals:"Vocals",instrums:"Instruments",structure:"Structure",paroles:"Paroles",organic:"Organic",exclude:"Exclude",output:"Output",tuto:"Tuto",masterclass:"Masterclass",riff:"Riff",master:"Master",history:"Historique"},
    generate:"FORGER",generating:"FORGE EN COURS...",
    step1t:"ÉTAPE 1 — Champ Style of Music",step1d:'Ouvre Suno → Create → colle dans "Style of Music" (max ~120 car.)',
    step2t:"ÉTAPE 2 — Champ Paroles (Lyrics)",step2d:"Colle les blocs de structure EN HAUT de tes paroles. Suno les lit comme instructions, pas comme paroles à chanter.",
    step3t:"ÉTAPE 3 — Notes de prod (NE PAS coller dans Suno)",step3d:"Garde ces notes pour toi — Suno les chanterait comme des paroles.",
    step4t:"ÉTAPE 4 — Tags d'exclusion",step4d:"Ajoute APRÈS tes style tags avec un signe moins : deathcore, -pop, -voix claires",
    lockedMsg:"Nécessite",upgrade:"Passer au plan →",logout:"Déconnexion",signup:"Créer un compte gratuit",
    warn:"⚠️ Déconnexion auto dans 5 min (inactivité)",plans:"Voir les plans →",prompts:"prompts",
    noPrompt:"Clique sur l'enclume pour forger ton prompt !",
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
// Genres : listes par tier remplacées par GENRE_FAMILIES (par époque). GENRES_NEW conservé pour les badges.
const GENRES_NEW = ["technical death metal","blackened deathcore","melodic death metal","symphonic metal","progressive metalcore","industrial metal","atmospheric black metal","blackened death metal","grindcore","funeral doom","dissonant death metal","avant-garde metal","melodic metalcore","post-hardcore","electronicore","arena metalcore","ambient metalcore","pop metalcore","modern metalcore","alternative metal","synth metalcore","atmospheric metalcore","progressive post-hardcore","modern alternative metal","hard rock","heavy metal","proto-metal","blues rock","traditional heavy metal","nwobhm","speed metal","power metal","glam metal","punk rock","hardcore punk","crossover thrash","d-beat","powerviolence","rapcore","post-black metal","blackgaze","technical deathcore","deathgrind","brutal death metal","drone metal","atmospheric sludge metal","depressive black metal"];
// Genres groupés par ÉPOQUE (arbre généalogique du metal) — styles seulement, tier conservé
const GENRE_FAMILIES = [
  {name:"Années 60-70 (Racines)", icon:"", genres:[
    {g:"hard rock",req:"free"},{g:"heavy metal",req:"free"},{g:"punk rock",req:"free"},{g:"proto-metal",req:"forge"},{g:"blues rock",req:"forge"},
  ]},
  {name:"Années 80", icon:"", genres:[
    {g:"traditional heavy metal",req:"forge"},{g:"nwobhm",req:"forge"},{g:"speed metal",req:"forge"},{g:"power metal",req:"forge"},{g:"glam metal",req:"forge"},
    {g:"thrash metal",req:"forge"},{g:"hardcore punk",req:"forge"},{g:"crossover thrash",req:"forge"},{g:"d-beat",req:"forge"},
    {g:"death metal",req:"free"},{g:"black metal",req:"forge"},{g:"doom metal",req:"forge"},{g:"grindcore",req:"forge"},
  ]},
  {name:"Années 90", icon:"", genres:[
    {g:"groove metal",req:"free"},{g:"metalcore",req:"free"},{g:"nu-metal",req:"forge"},{g:"rapcore",req:"forge"},{g:"alternative metal",req:"forge"},{g:"powerviolence",req:"forge"},
    {g:"melodic death metal",req:"forge"},{g:"technical death metal",req:"forge"},{g:"mathcore",req:"forge"},{g:"beatdown hardcore",req:"forge"},{g:"industrial metal",req:"forge"},{g:"symphonic metal",req:"forge"},
    {g:"blackened death metal",req:"forge"},{g:"atmospheric black metal",req:"forge"},{g:"funeral doom",req:"forge"},{g:"sludge metal",req:"forge"},{g:"post-metal",req:"forge"},{g:"progressive metal",req:"forge"},
    {g:"deathgrind",req:"forge"},{g:"brutal death metal",req:"forge"},{g:"drone metal",req:"elite"},
  ]},
  {name:"Années 2000", icon:"", genres:[
    {g:"deathcore",req:"free"},{g:"melodic deathcore",req:"forge"},{g:"melodic metalcore",req:"forge"},{g:"post-hardcore",req:"forge"},
    {g:"blackened deathcore",req:"forge"},
    {g:"slam metal",req:"forge"},{g:"dissonant death metal",req:"forge"},{g:"avant-garde metal",req:"forge"},
    {g:"atmospheric sludge metal",req:"forge"},{g:"depressive black metal",req:"elite"},
  ]},
  {name:"Années 2010", icon:"", genres:[
    {g:"djent",req:"forge"},{g:"modern metalcore",req:"forge"},
    {g:"progressive metalcore",req:"forge"},{g:"electronicore",req:"forge"},{g:"arena metalcore",req:"forge"},{g:"atmospheric metalcore",req:"forge"},
    {g:"post-black metal",req:"forge"},{g:"blackgaze",req:"forge"},{g:"technical deathcore",req:"forge"},
  ]},
  {name:"Années 2020", icon:"", genres:[
    {g:"synth metalcore",req:"forge"},
    {g:"ambient metalcore",req:"forge"},{g:"pop metalcore",req:"forge"},{g:"progressive post-hardcore",req:"forge"},{g:"modern alternative metal",req:"forge"},
  ]},
];

const MOOD     = ["crushing and heavy","sinister and dark","chaotic and frantic","groovy and headbang-worthy","melodic and atmospheric","dissonant","intense and aggressive","dark and menacing","epic","raw and abrasive"];
// Drums (style) : remplacé par DRUM_ERAS (par époque).
const DRUM_PROD= ["triggered drums","live drum sound","massive snare","clicky kick drum","trashy cymbals","programmed drums","natural room drums","reverb-heavy drums","punchy compressed drums","organic acoustic kit","raw garage drums","tight modern production","huge ambient drums","lo-fi drum sound"];
const DRUM_ERAS = [
  {name:"Années 60-70 (Racines)", icon:"", d:[
    {v:"straight rock beat",req:"free"},{v:"four-on-the-floor",req:"free"},{v:"bluesy shuffle",req:"free"},{v:"swing groove",req:"forge"},{v:"big room toms",req:"forge"},
  ]},
  {name:"Années 80", icon:"", d:[
    {v:"double bass drumming",req:"free"},{v:"d-beat",req:"free"},{v:"thrash beat",req:"free"},{v:"skank beat",req:"forge"},{v:"galloping drums",req:"forge"},
  ]},
  {name:"90s", icon:"", d:[
    {v:"blast beats",req:"free"},{v:"groovy mid-tempo drums",req:"free"},{v:"half-time groove",req:"free"},{v:"two-step beat",req:"forge"},{v:"tom-heavy fills",req:"forge"},{v:"tribal toms",req:"forge"},{v:"hyperblast beats",req:"pro"},
  ]},
  {name:"2000s", icon:"", d:[
    {v:"machine-gun double bass",req:"free"},{v:"stomp breakdown drums",req:"free"},{v:"deathcore groove",req:"free"},{v:"breakbeat percussion",req:"forge"},{v:"china cymbal accents",req:"forge"},{v:"bounce groove",req:"forge"},{v:"gravity blast beats",req:"pro"},
  ]},
  {name:"Moderne (10-20s)", icon:"", d:[
    {v:"polyrhythmic drums",req:"forge"},{v:"syncopated rhythms",req:"forge"},{v:"djent groove",req:"pro"},{v:"math metal drums",req:"pro"},{v:"ghost-note drumming",req:"forge"},{v:"tribal drumming",req:"forge"},{v:"modern hybrid blast",req:"elite"},
  ]},
];
const DRUM_NEW = ["thrash beat","galloping drums","two-step beat","deathcore groove","bounce groove","djent groove","math metal drums","modern hybrid blast","straight rock beat","four-on-the-floor","bluesy shuffle","swing groove","big room toms"];

// Vocals : listes par tier remplacées par VOCAL_ERAS (par époque). VOCAL_NEW conservé pour les badges.
// Voix par ÉPOQUE (bibliothèque enrichie · tier conservé) — mélange les ères pour des hybrides uniques
const VOCAL_ERAS = [
  {name:"Années 60-70 (Racines)", icon:"", vox:[
    {v:"bluesy clean vocals",req:"free"},{v:"raw rock vocals",req:"free"},{v:"soulful clean singing",req:"free"},{v:"high wailing vocals",req:"forge"},{v:"psychedelic vocals",req:"forge"},
  ]},
  {name:"Classique (80s)", icon:"", vox:[
    {v:"clean powerful vocals",req:"free"},{v:"melodic clean singing",req:"free"},{v:"high-pitched screams",req:"free"},
    {v:"clean melodic chorus vocals",req:"forge"},{v:"heavy metal wails",req:"forge"},{v:"anthemic clean vocals",req:"forge"},
    {v:"falsetto screams",req:"forge"},{v:"operatic vocals",req:"forge"},
  ]},
  {name:"90s", icon:"", vox:[
    {v:"guttural death growls",req:"free"},{v:"raspy harsh vocals",req:"free"},{v:"low death growls",req:"forge"},
    {v:"mid-range harsh vocals",req:"forge"},{v:"raspy mid screams",req:"forge"},{v:"tortured screams",req:"forge"},
    {v:"black metal shrieks",req:"forge"},{v:"low false-chord growls",req:"forge"},{v:"doom clean chants",req:"forge"},
  ]},
  {name:"2000s", icon:"", vox:[
    {v:"metalcore screams",req:"free"},{v:"pig squeals",req:"free"},{v:"deathcore lows",req:"forge"},
    {v:"gang shouts",req:"forge"},{v:"layered harsh vocals",req:"forge"},{v:"screamo screams",req:"forge"},
    {v:"guttural gurgles",req:"forge"},{v:"clean and scream combo",req:"forge"},
    {v:"rapped vocals",req:"forge"},{v:"aggressive rap vocals",req:"forge"},
  ]},
  {name:"Moderne (10-20s)", icon:"", vox:[
    {v:"hardcore beatdown vocals",req:"forge"},
    {v:"whispered spoken word",req:"forge"},{v:"demonic inhale vocals",req:"forge"},{v:"whisper-to-scream dynamics",req:"forge"},{v:"fry screams",req:"forge"},{v:"modern clean and harsh mix",req:"forge"},
    {v:"tunnel-throat gutturals",req:"forge"},{v:"goblin vocals",req:"forge"},{v:"throat singing",req:"forge"},{v:"spoken word narration",req:"forge"},{v:"choir vocals",req:"forge"},{v:"heavy breathing",req:"forge"},{v:"powerful belt",req:"forge"},{v:"ritual chant",req:"forge"},{v:"pitched-up shrieks",req:"forge"},
  ]},
];
const VOCAL_NEW = ["clean powerful vocals","melodic clean singing","heavy metal wails","anthemic clean vocals","low death growls","doom clean chants","deathcore lows","screamo screams","clean and scream combo","hardcore beatdown vocals","modern clean and harsh mix","pitched-up shrieks","bluesy clean vocals","raw rock vocals","soulful clean singing","high wailing vocals","psychedelic vocals","rapped vocals","aggressive rap vocals"];

const VFX    = ["vocal reverb","vocal distortion","pitch-shifted vocals","dual vocal tracking","megaphone effect","layered vocal harmonies","telephone EQ vocals","reverb tail vocals","doubled screams","gated vocal fx"];
const VOCAL_RANGE = ["piccolo highs","tenor","baritone","bass vocals","falsetto","soprano","alto","mezzo-soprano","countertenor","false chord highs","fry screams","mid-range screams","low gutturals","subharmonic lows","tunnel-throat lows"];
// Guitar (techniques) : remplacé par GUITAR_ERAS (par époque).
const GUITAR_ERAS = [
  {name:"Années 60-70 (Racines)", icon:"", d:[
    {v:"bluesy bends",req:"free"},{v:"pentatonic riffs",req:"free"},{v:"fuzz riffs",req:"free"},{v:"wah-wah leads",req:"forge"},{v:"vintage overdrive licks",req:"forge"},
  ]},
  {name:"Années 80", icon:"", d:[
    {v:"palm muting",req:"free"},{v:"tremolo picking",req:"free"},{v:"galloping riffs",req:"free"},{v:"sweep picking solos",req:"forge"},{v:"tapping",req:"forge"},{v:"whammy bar dives",req:"forge"},{v:"melodic shred solos",req:"pro"},
  ]},
  {name:"90s", icon:"", d:[
    {v:"chugging riffs",req:"free"},{v:"pinch harmonics",req:"free"},{v:"groove riffs",req:"free"},{v:"open string riffs",req:"forge"},{v:"drop-tuned riffs",req:"forge"},
  ]},
  {name:"2000s", icon:"", d:[
    {v:"breakdown chugs",req:"free"},{v:"legato runs",req:"forge"},{v:"dual guitar harmonies",req:"forge"},{v:"melodic lead harmonies",req:"pro"},
  ]},
  {name:"Moderne (10-20s)", icon:"", d:[
    {v:"djent-style syncopated riffs",req:"forge"},{v:"polymetric riffs",req:"pro"},{v:"tapped arpeggios",req:"pro"},{v:"djent chug-stutter",req:"pro"},{v:"dissonant riffs",req:"forge"},{v:"8-string staccato chugs",req:"pro"},{v:"ambient lead textures",req:"elite"},
  ]},
];
const GUITAR_NEW = ["galloping riffs","melodic shred solos","groove riffs","drop-tuned riffs","breakdown chugs","dual guitar harmonies","melodic lead harmonies","polymetric riffs","tapped arpeggios","djent chug-stutter","ambient lead textures","bluesy bends","pentatonic riffs","fuzz riffs","wah-wah leads","vintage overdrive licks"];
const TUNING = ["standard E tuning","drop D tuning","drop C tuning","drop B tuning","drop A tuning","drop G tuning","7-string guitar","8-string guitar","9-string guitar","baritone guitar"];
const GPROD  = ["heavy distortion","high gain amplifier","layered guitar tracks","quad-tracked guitars","tight low-end guitar tone","scooped mids tone","djent-style clean tone contrast","808 sub bass guitar","wall of sound guitar","reamped tone","doom fuzz wall","fizzy high-gain"];
const BASS_STYLE = ["fingerstyle bass","picked bass","slap bass","fretless bass","muted bass","palm mute bass","aggressive bass","grinding bass","tapped bass","lead bass","chord bass"];
const BASS_TECH  = ["bass tapping","bass harmonics","bass sweep","whammy bass","bass chord strums","two-hand tapping bass","bass tremolo","bass pinch harmonics","slap-pop bass","bass dive bombs"];
const BASS_TONE  = ["distorted bass","overdriven bass","clean bass","sub bass","growling bass","scooped bass tone","mid-heavy bass","dirty bass","fuzz bass","clanky bass tone","Dingwall-style bass","grindy pick bass","distorted fingerstyle bass"];
const BASS_TUNING= ["bass drop A","bass drop B","bass drop C","bass drop D","bass drop G","5-string bass","6-string bass","8-string bass","fanned-fret bass","standard bass tuning"];
const BASS_PROD  = ["bass heavy mix","bass-forward production","sub-bass boosted","tight punchy bass","808 bass","wall of low-end","chest-crushing bass","click bass attack","bass distortion layer"];
const SAX    = ["aggressive saxophone","baritone saxophone","alto saxophone","tenor saxophone","saxophone screech and wail","saxophone solo","skronking free-jazz sax","dissonant sax"];
const BRASS  = ["brass section","trumpet","trombone","french horn","epic horn section","fanfare brass","dissonant brass stabs"];
const KEYS   = ["keyboards","synthesizer","organ","piano","theremin","church organ","harpsichord","ambient synth pads","horror synth","mellotron","choir synth"];
const STRINGS= ["violin","cello","string orchestra","staccato strings","epic film strings","cello section","dissonant string clusters","tremolo strings"];
const PROD   = ["heavy production","lo-fi raw recording","modern metal production","wall of sound mixing","crisp high-end mix","analog warm tone","modern polished mix","scooped mids","tight bass","forward kick and snare","very loud drums and guitars","aggressive mix","clean digital production","atmospheric reverb-heavy mix"];
const ORG_RECORD = ["live recording","analog tape","rehearsal recording","room ambience","studio bleed","natural room sound","lo-fi raw recording","imperfect takes"];
const ORG_DRUMS  = ["live drums","natural drum room","overhead mics","snare bleed","kick bleed","human feel drumming","slightly loose tempo","natural drum dynamics","imperfect timing"];
const ORG_VOCALS = ["raw vocal take","no autotune","natural vocal imperfections","throat vocals","physical vocal strain","analog vocal chain","close mic'd vocals","wet room reverb","vocal breathiness"];
const ORG_GUITAR = ["tube amp recording","cabinet mic'd","natural pick attack","slight string buzz","analog distortion","tube saturation","live room guitar","natural feedback","amp hum"];
const ORG_AVOID  = ["perfect production","polished mix","crisp","digital","quantized","pitch corrected","over-produced","clean mix"];
// Émotions — méta d'affichage seulement (la recette émotion->tags vit dans /api/forge, secrète)
const EMOTIONS=[
  {id:'rage',label:'Rage',icon:'',c:'#ff2e2e'},
  {id:'melancholy',label:'Mélancolie',icon:'',c:'#5a8fd0'},
  {id:'despair',label:'Désespoir',icon:'',c:'#888'},
  {id:'triumph',label:'Triomphe',icon:'',c:'#ffcc00'},
  {id:'coldness',label:'Froideur',icon:'',c:'#7fd0ff'},
  {id:'defiance',label:'Défiance',icon:'',c:'#ff7a00'},
  {id:'dread',label:'Effroi',icon:'',c:'#9b59b6'},
  {id:'transcendence',label:'Transcendance',icon:'',c:'#b06bff'},
  {id:'madness',label:'Démence',icon:'',c:'#e91e8c'},
  {id:'profanation',label:'Profanation',icon:'',c:'#b00710'},
];
const EMO_LIMIT={free:2,forge:10,pro:10,elite:10,eliteplus:10};
const EXCL_GENRES = ["pop","jazz","classical","country","r&b","hip hop","electronic","edm","ambient","folk","reggae","latin","disco","funk","soul","gospel","blues","indie pop","synthpop","new age"];
const EXCL_VOCALS = ["clean vocals","autotune","pitch correction","electronic vocals","vocoder","falsetto","soft vocals","whisper vocals","pop vocals","processed vocals","digital vocal fx"];
const EXCL_PROD   = ["polished production","crisp mix","over-produced","digital production","perfect timing","quantized drums","sterile mix","radio mix"];
const EXCL_INSTRU = ["acoustic guitar","ukulele","bossa nova","flute","harp","banjo","mandolin","steel drum"];
// ── PRESETS (config optimisée Suno par sous-genre) ──
const PRESETS = {
  deathcore:  {label:"Deathcore", req:"free",  bpm:180, genres:["deathcore"], drums:["blast beats","double bass drumming","machine-gun double bass"], vocals:["guttural death growls","pig squeals"], mood:["crushing and heavy","sinister and dark"]},
  metalcore:  {label:"Metalcore", req:"free",  bpm:160, genres:["metalcore"], drums:["double bass drumming","half-time groove"], vocals:["metalcore screams","high-pitched screams"], mood:["intense and aggressive","melodic and atmospheric"]},
  djent:      {label:"Djent",     req:"forge", bpm:140, genres:["djent"], drums:["polyrhythmic drums","syncopated rhythms"], vocals:["mid-range harsh vocals"], guitar:["djent-style syncopated riffs","palm muting"], tuning:["8-string guitar"], mood:["groovy and headbang-worthy","intense and aggressive"]},
  thrash:     {label:"Thrash",    req:"forge", bpm:185, genres:["thrash metal"], drums:["d-beat","double bass drumming"], vocals:["raspy harsh vocals","high-pitched screams"], guitar:["tremolo picking","palm muting"], tuning:["standard E tuning"], mood:["intense and aggressive","raw and abrasive"]},
  blackmetal: {label:"Black Metal",req:"elite", bpm:200, genres:["black metal"], drums:["blast beats","hyperblast beats"], vocals:["black metal shrieks","high-pitched screams"], guitar:["tremolo picking","open string riffs"], tuning:["standard E tuning"], mood:["sinister and dark","dark and menacing"]},
  doom:       {label:"Doom",      req:"elite", bpm:70,  genres:["doom metal"], drums:["half-time groove","tom-heavy fills"], vocals:["tortured screams"], guitar:["palm muting","open string riffs"], tuning:["drop C tuning"], mood:["crushing and heavy","dark and menacing"]},
};
const THEMES = ["mort et décomposition","apocalypse","chaos intérieur","guerre et destruction","trahison","démons et obscurité","résistance et rébellion","nihilisme","vengeance","aliénation et solitude","horreur cosmique","violence et brutalité"];
const LYRIC_ATMO = ["sombre et menaçant","poétique et métaphorique","direct et violent","philosophique","narratif comme une histoire","cri de rage"];
const THEME_TR = {"mort et décomposition":"death and decay","apocalypse":"apocalypse","chaos intérieur":"inner chaos","guerre et destruction":"war and destruction","trahison":"betrayal","démons et obscurité":"demons and darkness","résistance et rébellion":"resistance and rebellion","nihilisme":"nihilism","vengeance":"vengeance","aliénation et solitude":"alienation and solitude","horreur cosmique":"cosmic horror","violence et brutalité":"violence and brutality"};
const ATMO_TR = {"sombre et menaçant":"dark and menacing","poétique et métaphorique":"poetic and metaphorical","direct et violent":"direct and violent","philosophique":"philosophical","narratif comme une histoire":"narrative like a story","cri de rage":"cry of rage"};
const LYRIC_LANGS = [
  {v:"en",l:"English"},{v:"fr",l:"Français"},{v:"de",l:"Deutsch"},
  {v:"es",l:"Español"},{v:"sv",l:"Svenska"},{v:"fi",l:"Suomi"},
  {v:"no",l:"Norsk"},{v:"mix",l:"Mix EN/FR"},
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
  {k:"intro",icon:"",name:"Intro",desc:"Riff d'ouverture brutal ou atmosphérique",descEn:"Brutal or atmospheric opening riff"},
  {k:"buildup",icon:"",name:"Build-up",desc:"Montée progressive avant explosion",descEn:"Gradual build before the explosion"},
  {k:"verse",icon:"",name:"Verse",desc:"Couplet vocal haché sur riffs lourds",descEn:"Choppy vocal verse over heavy riffs"},
  {k:"prechorus",icon:"",name:"Pre-Chorus",desc:"Tension avant le chorus",descEn:"Tension before the chorus"},
  {k:"chorus",icon:"",name:"Chorus",desc:"Hook principal, souvent plus groovy",descEn:"Main hook, often groovier"},
  {k:"breakdown",icon:"",name:"Breakdown",desc:"Section lente et écrasante, riff mosh",descEn:"Slow, crushing section, mosh riff"},
  {k:"halftime",icon:"",name:"Half-Time",desc:"Section groove ralentie, lourd et hypnotique",descEn:"Slowed groove section, heavy and hypnotic"},
  {k:"blastsection",icon:"",name:"Blast Section",desc:"Blast beats purs, sans mélodie, chaos total",descEn:"Pure blast beats, no melody, total chaos"},
  {k:"drop",icon:"",name:"Drop",desc:"Chute brutale après une montée de tension",descEn:"Brutal drop after a tension build"},
  {k:"solo",icon:"",name:"Guitar Solo",desc:"Solo lead shredding ou mélodique",descEn:"Shredding or melodic lead solo"},
  {k:"interlude",icon:"",name:"Interlude",desc:"Section instrumentale entre les parties",descEn:"Instrumental section between parts"},
  {k:"atmosphericbreak",icon:"",name:"Atmospheric Break",desc:"Ambiance calme/sinistre, tension suspendue",descEn:"Calm/sinister ambience, suspended tension"},
  {k:"spokenword",icon:"",name:"Spoken Word",desc:"Section parlée/narrative, sans chant",descEn:"Spoken/narrative section, no singing"},
  {k:"gangchant",icon:"",name:"Gang Chant",desc:"Chant collectif type mosh pit",descEn:"Collective mosh-pit style chant"},
  {k:"scream",icon:"",name:"Scream Section",desc:"Cris purs, voix seule sans musique",descEn:"Pure screams, vocals alone, no music"},
  {k:"riffbreak",icon:"",name:"Riff Break",desc:"Riff seul sans voix, groove pur",descEn:"Riff alone, no vocals, pure groove"},
  {k:"bridge",icon:"",name:"Bridge",desc:"Section contrastée, tension dramatique",descEn:"Contrasting section, dramatic tension"},
  {k:"outro",icon:"",name:"Outro",desc:"Fin explosive ou fade chaotique",descEn:"Explosive ending or chaotic fade"},
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
  free: {id:"free", label:"FREE", price:"$0", color:"#444", badge:null,
    features:["✅ 3 prompts d'essai gratuits","✅ Aperçu de la bibliothèque","❌ Reste verrouillé — passe à MetalPrompt"],
    featuresEn:["✅ 3 free trial prompts","✅ Library preview","❌ Rest locked — go MetalPrompt"]},
  // ⚠️ STRIPE : crée un produit 4,99$/mois et remplace le lien 'stripe' ci-dessous (l'actuel = ancien 8,99$)
  pro: {id:"pro", label:"METALPROMPT", price:"$4.99/mois", priceYear:"$49.99/an", color:"#ff2e2e", badge:"PRO",
    stripe:"https://buy.stripe.com/00w3cx2oM6uPbUSbUHfQI04", stripeYear:"https://buy.stripe.com/dRm6oJ4wU06rcYW9MzfQI06",
    features:["✅ TOUT le site débloqué","✅ Bibliothèque complète + sliders + 10 émotions","✅ Générateur de Riff complet (28 styles)","✅ Module Mastering (débruitage + EQ)","✅ Paroles par IA illimitées","✅ Prompts Principal · Cover · Extend","✅ Reco de modèle Suno · prompts illimités"],
    featuresEn:["✅ FULL site unlocked","✅ Full library + sliders + 10 emotions","✅ Complete Riff Generator (28 styles)","✅ Mastering module (denoise + EQ)","✅ Unlimited AI lyrics","✅ Principal · Cover · Extend prompts","✅ Suno model rec · unlimited prompts"]},
};
const payUrl = (base, email) =>
  base && !base.includes("YOUR_") && email
    ? `${base}?prefilled_email=${encodeURIComponent(email)}`
    : base;
// ── Auto-config semi-aléatoire par genre (agencement probable + variété anti-redondance) ──
const _ri=n=>Math.floor(Math.random()*n);
const _rand=(a,b)=>a+_ri(b-a+1);
const _pick=(arr,n)=>{const c=[...arr];const o=[];for(let i=0;i<n&&c.length;i++)o.push(c.splice(_ri(c.length),1)[0]);return o;};
// genreProfile + randStructure DÉPLACÉS côté serveur (/api/profile) — recette protégée
const TIER_RANK = {free:0,forge:1,pro:2,elite:3,eliteplus:4};
const LIMITS = {free:{prompts:3,lyrics:0},forge:{prompts:Infinity,lyrics:10},pro:{prompts:Infinity,lyrics:Infinity},elite:{prompts:Infinity,lyrics:Infinity},eliteplus:{prompts:Infinity,lyrics:Infinity}};
const TAB_REQ = {genre:"free",drums:"free",vocals:"free",guitar:"forge",bass:"forge",instru:"forge",structure:"forge",paroles:"pro",organic:"pro",exclude:"forge",output:"free",history:"pro"};

// Fusionne la structure enrichie + les paroles générées : chaque section reçoit ses paroles SOUS son tag (prêt à coller dans Suno)
function mergeStructLyrics(struct, lyrics){
  if(!lyrics||!lyrics.trim()) return struct;
  if(!struct||!struct.trim()) return lyrics;
  const isTag=l=>/^\s*\[[^\]]+\]\s*$/.test(l);
  const lsecs=[]; let cur=null;
  for(const l of lyrics.split(/\r?\n/)){
    if(isTag(l)){ cur={name:l.replace(/^\s*\[/,'').replace(/\].*$/,'').split(',')[0].split(/[0-9]/)[0].trim().toLowerCase(), body:[]}; lsecs.push(cur); }
    else if(cur){ cur.body.push(l); }
  }
  const used=new Array(lsecs.length).fill(false);
  const out=[];
  for(const sl of struct.split(/\r?\n/)){
    if(isTag(sl) && out.length) out.push('');
    out.push(sl);
    if(isTag(sl)){
      const name=sl.replace(/^\s*\[/,'').split(',')[0].split(/[0-9]/)[0].trim().toLowerCase();
      if(!name||/bpm/.test(name)) continue;
      const idx=lsecs.findIndex((s,i)=>!used[i]&&s.name===name);
      if(idx>=0){ used[idx]=true; const body=lsecs[idx].body.join('\n').replace(/^\n+|\n+$/g,''); if(body) out.push(body); }
    }
  }
  lsecs.forEach((s,i)=>{ if(!used[i]){ const body=s.body.join('\n').trim(); if(body){out.push('');out.push('['+s.name+']');out.push(body);} }});
  return out.join('\n');
}

// Boutons "Tout / Vider" pour une carte de tags (limite les clics)
function SelAll({all,set,L}){
  return (
    <div style={{display:"flex",gap:"6px",flexShrink:0}}>
      <button onClick={()=>set(all)} style={{background:"#0a1f00",border:"1px solid #2a5a2a",borderRadius:"5px",padding:"3px 10px",fontSize:"0.58rem",fontWeight:700,color:"#7fdd7f",cursor:"pointer"}}>{L("Tout","All")}</button>
      <button onClick={()=>set([])} style={{background:"#1a0000",border:"1px solid #4a1010",borderRadius:"5px",padding:"3px 10px",fontSize:"0.58rem",fontWeight:700,color:"#cc6666",cursor:"pointer"}}>{L("Vider","Clear")}</button>
    </div>
  );
}

// ── STYLES ──
const S = {
  wrap:    {background:DARK,color:"#e0e0e0",minHeight:"100vh"},
  header:  {background:"linear-gradient(135deg,#1a0000 0%,#0a0a0a 60%)",borderBottom:"1px solid #ff2e2e33",padding:"14px 20px 10px",textAlign:"center",position:"relative",boxShadow:"0 2px 40px #ff000022"},
  h1:      {fontSize:"1.6rem",letterSpacing:"6px",color:RED,textShadow:"0 0 30px #ff0000"},
  sub:     {fontSize:"0.55rem",color:"#444",letterSpacing:"4px",textTransform:"uppercase",marginTop:"2px"},
  navBtn:  (a,locked)=>({flex:"0 0 auto",padding:"7px 9px",fontSize:"0.52rem",fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",textAlign:"center",cursor:"pointer",border:"none",background:a?"#1a0000":"none",color:locked?"#2a2a2a":a?RED:"#555",borderBottom:a?`2px solid ${RED}`:"2px solid transparent",whiteSpace:"nowrap",transition:"all 0.2s"}),
  page:    {padding:"14px",maxWidth:"1000px",margin:"0 auto"},
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
function Tags({list,sel,toggle,lockedItems=[],newItems=[],tr=null,filter=""}) {
  const f=(filter||"").trim().toLowerCase();
  return (
    <div style={S.tags}>
      {list.map(v=>{
        const label=typeof v==="object"?v.l:v, val=typeof v==="object"?v.v:v;
        const disp=tr&&tr[label]?tr[label]:label;
        if(f && !String(label).toLowerCase().includes(f) && !String(val).toLowerCase().includes(f)) return null;
        const locked=lockedItems.includes(val);
        const isNew=newItems.includes(val);
        return <span key={val} style={S.tag(sel.has(val),locked)} onClick={()=>!locked&&toggle(val)}>{locked?"🔒 ":""}{disp}{isNew&&<span style={{marginLeft:"5px",fontSize:"0.5rem",fontWeight:900,color:"#fff",background:RED,borderRadius:"4px",padding:"1px 4px",letterSpacing:"0.5px",verticalAlign:"middle"}}>NEW</span>}</span>;
      })}
    </div>
  );
}

// Carte repliable réutilisable (cohérent avec les accordéons par époque)
function Collapse({title,n,selCount=0,defaultOpen=false,children}) {
  const [open,setOpen]=useState(defaultOpen);
  return (
    <div style={S.card}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",userSelect:"none"}}>
        <span style={{...S.ctitle,marginBottom:0}}>{title}{n!=null&&<span style={{color:"#555",marginLeft:"6px",fontWeight:400}}>({n})</span>}{selCount>0&&<span style={{marginLeft:"7px",fontSize:"0.5rem",fontWeight:900,color:"#fff",background:RED,borderRadius:"4px",padding:"1px 6px",verticalAlign:"middle"}}>{selCount}</span>}</span>
        <span style={{color:"#777",fontSize:"0.75rem"}}>{open?"▾":"▸"}</span>
      </div>
      {open&&<div style={{marginTop:"12px"}}>{children}</div>}
    </div>
  );
}

// Ligne repliable légère (pour le feel par section)
function FeelRow({name,cur,children}) {
  const [open,setOpen]=useState(false);
  return (
    <div style={{borderTop:"1px solid #161616"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",userSelect:"none",padding:"8px 2px"}}>
        <span style={{fontSize:"0.66rem",color:"#bbb",fontWeight:600}}>{name}{cur&&<span style={{marginLeft:"8px",fontSize:"0.55rem",color:"#4caf50",fontWeight:700}}>· {cur}</span>}</span>
        <span style={{color:"#777",fontSize:"0.7rem"}}>{open?"▾":"▸"}</span>
      </div>
      {open&&<div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap",padding:"2px 2px 10px"}}>{children}</div>}
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
      <span style={{fontSize:"1.5rem",display:"inline-block",transformOrigin:"bottom center"}} className={hitting?"hammer-anim":""}>🔨</span>
      {sparks.map(s=>(
        <span key={s.id} style={{position:"absolute",left:"50%",top:"50%",fontSize:"0.65rem",pointerEvents:"none",animation:"spark 0.55s ease forwards","--sx":s.sx,"--sy":s.sy}}>✦</span>
      ))}
    </button>
  );
}

function LockedOverlay({req,t,email,onRequestAuth}) {
  const tier=TIERS[req];
  const btnStyle={padding:"10px 24px",background:tier?.color||RED,borderRadius:"7px",color:req==="elite"?"#fff":"#000",fontSize:"0.8rem",fontWeight:900,letterSpacing:"2px",textDecoration:"none",textTransform:"uppercase",border:"none",cursor:"pointer"};
  return (
    <div style={{...S.page,minHeight:"260px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"14px",textAlign:"center",padding:"40px 20px"}}>
      <div style={{fontSize:"3rem"}}>🔒</div>
      <div style={{fontSize:"0.9rem",fontWeight:700,color:"#e0e0e0"}}>{t.lockedMsg} <span style={{color:tier?.color||RED}}>{tier?.label}</span></div>
      {email
        ? <a href={payUrl(tier?.stripe,email)||"#"} target="_blank" rel="noreferrer" style={btnStyle}>{t.upgrade}</a>
        : <button onClick={onRequestAuth} style={btnStyle}>{t.signup}</button>}
    </div>
  );
}

function PaywallModal({onClose,email,uiLang}) {
  const [sel,setSel]=useState("pro");
  const [billing,setBilling]=useState("month");
  const tier=TIERS[sel];
  const L=(fr,en)=>uiLang==="fr"?fr:en;
  const year=billing==="year";
  const priceOf=t=>year&&t.priceYear?t.priceYear:t.price;
  const checkoutUrl=year&&tier.stripeYear?tier.stripeYear:tier.stripe;
  return (
    <div style={{position:"fixed",inset:0,background:"#000000dd",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",overflowY:"auto"}}>
      <div style={{background:"#0f0f0f",border:"1px solid #333",borderRadius:"14px",padding:"22px 18px",maxWidth:"420px",width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:"14px"}}>
          <div style={{fontSize:"0.6rem",color:"#555",letterSpacing:"3px",textTransform:"uppercase",marginBottom:"6px"}}>{L("PROMPT GRATUIT UTILISÉ","FREE PROMPT USED")}</div>
          <div className="forge-title" style={{fontSize:"1.5rem",color:"#fff",letterSpacing:"4px"}}>{L("CHOISIS TON PLAN","CHOOSE YOUR PLAN")}</div>
        </div>
        {Object.values(TIERS).some(t=>t.priceYear)&&<div style={{display:"flex",justifyContent:"center",gap:"8px",marginBottom:"16px"}}>
          <button onClick={()=>setBilling("month")} style={{padding:"6px 16px",borderRadius:"20px",border:`1px solid ${!year?"#ff2e2e":"#333"}`,background:!year?"#1a0000":"#111",color:!year?"#ff7070":"#666",fontSize:"0.66rem",fontWeight:700,cursor:"pointer"}}>{L("Mensuel","Monthly")}</button>
          <button onClick={()=>setBilling("year")} style={{padding:"6px 16px",borderRadius:"20px",border:`1px solid ${year?"#4caf50":"#333"}`,background:year?"#0a1f00":"#111",color:year?"#7fdd7f":"#666",fontSize:"0.66rem",fontWeight:700,cursor:"pointer"}}>{L("Annuel","Annual")} · {L("2 mois gratuits","2 months free")}</button>
        </div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"18px"}}>
          {Object.values(TIERS).filter(t=>t.id!=="free").map(t=>(
            <div key={t.id} onClick={()=>setSel(t.id)}
              style={{background:sel===t.id?"#1a0000":"#111",border:`1.5px solid ${sel===t.id?t.color:"#222"}`,borderRadius:"8px",padding:"10px 6px",textAlign:"center",cursor:"pointer"}}>
              <div style={{fontSize:"0.65rem",fontWeight:900,color:sel===t.id?t.color:"#555",letterSpacing:"1px",marginBottom:"4px"}}>{t.label}</div>
              {t.launch&&<div style={{fontSize:"0.55rem",color:"#777",textDecoration:"line-through"}}>{(year&&t.priceOldYear?t.priceOldYear:t.priceOld||"").split("/")[0]}</div>}
              <div style={{fontSize:"0.9rem",fontWeight:900,color:t.launch?"#7fdd7f":"#fff"}}>{priceOf(t).split("/")[0]}</div>
              <div style={{fontSize:"0.5rem",color:"#444"}}>{year&&t.priceYear?L("/an","/yr"):L("/mois","/mo")} · USD</div>
              {t.launch&&<div style={{fontSize:"0.42rem",color:"#7fdd7f",fontWeight:900,letterSpacing:"0.5px",marginTop:"2px"}}>{L("LANCEMENT","LAUNCH")}</div>}
            </div>
          ))}
        </div>
        <div style={{background:"#0a0a0a",border:`1px solid ${tier.color}22`,borderRadius:"8px",padding:"14px",marginBottom:"16px",minHeight:"160px"}}>
          <div style={{fontSize:"0.58rem",color:tier.color,letterSpacing:"2px",textTransform:"uppercase",fontWeight:800,marginBottom:"10px"}}>{tier.label} — {tier.launch&&<span style={{textDecoration:"line-through",color:"#666",marginRight:"5px"}}>{(year&&tier.priceOldYear?tier.priceOldYear:tier.priceOld||"").split("/")[0]}</span>}{priceOf(tier)} {tier.launch?L("· LANCEMENT","· LAUNCH"):""} — {L("INCLUS","INCLUDED")}</div>
          {(uiLang==="en"?tier.featuresEn:tier.features)?.map(f=><div key={f} style={{fontSize:"0.7rem",color:f.startsWith("✅")?"#ccc":"#333",padding:"3px 0"}}>{f}</div>)}
        </div>
        <a href={payUrl(checkoutUrl,email)} target="_blank" rel="noreferrer"
          style={{display:"block",width:"100%",padding:"14px",background:tier.color,borderRadius:"8px",color:sel==="elite"?"#fff":"#000",fontWeight:900,fontSize:"0.85rem",letterSpacing:"2px",textTransform:"uppercase",textDecoration:"none",textAlign:"center",marginBottom:"10px"}}>
          {L("COMMENCER","START")} {tier.label} {year?L("(annuel)","(annual)"):""}
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
        <div className="forge-title" style={{fontSize:"clamp(2.2rem,8vw,3.5rem)",color:RED,letterSpacing:"8px",textShadow:"0 0 40px #ff000088",marginBottom:"6px"}}>METAL PROMPT FORGE</div>
        <div style={{fontSize:"0.65rem",color:"#555",letterSpacing:"5px",textTransform:"uppercase",marginBottom:"30px"}}>{uiLang==="fr"?"Le générateur de prompts Suno pour musiciens metal":"The Suno prompt generator for metal musicians"}</div>
        <div style={{maxWidth:"480px",margin:"0 auto 30px",background:"#0f0f0f",border:`1px solid ${examples[activeEx].color}33`,borderRadius:"10px",padding:"14px 16px",transition:"border-color 0.5s"}}>
          <div style={{fontSize:"0.55rem",color:examples[activeEx].color,letterSpacing:"3px",textTransform:"uppercase",fontWeight:800,marginBottom:"8px"}}>{L("EXEMPLE","EXAMPLE")} — {examples[activeEx].genre}</div>
          <div style={{fontSize:"0.75rem",color:"#aaa",lineHeight:1.8,fontFamily:"monospace"}}>{examples[activeEx].tags}</div>
        </div>
        <button onClick={onEnter} className="pulse" style={{padding:"16px 36px",background:RED,border:"none",borderRadius:"8px",color:"#000",fontSize:"1rem",fontWeight:900,letterSpacing:"3px",textTransform:"uppercase",cursor:"pointer",boxShadow:"0 6px 30px #ff000077"}}>
          {uiLang==="fr"?"LANCER L'APP":"LAUNCH APP"}
        </button>
        <div style={{fontSize:"0.6rem",color:"#444",marginTop:"10px"}}>{uiLang==="fr"?"Gratuit · 3 prompts offerts · Aucune carte requise":"Free · 3 prompts included · No card required"}</div>
      </div>

      {/* MISSION / POURQUOI */}
      <div style={{padding:"34px 20px",textAlign:"center",borderBottom:"1px solid #1a1a1a",background:"linear-gradient(180deg,#0d0606,#0a0a0a)"}}>
        <div style={{maxWidth:"580px",margin:"0 auto"}}>
          <div style={{fontSize:"0.6rem",color:RED,letterSpacing:"3px",fontWeight:800,textTransform:"uppercase",marginBottom:"12px"}}>{uiLang==="fr"?"Notre mission":"Our mission"}</div>
          <div style={{fontSize:"0.95rem",color:"#ddd",lineHeight:1.85}}>{uiLang==="fr"?"On était tannés d'entendre du metal IA qui sonne en plastique. Alors on a bâti l'outil qu'on voulait : un forgeron de prompts qui sort du VRAI metal — brutal, organique, humain. Notre mission : aider les musiciens à progresser, ET ouvrir la création musicale à ceux qui ne jouent pas du tout. Que l'idée brutale dans ta tête devienne une chanson. ":"We were sick of AI metal that sounds like plastic. So we built the tool we wanted: a prompt forge that delivers REAL metal — brutal, organic, human. Our mission: help musicians level up, AND open music creation to those who don't play at all. Turn the brutal idea in your head into a track. "}</div>
        </div>
      </div>

      <div style={{padding:"36px 20px",maxWidth:"560px",margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:"28px"}}>
          <div className="forge-title" style={{fontSize:"1.4rem",color:"#fff",letterSpacing:"4px",marginBottom:"6px"}}>{uiLang==="fr"?"POURQUOI METAL PROMPT FORGE ?":"WHY METAL PROMPT FORGE?"}</div>
          <div style={{fontSize:"0.72rem",color:"#555",lineHeight:1.8}}>{uiLang==="fr"?"Suno génère mieux quand les prompts sont précis.":"Suno generates better when prompts are precise."}</div>
        </div>
        {[
          {icon:"",title:uiLang==="fr"?"11 onglets de personnalisation":"11 customization tabs",desc:uiLang==="fr"?"Genre, drums, vocals, guitar, basse, structure, paroles, organic, exclude — tout est là.":"Genre, drums, vocals, guitar, bass, structure, lyrics, organic, exclude — all here."},
          {icon:"",title:uiLang==="fr"?"Paroles générées par IA":"AI-generated lyrics",desc:uiLang==="fr"?"Claude compose des paroles metal uniques avec thèmes, atmosphère et anti-répétition.":"Claude composes unique metal lyrics with themes, atmosphere and anti-repetition logic."},
          {icon:"",title:uiLang==="fr"?"Mode Organic / Anti-AI":"Organic / Anti-AI Mode",desc:uiLang==="fr"?"Des tags spéciaux pour rendre tes générations Suno plus humaines.":"Special tags to make your Suno generations sound more human."},
          {icon:"",title:uiLang==="fr"?"Prompt prêt à coller":"Paste-ready prompt",desc:uiLang==="fr"?"Style tags, structure et notes de prod séparés — tu sais exactement où coller quoi.":"Style tags, structure and prod notes separated — you know exactly where to paste what."},
          {icon:"",title:uiLang==="fr"?"Tags d'exclusion (Elite)":"Exclusion tags (Elite)",desc:uiLang==="fr"?"Dis à Suno ce qu'il doit éviter. Fini le piano qui s'invite dans ton deathcore.":"Tell Suno what to avoid. No more piano crashing your deathcore."},
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
// Remplace les champs [ ] par tes vraies infos avant publication.
const LEGAL = {
  privacy: `POLITIQUE DE CONFIDENTIALITÉ — MetalPrompt
Dernière mise à jour : 27 juin 2026

1. QUI SOMMES-NOUS
Le site MetalPrompt (« le Service ») est édité par MMF Techni-Solutions, entreprise enregistrée au Québec (NEQ : 2279516308), située au 2180 rue de Rome, Trois-Rivières (Québec) G8W 0P1. Cette politique est conforme à la Loi sur la protection des renseignements personnels dans le secteur privé du Québec (Loi 25).

2. RESPONSABLE DE LA PROTECTION DES RENSEIGNEMENTS PERSONNELS
François Lajoie-Levesque — mmftechnisolutions@gmail.com

3. RENSEIGNEMENTS RECUEILLIS
• Compte : adresse courriel, mot de passe chiffré.
• Paiement : historique d'abonnement, plan actif (via Stripe — nous ne stockons aucun numéro de carte).
• Utilisation : prompts générés, préférences, historique.
• Crédits & génération : solde de crédits, métadonnées des morceaux générés (titre, prompt, durée).
• Technique : adresse IP, type d'appareil, navigateur.
Mesure d'audience (AVEC votre consentement) : Google Analytics, déployé via Google Tag Manager, pour comprendre l'usage du site (pages vues, appareil, provenance). Ces témoins ne sont déposés qu'après votre consentement donné via le bandeau. Aucun suivi publicitaire. Retrait possible en tout temps via le lien « Témoins » au bas du site.

4. FINALITÉS
Créer et gérer votre compte ; fournir le Service ; traiter les paiements ; communiquer avec vous ; améliorer et sécuriser le Service ; respecter nos obligations légales. Nous ne vendons jamais vos renseignements.

5. CONSENTEMENT
En utilisant le Service, vous consentez à la collecte décrite. Vous pouvez retirer votre consentement en tout temps.

6. SOUS-TRAITANTS
Supabase (auth / base de données), Stripe (paiements), Vercel (hébergement), ElevenLabs (génération musicale par IA), Google (connexion « Se connecter avec Google » ; Google Analytics / Google Tag Manager pour la mesure d'audience, activés uniquement avec votre consentement). Certains traitent des données hors Québec ; nous procédons à une évaluation des facteurs relatifs à la vie privée avant toute communication hors Québec, conformément à la Loi 25.

7. CONSERVATION
Données conservées tant que le compte est actif, puis pour la durée requise par nos obligations légales. Suppression du compte possible sur demande.

8. SÉCURITÉ
Mesures raisonnables : chiffrement des mots de passe, accès restreint, fournisseurs sécurisés.

9. VOS DROITS (Loi 25)
Accès, rectification, retrait du consentement / suppression, portabilité, et plainte auprès de la Commission d'accès à l'information du Québec (CAI). Pour exercer ces droits : mmftechnisolutions@gmail.com (réponse sous 30 jours).

10. TÉMOINS (COOKIES)
Témoins essentiels : strictement nécessaires au fonctionnement (session, authentification) — toujours actifs.
Témoins de mesure d'audience : Google Analytics (via Google Tag Manager). Ils ne sont déposés qu'APRÈS votre consentement explicite, recueilli via le bandeau affiché à la première visite (conforme à la Loi 25). Vous pouvez accepter, refuser ou retirer votre consentement en tout temps via le lien « Témoins » au bas de chaque page.

11. INCIDENT DE CONFIDENTIALITÉ
En cas d'incident à risque sérieux, nous aviserons les personnes concernées et la CAI.

12. NOUS JOINDRE
mmftechnisolutions@gmail.com — MMF Techni-Solutions, 2180 rue de Rome, Trois-Rivières (Québec) G8W 0P1.`,

  terms: `CONDITIONS D'UTILISATION — MetalPrompt
Dernière mise à jour : 26 juin 2026

1. ACCEPTATION
En accédant au Service, édité par MMF Techni-Solutions (NEQ 2279516308), vous acceptez les présentes conditions.

2. DESCRIPTION
MetalPrompt est un outil de pré-production musicale par IA (musique uniquement) : il aide à créer des prompts, riffs, structures et sons metal. Vous pouvez (1) générer de la musique directement dans le Service via notre fournisseur ElevenLabs (Eleven Music), ou (2) exporter vos prompts vers des plateformes tierces (ex. Suno AI) pour générer sur votre propre compte. Le Service n'est PAS affilié à Suno, ElevenLabs ni à aucune plateforme tierce ; les marques citées appartiennent à leurs propriétaires.

3. COMPTE
Vous fournissez des informations exactes, gardez votre mot de passe confidentiel et êtes responsable de l'activité de votre compte. Nous pouvons suspendre un compte en cas de violation.

4. UTILISATION ACCEPTABLE
Interdit : usage illégal/frauduleux, contournement des limitations ou de la sécurité, revente non autorisée, surcharge/piratage de l'infrastructure, génération de contenu illégal ou portant atteinte aux droits d'autrui.

5. PROPRIÉTÉ INTELLECTUELLE
Le Service (code, design, textes, marque) appartient à MMF Techni-Solutions. Les prompts que vous générez vous appartiennent ; vous êtes seul responsable de leur usage sur des plateformes tierces. Musique générée DANS le Service : produite via ElevenLabs (Eleven Music), entraîné sur des données licenciées. Vos droits sont régis par les conditions d'ElevenLabs, notamment : (a) usage commercial permis sur les plans payants, conservé même après résiliation ; (b) interdiction d'inclure des noms d'artistes, groupes, chansons ou albums réels dans les invites ; (c) une piste 100 % générée par IA n'est généralement pas protégeable par droit d'auteur — vous obtenez un droit d'usage, non un copyright, et ne pouvez pas revendre une piste brute « telle quelle » en revendiquant un copyright original ; (d) la distribution directe des pistes brutes sur les plateformes de streaming (Spotify, Apple Music, etc.) pour percevoir des redevances n'est PAS permise ; (e) œuvres dérivées : si vous retravaillez la piste de façon créative et significative (édition, instruments réels, voix, mixage/mastering), vous créez une œuvre originale que vous pouvez protéger et exploiter — conservez vos fichiers de session comme preuve de votre apport humain. Vous êtes seul responsable de respecter les conditions d'ElevenLabs et les lois applicables.

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
Dernière mise à jour : 28 juin 2026

1. OBJET
Vente des abonnements payants du Service, édité par MMF Techni-Solutions (NEQ 2279516308), 2180 rue de Rome, Trois-Rivières (Québec) G8W 0P1, sur https://metalprompt.com.

2. INFOS AVANT L'ACHAT (CONTRAT À DISTANCE)
Avant votre paiement, nous indiquons : notre identité et nos coordonnées, la description du plan, le prix total en USD (dollars américains ; taxes applicables indiquées au paiement), la fréquence de facturation et le renouvellement, les modalités de résiliation et de remboursement. Après l'achat, vous recevez par courriel une confirmation tenant lieu de copie du contrat.

3. PLANS ET PAIEMENT
Abonnement unique donnant accès à l'ensemble du Service, offert en formule mensuelle (4,99 $ US/mois) ou annuelle (49,99 $ US/an, soit ~2 mois gratuits). TOUS LES PRIX SONT EN DOLLARS AMÉRICAINS (USD). Si vous payez avec une carte libellée dans une autre devise (ex. CAD), votre institution financière peut appliquer des frais de conversion qui ne sont PAS perçus par MetalPrompt. Paiements sécurisés par Stripe ; aucune donnée complète de carte n'est stockée. Vous autorisez le prélèvement récurrent jusqu'à résiliation. Prix modifiables pour les périodes futures, avec préavis.

3.1 CRÉDITS DE GÉNÉRATION
L'abonnement donne un accès ILLIMITÉ au générateur de prompts, au générateur de riffs et au module de mastering. La génération de musique audio DANS le Service, si et quand cette fonction sera activée, fonctionnera par crédits dont les modalités seront affichées sur la page des tarifs au moment de l'activation. L'export de prompts vers des plateformes tierces (ex. Suno) n'utilise aucun crédit.

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
Dernière mise à jour : 26 juin 2026

ÉDITEUR
MMF Techni-Solutions — NEQ : 2279516308
Adresse : 2180 rue de Rome, Trois-Rivières (Québec) G8W 0P1
Courriel : mmftechnisolutions@gmail.com
Responsable de la publication : François Lajoie-Levesque

HÉBERGEMENT
Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis — vercel.com

SERVICES TIERS
Supabase (auth / base de données), Stripe (paiements), ElevenLabs (génération musicale par IA), Vercel (hébergement).

PROPRIÉTÉ INTELLECTUELLE
La marque « MetalPrompt », le design, les textes et le code sont protégés. Reproduction non autorisée interdite.

CONTACT
mmftechnisolutions@gmail.com`,

  about: `À PROPOS — MetalPrompt

MetalPrompt, c'est plus qu'un prompteur. C'est LA plateforme du metalhead. 
« La qualité, pas la quantité. »

NOTRE MISSION
Aider les musiciens à progresser, ET ouvrir la création musicale à ceux qui ne jouent pas du tout.

QUALITÉ > QUANTITÉ — ET ÉCO-RESPONSABLE
On ne mise pas sur la génération à la chaîne. Chaque génération IA consomme de l'énergie ; on privilégie moins de pistes, mieux travaillées — des prompts béton, de vrais outils de pré-production — plutôt que de spammer des centaines de morceaux jetables. Créer mieux avec moins : meilleur pour ta musique ET pour la planète. 
NOTRE MANIFESTE
On était tannés du metal IA qui sonne en plastique. Ces chansons plates, sans âme, crachées à la chaîne pis oubliées aussi vite. De la musique jetable.

Le metal, c'est pas ça. Le metal, ça frappe. Ça vit. Ça vient des tripes. Une vraie chanson transporte une émotion, dit quelque chose — et te donne des frissons.

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

Le metal, ç'a jamais été ça. Ça frappe, ça vit, ça vient des tripes. Une vraie chanson transporte une émotion — pis quand c'est la tienne qui prend vie, ça te donne des frissons.

C'est pour ça qu'on a bâti MetalPrompt. Pas une poubelle à chansons jetables : une forge. Un outil pour construire — du succès, de l'apprentissage, du plaisir.

Que tu joues depuis vingt ans ou que t'aies jamais touché une guitare, si t'as du metal dans la tête, on veut te donner le moyen de le sortir.

Pis que ce soit clair : c'est pour les musiciens. Jamais contre. On grandit ensemble.

Bienvenue dans la forge.

— L'équipe de MetalPrompt

MetalPrompt — la plateforme du metalhead. 
Édité par MMF Techni-Solutions · mmftechnisolutions@gmail.com`,

  aboutEn: `ABOUT — MetalPrompt

MetalPrompt is more than a prompter. It's THE metalhead platform. 
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

MetalPrompt — the metalhead platform. 
Published by MMF Techni-Solutions · mmftechnisolutions@gmail.com`,
};

function SiteFooter({onOpen,uiLang}){
  const fr=uiLang==="fr";
  const lk={background:"none",border:"none",color:"#666",fontSize:"0.62rem",cursor:"pointer",textDecoration:"underline",padding:"2px 6px"};
  return (
    <div style={{borderTop:"1px solid #1a1a1a",padding:"18px 12px 40px",textAlign:"center",display:"flex",flexWrap:"wrap",gap:"4px",justifyContent:"center",alignItems:"center"}}>
      <span style={{fontSize:"0.58rem",color:"#444"}}>© {new Date().getFullYear()} MetalPrompt ·</span>
      <button style={{...lk,color:RED,fontWeight:700}} onClick={()=>onOpen("about")}>{fr?"À propos":"About"}</button>
      <a href="/guide.html" target="_blank" rel="noreferrer" style={{...lk,display:"inline-block"}}>{fr?"Guide Suno":"Suno Guide"}</a>
      <button style={lk} onClick={()=>onOpen("privacy")}>{fr?"Confidentialité":"Privacy"}</button>
      <button style={lk} onClick={()=>{try{localStorage.removeItem("mp_consent");}catch(e){}window.dispatchEvent(new Event("mp-open-consent"));}}>{fr?"Témoins":"Cookies"}</button>
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
          <button onClick={onClose} style={{background:"none",border:"1px solid #333",borderRadius:"4px",color:"#888",fontSize:"0.8rem",padding:"4px 10px",cursor:"pointer"}}></button>
        </div>
        {!fr&&doc!=="about"&&<div style={{fontSize:"0.6rem",color:"#777",marginBottom:"10px",fontStyle:"italic"}}>Legal documents are provided in French (Québec law).</div>}
        <pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",fontSize:"0.72rem",lineHeight:1.7,color:"#bbb"}}>{doc==="about"?(fr?LEGAL.about:LEGAL.aboutEn):LEGAL[doc]}</pre>
      </div>
    </div>
  );
}

function UserChip({user,uiLang,tierBadge,tierColor,isElite,onLogout,onRequestAuth}){
  const [open,setOpen]=useState(false);
  const fr=uiLang==="fr";
  if(!user) return <button onClick={onRequestAuth} style={{background:RED,border:"none",borderRadius:"6px",color:"#000",fontSize:"0.55rem",fontWeight:800,padding:"5px 11px",cursor:"pointer",letterSpacing:"0.5px"}}>{fr?"Se connecter":"Sign in"}</button>;
  const email=user.email||"";
  const avIdx=(Array.from(email).reduce((a,c)=>a+c.charCodeAt(0),0)%6)+1;
  const avatar="/avatars/av"+avIdx+".png";
  return (
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:"6px",background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:"20px",padding:"3px 8px 3px 3px",cursor:"pointer"}}>
        <img src={avatar} alt="" style={{width:"22px",height:"22px",borderRadius:"50%",border:`1.5px solid ${tierColor||RED}`,objectFit:"cover"}}/>
        <span style={{fontSize:"0.55rem",color:"#bbb",maxWidth:"90px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{email.split("@")[0]}</span>
        <span style={{width:"6px",height:"6px",borderRadius:"50%",background:"#4caf50",boxShadow:"0 0 6px #4caf50"}}/>
        <span style={{fontSize:"0.5rem",color:"#666"}}>▾</span>
      </button>
      {open&&(<>
        <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:299}}/>
        <div style={{position:"absolute",right:0,top:"32px",background:"#0f0f0f",border:"1px solid #2a2a2a",borderRadius:"8px",padding:"12px",minWidth:"180px",zIndex:300,boxShadow:"0 8px 28px #000c",textAlign:"left"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:"8px"}}><img src={avatar} alt="" style={{width:"52px",height:"52px",borderRadius:"50%",border:`2px solid ${tierColor||RED}`}}/></div>
          <div style={{fontSize:"0.5rem",color:"#4caf50",letterSpacing:"1px",textTransform:"uppercase",marginBottom:"3px",textAlign:"center"}}>● {fr?"Connecté":"Signed in"}</div>
          <div style={{fontSize:"0.62rem",color:"#ddd",wordBreak:"break-all",marginBottom:"10px"}}>{email}</div>
          <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"10px"}}>
            <span style={{fontSize:"0.5rem",color:"#666",textTransform:"uppercase",letterSpacing:"1px"}}>{fr?"Plan":"Plan"}</span>
            <span style={{background:tierColor||"#444",color:isElite?"#fff":"#000",fontSize:"0.5rem",fontWeight:900,padding:"2px 8px",borderRadius:"8px",letterSpacing:"0.5px"}}>{tierBadge||"FREE"}</span>
          </div>
          <button onClick={onLogout} style={{width:"100%",background:"#1a0000",border:"1px solid #5a0000",borderRadius:"5px",color:"#ff7070",fontSize:"0.6rem",fontWeight:700,padding:"7px",cursor:"pointer",letterSpacing:"0.5px"}}>{fr?"Déconnexion":"Log out"}</button>
        </div>
      </>)}
    </div>
  );
}

function loadGTM(){
  if(typeof window==='undefined'||window.__gtmLoaded)return;window.__gtmLoaded=true;
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-N8QF6Z96');
}
function CookieBanner({uiLang,onPrivacy}){
  const fr=uiLang!=="en";
  const [show,setShow]=useState(false);
  useEffect(()=>{
    let c=null;try{c=localStorage.getItem('mp_consent');}catch(e){}
    if(c==='granted')loadGTM();
    else if(c!=='denied')setShow(true);
    const reopen=()=>setShow(true);
    window.addEventListener('mp-open-consent',reopen);
    return ()=>window.removeEventListener('mp-open-consent',reopen);
  },[]);
  const decide=(v)=>{try{localStorage.setItem('mp_consent',v);}catch(e){}if(v==='granted')loadGTM();setShow(false);};
  if(!show)return null;
  return (
    <div style={{position:"fixed",left:0,right:0,bottom:0,zIndex:2000,background:"#0c0c0e",borderTop:"2px solid #c0392b",padding:"16px 18px",display:"flex",flexWrap:"wrap",gap:"12px",alignItems:"center",justifyContent:"center",boxShadow:"0 -6px 24px #000a"}}>
      <div style={{flex:"1 1 360px",maxWidth:"640px",fontSize:"0.72rem",lineHeight:1.55,color:"#cfcfd4"}}>
        {fr?"On utilise des témoins de mesure d'audience (Google Analytics via Tag Manager) pour améliorer le site. Ils ne se chargent qu'avec ton accord. Les témoins essentiels (connexion, session) restent toujours actifs.":"We use audience-measurement cookies (Google Analytics via Tag Manager) to improve the site. They load only with your consent. Essential cookies (login, session) stay active."}{" "}
        <span onClick={onPrivacy} style={{color:"#e74c3c",textDecoration:"underline",cursor:"pointer"}}>{fr?"Politique de confidentialité":"Privacy policy"}</span>
      </div>
      <div style={{display:"flex",gap:"8px",flexShrink:0}}>
        <button onClick={()=>decide('denied')} style={{background:"transparent",border:"1px solid #444",color:"#bbb",borderRadius:"6px",padding:"9px 16px",fontSize:"0.72rem",fontWeight:700,cursor:"pointer"}}>{fr?"Refuser":"Decline"}</button>
        <button onClick={()=>decide('granted')} style={{background:"#c0392b",border:"none",color:"#fff",borderRadius:"6px",padding:"9px 18px",fontSize:"0.72rem",fontWeight:800,cursor:"pointer",letterSpacing:"0.5px"}}>{fr?"Accepter":"Accept"}</button>
      </div>
    </div>
  );
}
function Manifesto({onClose,uiLang}){
  const fr=uiLang!=="en";
  const piliers=[
    [fr?"Une forge, pas une usine":"A forge, not a factory", fr?"Pas des chansons jetables — les outils pour forger TON son.":"Not throwaway songs — tools to forge YOUR sound."],
    [fr?"L'artiste au centre":"The artist at the center", fr?"L'IA t'assiste, elle te remplace pas. Ta vision reste à toi.":"AI assists you, never replaces you. Your vision stays yours."],
    [fr?"Libre des majors":"Free from the majors", fr?"Les mêmes outils que les gros, sans permission à demander.":"Same tools as the big players, no permission needed."],
    [fr?"Respect de l'héritage":"Respecting the lineage", fr?"Du NWOBHM au djent, on honore ceux qui ont bâti le metal.":"From NWOBHM to djent, we honor those who built metal."],
  ];
  return (
    <div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",overflowY:"auto"}}>
      <div style={{maxWidth:"560px",width:"100%",background:"linear-gradient(180deg,#120000,#0a0a0b)",border:"1px solid #5a0000",borderRadius:"14px",padding:"30px 26px",boxShadow:"0 0 50px #000"}}>
        <div style={{textAlign:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"0.72rem",letterSpacing:"4px",color:RED,marginBottom:"6px"}}>{fr?"LE MANIFESTE":"THE MANIFESTO"}</div>
        <div className="forge-title" style={{textAlign:"center",fontSize:"1.7rem",color:"#fff",lineHeight:1.15,marginBottom:"16px"}}>{fr?"Un outil pour les musiciens. Jamais contre.":"A tool for musicians. Never against them."}</div>
        <div style={{fontSize:"0.8rem",color:"#bbb",lineHeight:1.7,marginBottom:"18px",textAlign:"center"}}>{fr?"MetalPrompt existe pour une seule raison : remettre le pouvoir entre les mains des artistes. Pas les majors. Pas les gatekeepers. Les créateurs.":"MetalPrompt exists for one reason: to put the power back in artists' hands. Not the majors. Not the gatekeepers. The creators."}</div>
        <div style={{display:"flex",flexDirection:"column",gap:"9px",marginBottom:"20px"}}>
          {piliers.map((p,i)=>(<div key={i} style={{background:"#0d0000",border:"1px solid #2a0000",borderRadius:"8px",padding:"10px 12px"}}>
            <div style={{color:"#ff9090",fontWeight:800,fontSize:"0.78rem"}}>{p[0]}</div>
            <div style={{color:"#888",fontSize:"0.7rem",marginTop:"2px",lineHeight:1.5}}>{p[1]}</div>
          </div>))}
        </div>
        <div style={{textAlign:"center",fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"3px",color:RED,fontSize:"1.05rem",marginBottom:"18px"}}>{fr?"BRUTAL. ORGANIQUE. HUMAIN.":"BRUTAL. ORGANIC. HUMAN."}</div>
        <button onClick={onClose} style={{width:"100%",padding:"14px",background:RED,border:"none",borderRadius:"8px",color:"#fff",fontWeight:900,fontSize:"0.9rem",letterSpacing:"2px",textTransform:"uppercase",cursor:"pointer"}}>{fr?"Entrer dans la forge":"Enter the forge"}</button>
        <div style={{textAlign:"center",fontSize:"0.55rem",color:"#555",marginTop:"10px"}}>MMF Techni-Solutions</div>
      </div>
    </div>
  );
}
export default function App({ user, onLogout, onRequestAuth }) {
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
    if(user?.email){
      supabase.from('users').select('tier,prompts_used').eq('email',user.email).single()
        .then(({data})=>{setUserTier(data?.tier||"free");setPromptCount(data?.prompts_used||0);});
    } else {
      // invité ou déconnexion → on remet le tier gratuit (sinon accès illimité collé)
      setUserTier("free");
      setPromptCount(0);
    }
  },[user]);
  const isForge=TIER_RANK[userTier]>=1;
  const isPro=TIER_RANK[userTier]>=1;
  const isElite=TIER_RANK[userTier]>=1;
  const limit=LIMITS[userTier]||LIMITS.free;
  const tierColor=TIERS[userTier]?.color||"#444";
  const tierBadge=TIERS[userTier]?.badge||null;
  const canAccess=req=>(!req||req==="free")?true:TIER_RANK[userTier]>=1;

  const useSet=(init=[])=>{
    const [s,setS]=useState(new Set(init));
    const toggle=v=>setS(p=>{const n=new Set(p);n.has(v)?n.delete(v):n.add(v);return n;});
    const setAll=arr=>setS(new Set(arr));
    return [s,toggle,setAll];
  };

  const [genres,tGenre,setGenres]=useSet([]);
  const [genreFilter,setGenreFilter]=useState("");
  const [openFam,setOpenFam]=useState({});
  const [vocFilter,setVocFilter]=useState("");
  const [openVocEra,setOpenVocEra]=useState({});
  const [drumFilter,setDrumFilter]=useState("");
  const [openDrumEra,setOpenDrumEra]=useState({});
  const [gtrFilter,setGtrFilter]=useState("");
  const [openGtrEra,setOpenGtrEra]=useState({});
  const [mood,tMood,setMood]=useSet([]);
  const [drums,tDrums,setDrums]=useSet([]);
  const [drumP,tDrumP,setDrumP]=useSet(["triggered drums"]);
  const [vocals,tVocal,setVocals]=useSet([]);
  const [vrange,tVrange,setVrange]=useSet([]);
  const [vfx,tVfx,setVfx]=useSet([]);
  const [guitar,tGuitar,setGuitar]=useSet(["chugging riffs","palm muting"]);
  const [tuning,tTuning,setTuning]=useSet(["drop B tuning"]);
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
  const [orgRec,tOrgRec,setOrgRec]=useSet([]);
  const [orgDrm,tOrgDrm,setOrgDrm]=useSet([]);
  const [orgVoc,tOrgVoc,setOrgVoc]=useSet([]);
  const [orgGtr,tOrgGtr,setOrgGtr]=useSet([]);
  const [structs,tStruct,setStructs]=useSet([]);
  const [themes,tTheme]=useSet(["mort et décomposition"]);
  const [latmo,tLatmo]=useSet(["sombre et menaçant"]);
  const [lblocks,tLblock,setLblocks]=useSet(["verse","chorus","breakdown"]);
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
  const [exclGenre,tExclGenre,setExclGenre]=useSet([]);
  const [exclVocal,tExclVocal,setExclVocal]=useSet([]);
  const [exclProd,tExclProd,setExclProd]=useSet([]);
  const [exclInst,tExclInst,setExclInst]=useSet([]);
  const [exclCustom,setExclCustom]=useState("");
  const [heavy,setHeavy]=useState(9);
  const [emotions,setEmotions]=useState({});
  const [advanced,setAdvanced]=useState(false);
  const [showManifesto,setShowManifesto]=useState(false);
  useEffect(()=>{try{if(!localStorage.getItem('mp_manifesto_seen'))setShowManifesto(true);}catch(e){}},[]);
  const closeManifesto=()=>{try{localStorage.setItem('mp_manifesto_seen','1');}catch(e){}setShowManifesto(false);};
  const [groove,setGroove]=useState(6);
  const [chaos,setChaos]=useState(7);
  const [melody,setMelody]=useState(3);
  const [bpm,setBpmVal]=useState(180);
  const setBPM=v=>setBpmVal(Math.max(60,Math.min(280,v)));
  const applyPreset=key=>{
    const p=PRESETS[key]; if(!p) return;
    if(!canAccess(p.req)){setShowPaywall(true);return;}
    setGenres(p.genres); setBPM(p.bpm);
    if(p.drums)setDrums(p.drums);
    if(p.vocals)setVocals(p.vocals);
    if(p.mood)setMood(p.mood);
    if(p.guitar)setGuitar(p.guitar);
    if(p.tuning)setTuning(p.tuning);
  };
  // Clic sur un genre → agencement probable + variété semi-aléatoire (anti-redondance)
  const autoFillGenre=async(g)=>{
    try{
      const r=await fetch('/api/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({genre:g})});
      const d=await r.json();
      setBPM(d.bpm);setDrums(d.drums);setVocals(d.vocals);setMood(d.mood);
      setStructs(d.structs);setLblocks(d.structs);
      setHeavy(d.heavy);setGroove(d.groove);setChaos(d.chaos);setMelody(d.melody);
    }catch(e){/* pas de profil dispo (ex: localhost) — on laisse les choix actuels */}
  };
  const onGenrePick=(g)=>{const adding=!genres.has(g);tGenre(g);if(adding)autoFillGenre(g);};
  // ── MON SOUND (custom model perso, localStorage) ──
  const [sounds,setSounds]=useState(()=>{try{return JSON.parse(localStorage.getItem("mpf_sounds")||"[]")}catch{return[]}});
  const persistSounds=arr=>{setSounds(arr);try{localStorage.setItem("mpf_sounds",JSON.stringify(arr))}catch{}};
  const saveSound=()=>{
    if(!canAccess("pro")){setShowPaywall(true);return;}
    const name=window.prompt(uiLang==="fr"?"Nom de ton sound :":"Name your sound:");
    if(!name||!name.trim())return;
    const data={genres:[...genres],bpm,drums:[...drums],vocals:[...vocals],mood:[...mood],guitar:[...guitar],tuning:[...tuning]};
    persistSounds([{name:name.trim(),data,id:Date.now()},...sounds].slice(0,30));
  };
  const loadSound=s=>{
    const d=s.data||{};
    setGenres(d.genres||[]);setBPM(d.bpm||180);setDrums(d.drums||[]);setVocals(d.vocals||[]);setMood(d.mood||[]);setGuitar(d.guitar||[]);setTuning(d.tuning||[]);
  };
  const delSound=id=>persistSounds(sounds.filter(x=>x.id!==id));
  const [styleTxt,setStyleTxt]=useState("");
  const [structTxt,setStructTxt]=useState("");
  const [structNotes,setStructNotes]=useState("");
  const [excludeTxt,setExcludeTxt]=useState("");
  const [fullTxt,setFullTxt]=useState("");
  const [styleTxtC,setStyleTxtC]=useState("");
  const [coverTxt,setCoverTxt]=useState("");
  const [extendTxt,setExtendTxt]=useState("");
  const [modelRec,setModelRec]=useState(null);
  const [structTxtC,setStructTxtC]=useState("");
  const [compact,setCompact]=useState(false);
  const [conflicts,setConflicts]=useState([]);
  const styleShown=compact?(styleTxtC||styleTxt):styleTxt;
  const structShown=compact?(structTxtC||structTxt):structTxt;
  const [keywords,setKeywords]=useState("");
  const [lyricsTxt,setLyricsTxt]=useState("");
  const step2Shown=lyricsTxt?mergeStructLyrics(structShown,lyricsTxt):structShown;
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
  const generate=async()=>{
    if(promptCount>=limit.prompts){if(!user){onRequestAuth&&onRequestAuth();return;}setView("landing");return;}
    // #9 — structure auto si rien choisi (semi-aléatoire, cohérente Paroles+Style)
    const autoStructs = structs.size ? [...structs] : ['intro','verse','chorus','breakdown','verse','chorus','outro'];
    if(!structs.size){setStructs(autoStructs);setLblocks(autoStructs);}
    const body={
      genres:[...genres],drums:[...drums],vocals:[...vocals],guitar:[...guitar],tuning:[...tuning],mood:[...mood],prod:[...prod],globalRhythm:[...globalRhythm],vrange:[...vrange],
      bassStyle:[...bassStyle],bassTech:[...bassTech],bassTone:[...bassTone],bassTuning:[...bassTuning],bassProd:[...bassProd],sax:[...sax],brass:[...brass],keys:[...keys],strings:[...strings],
      org:isPro?[...orgRec,...orgDrm,...orgVoc,...orgGtr]:[],
      excl:isElite?{g:[...exclGenre],v:[...exclVocal],p:[...exclProd],i:[...exclInst],c:exclCustom}:null,
      structs:autoStructs,blockRhythm,heavy,groove,chaos,melody,bpm,lang:uiLang,emotions,tier:userTier,
    };
    let data;
    try{
      const r=await fetch('/api/forge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      data=await r.json();
      if(!r.ok)throw new Error('forge');
    }catch(e){ alert(uiLang==="fr"?"Erreur de génération, réessaie ":"Generation error, try again "); return; }
    setConflicts(data.conflicts||[]);
    setStyleTxt(data.styleStr);setStyleTxtC(data.styleStrC);setCoverTxt(data.coverStr||"");setExtendTxt(data.extendStr||"");setModelRec(data.modelRec||null);setStructTxt(data.structStr||"");setStructTxtC(data.structStrC||"");setStructNotes(data.structNotes||"");setExcludeTxt(data.excludeStr||"");setFullTxt(data.full||"");
    const nc=promptCount+1;setPromptCount(nc);
    if(user?.email) supabase.from('users').upsert({email:user.email,prompts_used:nc},{onConflict:'email'});
    saveToHistory(data.styleStr);
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
    const blockInstr=(structs.size?[...structs]:[...lblocks]).map(b=>{
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
      <CookieBanner uiLang={uiLang} onPrivacy={()=>setLegalDoc("privacy")}/>
      {showManifesto&&<Manifesto onClose={closeManifesto} uiLang={uiLang}/>}
      <SiteFooter onOpen={setLegalDoc} uiLang={uiLang}/>
      <LegalModal doc={legalDoc} onClose={()=>setLegalDoc(null)} uiLang={uiLang}/>
    </>
  );

  const TABS=[
    {id:"genre",req:"free"},
    {id:"drums",req:"free",adv:true},{id:"vocals",req:"free",adv:true},{id:"instrums",req:"forge",adv:true},{id:"structure",req:"forge",adv:true},{id:"organic",req:"pro",adv:true},{id:"exclude",req:"forge",adv:true},
    {id:"paroles",req:"pro"},{id:"output",req:"free"},
    {id:"riff",req:"elite"},{id:"master",req:"elite"},
    ...(isPro?[{id:"history",req:"pro"}]:[]),
    {id:"masterclass",req:"free"},{id:"tuto",req:"free"},
  ].filter(tb=>advanced||!tb.adv);

  return (
    <div style={S.wrap}>
      <style>{css}</style>
      {showPaywall&&<PaywallModal onClose={()=>setShowPaywall(false)} email={user?.email} uiLang={uiLang}/>}
      <CookieBanner uiLang={uiLang} onPrivacy={()=>setLegalDoc("privacy")}/>
      {showManifesto&&<Manifesto onClose={closeManifesto} uiLang={uiLang}/>}

      {warnLogout&&(
        <div style={{position:"fixed",top:0,left:0,right:0,background:"#1a0000",borderBottom:`1px solid ${RED}`,padding:"8px",textAlign:"center",zIndex:500,fontSize:"0.65rem",color:"#ff9090"}}>
          {t.warn}
        </div>
      )}

      {/* HEADER + NAV (sticky) */}
      <div style={{position:"sticky",top:0,zIndex:100}}>
      <div style={S.header}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}>
          <div className="forge-title" style={S.h1}>Metal Prompt Forge</div>
          {tierBadge&&<span style={{background:tierColor,color:isElite?"#fff":"#000",fontSize:"0.5rem",fontWeight:900,padding:"2px 7px",borderRadius:"8px",letterSpacing:"1px"}}>{tierBadge}</span>}
        </div>
        <div style={S.sub}>{t.sub}</div>
        <div style={{fontSize:"0.55rem",color:"#555",marginTop:"4px",display:"flex",justifyContent:"center",gap:"12px",alignItems:"center",flexWrap:"wrap"}}>
          <span>{limit.prompts===Infinity?(uiLang==="fr"?"Illimité":"Unlimited"):<><b style={{color:Math.max(0,limit.prompts-promptCount)>0?"#4caf50":RED}}>{Math.max(0,limit.prompts-promptCount)}</b> {uiLang==="fr"?"essais gratuits":"free trials left"}</>} · <span onClick={()=>setShowPaywall(true)} style={{color:RED,textDecoration:"none",fontWeight:700,cursor:"pointer"}}>{t.plans}</span></span>
          <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
            {["en","fr"].map(l=><button key={l} onClick={()=>setUiLang(l)} style={{background:uiLang===l?"#1a0000":"none",border:`1px solid ${uiLang===l?RED:"#333"}`,borderRadius:"3px",color:uiLang===l?RED:"#444",fontSize:"0.5rem",padding:"2px 6px",cursor:"pointer"}}>{l.toUpperCase()}</button>)}
            <UserChip user={user} uiLang={uiLang} tierBadge={tierBadge} tierColor={tierColor} isElite={isElite} onLogout={onLogout} onRequestAuth={onRequestAuth}/>
          </div>
        </div>
      </div>

      {/* NAV */}
      <div className="nav-scroll" style={{background:"#0f0f0f",borderBottom:"1px solid #1a1a1a"}}>
        <button onClick={()=>{const na=!advanced;setAdvanced(na);if(!na&&['drums','vocals','instrums','structure','organic','exclude'].includes(tab))setTab('genre');}} style={S.navBtn(advanced,false)} title={L("Affiche les onglets de réglage manuel","Show manual tuning tabs")}>{advanced?L("Avancé ","Advanced "):L("Avancé","Advanced")}</button>
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
          <div style={S.ctitle}>{L("Presets rapides","Quick presets")}</div>
          <div style={{fontSize:"0.58rem",color:"#666",marginBottom:"9px",lineHeight:1.5}}>{L("Un clic = config optimisée pour Suno (genre, BPM, drums, voix…)","One click = Suno-optimized setup (genre, BPM, drums, vocals…)")}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}>
            {Object.entries(PRESETS).map(([k,p])=>{const lk=!canAccess(p.req);return(
              <button key={k} onClick={()=>applyPreset(k)} style={{background:lk?"#101010":"#1a0000",border:`1px solid ${lk?"#222":"#5a0000"}`,borderRadius:"8px",padding:"8px 13px",fontSize:"0.72rem",fontWeight:700,color:lk?"#444":"#ff9090",cursor:"pointer"}}>{lk?"🔒 ":""}{p.label}</button>
            );})}
          </div>
        </div>
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
            <div style={{...S.ctitle,marginBottom:0}}>{L("Mon Sound","My Sound")}{!canAccess("pro")?" 🔒":""}</div>
            <button onClick={saveSound} style={{background:"#1a0000",border:`1px solid ${RED}`,borderRadius:"6px",color:RED,fontSize:"0.6rem",fontWeight:800,padding:"5px 11px",cursor:"pointer",letterSpacing:"0.5px"}}>＋ {L("Sauver","Save")}</button>
          </div>
          <div style={{fontSize:"0.58rem",color:"#666",marginBottom:"9px",lineHeight:1.5}}>{L("Sauve ton ADN sonore et recharge-le en un clic — la base de ton custom model Suno.","Save your sonic DNA and reload it in one click — the base for your Suno custom model.")}</div>
          {sounds.length===0&&<div style={{fontSize:"0.62rem",color:"#444"}}>{L("Aucun sound sauvegardé.","No saved sound yet.")}</div>}
          {sounds.map(s=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:"8px",padding:"6px 0",borderBottom:"1px solid #1a1a1a"}}>
              <button onClick={()=>loadSound(s)} style={{flex:1,textAlign:"left",background:"none",border:"none",color:"#ff9090",fontSize:"0.74rem",fontWeight:700,cursor:"pointer",padding:0}}>{s.name}</button>
              <span style={{fontSize:"0.55rem",color:"#555"}}>{s.data?.bpm} BPM</span>
              <button onClick={()=>delSound(s.id)} style={{background:"none",border:"none",color:"#5a0000",fontSize:"0.72rem",cursor:"pointer"}}></button>
            </div>
          ))}
        </div>
        <div style={S.card}>
          <div style={{...S.ctitle,marginBottom:"8px"}}>Genres</div>
          <input value={genreFilter} onChange={e=>setGenreFilter(e.target.value)} placeholder={L("Chercher un genre…","Search a genre…")} style={{width:"100%",background:"#111",border:"1px solid #2a2a2a",borderRadius:"6px",padding:"8px 10px",color:"#e0e0e0",fontSize:"0.78rem",marginBottom:"6px"}}/>
          {GENRE_FAMILIES.map(fam=>{
            const list=fam.genres.map(x=>x.g);
            const f=genreFilter.trim().toLowerCase();
            const hasMatch=!f||list.some(g=>g.toLowerCase().includes(f));
            if(f && !hasMatch) return null;
            const locked=fam.genres.filter(x=>!canAccess(x.req)).map(x=>x.g);
            const selCount=list.filter(g=>genres.has(g)).length;
            const open=f?true:!!openFam[fam.name];
            return (<div key={fam.name} style={{borderTop:"1px solid #1a1a1a"}}>
              <div onClick={()=>!f&&setOpenFam(p=>({...p,[fam.name]:!open}))} style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:f?"default":"pointer",userSelect:"none",padding:"10px 2px"}}>
                <span style={{fontSize:"0.62rem",color:"#bbb",letterSpacing:"1.5px",fontWeight:700}}>{fam.icon} {fam.name.toUpperCase()} <span style={{color:"#555"}}>({list.length})</span>{selCount>0&&<span style={{marginLeft:"7px",fontSize:"0.5rem",fontWeight:900,color:"#fff",background:RED,borderRadius:"4px",padding:"1px 6px"}}>{selCount}</span>}</span>
                <span style={{color:"#777",fontSize:"0.75rem"}}>{open?"▾":"▸"}</span>
              </div>
              {open&&<div style={{marginBottom:"8px"}}><Tags list={list} sel={genres} toggle={onGenrePick} lockedItems={locked} newItems={GENRES_NEW} filter={genreFilter}/></div>}
            </div>);
          })}
          {genreFilter.trim() && !GENRE_FAMILIES.some(fam=>fam.genres.some(x=>x.g.toLowerCase().includes(genreFilter.trim().toLowerCase()))) && <div style={{fontSize:"0.7rem",color:"#666",padding:"10px 0"}}>{L("Aucun genre trouvé.","No genre found.")}</div>}
        </div>
        <div style={S.card}><div style={S.ctitle}>{L("Intensité globale","Overall intensity")}</div>
          <Slider label="Heaviness" val={heavy} setVal={setHeavy}/>
          <Slider label="Groove Factor" val={groove} setVal={setGroove}/>
          <Slider label="Chaos Level" val={chaos} setVal={setChaos}/>
          <Slider label="Melodic Touch" val={melody} setVal={setMelody}/>
        </div>
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
            <div style={{...S.ctitle,marginBottom:0}}>{L("Émotions","Emotions")}</div>
            <span style={{fontSize:"0.55rem",color:"#666"}}>{Math.min(10,EMO_LIMIT[userTier]||2)}/10 {L("débloquées","unlocked")}</span>
          </div>
          <div style={{fontSize:"0.58rem",color:"#666",marginBottom:"10px",lineHeight:1.5}}>{L("Dose les émotions — MetalPrompt injecte les bons tags. La plus forte domine le morceau.","Dial emotions — MetalPrompt injects the matching tags. The strongest one dominates.")}</div>
          {EMOTIONS.map((e,i)=>{
            const lim=Math.min(10,EMO_LIMIT[userTier]||2);const locked=i>=lim;const v=emotions[e.id]||0;
            if(locked) return (<div key={e.id} onClick={()=>setShowPaywall(true)} style={{display:"flex",alignItems:"center",gap:"8px",padding:"5px 0",opacity:0.4,cursor:"pointer"}}>
              <span style={{fontSize:"0.72rem",width:"120px"}}>🔒 {e.icon} {e.label}</span>
              <span style={{fontSize:"0.55rem",color:RED,fontWeight:700}}>{L("Tier supérieur","Upgrade")}</span>
            </div>);
            return (<div key={e.id} style={{display:"flex",alignItems:"center",gap:"8px",padding:"4px 0"}}>
              <span style={{fontSize:"0.72rem",width:"120px",color:v>0?e.c:"#aaa"}}>{e.icon} {e.label}</span>
              <input type="range" min="0" max="100" step="5" value={v} onChange={ev=>setEmotions(p=>({...p,[e.id]:+ev.target.value}))} style={{flex:1,accentColor:e.c}}/>
              <span style={{fontSize:"0.62rem",fontFamily:"monospace",color:v>0?e.c:"#555",width:"30px",textAlign:"right"}}>{v}</span>
            </div>);
          })}
        </div>
        <div style={{height:80}}/>
      </div>}

      {/* DRUMS */}
      {tab==="drums"&&<div style={S.page}>
        <div style={S.card}>
          <div style={{...S.ctitle,marginBottom:"8px"}}>{L("Style de batterie — par époque","Drum style — by era")}</div>
          <input value={drumFilter} onChange={e=>setDrumFilter(e.target.value)} placeholder={L("Chercher une batterie…","Search a drum style…")} style={{width:"100%",background:"#111",border:"1px solid #2a2a2a",borderRadius:"6px",padding:"8px 10px",color:"#e0e0e0",fontSize:"0.78rem",marginBottom:"6px"}}/>
          {DRUM_ERAS.map(era=>{
            const list=era.d.map(x=>x.v);
            const f=drumFilter.trim().toLowerCase();
            const hasMatch=!f||list.some(v=>v.toLowerCase().includes(f));
            if(f&&!hasMatch) return null;
            const locked=era.d.filter(x=>!canAccess(x.req)).map(x=>x.v);
            const selCount=list.filter(v=>drums.has(v)).length;
            const open=f?true:!!openDrumEra[era.name];
            return (<div key={era.name} style={{borderTop:"1px solid #1a1a1a"}}>
              <div onClick={()=>!f&&setOpenDrumEra(p=>({...p,[era.name]:!open}))} style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:f?"default":"pointer",userSelect:"none",padding:"10px 2px"}}>
                <span style={{fontSize:"0.62rem",color:"#bbb",letterSpacing:"1.5px",fontWeight:700}}>{era.icon} {era.name.toUpperCase()} <span style={{color:"#555"}}>({list.length})</span>{selCount>0&&<span style={{marginLeft:"7px",fontSize:"0.5rem",fontWeight:900,color:"#fff",background:RED,borderRadius:"4px",padding:"1px 6px"}}>{selCount}</span>}</span>
                <span style={{color:"#777",fontSize:"0.75rem"}}>{open?"▾":"▸"}</span>
              </div>
              {open&&<div style={{marginBottom:"8px"}}><Tags list={list} sel={drums} toggle={tDrums} lockedItems={locked} newItems={DRUM_NEW} filter={drumFilter}/></div>}
            </div>);
          })}
        </div>
        <div style={S.card}>
          <div style={S.ctitle}>Tempo (BPM)</div>
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
        <Collapse title={L("Production batterie","Drum production")} n={DRUM_PROD.length} selCount={drumP.size}><div style={{marginBottom:"10px"}}><SelAll all={DRUM_PROD} set={setDrumP} L={L}/></div><Tags list={DRUM_PROD} sel={drumP} toggle={tDrumP}/></Collapse>
        <div style={{height:80}}/>
      </div>}

      {/* VOCALS */}
      {tab==="vocals"&&<div style={S.page}>
        <div style={S.card}>
          <div style={{...S.ctitle,marginBottom:"8px"}}>{L("Types de voix — par époque","Vocal types — by era")}</div>
          <input value={vocFilter} onChange={e=>setVocFilter(e.target.value)} placeholder={L("Chercher une voix…","Search a vocal…")} style={{width:"100%",background:"#111",border:"1px solid #2a2a2a",borderRadius:"6px",padding:"8px 10px",color:"#e0e0e0",fontSize:"0.78rem",marginBottom:"6px"}}/>
          {VOCAL_ERAS.map(era=>{
            const list=era.vox.map(x=>x.v);
            const f=vocFilter.trim().toLowerCase();
            const hasMatch=!f||list.some(v=>v.toLowerCase().includes(f));
            if(f&&!hasMatch) return null;
            const locked=era.vox.filter(x=>!canAccess(x.req)).map(x=>x.v);
            const selCount=list.filter(v=>vocals.has(v)).length;
            const open=f?true:!!openVocEra[era.name];
            return (<div key={era.name} style={{borderTop:"1px solid #1a1a1a"}}>
              <div onClick={()=>!f&&setOpenVocEra(p=>({...p,[era.name]:!open}))} style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:f?"default":"pointer",userSelect:"none",padding:"10px 2px"}}>
                <span style={{fontSize:"0.62rem",color:"#bbb",letterSpacing:"1.5px",fontWeight:700}}>{era.icon} {era.name.toUpperCase()} <span style={{color:"#555"}}>({list.length})</span>{selCount>0&&<span style={{marginLeft:"7px",fontSize:"0.5rem",fontWeight:900,color:"#fff",background:RED,borderRadius:"4px",padding:"1px 6px"}}>{selCount}</span>}</span>
                <span style={{color:"#777",fontSize:"0.75rem"}}>{open?"▾":"▸"}</span>
              </div>
              {open&&<div style={{marginBottom:"8px"}}><Tags list={list} sel={vocals} toggle={tVocal} lockedItems={locked} newItems={VOCAL_NEW} filter={vocFilter}/></div>}
            </div>);
          })}
        </div>
        <Collapse title={L("Registre / Tessiture","Range / Register")} n={VOCAL_RANGE.length} selCount={vrange.size}><div style={{marginBottom:"10px"}}><SelAll all={VOCAL_RANGE} set={setVrange} L={L}/></div><Tags list={VOCAL_RANGE} sel={vrange} toggle={tVrange}/></Collapse>
        <Collapse title={L("Effets vocaux","Vocal effects")} n={VFX.length} selCount={vfx.size}><div style={{marginBottom:"10px"}}><SelAll all={VFX} set={setVfx} L={L}/></div><Tags list={VFX} sel={vfx} toggle={tVfx}/></Collapse>
        <div style={{height:80}}/>
      </div>}

      {/* GUITAR */}
      {tab==="instrums"&&(!canAccess("forge")?<LockedOverlay req="forge" t={t} email={user?.email} onRequestAuth={onRequestAuth}/>:<div style={S.page}>
        {/* --- GUITARE --- */}
        <div style={{...S.card,borderColor:"#ff2e2e33",background:"#110000",textAlign:"center"}}><div style={{...S.ctitle,color:RED,marginBottom:0}}>{L("GUITARE","GUITAR")}</div></div>
        <div style={S.card}>
          <div style={{...S.ctitle,marginBottom:"8px"}}>{L("Techniques guitare — par époque","Guitar techniques — by era")}</div>
          <input value={gtrFilter} onChange={e=>setGtrFilter(e.target.value)} placeholder={L("Chercher une technique…","Search a technique…")} style={{width:"100%",background:"#111",border:"1px solid #2a2a2a",borderRadius:"6px",padding:"8px 10px",color:"#e0e0e0",fontSize:"0.78rem",marginBottom:"6px"}}/>
          {GUITAR_ERAS.map(era=>{
            const list=era.d.map(x=>x.v);
            const f=gtrFilter.trim().toLowerCase();
            const hasMatch=!f||list.some(v=>v.toLowerCase().includes(f));
            if(f&&!hasMatch) return null;
            const locked=era.d.filter(x=>!canAccess(x.req)).map(x=>x.v);
            const selCount=list.filter(v=>guitar.has(v)).length;
            const open=f?true:!!openGtrEra[era.name];
            return (<div key={era.name} style={{borderTop:"1px solid #1a1a1a"}}>
              <div onClick={()=>!f&&setOpenGtrEra(p=>({...p,[era.name]:!open}))} style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:f?"default":"pointer",userSelect:"none",padding:"10px 2px"}}>
                <span style={{fontSize:"0.62rem",color:"#bbb",letterSpacing:"1.5px",fontWeight:700}}>{era.icon} {era.name.toUpperCase()} <span style={{color:"#555"}}>({list.length})</span>{selCount>0&&<span style={{marginLeft:"7px",fontSize:"0.5rem",fontWeight:900,color:"#fff",background:RED,borderRadius:"4px",padding:"1px 6px"}}>{selCount}</span>}</span>
                <span style={{color:"#777",fontSize:"0.75rem"}}>{open?"▾":"▸"}</span>
              </div>
              {open&&<div style={{marginBottom:"8px"}}><Tags list={list} sel={guitar} toggle={tGuitar} lockedItems={locked} newItems={GUITAR_NEW} filter={gtrFilter}/></div>}
            </div>);
          })}
        </div>
        <Collapse title={L("Accordage","Tuning")} n={TUNING.length} selCount={tuning.size}><Tags list={TUNING} sel={tuning} toggle={tTuning}/></Collapse>
        <Collapse title={L("Production guitare","Guitar production")} n={GPROD.length} selCount={gprod.size}><Tags list={GPROD} sel={gprod} toggle={tGprod}/></Collapse>

        {/* --- BASSE --- */}
        <div style={{...S.card,borderColor:"#ff2e2e33",background:"#110000",textAlign:"center",marginTop:"18px"}}><div style={{...S.ctitle,color:RED,marginBottom:0}}>{L("BASSE","BASS")}</div></div>
        <Collapse title={L("Style de jeu","Playing style")} n={BASS_STYLE.length} selCount={bassStyle.size}><Tags list={BASS_STYLE} sel={bassStyle} toggle={tBassStyle}/></Collapse>
        <Collapse title={L("Techniques avancées","Advanced techniques")} n={BASS_TECH.length} selCount={bassTech.size}><Tags list={BASS_TECH} sel={bassTech} toggle={tBassTech}/></Collapse>
        <Collapse title={L("Tone / Son","Tone")} n={BASS_TONE.length} selCount={bassTone.size}><Tags list={BASS_TONE} sel={bassTone} toggle={tBassTone}/></Collapse>
        <Collapse title={L("Accordage basse","Bass tuning")} n={BASS_TUNING.length} selCount={bassTuning.size}><Tags list={BASS_TUNING} sel={bassTuning} toggle={tBassTuning}/></Collapse>
        <Collapse title={L("Production basse","Bass production")} n={BASS_PROD.length} selCount={bassProd.size}><Tags list={BASS_PROD} sel={bassProd} toggle={tBassProd}/></Collapse>

        {/* --- INSTRU --- */}
        <div style={{...S.card,borderColor:"#ff2e2e33",background:"#110000",textAlign:"center",marginTop:"18px"}}><div style={{...S.ctitle,color:RED,marginBottom:0}}>{L("AUTRES INSTRUMENTS","OTHER INSTRUMENTS")}</div></div>
        <Collapse title="Saxophone" n={SAX.length} selCount={sax.size}><Tags list={SAX} sel={sax} toggle={tSax}/></Collapse>
        <Collapse title={L("Cuivres","Brass")} n={BRASS.length} selCount={brass.size}><Tags list={BRASS} sel={brass} toggle={tBrass}/></Collapse>
        <Collapse title={L("Claviers & Synth","Keys & Synth")} n={KEYS.length} selCount={keys.size}><Tags list={KEYS} sel={keys} toggle={tKeys}/></Collapse>
        <Collapse title={L("Cordes","Strings")} n={STRINGS.length} selCount={strings.size}><Tags list={STRINGS} sel={strings} toggle={tStr}/></Collapse>
        <div style={{height:80}}/>
      </div>)}

      {/* STRUCTURE */}
      {tab==="structure"&&(!canAccess("forge")?<LockedOverlay req="forge" t={t} email={user?.email} onRequestAuth={onRequestAuth}/>:<div style={S.page}>
        <Collapse title={L("Feeling rythmique global","Global rhythmic feel")} n={GLOBAL_RHYTHMS.length} selCount={globalRhythm.size}>
          <div style={{display:"flex",flexWrap:"wrap",gap:"7px",marginBottom:"8px"}}>
            {GLOBAL_RHYTHMS.map(r=><span key={r} onClick={()=>tGlobalRhythm(r)} style={S.tag(globalRhythm.has(r),false)}>{r}</span>)}
          </div>
          <div style={{fontSize:"0.58rem",color:"#333",marginTop:"4px",lineHeight:1.6}}>{L("→ Ces tags vont dans Style of Music · Suno les comprend vraiment","→ These tags go in Style of Music · Suno really understands them")}</div>
        </Collapse>
        <div style={S.card}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px",flexWrap:"wrap",marginBottom:"6px"}}>
            <div style={{...S.ctitle,marginBottom:0}}>{L("Blocs & Feeling par section","Blocks & per-section feel")}</div>
            <div style={{display:"flex",gap:"6px"}}>
              <button onClick={()=>setStructs(STRUCT_BLOCKS.map(b=>b.k))} style={{background:"#0a1f00",border:"1px solid #2a5a2a",borderRadius:"5px",padding:"4px 11px",fontSize:"0.62rem",fontWeight:700,color:"#7fdd7f",cursor:"pointer"}}>{L("Tout","All")}</button>
              <button onClick={()=>setStructs([])} style={{background:"#1a0000",border:"1px solid #4a1010",borderRadius:"5px",padding:"4px 11px",fontSize:"0.62rem",fontWeight:700,color:"#cc6666",cursor:"pointer"}}>{L("Vider","Clear")}</button>
            </div>
          </div>
          <div style={{fontSize:"0.57rem",color:"#333",marginBottom:"10px"}}>{L("Feel → s'ajoute dans la balise : ","Feel → added inside the tag: ")}<span style={{color:"#aaffaa",fontFamily:"monospace"}}>[Breakdown, half-time feel]</span></div>
          <div style={S.tags}>
            {STRUCT_BLOCKS.map(b=>(
              <span key={b.k} onClick={()=>tStruct(b.k)} title={uiLang==="fr"?b.desc:(b.descEn||b.desc)} style={S.tag(structs.has(b.k),false)}>{b.icon} {b.name}</span>
            ))}
          </div>
          {STRUCT_BLOCKS.some(b=>structs.has(b.k))&&(
            <div style={{marginTop:"14px",borderTop:"1px solid #1a1a1a",paddingTop:"12px"}}>
              <div style={{fontSize:"0.55rem",color:"#666",letterSpacing:"1.5px",marginBottom:"9px",fontWeight:700}}>{L("FEEL PAR SECTION (optionnel)","FEEL PER SECTION (optional)")}</div>
              {STRUCT_BLOCKS.filter(b=>structs.has(b.k)).map(b=>{
                const hasR=!!blockRhythm[b.k];
                const cur=BLOCK_RHYTHMS.find(r=>r.v===blockRhythm[b.k]);
                return (
                  <FeelRow key={b.k} name={b.icon+" "+b.name} cur={cur?cur.l:""}>
                    {BLOCK_RHYTHMS.map(r=>(
                      <span key={r.v} onClick={()=>blockRhythm[b.k]===r.v?clearBlockR(b.k):setBlockR(b.k,r.v)}
                        style={{background:blockRhythm[b.k]===r.v?"#002a00":"#111",border:`1px solid ${blockRhythm[b.k]===r.v?"#4caf50":"#222"}`,borderRadius:"4px",padding:"3px 7px",fontSize:"0.6rem",cursor:"pointer",color:blockRhythm[b.k]===r.v?"#4caf50":"#555",fontWeight:blockRhythm[b.k]===r.v?700:400}}>
                        {r.l}
                      </span>
                    ))}
                    {hasR&&<span onClick={()=>clearBlockR(b.k)} style={{fontSize:"0.55rem",color:"#ff5555",cursor:"pointer",padding:"3px 6px",background:"#1a0000",border:"1px solid #5a0000",borderRadius:"4px"}}></span>}
                  </FeelRow>
                );
              })}
            </div>
          )}
        </div>
        <div style={S.card}><div style={S.ctitle}>{L("Production globale","Global production")}</div><Tags list={PROD} sel={prod} toggle={tProd}/></div>
        <div style={{height:80}}/>
      </div>)}

      {/* PAROLES */}
      {tab==="paroles"&&(!canAccess("pro")?<LockedOverlay req="pro" t={t} email={user?.email} onRequestAuth={onRequestAuth}/>:<div style={S.page}>
        <Collapse title={L("Thème principal","Main theme")} n={THEMES.length} selCount={themes.size}><Tags list={THEMES} sel={themes} toggle={tTheme} tr={uiLang==="en"?THEME_TR:null}/></Collapse>
        <Collapse title={L("Atmosphère","Atmosphere")} n={LYRIC_ATMO.length} selCount={latmo.size}><Tags list={LYRIC_ATMO} sel={latmo} toggle={tLatmo} tr={uiLang==="en"?ATMO_TR:null}/></Collapse>
        <div style={S.card}>
          <div style={S.ctitle}>{L("Angle créatif (optionnel)","Creative angle (optional)")}</div>
          <input value={lyricsAngle} onChange={e=>setLyricsAngle(e.target.value)} placeholder={L("ex: vue d'une machine qui s'éveille, métaphores de noyade...","e.g. a machine waking up, drowning metaphors...")}
            style={{width:"100%",background:"#111",border:"1px solid #222",borderRadius:"6px",padding:"10px",color:"#e0e0e0",fontSize:"0.78rem"}}/>
          <div style={{fontSize:"0.57rem",color:"#333",marginTop:"4px"}}>{L("Si vide → angle aléatoire différent à chaque fois","If empty → a different random angle each time")}</div>
        </div>
        <div style={{display:"flex",gap:"10px"}}>
          <div style={{...S.card,flex:1}}>
            <div style={S.ctitle}>{L("Narrateur","Narrator")}</div>
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
        <div style={S.card}><div style={S.ctitle}>{L("Mots-clés","Keywords")}</div>
          <input value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder={L("ex: acier, fracture, signal, abîme...","e.g. steel, fracture, signal, abyss...")}
            style={{width:"100%",background:"#111",border:"1px solid #222",borderRadius:"6px",padding:"10px",color:"#e0e0e0",fontSize:"0.8rem"}}/>
        </div>
        <div style={S.card}><div style={S.ctitle}>{L("Mots bannis","Banned words")}</div>
          <input value={bannedWords} onChange={e=>setBannedWords(e.target.value)} placeholder={L("ex: darkness, blood, rise, ashes...","e.g. darkness, blood, rise, ashes...")}
            style={{width:"100%",background:"#111",border:"1px solid #5a1100",borderRadius:"6px",padding:"10px",color:"#ff7070",fontSize:"0.8rem"}}/>
          {lyricsHistory.length>0&&<button onClick={()=>setLyricsHistory([])} style={{marginTop:"7px",padding:"5px 12px",background:"#1a0000",border:"1px solid #5a0000",borderRadius:"5px",color:"#ff5555",fontSize:"0.65rem",cursor:"pointer"}}>{L("Effacer mémoire","Clear memory")} ({lyricsHistory.length})</button>}
        </div>
        <Collapse title={L("Langue des paroles","Lyrics language")} n={LYRIC_LANGS.length} selCount={lang.size} defaultOpen={true}><Tags list={LYRIC_LANGS} sel={lang} toggle={tLang}/></Collapse>
        <Collapse title={L("Blocs à générer","Blocks to generate")} n={LYRIC_BLOCKS.length} selCount={lblocks.size}><div style={{marginBottom:"10px"}}><SelAll all={LYRIC_BLOCKS.map(b=>b.v)} set={setLblocks} L={L}/></div><Tags list={LYRIC_BLOCKS} sel={lblocks} toggle={tLblock}/></Collapse>
        <button style={S.genBtn} onClick={generateLyrics} disabled={lyricsLoading}>{lyricsLoading?""+t.generating:L("GÉNÉRER LES PAROLES","GENERATE LYRICS")}</button>
        {lyricsLoading&&<div style={{textAlign:"center",padding:"20px"}}><div style={{fontSize:"1.8rem",animation:"spin 1s linear infinite",display:"inline-block"}}></div><div style={{color:"#444",fontSize:"0.7rem",letterSpacing:"2px",marginTop:"8px"}}>{L("CLAUDE COMPOSE...","CLAUDE IS COMPOSING...")}</div></div>}
        {lyricsErr&&<div style={{color:"#ff5555",fontSize:"0.8rem",padding:"10px",background:"#1a0000",borderRadius:"8px",marginBottom:"10px"}}>{lyricsErr}</div>}
        {lyricsTxt&&!lyricsLoading&&(<div>
          <div style={S.outLbl}>{L("Paroles générées","Generated lyrics")}</div>
          <div style={{...S.outBox,borderColor:"#ff2e2e33"}}><CopyBtn getText={()=>lyricsTxt}/><pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",fontSize:"0.8rem",lineHeight:1.9,color:"#ddd",paddingRight:"50px"}}>{lyricsTxt}</pre></div>
          <div style={{display:"flex",gap:"10px",marginBottom:"12px"}}>
            <button onClick={generateLyrics} style={{flex:1,padding:"10px",background:"#1a1a1a",border:"1px solid #222",borderRadius:"6px",color:"#888",fontSize:"0.72rem",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",cursor:"pointer"}}>{L("Régénérer","Regenerate")}</button>
            <button onClick={sendLyricsToOutput} style={{flex:1,padding:"10px",background:"#0a1f00",border:"1px solid #4caf50",borderRadius:"6px",color:"#4caf50",fontSize:"0.72rem",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",cursor:"pointer"}}>→ Output</button>
          </div>
        </div>)}
        <div style={{height:80}}/>
      </div>)}

      {/* ORGANIC */}
      {tab==="organic"&&(!canAccess("pro")?<LockedOverlay req="pro" t={t} email={user?.email} onRequestAuth={onRequestAuth}/>:<div style={S.page}>
        <div style={{...S.card,borderColor:"#1a3a00",background:"#0a120a"}}><div style={{...S.ctitle,color:"#4caf50"}}>Anti-AI</div><div style={{fontSize:"0.72rem",color:"#688",lineHeight:1.9}}>{L("Ces tags poussent Suno vers un rendu plus ","These tags push Suno toward a more ")}<strong style={{color:"#8f8"}}>{L("organique et humain","organic and human")}</strong>.</div></div>
        <Collapse title={L("Recording & Ambiance","Recording & Ambience")} n={ORG_RECORD.length} selCount={orgRec.size}><div style={{marginBottom:"10px"}}><SelAll all={ORG_RECORD} set={setOrgRec} L={L}/></div><Tags list={ORG_RECORD} sel={orgRec} toggle={tOrgRec}/></Collapse>
        <Collapse title={L("Batterie organique","Organic drums")} n={ORG_DRUMS.length} selCount={orgDrm.size}><div style={{marginBottom:"10px"}}><SelAll all={ORG_DRUMS} set={setOrgDrm} L={L}/></div><Tags list={ORG_DRUMS} sel={orgDrm} toggle={tOrgDrm}/></Collapse>
        <Collapse title={L("Voix organique","Organic vocals")} n={ORG_VOCALS.length} selCount={orgVoc.size}><div style={{marginBottom:"10px"}}><SelAll all={ORG_VOCALS} set={setOrgVoc} L={L}/></div><Tags list={ORG_VOCALS} sel={orgVoc} toggle={tOrgVoc}/></Collapse>
        <Collapse title={L("Guitares organiques","Organic guitars")} n={ORG_GUITAR.length} selCount={orgGtr.size}><div style={{marginBottom:"10px"}}><SelAll all={ORG_GUITAR} set={setOrgGtr} L={L}/></div><Tags list={ORG_GUITAR} sel={orgGtr} toggle={tOrgGtr}/></Collapse>
        <div style={{...S.card,borderColor:"#3a0000",background:"#0f0000"}}><div style={{...S.ctitle,color:"#ff5555"}}>{L("Tags à ÉVITER (sonnent AI)","Tags to AVOID (sound AI)")}</div><div style={S.tags}>{ORG_AVOID.map(v=><span key={v} style={{background:"#1a0000",border:"1.5px solid #5a0000",borderRadius:"20px",padding:"5px 12px",fontSize:"0.72rem",color:"#ff5555",textDecoration:"line-through",opacity:0.6}}>{v}</span>)}</div></div>
        <div style={{height:80}}/>
      </div>)}

      {/* EXCLUDE */}
      {tab==="exclude"&&(!canAccess("elite")?<LockedOverlay req="elite" t={t} email={user?.email} onRequestAuth={onRequestAuth}/>:<div style={S.page}>
        <div style={{...S.card,borderColor:"#3a0a00",background:"#0f0800"}}><div style={{...S.ctitle,color:"#ff6633"}}>{L("Comment ça fonctionne","How it works")}</div><div style={{fontSize:"0.72rem",color:"#a86",lineHeight:1.9}}>{L('Tags dans "Style of Music" précédés de ','Tags in "Style of Music" prefixed with ')}<strong style={{color:"#ff5555"}}>"-"</strong>{L(" pour dire à Suno ce qu'il doit éviter."," to tell Suno what to avoid.")}</div></div>
        <Collapse title={L("Genres à exclure","Genres to exclude")} n={EXCL_GENRES.length} selCount={exclGenre.size}><div style={{marginBottom:"10px"}}><SelAll all={EXCL_GENRES} set={setExclGenre} L={L}/></div><Tags list={EXCL_GENRES} sel={exclGenre} toggle={tExclGenre}/></Collapse>
        <Collapse title={L("Voix à exclure","Vocals to exclude")} n={EXCL_VOCALS.length} selCount={exclVocal.size}><div style={{marginBottom:"10px"}}><SelAll all={EXCL_VOCALS} set={setExclVocal} L={L}/></div><Tags list={EXCL_VOCALS} sel={exclVocal} toggle={tExclVocal}/></Collapse>
        <Collapse title={L("Production à exclure","Production to exclude")} n={EXCL_PROD.length} selCount={exclProd.size}><div style={{marginBottom:"10px"}}><SelAll all={EXCL_PROD} set={setExclProd} L={L}/></div><Tags list={EXCL_PROD} sel={exclProd} toggle={tExclProd}/></Collapse>
        <Collapse title={L("Instruments à exclure","Instruments to exclude")} n={EXCL_INSTRU.length} selCount={exclInst.size}><div style={{marginBottom:"10px"}}><SelAll all={EXCL_INSTRU} set={setExclInst} L={L}/></div><Tags list={EXCL_INSTRU} sel={exclInst} toggle={tExclInst}/></Collapse>
        <div style={S.card}><div style={S.ctitle}>{L("Exclusions personnalisées","Custom exclusions")}</div>
          <input value={exclCustom} onChange={e=>setExclCustom(e.target.value)} placeholder={L("ex: piano, jazz, acoustic, soft...","e.g. piano, jazz, acoustic, soft...")}
            style={{width:"100%",background:"#111",border:"1px solid #5a2200",borderRadius:"6px",padding:"10px",color:"#e0e0e0",fontSize:"0.8rem"}}/>
        </div>
        <div style={{height:80}}/>
      </div>)}

      {/* OUTPUT */}
      {tab==="riff"&&(!canAccess("elite")?<LockedOverlay req="elite" t={t} email={user?.email} onRequestAuth={onRequestAuth}/>:<div style={S.page}>
        <div style={{...S.card,textAlign:"center",padding:"22px",borderColor:"#ff2e2e44"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:"2px",color:"#fff"}}>RIFF / BEAT GENERATOR</div>
          <div style={{color:"#999",fontSize:"0.78rem",marginTop:"6px",lineHeight:1.55}}>{L("Génère un riff + beat, écoute-le, et exporte un WAV prêt pour Suno (Style Reference / Custom Model). ","Generate a riff + beat, listen, and export a WAV ready for Suno (Style Reference / Custom Model). ")}</div>
        </div>
        <div style={{...S.card,padding:0,overflow:"hidden",borderColor:"#1e1e1e"}}>
          <iframe src={`/riff.html?tier=${userTier}${styleTxt?`&prompt=${encodeURIComponent(styleTxt)}`:""}`} title="Riff Generator" allow="autoplay" style={{width:"100%",height:"78vh",minHeight:"560px",border:"none",display:"block",background:DARK}}/>
        </div>
        <div style={{...S.card,textAlign:"center"}}>
          <div style={{...S.ctitle,textAlign:"center",marginBottom:"6px"}}>{L("Bientôt aussi","Also coming soon")}</div>
          <div style={{fontSize:"0.74rem",color:"#888",lineHeight:1.7}}>{L("Idée express","Quick Idea")} · {L("Génération in-app (crédits)","In-app generation (credits)")}</div>
        </div>
        <div style={{height:80}}/>
      </div>)}

      {tab==="master"&&(!canAccess("elite")?<LockedOverlay req="elite" t={t} email={user?.email} onRequestAuth={onRequestAuth}/>:<div style={S.page}>
        <div style={{...S.card,textAlign:"center",padding:"22px",borderColor:"#ffcc0044"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:"2px",color:"#fff"}}>MASTERING</div>
          <div style={{color:"#999",fontSize:"0.78rem",marginTop:"6px",lineHeight:1.55}}>{L("Charge ta chanson Suno → EQ + compression + limiteur → WAV plus fort et serré, prêt à publier. ","Load your Suno track → EQ + compression + limiter → louder, tighter WAV, ready to publish. ")}</div>
        </div>
        <div style={{...S.card,padding:0,overflow:"hidden",borderColor:"#1e1e1e"}}>
          <iframe src="/master.html" title="Mastering" allow="autoplay" style={{width:"100%",height:"1150px",minHeight:"1150px",border:"none",display:"block",background:DARK}}/>
        </div>
        <div style={{...S.card,textAlign:"center"}}>
          <div style={{...S.ctitle,textAlign:"center",marginBottom:"6px"}}>{L("Bientôt — Elite Pro","Soon — Elite Pro")}</div>
          <div style={{fontSize:"0.74rem",color:"#888",lineHeight:1.7}}>{L("Idée express — aperçu vidéo + maquette (Lyra/Gemini)","Quick Idea — video preview + mockup (Lyra/Gemini)")}</div>
        </div>
        <div style={{height:80}}/>
      </div>)}

      {tab==="tuto"&&<div style={S.page}>
        <div style={{...S.card,textAlign:"center",padding:"26px 22px",borderColor:"#ff2e2e44"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.9rem",letterSpacing:"2px",color:"#fff"}}>{L("COMMENT FAIRE","HOW IT WORKS")}</div>
          <div style={{color:"#999",fontSize:"0.8rem",marginTop:"6px",lineHeight:1.5}}>{L("De ton idée à une chanson metal finie. MetalPrompt te guide à chaque étape — Forge le prompt, dirige Suno, peaufine le son.","From your idea to a finished metal track. MetalPrompt guides every step — Forge the prompt, steer Suno, polish the sound.")}</div>
        </div>

        {/* VUE D'ENSEMBLE */}
        <div style={S.card}>
          <div style={S.ctitle}>{L("Le workflow complet","The full workflow")}</div>
          {[
            {t:L("FORGE","FORGE"),d:L("Choisis ton genre + tes émotions. MetalPrompt génère 3 prompts optimisés pour Suno.","Pick your genre + emotions. MetalPrompt builds 3 Suno-optimized prompts.")},
            {t:L("SUNO","SUNO"),d:L("Colle les prompts dans Suno et génère ta chanson.","Paste the prompts into Suno and generate your track.")},
            {t:L("RIFF (option)","RIFF (optional)"),d:L("Crée un vrai riff/beat en WAV pour servir de référence audio à Suno.","Build a real riff/beat WAV to use as Suno's audio reference.")},
            {t:L("MASTER","MASTER"),d:L("Nettoie et grossis le rendu Suno (mix, EQ, sidechain, débruiteur).","Clean up and fatten the Suno output (mix, EQ, sidechain, de-noise).")},
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"12px",padding:"9px 0",borderBottom:i<3?"1px solid #1a1a1a":"none"}}>
              <div style={S.stepNum(RED)}>{i+1}</div>
              <div style={{paddingTop:"1px"}}>
                <div style={{fontSize:"0.82rem",fontWeight:900,color:"#fff",letterSpacing:"1px"}}>{s.t}</div>
                <div style={{fontSize:"0.74rem",color:"#999",lineHeight:1.55,marginTop:"2px"}}>{s.d}</div>
              </div>
            </div>
          ))}
          <div style={{fontSize:"0.6rem",color:"#555",marginTop:"10px",lineHeight:1.6}}>{L("Gratuit = essai. L'abonnement débloque tout le site.","Free = trial. The subscription unlocks the whole site.")}</div>
        </div>

        {/* ETAPE PAR ETAPE FORGE */}
        <div style={S.card}>
          <div style={S.ctitle}>{L("1 · Forger ton prompt","1 · Forge your prompt")}</div>
          {[
            L("Onglet Genre : choisis ton genre. Les réglages (BPM, batterie, voix) se calibrent tout seuls pour Suno.","Genre tab: pick your genre. The settings (BPM, drums, vocals) auto-calibrate for Suno."),
            L("Règle tes émotions (rage, mélancolie, triomphe…) — elles colorent le son et les paroles.","Set your emotions (rage, melancholy, triumph…) — they color the sound and lyrics."),
            L("Tu veux le contrôle fin ? Active « Mode Avancé » en haut : batterie, voix, structure et exclude manuels.","Want fine control? Turn on « Advanced Mode » at the top: manual drums, vocals, structure and exclude."),
            L("Clique sur l'enclume FORGER. ","Hit the FORGE anvil. "),
            L("Va dans l'onglet Output : tes 3 prompts t'attendent.","Go to the Output tab: your 3 prompts are ready."),
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"12px",padding:"9px 0",borderBottom:i<4?"1px solid #1a1a1a":"none"}}>
              <div style={S.stepNum(RED)}>{i+1}</div>
              <div style={{fontSize:"0.8rem",color:"#ccc",lineHeight:1.6,paddingTop:"3px"}}>{s}</div>
            </div>
          ))}
        </div>

        {/* LES 3 PROMPTS */}
        <div style={S.card}>
          <div style={S.ctitle}>{L("2 · Les 3 prompts (le coeur du système)","2 · The 3 prompts (the core trick)")}</div>
          <div style={{fontSize:"0.72rem",color:"#999",lineHeight:1.65,marginBottom:"12px"}}>{L("Suno mélange mal plusieurs genres dans un seul prompt. On le contourne avec 3 prompts complémentaires :","Suno blends multiple genres badly in a single prompt. We work around it with 3 complementary prompts:")}</div>
          {[
            {n:L("PRINCIPAL","MAIN"),c:RED,d:L("Ton genre dominant. Copie le « Style of Music » dans le champ Style de Suno, et colle les blocs de structure EN HAUT du champ Lyrics. Génère.","Your dominant genre. Copy the « Style of Music » into Suno's Style field, and paste the structure blocks at the TOP of the Lyrics field. Generate.")},
            {n:L("COVER (sous-genre)","COVER (sub-genre)"),c:"#b06bff",d:L("Sur la chanson générée, clique « Cover » dans Suno et colle ce prompt → la fusion / le sous-genre ressort proprement.","On the generated track, click « Cover » in Suno and paste this prompt → the fusion / sub-genre comes out cleanly.")},
            {n:L("EXTEND (rallonge)","EXTEND (lengthen)"),c:"#33ccbb",d:L("Pour allonger la chanson sans qu'elle dérive : « Extend » dans Suno + ce prompt de rappel.","To lengthen the track without drift: « Extend » in Suno + this callback prompt.")},
          ].map((p,i)=>(
            <div key={i} style={{padding:"9px 0",borderBottom:i<2?"1px solid #1a1a1a":"none"}}>
              <div style={{fontSize:"0.78rem",fontWeight:900,color:p.c,letterSpacing:"0.5px"}}>{p.n}</div>
              <div style={{fontSize:"0.74rem",color:"#aaa",lineHeight:1.55,marginTop:"3px"}}>{p.d}</div>
            </div>
          ))}
          <div style={{fontSize:"0.6rem",color:"#555",marginTop:"10px",lineHeight:1.6}}>{L("En haut du prompt : le modèle Suno recommandé (v4.5 = brut/heavy, v5 = poli). Teste les deux.","At the top of the prompt: the recommended Suno model (v4.5 = raw/heavy, v5 = polished). Try both.")}</div>
        </div>

        {/* REGLAGES SUNO */}
        <div style={S.card}>
          <div style={S.ctitle}>{L("3 · Réglages Suno (More Options)","3 · Suno settings (More Options)")}</div>
          <div style={{fontSize:"0.72rem",color:"#999",lineHeight:1.7,marginBottom:"12px"}}>{L("Dans Suno, ouvre « More Options ». Réglages conseillés pour le metal :","In Suno, open « More Options ». Recommended settings for metal:")}</div>
          {[
            {n:"Weirdness",v:"40-60%",d:L("Garde ça cohérent. Plus haut = chaos / expérimental.","Keep it coherent. Higher = chaos / experimental.")},
            {n:"Style Influence",v:"70-90%",d:L("HAUT — pour que Suno respecte tes tags MetalPrompt précis.","HIGH — so Suno respects your precise MetalPrompt tags.")},
            {n:"Audio Influence",v:"55-75%",d:L("Apparaît avec un upload. Plus haut = colle à ta référence (ex. ton WAV du Riff Generator).","Appears with an upload. Higher = sticks to your reference (e.g. your Riff Generator WAV).")},
            {n:"Vocal Gender",v:"Male",d:L("Male pour la plupart du metal (Female pour certains styles).","Male for most metal (Female for some styles).")},
            {n:"Exclude styles",v:"<->",d:L("Recopie tes tags de l'onglet Exclude (pop, clean vocals…).","Copy your tags from the Exclude tab (pop, clean vocals…).")},
          ].map((r,i)=>(
            <div key={r.n} style={{padding:"8px 0",borderBottom:i<4?"1px solid #1a1a1a":"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:"8px"}}>
                <span style={{fontSize:"0.8rem",fontWeight:800,color:"#e0e0e0"}}>{r.n}</span>
                <span style={{fontSize:"0.74rem",fontWeight:900,color:RED,fontFamily:"monospace"}}>{r.v}</span>
              </div>
              <div style={{fontSize:"0.68rem",color:"#888",lineHeight:1.5,marginTop:"2px"}}>{r.d}</div>
            </div>
          ))}
          <div style={{fontSize:"0.6rem",color:"#555",marginTop:"10px",lineHeight:1.6}}>{L("Règle d'or : Style Influence haut + Weirdness modéré = Suno suit ton prompt sans déraper.","Rule of thumb: high Style Influence + moderate Weirdness = Suno follows your prompt without going off the rails.")}</div>
        </div>

        {/* RIFF */}
        <div style={S.card}>
          <div style={S.ctitle}>{L("4 · Riff Generator (référence audio)","4 · Riff Generator (audio reference)")}</div>
          <div style={{fontSize:"0.74rem",color:"#999",lineHeight:1.7,marginBottom:"12px"}}>{L("Suno invente souvent un beat plate. Donne-lui un VRAI groove à suivre :","Suno often invents a flat beat. Give it a REAL groove to follow:")}</div>
          {[
            L("Onglet Riff : choisis ton style + une scène (saveur régionale).","Riff tab: choose your style + a scene (regional flavor)."),
            L("Écoute avec Play, ajuste le tempo, puis Export en WAV.","Preview with Play, tweak the tempo, then Export to WAV."),
            L("Dans Suno : uploade le WAV comme « Audio Influence » → Suno colle à ton groove au lieu d'inventer.","In Suno: upload the WAV as « Audio Influence » → Suno locks to your groove instead of inventing."),
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"12px",padding:"9px 0",borderBottom:i<2?"1px solid #1a1a1a":"none"}}>
              <div style={S.stepNum(RED)}>{i+1}</div>
              <div style={{fontSize:"0.8rem",color:"#ccc",lineHeight:1.6,paddingTop:"3px"}}>{s}</div>
            </div>
          ))}
        </div>

        {/* MASTER */}
        <div style={S.card}>
          <div style={S.ctitle}>{L("5 · Mastering (finir le son)","5 · Mastering (finish the sound)")}</div>
          <div style={{fontSize:"0.74rem",color:"#999",lineHeight:1.7,marginBottom:"12px"}}>{L("Le rendu Suno sort souvent mou ou brouillon. Le studio de mastering le nettoie et le grossit :","Suno output often comes out soft or muddy. The mastering studio cleans it up and fattens it:")}</div>
          {[
            L("Onglet Master : uploade ta chanson Suno et choisis un preset (genre).","Master tab: upload your Suno track and pick a preset (genre)."),
            L("Ajuste les pistes (mute / solo / pan + EQ 3 bandes) et le sidechain kick → basse.","Adjust the stems (mute / solo / pan + 3-band EQ) and the kick → bass sidechain."),
            L("Active le débruiteur si Suno a laissé du souffle, écoute avec Monitor, puis Export.","Turn on the de-noiser if Suno left hiss, listen with Monitor, then Export."),
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"12px",padding:"9px 0",borderBottom:i<2?"1px solid #1a1a1a":"none"}}>
              <div style={S.stepNum(RED)}>{i+1}</div>
              <div style={{fontSize:"0.8rem",color:"#ccc",lineHeight:1.6,paddingTop:"3px"}}>{s}</div>
            </div>
          ))}
          <div style={{background:"#170c0c",border:"1px solid #4a2020",borderRadius:"6px",padding:"9px 12px",marginTop:"10px",fontSize:"0.66rem",color:"#e0a0a0",lineHeight:1.6}}>{L("Important : le mastering est l'étape FINALE, pour ta release. Fais tes Extend/Cover DANS Suno avant — ne re-uploade jamais une chanson mastérisée dans Suno, son filtre anti-copie la bloquerait.","Important: mastering is the FINAL step, for your release. Do your Extends/Covers IN Suno first — never re-upload a mastered track into Suno, its anti-copy filter would block it.")}</div>
        </div>

        {/* CUSTOM MODEL */}
        <div style={S.card}>
          <div style={S.ctitle}>{L("Custom Model Studio","Custom Model Studio")}</div>
          <div style={{fontSize:"0.74rem",color:"#999",lineHeight:1.7,marginBottom:"12px"}}>{L("Entraîne un modèle Suno sur TON sound. MetalPrompt produit le jeu d'entraînement cohérent — c'est la clé d'un bon custom model.","Train a Suno model on YOUR sound. MetalPrompt produces the consistent training set — the key to a good custom model.")}</div>
          {[
            L("Sauve ton profil dans « Mon Sound » (onglet Genre) : tags, BPM, voix signature.","Save your profile in « My Sound » (Genre tab): tags, BPM, signature vocals."),
            L("Génère 6 à 8 chansons COHÉRENTES dans Suno avec ce même profil.","Generate 6-8 CONSISTENT tracks in Suno with that same profile."),
            L("Dans Suno : menu du modèle -> « Create Custom Model » -> uploade tes 6+ chansons (que tu possèdes).","In Suno: model menu -> « Create Custom Model » -> upload your 6+ tracks (that you own)."),
            L("Génère avec ton custom model + tes prompts MetalPrompt pour diriger chaque chanson.","Generate with your custom model + your MetalPrompt prompts to steer each track."),
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"12px",padding:"9px 0",borderBottom:i<3?"1px solid #1a1a1a":"none"}}>
              <div style={S.stepNum(RED)}>{i+1}</div>
              <div style={{fontSize:"0.8rem",color:"#ccc",lineHeight:1.6,paddingTop:"3px"}}>{s}</div>
            </div>
          ))}
          <div style={{fontSize:"0.6rem",color:"#555",marginTop:"10px",lineHeight:1.6}}>{L("Custom Models : Suno Pro/Premier · ~2-5 min d'entraînement · jusqu'à 3 modèles · 6+ chansons que tu possèdes.","Custom Models: Suno Pro/Premier · ~2-5 min training · up to 3 models · 6+ songs you own.")}</div>
        </div>
        <div style={{height:80}}/>
      </div>}

      {tab==="masterclass"&&<div style={S.page}>
        {/* HERO */}
        <div style={{...S.card,textAlign:"center",padding:"26px 22px",borderColor:"#ff2e2e44"}}>
          <div style={{display:"inline-block",fontSize:"0.6rem",fontWeight:900,letterSpacing:"2px",color:"#000",background:RED,borderRadius:"20px",padding:"4px 14px",marginBottom:"12px"}}>{L("À VENIR","COMING SOON")}</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.9rem",letterSpacing:"2px",color:"#fff"}}>MASTERCLASS</div>
          <div style={{color:"#999",fontSize:"0.82rem",marginTop:"6px",lineHeight:1.55}}>{L("Bientôt : progresse avec de vrais musiciens. Les classes ne sont pas encore lancées — on bâtit la plateforme et on recrute les premiers profs. Tu enseignes ? Embarque dès maintenant (plus bas).","Coming soon: level up with real musicians. Classes aren't live yet — we're building the platform and recruiting our first instructors. You teach? Get in now (below).")}</div>
        </div>

        {/* CE QUE TU PEUX APPRENDRE */}
        <div style={S.card}>
          <div style={S.ctitle}>{L("Ce que tu peux apprendre","What you can learn")}</div>
          {[
            {t:L("Riffing & composition","Riffing & songwriting"),d:L("Construire des riffs qui frappent et structurer une chanson.","Build riffs that hit and structure a track.")},
            {t:L("Voix extrêmes","Extreme vocals"),d:L("Scream, growl, fry — technique et santé vocale.","Scream, growl, fry — technique and vocal health.")},
            {t:L("Mix & son metal","Mixing & metal tone"),d:L("Faire sonner gros : guitares, batterie, basse.","Make it sound huge: guitars, drums, bass.")},
          ].map(c=>(
            <div key={c.t} style={{...S.card,display:"flex",alignItems:"center",gap:"14px",marginBottom:"10px"}}>
              <div style={{flex:1}}>
                <div style={{color:"#fff",fontWeight:800,fontSize:"0.88rem"}}>{c.t} <span style={{marginLeft:"6px",fontSize:"0.52rem",fontWeight:900,color:"#fff",background:RED,borderRadius:"6px",padding:"2px 7px",letterSpacing:"0.5px",verticalAlign:"middle"}}>{L("BIENTÔT","SOON")}</span></div>
                <div style={{color:"#888",fontSize:"0.74rem",marginTop:"3px",lineHeight:1.5}}>{c.d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* PARCOURS MODULES */}
        <div style={S.card}>
          <div style={S.ctitle}>{L("Parcours en modules","Module path")}</div>
          <div style={{fontSize:"0.78rem",color:"#999",lineHeight:1.7,marginBottom:"16px"}}>{L("Les cours sont structurés en modules qui se suivent sur une timeline. Tu rejoins au module de ton niveau — pas besoin de repartir de zéro — et tu n'es pas obligé d'être là chaque semaine : tu avances à ton rythme.","Courses are structured into modules along a timeline. You join at your level's module — no need to start over — and you're not required to attend every week: progress at your own pace.")}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"0",alignItems:"stretch"}}>
            {[
              {n:1,t:L("Fondations","Foundations"),d:L("Rythme, accordage, mécanique de base.","Timing, tuning, basic mechanics.")},
              {n:2,t:L("Riffing","Riffing"),d:L("Construire des riffs qui frappent.","Build riffs that hit.")},
              {n:3,t:L("Structure","Songwriting"),d:L("Assembler une chanson complète.","Assemble a full track.")},
              {n:4,t:L("Mix & son","Mix & tone"),d:L("Faire sonner gros.","Make it sound huge.")},
              {n:5,t:L("Voix & finition","Vocals & polish"),d:L("Voix extrêmes, mastering, release.","Extreme vocals, mastering, release.")},
            ].map((m,i,arr)=>(
              <div key={m.n} style={{flex:"1 1 130px",minWidth:"125px",display:"flex",flexDirection:"column",gap:"6px",padding:"0 5px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"7px"}}>
                  <div style={{width:"30px",height:"30px",borderRadius:"50%",background:RED,color:"#000",fontWeight:900,fontSize:"0.82rem",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{m.n}</div>
                  {i<arr.length-1&&<div style={{flex:1,height:"2px",background:"#3a0000"}}/>}
                </div>
                <div style={{color:"#fff",fontWeight:800,fontSize:"0.74rem"}}>{m.t}</div>
                <div style={{color:"#888",fontSize:"0.64rem",lineHeight:1.45}}>{m.d}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginTop:"16px"}}>
            <div style={{flex:"1 1 200px",background:"#0c0f0c",border:"1px solid #1f3a1f",borderRadius:"6px",padding:"9px 11px",fontSize:"0.68rem",color:"#9fd09f",lineHeight:1.5}}>{L("Rejoins au module de ton niveau — pas besoin de recommencer.","Join at your level's module — no need to restart.")}</div>
            <div style={{flex:"1 1 200px",background:"#0c0f0c",border:"1px solid #1f3a1f",borderRadius:"6px",padding:"9px 11px",fontSize:"0.68rem",color:"#9fd09f",lineHeight:1.5}}>{L("Pas obligé d'être là chaque semaine — avance à ton rythme.","Not required to attend every week — go at your own pace.")}</div>
          </div>
        </div>

        {/* FORMATS HEBDO */}
        <div style={S.card}>
          <div style={S.ctitle}>{L("Formats de cours","Course formats")}</div>
          {[
            {t:L("Sessions pré-enregistrées","Pre-recorded sessions"),d:L("Les modules en vidéo, à la demande : regarde quand tu veux, repasse les passages, avance à ton rythme.","Modules on video, on demand: watch anytime, replay sections, go at your own pace.")},
            {t:L("Direct — cohorte fixe","Live — fixed cohort"),d:L("Le même groupe chaque semaine — vous progressez ensemble, dans un esprit de band.","The same group every week — you progress together, band spirit.")},
            {t:L("Direct — sessions ouvertes","Live — open sessions"),d:L("Cours en direct en drop-in : tu te joins quand tu veux, composition variable.","Live drop-in classes: join whenever, variable lineup.")},
          ].map(c=>(
            <div key={c.t} style={{padding:"9px 0",borderBottom:"1px solid #1a1a1a"}}>
              <div style={{color:"#e0e0e0",fontWeight:800,fontSize:"0.82rem"}}>{c.t}</div>
              <div style={{color:"#888",fontSize:"0.74rem",marginTop:"3px",lineHeight:1.5}}>{c.d}</div>
            </div>
          ))}
          <div style={{fontSize:"0.6rem",color:"#555",marginTop:"10px",lineHeight:1.6}}>{L("Chaque prof choisit son format : pré-enregistré, direct (cohorte fixe ou ouvert), ou un mélange.","Each instructor picks the format: pre-recorded, live (fixed cohort or open), or a mix.")}</div>
        </div>

        {/* RECRUTEMENT PROFS */}
        <div style={{...S.card,borderColor:"#ff2e2e55",background:"#0d0000"}}>
          <div style={{...S.ctitle,color:RED}}>{L("Tu enseignes ? Garde 100% de tes revenus","You teach? Keep 100% of your revenue")}</div>
          <div style={{fontSize:"0.8rem",color:"#ccc",lineHeight:1.7,marginBottom:"12px"}}>{L("Place tes masterclasses sur MetalPrompt et garde 100% de ce que tu charges. Aucune commission : la plateforme se finance par l'abonnement, pas sur ton dos.","List your masterclasses on MetalPrompt and keep 100% of what you charge. No commission: the platform runs on subscriptions, not off your back.")}</div>
          {[
            L("Fixe tes propres tarifs et ton horaire.","Set your own rates and schedule."),
            L("Cohorte fixe ou sessions ouvertes — c'est ton format.","Fixed cohort or open sessions — your format, your call."),
            L("On t'amène les élèves : une communauté de metalheads motivés à progresser.","We bring you the students: a community of metalheads driven to improve."),
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",gap:"9px",alignItems:"flex-start",padding:"4px 0"}}>
              <span style={{color:RED,fontWeight:900,lineHeight:1.5}}>—</span>
              <span style={{fontSize:"0.78rem",color:"#ddd",lineHeight:1.55}}>{s}</span>
            </div>
          ))}
          <a href="mailto:mmftechnisolutions@gmail.com?subject=Devenir%20prof%20Masterclass%20MetalPrompt" style={{display:"block",textAlign:"center",marginTop:"14px",padding:"13px",background:RED,borderRadius:"8px",color:"#000",fontWeight:900,fontSize:"0.82rem",letterSpacing:"1px",textTransform:"uppercase",textDecoration:"none"}}>
            {L("Deviens prof fondateur — propose ta masterclass","Become a founding instructor — pitch your masterclass")}
          </a>
          <div style={{fontSize:"0.6rem",color:"#555",textAlign:"center",marginTop:"8px",lineHeight:1.6}}>{L("Musiciens, profs, créateurs — bâtissons la plateforme du metalhead ensemble.","Musicians, teachers, creators — let's build the metalhead platform together.")}</div>
        </div>
        <div style={{height:80}}/>
      </div>}

      {tab==="output"&&<div style={S.page}>
        {!styleTxt&&<div style={{...S.card,textAlign:"center",padding:"30px 20px",borderColor:"#222"}}>
          <div style={{fontSize:"2.5rem",marginBottom:"10px"}}></div>
          <div style={{fontSize:"0.82rem",color:"#444"}}>{t.noPrompt}</div>
        </div>}
        {styleTxt&&<>
          {/* COMPACT TOGGLE + CONFLICTS */}
          <div style={{...S.card,display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px",borderColor:"#2a2a2a"}}>
            <div>
              <div style={{fontSize:"0.74rem",fontWeight:800,color:"#e0e0e0"}}>{L("Mode Compact","Compact mode")}</div>
              <div style={{fontSize:"0.58rem",color:"#666",marginTop:"2px"}}>{L("Réduit le style ≤120 car. · surplus → champ Lyrics","Trim style ≤120 chars · overflow → Lyrics field")}</div>
            </div>
            <button onClick={()=>setCompact(c=>!c)} style={{background:compact?RED:"#1a1a1a",border:`1px solid ${compact?RED:"#333"}`,borderRadius:"20px",width:"50px",height:"26px",position:"relative",cursor:"pointer",flexShrink:0,padding:0}}>
              <span style={{position:"absolute",top:"2px",left:compact?"26px":"2px",width:"20px",height:"20px",borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
            </button>
          </div>
          {conflicts.length>0&&<div style={{...S.card,borderColor:"#5a4a00",background:"#0f0c00"}}>
            <div style={{fontSize:"0.62rem",fontWeight:800,color:"#e6c200",letterSpacing:"1px",marginBottom:"6px"}}>⚠️ {L("Conflits possibles","Possible conflicts")}</div>
            {conflicts.map((c,i)=><div key={i} style={{fontSize:"0.68rem",color:"#cba",lineHeight:1.6,padding:"2px 0"}}>• {c}</div>)}
          </div>}
          {/* STEP 1 */}
          <div style={{...S.card,borderColor:"#ff2e2e33",background:"#0d0000"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
              <div style={S.stepNum(RED)}>1</div>
              <div style={{...S.outLbl,marginBottom:0,color:RED}}>{t.step1t}</div>
            </div>
            <div style={{fontSize:"0.63rem",color:"#888",marginBottom:"10px",lineHeight:1.6}}>{t.step1d}</div>
            {modelRec&&<div style={{background:"#0a0600",border:"1px solid #3a2a00",borderRadius:"6px",padding:"8px 10px",marginBottom:"10px",fontSize:"0.62rem",lineHeight:1.6}}>
              <span style={{color:"#ffcc00",fontWeight:800}}>{L("Modèle Suno recommandé","Recommended Suno model")} :</span>{" "}
              <span style={{color:"#7fdd7f",fontWeight:700}}>{modelRec.best}</span> · <span style={{color:"#d8d86a"}}>{modelRec.good}</span> · <span style={{color:"#cc8866"}}>{modelRec.weak}</span>
              <div style={{color:"#888",marginTop:"3px"}}>{modelRec.why} · {L("teste les 3 au goût","try all 3 to taste")}</div>
            </div>}
            <div style={{background:"#0a0a0a",border:"1px solid #3a0000",borderRadius:"6px",padding:"10px",position:"relative"}}>
              <CopyBtn getText={()=>styleShown}/>
              <div style={{color:"#ff9090",fontSize:"0.8rem",lineHeight:1.8,paddingRight:"50px",fontFamily:"monospace"}}>{styleShown}</div>
            </div>
            <div style={{fontSize:"0.58rem",marginTop:"7px",textAlign:"right",fontWeight:700,color:styleShown.length<=120?"#4caf50":styleShown.length<=180?"#cc9900":"#ff5555"}}>{styleShown.length} {L("car.","chars")} · {styleShown.length<=120?L("idéal Suno ","ideal for Suno "):styleShown.length<=180?L("un peu long","a bit long"):L("trop long — Suno risque d'ignorer le tempo/détails","too long — Suno may drop tempo/details")}</div>
          </div>
          {/* COVER + EXTEND (T11) */}
          {coverTxt&&<div style={{...S.card,borderColor:"#9b59b633",background:"#0a0510"}}>
            <div style={{...S.outLbl,color:"#b06bff",marginBottom:"6px"}}>{L("Prompt COVER (sous-genre)","COVER prompt (sub-genre)")}</div>
            <div style={{fontSize:"0.6rem",color:"#888",marginBottom:"8px",lineHeight:1.5}}>{L("Génère avec le Principal, puis fais « Cover » sur le résultat dans Suno avec ce prompt → pousse la fusion proprement.","Generate with the Main first, then 'Cover' the result in Suno with this prompt → pushes the fusion cleanly.")}</div>
            <div style={{background:"#0a0a0a",border:"1px solid #2a1a3a",borderRadius:"6px",padding:"10px",position:"relative"}}>
              <CopyBtn getText={()=>coverTxt}/>
              <div style={{color:"#c9a0ff",fontSize:"0.8rem",lineHeight:1.8,paddingRight:"50px",fontFamily:"monospace"}}>{coverTxt}</div>
            </div>
          </div>}
          {extendTxt&&<div style={{...S.card,borderColor:"#00aaaa33",background:"#03100f"}}>
            <div style={{...S.outLbl,color:"#33ccbb",marginBottom:"6px"}}>{L("Prompt EXTEND (rallonge)","EXTEND prompt (lengthen)")}</div>
            <div style={{fontSize:"0.6rem",color:"#888",marginBottom:"8px",lineHeight:1.5}}>{L("Utilise « Extend » dans Suno avec ce prompt pour continuer la chanson sans qu'elle dérive.","Use 'Extend' in Suno with this prompt to continue the song without drift.")}</div>
            <div style={{background:"#0a0a0a",border:"1px solid #103a38",borderRadius:"6px",padding:"10px",position:"relative"}}>
              <CopyBtn getText={()=>extendTxt}/>
              <div style={{color:"#7fded0",fontSize:"0.8rem",lineHeight:1.8,paddingRight:"50px",fontFamily:"monospace"}}>{extendTxt}</div>
            </div>
          </div>}
          {/* STEP 2 */}
          {structTxt&&<div style={{...S.card,borderColor:"#00aa4433",background:"#030f03"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
              <div style={S.stepNum("#4caf50")}>2</div>
              <div style={{...S.outLbl,color:"#4caf50",marginBottom:0}}>{t.step2t}</div>
            </div>
            <div style={{fontSize:"0.63rem",color:"#688",marginBottom:"10px",lineHeight:1.6}}>{t.step2d}</div>
            {lyricsTxt
              ? <div style={{fontSize:"0.62rem",color:"#4caf50",marginBottom:"8px",fontWeight:700}}>{L("Tes paroles sont déjà placées sous chaque section — colle ce bloc tel quel.","Your lyrics are already placed under each section — paste this block as is.")}</div>
              : <div style={{fontSize:"0.6rem",color:"#777",marginBottom:"8px",lineHeight:1.5}}>{L("Écris tes paroles sous chaque tag de section, ou laisse Suno improviser. (Paroles par IA : onglet Lyrics, plan Pro)","Write your lyrics under each section tag, or let Suno improvise. (AI lyrics: Lyrics tab, Pro plan)")}</div>}
            <div style={{background:"#0a0a0a",border:"1px solid #1a4a1a",borderRadius:"6px",padding:"10px",position:"relative"}}>
              <CopyBtn getText={()=>step2Shown}/>
              <pre style={{whiteSpace:"pre-wrap",fontFamily:"monospace",fontSize:"0.82rem",lineHeight:2,color:"#aaffaa",paddingRight:"50px"}}>{step2Shown}</pre>
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
          <div style={{...S.card,borderColor:"#1a3a1a",textAlign:"center"}}>
            <div style={{color:"#4caf50",fontSize:"0.65rem",letterSpacing:"2px",textTransform:"uppercase",fontWeight:700,marginBottom:"8px"}}>{L("Tips Suno","Suno tips")}</div>
            <div style={{fontSize:"0.68rem",color:"#555",lineHeight:1.9}}>
              • {L("8–12 tags max dans Style of Music","8–12 tags max in Style of Music")}<br/>
              • {L("[Breakdown, half-time feel] = changement de rythme garanti","[Breakdown, half-time feel] = guaranteed rhythm change")}<br/>
              • {L("pig squeals + guttural growls = combo deathcore parfait","pig squeals + guttural growls = perfect deathcore combo")}<br/>
              • {L("saxophone + metal = son unique et brutal ","saxophone + metal = unique, brutal sound ")}
            </div>
          </div>
        </>}
        <div style={{height:80}}/>
      </div>}

      {/* HISTORY */}
      {tab==="history"&&(isPro||isElite)&&<div style={S.page}>
        <div style={{...S.card,borderColor:"#ff2e2e22"}}>
          <div style={S.ctitle}>{L("Historique PRO","PRO History")} — {history.length}/50 prompts</div>
          {history.length===0&&<div style={{color:"#444",fontSize:"0.75rem",textAlign:"center",padding:"20px"}}>{L("Aucun prompt encore. Forge quelque chose ! ","No prompts yet. Forge something! ")}</div>}
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
