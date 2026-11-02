
// opening sequence, first paint only
(function(){const root=document.documentElement;if(!root.classList.contains('intro'))return;const cur=document.getElementById('curtain');const hero=document.getElementById('hero');
const bail=()=>{root.classList.remove('intro','intro-go');if(cur)cur.remove()};
if(!cur||!hero||document.body.classList.contains('has-res')){bail();return}
const h1=hero.querySelector('h1');const units=[];
[...h1.childNodes].forEach(n=>{if(n.nodeType===3){const frag=document.createDocumentFragment();n.textContent.split(/(\s+)/).forEach(t=>{if(!t)return;if(/^\s+$/.test(t))frag.appendChild(document.createTextNode(t));else{const sp=document.createElement('span');sp.className='in-w';sp.textContent=t;frag.appendChild(sp);units.push(sp)}});h1.replaceChild(frag,n)}else if(n.nodeType===1)units.push(null)});
const sub=h1.nextElementSibling;const form=document.getElementById('calc');const pill=form&&form.firstElementChild;const fields=pill?[...pill.children]:[];const link=document.getElementById('example');const school=document.getElementById('school');
const at=(el,ms,cls)=>{if(!el)return;el.classList.add(cls||'in-el');el.style.animationDelay=ms+'ms'};
const full=school?school.placeholder:'';let typing=true;const stopTyping=()=>{typing=false;if(school)school.placeholder=full};
if(school){school.placeholder='';school.addEventListener('focus',stopTyping,{once:true})}
let started=false;const run=()=>{ // first rendered frame: every clock starts here
 units.forEach((u,i)=>{if(u)at(u,250+i*45,'in-w')});at(sub,450);at(pill,550);fields.forEach((f,i)=>at(f,650+i*80));at(link,1000);
 root.classList.add('intro-go');cur.addEventListener('transitionend',()=>cur.remove(),{once:true});
 setTimeout(()=>{let i=0;const t0=performance.now();const tick=()=>{if(!typing)return;i=Math.min(full.length,Math.max(i+1,Math.floor((performance.now()-t0)/35)));school.placeholder=full.slice(0,i);if(i<full.length)setTimeout(tick,35);else typing=false};if(school)tick()},850);
 setTimeout(()=>{root.classList.remove('intro','intro-go');if(cur.parentNode)cur.remove();[sub,pill,link,...fields,...units].forEach(e=>{if(e){e.classList.remove('in-el','in-w');e.style.animationDelay=''}})},2300)};
const start=()=>{if(started)return;started=true;const go=()=>requestAnimationFrame(()=>requestAnimationFrame(run));if(document.visibilityState==='hidden')document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')go()},{once:true});else go()};
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(start);setTimeout(start,900);
})();
