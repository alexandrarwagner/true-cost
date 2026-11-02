window.FXV=null;const FX=[["2014-01", 62.1057], ["2014-02", 62.1642], ["2014-03", 60.9476], ["2014-04", 60.3464], ["2014-05", 59.2843], ["2014-06", 59.7367], ["2014-07", 60.0956], ["2014-08", 60.8738], ["2014-09", 60.8976], ["2014-10", 61.3668], ["2014-11", 61.6828], ["2014-12", 62.7071], ["2015-01", 62.13], ["2015-02", 61.9905], ["2015-03", 62.4805], ["2015-04", 62.6414], ["2015-05", 63.715], ["2015-06", 63.7809], ["2015-07", 63.6045], ["2015-08", 65.0971], ["2015-09", 66.1667], ["2015-10", 65.0262], ["2015-11", 66.1], ["2015-12", 66.5023], ["2016-01", 67.3332], ["2016-02", 68.2395], ["2016-03", 66.8909], ["2016-04", 66.4219], ["2016-05", 66.8895], ["2016-06", 67.2655], ["2016-07", 67.158], ["2016-08", 66.9035], ["2016-09", 66.7138], ["2016-10", 66.7415], ["2016-11", 67.6395], ["2016-12", 67.8052], ["2017-01", 68.0474], ["2017-02", 66.9726], ["2017-03", 65.8009], ["2017-04", 64.536], ["2017-05", 64.4195], ["2017-06", 64.4482], ["2017-07", 64.424], ["2017-08", 63.9683], ["2017-09", 64.4775], ["2017-10", 65.0357], ["2017-11", 64.8435], ["2017-12", 64.2445], ["2018-01", 63.6452], ["2018-02", 64.43], ["2018-03", 65.0455], ["2018-04", 65.6729], ["2018-05", 67.51], ["2018-06", 67.79], ["2018-07", 68.6867], ["2018-08", 69.6317], ["2018-09", 72.2779], ["2018-10", 73.5609], ["2018-11", 71.738], ["2018-12", 70.8331], ["2019-01", 70.71], ["2019-02", 71.1739], ["2019-03", 69.4895], ["2019-04", 69.4068], ["2019-05", 69.7827], ["2019-06", 69.388], ["2019-07", 68.7391], ["2019-08", 71.1891], ["2019-09", 71.311], ["2019-10", 71.0086], ["2019-11", 71.4942], ["2019-12", 71.1567], ["2020-01", 71.279], ["2020-02", 71.5295], ["2020-03", 74.5482], ["2020-04", 76.1682], ["2020-05", 75.6575], ["2020-06", 75.7077], ["2020-07", 74.9286], ["2020-08", 74.5657], ["2020-09", 73.5233], ["2020-10", 73.5648], ["2020-11", 74.2311], ["2020-12", 73.6195], ["2021-01", 73.1106], ["2021-02", 72.8053], ["2021-03", 72.8196], ["2021-04", 74.5186], ["2021-05", 73.2065], ["2021-06", 73.5782], ["2021-07", 74.539], ["2021-08", 74.1155], ["2021-09", 73.6357], ["2021-10", 74.92], ["2021-11", 74.477], ["2021-12", 75.3948], ["2022-01", 74.4075], ["2022-02", 74.9695], ["2022-03", 76.1896], ["2022-04", 76.1719], ["2022-05", 77.2933], ["2022-06", 78.09], ["2022-07", 79.5915], ["2022-08", 79.5065], ["2022-09", 80.2538], ["2022-10", 82.2915], ["2022-11", 81.6805], ["2022-12", 82.4738], ["2023-01", 81.741], ["2023-02", 82.5995], ["2023-03", 82.2665], ["2023-04", 81.9685], ["2023-05", 82.2977], ["2023-06", 82.2252], ["2023-07", 82.1565], ["2023-08", 82.8122], ["2023-09", 83.07], ["2023-10", 83.2162], ["2023-11", 83.266], ["2023-12", 83.254], ["2024-01", 83.1119], ["2024-02", 82.9485], ["2024-03", 83.0214], ["2024-04", 83.3968], ["2024-05", 83.3873], ["2024-06", 83.46], ["2024-07", 83.5895], ["2024-08", 83.8855], ["2024-09", 83.791], ["2024-10", 84.005], ["2024-11", 84.3326], ["2024-12", 84.9686], ["2025-01", 86.2652], ["2025-02", 87.0637], ["2025-03", 86.5214], ["2025-04", 85.5768], ["2025-05", 85.2462], ["2025-06", 85.8765], ["2025-07", 86.1714], ["2025-08", 87.5695], ["2025-09", 88.3214], ["2025-10", 88.3691], ["2025-11", 88.8444], ["2025-12", 90.035], ["2026-01", 90.9025], ["2026-02", 90.7458], ["2026-03", 92.8182], ["2026-04", 93.4805], ["2026-05", 95.5335], ["2026-06", 94.96], ["2026-07", 95.8573], ["2026-08", 95.4443], ["2026-09", 95.5124]];

