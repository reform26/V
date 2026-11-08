# 개혁신당 당협위원장 현황 (1차)
- 실행: 폴더에서 `python3 -m http.server` 후 http://localhost:8000 (file:// 직접 열기는 JSON 로딩 불가). 테스트 화면: `?demo=1`
- 배포: GitHub 저장소에 푸시 → Settings > Pages > 브랜치 선택. 모든 경로가 상대 경로라 하위 경로 배포 가능
- 실제 SVG: `assets/maps/districts.svg` 로 저장. 각 선거구 요소의 id가 districts.json의 `id`(또는 `svgId`)와 같아야 함
- 실제 데이터: `data/districts.json`(254개), `data/chairpersons.json` 채우기. 불일치 ID는 브라우저 콘솔에 경고

## 지도 데이터 (2차: 오마이뉴스 22대 총선 선거구 지도)
- 출처: https://github.com/OhmyNews/2024_22_elec_map (MIT, WGS84 GeoJSON). 사이트 하단에 출처와 기준(2024년 제22대 총선)을 표시합니다.
- 사용 파일 2개를 `data/map/`에 넣으세요: `2024_22_Elec_simplify.json`, `22_Elec_SGG.csv` (원본 LICENSE도 함께 보관 권장). 없으면 원본 저장소(raw.githubusercontent.com)에서 직접 불러오며, 안정적인 운영을 위해서는 내려받아 두는 것을 권장합니다.
- 식별자는 `SGG_Code`입니다. `chairpersons.json`의 `districtId`와 `districts.json`의 `id`에 SGG_Code를 쓰세요. 선거구 목록은 CSV에서 자동 생성됩니다.
- GeoJSON은 d3-geo(CDN, 버전 고정)로 SVG path로 변환됩니다. 오프라인이 필요하면 d3-array/d3-geo를 `assets/js/vendor/`에 두고 `index.html`의 script 주소를 바꾸세요.
- 검증(254개, 코드 중복·누락, CSV 일치, 명칭 일치, 렌더링 실패)은 로딩 시 자동 실행되어 콘솔과 `window.RFReport`에 출력됩니다.
- 지도 출처·기준 선거 기록: `data/map/source.json`. 1차 작업 원본은 `_backup_phase1/`에 보관했습니다.

## 조직 현황 3단계 (3차)
- 데이터: `data/chairpersons.json` (status: chairperson=당협위원장 / organizing_chair=조직위원장 / application=조직위 신청). `sggCode`는 지도의 SGG_Code, `sggName`은 CSV 선거구명(대조용). 인사 변경은 이 파일만 수정.
- 지도 색상은 인물의 상태로 결정되며, 등록되지 않은 선거구는 "정보 없음(회색)"입니다. 공석·미임명을 뜻하지 않습니다.
- 한 선거구에 여러 명이 등록되면 패널에는 모두 표시하고 지도 색은 가장 높은 단계(당협위원장 > 조직위원장 > 조직위 신청) 기준입니다. 검증에서 경고합니다.
- 검증: 로딩 시 인원수(`_meta.expectedCounts`와 비교), 중복, 코드/선거구명 일치를 콘솔 `[조직 현황 검증]`에 출력합니다.

## 더블클릭(file://) 실행
- 브라우저는 file:// 에서 fetch로 JSON을 읽지 못하므로, `data/chairpersons.js`(사본)를 script로 불러 대신 사용합니다. 서버·GitHub Pages에서는 `chairpersons.json`이 우선입니다. 인사 변경 시 `.json`과 `.js`를 같은 내용으로 맞추세요.
- 지도 파일은 로컬 읽기에 실패하면 원본 저장소(인터넷)에서 불러옵니다. 오프라인에서 더블클릭으로 쓰려면 별도 JS 변환이 필요합니다.

