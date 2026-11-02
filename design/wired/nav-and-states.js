// The page's nav and empty state, as the designer wrote them. This code lived in the
// prototype's rate-history script, which change 2 stopped loading; it is the designer's own,
// unchanged: the empty state shows until a result, the sticky nav switches from its pre state
// to the result links with the section in view marked, and "Enter my details" scrolls to the
// bar. The deal filters that sat beside it are in deals.js.
// one nav: pre state before Show me, results links after
(function(){
const nav=document.getElementById('topnav');if(!nav)return;
const st=document.createElement('style');st.textContent='main section[id]{scroll-margin-top:40px}body:not(.has-res) #empty{display:block!important}body.has-res #topnav .nav-pre{display:none!important}body.has-res #topnav .nav-post{display:contents!important}#topnav .nav-post a[data-sec]{color:var(--ink);transition:background .2s,color .2s}#topnav .nav-post a[aria-current=true]{background:var(--dark)!important;color:#fff!important}#topnav .nav-post a[data-sec]:not([aria-current=true]){background:transparent!important;color:var(--ink)!important}';document.head.appendChild(st);
const RM=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const links=[...nav.querySelectorAll('.nav-post a[data-sec]')];
const set=id=>links.forEach(a=>a.dataset.sec===id?a.setAttribute('aria-current','true'):a.removeAttribute('aria-current'));
links.forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.getElementById(a.dataset.sec).scrollIntoView({behavior:RM()?'auto':'smooth',block:'start'});set(a.dataset.sec)}));
const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting)set(e.target.id)})},{rootMargin:'-90px 0px -60% 0px'});
links.forEach(a=>io.observe(document.getElementById(a.dataset.sec)));set('results');
document.querySelectorAll('.to-form').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();window.scrollTo({top:0,behavior:RM()?'auto':'smooth'});setTimeout(()=>document.getElementById(document.body.classList.contains('has-res')?'tuition':'from').focus({preventScroll:true}),500)}));
})();
