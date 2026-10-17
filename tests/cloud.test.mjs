import test from 'node:test';
import assert from 'node:assert/strict';
import { FreeterCloud, cloudConfig, mergeWorkspaces } from '../cloud.js';
import { emptyState } from '../core.js';
const config={url:'https://abcdefghijklmnopqrst.supabase.co',publishableKey:'sb_publishable_public_test_key_12345'};
const clone=value=>structuredClone(value);
const record=id=>({id,date:'2026-10-16',workplace:id,task:'',note:'',dueDate:'',start:'09:00',end:'18:00',breakMinutes:60,payType:'hourly',rate:12000,extra:0,deduction:0,taxType:'none',taxExempt:0,payments:[]});
class MemoryStorage{
 data=new Map();blocked=false;
 getItem(key){return this.data.get(key)??null;}
 setItem(key,value){if(this.blocked)throw Error('Quota');this.data.set(key,value);}
 removeItem(key){this.data.delete(key);}
}
function harness(t,{server=new Map(),id='alice',storage=new MemoryStorage(),onWorkspace=()=>{},request,requestTimeout=15000,clientConfig=config}={}){
 const control={server,id,offline:false,readGate:null,writeGate:null,reads:0,writes:0,subscription:null,verifiedId:null},client={};
 client.auth={getUser:async()=>control.verifyOffline?{data:{user:null},error:{code:'NETWORK'}}:({data:{user:{id:control.verifiedId||control.id,email:control.id+'@example.test',...control.userProps}}}),getSession:async()=>({data:{session:control.id?{user:{id:control.id}}:null}}),onAuthStateChange:callback=>{control.subscription=callback;return{data:{subscription:{unsubscribe(){}}}};},exchangeCodeForSession:async code=>{control.code=code;return{error:control.exchangeError||null};},signInWithOAuth:async options=>{control.oauth=options;return{data:{url:config.url+'/auth/v1/authorize?provider=google'}};},signOut:async()=>{if(control.signOutGate)await control.signOutGate;return{error:null};}};
 client.from=()=>({select:()=>({eq:(_key,user)=>({maybeSingle:async()=>{control.reads++;await control.beforeRead?.(user);if(control.readGate)await control.readGate;if(control.offline)throw Error('Offline');return{data:clone(server.get(user)||null),error:null};}})})});
 client.rpc=async(_name,args)=>{const owner=control.id;control.writes++;if(control.writeGate)await control.writeGate;if(control.offline)return{error:{code:'NETWORK'}};if(control.alwaysConflict)return{error:{code:control.conflictCode||'PT409'}};const prior=server.get(owner);
  if((prior?.revision||0)!==args.p_expected_revision||(prior?.generation||1)!==args.p_expected_generation)return{error:{code:control.conflictCode||'PT409'}};
  const next={data:clone(control.dropWriteData?(prior?.data||emptyState()):args.p_data),revision:(prior?.revision||0)+1,generation:(prior?.generation||1)+(prior&&args.p_reset?1:0),updated_at:new Date().toISOString()};server.set(owner,next);return{data:[{revision:next.revision,generation:next.generation,updated_at:next.updated_at}],error:null};
 };
 const cloud=new FreeterCloud({config:clientConfig,createClient:(_url,_key,options)=>{control.options=options;return client;},storage,onWorkspace,delay:1000000,requestTimeout,request:request|| (async()=>({ok:true,json:async()=>({external:{google:!control.googleDisabled}})}))});t.after(()=>cloud.stop());
 return{cloud,control,storage,signIn:async()=>cloud.sessionChanged({user:{id:control.id}})};
}
const gate=()=>{let release;const promise=new Promise(resolve=>{release=resolve;});return{promise,release};};

