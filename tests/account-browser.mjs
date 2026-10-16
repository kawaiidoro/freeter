// Real Supabase SDK and browser UI against an isolated OAuth/REST fixture.
// No Google account, production session or hosted database is used here.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { serveSite } from './support/site-server.mjs';
import { emptyState } from '../core.js';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const config={url:'https://abcdefghijklmnopqrst.supabase.co',publishableKey:'sb_publishable_isolated_browser_test'},site=await serveSite(config);
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const output=process.env.TEST_OUTPUT_DIR||'/tmp/freeter-account-tests';await mkdir(output,{recursive:true});
const alice='00000000-0000-4000-8000-000000000001',bob='00000000-0000-4000-8000-000000000002';
const server=new Map(),errors=[],contexts=[];let chosenUser=alice,pkceSeen=false,exchangeSeen=false,count=0;
const token=id=>Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,role:'authenticated',aud:'authenticated',iss:config.url+'/auth/v1',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.isolated_test_signature';
const user=id=>({id,aud:'authenticated',role:'authenticated',email:id===alice?'alice@example.test':'<img src=x onerror=bad()>@example.test',app_metadata:{provider:'google',providers:['google']},user_metadata:{},created_at:new Date().toISOString()});
const jsonb=value=>Array.isArray(value)?value.map(jsonb):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,jsonb(item)])):value;
async function context(){
 const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,acceptDownloads:true});contexts.push(c);
 await c.route(config.url+'/**',async route=>{
  const request=route.request(),url=new URL(request.url());const headers={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':request.headers()['access-control-request-headers']||'*','content-type':'application/json'};
  const reply=(data,status=200)=>route.fulfill({status,headers,body:status===204?'':JSON.stringify(data)});
  if(request.method()==='OPTIONS')return reply({});
  if(url.pathname==='/auth/v1/settings')return reply({external:{google:true}});
  if(url.pathname==='/auth/v1/authorize'){
   assert.equal(url.searchParams.get('provider'),'google');assert.equal(url.searchParams.get('code_challenge_method'),'s256');assert.ok(url.searchParams.get('code_challenge')?.length>=40);pkceSeen=true;
   const target=new URL(url.searchParams.get('redirect_to'));assert.equal(target.href,site.base);target.searchParams.set('code','isolated_authorization_code');return route.fulfill({status:302,headers:{location:target.href},body:''});
  }
  if(url.pathname==='/auth/v1/token'){
   const body=request.postDataJSON();assert.equal(body.auth_code,'isolated_authorization_code');assert.ok(body.code_verifier.length>=43);assert.ok(!body.client_secret);exchangeSeen=true;
   return reply({access_token:token(chosenUser),refresh_token:'test_refresh_'+chosenUser,token_type:'bearer',expires_in:3600,user:user(chosenUser)});
  }
  let id;try{id=JSON.parse(Buffer.from((request.headers().authorization||'').split('.')[1]||'','base64url').toString()).sub;}catch{}
  if(!id)return reply({message:'Authentication required'},401);
  if(url.pathname==='/auth/v1/user')return reply(user(id));
  if(url.pathname==='/auth/v1/logout')return reply({},204);
  if(url.pathname==='/rest/v1/freeter_workspaces'){
   assert.equal(url.searchParams.get('user_id'),'eq.'+id);return reply(server.has(id)?[server.get(id)]:[]);
  }
  if(url.pathname==='/rest/v1/rpc/freeter_save_workspace'){
   const data=request.postDataJSON(),prior=server.get(id);
   if((prior?.revision||0)!==data.p_expected_revision||(prior?.generation||1)!==data.p_expected_generation)return reply({code:'40001',message:'FREETER_CONFLICT'},409);
   const row={user_id:id,data:jsonb(data.p_data),revision:(prior?.revision||0)+1,generation:(prior?.generation||1)+(prior&&data.p_reset?1:0),updated_at:new Date().toISOString()};server.set(id,row);return reply([{revision:row.revision,generation:row.generation,updated_at:row.updated_at}]);
  }
  throw Error('Unexpected fixture request: '+url.pathname);
 });return c;
}
const newPage=async c=>{const p=await c.newPage();p.on('pageerror',error=>errors.push(error.message));return p;};
const login=async p=>{await p.locator('.account-top-link').click();await p.locator('#account-dialog [data-action="google-login"]').click();await p.waitForFunction(()=>document.querySelector('.account-top-link')?.dataset.signedIn==='true');};
const closeAccount=async p=>{if(await p.locator('#account-dialog').isVisible())await p.locator('[data-action="close-account"]').click();};
const memo=p=>p.locator('#work-memo').evaluate(node=>Quill.find(node).getText().slice(0,-1));
const waitMemo=async(p,text)=>p.waitForFunction(text=>{const node=document.querySelector('#work-memo');return node&&Quill.find(node).getText().slice(0,-1)===text;},text,{timeout:25000});
async function check(name,fn){try{await fn();count++;console.log('PASS '+name);}catch(error){console.log('::error title=Freeter account browser::'+(name+': '+error.stack).replace(/%/g,'%25').replace(/\n/g,'%0A'));throw error;}}
try{
 const a=await newPage(await context());
 await check('모바일 계정 창과 공식 SDK의 Google PKCE 왕복·콜백 정리',async()=>{
  await a.goto(new URL('notes.html',site.base).href);await a.locator('#work-memo .ql-editor').fill('로그인 전의 소중한 메모');
  await login(a);assert.equal(pkceSeen,true);assert.equal(exchangeSeen,true);assert.equal(new URL(a.url()).searchParams.has('code'),false);assert.equal(server.size,0);
  await a.locator('.account-top-link').click();assert.equal(await a.locator('#account-dialog .account-email').innerText(),'alice@example.test');await a.waitForFunction(()=>document.querySelector('[data-cloud-verified]')?.textContent.startsWith('최근 서버 확인'));await a.screenshot({path:join(output,'google-account-mobile.png')});await closeAccount(a);
 });
 await check('기존 브라우저 기록은 자동 업로드하지 않으며 확인 후 백업하고 가져오기',async()=>{
  const guest=await a.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')));assert.equal(guest.workMemo,'로그인 전의 소중한 메모');await a.locator('.account-top-link').click();await a.locator('[data-action="account-import"]').click();await a.locator('#confirm-dialog button[value="cancel"]').click();assert.equal(server.size,0);
  await a.locator('[data-action="account-import"]').click();const download=a.waitForEvent('download');await a.locator('#confirm-yes').click();assert.ok((await download).suggestedFilename().includes('before-import'));
  await a.waitForFunction(()=>document.querySelector('[data-cloud-status]')?.dataset.status==='synced');assert.equal(server.get(alice).data.workMemo,'로그인 전의 소중한 메모');assert.equal((await a.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')))).workMemo,guest.workMemo);await closeAccount(a);
 });
 const b=await newPage(await context());
 await check('같은 계정의 다른 기기에서 기존 기록과 메모 서식을 자동 동기화',async()=>{
  await b.goto(site.base);await login(b);await b.goto(new URL('notes.html',site.base).href);await waitMemo(b,'로그인 전의 소중한 메모');await a.goto(new URL('notes.html',site.base).href);await waitMemo(a,'로그인 전의 소중한 메모');
  await b.locator('#work-memo .ql-editor').fill('모바일에서 수정한 업무');await b.locator('#work-memo .ql-editor').press('ControlOrMeta+a');await b.locator('[data-action="memo-format-bold"]').click();await b.locator('[data-action="memo-format-underline"]').click();await b.locator('#memo-font-size').selectOption('24px');await b.locator('[data-action="memo-format-highlight"]').click();await waitMemo(a,'모바일에서 수정한 업무');assert.ok(await a.locator('#work-memo strong').isVisible());await a.waitForFunction(()=>document.querySelector('#work-memo [style*="24px"]'));assert.ok(await a.locator('#work-memo u').isVisible());assert.equal(server.get(alice).data.workMemo,'모바일에서 수정한 업무');
 });
 await check('로그아웃 시 계정 캐시를 지우고 로그인 전 메모로 돌아오기',async()=>{
  await a.locator('.account-top-link').click();await a.locator('[data-action="account-logout"]').click();await waitMemo(a,'로그인 전의 소중한 메모');const keys=await a.evaluate(()=>Object.keys(localStorage));assert.ok(keys.every(key=>!key.startsWith('freeter:account:')));assert.equal(server.get(alice).data.workMemo,'모바일에서 수정한 업무');await closeAccount(a);
 });
 await check('다른 Google 계정으로 전환하면 이전 계정 기록이 보이지 않고 이메일도 안전 출력',async()=>{
  server.set(bob,{user_id:bob,data:{...emptyState(),workMemo:'Bob의 개인 기록'},revision:1,generation:1,updated_at:new Date().toISOString()});chosenUser=bob;await login(a);await a.goto(new URL('notes.html',site.base).href);await waitMemo(a,'Bob의 개인 기록');await a.locator('.account-top-link').click();assert.equal(await a.locator('#account-dialog .account-email img').count(),0);assert.ok((await a.locator('.account-email').innerText()).includes('<img'));await closeAccount(a);assert.equal(await memo(b),'모바일에서 수정한 업무');
 });
 await check('다른 탭의 로그아웃은 열린 삭제 확인을 취소하여 계정 사이 자료 삭제 방지',async()=>{
  await a.locator('[data-action="clear-memo"]').click();assert.ok(await a.locator('#confirm-dialog').isVisible());
  const tab=await newPage(a.context());await tab.goto(site.base);await tab.waitForFunction(()=>document.querySelector('.account-top-link')?.dataset.signedIn==='true');await tab.locator('.account-top-link').click();await tab.locator('[data-action="account-logout"]').click();
  await a.waitForFunction(()=>!document.querySelector('#confirm-dialog').open);await waitMemo(a,'로그인 전의 소중한 메모');assert.equal(server.get(bob).data.workMemo,'Bob의 개인 기록');
 });
 assert.deepEqual(errors,[],'Unexpected browser errors');console.log(`계정·동기화 브라우저 시나리오 ${count}개 통과 (격리 OAuth/REST 모사)`);
}finally{await browser.close();await site.close();}
