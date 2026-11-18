# v7 · 마음의 빙산 2.0 Phase 1 조립 소스

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

## 배포·검증 상태 (2026-11-18)
- 라이브: `https://jinha4826-ship-it.github.io/maeum-bingsan/?v=7` (GitHub Pages, main /docs)
- Worker: `https://maeum-bingsan-ai.cba4826.workers.dev` → `GET /` 가 `version:7`, `mode:["sentence"]` 반환
- 서비스 워커 캐시: `docs/sw.js` `SW_VERSION = '2026-11-18-v7'`
- 패턴 엔진 단위 테스트: `python3 tests/unit_patterns.py` → 22 checks
- Playwright 회귀 테스트: `tests/qa_live.py` (16 시나리오 · 21 체크)
