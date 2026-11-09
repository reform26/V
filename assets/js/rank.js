/* 공략 우선순위("골든 선거구") 순위: 경기남부 선거구를 항목별 가중치 점수로 줄 세우는 보기. 경기남부 자세히 보기(gs-mode)에서만 나타납니다.
 * 데이터: 득표율=data/vote-results.js(gw.rate) · 인구=data/pop-data.js(1세 단위, tools/build-pop-data.js) · 위원장=RFData(chairpersons.json)
 * - 점수 = Σ(가중치 × 항목 점수) ÷ Σ가중치 × 100. 항목 점수는 경기남부 21곳 안에서의 순위(백분위, 0~1)라 극단값 하나가 전체를 흔들지 않습니다.
 * - 위원장 공석 항목만 순위가 아니라 단계값(등록 없음 1 · 조직위 신청 .5 · 조직위원장 .25 · 당협위원장 0)을 씁니다.
 * - 항목·연령층·프리셋은 아래 METRICS/AGES/PRESETS 만 고치면 됩니다. 슬라이더 값은 주소창(?rk=…)에 담겨 링크로 공유됩니다. */
(function(){
 const R=window.RF_REGIONS&&window.RF_REGIONS.gyeonggiSouth,V=window.RF_VOTES,P=window.RF_POP,$=id=>document.getElementById(id);
 if(!R||!V||!P||!$('rank')||(window.RFData&&RFData.demo)||!window.RFMapReady)return;

 /* ---------- 설정 ---------- */
 const AGES=[ /* [키, 이름, 시작나이, 끝나이(포함), 설명] */
  ['kid','영유아',0,6,'0~6세'],['stu','학생층',7,18,'7~18세 (초·중·고)'],['yng','청년층',19,39,'19~39세'],
  ['par','학부모층(추정)',35,54,'35~54세. 자녀 관계 통계가 없어 나이로 추정'],['mid','중장년층',40,64,'40~64세'],['old','노년층',65,100,'65세 이상']];
 const METRICS=[ /* 슬라이더 순서. kind: vote|pop|vac|age */
  {k:'v',n:'득표율',kind:'vote',c:'#2f63d1',d:'2026 지방선거 광역비례 · 높을수록 유리'},
  {k:'p',n:'인구 규모',kind:'pop',c:'#7c5cf0',d:'주민등록 인구 · 많을수록 유리'},
  {k:'g',n:'위원장 공석',kind:'vac',c:'#f26b00',d:'등록된 위원장이 없을수록 유리'},
  ...AGES.map((a,i)=>({k:a[0],n:a[1],kind:'age',a:a,c:['#12a37f','#e0a100','#d6409f','#8a6d3b','#5c6b7a','#9aa4af'][i],d:a[4]}))];
 const PRESETS=[
  {n:'균형',w:{v:40,p:20,g:30,yng:10}},
  {n:'득표력 중심',w:{v:70,p:10,g:20}},
  {n:'청년 공략',w:{v:30,p:10,g:20,yng:40}},
  {n:'교육·학부모 이슈',w:{v:30,p:10,g:20,stu:20,par:20}},
  {n:'조직 공백 우선',w:{v:20,p:10,g:70}}];
 const VAC={none:1,application:.5,organizing_chair:.25,chairperson:0};
 const MARK=['#fde9d6','#fbcfa3','#f7ad66','#f28a2e','#d96a00','#a84f00']; /* 점수 6단계 지도색 */

 /* ---------- 상태 ---------- */
 const state={w:{},inv:{},mode:'share',only:false,minRate:0,map:false,sort:'score'};
 METRICS.forEach(m=>{state.w[m.k]=0;state.inv[m.k]=false});Object.assign(state.w,PRESETS[0].w);
 const defRate=Number((V.meta&&V.meta.regionRates&&V.meta.regionRates['경기'])||3.65);state.minRate=defRate;
 let M=null,D=null,on=false;
 const num=n=>Number(n).toLocaleString('ko-KR'),pct=(n,d=1)=>Number(n).toFixed(d)+'%';

 /* ---------- 데이터 모으기 ---------- */
 const cityOf=new Map(),ids=[];
 R.cities.forEach(c=>c.districts.forEach(d=>{const id=String(d.sggCode);cityOf.set(id,c.name);ids.push(id)}));
 const rows=ids.map(id=>{const g=V.bySgg[id]&&V.bySgg[id].gw,p=P.bySgg[id];if(!g||!p)return null;
  const tot=p.total,sumA=(a,b)=>p.ages.slice(a,b+1).reduce((x,y)=>x+y,0),ag={};
  AGES.forEach(a=>{const n=sumA(a[2],a[3]);ag[a[0]]={n,s:n/tot*100}});
  return{id,city:cityOf.get(id),rate:g.rate,votes:g.votes,basis:g.basis,total:tot,ag}}).filter(Boolean);
 const missing=ids.filter(id=>!rows.some(r=>r.id===id));

 /* ---------- 점수 계산 (순수 함수: 화면과 무관) ---------- */
 function pctRank(vals){ /* 같은 값은 평균 순위. 0(최저)~1(최고) */
  const n=vals.length,s=[...vals].sort((a,b)=>a-b);
  return vals.map(v=>{const lo=s.indexOf(v),hi=s.lastIndexOf(v);return n<2?.5:((lo+hi)/2)/(n-1)})}
 function score(rs,st,vac){
  const norm={};
  METRICS.forEach(m=>{
   let v;
   if(m.kind==='vac')v=rs.map(r=>vac(r.id));
   else{const raw=rs.map(r=>m.kind==='vote'?r.rate:m.kind==='pop'?r.total:(st.mode==='share'?r.ag[m.k].s:r.ag[m.k].n));v=pctRank(raw)}
   norm[m.k]=st.inv[m.k]&&m.kind!=='vac'?v.map(x=>1-x):v});
  const W=METRICS.reduce((a,m)=>a+(st.w[m.k]||0),0);
  return rs.map((r,i)=>{const parts=METRICS.map(m=>W?(st.w[m.k]||0)*norm[m.k][i]/W*100:0);
   return{id:r.id,score:parts.reduce((a,b)=>a+b,0),parts}})}
 window.RFRank={score,pctRank,rows,METRICS,AGES}; /* 점검·테스트용 */

 /* ---------- 위원장 정보 ---------- */
 const vac=id=>VAC[D.status(id)]!=null?VAC[D.status(id)]:1;
 const who=id=>{const ps=D.psByD.get(id)||[];return ps.length?ps.map(p=>esc(p.name)).join(', '):''};
 const badge=id=>{const k=D.status(id);return `<span class="badge ${k}">${esc(k==='none'?RFData.NONE_LABEL:RFData.STATUS[k])}</span>`};

 /* ---------- 주소 공유 ---------- */
 const enc=()=>[METRICS.map(m=>(state.w[m.k]||0)+(state.inv[m.k]?'i':'')).join('.'),state.mode==='share'?'s':'n',state.only?1:0,state.minRate,state.map?1:0].join('_');
 function dec(t){try{const[w,m,o,r,mp]=t.split('_'),a=w.split('.');if(a.length!==METRICS.length)return;
  METRICS.forEach((x,i)=>{state.w[x.k]=Math.max(0,Math.min(100,parseInt(a[i])||0));state.inv[x.k]=/i$/.test(a[i])});
  state.mode=m==='n'?'num':'share';state.only=o==='1';state.minRate=Math.max(0,Math.min(20,Number(r)||0));state.map=mp==='1'}catch(_){}}
 function sync(){const u=new URL(location.href);u.searchParams.set('rk',enc());history.replaceState(null,'',u.pathname+u.search+u.hash)}
 const q=new URLSearchParams(location.search).get('rk');if(q)dec(q);

 /* ---------- 화면 ---------- */
 const city=()=>{const c=document.querySelector('#gschips .chip.on');return c&&c.dataset.city||''};
 const bin=s=>Math.min(5,Math.floor(s/100*6));
 function compute(){const sc=score(rows,state,vac),by=new Map(sc.map(x=>[x.id,x]));
  const all=rows.map(r=>({...r,...by.get(r.id)})).sort((a,b)=>b.score-a.score||b.rate-a.rate);
  all.forEach((r,i)=>r.rank=i+1);return all}
 function filtered(all){const c=city();
  return all.filter(r=>(!c||r.city===c)&&(!state.only||(D.status(r.id)==='none'&&r.rate>=state.minRate)))}
 const sortFn={score:(a,b)=>a.rank-b.rank,rate:(a,b)=>b.rate-a.rate,pop:(a,b)=>b.total-a.total};

 function slidersHtml(){
  return METRICS.map(m=>{const age=m.kind==='age',w=state.w[m.k]||0;
   return `<div class="rk-s${w?'':' off'}" data-k="${m.k}"><label for="rks-${m.k}"><i style="background:${m.c}"></i><b>${esc(m.n)}</b><small>${esc(m.d)}</small></label>
    <input id="rks-${m.k}" type="range" min="0" max="100" step="5" value="${w}" aria-label="${esc(m.n)} 가중치"><output>${w}</output>
    ${age?`<label class="rk-inv"><input type="checkbox" data-inv="${m.k}"${state.inv[m.k]?' checked':''}> 적을수록 유리</label>`:''}</div>`}).join('')}
 function controlsHtml(){
  const W=METRICS.reduce((a,m)=>a+(state.w[m.k]||0),0);
  return `<div class="rk-pre" role="group" aria-label="가중치 프리셋">${PRESETS.map((p,i)=>`<button type="button" class="chip" data-pre="${i}">${esc(p.n)}</button>`).join('')}</div>
   <div class="rk-grid">${slidersHtml()}</div>
   <div class="rk-opt"><div class="hl-seg" role="group" aria-label="연령 기준"><button type="button" data-mode="share" aria-pressed="${state.mode==='share'}">연령 비중(%)</button><button type="button" data-mode="num" aria-pressed="${state.mode==='num'}">연령 인구수</button></div>
    <span class="muted">${W?`가중치 합 ${W} → 100점으로 환산`:'<b>가중치가 모두 0이라 점수를 계산할 수 없습니다</b>'}</span></div>
   <div class="rk-flt"><label class="hl-chk"><input type="checkbox" id="rkonly"${state.only?' checked':''}> <b>인재 영입 1순위만</b> <small>등록된 위원장 없음 + 득표율</small></label>
    <label class="rk-rate"><input id="rkrate" type="range" min="0" max="10" step="0.1" value="${state.minRate}"${state.only?'':' disabled'} aria-label="최소 득표율"><output>${state.minRate.toFixed(1)}% 이상</output></label>
    <label class="hl-chk"><input type="checkbox" id="rkmap"${state.map?' checked':''}> 지도에 점수 색 칠하기</label></div>`}
 function tableHtml(list,all){
  const sorted=[...list].sort(sortFn[state.sort]);
  const th=(k,t)=>`<th scope="col"><button type="button" class="link${state.sort===k?' on':''}" data-sort="${k}">${t}${state.sort===k?' ▾':''}</button></th>`;
  const legend=METRICS.filter(m=>state.w[m.k]).map(m=>`<span><i style="background:${m.c}"></i>${esc(m.n)}</span>`).join('');
  return `<div class="rk-leg">${legend}</div><div class="gs-scroll"><table class="gs-table rk-table"><thead><tr>${th('score','순위·선거구')}<th scope="col">점수 구성</th>${th('rate','득표율')}${th('pop','인구')}<th scope="col">청년층</th><th scope="col">학생층</th><th scope="col">노년층</th><th scope="col">위원장</th></tr></thead><tbody>
   ${sorted.map(r=>{const bars=r.parts.map((p,i)=>p>0?`<i style="width:${p.toFixed(2)}%;background:${METRICS[i].c}" title="${esc(METRICS[i].n)} ${p.toFixed(1)}점"></i>`:'').join(''),d=D.dMap.get(r.id);
    const sh=k=>state.mode==='share'?pct(r.ag[k].s):num(r.ag[k].n);
    return `<tr data-id="${esc(r.id)}"><th scope="row"><button type="button" class="rk-row" data-id="${esc(r.id)}"><span class="rk-rk">${r.rank}</span><span class="rk-nm"><b>${esc(d?d.name:r.id)}</b><small>${esc(r.city)}${r.basis==='whole'?' · 득표율 시·군·구 전체 집계':''}</small></span></button></th>
     <td><div class="rk-bar" aria-hidden="true">${bars}</div><b class="rk-sc">${r.score.toFixed(1)}</b></td>
     <td>${pct(r.rate,2)}</td><td>${num(r.total)}</td><td>${sh('yng')}</td><td>${sh('stu')}</td><td>${sh('old')}</td><td>${badge(r.id)}${who(r.id)?`<small class="rk-who">${who(r.id)}</small>`:''}</td></tr>`}).join('')}
   </tbody></table></div>${list.length?'':'<p class="muted">조건에 맞는 선거구가 없습니다. 최소 득표율을 낮추거나 도시 선택을 해제해 보세요.</p>'}`}
 function render(keepFocus){
  if(!on)return;const el=$('rank'),all=compute(),list=filtered(all);
  const act=document.activeElement,fid=keepFocus&&act&&act.id;
  const open=el.querySelector('details.rk-ctl'),isOpen=open?open.open:true;
  el.innerHTML=`<h2>공략 우선순위 <small class="muted">골든 선거구 · 경기남부 ${rows.length}곳 중 ${list.length}곳${city()?' · '+esc(city()):''}</small></h2>
   <details class="rk-ctl"${isOpen?' open':''}><summary>가중치·필터 조절</summary>${controlsHtml()}</details>
   <div id="rktable">${tableHtml(list,all)}</div>
   <p class="muted note">점수는 경기남부 21곳 안에서의 상대 순위를 가중 평균한 값이라 절대적 의미는 없고 비교용입니다. 득표율은 2026 지방선거 광역비례 결과를 관할 행정동에 맞춰 합산한 참고 수치이고, 인구는 ${esc(P.meta.source)} 기준입니다. ‘등록된 위원장 없음’은 공석을 뜻하지 않고 이 사이트에 등록된 정보가 없다는 뜻이며, 학부모층은 나이로 추정한 값입니다.${missing.length?` 자료 누락: ${missing.join(', ')}`:''}</p>`;
  if(fid){const n=$(fid);if(n)n.focus()}
  paintMap(all);sync()}
 /* 슬라이더를 움직일 때는 표와 숫자만 갱신(슬라이더 자체를 다시 그리면 드래그가 끊기므로) */
 function refresh(){if(!on)return;const all=compute(),list=filtered(all),el=$('rank');
  $('rktable').innerHTML=tableHtml(list,all);
  el.querySelector('h2 small').innerHTML=`골든 선거구 · 경기남부 ${rows.length}곳 중 ${list.length}곳${city()?' · '+esc(city()):''}`;
  const W=METRICS.reduce((a,m)=>a+(state.w[m.k]||0),0),sp=el.querySelector('.rk-opt .muted');
  if(sp)sp.innerHTML=W?`가중치 합 ${W} → 100점으로 환산`:'<b>가중치가 모두 0이라 점수를 계산할 수 없습니다</b>';
  paintMap(all);sync()}

 /* ---------- 지도 칠하기 ---------- */
 function paintMap(all){
  const svg=document.querySelector('#map svg');if(!svg||!M)return;
  const act=state.map&&on&&METRICS.some(m=>state.w[m.k]);
  svg.classList.toggle('rank-on',!!act);
  const sc=new Map(all.map(r=>[r.id,r])),shown=new Set(filtered(all).map(r=>r.id));
  M.els.forEach((e,id)=>{[...e.classList].forEach(c=>{if(/^rk\d$|^rk-off$/.test(c))e.classList.remove(c)});
   if(!act||!sc.has(id))return;
   const s=sc.get(id);e.classList.add('rk'+bin(s.score));if(!shown.has(id))e.classList.add('rk-off')});
  const wrap=document.querySelector('.map-wrap');if(!wrap)return;
  wrap.classList.toggle('rank-on',!!act);
  if(!wrap.querySelector('.rk-maplg')){const l=document.createElement('div');l.className='rk-maplg';
   l.innerHTML='<b>공략 우선순위 점수</b><div class="rk-sw">'+MARK.map((_,i)=>`<i style="background:var(--rk${i})"></i>`).join('')+'</div><div class="rk-lab"><span>낮음</span><span>높음</span></div>';wrap.appendChild(l)}}

 /* ---------- 이벤트 ---------- */
 function bind(){
  const el=$('rank');
  el.addEventListener('input',e=>{const t=e.target;
   if(t.matches('.rk-s input[type=range]')){const s=t.closest('.rk-s'),k=s.dataset.k;state.w[k]=Number(t.value);s.querySelector('output').textContent=t.value;s.classList.toggle('off',!state.w[k]);refresh()}
   else if(t.id==='rkrate'){state.minRate=Number(t.value);t.nextElementSibling.textContent=state.minRate.toFixed(1)+'% 이상';refresh()}});
  el.addEventListener('change',e=>{const t=e.target;
   if(t.dataset.inv){state.inv[t.dataset.inv]=t.checked;refresh()}
   else if(t.id==='rkonly'){state.only=t.checked;render(true)}
   else if(t.id==='rkmap'){state.map=t.checked;refresh()}});
  el.addEventListener('click',e=>{
   const pre=e.target.closest('[data-pre]');
   if(pre){const p=PRESETS[+pre.dataset.pre];METRICS.forEach(m=>{state.w[m.k]=p.w[m.k]||0;state.inv[m.k]=false});render();return}
   const md=e.target.closest('[data-mode]');if(md){state.mode=md.dataset.mode;render();return}
   const so=e.target.closest('[data-sort]');if(so){state.sort=so.dataset.sort;refresh();return}
   const r=e.target.closest('.rk-row');
   if(r){if(M.selected()!==r.dataset.id)M.select(r.dataset.id);document.querySelector('.map-layout').scrollIntoView({behavior:'smooth',block:'start'})}});
  /* 경기남부 보기 도시 칩이 바뀌면 표도 그 도시만 */
  document.addEventListener('click',e=>{if(on&&e.target.closest('#gsctl [data-city],#gslist [data-city]'))setTimeout(()=>render(),0)});
 }

 /* ---------- 경기남부 보기 켜짐/꺼짐 따라가기 ---------- */
 window.RFMapReady.then(m=>{
  M=m;D=m.D;bind();
  const sync2=()=>{const now=document.body.classList.contains('gs-mode');if(now===on)return;on=now;$('rank').hidden=!on;
   if(on)render();else paintMap([])};
  new MutationObserver(sync2).observe(document.body,{attributes:true,attributeFilter:['class']});sync2();
 });
})();
