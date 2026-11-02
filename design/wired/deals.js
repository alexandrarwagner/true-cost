// Student deals, from this site's approved data (change 6). The prototype's Boston cards and
// its "general tips" are gone; the cards keep the page's own markup, icon tile, figure, title,
// text and source line. Renders after each estimate (the tp-update event) for the chosen
// school, its city and the national list; the chips filter by category as before.
(function(){
const $=id=>document.getElementById(id);
const grid=$('deals'),chips=$('deal-chips'),checked=$('deals-checked');if(!grid||!chips)return;
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const monthYear=iso=>MON[+iso.slice(5,7)-1]+' '+iso.slice(0,4);
const LABEL={transport:'Getting around',fitness:'Fitness',culture:'Museums and culture',software:'Software',subscriptions:'Subscriptions',phone:'Phone',food:'Food and coffee',other:'Other'};
const TILE={transport:['#9FEADA','<circle cx="7" cy="16" r="3.5" stroke="#14151F" stroke-width="2"/><circle cx="17" cy="16" r="3.5" stroke="#14151F" stroke-width="2"/><path d="M7 16L10 9H14L17 16M12 9V6H15" stroke="#14151F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'],
 fitness:['#DDFF7A','<path d="M4 9V15M7 7V17M17 7V17M20 9V15M7 12H17" stroke="#14151F" stroke-width="2" stroke-linecap="round"/>'],
 culture:['#C9CBFA','<path d="M4 9L12 4L20 9M6 10V17M10 10V17M14 10V17M18 10V17M4 19H20" stroke="#14151F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'],
 subscriptions:['#F7B9EE','<path d="M9 17V6L19 4V15" stroke="#14151F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="17" r="2.5" stroke="#14151F" stroke-width="2"/><circle cx="17" cy="15" r="2.5" stroke="#14151F" stroke-width="2"/>'],
 food:['#DDFF7A','<path d="M5 9H17V13A5 5 0 0 1 12 18H10A5 5 0 0 1 5 13V9ZM17 10H19A2 2 0 0 1 19 14H17M6 20H16" stroke="#14151F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'],
 other:['#F2F3F5','<path d="M4 12L12 4H20V12L12 20L4 12Z" stroke="#14151F" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="8" r="1.5" fill="#14151F"/>']};
const tile=cat=>{const [bg,svg]=TILE[cat]||TILE.other;return `<span style="width: 36px; height: 36px; border-radius: 11px; background: ${bg}; display: flex; align-items: center; justify-content: center; flex: none"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">${svg}</svg></span>`};
const money=m=>'$'+(m.amount/100).toLocaleString('en-US',{maximumFractionDigits:m.amount%100?2:0});
const PERIOD={month:'a month',year:'a year',once:'once'};
function headline(d){const t=window.TP;
  if(d.savingUsd!=null&&t&&t.fmt)return t.fmt(d.savingUsd/100,'full');
  if(d.studentPrice&&d.studentPrice.amount===0)return 'Free';
  if(d.studentPrice)return money(d.studentPrice)+(d.period?' '+(PERIOD[d.period]||''):'');
  return 'Student deal'}
function sub(d){if(d.savingUsd!=null)return 'could save about '+headline(d)+' over your degree';
  if(d.studentPrice&&d.regularPrice)return money(d.studentPrice)+' instead of '+money(d.regularPrice)+(d.period?' '+(PERIOD[d.period]||''):'');
  return 'The source doesn’t list a regular price, so we don’t show a figure.'}
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch{return 'source'}};
function card(d){return `<article class="deal" data-cat="${esc(LABEL[d.category]||LABEL.other)}" style="border-radius: 24px; background: #FFFFFF; padding: 26px 26px 28px; display: flex; flex-direction: column; gap: 10px">
<span style="display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 600; color: #4A4B63">${tile(d.category)}${esc(LABEL[d.category]||LABEL.other)}</span>
<span class="d" style="margin-top: 10px; font-size: 32px; line-height: 1">${esc(headline(d))}</span>
<span style="font-size: 17px; font-weight: 600; line-height: 1.3">${esc(d.title)}</span>
<span style="font-size: 14px; line-height: 1.5; color: #4A4B63">${esc(sub(d))}</span>
<span style="font-size: 14px; line-height: 1.5; color: #4A4B63">${esc(d.howToGet)}</span>
<span style="font-size: 13px; line-height: 1.5; color: #4A4B63">Who: ${esc(d.eligibility)}</span>
<a href="${esc(d.sourceUrl)}" target="_blank" rel="noopener noreferrer" style="margin-top: auto; padding-top: 14px; font-size: 13px; color: #4A4B63">Source: ${esc(host(d.sourceUrl))}, checked ${esc(monthYear(d.checkedOn))}</a>
</article>`}
const chip=(cat,on)=>`<button type="button" class="dchip" data-cat="${esc(cat)}" aria-pressed="${on}" style="height: 40px; padding: 0 16px; border-radius: 20px; border: 1.5px solid ${on?'var(--dark)':'#DCDDE3'}; background: ${on?'var(--dark)':'#FFFFFF'}; color: ${on?'#FFFFFF':'var(--ink)'}; font: inherit; font-size: 15px; cursor: pointer">${esc(cat)}</button>`;
function wire(){const cs=[...chips.querySelectorAll('.dchip')];const cards=[...grid.querySelectorAll('.deal')];
 cs.forEach(ch=>ch.addEventListener('click',()=>{const c=ch.dataset.cat;
  cs.forEach(x=>{const on=x===ch;x.setAttribute('aria-pressed',on);x.style.background=on?'var(--dark)':'#FFFFFF';x.style.color=on?'#FFFFFF':'var(--ink)';x.style.borderColor=on?'var(--dark)':'#DCDDE3'});
  cards.forEach(k=>{k.style.display=(c==='All'||k.dataset.cat===c)?'flex':'none';k.classList.remove('pre');k.classList.add('seen')})}))}
function render(deals){
 const cats=[...new Set(deals.map(d=>LABEL[d.category]||LABEL.other))];
 chips.innerHTML=chip('All',true)+cats.map(c=>chip(c,false)).join('');
 grid.innerHTML=deals.length?deals.map(card).join(''):'<p style="margin: 0; font-size: 15px; color: #4A4B63">No checked deals for this school yet.</p>';
 // The designer's staggered landing (v2): cards wait as .pre and land as .seen when scrolled
 // into view, with the same observer settings as the page's own tiles.
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver' in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.remove('pre');e.target.classList.add('seen');io.unobserve(e.target)}}),{threshold:.3,rootMargin:'0px 0px -10% 0px'});grid.querySelectorAll('.deal').forEach(c=>{c.classList.add('pre');io.observe(c)})}
 const latest=deals.map(d=>d.checkedOn).sort().pop();if(checked)checked.textContent=latest?`Checked ${monthYear(latest)} · No paid listings`:'No paid listings';
 wire()}
let last='';
function refresh(){const s=window.TPSchool||{};const t=window.TP||{};const q=new URLSearchParams({unitId:String(s.unitId||0),city:s.city||'',state:s.state||'',years:String(t.Y||4)});
 const city=$('save-city');if(city)city.textContent=s.city||'your city';
 const key=q.toString();if(key===last)return;last=key;
 fetch('/api/deals?'+key,{headers:{accept:'application/json'}}).then(r=>r.ok?r.json():{deals:[]}).then(j=>render(j.deals||[])).catch(()=>render([]))}
document.addEventListener('tp-update',refresh);
})();
