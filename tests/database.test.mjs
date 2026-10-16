import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { emptyState } from '../core.js';
import { mergeWorkspaces } from '../cloud.js';
const db=new PGlite();
const alice='00000000-0000-4000-8000-000000000001',bob='00000000-0000-4000-8000-000000000002';
await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); grant usage on schema public,auth to anon,authenticated; create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; insert into auth.users values('${alice}'),('${bob}');`);
await db.exec(await readFile(new URL('../supabase/migrations/202610160001_workspaces.sql',import.meta.url),'utf8'));
async function as(role,user,fn){await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub','${user||''}',false);`);try{return await fn();}finally{await db.exec('reset role;');}}
const save=(data,revision=0,generation=1,reset=false)=>db.query('select * from public.freeter_save_workspace($1::jsonb,$2,$3,$4)',[JSON.stringify(data),revision,generation,reset]);
try{
 await test('DB: 익명 사용자의 테이블 읽기·저장 RPC 차단',async()=>{
  await as('anon',null,async()=>{await assert.rejects(db.query('select * from public.freeter_workspaces'),/permission denied/);await assert.rejects(save(emptyState()),/permission denied/);});
 });
 await test('DB: 인증 역할도 JWT 사용자 없이 저장 불가',async()=>{await as('authenticated',null,async()=>await assert.rejects(save(emptyState()),/Authentication required/));});
 await test('DB: 본인 저장만 성공하며 다른 사용자의 행은 숨김',async()=>{
  const data={...emptyState(),workMemo:'Alice private'};const result=await as('authenticated',alice,()=>save(data));assert.equal(result.rows[0].revision,1);assert.equal(result.rows[0].generation,1);
  const other=await as('authenticated',bob,()=>db.query('select * from public.freeter_workspaces'));assert.equal(other.rows.length,0);
  const own=await as('authenticated',alice,()=>db.query('select data from public.freeter_workspaces'));assert.equal(own.rows[0].data.workMemo,'Alice private');
 });
 await test('DB: 로그인 사용자의 직접 INSERT·UPDATE·DELETE 차단',async()=>{
  await as('authenticated',bob,async()=>{
   await assert.rejects(db.query('insert into public.freeter_workspaces(user_id,data) values($1,$2)',[bob,JSON.stringify(emptyState())]),/permission denied/);
   await assert.rejects(db.query('update public.freeter_workspaces set data=$1 where user_id=$2',[JSON.stringify(emptyState()),alice]),/permission denied/);
   await assert.rejects(db.query('delete from public.freeter_workspaces where user_id=$1',[alice]),/permission denied/);
  });
 });
 await test('DB: RPC 본인만 수정·CAS 충돌 시 원본 유지',async()=>{
  await as('authenticated',bob,async()=>{await assert.rejects(save({...emptyState(),workMemo:'overwrite Alice'},1),/FREETER_CONFLICT/);await save({...emptyState(),workMemo:'Bob private'});});
  await as('authenticated',alice,async()=>{await assert.rejects(save(emptyState(),0),/FREETER_CONFLICT/);await save({...emptyState(),workMemo:'Alice updated'},1);await assert.rejects(save(emptyState(),1),/FREETER_CONFLICT/);const own=await db.query('select data,revision from public.freeter_workspaces');assert.equal(own.rows[0].data.workMemo,'Alice updated');assert.equal(own.rows[0].revision,2);});
 });
 await test('DB: 잘못된 JSON·NULL·2MB 초과 저장 거부',async()=>{
  await as('authenticated',alice,async()=>{for(const invalid of [null,{},[],{...emptyState(),records:'bad'},{...emptyState(),workMemo:'x'.repeat(2097153)}])await assert.rejects(save(invalid,2),/constraint|not-null/);});
 });
 await test('DB: 전체 삭제는 세대 갱신·오래된 기기의 저장 거부',async()=>{
  await as('authenticated',alice,async()=>{const saved=await save(emptyState(),2,1,true);assert.equal(saved.rows[0].revision,3);assert.equal(saved.rows[0].generation,2);await assert.rejects(save({...emptyState(),workMemo:'stale'},3,1),/FREETER_CONFLICT/);});
 });
 await test('DB: RLS 강제·고정 search_path·익명 함수 실행 불가',async()=>{
  const table=await db.query("select relrowsecurity,relforcerowsecurity from pg_class where oid='public.freeter_workspaces'::regclass");assert.deepEqual(table.rows[0],{relrowsecurity:true,relforcerowsecurity:true});
  const f=await db.query("select prosecdef,proconfig,has_function_privilege('anon',oid,'execute') as anon_execute from pg_proc where proname='freeter_save_workspace'");assert.equal(f.rows[0].prosecdef,true);assert.equal(f.rows[0].anon_execute,false);assert.ok(f.rows[0].proconfig.some(x=>x==='search_path=""'));
 });
 await test('DB: 마이그레이션 재적용 시 데이터 보존',async()=>{
  await db.exec(await readFile(new URL('../supabase/migrations/202610160001_workspaces.sql',import.meta.url),'utf8'));
  const rows=await as('authenticated',bob,()=>db.query('select data from public.freeter_workspaces'));assert.equal(rows.rows[0].data.workMemo,'Bob private');
 });
 await test('DB: 실제 JSONB 왕복의 서식 속성 순서 변경도 충돌 없이 병합',async()=>{
  const base={...emptyState(),workMemo:'업무 안내',workMemoDelta:{ops:[{insert:'업무 안내',attributes:{underline:true,bold:true,size:'24px',color:'#cc2211',background:'#fff59d'}},{insert:'\n'}]}};
  await as('authenticated',alice,()=>save(base,3,2));const result=await as('authenticated',alice,()=>db.query('select data from public.freeter_workspaces'));const remote=result.rows[0].data;
  assert.notEqual(JSON.stringify(base.workMemoDelta),JSON.stringify(remote.workMemoDelta));const local=structuredClone(base);local.workMemo='수정한 업무';local.workMemoDelta.ops[0].insert='수정한 업무';const merged=mergeWorkspaces(base,local,remote);assert.deepEqual(merged.conflicts,[]);assert.equal(merged.data.workMemo,'수정한 업무');
 });
}finally{await db.close();}
