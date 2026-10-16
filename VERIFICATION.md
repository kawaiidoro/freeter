# Freeter 검증 결과

검증일: 2026-10-16. 사이트: https://kawaiidoro.github.io/freeter/

## 로컬 검사

Node.js 24, 시스템 Chromium·Playwright와 격리된 테스트 데이터를 사용했습니다. 실제 사용자 기록·Google 계정·서비스 세션을 검사에 쓰지 않습니다.

| 검사 | 개수 | 범위 |
| --- | ---: | --- |
| 핵심 로직 | 35 | 급여·세금·교대 식사·기록·통계·CSV·백업·서식 검증 |
| 계정·동기화 로직 | 33 | PKCE 설정·공개 키 검증·계정 분리·3방향 병합·CAS·오프라인·계정 전환·로그아웃·삭제 세대·손상 저장소 |
| PostgreSQL 보안 | 10 | 실제 PGlite 엔진에서 RLS·권한·RPC·익명 및 타 계정 접근 차단·CAS·크기 제한·재설치 보존 |
| 기본 브라우저 | 18 | 근무표·급여·기록·입금·통계·다운로드·복원·삭제·모바일·오프라인 |
| 추가 기능 | 11 | 맞교대·교대 식사·세금 선택·지급 완료·미니 계산기·메모·이전 버전 |
| Freeter 브랜드·모바일 | 10 | 9개 페이지 메타데이터·로고·썸네일·320~768px 근무표·중성 배경·메모 가독성 |
| 서식·업데이트 | 4 | 곰씨·서식 5종·읽기·JSON·오프라인 편집 |
| 캐시·주소 복구 | 7 | 이전 캐시 갱신·주소 변경 시 메모 보존·저장소 차단 환경 시작·업데이트 알림 |
| 제한 미리보기 | 5 | origin·저장소·History API 제한에서도 시작·계산·근무표 실행 |
| 보안 브라우저 | 5 | 실제 CSP 강제·HTML 내보내기 XSS 패치·악성 붙여넣기·인증 콜백 비캐시 |
| 계정 브라우저 | 6 | 공식 SDK와 격리 OAuth/REST에서 PKCE·가져오기·두 기기 서식 동기화·로그아웃·계정 전환·다른 탭의 확인창 취소 |

격리 검사는 144개입니다. 핵심·계정·DB 78개는 `npm test`, 브라우저 66개는 각각의 `tests/*.mjs`로 실행합니다. 별도로 실제 Supabase 공개 API 검사 3개를 실행합니다. 생성 파일·구문 검사와 vendor 재현성 검사도 수행합니다.

```sh
NPM_CONFIG_CACHE=/tmp/freeter-npm-cache npm ci --ignore-scripts
node scripts/build-vendor.mjs --check
node scripts/build-site.mjs --check
node --check site.js
npm test
NPM_CONFIG_CACHE=/tmp/freeter-npm-cache node scripts/security-audit.mjs
```

브라우저 명령은 [README](README.md)에 있습니다. 다운로드·스크린샷과 감사 원문 `/tmp/freeter-security-audit.json`은 저장소 밖에 생성합니다.

## 보안 결과

전체 npm 감사에서 upstream Quill의 `GHSA-v3m3-f69x-jf25` 낮음 1건이 확인됐습니다. 공식 수정 릴리스가 없으므로 배포 빌드에서 취약 HTML 직렬화를 이스케이프한 텍스트로 교체했고 실제 브라우저 공격 회귀 검사로 확인합니다. 그 외 감사 경고는 없으며 중간·높음·치명적은 0건입니다. 원본 패키지의 감사 경고가 사라졌다고 보고하지 않습니다. 상세 내용은 [보안 보고서](docs/SECURITY.md)에 있습니다.

인증 SDK가 초기화 과정에서 차단된 localStorage를 읽어 첫 화면을 중단하던 경로도 재현했습니다. 저장소 확인 후 SDK를 지연 초기화하며 계정을 쓸 수 없는 브라우저에서는 기존 도구를 계속 제공합니다.

## 자동 배포·보안 유지

`main` 푸시 시 GitHub Actions가 vendor·런타임 재현성, 핵심·계정·DB 78개와 의존성 감사를 검사하고 공개 파일만 Pages에 배포합니다. 이어서 공개 사이트 브라우저 50개와 격리된 보안·계정 브라우저 11개를 실행합니다. 운영 Supabase의 공개 API 검사 3개도 배포 후 실행합니다. 제한 미리보기 5개는 별도 로컬 검사입니다. 관리자 키·DB 비밀번호·Google client secret은 배포물에 포함하지 않습니다. Actions는 커밋으로 고정하고 checkout 인증 정보 보관을 껐습니다. PR·주간 감사와 Dependabot을 추가했습니다.

## 실제 Supabase 확인

운영 프로젝트 `dsqhfwhurecpcvxpbafo.supabase.co`의 공개 API에 TLS 검증을 유지한 상태로 접근했습니다. `npm run check:backend`로 다음 3개를 확인했습니다.

- Google 인증 공급자가 활성화되어 있습니다.
- 로그인 없는 테이블 읽기는 HTTP 401 / 코드 `42501`로 거부됩니다. `revision` 열·0개 행 조회로 개인 기록을 읽지 않습니다.
- 로그인 없는 저장 RPC도 HTTP 401 / 코드 `42501`로 거부됩니다. NULL 본문은 DB 제약을 통과할 수 없어 실제 기록을 저장하지 않습니다.

사용자는 같은 Google 계정의 PC·휴대폰에서 메모 수정이 양쪽에 반영됨을 확인했습니다. 에이전트는 사용자의 실제 로그인 세션·개인 기록을 사용하지 않았습니다. 운영 DB의 서로 다른 두 계정 사이 접근 차단을 직접 확인한 것은 아니며, 해당 정책은 실제 PostgreSQL 엔진의 격리 테스트로 확인했습니다. 관리 토큰을 새로 요구하거나 DB 설정을 변경하지 않았습니다.

JSONB 속성 순서로 인한 메모 오탐 충돌, 저장 확인 실패 시 초안 보존, 서버 행 소실, 로그아웃 후 새 로그인에 도착한 오래된 응답을 회귀 검사했습니다. 저장 직후 서버 본문 재조회, 오프라인 최초 인증 재시도, API 본문 수신까지 제한 시간 적용, 계정 창의 최근 서버 확인 시각도 검사합니다.

Samsung Internet·iOS Safari의 전체 실기기 검사와 환경 Publish 이후 새 작업 복원은 별도 확인 범위입니다.
