#!/usr/bin/env python3
"""읍면동 득표 지도 데이터 빌드  →  data/dong-map.json
입력 : reform26/election results/results.js (REGIONAL = 광역비례, 읍면동별 득표)
       vuski/admdongkor 행정동 경계 GeoJSON (기본 ver20260401)
사용 : python3 tools/build-dong-data.py <results.js> <HangJeongDong.geojson>
필요 : node + mapshaper (npm i -g mapshaper)
출력 : data/dong-map.js (경계 단순화 + 동별 득표율 포함, <script>로 읽어 file://에서도 동작), 콘솔에 매칭 보고
"""
import json,re,sys,subprocess,collections,os,tempfile
RES,GEO=sys.argv[1],sys.argv[2]
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIDO={'서울특별시':'서울','부산광역시':'부산','대구광역시':'대구','울산광역시':'울산','경기도':'경기','경상북도':'경북','경상남도':'경남','제주특별자치도':'제주'}
sg=lambda s: re.sub(r'[^가-힣0-9]','',s).replace('시','')
dg=lambda s: re.sub(r'제(\d)',r'\1',re.sub(r'[^가-힣0-9]','',s))
alt=lambda d: re.sub(r'(.)제?(\d)',lambda m:m.group(1)+m.group(2),d) if False else re.sub(r'(.)제(\d)',r'\1\2',d)

# 1) results.js → JSON (node 로 REGIONAL 추출)
js=tempfile.mktemp(suffix='.js')
open(js,'w').write("const fs=require('fs'),vm=require('vm');const c={window:{},console};vm.createContext(c);"
 "vm.runInContext(fs.readFileSync(process.argv[2],'utf8')+';this.R=REGIONAL;',c);process.stdout.write(JSON.stringify(c.R))")
R=json.loads(subprocess.check_output(['node',js,RES]))

# 2) 경계
F=[f for f in json.load(open(GEO,encoding='utf-8'))['features'] if f['properties']['sidonm'] in SIDO]
poly=collections.defaultdict(dict)
for f in F:
    p=f['properties']; poly[(SIDO[p['sidonm']],sg(p['sggnm']))][dg(p['adm_nm'].split()[-1])]=f
def find(sido,sgg,d):
    for dd in (d,alt(d)):
        ks=[k for k in poly if k[0]==sido and sgg and (k[1]==sgg or k[1]==sgg+'구' or k[1]==sgg+'군' or (k[1].endswith(sgg) and len(sgg)>=3) or sgg.endswith(k[1]))]
        for k in ks:
            if dd in poly[k]: return poly[k][dd],'exact'
        stem=(sgg or '')[:2]
        for how,pred in (('city',lambda k:k[1].startswith(stem)),('sido',lambda k:True)):
            c=[v[dd] for k,v in poly.items() if k[0]==sido and dd in v and pred(k)]
            if len(c)==1: return c[0],how
    return None,None

# 3) 득표 행 → 폴리곤 (뒤에 오는 행이 앞을 덮어씀: 부산 연제/사상 블록 중복 대응)
got={}; how=collections.Counter(); miss=[]; sidoRate={}
for r in R:
    sido=r['name']; sidoRate[sido]=r['rate']; cur=None
    for n in r['neighborhoods']:
        m=re.match(r'(.+)_관외사전투표$',n['name'])
        if m: cur=sg(m.group(1)); continue
        f,h=find(sido,cur,dg(n['name'])); how[h]+=1
        if not f: miss.append((sido,cur,n['name'])); continue
        got[f['properties']['adm_cd2']]=(f,n['rate'],sum(v.get('count',0) for v in n['votes'].values()),sido)

# 3b) 동 → 선거구(SGG_Code): data/vote-results.js 의 광역비례 관할 행(rows)로 연결
VR=os.path.join(ROOT,'data','vote-results.js'); owner={}; vmiss=0
if os.path.exists(VR):
    V=json.loads(open(VR,encoding='utf-8').read().split('window.RF_VOTES=',1)[1].strip().rstrip(';'))
    for sid,sv in V['bySgg'].items():
        gw=sv.get('gw')
        if not gw: continue
        reg=gw['region']
        for row in gw['rows']:
            n=row['n']
            if n.endswith(' 전체'):
                g=sg(n[:-3]); fs=[f for k,v in poly.items() if k[0]==reg and (k[1]==g or k[1].startswith(g)) for f in v.values()]
            else:
                a,b=n.rsplit(' ',1); f,_=find(reg,sg(a),dg(b)); fs=[f] if f else []
            if not fs: vmiss+=1
            for f in fs: owner[f['properties']['adm_cd2']]=sid
# 4) 출력 (득표 있는 동만, 단순화 전 임시 파일)
feats=[]
for c,(f,rate,votes,sido) in got.items():
    p=f['properties']
    feats.append({'type':'Feature','geometry':f['geometry'],'properties':{'c':c,'n':p['adm_nm'].split(' ',1)[1],'s':sido,'g':p['sggnm'],'r':rate,'v':votes,'d':owner.get(c,'')}})
tmp=tempfile.mktemp(suffix='.geojson'); json.dump({'type':'FeatureCollection','features':feats},open(tmp,'w'),ensure_ascii=False)
out=tempfile.mktemp(suffix='.json')
subprocess.check_call(['mapshaper',tmp,'-simplify','6%','keep-shapes','-o',out,'format=geojson','precision=0.0001','force'])
meta={'sidoRate':sidoRate,'source':'reform26/election results.js(광역비례) + vuski/admdongkor ver20260401'}
simp=json.load(open(out,encoding='utf-8'))
open(os.path.join(ROOT,'data','dong-map.js'),'w',encoding='utf-8').write('/* 자동 생성 파일 — tools/build-dong-data.py 로 만든 값입니다. 직접 수정하지 마세요. */\nwindow.RF_DONG='+json.dumps({'meta':meta,'features':simp['features']},ensure_ascii=False,separators=(',',':'))+';\n')
print('매칭',dict(how)); print('동 폴리곤',len(feats),'/ 해당 8개 시도 전체',len(F)); print('못 맞춘 행',miss)
print('선거구 연결된 동:',sum(1 for f in feats if f['properties']['d']),'/',len(feats),'· 연결 못한 관할 행:',vmiss)
print('득표 없는 동(경계만 있음):',len(F)-len(feats))
