function fanCalc(V,o){ // o:{T,Y,rentM,liveM,one,extraOnce,extraMonthly,move,rate}
  const H=12*o.Y;const pay=new Array(H).fill(o.rentM+o.liveM+(o.extraMonthly||0));pay[0]+=o.one+(o.extraOnce||0);
  for(let m=0;m<H;m+=6)pay[m]+=o.T/2;
  const base=pay.reduce((a,b)=>a+b,0);const mv=(o.move!=null)?o.move:Math.round(base*2200/131500);const k=1+mv/base;for(let m=0;m<H;m++)pay[m]*=k;
  const cum=a=>{let s=0;return a.map(x=>s+=x)};
  const today=cum(pay.map(x=>x*o.rate));const paths=[];
  for(let i=0;i+H<=V.length;i++)paths.push(cum(pay.map((x,m)=>x*o.rate*V[i+m]/V[i])));
  const pct=(arr,q)=>{const s=[...arr].sort((a,b)=>a-b);const r=(s.length-1)*q;const l=Math.floor(r),h=Math.ceil(r);return s[l]+(s[h]-s[l])*(r-l)};
  const p10=[],p90=[];for(let m=0;m<H;m++){const col=paths.map(p=>p[m]);p10.push(pct(col,.1));p90.push(pct(col,.9))}
  const fin=paths.map(p=>p[H-1]);const f90=pct(fin,.9);const wp=paths.filter(p=>p[H-1]>=f90);
  const worst=[];for(let m=0;m<H;m++)worst.push(wp.reduce((a,p)=>a+p[m],0)/wp.length);
  return {today,p10,p90,worst,n:paths.length,H,buf:p90[H-1]-today[H-1],lo:p10[H-1],hi:p90[H-1],usdTotal:base+mv};
}
if(typeof module!=='undefined')module.exports={fanCalc};
;window.fanCalc=fanCalc;
