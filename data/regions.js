/* 경기남부 중점 지역 정의 (사이트 기준: 수원·화성·용인·성남·평택·오산 6개 시)
 * - 선거구는 이름 부분 일치가 아니라 SGG_Code로 명시 연결합니다. sggName은 지도 CSV의 선거구명과 대조하는 용도입니다.
 * - 도시를 추가·제외하거나 선거구가 바뀌면 이 파일만 수정하세요. 통계·지도·목록은 자동 갱신됩니다.
 * - 로딩 시 코드 존재 여부, 선거구명 일치, 중복, 누락 의심(같은 시 이름으로 시작하는데 여기 없는 선거구)을 자동 검증해
 *   콘솔 [경기남부 검증]과 window.RFReport.gs 에 출력합니다. */
window.RF_REGIONS={gyeonggiSouth:{
 label:'경기남부',sido:'경기도',
 cities:[
  {name:'수원시',stem:'수원',districts:[
   {sggCode:'2410101',sggName:'경기 수원갑'},{sggCode:'2410201',sggName:'경기 수원을'},{sggCode:'2410301',sggName:'경기 수원병'},
   {sggCode:'2410401',sggName:'경기 수원정'},{sggCode:'2410202',sggName:'경기 수원무'}]},
  {name:'화성시',stem:'화성',districts:[
   {sggCode:'2414801',sggName:'경기 화성갑'},{sggCode:'2414901',sggName:'경기 화성을'},{sggCode:'2414802',sggName:'경기 화성병'},
   {sggCode:'2414902',sggName:'경기 화성정'}]},
  {name:'용인시',stem:'용인',districts:[
   {sggCode:'2413501',sggName:'경기 용인갑'},{sggCode:'2413701',sggName:'경기 용인을'},{sggCode:'2413602',sggName:'경기 용인병'},
   {sggCode:'2413702',sggName:'경기 용인정'}]},
  {name:'성남시',stem:'성남',districts:[
   {sggCode:'2410501',sggName:'경기 성남수정'},{sggCode:'2410601',sggName:'경기 성남중원'},{sggCode:'2410701',sggName:'경기 성남분당갑'},
   {sggCode:'2410702',sggName:'경기 성남분당을'}]},
  {name:'평택시',stem:'평택',districts:[
   {sggCode:'2411501',sggName:'경기 평택갑'},{sggCode:'2411502',sggName:'경기 평택을'},{sggCode:'2411503',sggName:'경기 평택병'}]},
  {name:'오산시',stem:'오산',districts:[
   {sggCode:'2412701',sggName:'경기 오산'}]}
 ]}};
