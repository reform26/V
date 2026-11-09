/* 읍면동 득표율 지도 (전체 화면 창). 데이터: data/dong-map.js (tools/build-dong-data.py 로 생성, 광역비례 득표)
 * 열기: RFDong.open({sgg:'2110201'}) 선거구의 동들 / RFDong.open({south:true}) 경기남부 / RFDong.open({sido:'경기',city:'수원'}) / RFDong.open() 전체
 * index.html: 지도 위 '읍면동 지도' 버튼, 선거구 패널 하단 버튼, 경기남부 자세히 보기 컨트롤에 연결됩니다. dong.html 은 같은 창을 전체 화면으로 띄웁니다. */
(function(){
 const ABS=[2,2.5,3.5,4.5,6],DIF=[-1,-.3,.3,1,2.5],esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const LIGHT='--c0:#e8f1fb;--c1:#c3dcf5;--c2:#8fbfe9;--c3:#4f95d6;--c4:#2368b5;--c5:#0d3f80;--d0:#2b6cb0;--d1:#8fb7dd;--d2:#e5e7eb;--d3:#f3b27a;--d4:#e5792a;--d5:#a8480c;--bg:#fff;--fg:#1a1d22;--mut:#6b7280',
  DARK='--c0:#1f3550;--c1:#27507c;--c2:#2f6ba3;--c3:#4a8fd0;--c4:#7db3e8;--c5:#b8d8f5;--d0:#5b9bd5;--d1:#34597d;--d2:#3a3f46;--d3:#8a5a33;--d4:#c2682a;--d5:#f09a55;--bg:#1a1d22;--fg:#e8eaed;--mut:#9aa0a6';
 const CSS=`.dg{${LIGHT};position:fixed;inset:0;z-index:1000;background:var(--bg);color:var(--fg);display:flex;flex-direction:column;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);font:14px/1.5 Pretendard,system-ui,sans-serif}
@media(prefers-color-scheme:dark){html:not([data-theme=light]) .dg{${DARK}}}html[data-theme=dark] .dg{${DARK}}
.dg.page{position:static;height:100vh}.dg-h{display:flex;flex-wrap:wrap;gap:8px;padding:10px 12px;align-items:center;border-bottom:1px solid var(--d2)}.dg-h b{flex:1 1 100%;font-size:15px}
.dg select,.dg button,.dg-open{font:inherit;padding:6px 10px;border:1px solid var(--mut);border-radius:8px;background:var(--bg);color:var(--fg);cursor:pointer}
.dg-b{flex:1;min-height:0;display:grid;grid-template-columns:1fr 280px}.dg-b svg{width:100%;height:100%;min-height:320px}.dg path{stroke:var(--bg);stroke-width:.5;cursor:pointer}.dg path:hover,.dg path.on{stroke:var(--fg);stroke-width:1.6}
.dg-l{overflow:auto;border-left:1px solid var(--d2);padding:8px 12px;margin:0;list-style:none}.dg-l li{display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid var(--d2);cursor:pointer}.dg-l small{color:var(--mut)}
.dg-i{padding:8px 12px;border-top:1px solid var(--d2);min-height:40px}.dg-g{display:flex;gap:4px;flex-wrap:wrap;align-items:center;padding:4px 12px;font-size:12px;color:var(--mut)}.dg-g i{width:20px;height:10px;display:inline-block}
.dg-open{margin:6px 0 0}.dg .dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:5px}.dg label.gp{display:flex;gap:4px;align-items:center;font-size:13px}.dg path.dim{opacity:.15}.dg-i .jmp{margin-left:8px;padding:2px 8px;font-size:12px}@media(max-width:860px){.dg-b{grid-template-columns:1fr;grid-template-rows:55% 45%}.dg-l{border-left:0;border-top:1px solid var(--d2)}}`;
 let DATA=null,st=null;
 const load=()=>DATA||(DATA=new Promise((res,rej)=>{if(window.RF_DONG)return res();const t=document.createElement('script');t.src='data/dong-map.js?v=1';t.onload=res;t.onerror=()=>rej(new Error('data/dong-map.js 를 불러오지 못했습니다'));document.head.appendChild(t)}).then(()=>({F:RF_DONG.features,meta:RF_DONG.meta})));
 const bin=(v,b)=>b.filter(x=>v>=x).length;
 /* ---------- 당협 연계: 동 → 선거구(d, SGG_Code) → 당협위원장(data/chairpersons) ---------- */
 const ST={chairperson:'당협위원장',organizing_chair:'조직위원장',application:'조직위 신청'},ORD=Object.keys(ST),OC={chairperson:'#f26b00',organizing_chair:'#12a37f',application:'#7c5cf0',none:'#9ca3af'};
 let ORG=null;const orgMap=()=>{if(ORG)return ORG;let ps=[];try{ps=(window.RFMap&&RFMap.D&&RFMap.D.persons)||((window.RF_FALLBACK||{})['data/chairpersons.json']||{}).chairpersons||[]}catch(e){}
  ORG=new Map();ps.forEach(p=>{const k=String(p.districtId||p.sggCode||'');if(k){if(!ORG.has(k))ORG.set(k,[]);ORG.get(k).push(p)}});ORG.forEach(a=>a.sort((x,y)=>ORD.indexOf(x.status)-ORD.indexOf(y.status)));return ORG};
 const orgSt=d=>{const a=orgMap().get(d);return a&&a[0]?a[0].status:'none'};
 const dName=(d,sido)=>{const n=(window.RFMap&&RFMap.D&&RFMap.D.dMap.get(d))||null;if(n&&n.name)return n.name;const t=(window.RF_DISTRICT_NAMES||{})[d];if(t)return sido+' '+t;const a=orgMap().get(d);return a&&a[0]?(a[0].sggName||a[0].districtName||''):'선거구 '+d};
 const persHtml=d=>{const a=orgMap().get(d);return a&&a.length?a.map(p=>`<span style="white-space:nowrap"><i class="dot" style="background:${OC[p.status]||OC.none}"></i>${esc(p.name)} <small style="color:var(--mut)">${esc(ST[p.status]||'')}</small></span>`).join(' · '):'<span style="color:var(--mut)">등록된 위원장 정보 없음</span>'};
 async function open(o){
  o=o||{};if(!st){st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st)}
  document.querySelectorAll('.dg:not(.page)').forEach(e=>e.remove());
  const ov=document.createElement('div');ov.className='dg'+(o.page?' page':'');
  ov.innerHTML=`<div class="dg-h"><b></b><select class="s" aria-label="시도"></select><select class="c" aria-label="시군구"></select><select class="m" aria-label="색 기준"><option value="abs">득표율</option><option value="dif">시도 평균 대비</option><option value="org">당협 조직 현황</option></select><label class="gp"><input type="checkbox" class="g"> 위원장 없는 선거구 강조</label>${o.page?'':'<button class="x" type="button">닫기 ✕</button>'}</div>
  <div class="dg-b"><svg role="img" aria-label="읍면동 득표율 지도"></svg><ol class="dg-l"></ol></div><div class="dg-g"></div><div class="dg-i">불러오는 중…</div>`;
  document.body.appendChild(ov);const $=s=>ov.querySelector(s),svg=$('svg'),info=$('.dg-i');
  const onKey=e=>{if(e.key==='Escape')close()},close=()=>{ov.remove();document.removeEventListener('keydown',onKey);document.body.style.overflow=''};
  if(!o.page){document.addEventListener('keydown',onKey);document.body.style.overflow='hidden';$('.x').onclick=close}
  let D;try{D=await load()}catch(e){DATA=null;info.textContent='데이터를 불러오지 못했습니다: '+e.message+' — data/dong-map.js 가 사이트에 함께 올라갔는지 확인하세요.';return}
  const F=D.F,meta=D.meta,sidos=[...new Set(F.map(f=>f.properties.s))],SOUTH=((window.RF_REGIONS||{}).gyeonggiSouth||{cities:[]}).cities.map(c=>c.stem);
  let sgg=o.sgg||'',south=!!o.south,sel=null;
  if(sgg){const f=F.find(f=>f.properties.d===sgg);o.sido=f?f.properties.s:o.sido}
  $('.s').innerHTML=sidos.map(s=>`<option>${s}</option>`).join('');$('.s').value=sidos.includes(o.sido)?o.sido:(south?'경기':'경기');
  const cities=()=>{const s=$('.s').value;$('.c').innerHTML='<option value="">시군구 전체</option>'+[...new Set(F.filter(f=>f.properties.s===s).map(f=>f.properties.g))].sort().map(c=>`<option>${c}</option>`).join('')};
  cities();if(o.city){const v=[...$('.c').options].map(x=>x.value).find(v=>v&&v.startsWith(o.city));if(v)$('.c').value=v}
  let path=null;const mer=(x,y)=>[x,-Math.log(Math.tan(Math.PI/4+y*Math.PI/360))*180/Math.PI],col=(p,m)=>m==='org'?OC[orgSt(p.d)]:`var(--${m==='abs'?'c':'d'}${bin(m==='abs'?p.r:Math.round((p.r-meta.sidoRate[p.s])*100)/100,m==='abs'?ABS:DIF)})`;
  const distHtml=d=>{if(!d)return '';const sib=F.filter(f=>f.properties.d===d);return `<div><b>${esc(dName(d,(sib[0]||{properties:{}}).properties.s||''))}</b> · 동 ${sib.length}개 · ${persHtml(d)}${(window.RFMap&&RFMap.els&&RFMap.els.has(d))?` <button type="button" class="jmp" data-jump="${d}">선거구 보기</button>`:` <a class="jmp" href="index.html#${d}">선거구 보기</a>`}</div>`};
  const show=f=>{const p=f.properties,sib=F.filter(x=>x.properties.d===p.d&&p.d).sort((a,b)=>b.properties.r-a.properties.r),rk=sib.findIndex(x=>x.properties.c===p.c)+1;sel=p.c;
   info.innerHTML=`<div><b>${esc(p.s)} ${esc(p.n)}</b> — 득표율 ${p.r.toFixed(2)}% · ${p.v.toLocaleString('ko-KR')}표 <small style="color:var(--mut)">(${esc(p.s)} 평균 ${meta.sidoRate[p.s]}%${rk?` · 선거구 내 ${rk}/${sib.length}위`:''})</small></div>${distHtml(p.d)||'<div style="color:var(--mut)">연결된 선거구 없음</div>'}`;
   svg.querySelectorAll('path').forEach(e=>e.classList.toggle('on',e.dataset.c===p.c))};
  function draw(){
   const s=$('.s').value,c=$('.c').value,m=$('.m').value,gap=$('.g').checked;let fs=F.filter(f=>f.properties.s===s);
   if(sgg)fs=fs.filter(f=>f.properties.d===sgg);else if(c)fs=fs.filter(f=>f.properties.g===c);else if(south)fs=fs.filter(f=>SOUTH.some(t=>f.properties.g.startsWith(t)));
   const nm=window.RFData&&sgg&&RFMap&&RFMap.D.dMap.get(sgg);
   $('b').textContent=sgg?`${dName(sgg,s)} — 읍면동별 득표율 (${fs.length}개 동)`:south&&!c?'경기남부 — 읍면동별 득표율':'읍면동별 득표율 (2026 지방선거 광역비례)';
   const r=svg.getBoundingClientRect(),w=Math.max(r.width,320),h=Math.max(r.height,320);const T=d3.geoTransform({point(x,y){const q=mer(x,y);this.stream.point(q[0],q[1])}}),bb=d3.geoPath(T).bounds({type:'FeatureCollection',features:fs}),
    k=fs.length?.95*Math.min(w/(bb[1][0]-bb[0][0]),h/(bb[1][1]-bb[0][1])):1,ox=(w-k*(bb[1][0]-bb[0][0]))/2,oy=(h-k*(bb[1][1]-bb[0][1]))/2;
   path=d3.geoPath(d3.geoTransform({point(x,y){const q=mer(x,y);this.stream.point((q[0]-bb[0][0])*k+ox,(q[1]-bb[0][1])*k+oy)}}));svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
   svg.innerHTML=fs.map(f=>`<path fill-rule="evenodd" data-c="${f.properties.c}" d="${path(f)||''}" fill="${col(f.properties,m)}" class="${gap&&orgSt(f.properties.d)!=='none'?'dim':''}"><title>${esc(f.properties.n)} ${f.properties.r}%${orgSt(f.properties.d)!=='none'?' · '+((orgMap().get(f.properties.d)||[])[0]||{}).name:''}</title></path>`).join('');
   const byC=new Map(fs.map(f=>[f.properties.c,f]));
   $('.dg-l').innerHTML=[...fs].sort((a,b)=>b.properties.r-a.properties.r).map(f=>`<li data-c="${f.properties.c}"><span><i class="dot" style="background:${OC[orgSt(f.properties.d)]}"></i>${esc(f.properties.n.split(' ').pop())} <small>${esc(f.properties.g)}${orgSt(f.properties.d)!=='none'?' · '+esc(((orgMap().get(f.properties.d)||[])[0]||{}).name):''}</small></span><b>${f.properties.r.toFixed(2)}%</b></li>`).join('');
   if(m==='org')$('.dg-g').innerHTML='선거구 조직 현황 '+[...ORD,'none'].map(k=>`<i style="background:${OC[k]}"></i>${k==='none'?'정보 없음':ST[k]}`).join(' ');
   else{const L=m==='abs'?['~2','2~2.5','2.5~3.5','3.5~4.5','4.5~6','6~']:['~-1','-1~-.3','±.3','.3~1','1~2.5','2.5~'];
   $('.dg-g').innerHTML=(m==='abs'?'득표율(%) ':'시도 평균 대비(%p) ')+L.map((t,i)=>`<i style="background:var(--${m==='abs'?'c':'d'}${i})"></i>${t}`).join(' ')+(gap?' · 흐린 곳은 위원장이 있는 선거구':'')}
   info.innerHTML=fs.length?(sgg?distHtml(sgg)+'<div style="color:var(--mut)">지도나 목록의 동을 눌러 득표율을 확인하세요.</div>':'지도나 목록을 눌러 동별 득표율과 당협 정보를 확인하세요. (광역비례 기준)'):'표시할 동이 없습니다.';
   ov._pick=c=>{const f=byC.get(c);if(f)show(f)}};
  ov.addEventListener('click',e=>{const j=e.target.closest('[data-jump]');if(j){const d=j.dataset.jump;close();try{RFMap.select(d);RFMap.focusOn&&RFMap.focusOn(d)}catch(x){}return}const t=e.target.closest('[data-c]');if(t&&ov._pick)ov._pick(t.dataset.c)});
  $('.s').onchange=()=>{sgg='';south=false;cities();draw()};$('.c').onchange=()=>{sgg='';south=false;draw()};$('.m').onchange=draw;$('.g').onchange=draw;
  addEventListener('resize',()=>ov.isConnected&&draw());draw();
 }
 window.RFDong={open,has:async id=>(await load()).F.some(f=>f.properties.d===id)};
 /* ---------- index.html 연결 ---------- */
 const CSS2=`#map.dg-on>svg:not(#dsvg),#map.dg-on>.map-empty{display:none}#dsvg{display:block;width:100%;touch-action:none;cursor:grab}#dsvg path{stroke:var(--card);stroke-width:.5;cursor:pointer;vector-effect:non-scaling-stroke}#dsvg path:hover{stroke:var(--tx);stroke-width:1.5}#dsvg path.sel{stroke:var(--sel);stroke-width:2.5}#dsvg path.dim{opacity:.18}
.dgp .dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:5px}.dgp .big{font-size:30px;font-weight:800;line-height:1.2}.dgp ul{list-style:none;margin:8px 0;padding:0}.dgp li{display:flex;justify-content:space-between;gap:8px;padding:8px 4px;border-bottom:1px solid rgba(128,128,128,.25);cursor:pointer}.dgp li small,.dgp .sub{color:var(--tx2,#6b7280);font-size:12.5px}.dgp .acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.dgp .acts button{padding:7px 12px;border:1px solid rgba(128,128,128,.4);border-radius:10px;background:transparent;color:inherit;font:inherit;font-size:13px;cursor:pointer}.dgp .box{margin:10px 0;padding:10px 12px;border-radius:12px;background:rgba(128,128,128,.12)}`;
 if(document.body.dataset.page==='index'&&window.RFMapReady)window.RFMapReady.then(async()=>{
  const $=id=>document.getElementById(id),wrap=document.querySelector('.map-wrap'),host=$('map'),panel=$('panel');if(!wrap||!host||!panel)return;
  if(!st){st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st)}
  const st2=document.createElement('style');st2.textContent=CSS2;document.head.appendChild(st2);
  const btn=(txt,fn)=>{const b=document.createElement('button');b.type='button';b.className='dg-open';b.textContent=txt;b.onclick=fn;return b};
  let view='sgg';
  /* 선거구 패널 하단: 이 선거구의 동만 크게 보기(창) */
  new MutationObserver(async()=>{const sx=RFMap.selected();if(!sx||view==='dong'||panel.querySelector('.dg-open'))return;
   try{if(!(await RFDong.has(sx))||panel.querySelector('.dg-open')||RFMap.selected()!==sx)return}catch(e){return}
   panel.appendChild(btn('읍면동별 득표 지도 보기',()=>RFDong.open({sgg:sx})))}).observe(panel,{childList:true});
  /* '선거구 | 읍면동' 전환 */
  let mm=null;for(let i=0;i<30&&!(mm=wrap.querySelector('.map-mode'));i++)await new Promise(r=>setTimeout(r,100));
  if(!mm){mm=document.createElement('div');mm.className='map-mode';wrap.appendChild(mm)}
  const seg=document.createElement('div');seg.className='mm-seg';seg.setAttribute('role','group');seg.setAttribute('aria-label','지도 단위');
  seg.innerHTML='<button type="button" data-v="sgg" aria-pressed="true">선거구</button><button type="button" data-v="dong" aria-pressed="false">읍면동</button>';mm.insertBefore(seg,mm.firstChild);
  let F=null,meta=null,only='',selC='',dsvg=null,vb=null,fit=null,H=420,moved=false;
  const heatMode=()=>((wrap.querySelector('.map-mode [data-m][aria-pressed=true]')||{}).dataset||{}).m||'org',
   metric=()=>((wrap.querySelector('#mmopts [data-k][aria-pressed=true]')||{}).dataset||{}).k||'abs',
   gapOn=()=>{const c=wrap.querySelector('#mmopts [data-o=gap]');return !!(c&&c.checked)&&heatMode()==='vote'};
  const gsOn=()=>$('gsctl')&&!$('gsctl').hidden,gsCity=()=>{const c=$('gschips')&&$('gschips').querySelector('.chip.on');return c?c.dataset.city:''};
  const scoped=()=>{let fs=F;
   if(gsOn()){const cs=((window.RF_REGIONS||{}).gyeonggiSouth||{cities:[]}).cities,c=gsCity(),stems=(c?cs.filter(x=>x.name===c):cs).map(x=>x.stem);fs=F.filter(f=>f.properties.s==='경기'&&stems.some(t=>f.properties.g.startsWith(t)))}
   else{const v=($('sido')||{}).value||'';if(v)fs=F.filter(f=>v.startsWith(f.properties.s)||f.properties.s.startsWith(v))}
   return only?fs.filter(f=>f.properties.d===only):fs};
  const scopeLabel=()=>gsOn()?(gsCity()||'경기남부'):(($('sido')||{}).value||'전국');
  const cls=(p,m)=>{if(m==='org')return 's-'+orgSt(p.d);const dif=metric()==='dif';return dif?'hd'+bin(Math.round((p.r-meta.sidoRate[p.s])*100)/100,DIF):'hv'+bin(p.r,ABS)};
  const liHtml=f=>{const p=f.properties,a=orgMap().get(p.d),n=a&&a[0];return `<li data-c="${p.c}"><span><i class="dot" style="background:${OC[orgSt(p.d)]}"></i>${esc(p.n.split(' ').pop())} <small>${esc(p.g)}${n?' · '+esc(n.name):''}</small></span><b>${p.r.toFixed(2)}%</b></li>`};
  function showHome(fs){
   if(!fs.length){panel.innerHTML=`<div class="dgp"><span class="sido">${esc(scopeLabel())}</span><h2>읍면동 보기</h2><p class="muted">이 지역은 읍면동 득표 데이터가 아직 없어요. (현재 서울·부산·대구·울산·경기·경북·경남·제주만 있습니다)</p></div>`;return}
   const top=[...fs].sort((a,b)=>b.properties.r-a.properties.r).slice(0,12);
   panel.innerHTML=`<div class="dgp"><span class="sido">${esc(scopeLabel())}${only?' · '+esc(dName(only,fs[0].properties.s)):''}</span><h2>읍면동별 득표율</h2><p class="muted">지도에서 동을 선택하세요. 2026 지방선거 광역비례 · ${fs.length}개 동${only?'':''}</p>
    ${only?'<div class="acts"><button type="button" data-act="all">선거구 제한 해제</button></div>':''}<h3 style="font-size:15px;margin:14px 0 0">득표율 높은 동</h3><ul>${top.map(liHtml).join('')}</ul></div>`}
  function showDong(f){const p=f.properties,sib=p.d?F.filter(x=>x.properties.d===p.d).sort((a,b)=>b.properties.r-a.properties.r):[],rk=sib.findIndex(x=>x.properties.c===p.c)+1;
   panel.innerHTML=`<div class="dgp"><span class="sido">${esc(p.s)} ${esc(p.g)}</span><h2>${esc(p.n.split(' ').pop())}</h2>
    <div class="big">${p.r.toFixed(2)}%</div><div class="sub">${p.v.toLocaleString('ko-KR')}표 · ${esc(p.s)} 평균 ${meta.sidoRate[p.s]}%${rk?` · 선거구 내 ${rk}/${sib.length}위`:''}</div>
    <div class="box">${p.d?`<b>${esc(dName(p.d,p.s))}</b><div class="sub">동 ${sib.length}개</div><div style="margin-top:6px">${persHtml(p.d)}</div>`:'<span class="sub">연결된 선거구 없음</span>'}</div>
    <div class="acts">${p.d?`<button type="button" data-act="goto" data-d="${p.d}">선거구 지도에서 보기</button><button type="button" data-act="only" data-d="${p.d}">이 선거구의 동만 보기</button>`:''}<button type="button" data-act="clear">선택 해제</button></div></div>`}
  function draw(){
   if(view!=='dong')return;const fs=scoped(),W=Math.max(host.clientWidth,320),m=heatMode(),gap=gapOn();
   if(!dsvg){const o=host.querySelector('svg:not(#dsvg)');H=Math.max(o?o.getBoundingClientRect().height:0,420);dsvg=document.createElementNS('http://www.w3.org/2000/svg','svg');dsvg.id='dsvg';dsvg.setAttribute('role','img');dsvg.setAttribute('aria-label','읍면동 득표율 지도');host.appendChild(dsvg);host.classList.add('dg-on')}
   dsvg.style.height=H+'px';
   dsvg.classList.toggle('heat',m==='vote');/* style.css 의 득표율 색 규칙은 '#map svg.heat' 아래에서만 적용됩니다 */
   if(fs.length){const T=d3.geoTransform({point(x,y){const q=[x,-Math.log(Math.tan(Math.PI/4+y*Math.PI/360))*180/Math.PI];this.stream.point(q[0],q[1])}}),bb=d3.geoPath(T).bounds({type:'FeatureCollection',features:fs}),
     k=.94*Math.min(W/(bb[1][0]-bb[0][0]),H/(bb[1][1]-bb[0][1])),ox=(W-k*(bb[1][0]-bb[0][0]))/2,oy=(H-k*(bb[1][1]-bb[0][1]))/2,
     path=d3.geoPath(d3.geoTransform({point(x,y){const q=[x,-Math.log(Math.tan(Math.PI/4+y*Math.PI/360))*180/Math.PI];this.stream.point((q[0]-bb[0][0])*k+ox,(q[1]-bb[0][1])*k+oy)}}));
    dsvg.innerHTML=`<g>${fs.map(f=>{const p=f.properties,a=orgMap().get(p.d),n=a&&a[0];return `<path fill-rule="evenodd" data-c="${p.c}" class="${cls(p,m)}${gap&&orgSt(p.d)!=='none'?' dim':''}${p.c===selC?' sel':''}" d="${path(f)||''}"><title>${esc(p.n)} ${p.r}%${n?' · '+esc(n.name):''}</title></path>`}).join('')}</g>`;
    fit=[0,0,W,H];vb=fit.slice();dsvg.setAttribute('viewBox',vb.join(' '));const sp=dsvg.querySelector('.sel');if(sp)sp.parentNode.appendChild(sp)}
   else{dsvg.innerHTML='';fit=vb=[0,0,W,H];dsvg.setAttribute('viewBox',vb.join(' '))}
   const sf=selC&&fs.find(f=>f.properties.c===selC);sf?showDong(sf):(selC='',showHome(fs))}
  const setVB=()=>dsvg.setAttribute('viewBox',vb.map(n=>+n.toFixed(2)).join(' '));
  function zoom(f,cx,cy){if(!dsvg||!fit)return;const nw=Math.min(fit[2],Math.max(fit[2]/14,vb[2]*f)),r=nw/vb[2],nh=vb[3]*r;
   cx=cx==null?vb[0]+vb[2]/2:cx;cy=cy==null?vb[1]+vb[3]/2:cy;vb=[cx-(cx-vb[0])*r,cy-(cy-vb[1])*r,nw,nh];setVB()}
  const pt=e=>{const r=dsvg.getBoundingClientRect();return[vb[0]+(e.clientX-r.left)/r.width*vb[2],vb[1]+(e.clientY-r.top)/r.height*vb[3]]};
  [['zin',.7],['zout',1/.7],['zreset',0]].forEach(([id,f])=>{const b=$(id);if(b)b.addEventListener('click',e=>{if(view!=='dong')return;e.stopImmediatePropagation();e.preventDefault();if(f)zoom(f);else{vb=fit.slice();setVB()}},true)});
  host.addEventListener('wheel',e=>{if(view!=='dong'||!dsvg)return;e.preventDefault();const p=pt(e);zoom(e.deltaY<0?.8:1.25,p[0],p[1])},{passive:false});
  host.addEventListener('pointerdown',e=>{if(view!=='dong'||e.button)return;moved=false;const sx=e.clientX,sy=e.clientY,v0=vb.slice(),r=dsvg.getBoundingClientRect();
   const mv=ev=>{const dx=ev.clientX-sx,dy=ev.clientY-sy;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;if(moved){vb=[v0[0]-dx/r.width*v0[2],v0[1]-dy/r.height*v0[3],v0[2],v0[3]];setVB()}},
    up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up)};addEventListener('pointermove',mv);addEventListener('pointerup',up)});
  host.addEventListener('click',e=>{if(view!=='dong'||moved)return;const t=e.target.closest('#dsvg path');if(!t)return;selC=t.dataset.c;draw()});
  panel.addEventListener('click',e=>{if(view!=='dong')return;const li=e.target.closest('li[data-c]'),ab=e.target.closest('[data-act]');
   if(li){selC=li.dataset.c;draw();return}if(!ab)return;const a=ab.dataset.act,d=ab.dataset.d;
   if(a==='clear'){selC='';draw()}else if(a==='all'){only='';draw()}else if(a==='only'){only=d;selC='';draw()}
   else if(a==='goto'){setView('sgg');try{RFMap.select(d);RFMap.focusOn&&RFMap.focusOn(d)}catch(x){}}});
  async function setView(v){
   if(v==='dong'&&!F){try{const D=await load();F=D.F;meta=D.meta}catch(e){panel.innerHTML='<p class="muted">읍면동 데이터를 불러오지 못했습니다: '+esc(e.message)+'</p>';return}}
   view=v;seg.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===v));
   const u=new URL(location.href);if(v==='dong')u.searchParams.set('unit','dong');else u.searchParams.delete('unit');history.replaceState(null,'',u.pathname+u.search+u.hash);
   if(v==='dong'){draw()}else{if(dsvg){dsvg.remove();dsvg=null}host.classList.remove('dg-on');only='';selC='';const sx=RFMap.selected();sx?RFMap.select(sx):RFMap.showHome()}}
  seg.addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(b&&b.dataset.v!==view)setView(b.dataset.v)});
  /* 다른 조작(시도·도시 칩·표시 기준)을 따라가기 */
  const redraw=(()=>{let t;return()=>{clearTimeout(t);t=setTimeout(()=>{if(view==='dong'){only='';draw()}},60)}})();
  const redrawKeep=(()=>{let t;return()=>{clearTimeout(t);t=setTimeout(()=>view==='dong'&&draw(),60)}})();
  if($('sido'))$('sido').addEventListener('change',redraw);
  if($('gsctl'))new MutationObserver(redraw).observe($('gsctl'),{attributes:true,attributeFilter:['hidden']});
  if($('gschips'))new MutationObserver(redraw).observe($('gschips'),{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  mm.addEventListener('click',redrawKeep);mm.addEventListener('change',redrawKeep);
  addEventListener('resize',redrawKeep);
  if(new URLSearchParams(location.search).get('unit')==='dong')setView('dong');
 });
 if(document.body.dataset.page==='dong'){const q=new URLSearchParams(location.search);open({page:true,sido:q.get('sido'),city:q.get('city'),sgg:q.get('sgg'),south:q.get('south')==='1'})}
})();
