#!/usr/bin/env node
/* 득표 데이터 빌드 스크립트
 *
 * reform26/election 저장소의 results/results.js · results/can.js 를 읽어서
 * 이 사이트의 선거구(관할지역)·당협위원장과 연결한 뒤 data/vote-results.js 를 만듭니다.
 *
 * 사용법 (reform-map 폴더에서):
 *   node tools/build-vote-data.js ../election/results
 *   (인자를 생략하면 ../election/results 를 찾습니다)
 *
 * 결과 데이터 구조 (window.RF_VOTES)
 *   bySgg[SGG_Code].gw  : 광역비례 — 관할 동/구 합산 개혁신당 득표율
 *   bySgg[SGG_Code].gc  : 기초비례 — 해당 시·군·구가 기초비례 데이터에 있을 때만
 *   cand["SGG_Code|이름"]: 후보 본인의 지방선거 득표 (이름+지역이 일치할 때만)
 *
 * election 저장소 데이터가 바뀌면 이 스크립트를 다시 돌리고 index/person.html 의
 * vote-results.js?v= 숫자를 올리면 됩니다.
 */
const fs = require('fs'), vm = require('vm'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.resolve(process.argv[2] || path.join(ROOT, '..', 'election', 'results'));
const read = f => fs.readFileSync(f, 'utf8');
const run = (file, expose) => {
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(read(file) + '\n;' + expose, ctx);
  return ctx;
};

/* ---------- 입력 읽기 ---------- */
const rs = run(path.join(SRC, 'results.js'),
  'this.RESULTS=RESULTS;this.REGIONAL=typeof REGIONAL!=="undefined"?REGIONAL:[];this.BASIC=typeof BASIC!=="undefined"?BASIC:[];');
const RESULTS = rs.RESULTS, REGIONAL = rs.REGIONAL, BASIC = rs.BASIC;
const cs = run(path.join(SRC, 'can.js'), 'this.C=candidates;');
const AREAS = run(path.join(ROOT, 'data', 'district-areas.js'), '').window.RF_DISTRICT_AREAS;
const CHAIR = JSON.parse(read(path.join(ROOT, 'data', 'chairpersons.json'))).chairpersons || [];

/* ---------- 공통 유틸 ---------- */
const SIDO = ['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'];
const FULL = { 서울특별시:'서울', 부산광역시:'부산', 대구광역시:'대구', 인천광역시:'인천', 광주광역시:'광주', 대전광역시:'대전', 울산광역시:'울산',
  세종특별자치시:'세종', 경기도:'경기', 강원특별자치도:'강원', 강원도:'강원', 충청북도:'충북', 충청남도:'충남', 전북특별자치도:'전북', 전라북도:'전북',
  전라남도:'전남', 경상북도:'경북', 경상남도:'경남', 제주특별자치도:'제주', 전남광주통합특별시:'광주/전남' };
const toShort = s => { s = String(s || '').trim(); const f = s.split(/\s+/)[0]; return SIDO.includes(f) ? f : (FULL[f] || f); };
const sidoEq = (a, b) => a === b || (a === '광주/전남' && (b === '광주' || b === '전남')) || (b === '광주/전남' && (a === '광주' || a === '전남'));
const nrm = s => String(s).replace(/시/g, '').replace(/[^가-힣0-9]/g, '');   // 시·군·구 이름 비교용 (수원시 장안구 → 수원장안구)
const dn = s => String(s).replace(/[^가-힣0-9]/g, '');                         // 동 이름 비교용 (금호2․3가동 → 금호23가동)
const r2 = n => Math.round(n * 100) / 100;

/* ---------- 관할지역 문자열 → 부분 목록 ----------
 * 예) "경기 수원시 권선구 세류2동, 권선1동, 수원시 영통구 영통2동"
 *     → [{unit:[수원시,권선구], dong:세류2동}, {unit:[수원시,권선구], dong:권선1동}, {unit:[수원시,영통구], dong:영통2동}]
 *     "서울 성동구 금호1가동, 중구 일원" → 동 1개 + {unit:[중구], whole:true} */
const prefixSido = {};                                   // SGG_Code 앞 3자리 → 시도 (시도 표기가 없는 문구 보완용)
for (const [id, v] of Object.entries(AREAS)) { const f = v.split(' ')[0]; if (SIDO.includes(f)) prefixSido[id.slice(0, 3)] = f; }
function parseArea(id, str) {
  const parts = []; let sido = null, unit = null;
  for (const raw of str.split(/,\s*/)) {
    const w = raw.trim().split(/\s+/).filter(Boolean); if (!w.length) continue;
    if (SIDO.includes(w[0])) sido = w.shift();
    if (!sido) sido = prefixSido[id.slice(0, 3)] || null;
    if (!w.length) continue;
    if (w[w.length - 1] === '일원') { w.pop(); unit = w.slice(); parts.push({ sido, unit: unit.slice(), whole: true }); continue; }
    if (/[시군구]$/.test(w[w.length - 1])) { unit = w.slice(); parts.push({ sido, unit: unit.slice(), whole: true }); continue; }
    const dong = w.pop(); if (w.length) unit = w.slice();
    parts.push({ sido, unit: (unit || []).slice(), dong });
  }
  return parts;
}

/* ---------- 득표 인덱스 ----------
 * neighborhoods 는 '○○구_관외사전투표' 항목이 새 구역(블록)의 시작이고, 그 뒤가 그 구역의 동입니다. */
function indexBlocks(neigh, cityPrefix) {
  const blocks = []; let cur = null;
  for (const n of neigh) {
    if (/_관외사전투표$/.test(n.name)) {
      const base = n.name.replace(/_관외사전투표$/, '');
      const keys = [nrm(base)]; if (cityPrefix) keys.push(nrm(cityPrefix) + nrm(base));
      if (!/[구군]$/.test(nrm(base))) keys.push(nrm(base) + '구', nrm(base) + '군');   // 원본이 '해운대_관외사전투표'처럼 구를 빼고 적은 경우
      cur = { keys, head: n, dongs: new Map() }; blocks.push(cur); continue;
    }
    if (cur) cur.dongs.set(dn(n.name), n);
  }
  return blocks;
}
/* 항목 하나의 (득표수, 분모) — 분모는 득표수÷득표율 로 역산 */
function vd(n) {
  const v = n.votes || {}; let votes = 0, den = 0, any = false;
  for (const k of Object.keys(v)) {
    if (k === 'absentee') continue;
    const o = v[k]; if (!o || typeof o.count !== 'number') continue;
    votes += o.count; any = true; if (o.rate > 0) den += o.count / (o.rate / 100);
  }
  if (!any) return null;
  if (!den && n.rate > 0 && votes > 0) den = votes / (n.rate / 100);
  return { votes, den };
}
const vdAbs = n => { const a = n.votes && n.votes.absentee; return a && typeof a.count === 'number' ? { votes: a.count, den: a.rate > 0 ? a.count / (a.rate / 100) : 0 } : null; };
const unitMatch = (keys, u) => keys.some(k => k === u || k.startsWith(u));
/* 구역(블록) 이름이 어긋난 경우의 보완: 같은 범위 안에서 동 이름이 하나뿐이면 그 동으로 인정 */
let fallbackUsed = 0;
function uniqueDong(blocks, dong) {
  const hit = blocks.filter(b => b.dongs.has(dong));
  if (hit.length === 1) { fallbackUsed++; return hit[0].dongs.get(dong); }
  return null;
}

const regIdx = {};
for (const g of REGIONAL) {
  regIdx[g.name] = { g, blocks: indexBlocks(g.neighborhoods || []),
    dists: (g.districts || []).map(d => ({ key: nrm(d.name), d })) };
}
const basIdx = BASIC.map(b => {
  const [sido, ...rest] = b.name.split(' '); const city = rest.join(' ');
  return { b, sido, city, blocks: indexBlocks(b.neighborhoods || [], city) };
});

/* ---------- 선거구별 합산 ---------- */
function sum(acc, x, label) { acc.votes += x.votes; acc.den += x.den; acc.rows.push({ n: label, r: x.den > 0 ? r2(x.votes / x.den * 100) : null, v: x.votes }); }
const label = p => (p.whole ? p.unit.join(' ') + ' 일원' : (p.unit.length ? p.unit.join(' ') + ' ' : '') + p.dong);
const shortLabel = p => (p.whole ? p.unit.join(' ') + ' 전체' : (p.unit.slice(-1)[0] && /구$/.test(p.unit.slice(-1)[0]) ? p.unit.slice(-1)[0] + ' ' : (p.unit.length ? p.unit[0] + ' ' : '')) + p.dong);

function calcGw(parts) {
  const sido = parts.find(p => p.sido);
  const R = sido && regIdx[sido.sido]; if (!R) return null;
  const acc = { votes: 0, den: 0, rows: [] }, miss = [];
  let nDong = 0, nWhole = 0;
  for (const p of parts) {
    const u = nrm(p.unit.join(''));
    if (p.whole) {
      const ds = R.dists.filter(x => x.key === u || x.key.startsWith(u));
      if (!ds.length) { miss.push(label(p)); continue; }
      let votes = 0, den = 0; ds.forEach(x => { votes += x.d.votes; den += x.d.rate > 0 ? x.d.votes / (x.d.rate / 100) : 0; });
      sum(acc, { votes, den }, shortLabel(p)); nWhole++;
    } else {
      let n = null;
      for (const b of R.blocks) if (unitMatch(b.keys, u) && b.dongs.has(dn(p.dong))) { n = b.dongs.get(dn(p.dong)); break; }
      if (!n) n = uniqueDong(R.blocks, dn(p.dong));
      const x = n && vd(n);
      if (!x) { miss.push(label(p)); continue; }
      sum(acc, x, shortLabel(p)); nDong++;
    }
  }
  if (!acc.rows.length || acc.den <= 0) return null;
  return { region: R.g.name, regionRate: R.g.rate, rate: r2(acc.votes / acc.den * 100), votes: acc.votes,
    basis: nDong && nWhole ? 'mixed' : nDong ? 'dong' : 'whole', matched: acc.rows.length, total: parts.length, miss, rows: acc.rows };
}

function calcGc(parts) {
  const sido = parts.find(p => p.sido); if (!sido) return null;
  const hit = basIdx.filter(x => x.sido === sido.sido && parts.some(p => p.sido === x.sido && p.unit.length && nrm(p.unit[0]).startsWith(nrm(x.city))));
  if (!hit.length) return null;
  const B = hit[0];
  const acc = { votes: 0, den: 0, rows: [] }, miss = [];
  let nDong = 0;
  for (const p of parts.filter(p => p.sido === B.sido && p.unit.length && nrm(p.unit[0]).startsWith(nrm(B.city)))) {
    const u = nrm(p.unit.join(''));
    if (p.whole) {
      const bl = B.blocks.filter(b => unitMatch(b.keys, u) || u === nrm(B.city));
      if (!bl.length) { miss.push(label(p)); continue; }
      let votes = 0, den = 0;
      bl.forEach(b => { const a = vdAbs(b.head); if (a) { votes += a.votes; den += a.den; } b.dongs.forEach(n => { const x = vd(n); if (x) { votes += x.votes; den += x.den; } }); });
      if (den > 0) sum(acc, { votes, den }, shortLabel(p));
    } else {
      let n = null;
      for (const b of B.blocks) if ((u === nrm(B.city) || unitMatch(b.keys, u)) && b.dongs.has(dn(p.dong))) { n = b.dongs.get(dn(p.dong)); break; }
      if (!n) n = uniqueDong(B.blocks, dn(p.dong));
      const x = n && vd(n);
      if (!x) { miss.push(label(p)); continue; }
      sum(acc, x, shortLabel(p)); nDong++;
    }
  }
  if (!acc.rows.length || acc.den <= 0) return null;
  return { city: B.b.name, cityRate: B.b.rate, rate: r2(acc.votes / acc.den * 100), votes: acc.votes,
    basis: nDong ? 'dong' : 'whole', matched: acc.rows.length, total: parts.length, miss, rows: acc.rows };
}

/* ---------- 후보 본인 (can.js ↔ RESULTS) ----------
 * index.html 의 변환 규칙과 동일: 숨김·비례 제외 후 id = 순번(1부터) */
const filtered = cs.C.filter(c => c.visibility !== 'hidden' && c.constituency !== '비례' && c.district !== '비례' && c.category !== '비례의원');
const resById = new Map(RESULTS.map(r => [r.id, r]));
/* 검증: results.js 주석 "// [  1] 광역단체장 | 김정철 | 서울특별시장" 의 이름과 id 매핑이 맞는지 확인 */
let idMismatch = 0;
for (const m of read(path.join(SRC, 'results.js')).matchAll(/\/\/\s*\[\s*(\d+)\]\s*\S+\s*\|\s*([^|]+?)\s*\|/g)) {
  const c = filtered[+m[1] - 1]; if (!c || c.name !== m[2]) idMismatch++;
}
const placeLabel = c => {
  if (c.category === '광역단체장') return c.office || c.region;
  if (c.category === '재보궐선거') return ((c.region || '') + ' ' + (c.district || '')).trim();
  if (c.category === '광역의원' && c.constituencyFull) return c.office ? c.office + ' ' + c.constituencyFull : c.constituencyFull;
  if (c.category === '기초단체장') return (String(c.region || '').split(' ')[0] + ' ' + (c.office || '')).trim();
  const d = c.district && c.district !== '' ? ' ' + c.district + (/선거구$/.test(c.district) ? '' : '선거구') : '';
  return (c.region || '') + d;
};
const candList = [];
filtered.forEach((c, i) => {
  const r = resById.get(i + 1); if (!r || !(r.totalVotes > 0)) return;
  candList.push({ c, r });
});
/* ---------- 후보 본인 득표 중 '이 당협 선거구 관할지역'만 따로 합산 ----------
 * 광역단체장·기초단체장은 선거구(당협)보다 넓은 범위에서 출마하므로, 후보 본인의 읍면동 득표를
 * 당협 관할지역(district-areas.js)에 맞춰 합산해 함께 보여줍니다. (광역·기초의원은 본인 선거구만 있어 제외)
 * 세종처럼 구가 없는 곳은 '관외사전투표' 로 시작하는 한 덩어리라서 와일드카드 블록으로 처리합니다. */
function indexCandBlocks(neigh, cityPrefix) {
  const blocks = indexBlocks(neigh, cityPrefix); let cur = null; const wild = { wild: true, keys: [], head: null, dongs: new Map() };
  for (const n of neigh) {
    if (/_관외사전투표$/.test(n.name)) { cur = 'named'; continue; }
    if (n.name === '관외사전투표') { cur = 'wild'; wild.head = n; continue; }
    if (cur === 'wild') wild.dongs.set(dn(n.name), n);
  }
  if (wild.dongs.size) blocks.push(wild);
  return blocks;
}
function calcCandArea(c, r, parts) {
  if (c.category !== '광역단체장' && c.category !== '기초단체장') return null;
  const neigh = r.neighborhoods || []; if (!neigh.length) return null;
  const g = nrm(String(c.region || '').split(/\s+/)[1] || '');
  const ps = parts.filter(p => c.category === '광역단체장'
    ? sidoEq(toShort(c.metropolitan || c.region), p.sido)
    : g && p.unit.length && (nrm(p.unit.join('')).startsWith(g) || g.startsWith(nrm(p.unit[0]))));
  if (!ps.length) return null;
  const blocks = indexCandBlocks(neigh, c.category === '기초단체장' ? String(c.region || '').split(/\s+/)[1] : ''), hit = (b, u) => b.wild || unitMatch(b.keys, u);
  const acc = { votes: 0, den: 0, rows: [] }, miss = []; let nDong = 0, nWhole = 0;
  for (const p of ps) {
    const u = nrm(p.unit.join(''));
    if (p.whole) {
      const bl = blocks.filter(b => hit(b, u)); let votes = 0, den = 0;
      bl.forEach(b => { const a = b.head && vdAbs(b.head); if (a) { votes += a.votes; den += a.den; } b.dongs.forEach(n => { const x = vd(n); if (x) { votes += x.votes; den += x.den; } }); });
      if (!(den > 0)) { miss.push(label(p)); continue; }
      sum(acc, { votes, den }, shortLabel(p)); nWhole++;
    } else {
      let n = null;
      for (const b of blocks) if (hit(b, u) && b.dongs.has(dn(p.dong))) { n = b.dongs.get(dn(p.dong)); break; }
      if (!n) n = uniqueDong(blocks, dn(p.dong));
      const x = n && vd(n);
      if (!x) { miss.push(label(p)); continue; }
      sum(acc, x, shortLabel(p)); nDong++;
    }
  }
  if (!acc.rows.length || acc.den <= 0) return null;
  return { rate: r2(acc.votes / acc.den * 100), votes: acc.votes, basis: nDong && nWhole ? 'mixed' : nDong ? 'dong' : 'whole',
    matched: acc.rows.length, total: ps.length, miss, rows: acc.rows, partial: ps.length < parts.length };
}
function candFor(person, parts) {
  const out = [];
  for (const { c, r } of candList) {
    if (c.name !== person.name) continue;
    const cs_ = toShort(c.metropolitan || c.region);
    if (!parts.some(p => sidoEq(cs_, p.sido))) continue;
    /* 광역단체장·광역의원(시·도의원)은 region 이 시도명뿐이라 위의 시도 일치만 보면 충분합니다.
     * 기초단체장·기초의원만 region 의 두 번째 단어(구·시)를 선거구 관할지역과 비교합니다. */
    if (c.category === '재보궐선거') {
      /* 재보궐(국회의원) 후보는 region 이 시도명뿐 — 선거구명(district)·관할지역(subRegion)에서 뽑은 시·군·구 이름으로 비교 */
      const toks = cityTokens(c);
      if (!parts.some(p => sidoEq(cs_, p.sido) && cityOk(toks, p))) continue;
    } else if (c.category !== '광역단체장' && c.category !== '광역의원') {
      const gu = String(c.region || '').split(/\s+/)[1]; if (!gu) continue;
      const g = nrm(gu);
      if (!parts.some(p => p.unit.length && (nrm(p.unit.join('')).startsWith(g) || g.startsWith(nrm(p.unit[0]))))) continue;
    }
    const area = calcCandArea(c, r, parts);
    out.push({ type: c.category, place: placeLabel(c), rate: r.voteRate, votes: r.totalVotes, win: r.result === '당선', quota: r.quota || 1,
      ...(area ? { area: { ...area, name: person.districtName || person.sggName || '' } } : {}) });
  }
  return out;
}

/* ---------- 같은 지역의 '다른' 후보 (참고용) ----------
 * 선거구(당협) 관할지역에서 출마했거나 관할지역과 겹치는 개혁신당 후보를 찾아 ref[SGG_Code] 에 담습니다.
 *  - 광역단체장·기초단체장: 관할지역만 합산한 득표율(calcCandArea)
 *  - 광역의원·기초의원·재보궐: 후보 본인 선거구의 득표율 + 관할지역과 겹치는 동 목록
 * 당협위원장 본인으로 연결된 후보는 제외합니다. */
const KILL_WORD = /(선거구|^[갑을병정무]$|^제?\d+$|^의원$|^비례$)/;
function cityTokens(c) {
  const bag = [c.region, c.district, c.constituencyFull].filter(Boolean).join(' ').split(/[\s·,]+/);
  const toks = bag.map(w => w.replace(/\d+/g, '')).filter(w => /^[가-힣]{2,}$/.test(w) && !SIDO.includes(w) && !FULL[w] && !KILL_WORD.test(w));
  String(c.subRegion || '').split(/[\s·,]+/).forEach(w => { if (/^[가-힣]{2,}[시군구]$/.test(w)) toks.push(w); });
  return [...new Set(toks.map(nrm).filter(t => t.length >= 2))];
}
const cityOk = (toks, p) => {
  if (!toks.length || !p.unit.length) return true;
  const u = nrm(p.unit.join('')), u0 = nrm(p.unit[0]);
  return toks.some(t => u.startsWith(t) || t.startsWith(u0) || u0.startsWith(t));
};
function calcOverlap(c, r, parts) {
  const cSido = toShort(c.metropolitan || c.region);
  const raceDongs = new Map();
  for (const n of r.neighborhoods || []) { if (/관외사전투표$/.test(n.name)) continue; raceDongs.set(dn(n.name), n.name); }
  if (!raceDongs.size) return null;
  const toks = cityTokens(c), hit = new Map();
  for (const p of parts) {
    if (!sidoEq(cSido, p.sido) || !cityOk(toks, p)) continue;
    if (p.whole) {
      const R = regIdx[p.sido]; if (!R) continue;
      const u = nrm(p.unit.join(''));
      R.blocks.filter(b => unitMatch(b.keys, u)).forEach(b => b.dongs.forEach((_, k) => { if (raceDongs.has(k)) hit.set(k, raceDongs.get(k)); }));
    } else if (raceDongs.has(dn(p.dong))) hit.set(dn(p.dong), raceDongs.get(dn(p.dong)));
  }
  if (!hit.size) return null;
  return { m: [...hit.values()], n: raceDongs.size, full: hit.size === raceDongs.size };
}
const CAT_ORDER = ['광역단체장', '기초단체장', '광역의원', '기초의원', '재보궐선거'];
function refFor(id, parts, chairNames) {
  const out = [];
  for (const { c, r } of candList) {
    if (chairNames.has(c.name)) continue;
    const base = { name: c.name, type: c.category, place: placeLabel(c), rate: r.voteRate, votes: r.totalVotes, win: r.result === '당선', quota: r.quota || 1 };
    if (c.category === '광역단체장' || c.category === '기초단체장') {
      const a = calcCandArea(c, r, parts); if (!a) continue;
      base.area = { rate: a.rate, votes: a.votes, basis: a.basis, partial: a.partial, miss: a.miss.length };
    } else {
      const ov = calcOverlap(c, r, parts); if (!ov) continue;
      base.ov = ov;
    }
    const chair = CHAIR.find(p => p.name === c.name && sidoEq(toShort(p.region), toShort(c.metropolitan || c.region)));
    if (chair) base.pid = chair.personId || chair.id;
    out.push(base);
  }
  return out.sort((a, b) => CAT_ORDER.indexOf(a.type) - CAT_ORDER.indexOf(b.type) || (b.area ? b.area.rate : b.rate) - (a.area ? a.area.rate : a.rate));
}

/* ---------- 실행 ---------- */
const bySgg = {}, cand = {}, ref = {};
const stat = { sgg: 0, gw: 0, gwFull: 0, gc: 0, cand: 0, ref: 0, refSgg: 0, miss: {} };
for (const [id, str] of Object.entries(AREAS)) {
  const parts = parseArea(id, str); stat.sgg++;
  const gw = calcGw(parts), gc = calcGc(parts);
  if (gw) { stat.gw++; if (gw.miss.length === 0) stat.gwFull++; else (stat.miss[id] = (gw.miss)); }
  if (gc) stat.gc++;
  if (gw || gc) bySgg[id] = { ...(gw ? { gw } : {}), ...(gc ? { gc } : {}) };
  for (const p of CHAIR.filter(p => String(p.sggCode) === id)) {
    const cc = candFor(p, parts); if (cc.length) { cand[id + '|' + p.name] = cc; stat.cand++; }
  }
  const rf = refFor(id, parts, new Set(CHAIR.filter(p => String(p.sggCode) === id).map(p => p.name)));
  if (rf.length) { ref[id] = rf; stat.ref += rf.length; stat.refSgg++; }
}

const meta = { generatedAt: new Date().toISOString().slice(0, 10), source: 'reform26/election results', regionRates: Object.fromEntries(REGIONAL.map(g => [g.name, g.rate])) };
const out = '/* 자동 생성 파일 — tools/build-vote-data.js 로 만든 값입니다. 직접 수정하지 마세요. */\nwindow.RF_VOTES=' + JSON.stringify({ meta, bySgg, cand, ref }) + ';\n';
fs.writeFileSync(path.join(ROOT, 'data', 'vote-results.js'), out);

console.log('선거구', stat.sgg, '| 광역비례 연결', stat.gw, '(전부 매칭', stat.gwFull + ')', '| 기초비례 연결', stat.gc, '| 후보 본인 연결', stat.cand, '| 참고(같은 지역 다른 후보)', stat.ref + '명 / ' + stat.refSgg + '개 선거구');
console.log('results.js id↔can.js 이름 불일치:', idMismatch, '(0이면 정상)');
const missIds = Object.keys(stat.miss);
console.log('일부 지역 매칭 실패 선거구', missIds.length);
missIds.slice(0, 12).forEach(id => console.log(' ', id, AREAS[id].slice(0, 30), '→ 실패:', stat.miss[id].slice(0, 5).join(' / ')));
console.log('동 이름 보완 매칭(구역명 불일치) 건수', fallbackUsed);
console.log('파일 크기', (out.length / 1024).toFixed(1) + 'KB');
