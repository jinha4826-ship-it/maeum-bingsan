#!/usr/bin/env python3
"""패턴 엔진 단위 테스트 (quickjs) — DOM 없이 analyzePatterns 를 직접 검증한다.

실행: python3 tests/unit_patterns.py
"""
import json, pathlib, sys
import quickjs

ROOT = pathlib.Path(__file__).resolve().parents[1]
V7 = ROOT / 'v7'

PRELUDE = r"""
var LANG='ko';
function isEN(){ return LANG==='en'; }
function tr(ko,en){ return LANG==='en'?en:ko; }
function uniq(a){ var o=[],i; for(i=0;i<a.length;i++){ if(a[i]!=null&&a[i]!==''&&o.indexOf(a[i])<0) o.push(a[i]); } return o; }
function esc(s){return String(s==null?'':s);}
function cut(s,n){ s=String(s||''); return s.length>n? s.slice(0,n)+'…' : s; }
function josa(w,a,b){ var c=String(w).charCodeAt(String(w).length-1); if(!(c>=0xAC00&&c<=0xD7A3)) return b; return ((c-0xAC00)%28!==0)?a:b; }
function dayKey(d){ d=d||new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function toast(){} function show(){} function refreshView(){}
var _ls={};
var localStorage={getItem:function(k){ return (k in _ls)?_ls[k]:null; },setItem:function(k,v){ _ls[k]=String(v); },removeItem:function(k){ delete _ls[k]; }};
var document={getElementById:function(){return null;},querySelectorAll:function(){return [];},createElement:function(){return {set innerHTML(v){},get innerHTML(){return '';},addEventListener:function(){}};},addEventListener:function(){},body:{className:''},documentElement:{lang:'ko'},activeElement:null,title:''};
var window={scrollTo:function(){}};
var records=[];
"""

ENGINE_FILES = ['js1_core.js', 'js3_pattern.js', 'js6_archive.js']

def make_ctx():
    ctx = quickjs.Context()
    ctx.eval(PRELUDE)
    for f in ENGINE_FILES:
        ctx.eval((V7 / f).read_text(encoding='utf-8'))
    return ctx

def rec(id_, date, emotions=None, needs=None, situation=None, category=None, reactions=None, thoughts=''):
    return {
        'id': id_, 'date': date,
        'situation': situation or '', 'situationCategory': category or '',
        'emotions': emotions or [], 'reactions': reactions or [],
        'thoughts': thoughts or '', 'needs': needs or [],
        'selfExpression': '', 'analysis': {'confirmed': None, 'userFeedback': ''}
    }

def load(ctx, rows):
    ctx.eval('records=' + json.dumps(rows, ensure_ascii=False) + ';')

def run(ctx, scope='all'):
    return json.loads(ctx.eval(
        '(function(){var a=analyzePatterns("%s");'
        'return JSON.stringify({n:a.n,active:a.active,patterns:a.patterns,obs:a.observations,'
        'cross:a.crosses,mis:a.mismatches,blind:a.blindSpots});})()' % scope))

RESULTS = []
def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS  ' if ok else 'FAIL  ') + name + (('  — ' + str(detail)) if detail and not ok else ''))

