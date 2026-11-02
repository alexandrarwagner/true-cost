// The page's nav and empty state, as the designer wrote them (v2 adds the pill that slides
// between the section links). This code lived in the prototype's rate-history script, which
// change 2 stopped loading; it is the designer's own, unchanged: the empty state shows until
// a result, the sticky nav switches from its pre state to the result links with the section
// in view marked, and "Enter my details" scrolls to the bar. The deal filters that sat beside
// it are in deals.js.
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
