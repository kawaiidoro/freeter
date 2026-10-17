import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173/dangi-alba/';
const output=process.env.TEST_OUTPUT_DIR||'/tmp/freeter-editor-tests';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});
const a=await context.newPage(),errors=[],failures=[];
for(const page of[a]){page.on('pageerror',error=>errors.push(error.message));page.on('response',r=>{if(r.status()>=400)failures.push(r.status()+' '+r.url());});}
const go=async(page,route)=>{await page.goto(new URL(route,base).href);await page.locator('main[data-ready]').waitFor();};
const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')));
const editor=page=>page.locator('#work-memo .ql-editor');
const memo=page=>page.locator('#work-memo').evaluate(node=>Quill.find(node).getText().slice(0,-1));
let count=0;async function check(name,fn){try{await fn();count++;console.log('PASS '+name);}catch(error){const diagnostics=await Promise.all([a].map(page=>page.evaluate(()=>({toast:document.querySelector('#toast')?.textContent})).catch(()=>({}))));console.log('::error title=Freeter browser check::'+(name+': '+JSON.stringify(diagnostics)+' '+error.stack).replace(/%/g,'%25').replace(/\n/g,'%0A').replace(/\r/g,'%0D'));throw error;}}
const text='오늘의 업무\n준비물: 안전화, 신분증\n<script>원문 그대로</script>';
try{
 await check('업데이트 내역은 사용 가이드에서만 곰씨와 함께 열리고 모바일 화면 안에 표시',async()=>{
  await go(a,'');assert.equal(await a.locator('.updates-top-link,.workspace-updates,[data-action="open-updates"]').count(),0);
  await go(a,'guide.html');assert.equal(await a.locator('#updates-dialog').isVisible(),false);await a.locator('.updates-trigger').click();
  assert.ok(await a.getByRole('heading',{name:'새로운 근무 관리 도구',exact:true}).isVisible());await a.locator('.updates-mascot img').evaluate(node=>node.decode());assert.ok(await a.locator('.updates-mascot img').evaluate(node=>node.complete&&node.naturalWidth>0));
  const size=await a.locator('#updates-dialog').evaluate(node=>[node.clientWidth,node.scrollWidth]);assert.ok(size[1]<=size[0]+1);await a.screenshot({path:join(output,'updates-mobile.png')});
  await a.locator('[data-action="close-updates"]').click();assert.equal(await a.locator('#updates-dialog').isVisible(),false);
  assert.equal(await a.locator('[data-action="open-updates"]').count(),1);
 });
 await check('선택한 메모에 굵게·밑줄·크기·글자색·형광펜 적용 및 즉시 저장',async()=>{
  await go(a,'notes.html');await editor(a).fill(text);await editor(a).press('ControlOrMeta+a');
  await a.locator('[data-action="memo-format-bold"]').click();await a.locator('[data-action="memo-format-underline"]').click();await a.locator('#memo-font-size').selectOption('24px');
  await a.locator('#memo-font-color').evaluate(node=>{node.value='#cc2211';node.dispatchEvent(new Event('change',{bubbles:true}));});
  await a.locator('[data-action="memo-format-highlight"]').click();
  const data=await state(a);assert.equal(data.workMemo,text);const attrs=data.workMemoDelta.ops.find(op=>op.insert.startsWith('오늘')).attributes;
  assert.deepEqual(attrs,{bold:true,underline:true,size:'24px',color:'#cc2211',background:'#a7f3d0'});
  assert.equal(await a.locator('[data-action="memo-mode"],#memo-reader').count(),0);
  await a.locator('[data-action="save-memo"]').click();assert.equal(await memo(a),text);assert.equal(await a.locator('#work-memo script').count(),0);
  assert.equal(await a.locator('[data-action="save-memo"]').getAttribute('data-save-state'),'saved');assert.equal(await a.locator('[data-action="save-memo"]').innerText(),'저장 완료');assert.equal(await a.locator('#toast').isVisible(),false);
  await a.locator('#work-memo').evaluate(node=>{const q=Quill.find(node);q.insertText(q.getLength()-1,'!','user');});assert.equal(await a.locator('[data-action="save-memo"]').getAttribute('data-save-state'),'ready');
  await a.locator('#work-memo').evaluate(node=>{const q=Quill.find(node);q.deleteText(q.getLength()-2,1,'user');});await a.locator('[data-action="save-memo"]').click();
  assert.equal(await a.locator('#work-memo [style*="24px"]').first().evaluate(node=>getComputedStyle(node).fontSize),'24px');assert.ok(await a.locator('#memo-format-toolbar').isVisible());
  await a.screenshot({path:join(output,'formatted-memo-mobile.png'),fullPage:true});
 });
 await check('기기 저장 실패는 완료로 표시하지 않고 재시도 시 원문과 서식 보존',async()=>{
  await a.evaluate(()=>{globalThis.__memoOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='dangi-alba:data')throw new DOMException('Quota exceeded','QuotaExceededError');return globalThis.__memoOriginalSetItem.call(this,key,value);};});
  try{await a.locator('[data-action="save-memo"]').click();assert.equal(await a.locator('[data-action="save-memo"]').getAttribute('data-save-state'),'error');assert.equal(await memo(a),text);assert.equal(await a.locator('#toast').isVisible(),false);}
  finally{await a.evaluate(()=>{Storage.prototype.setItem=globalThis.__memoOriginalSetItem;delete globalThis.__memoOriginalSetItem;});}
  await a.locator('[data-action="save-memo"]').click();assert.equal(await a.locator('[data-action="save-memo"]').getAttribute('data-save-state'),'saved');assert.equal((await state(a)).workMemo,text);
 });
 await check('서식 메모의 새로고침·전체 JSON 백업 및 v3 저장',async()=>{
  await a.reload();assert.equal(await memo(a),text);assert.ok((await state(a)).workMemoDelta.ops.some(op=>op.attributes?.bold));
  const data=await state(a);await a.evaluate(()=>history.pushState({},'','settings.html'));await a.reload();
  const pending=a.waitForEvent('download');await a.locator('[data-action="backup"]').click();const path=join(output,'formatted-memo-backup.json');await(await pending).saveAs(path);const backup=JSON.parse(await readFile(path,'utf8'));assert.equal(backup.version,3);assert.deepEqual(backup.workMemoDelta,data.workMemoDelta);
  await a.setViewportSize({width:1440,height:1000});await a.locator('.main-nav [data-page="notes"]').click();
 });
 await check('서식 편집은 오프라인에서도 동작하며 원문·서식을 보존',async()=>{
  await a.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
  await context.setOffline(true);await go(a,'notes.html');await editor(a).fill('오프라인에서도 서식을 저장');await editor(a).press('ControlOrMeta+a');const before=await a.locator('#work-memo').evaluate(node=>{const q=Quill.find(node);return q.getFormat(0,q.getLength()-1).underline===true;});await a.locator('[data-action="memo-format-underline"]').click();assert.equal((await state(a)).workMemoDelta.ops.some(op=>op.attributes?.underline),!before);await context.setOffline(false);
 });
 assert.deepEqual(errors,[],'JavaScript errors');assert.deepEqual(failures,[],'HTTP errors');console.log(`서식·업데이트 브라우저 시나리오 ${count}개 통과`);
}finally{await browser.close();}
