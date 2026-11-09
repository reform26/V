/* 득표율 히트맵: 지도 색을 '조직 현황' 대신 '개혁신당 득표율'로 칠하는 보기 모드.
 * 데이터: data/vote-results.js (window.RF_VOTES.bySgg[SGG_Code].gw = 2026 지방선거 광역비례, 이 선거구 관할지역 합산).
 * - 색 기준 2가지: 득표율 그대로(ABS) / 해당 시도 전체 평균 대비 차이(DIF). 구간 경계는 아래 ABS·DIF 숫자만 고치면 됩니다.
 * - 선택 옵션: 위원장 위치 점 표시, 등록 정보 없는 곳만 강조.
 * - map.js가 home()/detail()/툴팁에서 window.RFHeat 를 호출합니다. 자료가 없거나 테스트(?demo=1)면 아무것도 하지 않습니다.
 * - 주소창 ?view=vote 로 바로 이 모드를 열 수 있어 링크 공유가 됩니다. */
(function(){
 const H=window.RFHeat={home(){},detail(){},tip(){return ''}}; /* map.js가 먼저 불러도 안전하도록 빈 껍데기부터 등록 */
 const V=window.RF_VOTES,wrap=document.querySelector('.map-wrap'),legend=wrap&&wrap.querySelector('.legend');
 if(!V||!V.bySgg||!wrap||!legend||(window.RFData&&RFData.demo)||!window.RFMapReady)return;

 /* ---------- 설정 ---------- */
 const ABS=[2,2.5,3.5,4.5,6];       /* 득표율(%) 구간 경계 → 6단계 (hv0~hv5) */
 const DIF=[-1,-.3,.3,1,2.5];       /* 시도 평균 대비(%p) 구간 경계 → 6단계 (hd0~hd5) */
 const TOP=10,GAPTOP=5;             /* 패널 순위 목록 길이 */
 const state={mode:new URLSearchParams(location.search).get('view')==='vote'?'vote':'org',metric:'abs',marks:true,gap:false};
 let M=null,D=null,svg=null,marks=null;

 /* ---------- 데이터 ---------- */
 const G=new Map();
 Object.keys(V.bySgg).forEach(id=>{const s=V.bySgg[id],g=s&&s.gw;if(g&&typeof g.rate==='number'&&typeof g.regionRate==='number')G.set(id,{...g,gc:s.gc||null})});
 if(!G.size)return;
 const ranked=[...G.keys()].sort((a,b)=>G.get(b).rate-G.get(a).rate);
 const rankAll=new Map(ranked.map((id,i)=>[id,i+1]));
 const regIds={};ranked.forEach(id=>{(regIds[G.get(id).region]=regIds[G.get(id).region]||[]).push(id)});
 const rankReg=new Map();Object.keys(regIds).forEach(r=>regIds[r].forEach((id,i)=>rankReg.set(id,i+1)));
 const covered=Object.keys(regIds).join('·');

 /* ---------- 표기 도우미 ---------- */
 const pct=n=>Number(n).toFixed(2)+'%';
 const num=n=>Number(n).toLocaleString('ko-KR');
 const sgn=n=>(n>0?'+':n<0?'−':'')+Math.abs(n);
 const diffHtml=d=>{const r=Math.round(d*100)/100;return `<span class="vt-diff ${r>0?'up':r<0?'down':''}">${r>0?'+':r<0?'−':''}${Math.abs(r).toFixed(2)}%p</span>`};
 const bin=(x,T)=>T.filter(t=>x>=t).length;
 const bar=(rate,cmp)=>{const top=Math.max(rate,cmp||0,1)*1.25,w=v=>Math.min(100,v/top*100).toFixed(1);
  return `<div class="vt-bar" aria-hidden="true"><i style="width:${w(rate)}%"></i>${cmp?`<b style="left:${w(cmp)}%"></b>`:''}</div>`};
 const basisNote=x=>x.basis==='whole'?'시·군·구 전체 집계(관외사전투표·거소·재외투표 포함)':x.basis==='dong'?'관할 행정동 합산 · 관외사전투표·거소·재외투표 제외':'구·동 혼합 집계 · 동 단위는 관외사전투표 등 제외';
 const FOOT='2026 지방선거 광역비례 개표 결과를 선거구 관할지역에 맞춰 계산한 참고용 수치입니다. 지방선거 결과라 총선 득표력과 같지 않을 수 있고 공식 결과와 다를 수 있어요.';

 /* ---------- 범례 ---------- */
 const absLabels=()=>ABS.map((t,i)=>i===0?`${t}% 미만`:`${ABS[i-1]}–${t}%`).concat(`${ABS[ABS.length-1]}% 이상`);
 const difLabels=()=>DIF.map((t,i)=>i===0?`${sgn(t)}%p 미만`:`${sgn(DIF[i-1])} ~ ${sgn(t)}%p${i===2?' (평균 수준)':''}`).concat(`${sgn(DIF[DIF.length-1])}%p 이상`);
 function legendHtml(){
  const abs=state.metric==='abs',pre=abs?'hv':'hd';
  return `<div class="hl-h"><b>개혁신당 득표율</b><small>${abs?'2026 지방선거 광역비례':'해당 시도 평균 대비'}</small></div>
   ${(abs?absLabels():difLabels()).map((t,i)=>`<span><i style="background:var(--${pre}${i})"></i>${t}</span>`).join('')}
   <span><i class="lg-none"></i>자료 없음</span>`}
 /* 색 기준·점·강조 옵션은 지도 왼쪽 카드(접이식)에 둠: 범례가 지도를 덜 가리도록 */
 function optsHtml(){const abs=state.metric==='abs';
  return `<summary>표시 옵션</summary>
   <div class="hl-seg" role="group" aria-label="색 기준"><button type="button" data-k="abs" aria-pressed="${abs}">득표율</button><button type="button" data-k="dif" aria-pressed="${!abs}">시도 평균 대비</button></div>
   <label class="hl-chk"><input type="checkbox" data-o="marks"${state.marks?' checked':''}> 위원장 위치 표시</label>
   <label class="hl-chk"><input type="checkbox" data-o="gap"${state.gap?' checked':''}> 등록 정보 없는 곳만 강조</label>`}
 const orgLegend=legend.innerHTML;

 /* ---------- 지도 칠하기 ---------- */
 const strip=e=>[...e.classList].forEach(c=>{if(/^h[vd]\d$|^hna$/.test(c))e.classList.remove(c)});
 function paint(){
  const on=state.mode==='vote';
  svg.classList.toggle('heat',on);svg.classList.toggle('marks',on&&state.marks);
  M.els.forEach((e,id)=>{strip(e);e.classList.remove('h-off');if(!on)return;
   const g=G.get(id);
   e.classList.add(!g?'hna':state.metric==='abs'?'hv'+bin(g.rate,ABS):'hd'+bin(g.rate-g.regionRate,DIF));
   if(state.gap&&D.status(id)!=='none')e.classList.add('h-off')});
  syncMarks()}

 /* ---------- 위원장 위치 점 ---------- */
 function inside(e){ /* 선거구 안쪽 점 중 bbox 중심에 가장 가까운 곳 (ㄷ자·분리된 선거구에서도 점이 이웃 선거구로 새지 않도록) */
  const b=e.getBBox();if(!b.width&&!b.height)return null;
  const cx=b.x+b.width/2,cy=b.y+b.height/2,N=14;let best=null,bd=Infinity;
  const ok=e.isPointInFill?(x,y)=>e.isPointInFill(new DOMPoint(x,y)):()=>true;
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){const x=b.x+b.width*(i+.5)/N,y=b.y+b.height*(j+.5)/N;
   if(!ok(x,y))continue;const d=(x-cx)**2+(y-cy)**2;if(d<bd){bd=d;best={x,y}}}
  return best||{x:cx,y:cy}}
 function buildMarks(){
  const ns='http://www.w3.org/2000/svg';marks=document.createElementNS(ns,'g');marks.id='heat-marks';
  D.psByD.forEach((ps,id)=>{const e=M.els.get(id);if(!e)return;
   /* 경기남부 보기에서 숨겨진(display:none) 선거구는 크기를 잴 수 없으므로 잠깐 풀었다가 되돌림 */
   const off=e.classList.contains('gs-off');if(off)e.classList.remove('gs-off');
   let pt=null;try{pt=inside(e)}catch(_){}
   if(off)e.classList.add('gs-off');
   if(!pt)return;
   const c=document.createElementNS(ns,'circle');c.setAttribute('cx',pt.x.toFixed(1));c.setAttribute('cy',pt.y.toFixed(1));
   c.dataset.id=id;c.setAttribute('class','hm hm-'+D.status(id));marks.appendChild(c)});
  svg.appendChild(marks);sizeMarks();
  new MutationObserver(sizeMarks).observe(svg,{attributes:true,attributeFilter:['viewBox']});           /* 확대·축소해도 점 크기는 화면에서 일정하게 */
  const dg=svg.querySelector('#districts');
  if(dg)new MutationObserver(syncMarks).observe(dg,{attributes:true,attributeFilter:['class'],subtree:true}); /* 경기남부 보기·강조 변경에 맞춰 점 숨김/흐림 */
 }
 function sizeMarks(){if(!marks)return;const w=svg.getBoundingClientRect().width||800,r=(svg.viewBox.baseVal.width*5.5/w).toFixed(2); /* 화면에서 반지름 약 5.5px로 일정 */
  marks.querySelectorAll('circle').forEach(c=>c.setAttribute('r',r))}
 function syncMarks(){if(!marks)return;
  marks.querySelectorAll('circle').forEach(c=>{const e=M.els.get(c.dataset.id);if(!e)return;
   c.classList.toggle('x-off',e.classList.contains('gs-off')||e.classList.contains('h-off'));
   c.classList.toggle('x-dim',e.classList.contains('gs-dim'))})}

 /* ---------- 오른쪽 패널 ---------- */
 const who=id=>{const p=D.pByD.get(id);return p?`${esc(p.name)} · ${esc(RFData.STATUS[p.status]||'')}`:'등록 정보 없음'};
 function scope(){ /* 지금 지도에 보이는 범위. 경기남부 보기는 칩(도시) 기준, 아니면 시도 필터 기준 */
  const R=window.RF_REGIONS&&RF_REGIONS.gyeonggiSouth;
  if(document.body.classList.contains('gs-mode')&&R){
   const on=document.querySelector('#gschips .chip.on'),c=on&&on.dataset.city;
   const cs=R.cities.filter(x=>!c||x.name===c);
   return{label:c||R.label,ids:cs.flatMap(x=>x.districts.map(d=>String(d.sggCode)))}}
  const s=document.getElementById('sido'),v=s&&s.value;
  return{label:v||'전국',ids:D.districts.filter(d=>!v||d.sido===v).map(d=>d.id)}}
 const row=(id,i)=>{const g=G.get(id),d=D.dMap.get(id);
  return `<li><button type="button" class="hh-row" data-id="${esc(id)}"><span class="hh-rk">${i+1}</span><span class="hh-n"><b>${esc(d?d.name:id)}</b><small>${who(id)}</small></span><strong class="hh-v">${pct(g.rate)}</strong></button></li>`};
 function homeHtml(){
  const sc=scope(),have=sc.ids.filter(id=>G.has(id)).sort((a,b)=>G.get(b).rate-G.get(a).rate);
  const head=`<span class="sido">개혁신당 · 2026 지방선거 광역비례</span><h2>${esc(sc.label)} 득표율 현황</h2>`;
  if(!have.length)return head+`<p class="muted home-hint">이 범위에는 득표 자료가 없는 선거구뿐입니다.<br>자료가 있는 지역: ${esc(covered)}</p>`;
  const gap=have.filter(id=>D.status(id)==='none').slice(0,GAPTOP),n=have.length,sum=have.reduce((a,id)=>a+G.get(id).rate,0);
  return head+`<p class="muted home-hint">선거구를 누르면 동별 득표율을 볼 수 있어요.</p>
   <div class="hh-sum"><div><span>자료 있는 선거구</span><b>${n}<small>/${sc.ids.length}곳</small></b></div><div><span>선거구 평균</span><b>${pct(sum/n)}</b></div>
    <div><span>최고</span><b>${pct(G.get(have[0]).rate)}</b></div><div><span>최저</span><b>${pct(G.get(have[n-1]).rate)}</b></div></div>
   <h3 class="hh-h3">득표율 상위 ${Math.min(TOP,n)}곳</h3><ul class="hh-list">${have.slice(0,TOP).map(row).join('')}</ul>
   ${gap.length?`<h3 class="hh-h3">등록 정보 없는 곳 중 상위 ${gap.length}곳</h3><ul class="hh-list">${gap.map(row).join('')}</ul>
   <p class="muted note" style="margin-top:8px">‘등록 정보 없음’은 공석이나 미임명을 뜻하지 않고 이 사이트에 등록된 정보가 없다는 뜻입니다.</p>`:''}
   <p class="muted note">${FOOT}</p>`}

 const dongRows=a=>`<ul class="vt-rows">${a.map(r=>`<li><span>${esc(r.n)}</span><b>${pct(r.r)}</b><small>${num(r.v)}표</small></li>`).join('')}</ul>`;
 function detailHtml(id){
  const g=G.get(id);
  if(!g)return `<section class="hh"><h3>개혁신당 득표율</h3><p class="vt-note" style="margin:0">이 선거구는 득표 자료가 없습니다. (자료가 있는 지역: ${esc(covered)})</p></section>`;
  const rows=(g.rows||[]).filter(r=>r&&r.r!=null).sort((a,b)=>b.r-a.r),nReg=regIds[g.region].length;
  const hi=rows.slice(0,3),lo=rows.length>=6?rows.slice(-3).reverse():[];
  const c=g.gc;
  return `<section class="hh"><h3>개혁신당 득표율<small>2026 지방선거 광역비례</small></h3>
   <div class="vt-big"><strong>${pct(g.rate)}</strong><span>${num(g.votes)}표 · ${esc(g.region)} 평균 ${pct(g.regionRate)} 대비 ${diffHtml(g.rate-g.regionRate)}</span></div>
   ${bar(g.rate,g.regionRate)}
   <div class="hh-rank"><div><span>자료 있는 전체 ${G.size}곳 중</span><b>${rankAll.get(id)}위</b></div><div><span>${esc(g.region)} ${nReg}곳 중</span><b>${rankReg.get(id)}위</b></div></div>
   ${c&&typeof c.rate==='number'?`<p class="vt-cmp">기초비례 ${pct(c.rate)} · ${esc(c.city)} 평균 ${pct(c.cityRate)} 대비 ${diffHtml(c.rate-c.cityRate)}</p>`:''}
   ${rows.length>1?`<h4 class="hh-h4">득표율 높은 지역</h4>${dongRows(hi)}${lo.length?`<h4 class="hh-h4">득표율 낮은 지역</h4>${dongRows(lo)}`:''}
    <details class="vt-more"><summary>지역별 전체 보기 (${rows.length})</summary>${dongRows(rows)}</details>`:''}
   <p class="vt-note">${basisNote(g)}</p><p class="vt-note">${FOOT}</p></section>`}

 /* ---------- map.js 연결 ---------- */
 H.home=panel=>{if(M&&state.mode==='vote')panel.innerHTML=homeHtml()};
 H.detail=(id,panel)=>{if(!M||state.mode!=='vote'||!D.dMap.has(id))return;
  const a=panel.querySelector('.pcard,dl.kv'),h=detailHtml(id);
  if(a)a.insertAdjacentHTML('beforebegin',h);else panel.insertAdjacentHTML('beforeend',h)};
 H.tip=id=>{if(!M||state.mode!=='vote')return '';const g=G.get(id);
  return g?`<br>득표율 ${pct(g.rate)} <small>(${esc(g.region)} 평균 대비 ${sgn(Math.round((g.rate-g.regionRate)*100)/100)}%p)</small>`:'<br>득표 자료 없음'};

 function refreshPanel(){const s=M.selected();if(s)M.select(s);else M.showHome()}
 function apply(){
  const on=state.mode==='vote';
  ctl.querySelectorAll('button[data-m]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===state.mode));
  legend.classList.toggle('heat',on);legend.innerHTML=on?legendHtml():orgLegend;opts.hidden=!on;if(on)opts.innerHTML=optsHtml();
  paint();
  const u=new URL(location.href);if(on)u.searchParams.set('view','vote');else u.searchParams.delete('view');
  history.replaceState(null,'',u.pathname+u.search+u.hash)}

 /* ---------- 화면 조작 ---------- */
 const ctl=document.createElement('div');ctl.className='map-mode';ctl.setAttribute('role','group');ctl.setAttribute('aria-label','지도 표시 기준');
 ctl.innerHTML='<div class="mm-seg"><button type="button" data-m="org">조직 현황</button><button type="button" data-m="vote">득표율</button></div><details class="mm-opts" id="mmopts" hidden></details>';
 wrap.appendChild(ctl);
 const opts=ctl.querySelector('#mmopts');if(matchMedia('(min-width:861px)').matches)opts.open=true; /* 모바일은 접어 둠 */
 ctl.querySelectorAll('button[data-m]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===state.mode));

 window.RFMapReady.then(m=>{
  M=m;D=m.D;svg=document.querySelector('#map svg');if(!svg){ctl.remove();return}
  buildMarks();addEventListener('resize',sizeMarks);
  ctl.addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(!b||b.dataset.m===state.mode)return;state.mode=b.dataset.m;apply();refreshPanel()});
  opts.addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(!b||state.mode!=='vote'||b.dataset.k===state.metric)return;
   state.metric=b.dataset.k;legend.innerHTML=legendHtml();opts.innerHTML=optsHtml();paint()});
  opts.addEventListener('change',e=>{const o=e.target.dataset&&e.target.dataset.o;if(!o||state.mode!=='vote')return;state[o]=e.target.checked;paint()});
  const panel=document.getElementById('panel');
  panel.addEventListener('click',e=>{const b=e.target.closest('.hh-row');if(!b)return;
   M.select(b.dataset.id);if(!matchMedia('(max-width:860px)').matches)M.focusOn(b.dataset.id)});
  const sido=document.getElementById('sido');
  if(sido)sido.addEventListener('change',()=>setTimeout(()=>{if(state.mode==='vote'&&!M.selected())M.showHome()},0));
  if(state.mode==='vote'){apply();refreshPanel()}
 });
})();
