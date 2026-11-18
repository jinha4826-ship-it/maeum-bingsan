# 마음의 빙산 · Cloudflare Worker AI 프록시 (v6 · 2026-11-18 재배포)

## 라이브 정보
- **Worker URL**: `https://maeum-bingsan-ai.cba4826.workers.dev`
- Worker 이름: `maeum-bingsan-ai`
- Cloudflare 계정: `cba4826@naver.com` (account id `ba7058733db910fa60a3c1630ce8831e`), workers.dev 서브도메인 `cba4826`
- 요금제: Workers Free (요청 100,000/일)
- Secret: `GEMINI_API_KEY` (재배포 시 `keep_bindings`로 유지, 값은 노출하지 않음)
- 모델: `gemini-flash-lite-latest` (v1beta generateContent, `responseMimeType: application/json`)
- 소스: `work/maeum-bingsan-worker/worker.js`
- v6 최신 배포: 2026-11-18T06:00:48Z (커밋 `8949e4d`·`5c763bd` 앱과 함께)

## API 계약 (v6)
- `GET /` → `{"ok":true,"service":"maeum-bingsan-ai","model":"...","langs":["ko","en"],"history":7,"version":6}`
- `OPTIONS /` → 204 + CORS (`Access-Control-Allow-Origin: *`, `POST, OPTIONS`, `Content-Type`)
- `POST /` body: `{ situation, feelings, needs, perspective, action, lang, history? }`
  - `lang`: `"ko"`(기본) | `"en"`
  - `history`: 선택. 최근 기록 배열(오래된 것 → 최근 것), 최대 7건
    `[{"date":"2026-11-16","feelings":"서운함","needs":"이해","defence":"인정갈구·맞춰주기","situation":"회의에서 의견이 묻혔다"}]`
  - 응답(history 없음 · **기존과 동일**): `{"comment","question","lang"}`
  - 응답(history 있음): `{"comment","question","connection","lang"}` — `connection`은 과거 기록과의 연결·변화 1~2문장.
    모델이 connection을 비우면 서버가 기록만으로 결정론적 문장을 채운다. 비교할 기록이 없으면 `""`.
  - `situation`/`feelings`가 모두 비면 400 `{"error":"empty_input"}`, JSON 오류 400 `invalid_json`
- Gemini 실패(타임아웃 10초·비200·JSON 파싱 실패·키 없음) 시 **결정론적 폴백** `{comment, question, fallback:true, connection?}`로 200
- 폴백 문장은 현재 언어와 다른 문자권의 라벨을 쓰지 않는다(한/영 섞임 방지).

## 2026-11-18 실호출 검증 (curl, 라이브)
| 테스트 | 결과 |
|---|---|
| `GET /` | 200, `version:6`, `history:7` |
| `POST /` ko + history(2건) | 200, **5.5초**, 실제 Gemini. `connection`: "2026-11-16 회의에서 의견이 묻혔을 때 느꼈던 서운함과 비슷하게, 오늘도 … 반복되고 있네요." |
| `POST /` en + history(2건) | 200, **6.4초**, 영어 connection: "On 2026-11-16 your opinion was buried … in both moments, hurt … keep returning" |
| `POST /` ko history 없음(구버전 앱) | 200, **7.0초**, `comment`·`question`만 — 하위 호환 확인 |
| `POST {}` / `not-json` | 400 `empty_input` / 400 `invalid_json` |
| `OPTIONS /` | 204 + `access-control-allow-origin: *`, `allow-methods: POST, OPTIONS` |

로컬 검증(브라우저 하네스에 worker.js 로드, Gemini 모킹) 31개 체크: 프롬프트 불변(history 없음)·history 7건 상한·필드 trim·connection 보충·폴백·언어 혼용 방지.

## 재배포 방법 (v6에서 실제 사용한 순서)
1. `https://dash.cloudflare.com` 로그인(새 브라우저면 `cba4826@naver.com`으로 7자리 메일 코드 → `naver-mail`에서 확인).
2. `https://dash.cloudflare.com/profile/api-tokens` → Create Token → 이름 입력 → **Start from scratch → Start with an Account policy** → 권한 검색 `Workers Scripts` → **Edit** 체크 → 만료 **7 days** → Continue → Create Token.
3. 토큰 값은 그 화면의 Example Usage에만 표시된다. 파일로 저장해 쓰고 **배포 직후 대시보드에서 토큰 삭제**.
4. 업로드:
   ```
   PUT /accounts/{account_id}/workers/scripts/maeum-bingsan-ai
   multipart: metadata={"main_module":"worker.js","keep_bindings":["secret_text","plain_text"],"compatibility_date":"2025-01-01"}
              worker.js=@work/maeum-bingsan-worker/worker.js (application/javascript+module)
   ```
5. `GET /` 로 `version:6` 확인 → `POST` ko/en + history 로 실제 Gemini 응답 확인 → 토큰 삭제.

## 앱 쪽 연결
- `docs/index.html`의 `AI_WORKER` 상수 = 위 URL. `aiPayloadOf()`가 `history: aiHistoryOf(r)`(최근 7건, 오래된 순)를 함께 보낸다.
- 응답의 `connection`은 심층 리포트 AI 영역의 "🕮 어제의 나와 이어보기" 블록으로 표시되고 `r.ai.connection`에 저장된다.
- 서버 실패 시 `localSolution()` + `localConnection()`이 같은 블록을 기기 기록만으로 채운다.

## v7 배포 기록 (2026-11-18)
- 프롬프트를 '자기 탐구 안내자'로 교체: 진단·성격/무의식/방어기제 단정·근거 없는 인과·행동 강요 금지,
  사용자가 쓴 사실과 '가능한 해석'을 구분.
- `mode:"sentence"` 추가 → `{sentence, lang}` (앱의 '한 문장 AI 다듬기').
- payload 에 `reactions` 추가(없어도 동작). 응답 계약(comment/question/connection)은 v6와 동일해 구버전 앱도 그대로 동작.
- 배포: 임시 API 토큰(Workers Scripts:Edit, 7일) 발급 → `PUT /accounts/{id}/workers/scripts/maeum-bingsan-ai`
  (multipart, `keep_bindings:["secret_text","plain_text"]` 로 `GEMINI_API_KEY` 유지) → `GET /` version:7 확인
  → ko/en/문장모드/구버전(history 없음)/400 응답 확인 → 대시보드에서 토큰 삭제.
- 확인: `GET /` → `{"ok":true,...,"history":7,"mode":["sentence"],"version":7}`