def main():
    ctx = make_ctx()

    # 1) 기존 기록(문자열 situation, feeling/need) 정상 로드
    load(ctx, [{'id': 1, 'date': '2026-11-10T10:00:00.000Z', 'situation': '회의에서 무시당함',
                'feeling': ['서운함'], 'need': ['이해받고 싶었어요'], 'other': '', 'action': ''}])
    r = run(ctx)
    check('기존 기록(v1) 로드 후 엔진 오류 없음', r['n'] == 1, r['n'])

    # 2) 욕구 없는 기존 기록
    load(ctx, [rec(1, '2026-11-10T10:00:00.000Z', ['서운함'], [], '회의'), rec(2, '2026-11-11T10:00:00.000Z', ['서운함'])])
    r = run(ctx)
    ok = r['n'] == 2 and not [p for p in r['active'] if p['type'] == 'need']
    check('욕구 없는 기존 기록도 오류 없이 집계 제외', ok)

    # 3) 같은 감정 3일 → 반복 단서
    load(ctx, [rec(1, '2026-11-10T10:00:00.000Z', ['서운함']), rec(2, '2026-11-11T10:00:00.000Z', ['서운함']),
               rec(3, '2026-11-12T10:00:00.000Z', ['서운함'])])
    r = run(ctx)
    emo = [p for p in r['active'] if p['type'] == 'emotion' and p['key'] == '서운함'][0]
    check('서로 다른 3일의 같은 감정 → 반복 단서', emo['level'] == 'clue' and emo['distinctDays'] == 3, emo['level'])

    # 4) 하루에 3건 → 반복 패턴 아님
    load(ctx, [rec(1, '2026-11-10T01:00:00.000Z', ['서운함']), rec(2, '2026-11-10T03:00:00.000Z', ['서운함']),
               rec(3, '2026-11-10T05:00:00.000Z', ['서운함'])])
    r = run(ctx)
    same = [p for p in r['patterns'] if p['type'] == 'emotion' and p['key'] == '서운함'][0]
    check('하루 3건은 3일 반복으로 오인하지 않음', same['level'] == 'record' and same['distinctDays'] == 1,
          (same['level'], same['distinctDays']))

    # 4b) 같은 감정 2일 → 반복 가능성 관찰 (단서 아님)
    load(ctx, [rec(1, '2026-11-10T09:00:00.000Z', ['서운함']), rec(2, '2026-11-11T09:00:00.000Z', ['서운함'])])
    r = run(ctx)
    two = [p for p in r['active'] if p['type'] == 'emotion' and p['key'] == '서운함'][0]
    check('2일 2건 → 반복 가능성 관찰', two['level'] == 'repeat_possible', two['level'])

    # 5) 연결 패턴: 상황·감정·욕구가 같은 기록에 실제로 존재
    rows = [rec(1, '2026-11-10T09:00:00.000Z', ['서운함'], ['이해'], '회의', '일·업무'),
            rec(2, '2026-11-11T09:00:00.000Z', ['서운함'], ['이해'], '회의', '일·업무'),
            rec(3, '2026-11-12T09:00:00.000Z', ['서운함'], ['이해'], '회의', '일·업무'),
            rec(4, '2026-11-13T09:00:00.000Z', ['서운함'], [], '회의', '일·업무')]
    load(ctx, rows)
    r = run(ctx)
    con = [p for p in r['active'] if p['type'] == 'connection']
    ok = bool(con) and con[0]['verified'] and con[0]['count'] == 3
    check('연결 패턴은 같은 기록의 세 요소만 센다', ok, con[0] if con else None)

    # 5b) 상황·감정·욕구가 다른 기록에 흩어져 있으면 연결 패턴 없음
    load(ctx, [rec(1, '2026-11-10T09:00:00.000Z', ['서운함'], [], '회의', '일·업무'),
               rec(2, '2026-11-11T09:00:00.000Z', ['서운함'], ['이해'], '회의', '관계'),
               rec(3, '2026-11-12T09:00:00.000Z', ['서운함'], ['이해'], '회의', '가족')])
    r = run(ctx)
    check('서로 다른 기록에 흩어진 요소는 연결 패턴이 되지 않음', len(r['active']) == 1 or all(p['type'] != 'connection' for p in r['active']))

    # 6) 인사이트 1: 서로 다른 상황 횡단
    rows = []
    sit = ['일·업무', '관계', '가족']
    for i, s in enumerate(sit):
        rows.append(rec(i + 1, '2026-11-%02dT09:00:00.000Z' % (10 + i), ['서운함'], ['이해'], s + '에서', s))
    load(ctx, rows)
    r = run(ctx)
    check('서로 다른 3개 상황에서 같은 감정→욕구 반복 감지', bool(r['cross']) and r['cross'][0]['distinctSituations'] >= 2,
          r['cross'])
    # 6b) 같은 상황만 반복되면 횡단 인사이트 아님
    load(ctx, [rec(1, '2026-11-10T09:00:00.000Z', ['서운함'], ['이해'], '', '일·업무'),
               rec(2, '2026-11-11T09:00:00.000Z', ['서운함'], ['이해'], '', '일·업무'),
               rec(3, '2026-11-12T09:00:00.000Z', ['서운함'], ['이해'], '', '일·업무')])
    r = run(ctx)
    check('상황이 하나면 횡단 인사이트는 생기지 않음', not r['cross'])

    # 7) 인사이트 2: 욕구 ↔ 반응 모순
    rows = [rec(i, '2026-11-%02dT09:00:00.000Z' % (10 + i), ['서운함'], ['이해'], '', '일·업무', ['괜찮은 척했어요']) for i in (1, 2, 3)]
    load(ctx, rows)
    r = run(ctx)
    check('억제 반응 + 연결 욕구 3일 → 모순 질문 생성', bool(r['mis']) and r['mis'][0]['count'] == 3, r['mis'])
    # 7b) 2일이면 아직
    load(ctx, rows[:2])
    r = run(ctx)
    check('2일뿐이면 모순 인사이트 없음', not r['mis'])
    # 7c) 억제 반응이 없으면 모순 아님
    load(ctx, [rec(i, '2026-11-%02dT09:00:00.000Z' % (10 + i), ['서운함'], ['이해'], '', '일·업무', ['누군가에게 털어놨다']) for i in (1, 2, 3)])
    r = run(ctx)
    check('억제 반응이 없으면 모순 인사이트 없음', not r['mis'])

    # 8) 인사이트 3: 사각지대
    rows = [rec(i, '2026-11-%02dT09:00:00.000Z' % (10 + i), ['서운함'], ['이해']) for i in range(1, 8)]
    load(ctx, rows)
    r = run(ctx)
    check('7건·3일 이상이면 한 번도 안 고른 감정 1개 제안', len(r['blind']) == 1 and r['blind'][0]['kind'] == 'emotion', r['blind'])
    load(ctx, rows[:5])
    r = run(ctx)
    check('6건이면 사각지대 제안 없음', not r['blind'])

    # 9) 거부(rejected) 패턴 제외
    load(ctx, [rec(1, '2026-11-10T09:00:00.000Z', ['서운함']), rec(2, '2026-11-11T09:00:00.000Z', ['서운함']),
               rec(3, '2026-11-12T09:00:00.000Z', ['서운함'])])
    ctx.eval("localStorage.setItem('maeum-pattern-state', JSON.stringify({'emotion|서운함':{status:'rejected',snapshot:{count:3,distinctDays:3}}}));")
    r = run(ctx)
    check('거부한 패턴은 다시 노출되지 않음', all(p['key'] != '서운함' for p in r['active']))
    # 9b) 기록이 실질적으로 늘면 재제안
    load(ctx, [rec(i, '2026-11-%02dT09:00:00.000Z' % (10 + i), ['서운함']) for i in (1, 2, 3, 4, 5)])
    r = run(ctx)
    check('새 기록이 쌓여 내용이 달라지면 거부 패턴도 재제안', any(p['key'] == '서운함' for p in r['active']))

    # 10) 최근 7일 / 전체 분리
    ctx.eval("localStorage.removeItem('maeum-pattern-state');")
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    def iso(days_ago, h=3):
        return (now - timedelta(days=days_ago)).replace(hour=h, minute=0, second=0, microsecond=0).isoformat().replace('+00:00', 'Z')
    rows = [rec(1, iso(1), ['서운함']), rec(2, iso(2), ['서운함']), rec(3, iso(3), ['서운함']),
            rec(4, iso(20), ['화남']), rec(5, iso(21), ['화남']), rec(6, iso(22), ['화남'])]
    load(ctx, rows)
    allr = run(ctx, 'all'); week = run(ctx, '7')
    check('전체 분석은 6건', allr['n'] == 6, allr['n'])
    check('최근 7일 분석은 3건', week['n'] == 3, week['n'])
    print('   week active:', [(p['type'], p['key'], p['count'], p['distinctDays']) for p in week['active']])
    check('최근 7일에는 화남이 없고 서운함만', all(p['key'] != '화남' for p in week['active']) and any(p['key'] == '서운함' for p in week['active']))

    # 11) 기록 거부(analysis.userFeedback=rejected)는 분석에서 제외
    rows = [rec(1, '2026-11-10T09:00:00.000Z', ['서운함']), rec(2, '2026-11-11T09:00:00.000Z', ['서운함']),
            rec(3, '2026-11-12T09:00:00.000Z', ['서운함'])]
    rows[2]['analysis'] = {'confirmed': False, 'userFeedback': 'rejected'}
    load(ctx, rows)
    r = run(ctx)
    check('내 마음과 달라요 표시한 기록은 패턴에서 제외', r['n'] == 2 and all(p['level'] != 'clue' for p in r['active']), r['n'])

    # 12) 한 기록에 같은 감정 중복 → 1회만
    load(ctx, [rec(1, '2026-11-10T09:00:00.000Z', ['서운함', '서운함', '화남'])])
    r = run(ctx)
    e = [p for p in r['patterns'] if p['type'] == 'emotion']
    seo = [p for p in e if p['key'] == '서운함']
    check('한 기록의 중복 감정은 1회만 집계', seo and seo[0]['count'] == 1, seo)

    # 13) 기록 1건 → 반복 단정 없음
    load(ctx, [rec(1, '2026-11-10T09:00:00.000Z', ['서운함'], ['이해'])])
    r = run(ctx)
    check('기록 1건에서는 반복 패턴이 생기지 않음', not r['active'] and len(r['obs']) >= 1)


    # ===== v8 · 기간 비교 =====
    from datetime import datetime as _dt, timedelta as _td, timezone as _tz
    now2 = _dt.now(_tz.utc)
    def iso2(days_ago, h=3):
        return (now2 - _td(days=days_ago)).replace(hour=h, minute=0, second=0, microsecond=0).isoformat().replace('+00:00', 'Z')

    rows = [rec(1, iso2(40), ['화남']), rec(2, iso2(50), ['화남']), rec(3, iso2(55), ['화남']),
            rec(4, iso2(2), ['서운함']), rec(5, iso2(3), ['서운함']), rec(6, iso2(4), ['서운함'])]
    load(ctx, rows)
    cmp = json.loads(ctx.eval('JSON.stringify(periodComparison())'))
    check('v8 기간 비교 · 최근 30일 vs 그 이전 30일', cmp['mode'] == 'm30' and cmp['now']['n'] == 3 and cmp['before']['n'] == 3,
          (cmp['mode'], cmp['now']['n'], cmp['before']['n']))
    moved = [x for x in cmp['topDiffs'] if x['key'] == '서운함'][0]
    check('v8 기간 비교 · 감정 이동(서운함 0%→100%)', moved['ap'] == 0 and moved['bp'] == 100 and moved['dp'] == 100, moved)
    check('v8 기간 비교 · ④ 문장에 두 기간 건수', '기록은 3건' in ctx.eval('periodFactSentence(periodComparison())'),
          ctx.eval('periodFactSentence(periodComparison())'))

    # 30일 창을 채우지 못하면 절반끼리 + 정직한 안내
    load(ctx, [rec(i, iso2(i), ['서운함']) for i in (1, 2, 3, 4)])
    cmp2 = json.loads(ctx.eval('JSON.stringify(periodComparison())'))
    check('v8 기간 비교 · 기록 부족 시 절반 비교', cmp2['mode'] == 'half' and cmp2['now']['n'] == 2 and cmp2['before']['n'] == 2,
          (cmp2['mode'], cmp2['now']['n'], cmp2['before']['n']))
    check('v8 기간 비교 · 절반 비교임을 밝힘', '절반' in cmp2['note'], cmp2['note'])

    # 1건이면 비교하지 않고 안내
    load(ctx, [rec(1, iso2(1), ['서운함'])])
    cmp3 = json.loads(ctx.eval('JSON.stringify(periodComparison())'))
    check('v8 기간 비교 · 1건이면 비교하지 않음', cmp3['mode'] == 'none' and cmp3['ok'] is False, cmp3['mode'])

    # ===== v8 · 보관소 인사이트 =====
    rows = [rec(11, iso2(45), ['화남'], ['인정'], '회의에서 다퉜다', '일·업무', ['다른 일로 바빴다']),
            rec(12, iso2(46), ['화남'], ['인정'], '보고가 밀렸다', '일·업무', ['다른 일로 바빴다']),
            rec(13, iso2(47), ['지침'], [], '야근이 이어졌다', '일·업무'),
            rec(14, iso2(1), ['서운함'], ['이해'], '무시당함', '관계', ['괜찮은 척했어요']),
            rec(15, iso2(2), ['서운함'], ['이해'], '연락이 씹힘', '가족', ['말을 못 하고 삼켰다']),
            rec(16, iso2(3), ['답답함'], ['이해'], '맴돌았다', '공부·시험', ['괜찮은 척했어요'])]
    load(ctx, rows)
    sh = json.loads(ctx.eval('JSON.stringify(archiveShift(periodComparison()))'))
    olds = [x['key'] for x in sh['oldConcerns']]
    news = [x['key'] for x in sh['newSignals']]
    check('v8 보관소 · 과거 자주 나온 고민(화남)', '화남' in olds, sh['oldConcerns'])
    check('v8 보관소 · 최근 새로 나타난 항목', ('답답함' in news) or ('서운함' in news), sh['newSignals'])
    check('v8 보관소 · 한 번 나온 것은 변화로 부르지 않음', all(x['aCount'] == 0 and x['bCount'] >= 2 for x in sh['newSignals']), sh['newSignals'])

    # ===== v8 · 추론 근거 =====
    load(ctx, [rec(1, iso2(1), ['서운함'], ['이해']), rec(2, iso2(2), ['서운함'], ['이해']),
               rec(3, iso2(3), ['서운함'], ['인정'])])
    nb = json.loads(ctx.eval('JSON.stringify(needsBehindEmotion(records,"서운함"))'))
    check('v8 추론 근거 · 감정과 함께 적힌 욕구 집계', nb['total'] == 3 and nb['top']['key'] == '이해' and nb['top']['count'] == 2, nb)

    load(ctx, [rec(i, iso2(i), ['서운함'], ['이해'], '', '일·업무', ['괜찮은 척했어요']) for i in (1, 2, 3)])
    gs = json.loads(ctx.eval('JSON.stringify(gapStats(records))'))
    check('v8 욕구↔반응 통계 (3건·3일)', gs['count'] == 3 and gs['days'] == 3 and gs['needTop']['key'] == '이해', gs)

    # ===== v8 · 보관소 핀 저장/삭제 =====
    ctx.eval("localStorage.removeItem('maeum-archive-pins');")
    load(ctx, [rec(21, iso2(1), ['서운함'], ['이해'], '회의', '일·업무')])
    r1 = json.loads(ctx.eval("(function(){var r=records[0];var a=togglePinRecord(r);var on=isPinned('record',r.id);var n=pinList().length;var b=togglePinRecord(r);return JSON.stringify({a:a,on:on,n:n,b:b,after:pinList().length});})()"))
    check('v8 핀 · 기록(오늘의 발견) 저장·삭제', r1['a'] == 'added' and r1['on'] is True and r1['n'] == 1 and r1['b'] == 'removed' and r1['after'] == 0, r1)

    load(ctx, [rec(i, iso2(i), ['서운함'], ['이해']) for i in (1, 2, 3)])
    r2 = json.loads(ctx.eval("(function(){var a=analyzePatterns('all');var p=a.active[0];var x=togglePinPattern(p);var pin=pinList()[0];var y=togglePinPattern(p);return JSON.stringify({x:x,id:p.id,pid:pin.pid,hasSentence:!!pin.sentence,hasEvidence:!!pin.evidence,y:y,left:pinList().length});})()"))
    check('v8 핀 · 패턴 카드 저장(문장·근거 포함)·삭제', r2['x'] == 'added' and r2['pid'] == 'pattern::' + r2['id'] and r2['hasSentence'] and r2['hasEvidence'] and r2['y'] == 'removed' and r2['left'] == 0, r2)

    load(ctx, [rec(31, iso2(1), ['서운함'], ['이해'])])
    r3 = json.loads(ctx.eval("(function(){var r=records[0];togglePinRecord(r);var a=pinList().length;var data=JSON.parse(localStorage.getItem('maeum-archive-pins'));var b=data.length;var added=mergePins([{pid:'manual::x',kind:'manual',refId:'x',at:'2026-11-01T00:00:00Z',title:'t',sentence:'s'},{pid:'manual::x',kind:'manual',refId:'x',at:'2026-11-02T00:00:00Z',title:'t2',sentence:'s2'}]);var t=pinFind('manual::x');return JSON.stringify({a:a,b:b,added:added,title:t.title,total:pinList().length});})()"))
    check('v8 핀 · 기기 저장 + 가져오기 중복 병합', r3['a'] == 1 and r3['b'] == 1 and r3['added'] == 1 and r3['title'] == 't2' and r3['total'] == 2, r3)

    # ===== v8 · 섹션 확인 상태 =====
    r4 = json.loads(ctx.eval("(function(){setStateId('compare|m30','confirmed');var s=stateOfId('compare|m30');return JSON.stringify({st:s&&s.status,other:stateOfId('없는키')});})()"))
    check('v8 확인 상태 · 섹션 단위 저장', r4['st'] == 'confirmed' and r4['other'] is None, r4)

    # 영문 전환 시 문장
    ctx.eval("LANG='en';")
    en = ctx.eval('periodFactSentence(periodComparison())')
    ctx.eval("LANG='ko';")
    check('v8 영문 문장 생성', 'last 30 days' in en or 'half' in en or 'entry' in en, en)


    # ===== v8 마감 · EN 라벨 누수 0 =====
    ctx.eval("LANG='en';")
    r_tap = ctx.eval("reactionLabel('가슴이 답답해요')")
    r_tap2 = ctx.eval("reactionLabel('괜찮은 척했어요')")
    r_dict = ctx.eval("reactionLabel('몸이 굳었다')")
    check('EN 반응 라벨(3초 원탭 키) 영어 출력', r_tap == 'my chest feels tight' and r_tap2 == 'I pretended to be fine',
          (r_tap, r_tap2))
    check('EN 반응 라벨(사전 키) 영어 출력', r_dict == 'my body went stiff', r_dict)
    s_tap = ctx.eval("situationDisplay({situation:'사람과의 일'})")
    s_tap2 = ctx.eval("situationDisplay({situation:'직장·업무'})")
    s_free = ctx.eval("situationDisplay({situation:'회의에서 무시당함'})")
    check('EN 상황 라벨(원탭 키) 영어 출력', s_tap == 'a problem with someone' and s_tap2 == 'work', (s_tap, s_tap2))
    check('EN 사용자가 쓴 문장은 그대로', s_free == '회의에서 무시당함', s_free)
    ctx.eval("LANG='ko';")
    check('KO 반응·상황 라벨 그대로', ctx.eval("reactionLabel('가슴이 답답해요')") == '가슴이 답답해요'
          and ctx.eval("situationDisplay({situation:'사람과의 일'})") == '사람과의 일')

    # ===== v8 마감 · .ics 반복 리마인더 =====
    ics = ctx.eval("buildReminderICS({hour:21,now:'2026-11-18T12:00:00+09:00'})")
    check('ICS · VEVENT + RRULE:FREQ=DAILY', ('BEGIN:VEVENT' in ics) and ('RRULE:FREQ=DAILY' in ics) and ('END:VCALENDAR' in ics))
    check('ICS · 매일 21시 시작 + 서울 시간대', ('DTSTART;TZID=Asia/Seoul:20261118T210000' in ics), ics.split('\r\n')[10:13])
    check('ICS · CRLF 줄바꿈', ics.count('\r\n') >= 15 and ics.endswith('\r\n'))
    check('ICS · 알람 포함', 'BEGIN:VALARM' in ics and 'TRIGGER:PT0M' in ics)
    ctx.eval("LANG='en';")
    ics_en = ctx.eval("buildReminderICS({hour:21,now:'2026-11-18T12:00:00+09:00'})")
    ctx.eval("LANG='ko';")
    check('ICS · EN 요약문', 'SUMMARY:Mind' in ics_en, ics_en.split('\r\n')[12:14])
    check('ICS · 쉼표 이스케이프', ctx.eval("icsEsc('a,b;c')") == 'a\\,b\\;c')

    bad = [n for n, ok, _ in RESULTS if not ok]
    print('\n%d checks · %d failed' % (len(RESULTS), len(bad)))
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main())
