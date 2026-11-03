// Between 1180 and 1439 px the designer's 1440 px canvas is scaled to the window with CSS
// zoom, so the desktop layout stays whole: branch lines, sticky nav, the one-row bar. Below
// 1180 px the designer's own stacked layout takes over (plan decision 22, revised). Loaded in
// the head so the first paint is already at the right size.
(function(){const fit=()=>{const m=document.querySelector('main');if(!m)return;const w=document.documentElement.clientWidth;m.style.zoom=(w>=1180&&w<1440)?String(w/1440):''};
if(document.querySelector('main'))fit();else document.addEventListener('DOMContentLoaded',fit);addEventListener('resize',fit)})();
