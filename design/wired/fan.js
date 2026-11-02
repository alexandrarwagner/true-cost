function fanSVG(f,Y,opt){
  opt=opt||{};const W=780,Hh=470,L=52,R=16,T=30,B=44,pw=W-L-R,ph=Hh-T-B;
  const top=Math.max(...f.worst,...f.p90)*1.06;const unit=top>=1e7?1e7:1e5;const u=unit===1e7?'cr':'L';
  const X=m=>L+pw*(m+1)/f.H,Yy=v=>T+ph*(1-v/top);const fx=v=>'₹'+(v/unit).toFixed(unit===1e7?2:1)+(u==='cr'?' cr':' L');
  const pts=a=>a.map((v,m)=>`${X(m).toFixed(1)},${Yy(v).toFixed(1)}`);const start=`${L},${Yy(0).toFixed(1)}`;
  let g='';
  const raw=top/unit/4;const mag=Math.pow(10,Math.floor(Math.log10(raw)));const stp=[1,2,2.5,5,10].map(x=>x*mag).find(x=>x>=raw);const dec=stp<0.1?2:(stp<1?(String(stp).split('.')[1]||'').length:0);
  for(let i=0;i*stp*unit<=top;i++){const v=i*stp*unit;g+=`<line x1="${L}" x2="${L+pw}" y1="${Yy(v).toFixed(1)}" y2="${Yy(v).toFixed(1)}" stroke="${i?'#ECEDF1':'#CFD0D8'}"/><text x="${L-12}" y="${(Yy(v)+4).toFixed(1)}" text-anchor="end" font-size="15" fill="#4A4B63">${i?(v/unit).toFixed(dec):'0'}</text>`}
  g+=`<text x="0" y="${T-12}" text-anchor="start" font-size="14" fill="#4A4B63">₹ ${u==='cr'?'crore':'lakh'}</text>`;
  for(let y=1;y<Y;y++){const x=X(12*y-1);g+=`<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${T}" y2="${T+ph}" stroke="#ECEDF1" stroke-dasharray="3 5"/>`}
  const xl=[[L,'Start','start']];for(let y=1;y<Y;y++)xl.push([X(12*y-1),'Year '+y,'middle']);xl.push([L+pw,'Graduation','end']);
  xl.forEach(([x,t,a])=>g+=`<text x="${x.toFixed(1)}" y="${Hh-14}" text-anchor="${a}" font-size="15" fill="#4A4B63">${t}</text>`);
  let s='';
  s+=`<polygon points="${start} ${pts(f.today).join(' ')} ${(L+pw).toFixed(1)},${Yy(0).toFixed(1)}" fill="#EEEFFD"/>`;
  s+=`<polygon points="${start} ${pts(f.p90).join(' ')} ${pts(f.p10).reverse().join(' ')}" fill="#C9CBFA"/>`;
  s+=`<polyline points="${start} ${pts(f.worst).join(' ')}" fill="none" stroke="#C2418F" stroke-width="2" stroke-dasharray="5 5" stroke-linecap="round"/>`;
  s+=`<polyline points="${start} ${pts(f.today).join(' ')}" fill="none" stroke="#3E43C8" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  const e=f.H-1,xe=X(e);
  s+=`<circle cx="${xe.toFixed(1)}" cy="${Yy(f.today[e]).toFixed(1)}" r="6" fill="#3E43C8" stroke="#fff" stroke-width="2.5"/>`;
  const w0=opt.anim?0:W;
  return `<svg width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}" font-family="Archivo, sans-serif" role="img" aria-label="What you will have spent by each point in your degree. At today's rate it ends at ${fx(f.today[e])}. In 8 of 10 past periods it ended between ${fx(f.lo)} and ${fx(f.hi)}; the worst tenth averaged ${fx(f.worst[e])}." style="display:block;width:100%;height:auto"><defs><clipPath id="fanclip"><rect id="fanclip-r" x="0" y="0" width="${w0}" height="${Hh}"/></clipPath></defs>${g}<g clip-path="url(#fanclip)">${s}</g><circle id="fan-head" r="6" fill="#3E43C8" stroke="#fff" stroke-width="2.5" style="display:none"/><metadata>${JSON.stringify({L,pw,T,ph,top,H:f.H,W})}</metadata></svg>`;
}
if(typeof module!=='undefined')module.exports={fanSVG};
;window.fanSVG=fanSVG;
