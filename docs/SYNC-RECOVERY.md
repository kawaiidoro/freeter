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

**확정된 직접 원인은 DB 연결풀 획득 시간 초과입니다.** 연결을 점유한 세션·장기 트랜잭션·역할별 연결 한도·PostgREST 풀 설정 중 무엇이 원인인지는 관리 권한이 없어 아직 확인하지 못했습니다. 테이블 누락이나 Google 설정 오류라고 단정할 근거는 없습니다.

## 복구 순서

1. [Supabase 프로젝트](https://supabase.com/dashboard/project/dsqhfwhurecpcvxpbafo)에서 Database와 Data API 상태를 확인합니다. 일시 중지 상태라면 Resume/Restore를 실행합니다.
2. SQL Editor에서 [읽기 전용 진단 SQL](../supabase/diagnose-sync.sql)을 실행합니다. 연결 수·역할별 한도·오래된 트랜잭션·막힌 PID·테이블/RPC 유무만 조회하며 개인 메모나 SQL 본문은 출력하지 않습니다. Logs Explorer의 PostgREST/Postgres 로그도 함께 확인합니다.
3. 연결이 고갈되었거나 PostgREST가 비정상 상태이면 Project Settings → General → Restart project로 복구한 뒤 재검사합니다. 재시작 중 잠시 접속이 끊기며 진행 중 트랜잭션이 취소될 수 있습니다. 기존 테이블이나 프로젝트를 삭제하지 않습니다.
4. 재발하면 진단 결과에 따라 점유 클라이언트의 연결을 정리하고 장기 트랜잭션을 수정합니다. 풀 크기는 실제 여유 연결 수 안에서만 조정합니다. 원인 확인 없이 `max_connections`를 올리거나 무조건 요금제를 변경하지 않습니다.
5. 아래 계정 제한 설치와 보안 검사를 실행한 후, 소유자 계정으로 두 기기에서 메모를 수정하여 서버 확인 시각과 반영을 확인합니다. Google 로그인 성공만으로 DB 저장 성공을 판단하지 않습니다.

에이전트가 직접 조사·복구하도록 하려면 **이 환경 설정의 기존 `SUPABASE_ACCESS_TOKEN` 항목**에 Supabase Personal Access Token을 안전하게 연결합니다. 채팅·GitHub·프런트엔드에는 넣지 않습니다. 공개 Publishable key만으로 DB 접속 현황을 조회하거나 프로젝트를 재시작할 수 없습니다.

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
