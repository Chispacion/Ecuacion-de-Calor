const $=id=>document.getElementById(id),L=.15,W=.07,rho=2500,cp=900,dx=.002;
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const STOPS=[[0,0,4],[40,11,84],[101,21,110],[159,42,99],[212,72,66],[245,125,21],[250,193,39],[252,255,164]];
function cmap(f){f=Math.max(0,Math.min(1,f))*(STOPS.length-1);const i=Math.min(Math.floor(f),STOPS.length-2),u=f-i;return STOPS[i].map((v,k)=>v+(STOPS[i+1][k]-v)*u)}
let R=null;

function sim(p){
  const nx=Math.round(L/dx)+1,ny=Math.round(W/dx)+1,N=nx*ny;
  const al=p.k/(rho*cp),dt=.9*dx*dx/(4*al),steps=Math.floor(p.t/dt);
  const chip=new Uint8Array(N),hand=new Uint8Array(N),h=new Float64Array(N),src=new Float64Array(N);
  let nc=0,nh=0;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=i*dx,y=j*dx,id=j*nx+i;
    if(Math.abs(x-.75*L)<.007&&Math.abs(y-W/2)<.007){chip[id]=1;nc++}
    if(x<.55*L){hand[id]=1;nh++}
    h[id]=hand[id]?p.hm:p.ha}
  for(let n=0;n<N;n++)if(chip[n])src[n]=p.P/(nc*dx*dx);
  const a=dt*al/(dx*dx),b=dt/(rho*cp*p.d);
  let T=new Float64Array(N).fill(p.Ta),Tn=new Float64Array(N);
  const snaps=[],tim=[],ser=[],NS=60,snapAt=new Set(Array.from({length:NS},(_,k)=>Math.round(k*steps/(NS-1))));
  for(let n=0;n<=steps;n++){
    if(snapAt.has(n)){snaps.push(Float64Array.from(T));tim.push(n*dt)}
    if(n%20===0){let mx=-1e9,sa=0,sh=0;for(let q=0;q<N;q++){sa+=T[q];if(chip[q]&&T[q]>mx)mx=T[q];if(hand[q])sh+=T[q]}ser.push([n*dt,mx,sa/N,sh/nh])}
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const id=j*nx+i,c=T[id];
      const s=(i<nx-1?T[id+1]:c)+(i>0?T[id-1]:c)+(j<ny-1?T[id+nx]:c)+(j>0?T[id-nx]:c)-4*c;
      Tn[id]=c+a*s+b*(src[id]-h[id]*(c-p.Ta))}
    const t=T;T=Tn;Tn=t}
  while(snaps.length<NS){snaps.push(Float64Array.from(T));tim.push(steps*dt)}
  return{nx,ny,snaps:snaps.slice(0,NS),tim:tim.slice(0,NS),ser,al,dt,p}
}

function setup(cv){const r=cv.getBoundingClientRect(),d=window.devicePixelRatio||1;cv.width=Math.round(r.width*d);cv.height=Math.round(r.height*d);const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);return[c,r.width,r.height]}

