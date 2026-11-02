// The designer's scroll-driven motion, unchanged: the line drawn through the Type column of
// "How we work it out" and the section headings that brighten word by word.

// motion: line drawn by scroll through the Type column of "How we work it out"
(function(){const box=document.getElementById('sources');if(!box||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
const marks=[...box.querySelectorAll(':scope > div:not(:first-child) > span:last-child > span:first-child')];if(marks.length<2)return;
box.style.position='relative';const line=document.createElement('div');line.className='how-line';line.setAttribute('aria-hidden','true');box.appendChild(line);box.classList.add('how-anim');marks.forEach(m=>m.classList.add('how-mark'));
let y0=0,y1=0;const measure=()=>{const b=box.getBoundingClientRect();const f=marks[0].getBoundingClientRect(),l=marks[marks.length-1].getBoundingClientRect();const x=f.left-b.left+f.width/2;y0=f.top-b.top+f.height/2;y1=l.top-b.top+l.height/2;line.style.left=(x-.75)+'px';line.style.top=y0+'px';line.style.height=Math.max(0,y1-y0)+'px';marks.forEach(m=>{const r=m.getBoundingClientRect();m.dataset.y=r.top-b.top+r.height/2})};
let tick=false;const update=()=>{tick=false;const b=box.getBoundingClientRect();const reach=innerHeight*0.72-b.top;const p=Math.max(0,Math.min(1,(reach-y0)/((y1-y0)||1)));line.style.transform='scaleY('+p+')';marks.forEach(m=>{if(reach>=+m.dataset.y-2)m.classList.add('on')})};
const req=()=>{if(!tick){tick=true;requestAnimationFrame(update)}};
measure();update();addEventListener('scroll',req,{passive:true});addEventListener('resize',()=>{measure();update()});if('ResizeObserver' in window)new ResizeObserver(()=>{measure();update()}).observe(box);
})();
// motion: section headlines reveal word by word as they scroll toward the top third
(function(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
const hs=[...document.querySelectorAll('section h2.d')].filter(h=>h.id!=='empty-h');if(!hs.length)return;
const items=hs.map(h=>{const words=[];[...h.childNodes].forEach(n=>{if(n.nodeType===3){const frag=document.createDocumentFragment();n.textContent.split(/(\s+)/).forEach(t=>{if(!t)return;if(/^\s+$/.test(t))frag.appendChild(document.createTextNode(t));else{const sp=document.createElement('span');sp.className='wd';sp.textContent=t;frag.appendChild(sp);words.push(sp)}});h.replaceChild(frag,n)}else if(n.nodeType===1){n.classList.add('wd');words.push(n)}});return{h,words}});
let tick=false;const update=()=>{tick=false;const vh=innerHeight;items.forEach(({h,words})=>{const r=h.getBoundingClientRect();const p=Math.max(0,Math.min(1,(vh-r.top)/(vh*0.7)));const N=words.length;words.forEach((w,i)=>{const st=N>1?i/N*0.6:0;const k=Math.max(0,Math.min(1,(p-st)/0.4));w.style.opacity=(0.25+0.75*k).toFixed(3)})})};
const req=()=>{if(!tick){tick=true;requestAnimationFrame(update)}};
update();addEventListener('scroll',req,{passive:true});addEventListener('resize',req);document.addEventListener('tp-update',()=>setTimeout(update,80));
})();
