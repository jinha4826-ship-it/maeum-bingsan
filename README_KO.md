# 마음의 빙산 — Expo iOS 프로젝트

## 프로젝트 내용
- React Native + Expo 기반 앱
- 크림/라벤더 디자인
- 홈, 5단계 마음 기록, 기록 목록/상세, 감정 리포트
- 기록 생성·수정·삭제 및 기기 내 저장(AsyncStorage)
- AI 연동 없음(규칙 기반 성찰 문구만 제공)

## 빌드 준비
1. GitHub 저장소 루트에 이 폴더 안의 모든 파일과 `assets` 폴더를 업로드합니다.
2. Expo 대시보드에서 해당 GitHub 저장소를 연결합니다.
3. EAS Build를 실행합니다. `eas.json`에 development / preview / production 프로필이 준비되어 있습니다.

## 주의
이 프로젝트는 소스 코드이며 설치 가능한 IPA가 아닙니다. iOS 기기 설치/배포에는 EAS 빌드와 Apple Developer 계정 및 적절한 서명 설정이 필요합니다. 이 앱은 현재 실제 생성형 AI를 호출하지 않습니다. 기록은 AsyncStorage를 이용해 해당 기기에 저장됩니다.