function drawHeat(){
  const cv=$('heat'),[c,w,hh]=setup(cv),s=+$('S').value,T=R.snaps[s],{nx,ny}=R,Ta=R.p.Ta;
  let Tmax=Ta+1;R.snaps.forEach(sn=>{for(const v of sn)if(v>Tmax)Tmax=v});
  const m={l:46,r:84,t:36,b:40},aw=w-m.l-m.r,ah=hh-m.t-m.b,sc=Math.min(aw/L,ah/W),bw=L*sc,bh=W*sc,x0=m.l+(aw-bw)/2,y0=m.t+(ah-bh)/2;
  const off=document.createElement('canvas');off.width=nx;off.height=ny;const oc=off.getContext('2d'),im=oc.createImageData(nx,ny);
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const col=cmap((T[j*nx+i]-Ta)/(Tmax-Ta)),q=((ny-1-j)*nx+i)*4;im.data[q]=col[0];im.data[q+1]=col[1];im.data[q+2]=col[2];im.data[q+3]=255}
  oc.putImageData(im,0,0);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(off,x0,y0,bw,bh);
  const txt=css('--text'),mu=css('--muted');
  c.lineWidth=2;c.strokeStyle=txt;c.strokeRect(x0,y0,bw,bh);
  c.lineWidth=1.5;c.strokeStyle='#22d3ee';c.strokeRect(x0+(.75*L-.007)*sc,y0+bh-(W/2+.007)*sc,.014*sc,.014*sc);
  c.fillStyle='#22d3ee';c.font='11px sans-serif';c.textAlign='center';c.fillText('Procesador',x0+.75*L*sc,y0+bh-(W/2-.007)*sc+14);
  c.setLineDash([6,4]);c.strokeStyle='#5fd38d';c.lineWidth=1.3;c.strokeRect(x0,y0,.55*L*sc,bh);c.setLineDash([]);
  c.fillStyle=mu;c.fillText('Zona de contacto con la mano',x0+.275*L*sc,y0-8);
  c.font='13px sans-serif';c.fillStyle=txt;c.font='bold 13px sans-serif';c.textAlign='left';c.fillText('Mapa de temperatura, cara posterior',m.l-30,18);
  c.font='11px sans-serif';c.fillStyle=mu;c.textAlign='center';c.fillText('Largo del teléfono: 15 cm',x0+bw/2,hh-10);
  c.save();c.translate(12,y0+bh/2);c.rotate(-Math.PI/2);c.fillText('Ancho: 7 cm',0,0);c.restore();
  const cx=w-m.r+22,cw=12;
  for(let k=0;k<bh;k++){const col=cmap(1-k/bh);c.fillStyle=`rgb(${col[0]|0},${col[1]|0},${col[2]|0})`;c.fillRect(cx,y0+k,cw,1.5)}
  c.fillStyle=mu;c.textAlign='left';
  for(let k=0;k<=4;k++){const v=Ta+(Tmax-Ta)*(1-k/4);c.fillText(v.toFixed(0)+' °C',cx+cw+5,y0+bh*k/4+4)}
}

function chart(cv,series,o){
  const[c,w,h]=setup(cv),m={l:50,r:14,t:34,b:42},pw=w-m.l-m.r,ph=h-m.t-m.b;
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  series.forEach(s=>s.x.forEach((v,i)=>{x0=Math.min(x0,v);x1=Math.max(x1,v);y0=Math.min(y0,s.y[i]);y1=Math.max(y1,s.y[i])}));
  if(o.hline!=null){y1=Math.max(y1,o.hline+1)}
  y0=Math.floor(y0-.5);y1=Math.ceil(y1+.5);if(x1===x0)x1=x0+1;
  const X=v=>m.l+(v-x0)/(x1-x0)*pw,Y=v=>m.t+ph-(v-y0)/(y1-y0)*ph,mu=css('--muted'),gr=css('--grid'),tx=css('--text');
  c.font='11px sans-serif';c.lineWidth=1;
  for(let k=0;k<=5;k++){const yv=y0+(y1-y0)*k/5,xv=x0+(x1-x0)*k/5;
    c.strokeStyle=gr;c.beginPath();c.moveTo(m.l,Y(yv));c.lineTo(m.l+pw,Y(yv));c.stroke();
    c.fillStyle=mu;c.textAlign='right';c.fillText(yv.toFixed(0),m.l-6,Y(yv)+4);
    c.textAlign='center';c.fillText(xv.toFixed(o.xd),X(xv),m.t+ph+16)}
  c.strokeStyle=mu;c.beginPath();c.moveTo(m.l,m.t);c.lineTo(m.l,m.t+ph);c.lineTo(m.l+pw,m.t+ph);c.stroke();
  if(o.hline!=null){c.setLineDash([5,4]);c.strokeStyle=mu;c.beginPath();c.moveTo(m.l,Y(o.hline));c.lineTo(m.l+pw,Y(o.hline));c.stroke();c.setLineDash([]);c.fillStyle=mu;c.textAlign='left';c.fillText('Umbral de incomodidad (41 °C)',m.l+6,Y(o.hline)-5)}
  if(o.vline!=null){c.strokeStyle=tx;c.globalAlpha=.4;c.beginPath();c.moveTo(X(o.vline),m.t);c.lineTo(X(o.vline),m.t+ph);c.stroke();c.globalAlpha=1}
  if(o.band){c.fillStyle=css('--orange');c.globalAlpha=.12;c.fillRect(X(o.band[0]),m.t,X(o.band[1])-X(o.band[0]),ph);c.globalAlpha=1}
  series.forEach(s=>{c.strokeStyle=s.color;c.lineWidth=2;c.beginPath();s.x.forEach((v,i)=>i?c.lineTo(X(v),Y(s.y[i])):c.moveTo(X(v),Y(s.y[i])));c.stroke()});
  c.fillStyle=tx;c.font='bold 13px sans-serif';c.textAlign='left';c.fillText(o.title,m.l-38,18);
  c.font='11px sans-serif';c.fillStyle=mu;c.textAlign='center';c.fillText(o.xl,m.l+pw/2,h-6);
  c.save();c.translate(11,m.t+ph/2);c.rotate(-Math.PI/2);c.fillText(o.yl,0,0);c.restore();
  let lx=m.l+pw,ly=m.t+ph-8;c.textAlign='right';
  series.slice().reverse().forEach(s=>{c.fillStyle=s.color;c.fillText(s.label,lx-16,ly);c.fillRect(lx-12,ly-6,12,3);ly-=15});
}