window.FXV=FX.map(x=>x[1]);
(function(){
const MUT='#4A4B63';
// stats: numpy-style linear percentile
function pct(a,q){const s=[...a].sort((x,y)=>x-y);const i=(s.length-1)*q;const lo=Math.floor(i),hi=Math.ceil(i);return s[lo]+(s[hi]-s[lo])*(i-lo)}
window.FXS=h=>{const v=FX.map(x=>x[1]);const ch=[];for(let i=0;i+h<v.length;i++)ch.push(v[i+h]/v[i]-1);if(ch.length<12)return null;return{p10:pct(ch,.1),p90:pct(ch,.9),max:Math.max(...ch),n:ch.length}};
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const lab=k=>MON[+k.slice(5)-1]+' '+k.slice(0,4);
// chart hover (matches the SVG geometry)
const svg=document.getElementById('fx-chart');
if(svg){const W=1120,L=48,R=20,T=20,B=34,H=300,pw=W-L-R,ph=H-T-B,y0=55,y1=100,N=FX.length;
 const X=i=>L+pw*i/(N-1),Y=r=>T+ph*(1-(r-y0)/(y1-y0));
 const ns='http://www.w3.org/2000/svg';const g=document.createElementNS(ns,'g');g.style.display='none';
 g.innerHTML=`<line y1="${T}" y2="${T+ph}" stroke="#14151F" stroke-width="1" stroke-dasharray="3 3"/><circle r="6" fill="#6B70E6" stroke="#fff" stroke-width="2"/>`;svg.appendChild(g);
 const hit=document.createElementNS(ns,'rect');hit.setAttribute('x',L);hit.setAttribute('y',T);hit.setAttribute('width',pw);hit.setAttribute('height',ph);hit.setAttribute('fill','transparent');svg.appendChild(hit);
 const tip=document.createElement('div');tip.style.cssText='position:absolute;pointer-events:none;background:#14151F;color:#fff;border-radius:12px;padding:8px 12px;font-size:14px;line-height:1.35;white-space:nowrap;display:none;transform:translate(-50%,-110%)';
 const wrap=document.getElementById('fx-wrap');wrap.appendChild(tip);
 const show=i=>{i=Math.max(0,Math.min(N-1,i));const x=X(i),y=Y(FX[i][1]);g.style.display='';g.firstChild.setAttribute('x1',x);g.firstChild.setAttribute('x2',x);g.lastChild.setAttribute('cx',x);g.lastChild.setAttribute('cy',y);
  const sc=svg.getBoundingClientRect().width/W;tip.style.display='block';tip.style.left=(x*sc)+'px';tip.style.top=(y*sc-8)+'px';
  const prev=i>=24?` · <span style="color:#C4C6CE">${((FX[i][1]/FX[i-24][1]-1)*100).toFixed(1)}% vs 2 years before</span>`:'';
  tip.innerHTML=`<b>₹${FX[i][1].toFixed(2)}</b> per dollar · ${lab(FX[i][0])}${prev}`};
 hit.addEventListener('mousemove',e=>{const r=svg.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*W;show(Math.round((x-L)/pw*(N-1)))});
 hit.addEventListener('mouseleave',()=>{g.style.display='none';tip.style.display='none'});
 svg.setAttribute('tabindex','0');let ki=N-1;svg.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){ki=Math.max(0,ki-1);show(ki);e.preventDefault()}if(e.key==='ArrowRight'){ki=Math.min(N-1,ki+1);show(ki);e.preventDefault()}});
 svg.addEventListener('focus',()=>show(ki));svg.addEventListener('blur',()=>{g.style.display='none';tip.style.display='none'});
 // table view
 const btn=document.getElementById('fx-table-btn');let tbl=null;
 btn.onclick=()=>{if(tbl){tbl.remove();tbl=null;btn.textContent='Show as a table';svg.style.display='block';return}
  const years={};FX.forEach(([k,v])=>{(years[k.slice(0,4)]=years[k.slice(0,4)]||[]).push(v)});
  tbl=document.createElement('div');tbl.style.cssText='max-height:300px;overflow:auto';
  tbl.innerHTML='<table style="width:100%;border-collapse:collapse;font-size:15px"><thead><tr style="text-align:left;color:'+MUT+'"><th style="padding:8px 0">Year</th><th style="text-align:right">Average</th><th style="text-align:right">Lowest month</th><th style="text-align:right">Highest month</th></tr></thead><tbody>'+Object.entries(years).map(([y,a])=>`<tr><td style="padding:8px 0;border-top:1px solid #E4E5EA">${y}${a.length<12?' (to '+MON[a.length-1]+')':''}</td><td class="num" style="text-align:right;border-top:1px solid #E4E5EA">₹${(a.reduce((s,x)=>s+x,0)/a.length).toFixed(2)}</td><td class="num" style="text-align:right;border-top:1px solid #E4E5EA">₹${Math.min(...a).toFixed(2)}</td><td class="num" style="text-align:right;border-top:1px solid #E4E5EA">₹${Math.max(...a).toFixed(2)}</td></tr>`).join('')+'</tbody></table>';
  svg.style.display='none';wrap.appendChild(tbl);btn.textContent='Show as a chart'};
}
// bubble hover: grow only (handled in CSS)
})();

