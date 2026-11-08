window.esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.safeUrl=u=>/^https?:\/\//i.test(u||'')?u:'#';
window.initials=n=>esc(String(n||'?').trim().slice(0,1));
(function(){
 const q=RFData.demo?'?demo=1':'',cur=document.body.dataset.page;
 const nav=[['index','전국 지도','index.html'],['people','당협위원장 목록','people.html']];
 document.body.insertAdjacentHTML('afterbegin',
 `<header class="site-header"><a class="brand" href="index.html${q}" aria-label="개혁신당 당협위원장 현황 - 전국 지도"><img class="logo logo-l" src="assets/images/logo.svg" alt="개혁신당" width="67" height="26"><img class="logo logo-d" src="assets/images/logo-dark.svg" alt="" aria-hidden="true" width="67" height="26"><span class="t">당협위원장 현황</span></a><nav>${
 nav.map(n=>`<a href="${n[2]}${q}"${n[0]===cur?' aria-current="page"':''}>${n[1]}</a>`).join('')}</nav><button type="button" class="theme-btn" id="themebtn"><svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 019.8 3.5a8.5 8.5 0 1010.7 10.7z"/></svg><svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg></button></header>`+
 (RFData.demo?'<div class="demo-banner">테스트 데이터입니다. 실제 당협위원장 정보가 아닙니다.</div>':''));
})();

/* 인물 상세 렌더링 (지도 우측 패널과 person.html에서 공용). 등록된 정보만 표시하고 비어 있는 항목은 숨김.
 * 6차: 헤더·배지와 겹치는 항목(성명·정당·직책·조직 상태·담당 지역) 제거, SNS는 아이콘, 사진은 세로형 둥근 사각형 */
