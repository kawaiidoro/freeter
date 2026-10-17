# 동기화 장애 진단과 소유자 계정 제한

현재 운영 주소: https://kawaiidoro.github.io/freeter/

## 확인한 원인

2026-10-17 운영 Supabase 프로젝트에 개인 기록을 읽지 않는 조회(`select=revision&limit=0`)로 확인했습니다.

| 검사 | 결과 | 의미 |
| --- | --- | --- |
| Auth health / Google 설정 | HTTP 200, Google 활성화 | 로그인 서비스가 응답함 |
| API 키 없음 / 잘못된 키 | 약 1초 안에 HTTP 401 | API 게이트웨이의 키 검증은 응답함 |
| 정상 공개 키로 Data API 조회 | 약 63초 후 HTTP 504, `PGRST003` | PostgREST가 DB 연결풀에서 연결을 확보하지 못함 |

서버가 반환한 정확한 오류는 `Timed out acquiring connection from connection pool.`입니다. 기존 15초 클라이언트 제한과 30초 검사 제한에서는 이 본문이 도착하기 전에 시간 초과만 표시됐습니다. 운영 검사는 70초 동안 한 번 기다려 실제 오류를 확인하도록 바꿨습니다. 브라우저는 15초 제한을 유지하며, 실패한 자동 요청 간격을 10→20→40→60초로 늘립니다. 수동 동기화·온라인 복귀 시에는 바로 재시도합니다. 저장 완료는 본문 재조회가 성공했을 때만 표시합니다.

이후 공개 Auth API도 HTTP 502, Data API도 HTTP 521/502를 반환했고, 사용자 대시보드에서는 **Unhealthy / CPU 100% / RAM 51% / Disk 14% / 연결 17/100**이 확인됐습니다. 전체 DB 연결 한도 100개를 모두 사용한 화면은 아닙니다. 다만 PostgREST의 연결풀은 전체 연결 한도와 별개이며, CPU가 포화되면 요청 처리도 지연될 수 있습니다.

**확정된 직접 장애는 DB 연결풀 획득 시간 초과와 이후 서비스의 5xx 응답입니다.** 실제 서버의 실행 중 쿼리와 로그는 관리 권한이 없어 아직 조회하지 못했습니다.

## CPU 100%와 관련해 발견한 코드 결함

기존 저장 함수는 기기 간 버전 충돌에 `SQLSTATE 40001`을 사용했습니다. Supabase는 [공식 장애 문서](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b)에서 PostgREST 14가 이 코드의 사용자 정의 오류를 무한 재시도할 수 있고, CPU 상승·반복 오류·응답 불능으로 이어질 수 있다고 설명합니다. 해당 버그는 PostgREST 16에서 수정됩니다.

프리터의 충돌은 동일한 트랜잭션을 다시 실행해도 해결되지 않습니다. 서버의 최신 기록을 다시 읽고 병합해야 하므로 오류 코드를 **`PT409` (HTTP 409)**로 수정했습니다. 클라이언트는 새 코드와 이전 DB의 `40001` 응답을 모두 처리하되, 한 동기화의 충돌 재시도는 최대 3번으로 제한합니다.

소스 코드에 이 결함이 있었던 것은 확인했습니다. **운영 DB 함수가 여전히 `40001`을 쓰는지, 설치된 PostgREST 버전과 로그가 이 버그에 해당하는지는 아직 확인하지 못했습니다.** Postgres 로그에 `FREETER_CONFLICT`와 `sql_state_code: 40001`이 반복되면 중요한 확인 근거입니다. 읽기 전용 진단 결과의 `workspace.conflictUsesRetryCode`가 `true`이면 서버 함수에도 이전 코드가 남아 있습니다.

## 복구 순서

