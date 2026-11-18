# v8 · 마음의 빙산 2.0 조립 소스

`docs/index.html`은 이 폴더의 조각을 이어 붙여 만듭니다(기존 v6 앱의 CSS·스크립트를 그대로
바탕으로 쓰고, 새 화면·엔진을 뒤에 덧붙여 덮어쓰는 비파괴 방식).

- `body.html` — 새 마크업(홈 · 6단계 기록 · 오늘의 발견 · 지도 · 층 · 리포트 · 설정)
- `extra.css` — v7에서 추가된 스타일
- `base.css` — v6 CSS 사본(참고용)
- `js1_core.js` — 감정/욕구/상황/반응 사전, 비파괴 정규화(기존 기록 호환), 화면 전환
- `js2_flow.js` — 6단계 기록 · 30초 퀵 · 3초 원탭 · 오늘의 마음 발견
- `js3_pattern.js` — 규칙 기반 패턴 엔진(analyzePatterns · distinctDays · 상태 관리 · 3가지 인사이트)
- `js4_views.js` — 홈 · 빙하 지도 · 층/근거 기록 · 월간 리포트 · 기록 상세 · AI 카드 상단
- `js5_ai.js` — AI Worker 호출(2.0 프롬프트) · 초기화
- `js6_archive.js` — 변화 기록 보관소 화면 · 상담·보관용 PDF(인쇄) · 캘린더(.ics) 리마인더 · 백업(핀 포함)
- `build.py` — 조립 스크립트

## 다시 빌드하기
```bash
cd work/maeum-bingsan
git show <v6 커밋>:docs/index.html > v7/index_v6.html   # v6 원본(바탕) 필요
python3 v7/build.py
python3 tests/unit_patterns.py                          # 패턴 엔진 22개 체크
```

## 테스트
- `tests/unit_patterns.py` — quickjs로 DOM 없이 analyzePatterns 검증(22 checks)
- `tests/qa_live.py` — Playwright 회귀 테스트(브라우저 의존 라이브러리가 있는 환경에서 실행)

## v8에서 더한 것 (2026-11-18)
1. **월간 마음 패턴 리포트 4섹션** — 01 반복되는 감정(분모·복수 선택 100% 초과 안내) · 02 서로 다른 상황의 연결(crossSituationPatterns) · 03 욕구와 반응의 차이(mismatchInsights) · 04 지난달과 달라진 점(최근 30일 vs 이전 30일, 부족 시 절반 비교·1건이면 안내). 각 결과는 ① 관찰된 사실 ② 반복 패턴 ③ 추론 가능성 ④ 확인 필요(맞아요/수정/제외) 4단으로 표시.
2. **상담·보관용 PDF** — `📄 상담·보관용 리포트 PDF 저장/인쇄`(`window.print()`) + `@media print`/`@page A4`. 화면·탭바·장식을 숨기고 `#printReport`만 A4 1~2장으로 출력.
3. **나의 변화 기록 보관소** — 30일 전 vs 지금 비교, 과거의 고민 vs 최근 새 반응, `📌 변화 보관소에 저장` 핀(기기 저장 + 백업/가져오기 호환).
4. **마감 수정** — 모바일 안내 문구 1줄화, 1.0 방어기제·해결 방안은 심층 리포트·리포트의 접힌 `이전 참고 보기`로 이동(데이터·함수는 유지), EN 라벨 누수 0(3초 원탭 저장 키 매핑), 설정에 `📅 매일 밤 9시 캘린더 알림 추가(.ics)`(RRULE:FREQ=DAILY).

## 배포·검증 상태 (2026-11-18)
- 라이브: `https://jinha4826-ship-it.github.io/maeum-bingsan/?v=8` (GitHub Pages, main /docs)
- Worker: `https://maeum-bingsan-ai.cba4826.workers.dev` → `GET /` 가 `version:7`, `mode:["sentence"]` 반환
- 서비스 워커 캐시: `docs/sw.js` `SW_VERSION = '2026-11-18-v8'`
- 패턴 엔진 단위 테스트: `python3 tests/unit_patterns.py` → 22 → 49 checks
- Playwright 회귀 테스트: `tests/qa_live.py` (v7 16시나리오 + v8 11시나리오). 이 작업 환경에는 Chromium 시스템 라이브러리(libatk 등)가 없어 실행하지 못했고, 라이브 확인은 브라우저 도구로 진행했다.
