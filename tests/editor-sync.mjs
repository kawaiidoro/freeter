import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { emptyState } from '../core.js';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173/dangi-alba/';
const output=process.env.TEST_OUTPUT_DIR||'/tmp/freeter-editor-sync-tests';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const contexts=await Promise.all([browser.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']}),browser.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']})]);
const [a,b]=await Promise.all(contexts.map(c=>c.newPage())),errors=[],failures=[];
for(const page of[a,b]){page.on('pageerror',error=>errors.push(error.message));page.on('response',r=>{if(r.status()>=400)failures.push(r.status()+' '+r.url());});}
const go=async(page,route)=>{await page.goto(new URL(route,base).href);await page.locator('main h1').waitFor();};
const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')));
const editor=page=>page.locator('#work-memo .ql-editor');
const memo=page=>page.locator('#work-memo').evaluate(node=>Quill.find(node).getText().slice(0,-1));
const waitState=(page,fn,arg)=>page.waitForFunction(({source,arg})=>(new Function('s','arg',`return (${source})(s,arg)`))(JSON.parse(localStorage.getItem('dangi-alba:data')),arg),{source:fn.toString(),arg});
let count=0;async function check(name,fn){try{await fn();count++;console.log('PASS '+name);}catch(error){const diagnostics=await Promise.all([a,b].map(page=>page.evaluate(()=>({sync:document.querySelector('#sync-status')?.textContent,toast:document.querySelector('#toast')?.textContent})).catch(()=>({}))));console.log('::error title=Freeter browser check::'+(name+': '+JSON.stringify(diagnostics)+' '+error.stack).replace(/%/g,'%25').replace(/\n/g,'%0A').replace(/\r/g,'%0D'));throw error;}}
async function directCheck(name,fn){if(process.env.TEST_SKIP_DIRECT_PEER==='1'){console.log('SKIP '+name+' (managed local browser blocks direct UDP)');return;}await check(name,fn);}
const text='오늘의 업무\n준비물: 안전화, 신분증\n<script>원문 그대로</script>';
try{
 await check('업데이트 내역은 클릭할 때 곰씨와 함께 열리고 모바일에서도 화면 안에 표시',async()=>{
  await go(a,'');assert.equal(await a.locator('#updates-dialog').isVisible(),false);await a.locator('.workspace-updates').click();
  assert.ok(await a.getByRole('heading',{name:'새로운 근무 관리 도구',exact:true}).isVisible());await a.locator('.updates-mascot img').evaluate(node=>node.decode());assert.ok(await a.locator('.updates-mascot img').evaluate(node=>node.complete&&node.naturalWidth>0));
  const size=await a.locator('#updates-dialog').evaluate(node=>[node.clientWidth,node.scrollWidth]);assert.ok(size[1]<=size[0]+1);await a.screenshot({path:join(output,'updates-mobile.png')});
  await a.locator('[data-action="close-updates"]').click();assert.equal(await a.locator('#updates-dialog').isVisible(),false);
  await go(a,'guide.html');assert.equal(await a.getByRole('heading',{name:'새로운 근무 관리 도구',exact:true}).count(),0);await a.locator('.updates-trigger').click();assert.ok(await a.locator('#updates-dialog').isVisible());await a.locator('[data-action="close-updates"]').click();
 });
 await check('선택한 메모에 굵게·밑줄·크기·글자색·형광펜 적용 및 읽기 보기 보존',async()=>{
  await go(a,'notes.html');await editor(a).fill(text);await editor(a).press('ControlOrMeta+a');
  await a.locator('[data-action="memo-format-bold"]').click();await a.locator('[data-action="memo-format-underline"]').click();await a.locator('#memo-font-size').selectOption('24px');
  await a.locator('#memo-font-color').evaluate(node=>{node.value='#cc2211';node.dispatchEvent(new Event('change',{bubbles:true}));});
  await a.locator('[data-action="memo-format-highlight"]').click();
  const data=await state(a);assert.equal(data.workMemo,text);const attrs=data.workMemoDelta.ops.find(op=>op.insert.startsWith('오늘')).attributes;
  assert.deepEqual(attrs,{bold:true,underline:true,size:'24px',color:'#cc2211',background:'#fff59d'});
  await a.locator('[data-action="memo-mode"][data-mode="read"]').click();assert.equal(await a.locator('#memo-reader').textContent(),text);assert.equal(await a.locator('#memo-reader script').count(),0);
  assert.equal(await a.locator('#memo-reader span').first().evaluate(node=>getComputedStyle(node).fontSize),'24px');assert.ok(await a.locator('#memo-format-toolbar').isHidden());
  await a.screenshot({path:join(output,'formatted-memo-mobile.png'),fullPage:true});
 });
 await check('서식 메모의 새로고침·전체 JSON 백업 및 v3 저장',async()=>{
  await a.reload();assert.equal(await memo(a),text);assert.ok((await state(a)).workMemoDelta.ops.some(op=>op.attributes?.bold));
  await a.locator('.app-shell .topbar [data-action="open-sync"]').click();await a.locator('[data-action="close-sync"]').click();
  const data=await state(a);await a.evaluate(()=>history.pushState({},'','settings.html'));await a.reload();
  const pending=a.waitForEvent('download');await a.locator('[data-action="backup"]').click();const path=join(output,'formatted-memo-backup.json');await(await pending).saveAs(path);const backup=JSON.parse(await readFile(path,'utf8'));assert.equal(backup.version,3);assert.deepEqual(backup.workMemoDelta,data.workMemoDelta);
  await a.setViewportSize({width:1440,height:1000});await a.locator('.main-nav [data-page="notes"]').click();
 });
 await directCheck('서버 없이 두 브라우저의 요청·응답 코드로 WebRTC 직접 연결',async()=>{
  const initial={...emptyState(),workMemo:'모바일의 원래 메모'};await go(b,'notes.html');await b.evaluate(data=>localStorage.setItem('dangi-alba:data',JSON.stringify(data)),initial);await b.reload();
  await a.locator('.topbar [data-action="open-sync"]').click();await b.locator('.topbar [data-action="open-sync"]').click();
  await a.locator('[data-action="sync-offer"]').click();await a.waitForFunction(()=>document.querySelector('#sync-local-code').value.startsWith('FRT1.'));const offer=await a.locator('#sync-local-code').inputValue();
  await b.locator('#sync-remote-code').fill(offer);await b.locator('[data-action="sync-accept"]').click();await b.waitForFunction(()=>document.querySelector('#sync-local-code').value.startsWith('FRT1.'));const answer=await b.locator('#sync-local-code').inputValue();
  await a.locator('#sync-remote-code').fill(answer);await a.locator('[data-action="sync-accept"]').click();
  await Promise.all([a.locator('#sync-connected').waitFor(),b.locator('#sync-connected').waitFor()]);assert.equal((await state(b)).workMemo,'모바일의 원래 메모');
 });
 await directCheck('연동 시작 전 교체 확인 취소는 자료를 보존하며 승인 후 연결 전 백업 생성',async()=>{
  await a.locator('[data-action="sync-start"]').click();await b.locator('#confirm-dialog button[value="cancel"]').click();assert.equal((await state(b)).workMemo,'모바일의 원래 메모');
  await a.waitForFunction(()=>!document.querySelector('#sync-start').disabled);await a.locator('[data-action="sync-start"]').click();await b.locator('#confirm-yes').click();
  await waitState(b,s=>s.workMemoDelta?.ops.some(op=>op.attributes?.bold));assert.equal((await state(b)).workMemo,text);
  const backup=await b.evaluate(()=>JSON.parse(localStorage.getItem('freeter:before-peer-sync')));assert.equal(backup.workMemo,'모바일의 원래 메모');
  await a.waitForFunction(()=>document.querySelector('#sync-status').dataset.status==='syncing');
  await a.screenshot({path:join(output,'devices-linked-desktop.png')});
  await a.locator('[data-action="close-sync"]').click();await b.locator('[data-action="close-sync"]').click();
 });
 await directCheck('PC·모바일 사이의 서식 메모와 급여 기록이 양방향으로 자동 반영',async()=>{
  await editor(b).fill('모바일에서 추가한 업무 설명');await editor(b).press('ControlOrMeta+a');await b.locator('#memo-font-size').selectOption('20px');
  await waitState(a,s=>s.workMemo==='모바일에서 추가한 업무 설명'&&s.workMemoDelta.ops.some(op=>op.attributes?.size==='20px'));assert.equal(await memo(a),'모바일에서 추가한 업무 설명');
  await a.locator('.main-nav [data-page="calculator"]').click();await a.locator('[name="date"]').fill('2026-10-16');await a.locator('[name="workplace"]').fill('PC에서 기록한 현장');await a.locator('[data-action="save-calculation"]').click();
  await waitState(b,s=>s.records.some(r=>r.workplace==='PC에서 기록한 현장'));assert.equal((await state(b)).records[0].rate,12000);
  await b.locator('[data-action="memo-format-underline"]').click();await waitState(a,(s,expected)=>JSON.stringify(s.workMemoDelta)===expected,JSON.stringify((await state(b)).workMemoDelta));
 });
 await directCheck('서로 다른 기록의 동시 추가는 양쪽 기록을 모두 보존',async()=>{
  await b.locator('.mobile-nav [data-page="calculator"]').click();
  for(const [page,name] of [[a,'PC 동시 기록'],[b,'모바일 동시 기록']]){await page.locator('[name="date"]').fill('2026-10-16');await page.locator('[name="workplace"]').fill(name);}
  // Calculator inputs are shared too: set the local worksite immediately before each save.
  await Promise.all([[a,'PC 동시 기록'],[b,'모바일 동시 기록']].map(async([page,name])=>{await page.locator('[name="workplace"]').fill(name);await page.locator('[data-action="save-calculation"]').click();}));
  for(const page of[a,b])await waitState(page,s=>s.records.length===3);for(const page of[a,b])assert.deepEqual((await state(page)).records.map(r=>r.workplace).sort(),['PC 동시 기록','PC에서 기록한 현장','모바일 동시 기록'].sort());
 });
 await directCheck('연결 해제 후에는 각 기기 저장을 유지하고 다른 기기에 전송하지 않음',async()=>{
  await b.locator('.topbar [data-action="open-sync"]').click();await b.locator('[data-action="sync-disconnect"]').click();await a.waitForFunction(()=>document.querySelector('.sync-top-link').dataset.connected==='false');
  await b.locator('[data-action="close-sync"]').click();await b.locator('.topbar .notes-top-link').click();await editor(b).fill('연결 해제 후 모바일에만 남는 메모');await a.locator('.main-nav [data-page="notes"]').click();assert.notEqual(await memo(a),'연결 해제 후 모바일에만 남는 메모');
  await b.locator('.topbar [data-action="open-sync"]').click();const previous=await state(b);await b.locator('#sync-remote-code').fill('FRT1.bad');await b.locator('[data-action="sync-accept"]').click();assert.ok((await b.locator('#toast').innerText()).includes('코드'));assert.deepEqual(await state(b),previous);await b.locator('[data-action="close-sync"]').click();
 });
 await check('서식 편집은 오프라인에서도 동작하며 원문·서식을 보존',async()=>{
  await a.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
  await contexts[0].setOffline(true);await go(a,'notes.html');await editor(a).fill('오프라인에서도 서식을 저장');await editor(a).press('ControlOrMeta+a');const before=await a.locator('#work-memo').evaluate(node=>{const q=Quill.find(node);return q.getFormat(0,q.getLength()-1).underline===true;});await a.locator('[data-action="memo-format-underline"]').click();assert.equal((await state(a)).workMemoDelta.ops.some(op=>op.attributes?.underline),!before);await contexts[0].setOffline(false);
 });
 assert.deepEqual(errors,[],'JavaScript errors');assert.deepEqual(failures,[],'HTTP errors');console.log(`서식·업데이트·기기 연동 브라우저 시나리오 ${count}개 통과`);
}finally{await browser.close();}
