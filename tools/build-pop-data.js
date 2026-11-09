/* 인구 집계: data/pop-src/*.csv (행안부 주민등록 연령별 인구현황, 행정동 단위, cp949) → data/pop-data.js
 * 사용: node tools/build-pop-data.js
 * - 대상: data/regions.js 의 경기남부 선거구. 관할 행정동은 data/district-areas.js 문구에서 읽습니다.
 * - 'XX구 A동, B동' 처럼 구 이름이 앞에 한 번만 나오면 다음 구가 나올 때까지 같은 구로 봅니다(정자1동·금곡동처럼 구마다 겹치는 이름 구분).
 * - '○○구 일원' / '○○시 일원'은 해당 구(시) 전체. 매칭 실패·중복은 콘솔에 목록으로 출력합니다.
 * - 연령 구간은 아래 BANDS 숫자만 고치면 됩니다. 인구는 1세 단위 원자료에서 다시 합산하므로 CSV를 다시 받을 필요가 없습니다. */
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..'),SRC=path.join(ROOT,'data/pop-src');
const BANDS=[ /* [키, 이름, 시작나이, 끝나이(포함)] */
 ['k','영유아',0,6],['e','초등',7,12],['h','중고등',13,18],['y2','19~29세',19,29],['y3','30~39세',30,39],
 ['m4','40대',40,49],['m5','50대',50,59],['m6','60~64세',60,64],['o','65세 이상',65,200]];
const dec=b=>new TextDecoder('euc-kr').decode(b);
function csv(t){const rows=[];let r=[],c='',q=false;for(let i=0;i<t.length;i++){const ch=t[i];
 if(q){if(ch=='"'){if(t[i+1]=='"'){c+='"';i++}else q=false}else c+=ch}
 else if(ch=='"')q=true;else if(ch==','){r.push(c);c=''}else if(ch=='\n'||ch=='\r'){if(ch=='\r'&&t[i+1]=='\n')i++;r.push(c);c='';if(r.length>1||r[0])rows.push(r);r=[]}else c+=ch}
 if(c||r.length){r.push(c);rows.push(r)}return rows}
const num=s=>Number(String(s).replace(/,/g,''))||0;

/* 1) 읍면동 인구 읽기: key = '시|구|동' (구 없는 시는 구=''), 시·구 합계 행은 'all' 로 따로 */
const dong=new Map(),guTotal=new Map(),cityTotal=new Map();
fs.readdirSync(SRC).filter(f=>f.endsWith('.csv')).forEach(f=>{
 const rows=csv(dec(fs.readFileSync(path.join(SRC,f))));const head=rows[0];
 const ageCols=head.map((h,i)=>({i,m:/_(\d+)세( 이상)?$/.exec(h)})).filter(x=>x.m).map(x=>({i:x.i,a:Number(x.m[1])}));
 rows.slice(1).forEach(r=>{
  const m=/^경기도 (\S+시)(?: (\S+구))? ?(\S*?)\((\d{10})\)$/.exec(r[0].trim());if(!m)return;
  const city=m[1],gu=m[2]||'',nm=m[3],code=m[4];
  const ages=new Array(101).fill(0);ageCols.forEach(c=>ages[c.a]+=num(r[c.i]));
  const rec={city,gu,name:nm,code,total:num(r[1]),ages};
  if(!nm&&gu)guTotal.set(city+'|'+gu,rec);else if(!nm&&!gu)cityTotal.set(city,rec);
  else dong.set(city+'|'+gu+'|'+nm,rec)})});
/* 'XX시 YY구 ' 뒤에 이름이 붙는 형식(예: "성남시 수정구 (4113100000)")은 위 정규식에서 nm=''로 잡힘 */

