/* 인물 상세 하단 '개혁신당 · 후보자 득표율' 카드.
 * 데이터: data/vote-results.js (tools/build-vote-data.js 로 생성, window.RF_VOTES).
 * 보여주는 순서: 1) 광역비례 2) 기초비례 3) 후보 본인(이름·지역이 일치할 때만). 첫 항목은 펼치고 나머지는 접어 둡니다.
 * 데이터가 하나도 없으면 아무것도 표시하지 않습니다. */
(function(){
 const e=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pct=n=>(Math.round(n*100)/100).toFixed(2).replace(/0$/,'')+'%';
 const num=n=>Number(n).toLocaleString('ko-KR');

 /* 득표율 막대: 이 값과 비교값(전체 평균)을 같은 눈금에 표시 */
 const bar=(rate,cmp)=>{
  const top=Math.max(rate,cmp||0,1)*1.25,w=v=>Math.min(100,v/top*100).toFixed(1);
  return `<div class="vt-bar" aria-hidden="true"><i style="width:${w(rate)}%"></i>${cmp?`<b style="left:${w(cmp)}%"></b>`:''}</div>`};
 const diff=(a,b)=>{const d=Math.round((a-b)*100)/100;return `<span class="vt-diff ${d>0?'up':d<0?'down':''}">${d>0?'+':''}${d.toFixed(2).replace(/0$/,'')}%p</span>`};

 const rowsHtml=(rows,cmpLabel)=>rows&&rows.length>1?`<details class="vt-more"><summary>${e(cmpLabel)} 보기 (${rows.length})</summary><ul class="vt-rows">${rows.map(r=>`<li><span>${e(r.n)}</span><b>${r.r==null?'-':pct(r.r)}</b><small>${num(r.v)}표</small></li>`).join('')}</ul></details>`:'';

 const miss=x=>x.miss&&x.miss.length?`<p class="vt-note">※ 원본 데이터에서 찾지 못한 ${x.miss.length}곳(${e(x.miss.slice(0,3).join(', '))}${x.miss.length>3?' 등':''})은 빼고 계산했습니다.</p>`:'';
 const basisNote=x=>x.basis==='whole'?'시·군·구 전체 집계(관외사전투표·거소·재외투표 포함)':x.basis==='dong'?'관할 행정동 합산 · 관외사전투표·거소·재외투표 제외':'구·동 혼합 집계 · 동 단위는 관외사전투표 등 제외';

 /* 블록 하나: summary(제목+핵심 수치)는 항상 보이고, 본문은 접고 펴기 */
 const block=(open,tag,title,rate,main,body)=>`<details class="vt-b"${open?' open':''}><summary><span class="vt-tag">${e(tag)}</span><span class="vt-ttl">${e(title)}</span><strong class="vt-num">${rate==null?'':pct(rate)}</strong></summary><div class="vt-body">${main}${body||''}</div></details>`;

 /* 후보 본인 블록 하단: 이 당협 선거구(예: 세종 갑) 관할지역만 합산한 본인 득표율 */
 const areaBlock=c=>{const a=c.area;if(!a)return '';
  return `<div class="vt-area"><div class="vt-sub">${e(a.name||'이 선거구')} 관할지역 기준</div>
   <div class="vt-big"><strong>${pct(a.rate)}</strong><span>${num(a.votes)}표</span></div>${bar(a.rate,c.rate)}
   <p class="vt-cmp">${e(c.place)} 전체 ${pct(c.rate)} 대비 ${diff(a.rate,c.rate)}</p>
   <p class="vt-note">${basisNote(a)}</p>${a.partial?`<p class="vt-note">※ 이 선거구 관할지역 중 ${e(c.place)} 출마 지역에 속한 곳만 합산했습니다.</p>`:''}${miss(a)}${rowsHtml(a.rows,'지역별')}</div>`};

 /* 참고: 이 선거구 관할지역에서 출마했거나 지역이 겹치는 '다른' 개혁신당 후보 */
 const demoQ=()=>window.RFData&&window.RFData.demo?'&demo=1':'';
 const refItem=x=>{
  const nm=x.pid?`<a href="person.html?id=${encodeURIComponent(x.pid)}${demoQ()}">${e(x.name)}</a>`:e(x.name);
  const main=x.area?x.area.rate:x.rate;
  let d;
  if(x.area){d=`${e(x.place)}<br>이 선거구 관할지역 ${num(x.area.votes)}표 · 선거 전체 ${pct(x.rate)}${x.win?' · <em class="vt-win">당선</em>':''}${x.area.partial?'<br>※ 출마 지역에 속한 관할지역만 합산':''}`;}
  else{const o=x.ov,ds=o.m.slice(0,4).join(', ')+(o.m.length>4?' 등':'');
   d=`${e(x.place)}<br>본인 선거구 ${num(x.votes)}표${x.win?' · <em class="vt-win">당선</em>':''}${x.quota>1?` · ${x.quota}인 선출`:''}<br>${o.full?'선거구 전체가 이 관할지역에 포함':`관할지역과 겹침 ${o.m.length}/${o.n}곳`} (${e(ds)})`;}
  return `<li><div class="t"><span class="n">${nm}<small>${e(x.type)}</small></span><b>${pct(main)}</b></div><div class="d">${d}</div></li>`};
 const refBlock=list=>list&&list.length?['참고',`이 지역 다른 개혁신당 후보 ${list.length}명`,null,
  `<ul class="vt-ref">${list.map(refItem).join('')}</ul>
   <p class="vt-note">당협위원장 본인이 아닌 후보의 결과로, 참고용입니다. 시장·도지사 등 단체장은 <b>이 선거구 관할지역만 합산한</b> 득표율이고, 의원은 <b>본인 선거구 전체</b> 득표율이라 기준이 서로 다릅니다.</p>`,'']:null;

 window.voteHtml=function(p){
  const V=window.RF_VOTES;if(!V||!p)return '';
  const id=String(p.districtId||p.sggCode||''),S=(V.bySgg||{})[id]||{},C=(V.cand||{})[id+'|'+p.name]||[];
  const bl=[];
  if(S.gw){const g=S.gw;
   bl.push(['광역비례','개혁신당 득표율',g.rate,
    `<div class="vt-big"><strong>${pct(g.rate)}</strong><span>이 선거구 관할지역 · ${num(g.votes)}표</span></div>${bar(g.rate,g.regionRate)}
     <p class="vt-cmp">${e(g.region)} 전체 ${pct(g.regionRate)} 대비 ${diff(g.rate,g.regionRate)}</p>
     <p class="vt-note">${basisNote(g)}</p>${miss(g)}`,
    rowsHtml(g.rows,'지역별')]);}
  if(S.gc){const c=S.gc;
   bl.push(['기초비례','개혁신당 득표율',c.rate,
    `<div class="vt-big"><strong>${pct(c.rate)}</strong><span>이 선거구 관할지역 · ${num(c.votes)}표</span></div>${bar(c.rate,c.cityRate)}
     <p class="vt-cmp">${e(c.city)} 전체 ${pct(c.cityRate)} 대비 ${diff(c.rate,c.cityRate)}</p>
     <p class="vt-note">${basisNote(c)}</p>${miss(c)}`,
    rowsHtml(c.rows,'지역별')]);}
  C.forEach(c=>bl.push(['후보 본인',c.type+' · '+c.place,c.rate,
    `<div class="vt-big"><strong>${pct(c.rate)}</strong><span>${num(c.votes)}표${c.win?' · <em class="vt-win">당선</em>':''}${c.quota>1?` · ${c.quota}인 선출`:''}</span></div>${bar(c.rate)}
     <p class="vt-note">같은 이름·지역의 후보로 자동 연결한 값입니다. 동명이인이면 틀릴 수 있어요.</p>`,areaBlock(c)]));
  const rb=refBlock((V.ref||{})[id]);if(rb)bl.push(rb);
  if(!bl.length)return '';
  const date=V.meta&&V.meta.generatedAt?` · ${e(V.meta.generatedAt)} 기준`:'';
  return `<section class="vt"><h3>개혁신당 · 후보자 득표율</h3>${bl.map((b,i)=>block(i===0,b[0],b[1],b[2],b[3],b[4])).join('')}
   <p class="vt-foot">2026 지방선거 개표 결과(reform26/election)를 이 선거구 관할지역에 맞춰 계산한 참고용 수치이며 공식 결과와 다를 수 있습니다${date}.</p></section>`;
 };
})();