test('공개 설정은 publishable/anon만 허용하고 비밀 키·임의 호스트를 거부',()=>{
 assert.equal(cloudConfig({url:'',publishableKey:''}),null);assert.equal(cloudConfig(config).project,'abcdefghijklmnopqrst');
 for(const input of [{...config,publishableKey:'sb_secret_bad'},{...config,url:'http://abcdefghijklmnopqrst.supabase.co'},{...config,url:'https://attacker.test'},{...config,service_role:'private'},{url:'',publishableKey:'',secret:'private'}])assert.throws(()=>cloudConfig(input));
 const jwt=role=>'e30.'+btoa(JSON.stringify({role,ref:'abcdefghijklmnopqrst'})).replaceAll('=','')+'.signature';assert.ok(cloudConfig({...config,publishableKey:jwt('anon')}));assert.throws(()=>cloudConfig({...config,publishableKey:jwt('service_role')}));
});
test('독립된 기록 추가는 보존하고 같은 메모의 다른 편집은 충돌로 판정',()=>{
 const base=emptyState(),local={...emptyState(),records:[record('a')]},remote={...emptyState(),records:[record('b')]};const merged=mergeWorkspaces(base,local,remote);assert.deepEqual(merged.conflicts,[]);assert.deepEqual(merged.data.records.map(x=>x.id),['a','b']);
 local.workMemo='local';remote.workMemo='remote';assert.deepEqual(mergeWorkspaces(base,local,remote).conflicts,['memo']);
});
test('메모 본문과 서식은 함께 병합하고 삭제와 수정 충돌은 감춤 없이 감지',()=>{
 const base=emptyState();base.records=[record('a')];const local=clone(base),remote=clone(base);local.records=[];remote.records[0].note='changed';assert.deepEqual(mergeWorkspaces(base,local,remote).conflicts,['record:a']);
 local.records=clone(base.records);local.workMemo='styled';local.workMemoDelta={ops:[{insert:'styled',attributes:{bold:true}},{insert:'\n'}]};remote.records=clone(base.records);const merged=mergeWorkspaces(base,local,remote);assert.equal(merged.data.workMemo,'styled');assert.deepEqual(merged.data.workMemoDelta,local.workMemoDelta);
});
test('공식 SDK 설정은 PKCE이며 로그인 요청은 Google 최소 권한만 사용',async t=>{
 const{cloud,control}=harness(t);assert.equal(control.options.auth.flowType,'pkce');assert.equal(control.options.auth.detectSessionInUrl,false);
 const url=await cloud.googleLogin('https://kawaiidoro.github.io/freeter/');assert.ok(url.startsWith(config.url));assert.equal(control.oauth.provider,'google');assert.equal(control.oauth.options.redirectTo,'https://kawaiidoro.github.io/freeter/');assert.equal(control.oauth.options.skipBrowserRedirect,true);assert.equal(control.oauth.options.scopes,undefined);assert.equal(control.oauth.options.queryParams.prompt,'select_account');
});
test('OAuth 코드는 URL에서 즉시 지우고 PKCE 교환으로만 로그인',async t=>{
 const{cloud,control}=harness(t);let cleaned;await cloud.start('https://kawaiidoro.github.io/freeter/?code=one-time&v=release',url=>{cleaned=url;});assert.ok(!cleaned.includes('code='));assert.ok(cleaned.includes('v=release'));assert.equal(control.code,'one-time');assert.equal(cloud.user.id,'alice');
});
test('실패한 OAuth 교환은 기기 기록을 업로드하지 않음',async t=>{
 const{cloud,control}=harness(t);control.exchangeError={message:'bad code'};await cloud.start('https://kawaiidoro.github.io/freeter/?code=bad',()=>{});assert.equal(cloud.user,null);assert.equal(control.writes,0);
});
test('서버에서 검증한 사용자와 세션 ID가 다르면 계정 데이터를 열지 않음',async t=>{
 const{cloud,control}=harness(t);control.verifiedId='bob';await cloud.sessionChanged({user:{id:'alice'}});assert.equal(cloud.user,null);assert.equal(control.reads,0);assert.equal(cloud.phase,'error');
});
test('로그인 전 기록은 자동 업로드하거나 덮어쓰지 않고 계정별로 분리',async t=>{
 const{cloud,storage,control,signIn}=harness(t);const guest={...emptyState(),workMemo:'guest private'};storage.setItem('dangi-alba:data',JSON.stringify(guest));await signIn();assert.equal(cloud.current.workMemo,'');assert.equal(control.writes,0);cloud.save({...emptyState(),workMemo:'account'});await cloud.sync();assert.deepEqual(JSON.parse(storage.getItem('dangi-alba:data')),guest);assert.equal(control.server.get('alice').data.workMemo,'account');
});
test('두 기기의 독립된 기록은 CAS 재시도로 둘 다 보존',async t=>{
 const server=new Map(),a=harness(t,{server}),b=harness(t,{server});await a.signIn();await b.signIn();a.cloud.save({...emptyState(),records:[record('a')]});b.cloud.save({...emptyState(),records:[record('b')]});await a.cloud.sync();await b.cloud.sync();await a.cloud.sync();assert.deepEqual(server.get('alice').data.records.map(r=>r.id).sort(),['a','b']);assert.deepEqual(a.cloud.current.records,b.cloud.current.records);
});
test('HTTP 409 충돌과 기존 DB 응답 모두 재조회 후 병합하고 재시도는 3회로 제한',async t=>{
 for(const code of ['PT409','40001'])await t.test(code,async t=>{
  const{cloud,control,storage,signIn}=harness(t);control.conflictCode=code;await signIn();
  cloud.save({...emptyState(),records:[record('local')]});
  control.server.set('alice',{data:{...emptyState(),records:[record('remote')]},revision:1,generation:1,updated_at:null});
  assert.equal(await cloud.sync(),true);assert.equal(control.writes,2);assert.equal(cloud.phase,'synced');
  assert.deepEqual(control.server.get('alice').data.records.map(r=>r.id).sort(),['local','remote']);
  cloud.save({...cloud.current,workMemo:'보존할 초안'});control.alwaysConflict=true;const writes=control.writes;
  assert.equal(await cloud.sync(),false);assert.equal(control.writes-writes,3);assert.equal(cloud.phase,'pending');
  assert.equal(JSON.parse(storage.getItem(cloud.cacheKey)).data.workMemo,'보존할 초안');
 });
});
test('같은 메모 동시 수정은 서버·기기 양쪽 내용을 보존하고 자동 덮어쓰기 중지',async t=>{
 const server=new Map(),a=harness(t,{server}),b=harness(t,{server});await a.signIn();await b.signIn();a.cloud.save({...emptyState(),workMemo:'A'});b.cloud.save({...emptyState(),workMemo:'B'});await a.cloud.sync();await b.cloud.sync();assert.equal(b.cloud.phase,'conflict');assert.equal(b.cloud.current.workMemo,'B');assert.equal(server.get('alice').data.workMemo,'A');await b.cloud.sync();assert.equal(server.get('alice').data.workMemo,'A');
 await b.cloud.resolve('remote');assert.equal(b.cloud.current.workMemo,'A');assert.equal(JSON.parse(b.storage.getItem(b.cloud.cacheKey+':recovery')).workMemo,'B');
});
test('사용자가 이 기기 기록을 명시적으로 선택하면 최신 리비전으로 저장',async t=>{
 const{cloud,control,signIn}=harness(t);await signIn();cloud.save({...emptyState(),workMemo:'local'});control.server.set('alice',{data:{...emptyState(),workMemo:'remote'},revision:1,generation:1,updated_at:null});await cloud.sync();assert.equal(cloud.phase,'conflict');await cloud.resolve('local');assert.equal(control.server.get('alice').data.workMemo,'local');assert.equal(cloud.phase,'synced');
});
test('오프라인에서 대기 중인 편집은 새 실행 후 복구되어 업로드',async t=>{
 const storage=new MemoryStorage(),server=new Map(),a=harness(t,{storage,server});await a.signIn();a.control.offline=true;a.cloud.save({...emptyState(),workMemo:'offline draft'});assert.equal(await a.cloud.sync(),false);assert.equal(a.cloud.dirty,true);a.cloud.stop();
 const b=harness(t,{storage,server});await b.signIn();assert.equal(server.get('alice').data.workMemo,'offline draft');assert.equal(b.cloud.dirty,false);
});
test('읽기 응답 대기 중의 편집을 서버 응답이 덮어쓰지 않음',async t=>{
 const{cloud,control,signIn}=harness(t);await signIn();const hold=gate();control.readGate=hold.promise;const reading=cloud.sync();cloud.save({...emptyState(),workMemo:'typed while fetching'});hold.release();await reading;assert.equal(control.server.get('alice').data.workMemo,'typed while fetching');
});
test('업로드 대기 중 추가 편집도 후속 저장으로 보존',async t=>{
 const{cloud,control,signIn}=harness(t);await signIn();cloud.save({...emptyState(),workMemo:'first'});const hold=gate();control.writeGate=hold.promise;const saving=cloud.sync();cloud.save({...emptyState(),workMemo:'second'});hold.release();await saving;assert.equal(control.server.get('alice').data.workMemo,'second');assert.equal(cloud.dirty,false);
});
test('계정 변경 후 이전 계정의 늦은 응답은 화면과 새 캐시에 반영하지 않음',async t=>{
 const seen=[],h=harness(t,{onWorkspace:data=>seen.push(data.workMemo)});await h.signIn();h.cloud.save({...emptyState(),workMemo:'Alice in flight'});const hold=gate();h.control.writeGate=hold.promise;const pending=h.cloud.sync();h.control.id='bob';h.control.writeGate=null;await h.cloud.sessionChanged({user:{id:'bob'}});hold.release();await pending;assert.equal(h.cloud.user.id,'bob');assert.equal(h.cloud.current.workMemo,'');assert.equal(JSON.parse(h.storage.getItem(h.cloud.cacheKey)).owner,'bob');assert.ok(!seen.includes('Alice in flight'));
});
test('전체 삭제의 세대 변경을 발견한 오래된 기기는 삭제 기록을 자동 복구하지 않음',async t=>{
 const server=new Map(),a=harness(t,{server}),b=harness(t,{server});await a.signIn();a.cloud.save({...emptyState(),records:[record('old')]});await a.cloud.sync();await b.signIn();b.cloud.save({...b.cloud.current,workMemo:'offline change'});a.cloud.save(emptyState(),{reset:true});await a.cloud.sync();await b.cloud.sync();assert.equal(b.cloud.phase,'conflict');assert.equal(server.get('alice').data.records.length,0);assert.equal(server.get('alice').generation,2);
});
test('명시적 로그아웃은 현재 계정 캐시를 지우고 게스트·다른 계정 자료는 보존',async t=>{
 const{cloud,storage,signIn}=harness(t);storage.setItem('dangi-alba:data','guest');storage.setItem('freeter:account:abcdefghijklmnopqrst:bob','bob');await signIn();const key=cloud.cacheKey;cloud.save({...emptyState(),workMemo:'saved before logout'});await cloud.sync();await cloud.signOut();assert.equal(cloud.user,null);assert.equal(storage.getItem(key),null);assert.equal(storage.getItem('dangi-alba:data'),'guest');assert.equal(storage.getItem('freeter:account:abcdefghijklmnopqrst:bob'),'bob');
});
test('미전송 편집은 서버를 기다리지 않고 로그아웃하며 계정별로 보존',async t=>{
 const{cloud,control,storage,signIn}=harness(t);await signIn();control.offline=true;cloud.save({...emptyState(),workMemo:'not yet uploaded'});const key=cloud.cacheKey;const result=await cloud.signOut();assert.equal(result.pending,true);assert.equal(cloud.user,null);assert.equal(JSON.parse(storage.getItem(key)).data.workMemo,'not yet uploaded');
});
test('손상된 계정 캐시는 덮어쓰지 않고 동기화 중지',async t=>{
 const{cloud,storage,control,signIn}=harness(t);const key='freeter:account:abcdefghijklmnopqrst:alice';storage.setItem(key,'{broken');await signIn();assert.equal(storage.getItem(key),'{broken');assert.equal(cloud.cacheBlocked,true);assert.equal(control.writes,0);assert.equal(cloud.save(emptyState()),false);
});
test('저장 공간 부족 시 서버 읽기 결과로 로컬 기준 상태를 바꾸지 않음',async t=>{
 const{cloud,storage,control,signIn}=harness(t);await signIn();storage.blocked=true;control.server.set('alice',{data:{...emptyState(),workMemo:'remote'},revision:1,generation:1,updated_at:null});await cloud.sync();assert.equal(cloud.current.workMemo,'');assert.equal(cloud.revision,0);assert.equal(cloud.phase,'offline');
});
test('계정 백업 복원이 저장 공간 부족으로 실패하면 기존 기록과 업로드 상태를 보존한다',async t=>{
 const{cloud,storage,control,signIn}=harness(t);await signIn();cloud.save({...emptyState(),workMemo:'기존 계정 기록'});await cloud.sync();
 const cached=storage.getItem(cloud.cacheKey),writes=control.writes,generation=cloud.generation;
 storage.blocked=true;assert.equal(cloud.save({...emptyState(),workMemo:'복원 실패한 파일'},{reset:true}),false);
 assert.equal(cloud.current.workMemo,'기존 계정 기록');assert.equal(cloud.dirty,false);assert.equal(cloud.reset,false);assert.equal(storage.getItem(cloud.cacheKey),cached);
 storage.blocked=false;await cloud.sync();assert.equal(control.writes,writes);assert.equal(cloud.generation,generation);assert.equal(control.server.get('alice').data.workMemo,'기존 계정 기록');
});
test('Google 공급자 설정이 끝나지 않았을 때 현재 화면에 머물며 오류 안내',async t=>{
 const{cloud,control}=harness(t);control.googleDisabled=true;await assert.rejects(cloud.googleLogin('https://kawaiidoro.github.io/freeter/'),/지금은 Google/);assert.equal(control.oauth,undefined);
});
test('백업 후 명시적 로그아웃은 오프라인 미전송 캐시를 기기에 남기지 않음',async t=>{
 const{cloud,storage,control,signIn}=harness(t);await signIn();control.offline=true;cloud.save({...emptyState(),workMemo:'backed up locally'});const key=cloud.cacheKey;await cloud.signOut({discardPending:true});assert.equal(storage.getItem(key),null);assert.equal(cloud.user,null);assert.equal(control.server.size,0);
});
const reordered=value=>Array.isArray(value)?value.map(reordered):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reordered(item)])):value;
test('JSONB 객체 키 순서 변경은 서식 메모와 독립 기록의 병합 충돌을 만들지 않음',()=>{
 const base={...emptyState(),workMemo:'원문',workMemoDelta:{ops:[{insert:'원문',attributes:{bold:true,underline:true,size:'24px',color:'#cc2211',background:'#fff59d'}},{insert:'\n'}]}};
 const local=clone(base);local.workMemo='수정';local.workMemoDelta.ops[0].insert='수정';const remote=reordered(base);remote.records.push(record('다른 기기'));
 assert.notEqual(JSON.stringify(base.workMemoDelta),JSON.stringify(remote.workMemoDelta));const result=mergeWorkspaces(base,local,remote);assert.deepEqual(result.conflicts,[]);assert.equal(result.data.workMemo,'수정');assert.equal(result.data.records.length,1);
});
test('서버 저장 응답이 성공이어도 다시 읽은 본문이 다르면 완료로 표시하지 않음',async t=>{
 const{cloud,control,signIn}=harness(t);await signIn();control.dropWriteData=true;cloud.save({...emptyState(),workMemo:'반드시 보존'});assert.equal(await cloud.sync(),false);assert.notEqual(cloud.phase,'synced');assert.equal(cloud.dirty,true);assert.equal(cloud.current.workMemo,'반드시 보존');
});
test('서버 기록이 사라져도 기존 동기화 사본을 빈 기록으로 덮어쓰지 않음',async t=>{
 const{cloud,control,signIn}=harness(t);await signIn();cloud.save({...emptyState(),workMemo:'보존할 기록'});await cloud.sync();control.server.delete('alice');assert.equal(await cloud.sync(),false);assert.equal(cloud.phase,'conflict');assert.equal(cloud.current.workMemo,'보존할 기록');
});
test('로그아웃 응답이 늦게 도착해도 새로 로그인한 다른 계정은 유지',async t=>{
 const{cloud,control,storage,signIn}=harness(t);await signIn();const oldKey=cloud.cacheKey,hold=gate();control.signOutGate=hold.promise;const pending=cloud.signOut();control.id='bob';await cloud.sessionChanged({user:{id:'bob'}});hold.release();await pending;assert.equal(cloud.user?.id,'bob');assert.equal(storage.getItem(oldKey),null);assert.equal(JSON.parse(storage.getItem(cloud.cacheKey)).owner,'bob');
});
test('저장 직후 읽기가 끊겨도 기기 초안을 유지하고 재접속 시 중복 없이 확인',async t=>{
 const{cloud,control,storage,signIn}=harness(t);await signIn();const priorVerified=cloud.snapshot.verifiedAt;cloud.save({...emptyState(),workMemo:'전송한 초안'});control.beforeRead=()=>{control.offline=true;};assert.equal(await cloud.sync(),false);assert.equal(cloud.dirty,true);assert.equal(cloud.revision,0);assert.equal(JSON.parse(storage.getItem(cloud.cacheKey)).data.workMemo,'전송한 초안');assert.equal(cloud.snapshot.verifiedAt,priorVerified);
 control.beforeRead=null;control.offline=false;assert.equal(await cloud.sync(),true);assert.equal(control.server.get('alice').revision,1);assert.equal(cloud.dirty,false);assert.ok(cloud.snapshot.verifiedAt);
});
test('저장 확인 중 입력한 다음 메모도 잃지 않고 후속 저장',async t=>{
 const{cloud,control,signIn}=harness(t);await signIn();cloud.save({...emptyState(),workMemo:'첫 편집'});let edited=false;control.beforeRead=()=>{if(!edited){edited=true;cloud.save({...cloud.current,workMemo:'계속 입력한 편집'});}};
 assert.equal(await cloud.sync(),true);assert.equal(control.server.get('alice').data.workMemo,'계속 입력한 편집');assert.equal(cloud.current.workMemo,'계속 입력한 편집');assert.equal(control.server.get('alice').revision,2);
});
test('저장과 확인 사이 다른 기기의 더 최신 저장은 오래된 응답으로 덮어쓰지 않음',async t=>{
 const{cloud,control,signIn}=harness(t);await signIn();cloud.save({...emptyState(),workMemo:'내 메모'});let added=false;control.beforeRead=()=>{if(!added){added=true;const row=control.server.get('alice');row.data.records.push(record('다른 기기'));row.revision++;}};
 assert.equal(await cloud.sync(),true);assert.equal(cloud.current.workMemo,'내 메모');assert.equal(cloud.current.records[0].id,'다른 기기');assert.equal(cloud.revision,2);
});
test('첫 사용자 검증이 오프라인이면 연결 복구 후 새 로그인 없이 재확인',async t=>{
 const{cloud,control,signIn}=harness(t);control.verifyOffline=true;control.server.set('alice',{data:{...emptyState(),workMemo:'서버 기록'},revision:1,generation:1,updated_at:null});await signIn();assert.equal(cloud.user,null);assert.equal(control.reads,0);control.verifyOffline=false;assert.equal(await cloud.resume(),true);assert.equal(cloud.user.id,'alice');assert.equal(cloud.current.workMemo,'서버 기록');
});
test('오래된 로그아웃은 같은 계정으로 다시 로그인한 새 캐시도 지우지 않음',async t=>{
 const{cloud,control,storage,signIn}=harness(t);await signIn();const hold=gate();control.signOutGate=hold.promise;const pending=cloud.signOut();await cloud.sessionChanged(null);await signIn();hold.release();const result=await pending;assert.equal(result.changedAccount,true);assert.equal(cloud.user.id,'alice');assert.equal(JSON.parse(storage.getItem(cloud.cacheKey)).owner,'alice');
});
test('멈춘 API 요청은 제한 시간에 취소하고 호출자의 취소 신호도 전달',async t=>{
 const request=(_url,{signal})=>new Promise((_resolve,reject)=>{if(signal.aborted)reject(signal.reason);else signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});
 const{control}=harness(t,{request,requestTimeout:20}),fetch=control.options.global.fetch;
 await assert.rejects(fetch(config.url+'/rest/v1/freeter_workspaces',{}),{name:'TimeoutError'});
 const controller=new AbortController();const pending=fetch(config.url+'/auth/v1/user',{signal:controller.signal});controller.abort();await assert.rejects(pending,{name:'AbortError'});
});

