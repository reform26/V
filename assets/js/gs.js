/* 경기남부 자세히 보기: 전국 지도(map.js)의 지도·우측 인물 패널을 그대로 재사용하는 보기 모드.
 * 대상 선거구 정의는 data/regions.js (SGG_Code 기준), 조직 상태는 RFData.load() 결과(chairpersons.json)에서 집계합니다. */
(function(){
 const R=window.RF_REGIONS&&window.RF_REGIONS.gyeonggiSouth,$=id=>document.getElementById(id);
 if(RFData.demo||!R||!$('gsopen'))return; /* 테스트(?demo=1) 지도는 실제 SGG_Code가 없으므로 사용하지 않음 */
 window.RFMapReady.then(init);

 function init(M){
  const D=M.D,ST=RFData.STATUS,KEYS=Object.keys(ST).concat('none'),LBL=k=>k==='none'?RFData.NONE_LABEL:ST[k];
  const cities=R.cities.map(c=>({name:c.name,stem:c.stem,ids:c.districts.map(d=>String(d.sggCode))}));
  const cityOf=new Map();cities.forEach(c=>c.ids.forEach(id=>{if(!cityOf.has(id))cityOf.set(id,c.name)}));
  const allIds=cities.flatMap(c=>c.ids);
  let on=false,city='';

  /* ---------- 데이터 검증 ---------- */
  const rep={errors:[],warnings:[],info:[]};
  (function validate(){
   const seen=new Set();
   R.cities.forEach(c=>c.districts.forEach(d=>{const id=String(d.sggCode),m=D.dMap.get(id);
    if(seen.has(id))rep.errors.push(`선거구 코드 중복 정의: ${id} (${c.name})`);seen.add(id);
    if(!m)rep.errors.push(`지도 선거구 목록(CSV)에 없는 코드: ${id} ${d.sggName||''}`);
    else{if(d.sggName&&(m.csvName||m.name)!==d.sggName)rep.errors.push(`선거구명 불일치 ${id}: 정의 "${d.sggName}" / 지도 "${m.name}"`);
     if(m.sido!==R.sido)rep.errors.push(`${id} ${m.name}: 시도가 ${R.sido}가 아님 (${m.sido})`);
     if(!(m.csvName||m.name).startsWith(R.sido.slice(0,2)+' '+c.stem))rep.warnings.push(`${id} ${m.name}: 선거구명이 "${c.name}"로 시작하지 않음 (코드 기준으로 연결됨, 확인 필요)`)}
    if(!M.els.has(id))rep.errors.push(`GeoJSON 지도에서 찾지 못한 코드: ${id} ${d.sggName||''}`)}));
   /* 역방향 점검: 같은 시 이름으로 시작하지만 정의에서 빠진 경기 선거구가 있는지 (누락 의심). 연결 자체는 항상 코드 기준 */
   R.cities.forEach(c=>D.districts.forEach(m=>{if(m.sido===R.sido&&(m.csvName||m.name).startsWith(R.sido.slice(0,2)+' '+c.stem)&&!cityOf.has(String(m.id)))
    rep.warnings.push(`누락 의심: ${m.id} ${m.name}은 "${c.name}"으로 시작하지만 경기남부 정의에 없음`)}));
   const s=sum(allIds);
   if(s.total!==allIds.length)rep.errors.push(`대상 선거구 수 불일치: 정의 ${allIds.length} / 집계 ${s.total}`);
   if(new Set(allIds).size!==allIds.length)rep.errors.push('중복된 선거구가 있어 집계가 어긋납니다');
   const bySum=KEYS.reduce((a,k)=>a+s[k],0);
   if(bySum!==s.total)rep.errors.push(`상태별 합계(${bySum})와 대상 선거구 수(${s.total}) 불일치`);
   const outside=cities.flatMap(c=>c.ids).filter(id=>!M.els.has(id));if(outside.length)rep.errors.push(`지도에 없는 대상 선거구: ${outside.join(', ')}`);
   rep.info.push(`대상 ${cities.length}개 시 / ${allIds.length}개 선거구: `+cities.map(c=>`${c.name} ${c.ids.length}`).join(', '));
   rep.info.push('상태별(선거구 기준): '+KEYS.map(k=>`${LBL(k)} ${s[k]}`).join(', '));
   console.groupCollapsed(`[경기남부 검증] 오류 ${rep.errors.length} / 경고 ${rep.warnings.length}`);
   rep.info.forEach(x=>console.log(x));rep.warnings.forEach(x=>console.warn(x));rep.errors.forEach(x=>console.error(x));console.groupEnd();
   window.RFReport=window.RFReport||{};window.RFReport.gs=rep;
  })();

  /* ---------- 집계: 선거구 1곳당 1번만 세며, 지도 색과 같은 기준(가장 높은 단계) ---------- */
  function sum(ids){const o={total:0};KEYS.forEach(k=>o[k]=0);new Set(ids).forEach(id=>{o.total++;o[D.status(id)]++});return o}
  const names=id=>(D.psByD.get(id)||[]).map(p=>p.name).join(', ');
  const activeIds=()=>city?cities.find(c=>c.name===city).ids:allIds;
  const stat=k=>`<span class="badge ${k}">${LBL(k)}</span>`;

  /* ---------- 화면 ---------- */
  function renderChips(){
   $('gschips').innerHTML=[['', '전체 경기남부',allIds.length]].concat(cities.map(c=>[c.name,c.name,c.ids.length])).map(([v,t,n])=>
    `<button type="button" class="chip${city===v?' on':''}" data-city="${esc(v)}" aria-pressed="${city===v}">${esc(t)} <small>${n}</small></button>`).join('')}
  function renderTiles(){
   const s=sum(activeIds()),ok=KEYS.reduce((a,k)=>a+s[k],0)===s.total;
   $('gsstats').innerHTML=`<h2>${city?esc(city):'경기남부 전체'} 조직 현황</h2><div class="gs-tiles">`+
    ['chairperson','organizing_chair','application','none'].map(k=>`<div class="tile ${k}"><span>${LBL(k)}${k==='none'?' 선거구':''}</span><b>${s[k]}</b></div>`).join('')+
    `<div class="tile total"><span>전체 대상 선거구</span><b>${s.total}</b></div></div>`+(ok?'':'<p class="gs-warn">상태별 합계와 대상 선거구 수가 일치하지 않습니다. 데이터를 확인하세요.</p>')}
  function renderList(){
   const rows=cities.map(c=>{const s=sum(c.ids);return `<tr class="${city===c.name?'on':''}"><th scope="row"><button type="button" class="link" data-city="${esc(c.name)}">${esc(c.name)}</button></th>`+
    ['chairperson','organizing_chair','application','none'].map(k=>`<td>${s[k]}</td>`).join('')+`<td><b>${s.total}</b></td></tr>`}).join('');
   const t=sum(allIds),ids=cities.filter(c=>!city||c.name===city).flatMap(c=>c.ids.map(id=>[c.name,id]));
   $('gslist').innerHTML=`<h2>도시별 조직 현황</h2><div class="gs-scroll"><table class="gs-table"><thead><tr><th>도시</th><th>당협위원장</th><th>조직위원장</th><th>조직위 신청</th><th>정보 없음</th><th>선거구</th></tr></thead><tbody>${rows}</tbody>
    <tfoot><tr><th scope="row">경기남부 전체</th>${['chairperson','organizing_chair','application','none'].map(k=>`<td>${t[k]}</td>`).join('')}<td><b>${t.total}</b></td></tr></tfoot></table></div>
    <h2>선거구 목록 <small class="muted">${city?esc(city):'전체'} ${ids.length}곳 · 선거구를 누르면 지도와 우측 상세가 갱신됩니다</small></h2>
    <ul class="gs-list">${ids.map(([cn,id])=>{const d=D.dMap.get(id),k=D.status(id),n=names(id);
     return `<li><button type="button" class="gs-row" data-id="${esc(id)}"><span class="c">${esc(cn)}</span><span class="d">${esc(d?d.name:id)}</span><span class="n">${n?esc(n):'<span class="muted">—</span>'}</span>${stat(k)}</button></li>`}).join('')}</ul>`;
   mark(M.selected())}
  function mark(id){document.querySelectorAll('#gslist .gs-row').forEach(b=>{const o=b.dataset.id===id;b.classList.toggle('on',o);if(o)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current')})}
  function homeHtml(){const s=sum(activeIds());
   $('panel').innerHTML=`<h2>${city?esc(city):'경기남부'} 조직 현황</h2><p class="muted">지도 또는 아래 목록에서 선거구를 선택하세요.</p>
    <h3>선거구 ${s.total}곳 기준</h3><div class="stat">${['chairperson','organizing_chair','application','none'].map(k=>`<span>${stat(k)}</span><b>${s[k]}</b>`).join('')}</div>
    <p class="muted" style="font-size:13px;margin-top:14px">회색 선거구는 등록된 정보가 없는 곳입니다. 공석이나 미임명을 뜻하지 않습니다.</p>`}

  function applyMap(refit){
   const act=new Set(activeIds()),all=new Set(allIds);
   M.els.forEach((e,id)=>{e.classList.toggle('gs-off',on&&!all.has(id));e.classList.toggle('gs-dim',on&&all.has(id)&&!act.has(id))});
   if(refit)M.fit(on?[...act]:null,M.minZoomW)}
  function refresh(refit){
   renderChips();renderTiles();renderList();
   const sel=M.selected();if(sel&&!new Set(activeIds()).has(sel))M.clearSelection();else if(!sel)M.showHome();
   applyMap(refit)}

  function enter(c){
   on=true;city=c||'';document.body.classList.add('gs-mode');
   ['gsctl','gsstats','gslist'].forEach(i=>$(i).hidden=false);$('gsopen').hidden=true;
   M.applySido(false);M.setHome(homeHtml);M.setOnSelect(mark);
   refresh(false);applyMap(true);
   const s=M.selected();if(!s||!allIds.includes(s))M.showHome()}
  function exit(){
   on=false;city='';document.body.classList.remove('gs-mode');
   ['gsctl','gsstats','gslist'].forEach(i=>$(i).hidden=true);$('gsopen').hidden=false;
   M.setHome(null);M.setOnSelect(null);applyMap(true);M.applySido(true);M.fitSido();
   if(!M.selected())M.showHome()}
  function pick(c){city=c;refresh(true);const s=M.selected();if(!s)M.showHome()}

  $('gsopen').hidden=false;
  $('gsopen').onclick=()=>{enter('');scrollTo({top:0})};
  $('gsback').onclick=()=>{exit();scrollTo({top:0})};
  document.addEventListener('click',e=>{if(!on)return;
   const c=e.target.closest('[data-city]');if(c&&c.closest('#gsctl,#gslist')){pick(c.dataset.city);return}
   const r=e.target.closest('.gs-row');if(r){if(M.selected()===r.dataset.id){M.clearSelection();return}M.select(r.dataset.id);
    if(matchMedia('(max-width:860px)').matches)document.querySelector('.map-layout').scrollIntoView({behavior:'smooth',block:'start'})}});
  if(location.hash==='#gs')enter('');
 }
})();