1. PC·모바일에서 열린 프리터 탭을 모두 닫습니다. 브라우저 데이터나 앱을 삭제하지 않습니다. 미전송 기록은 기기에 남아 있습니다.
2. [SQL Editor](https://supabase.com/dashboard/project/dsqhfwhurecpcvxpbafo/sql/new)에서 [기존 DB 충돌 코드 복구 SQL](../supabase/migrations/202610170002_conflict_http.sql) 전체를 실행합니다. 기존 함수의 `40001`만 `PT409`로 바꾸며, 자료·리비전·함수 권한·기존 소유자 제한을 보존합니다. 함수가 없거나 인식할 수 없는 정의이면 변경하지 않고 오류로 중단합니다. 대기 제한도 적용됩니다.
3. 실행이 성공하면 [General → Project availability → Restart project](https://supabase.com/dashboard/project/dsqhfwhurecpcvxpbafo/settings/general#restart-project)를 **한 번** 실행합니다. 이미 시작된 서버 재시도는 함수 수정 후에도 남을 수 있어 재시작으로 정리해야 합니다. 잠시 접속이 끊기고 진행 중 트랜잭션은 취소될 수 있습니다. 재시작 진행 중에는 반복해서 누르지 않습니다. SQL Editor 자체가 열리지 않으면 탭을 닫은 채 먼저 한 번 복구 재시작한 뒤 SQL을 적용합니다.
4. Healthy로 회복되면 [읽기 전용 진단 SQL](../supabase/diagnose-sync.sql)로 `conflictUsesRetryCode: false`, `conflictUsesHttp409: true`를 확인합니다. 최신 사이트를 한 기기에서 연 뒤 저장·서버 재조회가 성공하는지 확인하고 다른 기기를 엽니다. Google 로그인 성공만으로 DB 저장 성공을 판단하지 않습니다.
5. CPU가 계속 높으면 [Query Performance](https://supabase.com/dashboard/project/dsqhfwhurecpcvxpbafo/observability/query-performance)와 [Postgres 로그](https://supabase.com/dashboard/project/dsqhfwhurecpcvxpbafo/logs/postgres-logs)에서 반복 오류·오래 걸리는 쿼리·막힌 PID를 확인합니다. 원인 확인 없이 전체 세션을 종료하거나 `max_connections`를 높이거나 유료 컴퓨트로 바꾸지 않습니다. SQL 수정 후에도 Healthy로 회복되지 않으면 프로젝트 참조 ID·발생 시각·5xx 오류와 함께 Supabase 지원에 문의합니다.

에이전트가 직접 조사·복구하려면 비밀값 연결을 지원하는 실행 환경에서 `SUPABASE_ACCESS_TOKEN`을 안전하게 제공해야 합니다. 일반 ChatGPT 대화 화면에서 토큰을 채팅으로 보내지 않습니다. 이 경우에는 위 SQL Editor 절차를 사용합니다. 공개 Publishable key만으로 DB 접속 현황을 조회하거나 프로젝트를 재시작할 수 없습니다. 관리 토큰은 웹사이트 로그인이나 사용자 동기화 자체에 필요한 키가 아닙니다.

```sh
NODE_USE_ENV_PROXY=1 node scripts/diagnose-supabase.mjs
```

이 명령은 읽기 전용입니다. 토큰이 없으면 공개 Auth/Data API만 검사하고, 토큰이 있으면 서비스 건강 상태·연결 통계·소유자 Hook 설정까지 검사합니다. 비밀 토큰·사용자 기록·인증 설정 원문은 출력하지 않습니다.

## 소유자 계정 제한 설치

확인한 소유자 Google 계정의 이메일 해시가 `cloud-config.json`의 `allowedEmailHash`에 들어 있습니다. 브라우저는 서버 `getUser()`로 확인한 Google 계정·확인된 이메일을 비교하여 다른 계정의 기기 캐시나 서버 자료를 열지 않습니다. 공개 웹사이트의 로그인 화면만 수정하는 것으로 서버 권한이 바뀌지는 않습니다.

다음 서버 설정을 **모두** 적용해야 서버에서도 다른 계정을 차단합니다.

1. SQL Editor에서 [소유자 설치 SQL](../supabase/setup-owner.sql) 전체를 실행합니다. 기존 근무 기록·리비전은 보존하며, 지정 Google 계정만 조회·저장하도록 제한합니다. 기존의 다른 계정 JWT도 데이터에 접근할 수 없게 합니다.
2. Authentication → Hooks에서 다음 두 **Postgres function** Hook을 활성화합니다.

   | Hook | 스키마·함수 |
   | --- | --- |
   | Before User Created | `public.freeter_before_user_created` |
   | Custom Access Token | `public.freeter_custom_access_token_hook` |

   첫 Hook은 다른 계정의 신규 가입을 차단하고, 두 번째는 기존 계정의 로그인·토큰 갱신도 차단합니다. SQL로 함수만 만드는 것으로 Hook이 활성화되지는 않습니다.
3. 소유자 계정은 로그인·저장에 성공하고, 다른 Google 계정은 거절되는지 확인합니다. 이미 다른 Hook을 사용하고 있다면 해당 로직과 통합해야 하며 조용히 덮어쓰지 않습니다.

관리 토큰이 연결된 환경에서는 같은 작업을 자동화할 수 있습니다.

```sh
node scripts/build-owner-setup.mjs --check
NODE_USE_ENV_PROXY=1 node scripts/setup-supabase.mjs
NODE_USE_ENV_PROXY=1 npm run check:backend
```

설치 스크립트는 기존 다른 Auth Hook이 발견되면 변경 전에 중단합니다. RLS·저장 RPC·두 로그인 Hook을 설치하고 설정을 다시 읽어 확인합니다. 에이전트의 격리 PostgreSQL·모사 OAuth 검사는 실제 서버에 설정을 적용한 것으로 대신 보고하지 않습니다.

## 일본 리전을 꼭 사용해야 하나요?

아닙니다. Supabase는 **Northeast Asia (Seoul), `ap-northeast-2`**도 지원합니다. 한국 사용자 중심이면 서울을 선택할 수 있습니다. 생성 화면의 실제 선택 가능 여부는 계정·프로젝트 생성 시점의 가용성에 따릅니다.

도쿄 리전 자체가 CPU 100%의 원인이라는 근거는 없습니다. Nano는 제한된 공유 컴퓨트이지만, 위 재시도 결함을 남긴 채 리전만 바꿔도 근본 원인이 해결되지는 않습니다. 우선 현재 서버를 복구하고 기록을 확인하는 편이 좋습니다.

기존 프로젝트의 리전을 설정 한 번으로 변경할 수는 없습니다. [공식 리전 변경 안내](https://supabase.com/docs/guides/troubleshooting/change-project-region-eWJo5Z)에 따라 서울에 새 프로젝트를 만들고 DB·Auth 사용자·설정을 이전해야 합니다. 프리터의 Project URL·공개 키, Google OAuth의 새 Supabase 콜백 주소와 Auth Hook도 함께 바꿔야 합니다. 로컬 JSON 백업만으로 Auth 사용자 ID가 보존되지는 않으므로, 기존 계정 기록의 소유권까지 확인하고 이전을 검증하기 전에는 기존 프로젝트를 삭제하지 않습니다.
