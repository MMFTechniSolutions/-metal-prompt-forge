// ── Partitions MetalPrompt (abcjs) — 2026-11-01 ──
const MPScore={
  // durées (en 16es) décomposées en valeurs standard, liées
  _split(u){const V=[16,12,8,6,4,3,2,1],o=[];while(u>0){const v=V.find(x=>x<=u);o.push(v);u-=v;}return o;},
  _len(v){return v===1?'':String(v);},
  _meter(n){return n%4===0?(n/4)+'/4':n%2===0?(n/2)+'/8':n+'/16';},
  // batterie : a = {kick,snare,hihat,L,bars?}
  drumABC(a,bpm,title){
    const bars=(a.bars&&a.bars.length)?a.bars:Array(Math.ceil(a.L/16)).fill(16);
    const grp=(tokens)=>{ // fusionne note + silences suivants dans le même temps (4 pas)
      let out='';for(let g=0;g<tokens.length;g+=4){const seg=tokens.slice(g,g+4);let i=0;while(i<seg.length){let j=i+1;while(j<seg.length&&seg[j]===null)j++;const d=j-i;out+=(seg[i]===null?'z':seg[i])+this._len(d);i=j;}out+=' ';}
      return out;};
    let up='',dn='',pos=0,prev=0;
    bars.forEach((n,bi)=>{
      const hm=[],km=[];
      for(let i=0;i<n;i++){const s=pos+i;hm.push(a.hihat[s]?'!style=x!g':null);const k=a.kick[s],sn=a.snare[s];km.push(k&&sn?'[Fc]':k?'F':sn?'c':null);}
      const mc=(n!==prev&&bi>0)?'[M:'+this._meter(n)+'] ':'';
      up+=mc+grp(hm)+'|';dn+=mc+grp(km)+'|';
      if(bi%2===1&&bi<bars.length-1){up+='\n';dn+='\n';}
      pos+=n;prev=n;
    });
    // abcjs : voix séparées ligne par ligne
    const U=up.split('\n'),D=dn.split('\n');let body='';U.forEach((l,i)=>{body+='V:1\n'+l+'\nV:2\n'+D[i]+'\n';});
    return `X:1\nT:${title||''}\nM:${this._meter(bars[0])}\nL:1/16\nQ:1/4=${bpm}\n%%score (1 2)\nK:C clef=perc\nV:1 stem=up\nV:2 stem=down\n${body}`;
  },
  _name(m){const P=['C','^C','D','^D','E','F','^F','G','^G','A','^A','B'];const pc=P[((m%12)+12)%12];const oc=Math.floor(m/12)-1;
    let L=pc.replace('^','');const acc=pc.startsWith('^')?'^':'';if(oc>=5)return{acc,letter:L,str:L.toLowerCase()+"'".repeat(oc-5)};return{acc,letter:L,str:L+','.repeat(4-oc)};},
  // mélodie : mel = tableau (midi|null) à 12 pas/temps ; spb = pas/mesure ; meter = '4/4'…
  melodyABC(mel,spb,meter,bpm,title,clef){
    const U=Math.round(spb/3);const nb=Math.ceil(mel.length/spb);let body='';
    for(let b=0;b<nb;b++){
      const on=[];for(let i=0;i<spb;i++){const m=mel[b*spb+i];if(m!=null){const q=Math.min(U-1,Math.round(i/3));if(!on.length||on[on.length-1].q!==q)on.push({q,m});}}
      const sharp={};let s='';
      const first=on.length?on[0].q:U; if(first>0) s+=this._split(first).map(v=>'z'+this._len(v)).join(' ')+' ';
      on.forEach((n,k)=>{const end=k+1<on.length?on[k+1].q:U;const d=end-n.q;const nm=this._name(n.m);
        let acc=nm.acc;const key=nm.str;if(!acc&&sharp[key])acc='=';sharp[key]=!!nm.acc;
        s+=this._split(d).map((v,vi)=>(vi===0?acc:'')+nm.str+this._len(v)).join('-')+' ';});
      body+=s+'|'+(b%4===3?'\n':' ');
    }
    return `X:1\nT:${title||''}\nM:${meter}\nL:1/16\nQ:1/4=${bpm}\nK:C${clef?' clef='+clef:''}\n${body}`;
  },
  render(el,abc,opts){if(!window.ABCJS){el.textContent='(partition indisponible hors ligne)';return;}window.ABCJS.renderAbc(el,abc,Object.assign({responsive:'resize',add_classes:true,paddingtop:6,paddingbottom:6,staffwidth:900},opts||{}));}
};
// tablature rythmique (guitare + basse) de tout l'arrangement — p = réponse /api/riff
MPScore.riffTab=function(p,T){
  const a=p.arr; if(!a||!a.L) return '';
  const bars=(a.bars&&a.bars.length)?a.bars:Array(Math.ceil(a.L/16)).fill(16);
  const TUNE={E2:'E',Eb2:'Eb',D2:'D',Db2:'C#',C2:'C',B1:'B'}, TN={E2:'Standard E',Eb2:'Eb',D2:'D Standard',Db2:'Drop D / C#',C2:'C Standard',B1:'B Standard'};
  const low=(TUNE[p.root]||'E'), drop=(p.root==='Db2');
  const fr=f=>{f=((f%24)+24)%24;return String(f);};
  const cell=s=>(s+'---').slice(0,3);
  const names=['e','B','G','D','A',low];
  let ni=0,pos=0,out=[];
  const lines=()=>({g:names.map(()=>''),b:''});
  let cur=lines(),inLine=0;
  const flush=()=>{const w=Math.max(...names.map(n=>n.length),low.length);
    out.push(T('Guitare','Guitar')+'\n'+cur.g.map((l,i)=>names[i].padEnd(w)+' |'+l).join('\n')+'\n'+T('Basse','Bass')+'\n'+(low.padEnd(w))+' |'+cur.b);cur=lines();inLine=0;};
  bars.forEach((n,bi)=>{
    for(let i=0;i<n;i++){const s=pos+i;
      if(a.guit[s]){const f=((a.note&&a.note[s]!=null)?a.note[s]:p.noteSeq[ni%p.noteSeq.length])+(a.trans[s]||0);ni++;
        const r=fr(f),fifth=drop?fr(f):fr(f+2);
        cur.g=cur.g.map((l,k)=>l+(k===5?cell(r):k===4?cell(fifth):'---'));}
      else cur.g=cur.g.map(l=>l+'---');
      cur.b+=a.bass[s]?cell(fr(((a.bnote&&a.bnote[s]!=null)?a.bnote[s]:0)+(a.trans[s]||0))):'---';
    }
    cur.g=cur.g.map(l=>l+'|');cur.b+='|';pos+=n;inLine++;
    if(inLine===2||bi===bars.length-1)flush();
  });
  return '// '+p.style+' · '+(TN[p.root]||p.root)+' · '+p.bpm+' BPM · '+T('power chords','power chords')+(drop?T(' (drop : 1 doigt)',' (drop: one finger)'):T(' (quinte +2 cases)',' (fifth +2 frets)'))+'\n\n'+out.join('\n\n');
};
window.MPScore=MPScore;