test('응답 헤더만 온 채 본문이 멈춰도 API 제한 시간 적용',async t=>{
 const request=async(_url,{signal})=>new Response(new ReadableStream({start(controller){signal.addEventListener('abort',()=>controller.error(signal.reason),{once:true});}}),{headers:{'content-type':'application/json'}});
 const{control}=harness(t,{request,requestTimeout:20});await assert.rejects(control.options.global.fetch(config.url+'/rest/v1/freeter_workspaces',{}),{name:'TimeoutError'});
});

test('로그아웃한 미전송 메모는 다른 계정에 노출되지 않고 원래 계정으로 돌아오면 전송',async t=>{
 const{cloud,control,storage,signIn}=harness(t);await signIn();control.offline=true;
 cloud.save({...emptyState(),workMemo:'Alice only, not uploaded'});const key=cloud.cacheKey;
 await cloud.signOut();assert.equal(JSON.parse(storage.getItem(key)).dirty,true);
 control.offline=false;control.id='bob';await signIn();assert.equal(cloud.current.workMemo,'');assert.equal(control.server.has('alice'),false);
 await cloud.signOut();control.id='alice';await signIn();assert.equal(cloud.current.workMemo,'Alice only, not uploaded');assert.equal(control.server.get('alice').data.workMemo,'Alice only, not uploaded');assert.equal(cloud.dirty,false);
});
test('데이터 조회가 끝나지 않아도 로그아웃하고 늦은 응답은 무시',async t=>{
 const{cloud,control,storage,signIn}=harness(t);await signIn();const hold=gate();control.readGate=hold.promise;
 const reading=cloud.sync();cloud.save({...emptyState(),workMemo:'Keep my pending note'});const key=cloud.cacheKey;
 await cloud.signOut();assert.equal(cloud.user,null);assert.equal(JSON.parse(storage.getItem(key)).data.workMemo,'Keep my pending note');
 hold.release();await reading;assert.equal(cloud.user,null);assert.equal(control.writes,0);
});
test('로그아웃 후 늦은 토큰 저장은 차단하고 새 로그인에서만 저장 재개',async t=>{
 const{cloud,control,storage,signIn}=harness(t);await signIn();const key='freeter:auth:abcdefghijklmnopqrst';
 await cloud.signOut();control.options.auth.storage.setItem(key,'late refresh');assert.equal(storage.getItem(key),null);
 await cloud.googleLogin('https://kawaiidoro.github.io/freeter/');control.options.auth.storage.setItem(key,'new login');assert.equal(storage.getItem(key),'new login');
});
test('로그아웃 중 저장소 접근이 막혀도 편집 잠금을 해제하고 자료 보존',async t=>{
 const{cloud,storage,signIn}=harness(t);await signIn();cloud.save({...emptyState(),workMemo:'Do not lose this note'});
 const remove=storage.removeItem.bind(storage);storage.removeItem=()=>{throw new Error('Blocked storage');};
 await assert.rejects(cloud.signOut(),/브라우저 저장소/);assert.equal(cloud.signingOut,false);assert.equal(cloud.authWritesBlocked,false);assert.equal(cloud.user.id,'alice');assert.equal(JSON.parse(storage.getItem(cloud.cacheKey)).data.workMemo,'Do not lose this note');storage.removeItem=remove;
});