window.avatar=p=>`<div class="ph">${initials(p.name)}${p.photo?`<img src="${esc(p.photo)}" alt="${esc(p.name)}" loading="lazy" onerror="this.remove()">`:''}</div>`;
(function(){
 const items=a=>(Array.isArray(a)?a:[]).map(x=>typeof x==='string'?{t:x}:{p:x&&(x.period||x.year)||'',t:x&&(x.text||x.title)||''}).filter(x=>x.t);
 /* 약력 묶음이 하나뿐이면 소제목을 생략(섹션 제목 '약력'과 겹침 방지) */
 const cvHtml=g=>{const gs=g.map(([t,a])=>[t,items(a)]).filter(x=>x[1].length);if(!gs.length)return'';
  return gs.map(([t,i])=>`${gs.length>1?`<h4>${t}</h4>`:''}<ul class="cv">${i.map(x=>`<li>${x.p?`<span class="yr">${esc(x.p)}</span> `:''}${esc(x.t)}</li>`).join('')}</ul>`).join('')};
 const svg=(b,o)=>`<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false" ${o||'fill="#fff"'}>${b}</svg>`;
 const ST='fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
 const ICON={
  facebook:svg('<path d="M13.6 21v-7.6h2.6l.5-3.1h-3.1V8.4c0-.9.4-1.6 1.7-1.6h1.5V4.1c-.3 0-1.3-.1-2.4-.1-2.5 0-4.1 1.5-4.1 4.2v2.1H7.7v3.1h2.6V21h3.3z"/>'),
  instagram:svg('<rect x="4" y="4" width="16" height="16" rx="4.6"/><circle cx="12" cy="12" r="3.7"/><circle cx="16.9" cy="7.1" r=".6" fill="#fff"/>',ST),
  youtube:svg('<path d="M21.2 8.1c-.2-.9-.9-1.6-1.8-1.8C17.8 6 12 6 12 6s-5.8 0-7.4.3c-.9.2-1.6.9-1.8 1.8C2.5 9.7 2.5 12 2.5 12s0 2.3.3 3.9c.2.9.9 1.6 1.8 1.8 1.6.3 7.4.3 7.4.3s5.8 0 7.4-.3c.9-.2 1.6-.9 1.8-1.8.3-1.6.3-3.9.3-3.9s0-2.3-.3-3.9zM10 15V9l5.2 3L10 15z"/>'),
  blog:svg('<path d="M4 20l.9-4L16.3 4.6a2 2 0 012.8 0l.3.3a2 2 0 010 2.8L8 19.1 4 20zM14.5 6.4l3.1 3.1"/>',ST),
  x:svg('<path d="M17.7 3.5h3l-6.6 7.5 7.8 10h-6.1l-4.8-6.2-5.4 6.2h-3l7-8L2.4 3.5h6.3l4.3 5.7 4.7-5.7zm-1 16h1.7L7.2 5.2H5.4l11.3 14.3z"/>'),
  threads:svg('<circle cx="12" cy="12" r="3.3"/><path d="M15.3 9v4.2c0 1.2 1 2 2 2s2-.8 2-2V12a7.3 7.3 0 10-2.9 5.8"/>',ST),
  site:svg('<path d="M4 11l8-6.5 8 6.5M6 9.8V19h4.5v-5h3v5H18V9.8"/>',ST),
  link:svg('<path d="M10.5 13.5a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M13.5 10.5a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',ST)};
 /* 라벨 우선, 라벨로 못 정하면 주소로 판별 */
 const kind=s=>{const l=String(s.label||'').trim(),u=String(s.url||'');
  if(/페이스북|facebook/i.test(l))return'facebook';
  if(/인스타/.test(l))return'instagram';
  if(/유튜브|youtube/i.test(l))return'youtube';
  if(/블로그/.test(l))return'blog';
  if(/^(x|트위터)$/i.test(l))return'x';
  if(/스레드|threads/i.test(l))return'threads';
  if(/홈페이지|사이트|웹사이트|site/i.test(l))return'site';
  if(/facebook\.com|fb\.com/i.test(u))return'facebook';
  if(/instagram\.com/i.test(u))return'instagram';
  if(/youtube\.com|youtu\.be/i.test(u))return'youtube';
  if(/blog\.naver|tistory\.com|brunch\.co\.kr/i.test(u))return'blog';
  if(/\/\/(www\.)?(x|twitter)\.com/i.test(u))return'x';
  if(/threads\.(com|net)/i.test(u))return'threads';
  return'link'};
 window.personDetailHtml=function(p,d,o){o=o||{};
  const S=RFData.STATUS[p.status]||p.statusLabel||'';
  /* 배지(조직 상태)·제목(선거구)과 겹치는 값은 넣지 않음. 직책은 조직 상태와 다를 때만 표시 */
  const rows=[['직책',p.position&&p.position!==S?p.position:''],['출마 선거',p.candidacy&&p.candidacy.label],['출마 지역',p.candidacy&&p.candidacy.subRegion]].filter(r=>r[1]);
  const cv=cvHtml([['학력',p.education],['주요 경력',p.career],['정치 활동',p.activities],['기타 주요 이력',p.bio]]);
  const sns=(p.sns||[]).filter(s=>s&&s.url);
  const icons=sns.length?`<div class="sns-row">${sns.map(s=>{const k=kind(s),l=s.label||'링크';return `<a class="sns" data-k="${k}" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer" aria-label="${esc(l)}" title="${esc(l)}"><i class="sns-i">${ICON[k]}</i></a>`}).join('')}</div>`:'';
  const more=o.link?`<a class="more" href="person.html?id=${encodeURIComponent(p.id)}${RFData.demo?'&demo=1':''}">상세 페이지 ›</a>`:'';
  return `<section class="pcard"><div class="profile">${avatar(p)}<div class="pinfo">${S?`<span class="badge ${esc(p.status)}">${esc(S)}</span>`:''}<strong class="pname">${esc(p.name)}</strong><div class="pmeta">${p.party?`<span>${esc(p.party)}</span>`:''}${p.age?`<span>${esc(p.age)}세</span>`:''}</div>${icons}${more}</div></div>
  ${rows.length?`<dl class="kv">${rows.map(r=>`<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join('')}</dl>`:''}
  <h3>약력</h3>${cv||'<p class="muted" style="margin:0;font-size:14px">등록된 약력 정보가 없습니다.</p>'}</section>`};
})();

/* 다크모드 전환: 저장된 선택(rf-theme)이 있으면 그것을, 없으면 기기 설정을 따라감. 첫 화면 깜빡임을 막기 위한 초기 적용은 각 HTML head의 스크립트가 담당 */
(function(){
 const KEY='rf-theme',R=document.documentElement,btn=document.getElementById('themebtn'),mq=matchMedia('(prefers-color-scheme:dark)');
 const saved=()=>{try{const v=localStorage.getItem(KEY);return v==='dark'||v==='light'?v:null}catch(e){return null}};
 const apply=t=>{R.dataset.theme=t;const m=document.querySelector('meta[name=theme-color]');if(m)m.content=t==='dark'?'#1a1d22':'#ffffff';
  if(btn){const d=t==='dark';btn.setAttribute('aria-pressed',d);btn.setAttribute('aria-label',d?'라이트 모드로 전환':'다크 모드로 전환');btn.title=d?'라이트 모드로 전환':'다크 모드로 전환'}};
 apply(R.dataset.theme==='dark'?'dark':'light');
 if(btn)btn.onclick=()=>{const t=R.dataset.theme==='dark'?'light':'dark';apply(t);try{localStorage.setItem(KEY,t)}catch(e){}};
 const on=e=>{if(!saved())apply(e.matches?'dark':'light')};mq.addEventListener?mq.addEventListener('change',on):mq.addListener(on);
})();

/* 비공식 사이트 안내: 접속하면 표시. '확인했어요'(또는 Esc·바깥 클릭)는 이번 접속(탭) 동안만, '오늘은 다시 보지 않기'는 오늘 자정까지 숨김. 하단에는 항상 한 줄 안내.
 * 문구를 바꿔 모두에게 다시 보여주고 싶으면 아래 KEY의 v1을 v2로 올리세요. */
(function(){
 const KEY='rf-notice-v1',URL='https://reformparty.kr/';
 const m=document.querySelector('main');
 if(m)m.insertAdjacentHTML('beforeend',`<p class="site-note">이 사이트는 개혁신당 공식 사이트가 아닌 당원 개인이 만든 사이트입니다. 실제 정보와 다를 수 있으니 정확한 내용은 <a href="${URL}" target="_blank" rel="noopener noreferrer">당 홈페이지</a>에서 확인하세요.</p>`);
 const today=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
 try{if(localStorage.getItem(KEY)===today()||sessionStorage.getItem(KEY))return}catch(e){}
 const prev=document.activeElement,chk='<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7.6 12.4l3 3 5.8-6.2" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 const w=document.createElement('div');w.className='nt-back';
 w.innerHTML=`<div class="nt" role="dialog" aria-modal="true" aria-labelledby="nt-t" aria-describedby="nt-d"><div class="nt-ic" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.6" r=".6" fill="currentColor"/></svg></div><h2 id="nt-t">개혁신당 공식 사이트가 아니에요</h2><p id="nt-d" class="nt-sub">당원 개인이 만든 사이트입니다.</p><ul class="nt-list"><li>${chk}<span>정확한 정보는 <a href="${URL}" target="_blank" rel="noopener noreferrer">reformparty.kr</a> 당 홈페이지에서 확인하세요</span></li><li>${chk}<span>실제 정보와 다른 점이 있을 수 있으니 유의해 주세요</span></li></ul><div class="nt-btns"><button type="button" class="nt-sk" id="nt-today">오늘은 다시 보지 않기</button><button type="button" class="nt-ok" id="nt-ok">확인했어요</button></div></div>`;
 document.body.appendChild(w);document.body.style.overflow='hidden';
 const ok=w.querySelector('#nt-ok');ok.focus();
 const close=day=>{try{day===true?localStorage.setItem(KEY,today()):sessionStorage.setItem(KEY,'1')}catch(e){}removeEventListener('keydown',key);document.body.style.overflow='';w.classList.add('out');setTimeout(()=>w.remove(),170);if(prev&&prev.focus)prev.focus()};
 function key(e){if(e.key==='Escape'){close();return}
  if(e.key==='Tab'){const f=[...w.querySelectorAll('a,button')],i=f.indexOf(document.activeElement);
   if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}}}
 addEventListener('keydown',key);ok.onclick=()=>close();w.querySelector('#nt-today').onclick=()=>close(true);w.addEventListener('click',e=>{if(e.target===w)close()});
})();

/* 15차: 사이트 하단 문의 안내 (모든 페이지 공통). 메일 주소는 MAIL 한 곳에서만 수정 */
(function(){
 const MAIL='reform.orange26@gmail.com',m=document.querySelector('main');if(!m)return;
 m.insertAdjacentHTML('afterend',`<footer class="site-foot"><p>오류·정정·건의 사항이 있으시면 <span class="nw"><a href="mailto:${MAIL}">${MAIL}</a>으로</span> 연락해 주세요.</p></footer>`);
})();

/* 16차: 선거구 관할지역 한 줄 (data/district-areas.js, 공직선거법 별표 1). 없으면 아무것도 표시하지 않음 */
window.areaHtml=id=>{const a=(window.RF_DISTRICT_AREAS||{})[String(id||'')];return a?`<div class="area"><div class="area-row"><b>관할지역</b><span class="area-t">${esc(a)}</span><button type="button" class="area-more" aria-expanded="false" hidden>더보기</button></div></div>`:''};
/* 관할지역이 한 줄을 넘으면 '더보기' 버튼을 보여주고, 누르면 전체를 펼침 */
(function(){
 const fit=r=>{const t=r.querySelector('.area-t'),b=r.querySelector('.area-more');if(!t||!b)return;
  if(r.classList.contains('open')){b.hidden=false;return}
  b.hidden=true;b.hidden=!(t.scrollWidth>t.clientWidth+1)};
 const all=()=>document.querySelectorAll('.area').forEach(fit);
 new MutationObserver(m=>{if(m.some(x=>[...x.addedNodes].some(n=>n.nodeType===1&&(n.matches('.area')||n.querySelector('.area')))))all()}).observe(document.body,{childList:true,subtree:true});
 addEventListener('resize',all);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(all);
 document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.area-more');if(!b)return;
  const r=b.closest('.area'),o=r.classList.toggle('open');b.textContent=o?'접기':'더보기';b.setAttribute('aria-expanded',o)});
})();
