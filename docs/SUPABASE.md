# Google 로그인과 Supabase 계정 저장 설정

사이트는 https://kawaiidoro.github.io/freeter/ 에서 계속 제공합니다. Supabase Auth가 Google 로그인·세션을 처리하고 Postgres가 계정별 기록을 보관합니다. 별도의 Node 서버나 유료 배포 서버는 필요하지 않습니다.

## 1. 프로젝트의 공개 설정

Supabase 프로젝트의 **Connect** 또는 **Settings → Data API / API Keys**에서 Project URL과 Publishable key를 확인합니다. `cloud-config.json`에는 아래 두 공개 값만 넣습니다.

```json
{
  "url": "https://YOUR_PROJECT_REF.supabase.co",
  "publishableKey": "sb_publishable_YOUR_PUBLIC_KEY"
}
```

`service_role`, `sb_secret_…`, DB 비밀번호와 Google client secret은 이 파일이나 GitHub 저장소에 넣지 않습니다. 공개 키는 계정 권한을 부여하지 않으며 DB의 RLS와 사용자 인증이 접근을 제한합니다. 공개 설정이 비어 있으면 기존 도구는 동작하고 계정 로그인은 준비 중으로 표시합니다.

## 2. 데이터베이스 설치

관리 자동화를 사용한다면 환경 설정에 `SUPABASE_ACCESS_TOKEN`을 보안 값으로 연결하고 다음을 실행합니다.

```sh
NODE_USE_ENV_PROXY=1 node scripts/setup-supabase.mjs
```

Supabase Personal Access Token은 계정의 Access Tokens 화면에서 발급합니다. 토큰은 채팅·GitHub·공개 설정에 넣지 않습니다. 스크립트는 이 프로젝트의 테이블·RLS·저장 함수와 사이트·로그인 복귀 주소를 설정하고 익명 접근 차단을 검사합니다. 기존 리디렉션 항목은 보존합니다. Google 인증 제공자의 클라이언트 정보가 이미 설정되어 있으면 이를 유지합니다.

관리 토큰을 제공하지 않는 경우 Supabase의 **SQL Editor → New query**에 [마이그레이션](../supabase/migrations/202610160001_workspaces.sql)을 붙여넣고 실행합니다. 다음으로 **Authentication → URL Configuration**에서 설정합니다.

- Site URL: `https://kawaiidoro.github.io/freeter/`
- Redirect URLs: `https://kawaiidoro.github.io/freeter/` (정확한 주소, 와일드카드 불필요)

## 3. Google OAuth 설정

Supabase 웹사이트에 GitHub로 로그인한 계정과 사이트 이용자의 Google 로그인은 별개의 설정입니다.

1. Google Cloud Console에서 프로젝트를 선택하고 **Google Auth Platform**의 앱 정보·동의 화면을 설정합니다. 테스트 모드라면 사용할 Google 계정을 테스트 사용자에 추가합니다. 전체 사용자에게 제공하려면 Google의 게시 요건에 맞게 앱을 게시합니다.
2. **Clients → Create client → Web application**에서 OAuth 클라이언트를 만듭니다.
3. Authorized JavaScript origins: `https://kawaiidoro.github.io`
4. Authorized redirect URIs: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` — Supabase의 Google 공급자 화면에 표시되는 콜백 주소와 정확히 일치해야 합니다.
5. Supabase **Authentication → Sign In / Providers → Google**을 켜고 위 Google OAuth client ID와 client secret을 입력합니다. `Skip nonce checks`는 끈 상태로 둡니다.

Google client secret은 Supabase 설정에만 저장합니다. 자동화로 공급자 설정도 적용할 경우 `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`을 환경 설정으로 제공하고 설치 스크립트를 실행할 수 있습니다. 프런트엔드나 GitHub Actions에는 이 비밀 값들이 필요하지 않습니다.

## 4. 빌드·배포와 접속 확인

```sh
npm ci --ignore-scripts
node scripts/build-vendor.mjs
node scripts/build-site.mjs
npm test
node scripts/security-audit.mjs
```

생성된 파일을 함께 커밋하고 `main`에 푸시합니다. GitHub Actions가 검사 후 Pages에 배포합니다. 계정 아이콘 → Google로 계속하기로 로그인합니다. 최초 로그인 시 로그인 전 브라우저 기록을 자동으로 올리지 않습니다. **브라우저 기록 가져오기**에서 확인 후 계정으로 옮깁니다. 계정의 기존 기록은 JSON으로 먼저 내려받으며 로그인 전 원본도 유지합니다.

같은 Google 계정으로 PC·모바일에서 로그인하면 근무표·알바·입금·메모와 서식이 자동 저장되고 약 10초 간격으로 다른 기기의 변경을 확인합니다. 독립된 기록 추가는 합치며 같은 항목의 동시 편집은 자동 덮어쓰기를 멈추고 백업·선택을 제공합니다. 오프라인 편집은 기기에 보관하고 연결 후 재시도합니다. 세션을 검증할 수 없는 오프라인 최초 진입에서는 로그인이 필요할 수 있습니다.

로그아웃은 현재 브라우저의 계정 캐시·복구 사본을 지우고 로그인 전 브라우저 기록으로 돌아갑니다. 서버 저장에 실패한 편집이 있으면 백업하고 로그아웃할 수 있습니다. 연결 오류로 서버 세션 해제를 확인하지 못한 경우에는 기기 로그아웃과 구분하여 알립니다. **전체 데이터 삭제**는 로그인 상태에서 해당 계정의 기록을 비우고 다른 기기에 반영합니다. Google 계정 자체를 삭제하지 않습니다.

## 실제 서비스 확인

공개 키로 DB를 조회하면 401/403이어야 합니다. 두 개의 실제 Google 계정으로 각자의 기록만 보이는지 확인하고, 같은 계정으로 두 기기에서 저장·새로고침·로그아웃·동시 수정·삭제 후 오래된 기기의 재접속을 확인합니다. 자동 검사는 모사한 OAuth API와 실제 Postgres RLS 엔진을 사용하며, 프로젝트 설정이나 실제 Google 로그인을 완료한 것으로 대신 보고하지 않습니다.