test('허용 목록 밖의 서버 검증 계정은 기기 캐시·REST를 열지 않고 로그아웃',async t=>{
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('alice@example.test'))),n=>n.toString(16).padStart(2,'0')).join('');
 const{cloud,control,storage,signIn}=harness(t,{id:'bob',clientConfig:{...config,allowedEmailHash:hash}});
 control.userProps={email_confirmed_at:new Date().toISOString(),app_metadata:{providers:['google']}};storage.setItem('freeter:account:abcdefghijklmnopqrst:bob','do not read');
 await signIn();assert.equal(cloud.user,null);assert.equal(control.reads,0);assert.equal(control.writes,0);assert.match(cloud.snapshot.label,/등록된 Google 계정만/);assert.equal(storage.getItem('freeter:account:abcdefghijklmnopqrst:bob'),'do not read');
 control.id='alice';await signIn();assert.equal(cloud.user.id,'alice');
});
test('서버 오류 시 자동 요청은 지수 간격으로 대기하고 명시적 재시도는 즉시 수행',async t=>{
 const{cloud,control,signIn}=harness(t);await signIn();control.offline=true;await cloud.sync();const reads=control.reads;
 assert.ok(cloud.retryAt>Date.now());await cloud.sync({automatic:true});assert.equal(control.reads,reads);
 await cloud.sync();assert.equal(control.reads,reads+1);assert.equal(cloud.syncFailures,2);
 control.offline=false;await cloud.sync();assert.equal(cloud.syncFailures,0);assert.equal(cloud.retryAt,0);assert.equal(cloud.phase,'synced');
});
