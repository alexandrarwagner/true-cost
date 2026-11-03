// The four "General tips" tiles, filled for the student's own place by /api/tips (Claude,
// plan decision 28). The tiles keep the designer's markup and their hand-written text until
// an answer arrives; with no key, in demo mode, or on any failure they stay as they are.
(function(){
const $=id=>document.getElementById(id);
const tiles=[...document.querySelectorAll('#save .tile')];if(tiles.length!==4)return;
const fill=(tile,tip)=>{const spans=tile.querySelectorAll(':scope > span');if(spans.length<3)return;spans[1].textContent=tip.title;spans[2].textContent=tip.text};
let last='';
function refresh(){const s=window.TPSchool||{};const country=($('from')&&$('from').value.trim())||'';if(!country)return;
 const q=new URLSearchParams({country});if(s.city)q.set('city',s.city);if(s.state)q.set('state',s.state);if(s.name)q.set('school',s.name);
 const key=q.toString();if(key===last)return;last=key;
 fetch('/api/tips?'+key,{headers:{accept:'application/json'}}).then(r=>r.ok?r.json():{tips:null}).then(j=>{const t=j&&j.tips;if(!t)return;
  fill(tiles[0],t.housing[0]);fill(tiles[1],t.housing[1]);fill(tiles[2],t.living);fill(tiles[3],t.moving)}).catch(()=>{})}
document.addEventListener('tp-update',refresh);
})();
