(async function(){
 const D=await RFData.load(),q=RFData.demo?'&demo=1':'';
 const photo=avatar;
 /* 선거구 코드가 매칭되지 않은 인물도 목록에는 표시(검증 보고서에 별도 기록) */
 const rows=D.persons.map(p=>({p,d:D.dMap.get(p.districtId)||{sido:p.region||'',name:p.districtName||''}}));
 const badge=p=>`<span class="badge ${esc(p.status)}">${esc(RFData.STATUS[p.status]||p.statusLabel||'')}</span>`;
 const dname=({p,d})=>p.districtName||d.name;
 const list=document.getElementById('list');
 if(list){
  const $=id=>document.getElementById(id),so=$('sido'),sk=Object.keys(RFData.STATUS);
  $('summary').innerHTML=sk.map(k=>`<span class="badge ${k}">${RFData.STATUS[k]}: ${D.persons.filter(p=>p.status===k).length}명</span>`).join('')+`<span class="tot">등록 인물 합계 ${D.persons.length}명</span>`;
  $('status').innerHTML='<option value="">전체</option>'+sk.map(k=>`<option value="${k}">${RFData.STATUS[k]}</option>`).join('');
  so.innerHTML='<option value="">전체 시도</option>'+RFData.SIDO.map(s=>`<option>${s}</option>`).join('');
  const idx=s=>{const i=RFData.SIDO.indexOf(s);return i<0?99:i};
  const render=()=>{
   const k=$('kw').value.trim(),v=so.value,m=$('sort').value,st=$('status').value;
   const r=rows.filter(x=>(!st||x.p.status===st)&&(!v||x.d.sido===v)&&(!k||x.p.name.includes(k)||dname(x).includes(k)||(x.d.name||'').includes(k)||(x.d.csvName||'').includes(k)));
   /* 정렬: 가나다순(기본) / 당협위원장 우선(당협위원장 > 조직위원장 > 조직위 신청, 같은 단계 안에서는 가나다순) / 시도별 */
   const rank=x=>{const i=sk.indexOf(x.p.status);return i<0?99:i},byName=(a,b)=>a.p.name.localeCompare(b.p.name,'ko');
   r.sort((a,b)=>m==='sido'?idx(a.d.sido)-idx(b.d.sido)||byName(a,b):m==='status'?rank(a)-rank(b)||byName(a,b):byName(a,b));
   $('count').textContent=`${r.length}명`;
   list.innerHTML=r.length?r.map(x=>`<a class="card" href="person.html?id=${encodeURIComponent(x.p.id)}${q}">${photo(x.p)}<strong>${esc(x.p.name)}</strong><small>${esc(x.d.sido)}</small><small>${esc(dname(x))}</small><div class="cb">${badge(x.p)}</div></a>`).join(''):
   `<div class="empty" style="grid-column:1/-1">${rows.length?'검색 결과가 없습니다.':'등록된 인물 정보가 없습니다.'}</div>`};
  ['kw','sido','sort','status'].forEach(i=>$(i).addEventListener('input',render));render();
 }
 const box=document.getElementById('person');
 if(box){
  const id=new URLSearchParams(location.search).get('id'),x=rows.find(r=>r.p.id===id);
  const SITE='개혁신당 당협위원장 현황';
  if(!x){document.title='인물을 찾을 수 없습니다 | '+SITE;box.innerHTML=`<div class="empty">해당 인물을 찾을 수 없습니다. <a href="people.html${q?'?demo=1':''}">목록으로</a></div>`;return}
  const{p,d}=x;
  /* 탭 제목·검색 결과·북마크에 인물이 드러나도록 제목을 인물별로 설정 (예: 정찬옥 · 서울 중구·성동구 갑 당협위원장 | 개혁신당 당협위원장 현황) */
  document.title=`${p.name} · ${[p.region||'',dname(x)].filter(Boolean).join(' ')} ${RFData.STATUS[p.status]||p.statusLabel||''}`.replace(/\s+$/,'')+' | '+SITE;
  box.innerHTML=`<span class="sido">${esc(d.sido)}</span><h2>${esc(dname(x))}</h2>${areaHtml(p.districtId)}`+personDetailHtml(p,d)+(window.voteHtml?window.voteHtml(p):'')+`<p><a href="people.html${q?'?demo=1':''}" style="color:var(--o-d)">목록으로</a></p>`;
 }
})();
