(function(){
const MUT='#4A4B63';
const css=getComputedStyle(document.documentElement);
const V=n=>css.getPropertyValue(n).trim();
function sheet(){
  const t=window.TP;if(!t)return '';
  const {c,tot,fmt,usd,Y,T}=t;const inr=t.CUR!=='USD'; // any home currency, not only rupees
  const cols=[['Tuition',c.tui,'var(--tui)','Your school (offer letter, Form I-20)'],['Housing',c.house,'#C9CBFA','HUD Fair Market Rents · our estimate'],['Living costs',c.live,'#DDFF7A','BLS Consumer Expenditure Survey'],['One-off costs',c.one,'var(--one)','travel.state.gov, fmjfee.com · flights our estimate'],['Moving money',c.move,'var(--move)','Bank and transfer fees · our estimate']];
  const date=new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  const row=(n,v,col,src)=>`<tr><td style="padding:11px 0;border-top:1px solid #E4E5EA"><span style="display:inline-block;width:11px;height:11px;border-radius:3px;background:${col};margin-right:9px;vertical-align:-1px"></span>${n}</td>${inr?`<td class="num" style="padding:11px 0;border-top:1px solid #E4E5EA;text-align:right;font-weight:600">${fmt(v,'full')}</td>`:''}<td class="num" style="padding:11px 0 11px 18px;border-top:1px solid #E4E5EA;text-align:right;${inr?'color:'+MUT:'font-weight:600'}">${usd(v)}</td><td style="padding:11px 0 11px 22px;border-top:1px solid #E4E5EA;font-size:12px;color:${MUT}">${src}</td></tr>`;
  return `<div class="pdf-sheet" style="width:794px;height:1123px;box-sizing:border-box;padding:56px 60px 44px;background:#fff;color:#14151F;font-family:Archivo,system-ui,sans-serif;display:flex;flex-direction:column;gap:18px">
<div style="display:flex;justify-content:space-between;align-items:flex-start"><span class="d" style="font-size:28px;display:flex;align-items:flex-start;line-height:1">tuition<span style="font-size:.62em;font-weight:600;color:var(--tui)">+</span></span><span style="font-size:13px;color:${MUT};text-align:right">Made on ${date}<br>Tuition+ · free, not a prediction</span></div>
<div style="margin-top:14px"><div class="d" style="font-size:34px;line-height:1.05">The full cost of the US degree</div><div style="margin-top:8px;font-size:15px;color:${MUT}">From ${t.from} · ${t.school||'School not chosen'} · ${Y} year${Y>1?'s':''} · tuition ${usd(T)} a year</div></div>
<div style="border-radius:20px;background:var(--dark);color:#fff;padding:26px 30px;display:flex;justify-content:space-between;align-items:flex-end;gap:20px">
<div><div style="font-size:14px;color:#C4C6CE">All in, about</div><div class="num d" style="font-size:58px;line-height:1;color:#DDFF7A;margin-top:6px">${fmt(tot,'big')}</div><div class="num" style="font-size:14px;color:#C4C6CE;margin-top:8px">${inr?fmt(tot,'full')+' · '+usd(tot)+' · at '+t.sym+(t.rate||0).toLocaleString('en',{maximumFractionDigits:2})+' to the dollar':'Shown in US dollars'}</div></div>
<div style="text-align:right"><div style="display:inline-block;padding:8px 14px;border-radius:16px;background:#C9CBFA;color:#14151F;font-size:14px;font-weight:600">Hidden costs: ${Math.round((tot-c.tui)/c.tui*100)}% on top of tuition</div></div></div>
<div style="display:flex;height:14px;gap:3px">${cols.map(([n,v,col])=>`<span style="flex:${v};border-radius:7px;background:${col}"></span>`).join('')}</div>
<table style="width:100%;border-collapse:collapse;font-size:15px"><thead><tr style="font-size:12px;color:${MUT};text-align:left"><th style="font-weight:600;padding-bottom:8px">Cost</th>${inr?`<th style="font-weight:600;text-align:right">${t.CUR==='INR'?'Rupees':t.CUR}</th>`:''}<th style="font-weight:600;text-align:right">Dollars</th><th style="font-weight:600;padding-left:22px">Source</th></tr></thead><tbody>${cols.map(x=>row(...x)).join('')}<tr><td style="padding:12px 0;border-top:2px solid #14151F;font-weight:600">Total</td>${inr?`<td class="num" style="padding:12px 0;border-top:2px solid #14151F;text-align:right;font-weight:700">${fmt(tot,'full')}</td>`:''}<td class="num" style="padding:12px 0 12px 18px;border-top:2px solid #14151F;text-align:right;font-weight:${inr?400:700}">${usd(tot)}</td><td style="border-top:2px solid #14151F"></td></tr></tbody></table>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
<div style="border-radius:16px;background:#F2F3F5;padding:18px 20px;font-size:14px;line-height:1.5"><div style="font-weight:600;margin-bottom:8px">When you’ll pay</div>
<div style="display:flex;justify-content:space-between"><span>Before you leave</span><span class="num">${fmt(c.one,'full')}</span></div>
<div style="display:flex;justify-content:space-between"><span>Arrival: deposit and first month</span><span class="num">${fmt(3000,'full')}</span></div>
<div style="display:flex;justify-content:space-between"><span>Each semester, ${t.n} times</span><span class="num">${fmt(t.sem,'full')}</span></div>
<div style="color:${MUT};margin-top:4px">Rent keeps running in the summer on most leases.</div></div>
<div style="border-radius:16px;background:#F2F3F5;padding:18px 20px;font-size:14px;line-height:1.5"><div style="font-weight:600;margin-bottom:8px">Buffer for the exchange rate</div>
${t.lo?`<div>In 8 of 10 past periods it would have cost between <b class="num">${fmt(t.lo,'big')}</b> and <b class="num">${fmt(t.hi,'big')}</b>. Keeping about <b class="num">${fmt(t.buf,'big')}</b> aside would have covered 9 in 10.</div><div style="color:${MUT};margin-top:4px">Not a prediction. Replays past rate moves since 2014 on your payments (Federal Reserve, FRED).</div>`:`<div style="color:${MUT}">Rate history for this currency isn’t connected in this prototype yet.</div>`}</div></div>
${(window.TIPS_PICKED||[]).length?`<div style="border-radius:16px;border:1.5px dashed #CFD0D8;padding:14px 18px;font-size:14px;line-height:1.5"><b>Our money plan:</b> ${window.TIPS_PICKED.join(' · ')}</div>`:''}
<div style="margin-top:auto;padding-top:14px;border-top:1px solid #E4E5EA;font-size:11.5px;line-height:1.55;color:${MUT}"><b style="color:#14151F">Sources.</b> Tuition: your school. Housing: US Department of Housing and Urban Development, Fair Market Rents. Living costs: US Bureau of Labor Statistics, Consumer Expenditure Survey. Visa and SEVIS fees: travel.state.gov and fmjfee.com. Past exchange rates: Federal Reserve H.10 series.<br><b style="color:#14151F">Prototype.</b> Housing, living, one-off and moving-money figures here are samples based on Boston prices, not live data.</div>
</div>`}
// thumbnail in share section = the real sheet, scaled
const card=document.querySelector('#share [aria-hidden=true] > div');
function thumb(){if(!window.TP||!card)return;card.style.padding='0';card.style.overflow='hidden';card.innerHTML=`<div style="transform:scale(${380/794});transform-origin:0 0">${sheet()}</div>`;card.style.height=Math.round(1123*380/794)+'px'}
document.addEventListener('tp-update',thumb);
// host for print / pdf
const host=document.createElement('div');host.id='pdf-host';document.body.appendChild(host);
const st=document.createElement('style');st.textContent='#pdf-host{position:fixed;left:0;top:0;z-index:-1;opacity:0;pointer-events:none}#pdf-host.cap{opacity:1}@media print{@page{size:A4;margin:0}body *{visibility:hidden!important}#pdf-host,#pdf-host *{visibility:visible!important}#pdf-host{position:absolute;left:0;top:0}.pdf-sheet{zoom:0.98}}';document.head.appendChild(st);
const pb=document.getElementById('pdf-btn'),pr=document.getElementById('print-btn');
pr.onclick=()=>{host.innerHTML=sheet();setTimeout(()=>window.print(),50)};
// html2pdf (about 900 KB) loads only when the button is pressed, from this site; a script a
// nonced script inserts is trusted by the policy. If it cannot load, the print view opens.
const loadPdf=()=>window.html2pdf?Promise.resolve():new Promise((res,rej)=>{const sc=document.createElement('script');sc.src='/vendor/html2pdf.bundle.min.js';sc.onload=res;sc.onerror=rej;document.head.appendChild(sc)});
pb.onclick=async()=>{host.innerHTML=sheet();const lbl=pb.innerHTML;
  pb.setAttribute('aria-busy','true');pb.lastChild.textContent='Making your PDF…';
  try{await loadPdf()}catch(e){pb.removeAttribute('aria-busy');pb.innerHTML=lbl;pr.onclick();return}
  host.classList.add('cap');
  try{await html2pdf().set({margin:0,filename:'tuition-plus-full-cost.pdf',image:{type:'jpeg',quality:0.96},html2canvas:{scale:2,backgroundColor:'#ffffff',scrollX:0,scrollY:0},jsPDF:{unit:'px',format:[794,1123],orientation:'portrait',hotfixes:['px_scaling']}}).from(host.firstElementChild).save()}
  catch(e){console.error(e);pr.onclick()}
  host.classList.remove('cap');pb.removeAttribute('aria-busy');pb.innerHTML=lbl};
})();
