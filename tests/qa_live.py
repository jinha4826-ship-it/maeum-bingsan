#!/usr/bin/env python3
"""마음의 빙산 2.0 (v8) · Playwright 회귀 테스트

실행:
    pip install playwright && python3 -m playwright install chromium
    BASE_URL=https://jinha4826-ship-it.github.io/maeum-bingsan/ python3 tests/qa_live.py

기본값은 라이브 GitHub Pages 주소입니다. 로컬로 돌리려면
    python3 -m http.server 8901 -d docs
    BASE_URL=http://127.0.0.1:8901/ python3 tests/qa_live.py

이 파일은 v7 회귀 16시나리오 + v8 신규 11시나리오를 실행하고 PASS/FAIL 을 출력합니다.
"""
import json, os, sys, time
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE_URL', 'https://jinha4826-ship-it.github.io/maeum-bingsan/')
URL = BASE.rstrip('/') + '/?v=8&qa=playwright&t=' + str(int(time.time()))

# 서울 기준 날짜(days_ago) 헬퍼 — distinctDays 검증용
def iso(days_ago, hour=12):
    from datetime import datetime, timedelta, timezone
    kst = timezone(timedelta(hours=9))
    d = (datetime.now(kst) - timedelta(days=days_ago)).replace(hour=hour, minute=0, second=0, microsecond=0)
    return d.isoformat()

def rec(id_, date, emotions=None, needs=None, situation='', category='', reactions=None, thoughts='', source='seed'):
    emo = emotions or []
    ns = needs or []
    return {
        'id': id_, 'date': date,
        'situation': situation, 'situationCategory': category,
        'emotions': emo, 'feeling': emo,
        'reactions': reactions or [],
        'thoughts': thoughts, 'other': '',
        'needs': ns, 'need': ns,
        'selfExpression': '', 'action': '',
        'analysis': {'confirmed': None, 'userFeedback': '', 'at': ''},
        'source': source, 'schema': 3,
    }

def v1(id_, date, feeling, need, situation):
    """예전(v6) 스키마 기록"""
    return {'id': id_, 'date': date, 'situation': situation, 'feeling': feeling,
            'need': need, 'other': '', 'action': ''}

SEED_LEGACY = [
    v1(1, iso(6), ['서운함'], ['이해받고 싶었어요'], '회의에서 내 의견이 묻혔다'),
    v1(2, iso(5), ['불안함'], [], '예약이 계속 실패했다'),
    v1(3, iso(4), ['지침', '답답함'], ['도움이 필요했어요'], '해야 할 일이 계속 맴돌았다'),
]

SEED_3DAYS = [
    rec(11, iso(1), ['서운함'], ['이해'], '회의에서 무시당함', '일·업무'),
    rec(12, iso(2), ['서운함'], ['이해'], '친구가 연락을 씹음', '관계'),
    rec(13, iso(3), ['서운함'], ['이해'], '엄마가 내 얘기를 안 들음', '가족'),
]

SEED_SAME_DAY = [
    rec(21, iso(0, 9), ['서운함'], [], '아침 회의', '일·업무'),
    rec(22, iso(0, 13), ['서운함'], [], '점심 대화', '관계'),
    rec(23, iso(0, 20), ['서운함'], [], '저녁 전화', '가족'),
]

SEED_V8 = [
    rec(101, iso(45), ['화남'], ['인정'], '회의에서 다퉜다', '일·업무', ['다른 일로 바빴다']),
    rec(102, iso(46), ['화남'], ['인정'], '보고가 밀렸다', '일·업무', ['다른 일로 바빴다']),
    rec(103, iso(47), ['지침'], [], '야근이 이어졌다', '일·업무'),
    rec(111, iso(1), ['서운함'], ['이해'], '회의에서 무시당함', '일·업무', ['괜찮은 척했어요']),
    rec(112, iso(2), ['서운함'], ['이해'], '친구가 연락을 씹음', '관계', ['말을 못 하고 삼켰다']),
    rec(113, iso(3), ['서운함'], ['이해'], '엄마가 내 얘기를 안 들음', '가족', ['괜찮은 척했어요']),
    rec(114, iso(4), ['답답함'], ['이해'], '할 일이 맴돌았다', '공부·시험', ['괜찮은 척했어요']),
]

