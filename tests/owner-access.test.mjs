import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';
import{PGlite}from'@electric-sql/pglite';import{emptyState}from'../core.js';import{allowedGoogleAccount,cloudConfig}from'../cloud.js';
const ownerEmail='owner@example.test',hash=createHash('sha256').update(ownerEmail).digest('hex');
const alice='00000000-0000-4000-8000-000000000001',bob='00000000-0000-4000-8000-000000000002';const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role supabase_auth_admin;
 create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create table auth.identities(user_id uuid,provider text);
 grant usage on schema auth,public to anon,authenticated,supabase_auth_admin;grant select on auth.users,auth.identities to supabase_auth_admin;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 insert into auth.users values('${alice}','${ownerEmail}',now()),('${bob}','other@example.test',now());insert into auth.identities values('${alice}','google'),('${bob}','google');`);
const base=await readFile(new URL('../supabase/migrations/202610160001_workspaces.sql',import.meta.url),'utf8');
const owner=await readFile(new URL('../supabase/migrations/202610170001_single_owner.sql',import.meta.url),'utf8');
await db.exec(base);
const save=(data,revision=0)=>db.query('select * from public.freeter_save_workspace($1::jsonb,$2,1,false)',[JSON.stringify(data),revision]);
async function as(role,id,fn){await db.exec(`set role ${role};select set_config('request.jwt.claim.sub','${id||''}',false);`);try{return await fn();}finally{await db.exec('reset role;');}}
await as('authenticated',alice,()=>save({...emptyState(),workMemo:'Owner private'}));await as('authenticated',bob,()=>save({...emptyState(),workMemo:'Previous user row'}));
await db.exec(owner);await db.query('insert into private.freeter_access_config values(true,$1)',[hash]);
try{
 await test('소유자: 이메일은 서버 확인·Google 공급자 검증 후 정확한 해시로만 허용',async()=>{
  const user={email:ownerEmail,email_confirmed_at:new Date().toISOString(),app_metadata:{providers:['google']}};
  assert.equal(await allowedGoogleAccount(user,hash),true);assert.equal(await allowedGoogleAccount({...user,email:'OWNER@EXAMPLE.TEST'},hash),true);
  for(const changed of [{email:'other@example.test'},{email_confirmed_at:null},{app_metadata:{providers:['email']}},{email:'owner+alias@example.test'}])assert.equal(await allowedGoogleAccount({...user,...changed},hash),false);
  assert.throws(()=>cloudConfig({url:'',publishableKey:'',allowedEmailHash:'invalid'}));
 });
 await test('소유자 DB: 기존 다른 계정의 행·오래된 JWT도 조회·저장 차단, 자료 삭제 없음',async()=>{
  await as('authenticated',bob,async()=>{
   await db.exec(`select set_config('request.jwt.claim.email','${ownerEmail}',false);`);
   assert.equal((await db.query('select * from public.freeter_workspaces')).rows.length,0);
   await assert.rejects(save(emptyState(),1),/FREETER_ACCOUNT_NOT_ALLOWED/);
   await assert.rejects(db.query('select * from private.freeter_access_config'),/permission denied/);
  });
  assert.equal((await db.query('select count(*)::int as n from public.freeter_workspaces')).rows[0].n,2);
 });
 await test('소유자 DB: 본인만 저장·재조회 성공하고 CAS 원본 유지',async()=>{
  await as('authenticated',alice,async()=>{const saved=await save({...emptyState(),workMemo:'Owner updated'},1);assert.equal(saved.rows[0].revision,2);const rows=(await db.query('select data from public.freeter_workspaces')).rows;assert.equal(rows.length,1);assert.equal(rows[0].data.workMemo,'Owner updated');await assert.rejects(save(emptyState(),1),/FREETER_CONFLICT/);});
 });
 await test('소유자 DB: 미확인 이메일·Google 연동 없는 계정은 거절',async()=>{
  await db.query('update auth.users set email_confirmed_at=null where id=$1',[alice]);await as('authenticated',alice,async()=>assert.equal((await db.query('select * from public.freeter_workspaces')).rows.length,0));
  await db.query('update auth.users set email_confirmed_at=now() where id=$1',[alice]);await db.query('delete from auth.identities where user_id=$1',[alice]);await as('authenticated',alice,async()=>await assert.rejects(save(emptyState(),2),/FREETER_ACCOUNT_NOT_ALLOWED/));await db.query("insert into auth.identities values($1,'google')",[alice]);
 });
 await test('소유자 Auth Hooks: 신규 다른 계정·기존 다른 계정의 토큰 발급 차단',async()=>{
  const hook=(name,event)=>db.query(`select public.${name}($1::jsonb) as result`,[JSON.stringify(event)]);
  await as('supabase_auth_admin',null,async()=>{
   for(const [email,provider]of [['other@example.test','google'],[ownerEmail,'email']])assert.equal((await hook('freeter_before_user_created',{user:{email,app_metadata:{provider}}})).rows[0].result.error.http_code,403);
   assert.deepEqual((await hook('freeter_before_user_created',{user:{email:ownerEmail,app_metadata:{provider:'google'}}})).rows[0].result,{});
   const claims={sub:alice,role:'authenticated',email:ownerEmail};assert.deepEqual((await hook('freeter_custom_access_token_hook',{user_id:alice,claims})).rows[0].result,{claims});
   assert.equal((await hook('freeter_custom_access_token_hook',{user_id:bob,claims:{...claims,sub:bob}})).rows[0].result.error.http_code,403);
  });
  await as('authenticated',alice,async()=>{for(const name of ['freeter_before_user_created','freeter_custom_access_token_hook'])await assert.rejects(hook(name,{}),/permission denied/);});
 });
 await test('소유자 DB: 추가 permissive 정책도 restrictive 정책을 우회하지 못함',async()=>{
  await db.exec('create policy extra_read on public.freeter_workspaces for select to authenticated using(true)');
  await as('authenticated',bob,async()=>assert.equal((await db.query('select * from public.freeter_workspaces')).rows.length,0));await db.exec('drop policy extra_read on public.freeter_workspaces');
 });
 await test('소유자 설정: 빈 허용 목록은 차단하고 재적용은 데이터·리비전 보존',async()=>{
  await db.exec('delete from private.freeter_access_config');await as('authenticated',alice,async()=>await assert.rejects(save(emptyState(),2),/FREETER_ACCOUNT_NOT_ALLOWED/));
  await db.query('insert into private.freeter_access_config values(true,$1)',[hash]);await db.exec(base);
  await as('authenticated',bob,async()=>await assert.rejects(save(emptyState(),1),/FREETER_ACCOUNT_NOT_ALLOWED/));
  await db.exec(owner);
  await as('authenticated',alice,async()=>{const rows=(await db.query('select data,revision from public.freeter_workspaces')).rows;assert.equal(rows[0].data.workMemo,'Owner updated');assert.equal(rows[0].revision,2);});
 });
 await test('읽기 전용 연결 진단은 단일 결과로 메타데이터만 반환',async()=>{
  const result=await db.query(await readFile(new URL('../supabase/diagnose-sync.sql',import.meta.url),'utf8'));
  const data=result.rows[0].diagnosis;assert.equal(data.workspace.tableExists,true);assert.equal(data.workspace.saveRpcExists,true);assert.ok(Array.isArray(data.connections));assert.ok(!JSON.stringify(data).includes(ownerEmail));assert.ok(!JSON.stringify(data).includes('Owner updated'));
 });
}finally{await db.close();}
