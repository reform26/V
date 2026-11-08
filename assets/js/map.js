/* 경기남부 상세 보기(gs.js)가 쓰는 연결점: 지도 준비가 끝나면 RFMapReady가 API와 함께 완료됩니다 */
let _rfReady;window.RFMapReady=new Promise(r=>_rfReady=r);
(async function(){
 const host=document.getElementById('map');if(!host)return;
 const D=await RFData.load(),panel=document.getElementById('panel'),tip=document.getElementById('tip');
 let svg,view,orig,base,selected=null,moved=false,drag=null,homeFn=null,onSelect=null;const els=new Map();
 const dq=RFData.demo?'&demo=1':'';
 function home(){const n={};Object.keys(RFData.STATUS).forEach(k=>n[k]=D.persons.filter(p=>p.status===k).length);
  if(homeFn)return homeFn();
  const tot=D.persons.length,K=Object.keys(RFData.STATUS);
  panel.innerHTML=`<span class="sido">개혁신당</span><h2>당협 조직 현황</h2><p class="muted home-hint">지도에서 선거구를 선택하면 상세 정보가 보여요.</p>
  <div class="hero"><b>${tot}</b><span>명 등록</span></div>
  ${tot?`<div class="bar" role="img" aria-label="조직 상태별 비율">${K.filter(k=>n[k]).map(k=>`<i class="${k}" style="flex:${n[k]}"></i>`).join('')}</div>`:''}
  <div class="stat">${K.map(k=>`<span><span class="badge ${k}">${RFData.STATUS[k]}</span></span><b>${n[k]}</b>`).join('')}</div>
  <p class="muted note">회색 선거구는 등록된 정보가 없는 곳입니다. 공석이나 미임명을 뜻하지 않습니다.</p>
  ${D.ok?'':'<p class="muted">선거구 데이터를 불러오지 못했습니다.</p>'}${D.report.errors.length?`<p class="gs-warn">조직 현황 검증 오류 ${D.report.errors.length}건: ${esc(D.report.errors[0])}</p>`:''}`}
 function detail(id){
  const d=D.dMap.get(id),ps=D.psByD.get(id)||[];
  if(!d){panel.innerHTML=`<h2>${esc(id)}</h2><p class="muted">지도에는 있으나 선거구 목록에 없는 코드입니다.</p>`;return}
  let h=`<button type="button" class="to-map">← 지도로</button><span class="sido">${esc(d.sido)}</span><h2>${esc(d.name)}</h2>${areaHtml(id)}`;
  if(!ps.length)h+='<dl class="kv"><dt>조직 현황</dt><dd><span class="badge">정보 없음</span></dd></dl><p class="muted" style="font-size:13px">현재 등록된 조직 현황 정보가 없습니다.</p>';
  else h+=ps.map(p=>personDetailHtml(p,d,{link:true})).join('');
  panel.innerHTML=h;panel.scrollTop=0}
 /* 모바일: 선거구를 누르면 아래 상세 패널로 이동, 패널 위 '지도로' 버튼으로 복귀 */
 function toPanel(){if(matchMedia('(max-width:860px)').matches)panel.scrollIntoView({behavior:'smooth',block:'start'})}
 panel.addEventListener('click',e=>{if(e.target.closest('.to-map'))document.querySelector('.map-wrap').scrollIntoView({behavior:'smooth',block:'start'})});
 function select(id){
  if(selected&&els.get(selected))els.get(selected).classList.remove('sel');
  selected=id;const e=els.get(id);if(e){e.classList.add('sel');e.parentNode.appendChild(e)}
  history.replaceState(null,'','#'+encodeURIComponent(id));detail(id);if(onSelect)onSelect(id)}
 function clearSelection(){if(selected&&els.get(selected))els.get(selected).classList.remove('sel');selected=null;history.replaceState(null,'',location.pathname+location.search);home();if(onSelect)onSelect(null)}
 home();
 function buildGeoSvg(m){
  const rep={errors:[],warnings:[],info:[]};
  if(!m.geo||!m.rows){rep.errors.push('지도 파일을 찾지 못했습니다: '+(!m.geo?'GeoJSON ':'')+(!m.rows?'CSV':''));return{svg:null,report:rep}}
  if(typeof d3==='undefined'||!d3.geoPath){rep.errors.push('d3-geo 라이브러리를 불러오지 못했습니다');return{svg:null,report:rep}}
  const F=m.geo.features||[],W=800,H=900,code=f=>String((f.properties||{}).SGG_Code==null?'':f.properties.SGG_Code).trim();
  rep.info.push(`Feature ${F.length}개, CSV ${m.rows.length}행 (기대값 254)`);
  if(F.length!==254)rep.errors.push(`Feature 수가 254개가 아닙니다: ${F.length}`);
  if(m.rows.length!==254)rep.warnings.push(`CSV 행 수가 254개가 아닙니다: ${m.rows.length}`);
  const geo=new Map(),csv=new Map(m.rows.map(r=>[String(r.SGG_Code).trim(),r]));
  F.forEach((f,i)=>{const c=code(f);if(!c)rep.errors.push(`SGG_Code 누락: feature #${i}`);else if(geo.has(c))rep.errors.push(`SGG_Code 중복: ${c}`);else geo.set(c,f)});
  geo.forEach((f,c)=>{const r=csv.get(c);if(!r)rep.errors.push(`CSV에 없는 코드(GeoJSON에만 존재): ${c}`);
   else if(String(f.properties.SIDO_SGG||'').trim()!==String(r.SIDO_SGG||'').trim())rep.warnings.push(`선거구 명칭 불일치 ${c}: GeoJSON "${f.properties.SIDO_SGG}" / CSV "${r.SIDO_SGG}"`)});
  csv.forEach((r,c)=>{if(!geo.has(c))rep.errors.push(`GeoJSON에 없는 코드(CSV에만 존재): ${c} ${r.SIDO_SGG||''}`)});
  /* d3-geo는 구면 기하 기준이라 외곽 링이 시계 방향이어야 함. 방향이 반대면 지도 전체가 채워지므로 보정 */
  const area=r=>{let a=0;for(let i=0;i<r.length-1;i++)a+=r[i][0]*r[i+1][1]-r[i+1][0]*r[i][1];return a/2};
  const fix=rings=>rings.forEach((r,i)=>{const cw=area(r)<0;if(i===0?!cw:cw)r.reverse()});
  F.forEach(f=>{const g=f.geometry;if(!g)return;if(g.type==='Polygon')fix(g.coordinates);else if(g.type==='MultiPolygon')g.coordinates.forEach(fix)});
  const gp=d3.geoPath(d3.geoMercator().fitSize([W,H],m.geo));let out='',n=0;
  F.forEach(f=>{const c=code(f),p=c&&gp(f);if(!p||/NaN/.test(p)){rep.errors.push(`렌더링 실패: ${c||'(코드 없음)'}`);return}
   n++;out+=`<path id="${esc(c)}" d="${p}" vector-effect="non-scaling-stroke"/>`});
  rep.info.push(`렌더링 성공 ${n}개`);
  /* 시도 경계선: 선거구 GeoJSON의 공유 경계 중 시도가 달라지는 선(+해안선)만 추출. 새 지리 데이터는 만들지 않음 */
  let border='';
  if(window.topojson&&topojson.topology&&topojson.mesh){try{
   const so=g=>RFData.sidoName(String((g.properties||{}).SIDO||'').trim()),topo=topojson.topology({d:{type:'FeatureCollection',features:F}},1e5);
   const ln=topojson.mesh(topo,topo.objects.d,(a,b)=>a===b||so(a)!==so(b)),bp=gp(ln);
   if(bp&&!/NaN/.test(bp)){border=`<g id="sido-borders"><path d="${bp}" vector-effect="non-scaling-stroke"/></g>`;rep.info.push('시도 경계선 생성')}
   else rep.warnings.push('시도 경계선 경로 생성 실패')}catch(e){rep.warnings.push('시도 경계선 생성 실패: '+e.message)}}
  else rep.warnings.push('topojson 라이브러리를 불러오지 못해 시도 경계선을 그리지 않습니다');
  return{svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="제22대 국회의원 선거구 지도"><g id="districts">${out}</g>${border}</svg>`,report:rep}}
 function showReport(rep,meta){
  console.groupCollapsed(`[지도 검증] 오류 ${rep.errors.length} / 경고 ${rep.warnings.length}`);
  rep.info.forEach(x=>console.log(x));rep.warnings.forEach(x=>console.warn(x));rep.errors.forEach(x=>console.error(x));console.groupEnd();
  const el=document.getElementById('src');if(!el)return;
  const mm=meta||{provider:'오마이뉴스',license:'MIT',repository:'https://github.com/OhmyNews/2024_22_elec_map'};
  el.innerHTML+=` 출처: <a href="${esc(safeUrl(mm.repository))}" target="_blank" rel="noopener">${esc(mm.provider)} 22대 총선 선거구 지도</a> (${esc(mm.license)} 라이선스).`}
 let txt=null;
 if(RFData.demo){try{const r=await fetch(RFData.svgUrl);if(r.ok)txt=await r.text()}catch(e){}
  const el=document.getElementById('src');if(el)el.innerHTML+=' 현재 화면은 테스트용 지도입니다.'}
 else{const m=await RFData.loadMap(),o=buildGeoSvg(m);txt=o.svg;window.RFReport=o.report;showReport(o.report,m.meta)}
 if(!txt||!/<svg/i.test(txt)){host.innerHTML=`<div class="map-empty"><div><strong>지도 데이터를 불러오지 못했습니다</strong><p>data/map/ 폴더에 2024_22_Elec_simplify.json과 22_Elec_SGG.csv를 넣어 주세요.<br>자세한 원인은 개발자 콘솔을 확인하세요. (동작 확인: ?demo=1)</p></div></div>`;return}
 host.innerHTML=txt;svg=host.querySelector('svg');
 if(!svg.getAttribute('viewBox')){const b=svg.getBBox();svg.setAttribute('viewBox',`${b.x} ${b.y} ${b.width} ${b.height}`)}
 svg.removeAttribute('width');svg.removeAttribute('height');
 const vb=svg.viewBox.baseVal;orig={x:vb.x,y:vb.y,w:vb.width,h:vb.height};base={...orig};view={...orig};
 // 선거구 요소: JSON의 svgId(없으면 id)와 같은 SVG 요소
 const byS=new Map(D.districts.map(d=>[d.svgId||d.id,d.id]));
 svg.querySelectorAll('[id]').forEach(e=>{if(byS.has(e.id)){const id=byS.get(e.id);e.setAttribute('data-d',id);els.set(id,e);e.classList.add('s-'+D.status(id))}});
 const miss=D.districts.filter(d=>!els.has(d.id)).map(d=>d.id);
 if(miss.length)console.warn(`[지도] SVG에서 찾지 못한 선거구 ${miss.length}개:`,miss);
 const label=id=>{const d=D.dMap.get(id),p=D.pByD.get(id);return `<b>${esc(d.name)}</b><br>${p?esc(p.name)+' · '+esc(RFData.STATUS[p.status]||''):RFData.NONE_LABEL}`};
 svg.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const t=e.target.closest('[data-d]');
  if(t&&!moved){tip.innerHTML=label(t.dataset.d);tip.style.display='block';tip.style.left=Math.min(e.clientX+14,innerWidth-250)+'px';tip.style.top=e.clientY+14+'px'}else tip.style.display='none'});
 svg.addEventListener('pointerleave',()=>tip.style.display='none');
 const set=()=>{svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);svg.classList.toggle('zoomed',view.w<base.w*.97)};
 const scale=()=>{const r=svg.getBoundingClientRect();return Math.max(view.w/r.width,view.h/r.height)};
 function pt(e){const r=svg.getBoundingClientRect(),s=scale();
  return{x:view.x+view.w/2+(e.clientX-r.left-r.width/2)*s,y:view.y+view.h/2+(e.clientY-r.top-r.height/2)*s}}
 function zoom(f,c){const w=Math.min(orig.w*1.2,Math.max(orig.w/60,view.w*f)),k=w/view.w;
  c=c||{x:view.x+view.w/2,y:view.y+view.h/2};
  view={x:c.x-(c.x-view.x)*k,y:c.y-(c.y-view.y)*k,w,h:view.h*k};set()}
 svg.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?.85:1.18,pt(e))},{passive:false});
 /* 터치: 확대 상태에서만 한 손가락으로 이동(그 외에는 페이지 스크롤), 두 손가락으로 확대·축소 */
 const ptrs=new Map();let pinch=null;const dist=()=>{const [a,b]=[...ptrs.values()];return{d:Math.hypot(a.x-b.x,a.y-b.y),m:{clientX:(a.x+b.x)/2,clientY:(a.y+b.y)/2}}};
 svg.addEventListener('pointerdown',e=>{ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2){pinch={d:dist().d,w:view.w};drag=null;moved=true;tip.style.display='none';return}
  drag={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y,s:scale()};moved=false});
 addEventListener('pointermove',e=>{if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch&&ptrs.size>=2){const c=dist();if(c.d>0&&pinch.d>0)zoom(pinch.w*pinch.d/c.d/view.w,pt(c.m));return}
  if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(!moved&&Math.hypot(dx,dy)>4){moved=true;svg.classList.add('drag')}
  if(moved&&(e.pointerType!=='touch'||svg.classList.contains('zoomed'))){view.x=drag.vx-dx*drag.s;view.y=drag.vy-dy*drag.s;set()}});
 const up=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;if(ptrs.size)return;drag=null;svg.classList.remove('drag');setTimeout(()=>moved=false,0)};
 addEventListener('pointerup',up);addEventListener('pointercancel',up);
 /* 선택된 선거구를 다시 누르거나, 지도의 빈 곳을 누르거나, Esc를 누르면 선택 해제 (드래그 이동은 제외) */
 svg.addEventListener('click',e=>{if(moved)return;const t=e.target.closest('[data-d]');
  if(t){if(selected===t.dataset.d)clearSelection();else{select(t.dataset.d);toPanel()}}else if(selected)clearSelection()});
 addEventListener('keydown',e=>{if(e.key==='Escape'&&selected&&!/^(INPUT|SELECT|TEXTAREA)$/.test((e.target||{}).tagName||''))clearSelection()});
 document.getElementById('zin').onclick=()=>zoom(.8);document.getElementById('zout').onclick=()=>zoom(1.25);
 document.getElementById('zreset').onclick=()=>{view={...base};set()};
 const sel=document.getElementById('sido');
 sel.innerHTML='<option value="">전체 시도</option>'+RFData.SIDO.map(s=>`<option>${s}</option>`).join('');
 const applySido=on=>els.forEach((e,id)=>e.classList.toggle('dim',on!==false&&!!sel.value&&(D.dMap.get(id)||{}).sido!==sel.value));
 /* ids에 해당하는 선거구가 모두 보이도록 지도 범위를 맞춤(초기화 버튼의 기준 범위도 변경). ids 생략 시 전국으로 복귀 */
 function fit(ids,minW){
  if(!ids||!ids.length){base={...orig};view={...orig};set();return}
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  ids.forEach(id=>{const e=els.get(id);if(!e)return;const b=e.getBBox();x0=Math.min(x0,b.x);y0=Math.min(y0,b.y);x1=Math.max(x1,b.x+b.width);y1=Math.max(y1,b.y+b.height)});
  if(x0>x1)return;const ar=orig.w/orig.h;let w=(x1-x0)*1.16,h=(y1-y0)*1.16;
  if(w/h<ar)w=h*ar;else h=w/ar;if(minW&&w<minW){h=h*minW/w;w=minW}
  base={x:(x0+x1)/2-w/2,y:(y0+y1)/2-h/2,w,h};view={...base};set()}
 /* 시도를 고르면 그 시도 선거구가 가득 차도록 확대(⟲ 초기화도 그 범위로), '전체 시도'면 전국 */
 const fitSido=()=>fit(sel.value?D.districts.filter(d=>d.sido===sel.value&&els.has(d.id)).map(d=>d.id):null,orig.w/10);
 sel.onchange=()=>{applySido();fitSido()};
 window.RFMap={D,els,select,clearSelection,fit,fitSido,applySido,selected:()=>selected,
  setHome:f=>{homeFn=f},showHome:home,setOnSelect:f=>{onSelect=f},minZoomW:orig.w/12};
 _rfReady(window.RFMap);
 const h=decodeURIComponent(location.hash.slice(1));if(h&&els.has(h))select(h);
})();