## 경기남부 자세히 보기 (5차)
- 전국 지도 상단의 '경기남부 자세히 보기' 버튼으로 전환, '전국 지도 돌아가기'로 복귀합니다. 주소 끝에 `#gs`를 붙이면 바로 열립니다. 기존 지도·우측 인물 패널·시도 선택은 그대로 재사용합니다.
- 대상 6개 시(수원·화성·용인·성남·평택·오산)와 선거구는 `data/regions.js`에 SGG_Code로 명시 정의합니다(이름 부분 일치로 연결하지 않음). 도시·선거구 변경은 이 파일만 수정하세요.
- 통계·도시별 표·목록은 `chairpersons.json`에서 자동 집계합니다(선거구 1곳을 1번만 세며 색상과 같은 '가장 높은 단계' 기준, 합계=대상 선거구 수).
- 로딩 시 코드 존재·선거구명 일치·중복·누락 의심을 검증해 콘솔 `[경기남부 검증]`, `window.RFReport.gs`에 출력합니다.
- 변경 파일: index.html, assets/js/map.js(연결 훅 추가), assets/js/gs.js(신규), assets/css/style.css, data/regions.js(신규). 변경 전 원본은 `_backup_phase5/`.

## 우측 상세 패널 개편 + 토스 스타일 (6차)
- 상세 패널: 선거구 제목·조직 상태 배지와 겹치던 항목(성명·소속 정당·조직상 직책·담당 지역·조직 상태)을 기본 정보에서 제거. 정당·나이는 이름 아래, 출마 선거·출마 지역만 정보 박스에 표시(직책은 조직 상태와 다를 때만 표시).
- 사진은 3:4 세로형 둥근 사각형(152×202). SNS·링크는 아이콘 버튼(페이스북·인스타그램·유튜브·블로그·X, 그 외는 링크 아이콘). 아이콘은 라벨을 먼저 보고 주소로 보조 판별.
- 디자인: assets/css/style.css 맨 아래 '6차' 블록이 기존 스타일을 덮어씀(되돌리려면 그 블록 삭제). Pretendard 웹폰트 추가. 변경 전 원본은 `_backup_phase6/`.
- 7차: 우측 패널 스크롤 최소화 — SNS 아이콘(이름 없이 아이콘만)과 '상세 페이지 ›' 링크를 사진 옆으로 이동, 별도 '링크' 영역·하단 버튼 제거, 사진 140×186, 간격 축소. 변경 전 파일은 `_backup_phase6/*.before-compact`.
- 8차: 당협위원장 목록(people.html) 토스 스타일 — 3:4 큰 사진 카드(4열, 모바일 2열), 큰 제목·요약 칩·검색창. 변경 전 파일은 `_backup_phase6/*.before-list`.
- 9차: 전국 지도(index) 토스 스타일 — 요약 패널(큰 등록 인원 숫자·상태 비율 막대·상태별 행), 범례를 우측 하단으로 이동, 시도 경계선 완화, 출처 문구 톤 정리. 변경 전 파일은 `_backup_phase6/*.before-home`.
- 10차: 선거구 정식 표기 — 지도 CSV의 붙여 쓴 이름(예: 인천 중구강화옹진)을 `data/district-names.js`(SGG_Code → 정식 지역명) 표로 화면에 '인천 중구·강화군·옹진군'처럼 표시. 69곳 정의, 표에 없는 선거구는 CSV 이름 그대로. 연결·검증은 계속 SGG_Code와 원본 CSV명(csvName) 기준이라 영향 없음. 변경 전 파일은 `_backup_phase6/*.before-names`.

## 다크모드 (11차)
- 다크 스타일은 `<html data-theme="dark">`일 때 적용됩니다(13차에서 시스템 설정 직접 참조 방식에서 변경). 변경 파일: assets/css/style.css(맨 아래 '11차' 블록 — 삭제하면 원복), index.html·people.html·person.html(color-scheme·theme-color 메타, CSS 캐시 버전 v=19), assets/js/map.js(검증 오류 문구 색을 인라인 → `.gs-warn` 클래스), assets/images/logo.svg(다크에서 글자색 밝게).
- 지도 상태 색(주황·초록·보라)은 두 모드에서 동일하고, '정보 없음' 회색·바탕·카드·배지만 어둡게 바뀝니다. 범례의 회색 점은 인라인 색 대신 `.lg-none` 클래스를 씁니다.
- 변경 전 파일은 `_backup_phase6/*.before-dark`.

