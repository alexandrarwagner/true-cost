const C=[["Afghanistan", "AFN", ""], ["Algeria", "DZD", ""], ["Argentina", "ARS", ""], ["Armenia", "AMD", ""], ["Australia", "AUD", "$"], ["Austria", "EUR", "€"], ["Azerbaijan", "AZN", ""], ["Bahamas", "BSD", ""], ["Bahrain", "BHD", ""], ["Bangladesh", "BDT", "৳"], ["Belgium", "EUR", "€"], ["Bhutan", "BTN", ""], ["Bolivia", "BOB", ""], ["Brazil", "BRL", ""], ["Cambodia", "KHR", ""], ["Cameroon", "XAF", ""], ["Canada", "CAD", "$"], ["Chile", "CLP", ""], ["China", "CNY", "¥"], ["Colombia", "COP", ""], ["Côte d’Ivoire", "XOF", ""], ["Croatia", "EUR", "€"], ["Czechia", "CZK", ""], ["Denmark", "DKK", ""], ["Dominican Republic", "DOP", ""], ["Ecuador", "USD", "$"], ["Egypt", "EGP", ""], ["El Salvador", "USD", "$"], ["Ethiopia", "ETB", ""], ["Finland", "EUR", "€"], ["France", "EUR", "€"], ["Georgia", "GEL", ""], ["Germany", "EUR", "€"], ["Ghana", "GHS", ""], ["Greece", "EUR", "€"], ["Guatemala", "GTQ", ""], ["Honduras", "HNL", ""], ["Hong Kong", "HKD", "$"], ["Hungary", "HUF", ""], ["Iceland", "ISK", ""], ["India", "INR", "₹"], ["Indonesia", "IDR", ""], ["Iraq", "IQD", ""], ["Ireland", "EUR", "€"], ["Israel", "ILS", ""], ["Italy", "EUR", "€"], ["Jamaica", "JMD", ""], ["Japan", "JPY", "¥"], ["Jordan", "JOD", ""], ["Kazakhstan", "KZT", ""], ["Kenya", "KES", ""], ["Kuwait", "KWD", ""], ["Lebanon", "LBP", ""], ["Liberia", "LRD", ""], ["Malawi", "MWK", ""], ["Malaysia", "MYR", ""], ["Mexico", "MXN", "$"], ["Mongolia", "MNT", ""], ["Morocco", "MAD", ""], ["Myanmar", "MMK", ""], ["Nepal", "NPR", ""], ["Netherlands", "EUR", "€"], ["New Zealand", "NZD", "$"], ["Nigeria", "NGN", "₦"], ["Norway", "NOK", ""], ["Oman", "OMR", ""], ["Pakistan", "PKR", ""], ["Paraguay", "PYG", ""], ["Peru", "PEN", ""], ["Philippines", "PHP", ""], ["Poland", "PLN", ""], ["Portugal", "EUR", "€"], ["Qatar", "QAR", ""], ["Romania", "RON", ""], ["Rwanda", "RWF", ""], ["Saudi Arabia", "SAR", ""], ["Senegal", "XOF", ""], ["Serbia", "RSD", ""], ["Singapore", "SGD", "$"], ["South Africa", "ZAR", ""], ["South Korea", "KRW", "₩"], ["Spain", "EUR", "€"], ["Sri Lanka", "LKR", ""], ["Sweden", "SEK", ""], ["Switzerland", "CHF", ""], ["Taiwan", "TWD", ""], ["Tanzania", "TZS", ""], ["Thailand", "THB", ""], ["Trinidad and Tobago", "TTD", ""], ["Tunisia", "TND", ""], ["Türkiye", "TRY", ""], ["Uganda", "UGX", ""], ["Ukraine", "UAH", ""], ["United Arab Emirates", "AED", ""], ["United Kingdom", "GBP", "£"], ["Uruguay", "UYU", ""], ["Uzbekistan", "UZS", ""], ["Vietnam", "VND", ""], ["Zambia", "ZMW", ""]];
document.querySelectorAll('.sw button').forEach(b=>b.onclick=()=>{const [d,o,m]=b.dataset.p.split(',');const r=document.documentElement.style;r.setProperty('--dark',d);r.setProperty('--one',o);r.setProperty('--move',m);document.querySelectorAll('.sw button').forEach(x=>x.setAttribute('aria-pressed',x===b))});
function esc(t){return t.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
const norm=t=>t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[’']/g,'');
const STOP=['of','the','at','in'];
function toks(q){const a=norm(q).split(/[\s,]+/).filter(Boolean);const b=a.filter(t=>!STOP.includes(t));return b.length?b:a}
function words(t){return ' '+norm(t).replace(/[(),–&.-]/g,' ')}
function hi(name,q){const ts=toks(q);if(!ts.length)return esc(name);const n=words(name).slice(1);const m=new Array(name.length).fill(0);
 ts.forEach(t=>{let i=-1;while((i=(' '+n).indexOf(' '+t,i+1))>=0){for(let k=i;k<i+t.length&&k<name.length;k++)m[k]=1}});
 let o='',on=0;for(let i=0;i<name.length;i++){if(m[i]&&!on){o+='<b>';on=1}if(!m[i]&&on){o+='</b>';on=0}o+=esc(name[i])}return o+(on?'</b>':'')}
function combo(inp,items,opts){
 const ul=document.createElement('ul');ul.className='dd';ul.id=inp.id+'-list';ul.setAttribute('role','listbox');ul.hidden=true;inp.closest('label').appendChild(ul);
 inp.setAttribute('role','combobox');inp.setAttribute('aria-autocomplete','list');inp.setAttribute('aria-controls',ul.id);inp.setAttribute('aria-expanded','false');
 let act=-1,cur=[],seq=0,timer=null;
 // items is a list to filter here, or a function (query -> Promise of ranked items) for a
 // server search; a search waits 250ms for typing to stop and ignores stale answers.
 function show(q){act=cur.length?0:(opts.foot?0:-1);
  ul.innerHTML=cur.map((it,i)=>`<li role="option" id="${ul.id}-${i}">${opts.row(it,q)}</li>`).join('')+(opts.foot?`<li class="foot" role="option" id="${ul.id}-${cur.length}">${opts.foot}</li>`:'');
  if(!cur.length&&!opts.foot)ul.innerHTML='<li style="cursor:default;color:#4A4B63">No match. Check the spelling?</li>';
  open(true);mark()}
 function render(){const q=inp.value.trim();
  if(typeof items==='function'){clearTimeout(timer);if(q.length<2){cur=[];open(false);return}
   const my=++seq;timer=setTimeout(()=>items(q).then(r=>{if(my!==seq)return;cur=(r||[]).slice(0,opts.max||8);show(q)},()=>{if(my!==seq)return;cur=[];show(q)}),250);return}
  const ts=toks(q);
  cur=items.filter(it=>!ts.length||ts.every(x=>words(opts.text(it)).includes(' '+x))||(opts.alias&&ts.length===1&&opts.alias(it).includes(ts[0])));
  const rk=it=>norm(opts.text(it)).startsWith(norm(q))?0:1;cur.sort((a,b)=>rk(a)-rk(b));
  cur=cur.slice(0,opts.max||8);show(q)}
 function mark(){[...ul.children].forEach((li,i)=>li.setAttribute('aria-selected',i===act));if(act>=0&&ul.children[act]){inp.setAttribute('aria-activedescendant',ul.id+'-'+act);ul.children[act].scrollIntoView({block:'nearest'})}else inp.removeAttribute('aria-activedescendant')}
 function open(v){ul.hidden=!v;inp.setAttribute('aria-expanded',v)}
 function pick(i){if(i>=cur.length){opts.onFoot&&opts.onFoot();open(false);return}const it=cur[i];inp.value=opts.text(it);opts.onPick&&opts.onPick(it);open(false)}
 inp.addEventListener('input',render);inp.addEventListener('focus',()=>{inp.select();render()});
 inp.addEventListener('keydown',e=>{const n=ul.children.length;if(ul.hidden&&e.key==='ArrowDown'){render();return}
  if(e.key==='ArrowDown'){act=Math.min(act+1,n-1);mark();e.preventDefault()}else if(e.key==='ArrowUp'){act=Math.max(act-1,0);mark();e.preventDefault()}
  else if(e.key==='Enter'&&!ul.hidden&&act>=0&&cur.length+(opts.foot?1:0)>0){pick(act);e.preventDefault()}else if(e.key==='Escape'){open(false)}});
 ul.addEventListener('mousedown',e=>{const li=e.target.closest('li[role=option]');if(!li)return;e.preventDefault();pick([...ul.children].indexOf(li))});
 inp.addEventListener('blur',()=>setTimeout(()=>open(false),100));
}
const CAL={'United States':[],'United Kingdom':['uk','britain','england','scotland','wales'],'United Arab Emirates':['uae','emirates','dubai'],'South Korea':['korea'],'Türkiye':['turkey'],'Côte d’Ivoire':['ivory'],'Czechia':['czech']};
combo(document.getElementById('from'),C,{text:c=>c[0],alias:c=>[norm(c[1])].concat(CAL[c[0]]||[]).filter(a=>a),row:(c,q)=>`<span>${hi(c[0],q)}</span><span class="code">${c[1]}${c[2]?' '+c[2]:''}</span>`,onPick:c=>{document.getElementById('cur').textContent=c[1]+(c[2]?' '+c[2]:'')}});
const SAL={'Massachusetts Institute of Technology':['mit'],'New York University':['nyu'],'University of Southern California':['usc'],'University of California, Los Angeles':['ucla'],'University of California, Berkeley':['ucb','berkeley'],'University of California, San Diego':['ucsd'],'University of California, Irvine':['uci'],'University of California, Davis':['ucd'],'Carnegie Mellon University':['cmu'],'Georgia Institute of Technology':['georgia tech','gatech'],'University of Illinois Urbana-Champaign':['uiuc'],'California Institute of Technology':['caltech'],'Rhode Island School of Design':['risd'],'Savannah College of Art and Design':['scad'],'School of the Art Institute of Chicago':['saic'],'University of Texas at Austin':['ut austin'],'University of Texas at Dallas':['utd'],'Arizona State University':['asu'],'Boston University':['bu'],'Pennsylvania State University':['penn state'],'Ohio State University':['osu'],'Rensselaer Polytechnic Institute':['rpi'],'Worcester Polytechnic Institute':['wpi'],'George Washington University':['gwu'],'Washington University in St. Louis':['washu'],'University of Pennsylvania':['upenn','penn']};
const expand=q=>{const n=norm(q);for(const [name,al] of Object.entries(SAL))if(al.includes(n))return name;return q};
const searchSchools=q=>fetch('/api/schools/search?q='+encodeURIComponent(expand(q)),{headers:{accept:'application/json'}}).then(r=>r.ok?r.json():{results:[]}).then(j=>j.results||[]);
window.TPSchool=null;window.TPTuitionSource='user';
const yearsFor=d=>d===3?4:(d===4?2:null); // College Scorecard: 3 = bachelor's, 4 = graduate
combo(document.getElementById('school'),searchSchools,{text:s=>s.name,row:(s,q)=>`<span>${hi(s.name,q)}</span><span class="code">${esc(s.city)}, ${esc(s.state)}</span>`,foot:'Can’t find it? Type your tuition yourself →',onFoot:()=>{const t=document.querySelector('input.num');t.focus();t.select()},
 onPick:s=>{window.TPSchool=s;const t=document.getElementById('tuition');if(s.tuitionOutOfStateUsd!=null){t.value='$'+Math.round(s.tuitionOutOfStateUsd/100).toLocaleString('en-US');window.TPTuitionSource='school'}
  const y=yearsFor(s.predominantDegree);if(y){document.getElementById('years').value=y}}});