function drawCharts(){
  const s=+$('S').value,tcur=R.tim[s]/60,ser=R.ser,tt=ser.map(r=>r[0]/60);
  chart($('ts'),[{x:tt,y:ser.map(r=>r[1]),color:css('--red'),label:'Procesador (máxima)'},{x:tt,y:ser.map(r=>r[3]),color:css('--orange'),label:'Zona de la mano (media)'},{x:tt,y:ser.map(r=>r[2]),color:css('--blue'),label:'Superficie total (media)'}],
    {title:'Temperatura en función del tiempo',xl:'Tiempo (min)',yl:'Temperatura (°C)',hline:41,vline:tcur,xd:1});
  const {nx,ny}=R,jm=Math.floor(ny/2),xs=Array.from({length:nx},(_,i)=>i*dx*100),ser2=[];
  const idx=[...new Set(Array.from({length:6},(_,k)=>Math.max(1,Math.round(1+(Math.max(s,1)-1)*k/5))))];
  idx.forEach((j,k)=>{const f=idx.length>1?k/(idx.length-1):1;ser2.push({x:xs,y:Array.from({length:nx},(_,i)=>R.snaps[j][jm*nx+i]),color:`hsl(${260-f*150},65%,${dk()?62:42}%)`,label:R.tim[j].toFixed(0)+' s'})});
  chart($('pf'),ser2,{title:'Perfil de temperatura en la línea central',xl:'Posición a lo largo del teléfono (cm)',yl:'Temperatura (°C)',band:[0,.55*L*100],xd:0});
}