/* 2) 선거구별 관할 행정동 → 합산 */
const ld=f=>{const c={window:{}};vm.runInNewContext(fs.readFileSync(path.join(ROOT,f),'utf8'),c);return c.window};
const R=ld('data/regions.js').RF_REGIONS.gyeonggiSouth,AREAS=ld('data/district-areas.js').RF_DISTRICT_AREAS;
const out={},report={miss:[],dup:[],info:[]},used=new Map();
const guOfCity=c=>[...guTotal.keys()].filter(k=>k.startsWith(c.name+'|')).map(k=>k.split('|')[1]);
R.cities.forEach(c=>c.districts.forEach(d=>{
 const id=String(d.sggCode),txt=(AREAS[id]||'').replace(/^경기\s+/,'');
 const toks=txt.split(/,\s*/).map(s=>s.trim()).filter(Boolean);let curGu='',members=[];
 const hasGu=guOfCity(c).length>0;
 toks.forEach(t=>{
  let m=t.replace(new RegExp('^'+c.name+'\\s*'),'');          /* 앞의 '수원시 ' 제거 */
  const g=/^(\S+구)\s*(.*)$/.exec(m);if(g){curGu=g[1];m=g[2]}
  if(m==='일원'||m===''){                                      /* 구/시 전체 */
   const key=g?c.name+'|'+curGu:null;
   if(g){dong.forEach(r=>{if(r.city===c.name&&r.gu===curGu)members.push(r)})}
   else dong.forEach(r=>{if(r.city===c.name)members.push(r)});return}
  /* 1순위: 시|구|동 정확히. 2순위: 문구에 구가 없을 때(화성: 자료는 만세구·효행구…로 나뉘나 선거구 문구엔 구가 없음) 시 안에서 이름이 하나뿐이면 그 동.
   * 3순위: 자료에서 '고덕동'이 '고덕1동·고덕2동'으로 나뉜 경우처럼 '이름+숫자+동'으로 분할된 동 전부 */
  let r=dong.get(c.name+'|'+curGu+'|'+m),list=r?[r]:[];
  if(!list.length&&!curGu){const c1=[...dong.values()].filter(x=>x.city===c.name&&x.name===m);if(c1.length===1)list=c1}
  if(!list.length){const stem=m.replace(/동$/,'');const c2=[...dong.values()].filter(x=>x.city===c.name&&(!curGu||x.gu===curGu)&&new RegExp('^'+stem+'\\d+동$').test(x.name));
   if(c2.length){list=c2;report.info.push(`${id} ${d.sggName}: '${m}' → 자료의 ${c2.map(x=>x.name).join('·')} 로 합산 (구역표 표기와 자료 표기가 다름)`)}}
  if(list.length)members.push(...list);else report.miss.push(`${id} ${d.sggName}: '${t}' (구=${curGu||'-'}) 를 인구 자료에서 찾지 못함`)});
 const seen=new Set(),uniq=members.filter(r=>!seen.has(r.code)&&seen.add(r.code));
 uniq.forEach(r=>{if(used.has(r.code))report.dup.push(`${r.city} ${r.gu} ${r.name}: ${used.get(r.code)} 와 ${id} 에 중복`);used.set(r.code,id)});
 const sum=a=>uniq.reduce((s,r)=>s+a(r),0),tot=sum(r=>r.total);
 const bands={};BANDS.forEach(([k,,a,b])=>bands[k]=sum(r=>r.ages.slice(a,b+1).reduce((x,y)=>x+y,0)));
 const adult=sum(r=>r.ages.slice(18).reduce((x,y)=>x+y,0));
 const ages=Array.from({length:101},(_,a)=>sum(r=>r.ages[a]));   /* 1세 단위 합계(100은 100세 이상). rank.js 가 이 값으로 연령층을 자유롭게 묶음 */
 out[id]={city:c.name,dongs:uniq.length,total:tot,adult18:adult,bands,ages,
  rows:uniq.map(r=>({n:(r.gu?r.gu+' ':'')+r.name,t:r.total}))};
 if(!tot)report.miss.push(`${id} ${d.sggName}: 합계 0`)}));
/* 3) 검증: 시별로 선거구 합계 = 시 전체 인구 */
R.cities.forEach(c=>{const s=c.districts.reduce((a,d)=>a+(out[String(d.sggCode)]?out[String(d.sggCode)].total:0),0),t=cityTotal.get(c.name);
 report.info.push(`${c.name}: 선거구 합 ${s.toLocaleString()} / 시 전체 ${t?t.total.toLocaleString():'?'} ${t&&s===t.total?'OK':'(차이 '+(t?(t.total-s).toLocaleString():'?')+')'}`)});
const meta={generatedAt:new Date().toISOString().slice(0,10),source:'행정안전부 주민등록 인구통계(거주자, 2026년 10월)',bands:BANDS.map(([k,n,a,b])=>({k,n,from:a,to:b>150?null:b}))};
fs.writeFileSync(path.join(ROOT,'data/pop-data.js'),'/* 자동 생성 파일 — tools/build-pop-data.js 로 만든 값입니다. 직접 수정하지 마세요. */\nwindow.RF_POP='+JSON.stringify({meta,bySgg:out})+';\n');
console.log(report.info.join('\n'));
if(report.miss.length)console.log('\n[매칭 실패]\n'+report.miss.join('\n'));
if(report.dup.length)console.log('\n[중복]\n'+report.dup.join('\n'));
console.log('\n선거구',Object.keys(out).length,'곳 →data/pop-data.js');