## 모바일 대응 (12차)
- 레이아웃: 좁은 화면에서 상단 메뉴가 넘치던 문제 수정(400px 이하에서는 로고만 표시), 범례를 지도 아래로 이동(제주를 가리지 않음), 지도 높이는 화면에 맞춰 300~560px, 조작 버튼·시도 선택은 44px 이상, 노치·홈바 여백(safe-area) 반영, 목록 필터는 한 줄 3칸, 경기남부 도시 칩은 옆으로 밀어서 선택. 입력창·선택창은 16px로 고정(iOS 자동 확대 방지).
- 터치 동작(assets/js/map.js): 두 손가락으로 지도 확대·축소, 확대한 뒤에는 한 손가락으로 이동. 확대 전에는 지도 위에서도 페이지가 스크롤됩니다. 선거구를 누르면 아래 상세 패널로 이동하고, 패널 위 '← 지도로' 버튼으로 돌아옵니다. 손가락으로 누른 뒤 hover 표시가 남지 않고 툴팁은 터치에서 쓰지 않습니다.
- 변경 파일: style.css(맨 아래 '12차' 블록), map.js, index.html·people.html·person.html(viewport-fit=cover, CSS v=20). 변경 전 파일은 `_backup_phase6/*.before-mobile`.

## 다크모드 전환 버튼 (13차)
- 헤더 오른쪽 달/해 버튼으로 라이트·다크를 전환합니다. 선택은 브라우저 localStorage(`rf-theme`)에 저장되어 모든 페이지에 유지되고, 한 번도 누르지 않았다면 기기 설정을 그대로 따라갑니다(기기 설정이 바뀌면 즉시 반영).
- 첫 화면 깜빡임 방지: 각 HTML `<head>`의 짧은 스크립트가 CSS 로딩 전에 `data-theme`를 정합니다. 전환 처리는 assets/js/common.js 맨 아래.
- 로고는 `logo.svg`(밝은 화면)와 `logo-dark.svg`(어두운 화면) 두 파일을 헤더에서 번갈아 보여줍니다. 모바일 상단바 색(theme-color)도 함께 바뀝니다.
- 변경 파일: style.css(11·12차 블록 선택자 변경 + 13차 블록), common.js, index.html·people.html·person.html, logo.svg(11차의 내장 다크 설정 제거), logo-dark.svg(신규). 변경 전 파일은 `_backup_phase6/*.before-toggle`.

## 비공식 사이트 안내 (14차)
- 접속하면 '개혁신당 공식 사이트가 아니에요' 안내가 뜹니다(모바일은 아래에서 올라오는 시트, PC는 가운데 카드, 다크모드 지원). '확인했어요'(바깥 영역·Esc 포함)는 이번 접속(탭)이 끝날 때까지만 숨기고(sessionStorage), '오늘은 다시 보지 않기'는 오늘 자정까지 숨깁니다(localStorage `rf-notice-v1`에 날짜 저장). 문구를 바꿔 모두에게 다시 보여주려면 assets/js/common.js의 `KEY`를 `rf-notice-v2`로 올리세요. 변경 전 파일은 `_backup_phase6/*.before-today`(버튼 추가 전).
- 모든 페이지 하단에는 같은 취지의 한 줄 안내(`.site-note`)가 항상 표시됩니다.
- 당 홈페이지 주소·문구는 assets/js/common.js 맨 아래(`URL`, 안내 문구)에서 수정합니다. 스타일은 style.css의 '14차' 블록. 변경 전 파일은 `_backup_phase6/*.before-notice`.

- 하단 문의 안내: 모든 페이지 맨 아래에 '오류·정정·건의 사항은 reform.orange26@gmail.com 으로 연락' 문구가 표시됩니다. 주소는 assets/js/common.js 맨 아래 `MAIL`에서 수정하고, 스타일은 style.css의 '15차' 블록입니다. 변경 전 파일은 `_backup_phase7/*.before-footer`.

- 관할지역: 선거구 이름 아래에 '관할지역'(예: 서울 관악구 신사동, 조원동…)이 표시됩니다. 출처는 공직선거법 별표 1(국회의원지역선거구구역표, 2026. 4. 22. 개정)이며 data/district-areas.js(SGG_Code → 문구)에서 수정합니다. 지도 경계는 2024년 제22대 기준이므로 구역이 바뀌면 지도 파일도 함께 확인하세요. 변경 전 파일은 `_backup_phase7/pre-area/`.
