/* 상대 경로만 사용 -> GitHub Pages 하위 경로 배포 가능. ?demo=1 이면 테스트 데이터/테스트 SVG 사용 */
(function(){
const demo=new URLSearchParams(location.search).get('demo')==='1';
const dir=demo?'data/sample/':'data/';
const RAW='https://raw.githubusercontent.com/OhmyNews/2024_22_elec_map/main/';
/* 지도 데이터 위치: 로컬(data/map/) 우선, 없으면 원본 저장소(raw)로 대체 */
const MAPSRC={geo:['data/map/2024_22_Elec_simplify.json',RAW+'2024_22_Elec_simplify.json'],csv:['data/map/22_Elec_SGG.csv',RAW+'22_Elec_SGG.csv'],meta:['data/map/source.json']};
/* 행정구역 통합: 전라남도+광주광역시 → 전남광주통합특별시 (CSV의 '전남'·'광주'를 모두 이 이름으로 묶음) */
const SHORT={서울:'서울특별시',부산:'부산광역시',대구:'대구광역시',인천:'인천광역시',광주:'전남광주통합특별시',대전:'대전광역시',울산:'울산광역시',세종:'세종특별자치시',경기:'경기도',강원:'강원특별자치도',충북:'충청북도',충남:'충청남도',전북:'전북특별자치도',전남:'전남광주통합특별시',경북:'경상북도',경남:'경상남도',제주:'제주특별자치도'};
async function first(urls,type){for(const u of urls){try{const r=await fetch(u,{cache:'no-store'});if(r.ok)return{url:u,data:type==='json'?await r.json():await r.text()}}catch(e){}}return null}
function parseCsv(t){const L=t.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());const cut=s=>s.trim().replace(/^"|"$/g,'');
 const h=L[0].split(',').map(cut);return L.slice(1).map(l=>{const c=l.split(',').map(cut),o={};h.forEach((k,i)=>o[k]=c[i]);return o})}
/* 화면 표시용 선거구명: 통합 시도의 약칭 '전남광주' 사용 (원본 CSV명은 csvName에 보관해 검증에 사용) */
const disp=n=>String(n||'').replace(/^(전남|광주) /,'전남광주 ');
/* 정식 표기: data/district-names.js(SGG_Code → 정식 지역명)에 있으면 시도 약칭 뒤 이름을 교체. 없으면 CSV 이름 그대로 */
const nm=(id,full)=>{const o=(window.RF_DISTRICT_NAMES||{})[id],s=String(full||'');if(!o)return disp(s);const i=s.indexOf(' ');return disp((i<0?'':s.slice(0,i+1))+o)};
let mapP=null;
window.RFData={
 demo,
 sidoName:s=>SHORT[s]||s,
 svgUrl:'assets/maps/sample-districts.svg',
 STATUS:{chairperson:'당협위원장',organizing_chair:'조직위원장',application:'조직위 신청'},NONE_LABEL:'정보 없음',
 SIDO:['서울특별시','부산광역시','대구광역시','인천광역시','전남광주통합특별시','대전광역시','울산광역시','세종특별자치시','경기도','강원특별자치도','충청북도','충청남도','전북특별자치도','경상북도','경상남도','제주특별자치도'],
 loadMap(){return mapP||(mapP=(async()=>{
  const [g,c,m]=await Promise.all([first(MAPSRC.geo,'json'),first(MAPSRC.csv,'text'),first(MAPSRC.meta,'json')]);
  return{geo:g&&g.data,geoUrl:g&&g.url,rows:c?parseCsv(c.data):null,csvUrl:c&&c.url,meta:m&&m.data}})())},
 async load(){
  const fails={};
  const get=async f=>{try{const r=await fetch(dir+f,{cache:'no-store'});if(r.ok)return await r.json();fails[f]='HTTP '+r.status}catch(e){fails[f]=(e&&e.message)||String(e)}
   const fb=window.RF_FALLBACK&&window.RF_FALLBACK[dir+f];if(fb){console.info('[데이터] 파일 읽기 실패로 내장 사본을 사용합니다:',dir+f);return fb}return null};
  const [d,c]=await Promise.all([get('districts.json'),get('chairpersons.json')]);
  const ov=(d&&d.districts)||[],persons=((c&&c.chairpersons)||[]).map(p=>({...p,id:p.id||p.personId,districtId:String(p.districtId||p.sggCode||'')}));
  let districts=ov;
  if(!demo){ /* 선거구 마스터 = CSV(SGG_Code) + districts.json의 상태 */
   const m=await RFData.loadMap();
   if(m.rows){const o=new Map(ov.map(x=>[String(x.id),x]));
    districts=m.rows.map(r=>{const id=String(r.SGG_Code).trim();return{id,sido:SHORT[r.SIDO]||r.SIDO,name:nm(id,r.SIDO_SGG),csvName:r.SIDO_SGG,status:(o.get(id)||{}).status}});
    const ids=new Set(districts.map(x=>x.id));ov.forEach(x=>{if(!ids.has(String(x.id)))console.warn('[데이터] districts.json의 알 수 없는 SGG_Code:',x.id)})}}
  const dMap=new Map(districts.map(x=>[String(x.id),x])),pByD=new Map(),psByD=new Map(),rep={errors:[],warnings:[],info:[]};
  const ORDER=Object.keys(RFData.STATUS),ids=new Set(),names=new Set();
  if(!c)rep.errors.push('조직 현황 파일('+dir+'chairpersons.json)을 불러오지 못했습니다 ['+(fails['chairpersons.json']||'알 수 없음')+']. 경로와 JSON 문법을 확인하세요');
  persons.forEach(p=>{const k=p.districtId;
   if(!RFData.STATUS[p.status])rep.errors.push(`알 수 없는 조직 상태: ${p.name} (${p.status})`);
   else if(p.statusLabel&&p.statusLabel!==RFData.STATUS[p.status])rep.errors.push(`상태 라벨 불일치: ${p.name}`);
   if(ids.has(p.id))rep.errors.push(`personId 중복: ${p.id}`);ids.add(p.id);
   if(names.has(p.name))rep.warnings.push(`동명이인 또는 중복 등록 가능성: ${p.name}`);names.add(p.name);
   if(!dMap.has(k)){rep.errors.push(`선거구 코드 매칭 필요: ${p.name} / ${p.region||''} ${p.districtName||''} (코드: ${k||'없음'})`);return}
   if(p.sggName&&(dMap.get(k).csvName||dMap.get(k).name)!==p.sggName)rep.errors.push(`선거구명 불일치 ${p.name}: 데이터 "${p.sggName}" / 지도 "${dMap.get(k).csvName||dMap.get(k).name}"`);
   if(!psByD.has(k))psByD.set(k,[]);psByD.get(k).push(p)});
  psByD.forEach((a,k)=>{a.sort((x,y)=>ORDER.indexOf(x.status)-ORDER.indexOf(y.status));pByD.set(k,a[0]);
   if(a.length>1)rep.warnings.push(`한 선거구에 ${a.length}명 등록: ${k} (${a.map(x=>x.name+'/'+x.statusLabel).join(', ')}) - 지도 색상은 가장 높은 단계 기준`)});
  const cnt={};ORDER.forEach(k=>cnt[k]=persons.filter(p=>p.status===k).length);
  rep.info.push(`등록 인물 ${persons.length}명 (`+ORDER.map(k=>`${RFData.STATUS[k]} ${cnt[k]}`).join(', ')+`), 선거구 연결 ${psByD.size}곳`);
  const exp=c&&c._meta&&c._meta.expectedCounts;
  if(exp){ORDER.forEach(k=>{if(exp[k]!=null&&cnt[k]!==exp[k])rep.errors.push(`${RFData.STATUS[k]} 인원 불일치: 기대 ${exp[k]} / 실제 ${cnt[k]}`)});
   if(exp.total!=null&&persons.length!==exp.total)rep.errors.push(`등록 인물 합계 불일치: 기대 ${exp.total} / 실제 ${persons.length}`)}
  if(!demo){console.groupCollapsed(`[조직 현황 검증] 오류 ${rep.errors.length} / 경고 ${rep.warnings.length}`);
   rep.info.forEach(x=>console.log(x));rep.warnings.forEach(x=>console.warn(x));rep.errors.forEach(x=>console.error(x));console.groupEnd()}
  return{districts,persons,dMap,pByD,psByD,report:rep,ok:districts.length>0,
   status:id=>{const a=pByD.get(id);return a?a.status:'none'}};
 }
};
})();