// chart draws left to right
(function(){
const svg=document.getElementById('fx-chart');if(!svg)return;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const ns='http://www.w3.org/2000/svg';
const defs=document.createElementNS(ns,'defs');defs.innerHTML='<clipPath id="fx-clip"><rect x="0" y="0" width="0" height="300"/></clipPath>';svg.prepend(defs);
const rect=defs.querySelector('rect');
const g=document.createElementNS(ns,'g');g.setAttribute('clip-path','url(#fx-clip)');
// everything after the axis labels: band, area, line, end markers
const kids=[...svg.children].filter(el=>['rect','polygon','polyline','circle'].includes(el.tagName)||(el.tagName==='text'&&el.getAttribute('font-size')==='13')||(el.tagName==='text'&&el.getAttribute('font-weight')==='600')||(el.tagName==='text'&&/Apr 2018/.test(el.textContent)));
kids.forEach(k=>g.appendChild(k));
svg.insertBefore(g,svg.querySelector('g')||null);
const head=document.createElementNS(ns,'circle');head.setAttribute('r','6');head.setAttribute('fill','#6B70E6');head.setAttribute('stroke','#fff');head.setAttribute('stroke-width','2');head.style.display='none';svg.appendChild(head);
const line=g.querySelector('polyline');const pts=line.getAttribute('points').trim().split(/\s+/).map(p=>p.split(',').map(Number));
const yAt=x=>{for(let i=1;i<pts.length;i++)if(pts[i][0]>=x){const [x0,y0]=pts[i-1],[x1,y1]=pts[i];return y0+(y1-y0)*((x-x0)/(x1-x0||1))}return pts[pts.length-1][1]};
let raf=null,played=false;
window.fxDraw={reset(){cancelAnimationFrame(raf);played=false;rect.setAttribute('width',RM?1120:0);head.style.display='none'},
 play(){if(played)return;played=true;if(RM){rect.setAttribute('width',1120);return}
  const x0=pts[0][0],x1=1120,dur=2600,t0=performance.now();head.style.display='';
  const step=t=>{const k=Math.min(1,(t-t0)/dur);const e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;const x=x0+(pts[pts.length-1][0]-x0)*e;
   rect.setAttribute('width',x+(k>=1?40:2));head.setAttribute('cx',x);head.setAttribute('cy',yAt(x));
   if(k<1)raf=requestAnimationFrame(step);else{head.style.display='none';rect.setAttribute('width',x1)}};
  raf=requestAnimationFrame(step)}};
window.fxDraw.reset();
})();
// one nav: pre state before Show me, results links after
(function(){
const nav=document.getElementById('topnav');if(!nav)return;
const st=document.createElement('style');st.textContent='main section[id]{scroll-margin-top:40px}body:not(.has-res) #empty{display:block!important}body.has-res #topnav .nav-pre{display:none!important}body.has-res #topnav .nav-post{display:contents!important}#topnav .nav-post a[data-sec]{color:var(--ink);transition:color var(--dur-sm) var(--ease-out)}#topnav .nav-post a[aria-current=true]{background:transparent!important;color:#fff!important}#topnav .nav-post a[data-sec]:not([aria-current=true]){background:transparent!important;color:var(--ink)!important}';document.head.appendChild(st);
const RM=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const links=[...nav.querySelectorAll('.nav-post a[data-sec]')];
links.forEach(a=>a.addEventListener('focus',()=>{const sc=a.parentElement;if(!sc)return;const l=a.offsetLeft-sc.offsetLeft;if(l<sc.scrollLeft||l+a.offsetWidth>sc.scrollLeft+sc.clientWidth)sc.scrollTo({left:Math.max(0,l-16),behavior:'auto'})}));
const wrap=nav.querySelector('.nav-post [role=navigation]');const pill=document.createElement('span');pill.className='nav-pill';pill.setAttribute('aria-hidden','true');if(wrap){wrap.style.position='relative';wrap.prepend(pill)}
let pillReady=false;const movePill=instant=>{if(!wrap)return;const a=links.find(x=>x.getAttribute('aria-current')==='true');if(!a||!a.offsetWidth){pill.style.opacity='0';pillReady=false;return}const jump=instant||!pillReady;if(jump)pill.style.transition='none';pill.style.transform='translateX('+a.offsetLeft+'px)';pill.style.width=a.offsetWidth+'px';pill.style.opacity='1';if(jump){void pill.offsetWidth;pill.style.transition='';pillReady=true}};
if(wrap&&'ResizeObserver' in window)new ResizeObserver(()=>movePill(true)).observe(wrap);
const set=id=>{links.forEach(a=>{if(a.dataset.sec===id){a.setAttribute('aria-current','true');const sc=a.parentElement;if(sc&&sc.scrollWidth>sc.clientWidth+2){const l=a.offsetLeft-sc.offsetLeft;sc.scrollTo({left:Math.max(0,l-(sc.clientWidth-a.offsetWidth)/2),behavior:'smooth'})}}else a.removeAttribute('aria-current')});movePill()};
links.forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.getElementById(a.dataset.sec).scrollIntoView({behavior:RM()?'auto':'smooth',block:'start'});set(a.dataset.sec)}));
const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting)set(e.target.id)})},{rootMargin:'-90px 0px -60% 0px'});
links.forEach(a=>io.observe(document.getElementById(a.dataset.sec)));set('results');
document.querySelectorAll('.to-form').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();window.scrollTo({top:0,behavior:RM()?'auto':'smooth'});setTimeout(()=>document.getElementById(document.body.classList.contains('has-res')?'tuition':'from').focus({preventScroll:true}),500)}));
})();

// deal filters
(function(){
const chips=[...document.querySelectorAll('.dchip')];const cards=[...document.querySelectorAll('#deals .deal')];
chips.forEach(ch=>ch.addEventListener('click',()=>{const c=ch.dataset.cat;
 chips.forEach(x=>{const on=x===ch;x.setAttribute('aria-pressed',on);x.style.background=on?'var(--dark)':'#FFFFFF';x.style.color=on?'#FFFFFF':'var(--ink)';x.style.borderColor=on?'var(--dark)':'#DCDDE3'});
 cards.forEach(k=>{k.style.display=(c==='All'||k.dataset.cat===c)?'':'none';k.classList.remove('pre');k.classList.add('seen')})}));
})();

// money plan checklist
(function(){const cbs=[...document.querySelectorAll('.tip-cb')];const out=document.getElementById('tip-count');if(!out)return;
const upd=()=>{out.textContent=cbs.filter(c=>c.checked).length+' of '+cbs.length;window.TIPS_PICKED=cbs.filter(c=>c.checked).map(c=>c.dataset.tip);document.dispatchEvent(new Event('tp-update'))};cbs.forEach(c=>c.addEventListener('change',upd));upd()})();
