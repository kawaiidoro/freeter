# Freeter 동작 검증

공개 주소: https://kawaiidoro.github.io/freeter/

저장소 이름 변경에 맞춰 9개 HTML의 canonical·Open Graph·Twitter 주소, 사이트맵과 robots.txt를 갱신했습니다. 모든 화면의 기기 연결 버튼·코드 교환·WebRTC 실행 코드를 제거했습니다. 브라우저 저장 키 `dangi-alba:data`와 형식 버전 3은 유지합니다.

## 검사 명령과 범위

Node.js 24, 시스템 Chromium과 Playwright를 사용합니다. 사용자 계정이나 실제 개인 기록은 사용하지 않습니다. 이번 수정 후 핵심 35개와 브라우저 55개(공개 사이트 검사 50개·제한 미리보기 5개), 총 90개 검사가 통과했습니다.

```sh
node scripts/build-site.mjs --check
node --check site.js
node --test tests/core.test.mjs
CHROMIUM_PATH=/usr/bin/chromium node tests/browser.mjs
CHROMIUM_PATH=/usr/bin/chromium node tests/features.mjs
CHROMIUM_PATH=/usr/bin/chromium node tests/brand.mjs
CHROMIUM_PATH=/usr/bin/chromium node tests/editor.mjs
CHROMIUM_PATH=/usr/bin/chromium node tests/update-recovery.mjs
CHROMIUM_PATH=/usr/bin/chromium node tests/startup.mjs
```

- 핵심 로직 35개: 세금·예상 급여, 2인·3인 교대와 점심 배정, 지급 상태·분할 입금, 통계, JSON 검증·이전 버전 변환, CSV와 메모 서식.
- 기본 브라우저 18개: 하위 경로 진입, 근무표 생성·수정·PNG·CSV·복사, 계산·기록·통계, JSON 복원·취소, 저장 보존·삭제, 반응형 배치·오프라인.
- 추가 기능 11개: 기본 이름 안내, 교대 식사, 맞교대 PNG·CSV, 세금 선택, 작은 계산기, 지급 완료, 업무 메모, 백업·복원, 모바일과 이전 저장 데이터 보존.
- 브랜드·모바일 10개: 9개 페이지의 새 `/freeter/` canonical·공유 이미지 URL, Freeter 로고·썸네일, 320~768px 근무표의 내부 가로 스크롤 없음, 위젯 배치·중성 라이트 배경·메모 읽기.
- 서식·업데이트 4개: 곰씨 업데이트 창, 굵기·크기·밑줄·글자색·형광펜, JSON·새로고침 보존, 오프라인 서식 편집.
- 업데이트·주소 변경 7개: 실제 이전 HTTP·서비스 워커 캐시에서 복구, 오프라인 버전 URL, 모든 페이지에서 기기 연결 UI·런타임 제거, 이전 경로에서 저장한 메모·서식·백업의 새 경로 보존, 저장소 제한·대화상자 누락·새 버전 안내.
- 제한 미리보기 시작 5개: origin·저장소·History API 제한에서도 화면·계산·근무표 실행과 오류 없음.

정적 경로 검사로 9개 HTML의 상대 리소스 존재와 새 사이트맵 URL, 배포 런타임의 WebRTC 제거를 확인합니다. 다운로드와 스크린샷은 저장소 밖 `/tmp`에 보관합니다.

## 자동 배포

`main` 푸시 시 GitHub Actions가 핵심 로직과 생성 파일을 검사하고 정적 파일을 Pages에 배포합니다. `peer.js`는 배포 목록에서 제거했습니다. 이어서 실제 공개 주소에서 브라우저 50개 시나리오를 실행하고 스크린샷·다운로드 결과를 아티팩트로 보관합니다.

이전 `/dangi-alba/` 주소는 GitHub Pages에서 자동으로 이동하지 않으므로 새 `/freeter/` 주소를 사용합니다. 같은 도메인·같은 브라우저에서는 기존 저장 키를 계속 읽습니다. 이전 기기 연결 백업을 자동으로 삭제하지 않으며, 명시적인 전체 삭제 시 함께 정리합니다. 근무표 공유·PNG·CSV와 JSON 백업·복원은 유지합니다.

## 별도 확인 범위

삼성 인터넷 사용자 에이전트·모바일 터치와 API 제한을 Chromium에서 재현합니다. Samsung Internet·iOS Safari의 실기기, OS별 공유 앱과 홈 화면 설치 UI 검사는 별도입니다. 브라우저 데이터 삭제나 다른 브라우저로의 이동은 기록을 자동으로 옮기지 않습니다.