const LV=[
{m:35,n:'Sin riesgo',c:'#4f9d73',d:'La superficie de agarre se mantiene cerca de la temperatura de la piel. El contacto es confortable.'},
{m:41,n:'Tibio',c:'#8fae3f',d:'Calor perceptible pero tolerable. No hay riesgo para la piel.'},
{m:43,n:'Incómodo',c:'#e2b93b',d:'El contacto prolongado resulta molesto. La mano tiende a cambiar de posición o a soltar el equipo.'},
{m:48,n:'Dolor y riesgo de quemadura',c:'#d9663a',d:'Se alcanza el umbral de dolor. Con contacto sostenido pueden aparecer quemaduras de contacto de bajo grado.'},
{m:1e9,n:'Riesgo alto de quemadura',c:'#9c1f2e',d:'Temperatura peligrosa: el daño en la piel puede producirse en pocos minutos de contacto continuo. Debe soltarse el equipo.'}];
function ramp(S,f){f=Math.max(0,Math.min(1,f))*(S.length-1);const i=Math.min(Math.floor(f),S.length-2),u=f-i;return S[i].map((v,k)=>Math.round(v+(S[i+1][k]-v)*u))}
function handMax(sn){let m=-1e9;for(let j=0;j<R.ny;j++)for(let i=0;i<R.nx;i++)if(i*dx<.55*L){const v=sn[j*R.nx+i];if(v>m)m=v}return m}
function drawHand(){
  const s=+$('S').value,sn=R.snaps[s],{nx,ny}=R,Ta=R.p.Ta;
  let Tm=Ta+1;R.snaps.forEach(a=>{for(const v of a)if(v>Tm)Tm=v});
  const Th=handMax(sn),li=LV.findIndex(l=>Th<l.m),lv=LV[li];
  const sk=ramp([[238,201,174],[236,156,134],[210,72,66],[130,26,36]],(Th-33)/19);
  const skin='rgb('+sk+')',light='rgb('+sk.map(v=>Math.min(255,v+24))+')',edge='rgb('+sk.map(v=>Math.round(v*.58))+')';
  const jm=Math.floor(ny/2);let stops='';
  for(let k=0;k<=10;k++){const i=Math.round(k/10*(nx-1)),col=cmap((sn[jm*nx+i]-Ta)/(Tm-Ta));stops+=`<stop offset="${k*10}%" stop-color="rgb(${col.map(Math.round)})"/>`}
  const cc=cmap((sn[jm*nx+Math.round(.75*L/dx)]-Ta)/(Tm-Ta));
  const B=li>=3?[[262,203],[262,243],[262,281],[112,262],[150,384],[205,396],[232,372],[99,300]]:[];
  const bl=B.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="${li>=4?8:5}" fill="#fff" fill-opacity=".55" stroke="${edge}" stroke-width="1.2"/>`).join('');
  const fy=[[186,34,32],[222,38,33],[262,38,32],[300,30,26]];
  const fingers=fy.map(([y,h,w])=>`<rect x="246" y="${y}" width="${w}" height="${h}" rx="${h/2}"/>`).join('');
  const creases=fy.map(([y,h,w])=>`M${246+w-4},${y+h*.3} q-7,${h*.2} -2,${h*.4}`).join(' ');
  $('hsvg').innerHTML=`<svg viewBox="0 0 360 440" role="img" aria-label="Mano sosteniendo un tel\u00e9fono; el color indica la temperatura"><defs>
<linearGradient id="pg" x1="0" y1="1" x2="0" y2="0">${stops}</linearGradient>
<linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${skin}"/></linearGradient></defs>
<path d="M100,236 C86,262 84,310 98,346 C106,372 112,392 114,412 L252,412 C252,392 258,372 266,346 C276,316 274,270 258,236 Z" fill="url(#hg)" stroke="${edge}" stroke-width="2"/>
<path d="M120,352 q60,22 128,0" fill="none" stroke="${edge}" stroke-width="1.2" opacity=".45"/>
<path d="M150,372 q30,12 60,0" fill="none" stroke="${edge}" stroke-width="1.2" opacity=".35"/>
<rect x="94" y="402" width="170" height="38" rx="8" fill="#3d4b66"/>
<rect x="109" y="26" width="150" height="320" rx="22" fill="#000" opacity=".2"/>
<rect x="105" y="20" width="150" height="320" rx="22" fill="url(#pg)" stroke="#0d1117" stroke-width="4"/>
<rect x="167" y="28" width="26" height="4" rx="2" fill="#000" opacity=".55"/>
<rect x="165" y="85" width="30" height="30" rx="4" fill="rgb(${cc.map(Math.round)})" stroke="#22d3ee" stroke-width="2"/>
<g fill="url(#hg)" stroke="${edge}" stroke-width="2">${fingers}
<path d="M96,332 C86,300 90,260 104,232 C110,218 126,216 130,228 C134,242 128,262 126,292 C125,310 122,326 118,340 Z"/></g>
<path d="${creases}" fill="none" stroke="${edge}" stroke-width="1.2" opacity=".55"/>
<ellipse cx="118" cy="226" rx="7" ry="9" transform="rotate(-15 118 226)" fill="${light}" stroke="${edge}" stroke-width="1.2"/>
<path d="M108,262 q8,4 17,0 M110,276 q7,3 14,0" fill="none" stroke="${edge}" stroke-width="1.2" opacity=".55"/>
${bl}
<line x1="195" y1="100" x2="266" y2="100" class="hand-processor-line" stroke-width="1"/>
<text x="270" y="104" class="hand-processor-label">Procesador</text></svg>`;
  $('hsvg').classList.toggle('pulse',li>=4);
  $('hT').textContent=Th.toFixed(1)+' \u00b0C';$('hS').textContent='en el instante t = '+R.tim[s].toFixed(0)+' s';
  $('mk').style.left='calc('+Math.max(0,Math.min(1,(Th-30)/25))*100+'% - 2px)';
  const lb=$('hLv');lb.textContent=lv.n;lb.style.borderLeft='5px solid '+lv.c;$('hDs').textContent=lv.d;
}
let LS=null;
function liveInit(){
  const p=readP(),nx=Math.round(L/dx)+1,ny=Math.round(W/dx)+1,N=nx*ny,al=p.k/(rho*cp),dt=.9*dx*dx/(4*al);
  const cm=new Uint8Array(N),hd=[],ch=[],h=new Float64Array(N);let nc=0;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=i*dx,y=j*dx,q=j*nx+i;
    if(Math.abs(x-.75*L)<.007&&Math.abs(y-W/2)<.007){cm[q]=1;ch.push(q);nc++}
    h[q]=x<.55*L?p.hm:p.ha;if(x<.55*L)hd.push(q)}
  const off=document.createElement('canvas');off.width=nx;off.height=ny;
  LS={p,nx,ny,N,dt,a:dt*al/(dx*dx),b:dt/(rho*cp*p.d),cm,ch,hd,h,nc,T:new Float64Array(N).fill(p.Ta),Tn:new Float64Array(N),t:0,eff:1,mc:p.Ta,play:LS?LS.play:true,tool:LS?LS.tool:'heat',down:false,pt:null,off,box:null};
}
function liveFrame(){
  const S=LS;if(!S||$('tab2').hidden)return;const{nx,ny,N,cm,h,p}=S;
  if(S.play){
    const ns=Math.min(500,Math.max(1,Math.round(+$('lsp').value/60/S.dt))),thr=$('lth').checked;
    for(let n=0;n<ns;n++){
      if(n%10===0){let mc=-1e9;for(const q of S.ch)if(S.T[q]>mc)mc=S.T[q];S.mc=mc;S.eff=thr?Math.max(.35,Math.min(1,1-(mc-48)/14)):1}
      const sv=p.P*S.eff/(S.nc*dx*dx),T=S.T,Tn=S.Tn;
      for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const q=j*nx+i,c=T[q];
        const sm=(i<nx-1?T[q+1]:c)+(i>0?T[q-1]:c)+(j<ny-1?T[q+nx]:c)+(j>0?T[q-nx]:c)-4*c;
        Tn[q]=c+S.a*sm+S.b*((cm[q]?sv:0)-h[q]*(c-p.Ta))}
      S.T=Tn;S.Tn=T;S.t+=S.dt}
  }
  if(S.down&&S.pt){const R0=7,{i:ci,j:cj}=S.pt;
    for(let j=Math.max(0,cj-R0);j<=Math.min(ny-1,cj+R0);j++)for(let i=Math.max(0,ci-R0);i<=Math.min(nx-1,ci+R0);i++){
      const g=Math.exp(-((i-ci)**2+(j-cj)**2)/(2*(R0/2.2)**2)),q=j*nx+i;
      S.T[q]=S.tool==='heat'?Math.min(130,S.T[q]+1.6*g):Math.max(p.Ta-12,S.T[q]-2*g)}}
  liveDraw();
}
function liveDraw(){
  const S=LS,cv=$('live'),[c,w,hh]=setup(cv),{nx,ny,T,p}=S,Ta=p.Ta,m=14,sc=Math.min((w-2*m)/L,(hh-2*m)/W),bw=L*sc,bh=W*sc,x0=(w-bw)/2,y0=(hh-bh)/2;
  S.box={x0,y0,sc,bh};
  const oc=S.off.getContext('2d'),im=oc.createImageData(nx,ny);
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const col=cmap((T[j*nx+i]-(Ta-5))/50),q=((ny-1-j)*nx+i)*4;im.data[q]=col[0];im.data[q+1]=col[1];im.data[q+2]=col[2];im.data[q+3]=255}
  oc.putImageData(im,0,0);c.fillStyle='#05070b';c.fillRect(0,0,w,hh);
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(S.off,x0,y0,bw,bh);
  c.strokeStyle='#e6edf7';c.lineWidth=2;c.strokeRect(x0,y0,bw,bh);
  c.strokeStyle='#22d3ee';c.lineWidth=1.2;c.strokeRect(x0+(.75*L-.007)*sc,y0+bh-(W/2+.007)*sc,.014*sc,.014*sc);
  c.setLineDash([6,4]);c.strokeStyle='#5fd38d';c.strokeRect(x0,y0,.55*L*sc,bh);c.setLineDash([]);
  c.font='11px sans-serif';c.fillStyle='#8ea0b8';c.textAlign='left';c.fillText('Zona de la mano',x0+6,y0+14);c.fillText('Procesador',x0+(.75*L-.007)*sc-6,y0+bh-(W/2+.007)*sc-6);
  for(let k=0;k<100;k++){const col=cmap(k/99);c.fillStyle='rgb('+col.map(Math.round)+')';c.fillRect(w-150+k,hh-20,1,8)}
  c.fillStyle='#8ea0b8';c.textAlign='left';c.fillText((Ta-5)+' \u00b0C',w-150,hh-24);c.textAlign='right';c.fillText((Ta+45)+' \u00b0C',w-50,hh-24);
  if(S.pt){const px=x0+S.pt.i*dx*sc,py=y0+bh-S.pt.j*dx*sc,tv=T[S.pt.j*nx+S.pt.i];
    c.strokeStyle=S.tool==='heat'?'#ff7a45':'#7dd3fc';c.lineWidth=1.5;c.beginPath();c.arc(px,py,7*dx*sc,0,7);c.stroke();
    c.strokeStyle='#fff';c.lineWidth=1;c.beginPath();c.moveTo(px-12,py);c.lineTo(px+12,py);c.moveTo(px,py-12);c.lineTo(px,py+12);c.stroke();
    c.font='bold 13px sans-serif';c.fillStyle='#fff';c.textAlign='left';c.strokeStyle='#000';c.lineWidth=3;c.strokeText(tv.toFixed(1)+' \u00b0C',px+14,py-10);c.fillText(tv.toFixed(1)+' \u00b0C',px+14,py-10)}
  let Th=-1e9;for(const q of S.hd)if(T[q]>Th)Th=T[q];const lv=LV[LV.findIndex(l=>Th<l.m)];
  $('lt').textContent=Math.floor(S.t/60)+' min '+Math.round(S.t%60)+' s';
  $('lc').textContent=S.mc.toFixed(1)+' \u00b0C';$('le').textContent='potencia efectiva: '+(S.eff*p.P).toFixed(1)+' W ('+Math.round(S.eff*100)+' %)';
  $('lh').textContent=Th.toFixed(1)+' \u00b0C';$('ll').textContent=lv.n;$('ll').style.color=lv.c;
}
function livePt(e){const S=LS,r=$('live').getBoundingClientRect(),b=S.box;if(!b)return null;
  const i=Math.round((e.clientX-r.left-b.x0)/b.sc/dx),j=Math.round((b.y0+b.bh-(e.clientY-r.top))/b.sc/dx);
  return i>=0&&i<S.nx&&j>=0&&j<S.ny?{i,j}:null}
const lv_=$('live');
lv_.addEventListener('pointerdown',e=>{if(!LS)return;lv_.setPointerCapture(e.pointerId);LS.down=true;LS.pt=livePt(e)});
lv_.addEventListener('pointermove',e=>{if(LS)LS.pt=livePt(e)});
['pointerup','pointercancel'].forEach(n=>lv_.addEventListener(n,()=>{if(LS)LS.down=false}));
lv_.addEventListener('pointerleave',()=>{if(LS){LS.pt=null;LS.down=false}});
$('lpl').addEventListener('click',()=>{LS.play=!LS.play;$('lpl').textContent=LS.play?'Pausar':'Reanudar'});
$('lre').addEventListener('click',()=>{liveInit()});
$('lhe').addEventListener('click',()=>{LS.tool='heat';$('lhe').classList.add('on');$('lic').classList.remove('on')});
$('lic').addEventListener('click',()=>{LS.tool='ice';$('lic').classList.add('on');$('lhe').classList.remove('on')});
$('lsp').addEventListener('input',()=>{$('lspo').textContent=$('lsp').value+'x'});
function liveLoop(){liveFrame();requestAnimationFrame(liveLoop)}
function readP(){return{P:+$('P').value,t:+$('T').value*60,Ta:+$('A').value,k:+$('K').value,d:+$('D').value/1000,ha:+$('Ha').value,hm:+$('Hm').value}}
function labels(){$('oP').textContent=$('P').value+' W';$('oT').textContent=$('T').value+' min';$('oA').textContent=$('A').value+' °C';$('oK').textContent=(+$('K').value<10?'bajo':+$('K').value<50?'medio':'alto');$('oD').textContent=$('D').value+' mm';const lw=(v,a,b)=>v<a?'bajo':v<b?'medio':'alto';$('oHa').textContent=lw(+$('Ha').value,15,28);$('oHm').textContent=lw(+$('Hm').value,40,90)}
function stamp(){const s=+$('S').value;$('oS').textContent=(R.tim[s]).toFixed(0)+' s ('+(R.tim[s]/60).toFixed(1)+' min)';const sn=R.snaps[s];$('hdC').textContent=chipMax(sn).toFixed(1)+' °C';$('hdH').textContent=handMax(sn).toFixed(1)+' °C'}
function chipMax(sn){let m=-1e9;for(let j=0;j<R.ny;j++)for(let i=0;i<R.nx;i++){const x=i*dx,y=j*dx,v=sn[j*R.nx+i];if(Math.abs(x-.75*L)<.007&&Math.abs(y-W/2)<.007&&v>m)m=v}return m}
function run(){
  labels();R=sim(readP());const last=R.ser[R.ser.length-1],p=R.p;
  $('c1').textContent=last[1].toFixed(1)+' °C';$('c1s').textContent=(last[1]-p.Ta>=0?'+':'')+(last[1]-p.Ta).toFixed(1)+' °C respecto al ambiente';
  $('c2').textContent=last[3].toFixed(1)+' °C';$('c3').textContent=last[2].toFixed(1)+' °C';
  $('c4').textContent=(R.al*1e6).toFixed(1)+' mm²/s';$('c4s').textContent='paso de tiempo: '+(R.dt*1000).toFixed(0)+' ms';
  $('alert').style.display=handMax(R.snaps[R.snaps.length-1])>41?'block':'none';
  stamp();drawHeat();drawHand();drawCharts();liveInit();
}
function redraw(){if(!R)return;stamp();drawHeat();drawHand();drawCharts()}
const dk=()=>{const t=document.documentElement.dataset.theme;return t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches};
$('thm').addEventListener('click',()=>{document.documentElement.dataset.theme=dk()?'light':'dark';redraw()});
addEventListener('pointermove',e=>{const r=document.documentElement.style;r.setProperty('--mx',e.clientX+'px');r.setProperty('--my',e.clientY+'px')},{passive:true});
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===b));['tab1','tab2','tab3'].forEach(id=>$(id).hidden=id!==b.dataset.t);redraw()}));
let tp=null;
function tStop(){clearInterval(tp);tp=null;$('tpl').textContent='Reproducir'}
$('tpl').addEventListener('click',()=>{if(tp){tStop();return}
  if(+$('S').value>=+$('S').max)$('S').value=0;$('tpl').textContent='Pausar';redraw();
  tp=setInterval(()=>{const v=+$('S').value;if(v>=+$('S').max){tStop();return}$('S').value=v+1;redraw()},90)});
$('S').addEventListener('input',()=>{if(tp)tStop()});
let tm;['P','T','A','K','D','Ha','Hm'].forEach(id=>$(id).addEventListener('input',()=>{clearTimeout(tm);labels();tm=setTimeout(run,60)}));
$('uso').addEventListener('change',e=>{$('P').value=e.target.value;run()});
$('S').addEventListener('input',redraw);
window.addEventListener('resize',redraw);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',redraw);
run();liveLoop();
