(function(){
const RATE={INR:95.35}; // USD→INR, July 2026 (see sources); other currencies not connected in this prototype
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
const err=document.createElement('span');err.id='calc-err';err.setAttribute('role','alert');$('example').before(err);
const showErr=msg=>{err.textContent=msg;err.classList.remove('show');void err.offsetWidth;err.classList.add('show')};const clearErr=()=>{err.textContent='';err.classList.remove('show')};
const setInvalid=(el,bad)=>{if(bad)el.setAttribute('aria-invalid','true');else el.removeAttribute('aria-invalid');const lab=el.closest('label');if(lab)lab.classList.toggle('invalid',bad)};
[$('school'),tu].forEach(el=>el.addEventListener('input',()=>{if(el.getAttribute('aria-invalid')){setInvalid(el,false);if(!document.querySelector('#calc [aria-invalid=true]'))clearErr()}}));
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
  if(mode==='full'||mode==='big'||mode==='cr')return '$'+Math.round(usd).toLocaleString('en-US');
  return '$'+(usd/1e3).toFixed(usd<1e4?1:0)+'k'}
const usd=v=>'$'+Math.round(v).toLocaleString('en-US');
function pop(el,delay){if(!el||RM)return;el.classList.remove('pop');void el.offsetWidth;el.style.animationDelay=delay+'ms';el.classList.add('pop')}
function count(el,to,mode,delay,dur){
  if(RM){el.textContent=fmt(to,mode);return}
  el.textContent=fmt(0,mode);
  setTimeout(()=>{const t0=performance.now();const step=t=>{const k=Math.min(1,(t-t0)/dur);const e=1-Math.pow(1-k,3);el.textContent=fmt(to*e,mode);if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)},delay)}
// costs the student knows
const OV={house:null,live:null,one:null,move:null};const EX=[];let LAST=null;
function costs(T,Y){const rentM=OV.house??1500,liveM=OV.live??600,one=OV.one??6100;
  const exM=EX.filter(e=>e.freq==='month').reduce((a,e)=>a+e.amt,0),exO=EX.filter(e=>e.freq==='once').reduce((a,e)=>a+e.amt,0);
  const c={tui:T*Y,house:rentM*12*Y,live:(liveM+exM)*12*Y,one:one+exO};
  c.move=OV.move??Math.round((c.tui+c.house+c.live+c.one)*2200/131500);
  const tot=c.tui+c.house+c.live+c.one+c.move;
  return {c,tot,o:{T,Y,rentM,liveM,one,extraOnce:exO,extraMonthly:exM,move:OV.move,rate:RATE.INR},exM,exO}}
// flow
const btn=document.querySelector('#calc button[type=submit]');
function run(ex){
  const T=parseT(),Y=clampY(yrs.value);yrs.value=Y;const sc=$('school');
  const missing=[];if(!ex&&!sc.value.trim())missing.push('school');if(!T)missing.push('tuition');
  setInvalid(sc,missing.includes('school'));setInvalid(tu,missing.includes('tuition'));
  if(missing.length){showErr(missing.length===2?'Add your school and your tuition per year to work it out.':missing[0]==='school'?'Add your school to work it out.':'Add your tuition per year to work it out.');(missing[0]==='school'?sc:tu).focus();return}
  clearErr();
  CUR=curCode();if(!(CUR in RATE))CUR='USD';
  const K=costs(T,Y);const c=K.c,tot=K.tot;LAST={T,Y};
  btn.setAttribute('aria-busy','true');const lbl=btn.textContent;btn.textContent='Working it out…';
  setTimeout(()=>{btn.removeAttribute('aria-busy');btn.textContent=lbl;reveal(T,Y,c,tot,K,false)},RM?0:450);
}
function update(){if(!LAST)return;const K=costs(LAST.T,LAST.Y);reveal(LAST.T,LAST.Y,K.c,K.tot,K,true)}
window.tpUpdate=update;
function reveal(T,Y,c,tot,K,Q){
  const cc=curCode();
  $('r-sample').textContent=`${usd(T)} a year for ${Y} year${Y>1?'s':''}. Housing and living use Boston prices as a sample`+(CUR==='USD'&&cc!=='USD'?` · ${cc} rates aren’t connected in this prototype, so this shows dollars`:', at today’s rate');
  const metas=[...document.querySelectorAll('#results .land.l1,#results .land.l2,#results .land.l3,#results .land.l4')].map(cd=>cd.querySelectorAll(':scope > span')[2]);
  const mine='<span style="width:12px;height:12px;flex:none;border-radius:50%;background:var(--ink)"></span>';const est='<span style="width:12px;height:12px;flex:none;border-radius:50%;border:2px dashed var(--ink);box-sizing:border-box"></span>';const off='<span style="width:12px;height:12px;flex:none;border-radius:3px;background:var(--dark)"></span>';
  const nM=EX.filter(e=>e.freq==='month').length,nO=EX.filter(e=>e.freq==='once').length;
  metas[0].innerHTML=OV.house!=null?`${mine}Your number · ${usd(OV.house)} a month`:`${est}<span id="r-house-meta">Our estimate · ${12*Y} months</span>`;
  metas[1].innerHTML=(OV.live!=null?`${mine}Your number · ${usd(OV.live)} a month`:`${off}Government data`)+(nM?` · +${nM} of yours`:'');
  metas[2].innerHTML=(OV.one!=null?`${mine}Your number`:`${off}Visa, deposits, flights`)+(nO?` · +${nO} of yours`:'');
  metas[3].innerHTML=OV.move!=null?`${mine}Your number`:`${est}Our estimate · bank fees`;
  if(!Q){res.forEach(s=>s.classList.add('pre'));void document.body.offsetWidth;res.forEach(s=>s.classList.remove('pre'));}
  const R=document.getElementById('results');
  const cards=[...R.querySelectorAll('.land')];const draws=[...R.querySelectorAll('.draw')];
  const D=RM?0:1;
  const set=(el,delay,dur)=>{el.style.animationDelay=(delay*D)+'ms';if(dur)el.style.animationDuration=dur+'ms'};
  if(!Q){set(cards[0],100);set(draws[0],600,900);[1,2,3,4].forEach((i,k)=>set(cards[i],1300+k*180));set(draws[1],2300,800);set(cards[5],3000);
  count($('r-tui'),c.tui,'full',150*D,700);
  [['house',1350],['live',1530],['one',1710],['move',1890]].forEach(([k,d],i)=>{count($('r-'+k),c[k],'full',d*D,700);const card=cards[i+1];if(card)pop(card.lastElementChild,(d+700)*D)});
  count($('r-total'),tot,'big',3050*D,900);pop($('r-hidden'),3950*D);}else{$('r-tui').textContent=fmt(c.tui,'full');['house','live','one','move'].forEach(k=>$('r-'+k).textContent=fmt(c[k],'full'));$('r-total').textContent=fmt(tot,'big');}
  $('r-total-sub').textContent=CUR==='INR'?fmt(tot,'full')+' · '+usd(tot):'About '+usd(tot/Y)+' a year';
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
  if(CUR==='INR'&&window.fanCalc&&window.FXV){fxSec.querySelectorAll(':scope > div').forEach(x=>x.classList.remove('fxhide'));const nn=fxSec.querySelector('.fx-none');if(nn)nn.remove();
    const F=window.fanCalc(window.FXV,K.o);drawFan(F,Y,!Q);
    lo=F.lo/RATE.INR;hi=F.hi/RATE.INR;buf=F.buf/RATE.INR;
    const loT=fmt(lo,'big'),hiT=fmt(hi,'big');$('fx-lo').textContent=(loT.endsWith('crore')&&hiT.endsWith('crore'))?loT.replace(' crore',''):loT;$('fx-hi').textContent=hiT;
    $('r-buf').textContent=fmt(buf,'big');$('fx-len').textContent=Y+'-year';$('fx-n').textContent=F.n;
  }else{fxSec.querySelectorAll(':scope > div:not(:first-child)').forEach(x=>x.classList.add('fxhide'));if(!fxSec.querySelector('.fx-none')){const n=document.createElement('p');n.className='fx-none';n.style.cssText='margin:0;font-size:18px;color:#4A4B63';n.textContent=`Rate history for ${cc} isn’t connected in this prototype yet. In the live site, this shows how ${cc} has moved against the dollar, and how much to set aside.`;fxSec.appendChild(n)}}
  $('save-country').textContent=$('from').value.trim()||'your country';
  fitAll();setTimeout(fitAll,2700*D+60);
  window.TP={T,Y,c,tot,CUR,cc,lo,hi,buf,sem,n,from:$('from').value.trim()||'—',school:$('school').value.trim(),fmt,usd};document.dispatchEvent(new Event('tp-update'));
  if(Q){fitAll();return}
  // later sections reveal on scroll
  const later=res.filter(x=>!['results','where'].includes(x.id));later.forEach(x=>x.classList.remove('fade','seen'));
  const blocks=[];later.forEach(x=>[...x.children].forEach(ch=>{if(ch.querySelector('.tile,.deal'))return;ch.classList.remove('seen');ch.classList.add('fade');blocks.push(ch)}));
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('seen');io.unobserve(e.target)}}),{threshold:0,rootMargin:'0px 0px -20% 0px'});
  blocks.forEach(b=>io.observe(b));
  const items=[...document.querySelectorAll('#save .tile,#deals .deal')];items.forEach(c=>{c.classList.remove('seen');c.classList.add('pre')});
  const ioc=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.remove('pre');e.target.classList.add('seen');ioc.unobserve(e.target)}}),{threshold:.3,rootMargin:'0px 0px -10% 0px'});
  items.forEach(c=>ioc.observe(c));
  const iob=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){bs.classList.remove('paused');iob.unobserve(e.target)}}),{threshold:.3});iob.observe(bs);
  const fc=$('fx-fan');if(fc&&window.fxDraw){const io2=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){setTimeout(()=>window.fxDraw.play(),300);io2.unobserve(e.target)}}),{threshold:.4});io2.observe(fc)}
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
// "Make this number more accurate": disclosure, rent override, summary label
(function(){const t=$('refine-toggle'),p=$('refine-panel');if(!t||!p)return;const label=t.querySelector('.rl-text'),dot=t.querySelector('.rl-dot');
 const setOpen=o=>{t.setAttribute('aria-expanded',o);p.classList.toggle('open',o);if(o)setTimeout(()=>{const f=p.querySelector('input');if(f)f.focus({preventScroll:true})},RM?0:350)};
 t.addEventListener('click',()=>setOpen(t.getAttribute('aria-expanded')!=='true'));
 const relabel=()=>{const parts=[];if(OV.house!=null)parts.push('rent '+usd(OV.house)+' a month');if(EX.length)parts.push(EX.length+(EX.length>1?' costs added':' cost added'));const changed=parts.length>0;label.textContent=changed?'Your numbers: '+parts.join(', ')+'. Edit':'Make this number more accurate';dot.className='rl-dot'+(changed?' mine':'')};
 const rf=$('rent-form'),ri=rf.querySelector('input'),reset=$('rent-reset');
 ri.addEventListener('blur',()=>{const v=parseInt(ri.value.replace(/[^0-9]/g,''));ri.value=v?'$'+v.toLocaleString('en-US'):''});
 rf.addEventListener('submit',e=>{e.preventDefault();const v=parseInt(ri.value.replace(/[^0-9]/g,''));if(!v){ri.focus();return}OV.house=v;reset.hidden=false;update();relabel()});
 reset.addEventListener('click',()=>{OV.house=null;ri.value='';reset.hidden=true;update();relabel();ri.focus()});
 document.addEventListener('tp-update',relabel);
})();
// bubbles <-> list
(function(){const b=$('where-toggle');if(!b)return;const growBars=()=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const st=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--stagger-sm'))||60;document.querySelectorAll('#where-list .wl-bar').forEach((bar,i)=>{const w=bar.style.width;bar.style.transition='none';bar.style.width='0%';void bar.offsetWidth;bar.style.transition='width var(--dur-md) var(--ease-in-out) '+(i*st)+'ms';bar.addEventListener('transitionend',()=>{bar.style.transition=''},{once:true});bar.style.width=w})};b.addEventListener('click',()=>{const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);b.textContent=on?'See as bubbles':'See as chart';$('r-bubbles').style.display=on?'none':'';$('where-list').style.display=on?'block':'none';if(on)growBars()})})();
// fan chart: draw left to right, with hover
let FAN=null;window.addEventListener('resize',()=>{clearTimeout(FAN&&FAN.t);if(FAN)FAN.t=setTimeout(()=>{const w=$('fx-fan').clientWidth;if((w<560)!==(FAN.w<560)||(w<560&&Math.abs(w-FAN.w)>8))drawFan(FAN.F,FAN.Y,false)},200)});
function drawFan(F,Y,anim){const box=$('fx-fan');const bw=box.clientWidth||780;FAN={F,Y,w:bw};box.innerHTML=window.fanSVG(F,Y,{anim:anim&&!RM,W:bw});const svg=box.querySelector('svg');const M=JSON.parse(svg.querySelector('metadata').textContent);
  const X=m=>M.L+M.pw*(m+1)/M.H,Yy=v=>M.T+M.ph*(1-v/M.top);
  const r=svg.querySelector('#fanclip-r'),head=svg.querySelector('#fan-head');let raf,played=!anim||RM;
  window.fxDraw={reset(){},play(){if(played)return;played=true;const t0=performance.now(),dur=2400;head.style.display='';
    const step=t=>{const k=Math.min(1,(t-t0)/dur);const e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;const fm=e*(M.H-1);const m0=Math.floor(fm),fr=fm-m0;const m1=Math.min(M.H-1,m0+1);
      const x=M.L+(X(M.H-1)-M.L)*e;const v=(m0===0&&fm<1)?F.today[0]*fm:F.today[m0]+(F.today[m1]-F.today[m0])*fr;
      r.setAttribute('width',x+2);head.setAttribute('cx',x);head.setAttribute('cy',Yy(v));
      if(k<1)raf=requestAnimationFrame(step);else{head.style.display='none';r.setAttribute('width',M.W)}};raf=requestAnimationFrame(step)}};
}
document.getElementById('calc').addEventListener('submit',e=>{e.preventDefault();run()});
const runExample=e=>{e&&e.preventDefault();$('from').value='India';$('cur').textContent='INR ₹';tu.value='$37,500';yrs.value=2;run(true)};$('example').addEventListener('click',runExample);document.querySelectorAll('.see-example').forEach(a=>a.addEventListener('click',runExample));
($('cta')||{addEventListener(){}}).addEventListener('click',e=>{e.preventDefault();window.scrollTo({top:0,behavior:RM?'auto':'smooth'});setTimeout(()=>tu.focus({preventScroll:true}),400)});
})();
