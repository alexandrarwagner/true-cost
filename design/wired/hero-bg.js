// The designer's hero background (3 November): the dotted field runs up behind the nav and
// down to where the next visible section's content starts, and the nav notes when scrolled.
(function(){const nav=document.getElementById('topnav');const hero=document.getElementById('hero');if(!nav||!hero)return;const bg=hero.querySelector('.hero-bg');
const navState=()=>nav.classList.toggle('scrolled',scrollY>8);addEventListener('scroll',navState,{passive:true});navState();
// let the dots run down to where the next visible section's content starts, and up behind the nav
const fit=()=>{if(!bg)return;let n=hero.nextElementSibling;while(n&&(getComputedStyle(n).display==='none'||n.offsetHeight===0))n=n.nextElementSibling;
 const pad=n?parseFloat(getComputedStyle(n).paddingTop)||0:0;const b=(-pad)+'px',t=(-nav.offsetHeight)+'px';if(bg.style.bottom!==b)bg.style.setProperty('bottom',b,'important');if(bg.style.top!==t)bg.style.setProperty('top',t,'important')};
fit();addEventListener('resize',fit);document.addEventListener('tp-update',fit);document.addEventListener('click',()=>setTimeout(fit,50));
})();
