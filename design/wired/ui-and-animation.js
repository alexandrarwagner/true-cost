(function(){
const RATE=window.TPEngine.rates(); // all rates come from the engine adapter
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=id=>document.getElementById(id);
const res=[...document.querySelectorAll('.res')];
function fitAll(){document.querySelectorAll('.fit').forEach(el=>{if(!el.dataset.fs)el.dataset.fs=parseFloat(el.style.fontSize)||34;let f=+el.dataset.fs;el.style.fontSize=f+'px';const box=el.parentElement;const w=box.clientWidth-parseFloat(getComputedStyle(box).paddingLeft)-parseFloat(getComputedStyle(box).paddingRight);while(el.scrollWidth>w&&f>18){f-=1;el.style.fontSize=f+'px'}})}
window.addEventListener('resize',fitAll);
res.forEach(s=>s.classList.add('pre'));
// status line
const st=document.createElement('p');st.id='r-status';st.setAttribute('aria-live','polite');st.innerHTML='<i></i><span></span>';$('r-sample').after(st);
// years stepper
const yrs=$('years');const clampY=v=>Math.max(1,Math.min(6,parseInt(v)||1));
$('yrs-dn').onclick=()=>{yrs.value=clampY(yrs.value-1)};$('yrs-up').onclick=()=>{yrs.value=clampY(+yrs.value+1)};
yrs.addEventListener('blur',()=>yrs.value=clampY(yrs.value));
yrs.addEventListener('keydown',e=>{if(e.key==='ArrowUp'){yrs.value=clampY(+yrs.value+1);e.preventDefault()}if(e.key==='ArrowDown'){yrs.value=clampY(yrs.value-1);e.preventDefault()}});
// tuition formatting
const tu=$('tuition');const parseT=()=>parseInt((tu.value||'').replace(/[^0-9]/g,''))||0;
tu.addEventListener('blur',()=>{const v=parseT();tu.value=v?'$'+v.toLocaleString('en-US'):''});
tu.addEventListener('input',()=>{window.TPTuitionSource='user'}); // typed over: the student's own number
const err=document.createElement('span');err.id='calc-err';err.setAttribute('role','alert');$('example').before(err);
// formatting
let CUR='INR';
const curCode=()=>{const t=$('cur').textContent.trim().split(' ')[0];return t||'USD'};
const words=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'];
function fmt(usd,mode){ // mode: full | big | short
  if(CUR==='INR'){const v=usd*RATE.INR;
    if(mode==='full')return '₹'+Math.round(v).toLocaleString('en-IN');
    if(mode==='big')return v>=1e7?'₹'+(v/1e7).toFixed(2)+' crore':'₹'+(v/1e5).toFixed(1)+' lakh';
    if(mode==='cr')return v>=1e7?'₹'+(v/1e7).toFixed(2)+' cr':'₹'+(v/1e5).toFixed(1)+' L';
    return '₹'+(v/1e5).toFixed(1)+'L'}
  // Any other home currency: the engine formats it the way the rest of the site does.
  if(CUR!=='USD'&&window.TPEngine.format)return window.TPEngine.format(usd*RATE[CUR],CUR,mode);
  if(mode==='full'||mode==='big'||mode==='cr')return '$'+Math.round(usd).toLocaleString('en-US');
  return '$'+(usd/1e3).toFixed(usd<1e4?1:0)+'k'}
const sym=()=>CUR==='USD'?'$':(window.TPEngine.symbol?window.TPEngine.symbol(CUR):CUR);
const usd=v=>'$'+Math.round(v).toLocaleString('en-US');
function count(el,to,mode,delay,dur){
  if(RM){el.textContent=fmt(to,mode);return}
  el.textContent=fmt(0,mode);
  setTimeout(()=>{const t0=performance.now();const step=t=>{const k=Math.min(1,(t-t0)/dur);const e=1-Math.pow(1-k,3);el.textContent=fmt(to*e,mode);if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)},delay)}
// costs the student knows
const OV={house:null,live:null,one:null,move:null};const EX=[];let LAST=null;
// ENGINE SEAM: every number comes from window.TPEngine (engine-adapter.js)
// The school picked from the search (with its UNITID) goes in whole; a name typed over it is just a name.
function schoolInput(){const s=window.TPSchool,name=$('school').value.trim();return (s&&s.name===name)?s:name}
function engineInput(T,Y){return {tuitionPerYearUsd:T,years:Y,from:$('from').value.trim(),currency:curCode(),school:schoolInput(),tuitionSource:window.TPTuitionSource||'user',overrides:{...OV},extras:EX.slice()}}
function costs(T,Y){return window.TPEngine.estimate(engineInput(T,Y))}
// flow
const btn=document.querySelector('#calc button[type=submit]');
function run(){
  const T=parseT(),Y=clampY(yrs.value);yrs.value=Y;
  if(!T){tu.setAttribute('aria-invalid','true');err.textContent='Add your tuition per year to work it out.';tu.focus();return}
  tu.removeAttribute('aria-invalid');err.textContent='';
  CUR=curCode();if(!(CUR in RATE))CUR='USD';
  btn.setAttribute('aria-busy','true');const lbl=btn.textContent;btn.textContent='Working it out…';
  // The real engine loads the school's figures and the currency's rates first (ready); the
  // prototype adapter has no ready() and runs at once. Then the 450ms pause the design sets.
  const inp=engineInput(T,Y);const E=window.TPEngine;const t0=performance.now();
  (E.ready?E.ready(inp):Promise.resolve()).catch(()=>{}).then(()=>{
    const K=E.estimate(inp);const c=K.c,tot=K.tot;LAST={T,Y};
    const wait=Math.max(0,(RM?0:450)-(performance.now()-t0));
    setTimeout(()=>{btn.removeAttribute('aria-busy');btn.textContent=lbl;reveal(T,Y,c,tot,K,false)},wait)});
}
function update(){if(!LAST)return;const K=costs(LAST.T,LAST.Y);reveal(LAST.T,LAST.Y,K.c,K.tot,K,true)}
window.tpUpdate=update;
function reveal(T,Y,c,tot,K,Q){
  const cc=curCode();
  $('r-sample').textContent=`${usd(T)} a year for ${Y} year${Y>1?'s':''}. ${K.meta&&K.meta.sampleNote?K.meta.sampleNote:''}`+(CUR==='USD'&&cc!=='USD'?` · ${cc} rates aren’t available, so this shows dollars`:', at today’s rate');
  const metas=[...document.querySelectorAll('#results .land.l1,#results .land.l2,#results .land.l3,#results .land.l4')].map(cd=>cd.querySelectorAll(':scope > span')[2]);
  const mine='<span style="width:12px;height:12px;flex:none;border-radius:50%;background:var(--ink)"></span>';const est='<span style="width:12px;height:12px;flex:none;border-radius:50%;border:2px dashed var(--ink);box-sizing:border-box"></span>';const off='<span style="width:12px;height:12px;flex:none;border-radius:3px;background:var(--dark)"></span>';
  const nM=EX.filter(e=>e.freq==='month').length,nO=EX.filter(e=>e.freq==='once').length;
  if(!K.lines){ // the prototype adapter: the page's own labels, unchanged
  metas[0].innerHTML=OV.house!=null?`${mine}Your number · ${usd(OV.house)} a month`:`${est}<span id="r-house-meta">Our estimate · ${12*Y} months</span>`;
  metas[1].innerHTML=(OV.live!=null?`${mine}Your number · ${usd(OV.live)} a month`:`${off}Government data`)+(nM?` · +${nM} of yours`:'');
  metas[2].innerHTML=(OV.one!=null?`${mine}Your number`:`${off}Visa, deposits, flights`)+(nO?` · +${nO} of yours`:'');
  metas[3].innerHTML=OV.move!=null?`${mine}Your number`:`${est}Our estimate · bank fees`;
  }else{ // the real engine: each card's icon and words come from the confidence of its biggest line
  const CONF={user:[mine,'Your number'],school:[off,'From your school'],government:[off,'Government data'],estimate:[est,'Our estimate']};
  const lead=cats=>{const ls=K.lines.filter(l=>cats.includes(l.category));return ls.length?ls.reduce((a,b)=>b.degreeUsd>a.degreeUsd?b:a).confidence:'estimate'};
  const tag=cats=>CONF[lead(cats)]||CONF.estimate;
  const h=tag(['housing']),lv=tag(['living','health_insurance']),on=tag(['one_off']),mv=tag(['money_moving']);
  metas[0].innerHTML=OV.house!=null?`${mine}Your number · ${usd(OV.house)} a month`:`${h[0]}<span id="r-house-meta">${h[1]} · ${12*Y} months</span>`;
  metas[1].innerHTML=(OV.live!=null?`${mine}Your number · ${usd(OV.live)} a month`:`${lv[0]}${lv[1]}`)+(nM?` · +${nM} of yours`:'');
  metas[2].innerHTML=(OV.one!=null?`${mine}Your number`:`${on[0]}${on[1]} · visa, deposits, flights`)+(nO?` · +${nO} of yours`:'');
  metas[3].innerHTML=OV.move!=null?`${mine}Your number`:`${mv[0]}${mv[1]} · bank fees`;
  }
  if(!Q){res.forEach(s=>s.classList.add('pre'));void document.body.offsetWidth;res.forEach(s=>s.classList.remove('pre'));}
  const R=document.getElementById('results');
  const cards=[...R.querySelectorAll('.land')];const draws=[...R.querySelectorAll('.draw')];
  const D=RM?0:1;
  const set=(el,delay,dur)=>{el.style.animationDelay=(delay*D)+'ms';if(dur)el.style.animationDuration=dur+'ms'};
  if(!Q){set(cards[0],100);set(draws[0],600,900);[1,2,3,4].forEach((i,k)=>set(cards[i],1300+k*180));set(draws[1],2300,800);set(cards[5],3000);
  count($('r-tui'),c.tui,'full',150*D,700);
  [['house',1350],['live',1530],['one',1710],['move',1890]].forEach(([k,d])=>count($('r-'+k),c[k],'full',d*D,700));
  count($('r-total'),tot,'big',3050*D,900);}else{$('r-tui').textContent=fmt(c.tui,'full');['house','live','one','move'].forEach(k=>$('r-'+k).textContent=fmt(c[k],'full'));$('r-total').textContent=fmt(tot,'big');}
  $('r-total-sub').textContent=CUR!=='USD'?fmt(tot,'full')+' · '+usd(tot):'About '+usd(tot/Y)+' a year';
  $('r-hidden').textContent=`Hidden costs: ${Math.round((tot-c.tui)/c.tui*100)}% on top of tuition`;
  // status narration
  if(!Q){const s=st.querySelector('span');st.classList.remove('ok');
  const steps=[[0,'Starting with tuition…'],[1300,'Adding housing, living costs, one-off costs and moving money…'],[3000,'Adding it all up…'],[4000,'Done. Here’s the full cost, and where each number comes from.']];
  steps.forEach(([t,m],i)=>setTimeout(()=>{s.textContent=m;if(i===steps.length-1)st.classList.add('ok')},RM?(i===steps.length-1?0:-1):t));
  if(RM){s.textContent=steps[3][1];st.classList.add('ok')}}
  // bubbles
  const parts=[['tui','Tuition'],['house','Housing'],['live','Living'],['one','One-off'],['move','Moving money']];const mx=Math.max(...parts.map(p=>c[p[0]]));
  parts.forEach(([k,n],i)=>{const b=$('rb'+(i+1));const sz=Math.max(110,Math.round(440*Math.sqrt(c[k]/mx)));const o=parseFloat(b.style.width);const cx=parseFloat(b.style.left)+o/2,cy=parseFloat(b.style.top)+o/2;
    b.style.width=b.style.height=sz+'px';b.style.left=(cx-sz/2)+'px';b.style.top=(cy-sz/2)+'px';
    const sp=b.querySelectorAll('span');const pct=Math.round(c[k]/tot*100);
    sp[0].textContent=fmt(c[k],'short');if(sp[1]){if(i===4)sp[1].innerHTML=`Moving<br>money · ${pct}%`;else sp[1].textContent=(i===3?'One-off':n)+' · '+pct+'%'}});
  $('r-bubbles').setAttribute('aria-label','Circles sized by cost: '+parts.map(([k,n])=>n+' '+fmt(c[k],'full')).join(', '));
  // list view of the same numbers
  {const rows=[...document.querySelectorAll('#where-list .wl-row')];const ks=['tui','house','live','one','move'];const mxv=Math.max(...ks.map(k=>c[k]));
   const det=[`${usd(T)} × ${Y} year${Y>1?'s':''}, paid each semester`,`Rent near your school, ${12*Y} months`,'Food, transport, phone, books, insurance'+(K.exM?' + yours':''),'Visa, SEVIS, flights, deposits'+(K.exO?' + yours':''),'Transfer fees and rate markup'];
   rows.forEach((r,i)=>{r.querySelector('.wl-v').textContent=fmt(c[ks[i]],'full');r.querySelector('.wl-bar').style.width=(c[ks[i]]/mxv*100).toFixed(1)+'%';r.querySelector('.wl-d').textContent=det[i]})}
  const bs=$('r-bubbles');if(!Q)bs.classList.add('paused');
  // section bar
  $('nb-total').textContent=fmt(tot,'big');$('nb-meta').textContent=`· ${Y} year${Y>1?'s':''}`;document.body.classList.add('has-res');
  const sem=T/2+1500*6;const n=2*Y;
  // exchange rate: replay past moves on your payments (INR only)
  const fxSec=$('fx');let lo=null,hi=null,buf=null;
  if(K.fx){fxSec.querySelectorAll('.fxhide').forEach(x=>x.classList.remove('fxhide'));const nn=fxSec.querySelector('.fx-none');if(nn)nn.remove();
    const F=K.fx;drawFan(F,Y,!Q);
    lo=F.lo/RATE.INR;hi=F.hi/RATE.INR;buf=F.buf/RATE.INR;
    const loT=fmt(lo,'big'),hiT=fmt(hi,'big');$('fx-lo').textContent=(loT.endsWith('crore')&&hiT.endsWith('crore'))?loT.replace(' crore',''):loT;$('fx-hi').textContent=hiT;
    $('r-buf').textContent=fmt(buf,'big');$('fx-len').textContent=Y+'-year';$('fx-n').textContent=F.n;
  }else{fxSec.querySelectorAll(':scope > div > div:last-child, :scope > div > div:first-child > :not(h2)').forEach(x=>x.classList.add('fxhide'));if(!fxSec.querySelector('.fx-none')){const n=document.createElement('p');n.className='fx-none';n.style.cssText='margin:0;font-size:18px;color:#4A4B63';n.textContent=`We don’t have enough rate history for ${cc} to show a range. This section shows how a currency has moved against the dollar over past periods, and how much to set aside.`;fxSec.appendChild(n)}}
  $('save-country').textContent=$('from').value.trim()||'your country';
  fitAll();setTimeout(fitAll,2700*D+60);
  // Each figure links to its rows on the full calculation, once the count-up has finished.
  const bh=K.meta&&K.meta.shareQuery?'/estimate/breakdown?'+K.meta.shareQuery:null;
  const linkCards=()=>[['r-tui','tuition'],['r-house','housing'],['r-live','living'],['r-one','one_off'],['r-move','money_moving']].forEach(([id,cat])=>{const el=$(id);if(!el)return;
    const a=el.querySelector('a');const txt=el.textContent;if(!bh){if(a)el.textContent=txt;return}
    el.innerHTML='';const l=document.createElement('a');l.href=bh+'#'+cat;l.style.cssText='color:inherit;text-decoration:none';l.setAttribute('aria-label',txt+' — see how this was worked out');l.textContent=txt;el.appendChild(l)});
  setTimeout(linkCards,Q?0:(RM?0:4000));
  window.TP={T,Y,c,tot,CUR,cc,lo,hi,buf,sem,n,from:$('from').value.trim()||'—',school:$('school').value.trim(),fmt,usd,rate:RATE[CUR],sym:sym(),breakdownHref:bh};document.dispatchEvent(new Event('tp-update'));
  if(Q){fitAll();return}
  // later sections reveal on scroll
  const later=res.filter(x=>!['results','where'].includes(x.id));later.forEach(x=>{x.classList.remove('seen');x.classList.add('fade')});
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('seen');if(e.target.id==='fx'&&window.fxDraw)setTimeout(()=>window.fxDraw.play(),300);if(e.target.contains(bs))bs.classList.remove('paused');io.unobserve(e.target)}}),{threshold:.25});
  res.filter(x=>x.id!=='results').forEach(x=>io.observe(x));
  setTimeout(()=>R.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'}),60);
  if(!RM)setTimeout(()=>{const t=cards[5].getBoundingClientRect();if(t.bottom>innerHeight)window.scrollBy({top:t.bottom-innerHeight+60,behavior:'smooth'})},2900);
}
// "Know a cost we missed?"
(function(){const fm=$('add-cost-form');if(!fm)return;const list=$('extras-list');let freq='once';
 fm.querySelectorAll('.freq').forEach(b=>b.addEventListener('click',()=>{freq=b.dataset.f;fm.querySelectorAll('.freq').forEach(x=>{const on=x===b;x.setAttribute('aria-pressed',on);x.style.background=on?'#FFFFFF':'transparent';x.style.boxShadow=on?'0 2px 6px rgba(17,20,30,.08)':'none'})}));
 const draw=()=>{list.innerHTML=EX.map((e,i)=>`<div style="display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:24px;align-items:center;padding:16px 8px;border-bottom:1px solid #DCDDE3"><span style="font-size:17px;font-weight:600">${e.name.replace(/[<>&]/g,'')}<span style="font-weight:400;color:#4A4B63"> · ${e.freq==='month'?'every month':'one time'}</span></span><span class="num" style="font-size:17px;font-weight:600">${usd(e.amt)}${e.freq==='month'?' <span style="font-weight:400;color:#4A4B63">a month</span>':''}</span><button type="button" data-i="${i}" style="border:none;background:none;font:inherit;font-size:14px;color:#4A4B63;text-decoration:underline;cursor:pointer">Remove</button></div>`).join('');
   if(EX.length)list.style.borderTop='1.5px solid var(--ink)';else list.style.borderTop='none';
   list.querySelectorAll('button').forEach(x=>x.onclick=()=>{EX.splice(+x.dataset.i,1);draw();update()})};
 const amt=fm.querySelector('input[name=a]');amt.addEventListener('blur',()=>{const v=parseInt(amt.value.replace(/[^0-9]/g,''));amt.value=v?'$'+v.toLocaleString('en-US'):''});
 fm.addEventListener('submit',e=>{e.preventDefault();const n=fm.n.value.trim()||'Other cost';const a=parseInt(amt.value.replace(/[^0-9]/g,''));if(!a){amt.focus();return}EX.push({name:n,amt:a,freq});fm.reset();draw();update();fm.n.focus()});
})();
// bubbles <-> list
(function(){const b=$('where-toggle');if(!b)return;b.addEventListener('click',()=>{const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);b.textContent=on?'See as bubbles':'See as chart';$('r-bubbles').style.display=on?'none':'';$('where-list').style.display=on?'block':'none'})})();
// fan chart: draw left to right, with hover
function drawFan(F,Y,anim){const box=$('fx-fan');box.innerHTML=window.fanSVG(F,Y,{anim:anim&&!RM,symbol:sym(),indian:CUR==='INR'});const svg=box.querySelector('svg');const M=JSON.parse(svg.querySelector('metadata').textContent);
  const X=m=>M.L+M.pw*(m+1)/M.H,Yy=v=>M.T+M.ph*(1-v/M.top);
  const r=svg.querySelector('#fanclip-r'),head=svg.querySelector('#fan-head');let raf,played=!anim||RM;
  window.fxDraw={reset(){},play(){if(played)return;played=true;const t0=performance.now(),dur=2400;head.style.display='';
    const step=t=>{const k=Math.min(1,(t-t0)/dur);const e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;const fm=e*(M.H-1);const m0=Math.floor(fm),fr=fm-m0;const m1=Math.min(M.H-1,m0+1);
      const x=M.L+(X(M.H-1)-M.L)*e;const v=(m0===0&&fm<1)?F.today[0]*fm:F.today[m0]+(F.today[m1]-F.today[m0])*fr;
      r.setAttribute('width',x+2);head.setAttribute('cx',x);head.setAttribute('cy',Yy(v));
      if(k<1)raf=requestAnimationFrame(step);else{head.style.display='none';r.setAttribute('width',M.W)}};raf=requestAnimationFrame(step)}};
}
document.getElementById('calc').addEventListener('submit',e=>{e.preventDefault();run()});
// The example is a real school with its published tuition: New York University, two years.
const EXAMPLE_SCHOOL={unitId:193900,name:'New York University',city:'New York',state:'NY',zip:'10012'};
const runExample=e=>{e&&e.preventDefault();$('from').value='India';$('cur').textContent='INR ₹';window.TPSchool=EXAMPLE_SCHOOL;$('school').value=EXAMPLE_SCHOOL.name;tu.value='$65,622';window.TPTuitionSource='school';yrs.value=2;run()};$('example').addEventListener('click',runExample);document.querySelectorAll('.see-example').forEach(a=>a.addEventListener('click',runExample));
($('cta')||{addEventListener(){}}).addEventListener('click',e=>{e.preventDefault();window.scrollTo({top:0,behavior:RM?'auto':'smooth'});setTimeout(()=>tu.focus({preventScroll:true}),400)});
})();