RESULTS = []
def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS  ' if ok else 'FAIL  ') + name + (('  — ' + str(detail)) if (detail and not ok) else ''))

def seed(page, rows, extra=None):
    page.add_init_script("localStorage.setItem('maeum-records', %s);" % json.dumps(json.dumps(rows, ensure_ascii=False)))
    if extra:
        page.add_init_script(extra)

def patterns(page, scope='all'):
    return page.evaluate("(function(){var a=analyzePatterns('%s');return {n:a.n,active:a.active,cross:a.crosses,mis:a.mismatches,blind:a.blindSpots};})()" % scope)

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        errors = []

        def new_page(rows, extra=None):
            ctx = browser.new_context(viewport={'width': 420, 'height': 900})
            page = ctx.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            seed(page, rows, extra)
            page.goto(URL, wait_until='networkidle')
            page.wait_for_timeout(400)
            return ctx, page

        # 1) 기존 기록 정상 로드
        ctx, page = new_page(SEED_LEGACY)
        n = page.evaluate('records.length')
        check('1. 기존(v6) 기록 정상 로드', n == 3, n)
        check('1b. 로드 후 JS 오류 없음', len(page.evaluate('window.__maeumErrors||[]')) == 0, page.evaluate('window.__maeumErrors||[]'))
        page.click(".navbtn[data-view='map']"); page.wait_for_timeout(300)
        check('1c. 욕구 없는 기록이 있어도 지도가 그려짐', '반복되는 욕구' in page.inner_text('#mapContent'))
        ctx.close()

        # 2) 욕구 없는 기존 기록 — 리포트 오류 없음
        ctx, page = new_page([v1(1, iso(1), ['서운함'], [], '그냥 하루'), v1(2, iso(2), ['화남'], [], '또 실수')])
        page.click(".navbtn[data-view='report']"); page.wait_for_timeout(300)
        txt = page.inner_text('#reportContent')
        check('2. 욕구 없는 기록 리포트 오류 없음', ('반복되는 감정' in txt and '지난달과 달라진 점' in txt) and len(page.evaluate('window.__maeumErrors||[]')) == 0)
        ctx.close()

        # 3) 서로 다른 3일 같은 감정 → 반복 단서
        ctx, page = new_page(SEED_3DAYS)
        a = patterns(page)
        clue = [x for x in a['active'] if x['type'] == 'emotion' and x['key'] == '서운함']
        check('3. 서로 다른 3일 → 반복 단서', clue and clue[0]['level'] == 'clue' and clue[0]['distinctDays'] == 3, clue)
        check('3b. 단서 문장에 근거 기록 수·날짜 수 표시', clue and '근거 기록 3건' in page.inner_text('.clue') if page.locator('.clue').count() else False)
        ctx.close()

        # 4) 하루에 3건 → 3일 반복으로 오인하지 않음
        ctx, page = new_page(SEED_SAME_DAY)
        a = patterns(page)
        same = [x for x in a['patterns'] if x['type'] == 'emotion' and x['key'] == '서운함']
        check('4. 같은 날 3건은 반복 단서가 아님', same and same[0]['distinctDays'] == 1 and same[0]['level'] == 'record',
              same[0] if same else None)
        check('4b. 홈에서도 반복 단정 없음', '반복' not in page.inner_text('#foundHome'))
        ctx.close()

        # 5) 연결 패턴은 같은 기록의 세 요소만
        rows = SEED_3DAYS + [rec(14, iso(4), ['서운함'], [], '회의', '일·업무')]
        ctx, page = new_page(rows)
        a = patterns(page)
        con = [x for x in a['active'] if x['type'] == 'connection']
        check('5. 연결 패턴 근거가 같은 기록에 존재(verified)', bool(con) and con[0]['verified'] and con[0]['count'] == 3, con[:1])
        ctx.close()

        # 6) 패턴 클릭 → 근거 기록 확인
        ctx, page = new_page(SEED_3DAYS)
        page.click(".navbtn[data-view='map']"); page.wait_for_timeout(300)
        page.click(".layer-band.surface"); page.wait_for_timeout(300)
        page.click("text=근거 기록 보기"); page.wait_for_timeout(400)
        check('6. 근거 기록 화면에 실제 기록 표시', '이 단서가 나온 기록' in page.inner_text('#layerContent')
              and page.locator('#layerContent .entry').count() >= 3)
        ctx.close()

        # 7) 패턴 거부 → 노출 제외
        ctx, page = new_page(SEED_3DAYS)
        page.click(".navbtn[data-view='map']"); page.wait_for_timeout(300)
        page.click("text=내 마음과 달라요"); page.wait_for_timeout(400)
        a = patterns(page)
        check('7. 거부한 패턴은 active 에서 제외', all(x['key'] != '서운함' for x in a['active']), [x['key'] for x in a['active']])
        ctx.close()

        # 8) 기록 삭제 시 분석 갱신
        ctx, page = new_page(SEED_3DAYS)
        before = patterns(page)['n']
        page.evaluate("show('records')"); page.wait_for_timeout(300)
        page.locator('#allRecords .entry').first.click(); page.wait_for_timeout(300)
        page.on('dialog', lambda d: d.accept())
        page.click("text=삭제"); page.wait_for_timeout(500)
        after = patterns(page)['n']
        check('8. 기록 삭제 후 분석 즉시 갱신', after == before - 1, (before, after))
        ctx.close()

        # 9) 최근 7일 / 전체 분리
        rows = SEED_3DAYS + [rec(31, iso(30), ['화남'], [], '먼 날'), rec(32, iso(31), ['화남'], [], '먼 날2'), rec(33, iso(32), ['화남'], [], '먼 날3')]
        ctx, page = new_page(rows)
        allr = patterns(page, 'all'); week = patterns(page, '7')
        check('9. 최근 7일과 전체 분석 분리', allr['n'] == 6 and week['n'] == 3, (allr['n'], week['n']))
        page.click(".navbtn[data-view='report']"); page.wait_for_timeout(300)
        page.click("text=최근 7일"); page.wait_for_timeout(300)
        check('9b. 토글 시 분모·수치 갱신', '3건을 분모로' in page.inner_text('#reportContent'))
        ctx.close()

        # 10) AI 실패해도 저장·조회 정상
        ctx, page = new_page(SEED_LEGACY, extra="window.AI_WORKER_OVERRIDE='https://127.0.0.1:9/ai';")
        page.evaluate("AI_WORKER='https://127.0.0.1:9/ai'")
        page.evaluate("show('records')"); page.wait_for_timeout(300)
        page.locator('#allRecords .entry').first.click(); page.wait_for_timeout(300)
        page.click("text=심층 리포트"); page.wait_for_timeout(400)
        page.click("text=AI 심리 솔루션 받기"); page.wait_for_timeout(2500)
        txt = page.inner_text('#deepContent')
        check('10. AI 실패 시 기기 안 해석으로 대체', ('기기 안' in txt) or ('다시 시도' in txt), txt[:120])
        page.click(".navbtn[data-view='home']"); page.wait_for_timeout(300)
        check('10b. AI 실패 후에도 기록 조회 정상', page.evaluate('records.length') == 3)
        ctx.close()

        # 11) 인사이트 1 — 서로 다른 상황 횡단
        ctx, page = new_page(SEED_3DAYS)
        a = patterns(page)
        check('11. 서로 다른 상황 횡단 인사이트', bool(a['cross']) and a['cross'][0]['distinctSituations'] >= 2, a['cross'][:1])
        ctx.close()

        # 12) 인사이트 2 — 욕구↔반응 모순
        rows = [rec(41 + i, iso(i + 1), ['서운함'], ['이해'], '회의', '일·업무', ['괜찮은 척했어요']) for i in range(3)]
        ctx, page = new_page(rows)
        a = patterns(page)
        check('12. 욕구와 반응의 모순을 질문으로 제시', bool(a['mis']), a['mis'])
        ctx.close()

        # 13) 인사이트 3 — 사각지대
        rows = [rec(51 + i, iso(i + 1), ['서운함'], ['이해'], '회의', '일·업무') for i in range(7)]
        ctx, page = new_page(rows)
        a = patterns(page)
        check('13. 기록 7건 이상에서 사각지대 1개 제안', len(a['blind']) == 1, a['blind'])
        ctx.close()

        # 14) 기록 1건에서는 반복 단정 없음
        ctx, page = new_page([rec(61, iso(1), ['서운함'], ['이해'], '회의', '일·업무')])
        a = patterns(page)
        check('14. 기록 1건에서는 반복 패턴 없음', not a['active'])
        ctx.close()

        # 15) JSON 백업/복원 후 기록 유지
        ctx, page = new_page(SEED_3DAYS)
        with page.expect_download() as dl:
            page.click(".navbtn[data-view='report']"); page.wait_for_timeout(300)
            page.click("text=내보내기")
        path = dl.value.path()
        n_before = page.evaluate('records.length')
        page.set_input_files('#importFile', path)
        page.wait_for_timeout(500)
        page.click("text=기존 기록에 합치기"); page.wait_for_timeout(500)
        check('15. 백업 → 가져오기 후 기록 수 유지', page.evaluate('records.length') == n_before)
        ctx.close()

        # 16) KO/EN 전환 + 전체 오류 0
        ctx, page = new_page(SEED_3DAYS)
        page.click('#langEn'); page.wait_for_timeout(400)
        en_ok = 'Recently found' in page.inner_text('#foundHome') or 'My glacier map' in page.inner_text('body')
        page.click('#langKo'); page.wait_for_timeout(400)
        ko_ok = '최근 발견한 마음' in page.inner_text('#foundHome')
        errs = page.evaluate('window.__maeumErrors||[]')
        check('16. KO/EN 전환 정상', en_ok and ko_ok, (en_ok, ko_ok))
        check('16b. 전 과정 JS 오류 0', len(errs) == 0, errs[:3])
        ctx.close()


        # ================= v8 =================
        # 17) 월간 리포트 4개 핵심 섹션 + 4단 구분
        ctx, page = new_page(SEED_V8)
        page.click(".navbtn[data-view='report']"); page.wait_for_timeout(500)
        txt = page.inner_text('#reportContent')
        check('17. 리포트 01~04 네 섹션', all(k in txt for k in ['01', '02', '03', '04']) and
              all(k in txt for k in ['반복되는 감정', '서로 다른 상황의 연결', '욕구와 반응의 차이', '지난달과 달라진 점']),
              [k for k in ['01','02','03','04','반복되는 감정','서로 다른 상황의 연결','욕구와 반응의 차이','지난달과 달라진 점'] if k not in txt])
        check('17b. 각 섹션 4단 구분(사실·패턴·추론·확인)', all(k in txt for k in ['관찰된 사실','반복 패턴','추론 가능성','확인이 필요해요'])
              and page.locator('#reportContent .tiers').count() >= 4
              and page.locator('#reportContent .tier').count() == page.locator('#reportContent .tiers').count() * 4,
              (page.locator('#reportContent .tiers').count(), page.locator('#reportContent .tier').count()))

        # 18) 01 · 분모와 복수 선택 100% 초과 안내
        check('18. 01 감정 분모·100% 초과 안내', '100%를 넘을 수 있어요' in txt and '분모로 계산' in txt)

        # 19) 02 · crossSituationPatterns 연동
        check('19. 02 서로 다른 상황 연결 표시', '서로 달랐던' in txt and '일·업무' in txt and '가족' in txt, txt[txt.find('02'):txt.find('02')+120])

        # 20) 03 · mismatchInsights 연동
        sec3 = page.locator('#reportContent .rep-sec').nth(2).inner_text()
        check('20. 03 욕구와 반응의 차이 표시', ('억제하는 반응' in sec3) and ('괜찮은 척했어요' in sec3 or '말을 못 하고 삼켰다' in sec3), sec3[:160])

        # 21) 04 · 지난달과 달라진 점 (30일 비교)
        sec4 = page.locator('#reportContent .rep-sec').nth(3).inner_text()
        check('21. 04 지난달 대비 변화(30일 창)', ('30일' in sec4) and page.locator('#reportContent .rep-sec').nth(3).locator('.delta-row').count() >= 1, sec4[:160])

        # 22) ④ 확인(맞아요) 저장 + PDF 반영
        page.locator('#reportContent .tier.cf .tier-fb button').first.click(); page.wait_for_timeout(400)
        n_state = page.evaluate("Object.keys(JSON.parse(localStorage.getItem('maeum-pattern-state')||'{}')).length")
        check('22. ④ 맞아요 저장', n_state >= 1, n_state)
        page.evaluate("buildPrintReport()")
        phtml = page.eval_on_selector('#printReport', 'el=>el.innerHTML')
        check('22b. 확인한 발견이 PDF에 포함', '사용자가 확인한 발견' in phtml and '맞아요' in phtml)

        # 23) 핀 저장 → 보관소 표시 → 빼기
        page.locator('#reportContent .rep-sec .pin-btn').first.click(); page.wait_for_timeout(400)
        n_pin = page.evaluate("JSON.parse(localStorage.getItem('maeum-archive-pins')||'[]').length")
        check('23. 📌 변화 보관소에 저장', n_pin == 1, n_pin)
        page.click("text=보관소 열기"); page.wait_for_timeout(500)
        check('23b. 보관소에 저장한 발견 표시', page.locator('#archiveContent .pin-item').count() == 1)
        page.locator('#archiveContent .pin-item button:has-text("빼기")').first.click(); page.wait_for_timeout(400)
        check('23c. 보관소에서 빼기', page.evaluate("JSON.parse(localStorage.getItem('maeum-archive-pins')||'[]').length") == 0)

        # 24) 보관소 — 30일 전의 나 vs 지금 · 과거 고민/새 반응
        atxt = page.inner_text('#archiveContent')
        check('24. 보관소 30일 비교 표', ('30일 전의 나와 지금의 나' in atxt) and page.locator('#archiveContent .cmp2-r').count() >= 1)
        check('24b. 과거 고민 · 최근 새 반응', ('과거에 자주 등장했던 고민' in atxt) and ('최근 새롭게 나타난 반응' in atxt))
        check('24c. 보관소 저장 항목 없음 안내', '아직 저장한 발견이 없어요' in atxt)

        # 25) 인쇄용 DOM + @media print + 버튼 동작
        page.click("text=← 월간 리포트"); page.wait_for_timeout(400)
        page.evaluate("window.print=function(){window.__printed=(window.__printed||0)+1;}")
        page.evaluate("buildPrintReport()")
        phtml = page.eval_on_selector('#printReport', 'el=>el.innerHTML')
        check('25. 인쇄용 리포트 4섹션·확인 발견·근거 요약',
              all(k in phtml for k in ['01', '02', '03', '04', '사용자가 확인한 발견', '근거 기록 요약']))
        css_txt = page.evaluate("Array.prototype.map.call(document.querySelectorAll('style'),function(s){return s.textContent}).join('\n')")
        check('25b. @media print / @page A4 스타일 존재', ('@media print' in css_txt) and ('size:A4' in css_txt))
        page.emulate_media(media='print')
        vis = page.is_visible('#printReport'); appvis = page.is_visible('.app')
        check('25c. 인쇄 모드: 앱 숨김 · 리포트만 표시', vis and not appvis, (vis, appvis))
        page.emulate_media(media='screen')
        page.click("text=상담·보관용 리포트 PDF 저장/인쇄"); page.wait_for_timeout(300)
        check('25d. 버튼이 window.print 호출', page.evaluate("(window.__printed||0)") >= 1)

        # 26) KO/EN — 4섹션 문구 전환
        page.click('#langEn'); page.wait_for_timeout(500)
        etxt = page.inner_text('#reportContent')
        check('26. EN 리포트 4섹션', all(k in etxt for k in ['Feelings that repeat', 'Links across different situations', 'The gap between wish and reaction', 'What changed from last month']))
        page.click("text=Change archive"); page.wait_for_timeout(500)
        check('26b. EN 보관소', 'Me 30 days ago and me now' in page.inner_text('#archiveContent'))
        page.click('#langKo'); page.wait_for_timeout(500)

        # 27) 전 과정 JS 오류 0
        errs = page.evaluate('window.__maeumErrors||[]')
        check('27. v8 전 과정 JS 오류 0', len(errs) == 0 and len(errors) == 0, (errs[:3], errors[:3]))
        ctx.close()

        browser.close()

    failed = [r for r in RESULTS if not r[1]]
    print('\n%d checks · %d failed' % (len(RESULTS), len(failed)))
    return 1 if failed else 0

if __name__ == '__main__':
    sys.exit(main())
