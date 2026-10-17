import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {serveSite} from './support/site-server.mjs';
import {emptyState,generateSchedule} from '../core.js';

const {chromium}=createRequire(import.meta.url)('playwright');
const site=await serveSite();
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
const page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const output=process.env.TEST_OUTPUT_DIR||'/tmp/freeter-mobile-layout';await mkdir(output,{recursive:true});
const go=async path=>{await page.goto(new URL(path,site.base).href);await page.locator('main[data-ready]').waitFor();};
let count=0;
async function check(name,fn){await fn();count++;console.log('PASS '+name);}
async function fits(selector){
 const layout=await page.locator(selector).evaluate(node=>{
  const r=node.getBoundingClientRect();
  return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight,overflow:node.scrollWidth>node.clientWidth+1};
 });
 assert.ok(layout.x>=-1&&layout.right<=layout.width+1&&layout.y>=-1&&layout.bottom<=layout.height+1,selector+': '+JSON.stringify(layout));
 assert.equal(layout.overflow,false,selector+' has horizontal overflow');
}
async function dialogFits(selector){
 await fits(selector);
 for(const button of await page.locator(selector+' .dialog-actions > .button').all()){
  await button.scrollIntoViewIfNeeded();const r=await button.boundingBox(),dialog=await page.locator(selector).boundingBox();
  assert.ok(r.x>=dialog.x&&r.x+r.width<=dialog.x+dialog.width+1&&r.y>=0&&r.y+r.height<=page.viewportSize().height+1,selector+' action is clipped');
 }
 await page.keyboard.press('Escape');assert.equal(await page.locator(selector).isVisible(),false);
}
try{
 await go('');const data=emptyState();data.workMemo='취소 후에도 보존할 메모';data.schedule.generatedConfig=structuredClone(data.schedule.config);data.schedule.rows=generateSchedule(data.schedule.config);
 await page.evaluate(data=>localStorage.setItem('dangi-alba:data',JSON.stringify(data)),data);
 await check('320~768px·가로 화면·두 테마의 초기화와 모든 편집·안내 창은 화면 안에 표시',async()=>{
  for(const [width,height]of [[320,700],[390,844],[432,844],[768,900],[640,360]])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height});await go('settings.html');
   if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('#theme-toggle').click();
   await page.locator('[data-action="delete-all"]').click();await fits('#confirm-dialog');
   if(width===390&&theme==='dark')await page.screenshot({path:join(output,'delete-confirm-mobile.png')});
   await dialogFits('#confirm-dialog');
   await go('schedule.html');await page.locator('[data-action="edit-schedule"]').click();await page.locator('[data-action="reset-schedule"]').click();await dialogFits('#confirm-dialog');
   await page.locator('[data-action="adjust-rest"]').click();await dialogFits('#rest-adjust-dialog');
   await go('notes.html');await page.locator('[data-action="clear-memo"]').click();await dialogFits('#confirm-dialog');
   assert.equal(await page.locator('#work-memo .ql-editor').innerText(),data.workMemo);
   await go('records.html');await page.locator('[data-action="add-record"]').first().click();await dialogFits('#record-dialog');
   await go('applications.html');await page.locator('[data-action="new-application"]').click();await dialogFits('#application-dialog');
   await page.locator('.account-top-link').click();await dialogFits('#account-dialog');
   await go('guide.html');await page.locator('.updates-trigger').click();await dialogFits('#updates-dialog');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  }
 });
 await check('메모의 모든 서식 도구가 320px에서도 한 줄에 보이고 밑줄·크기·색은 저장',async()=>{
  for(const width of [320,360,390,432,600]){
   await page.setViewportSize({width,height:844});await go('notes.html');
   assert.equal(await page.locator('[data-action="memo-format-highlight"]').count(),0);
   assert.equal(await page.locator('#memo-background-color').getAttribute('aria-label'),'배경색');
   const controls=await page.locator('.memo-format-button,.memo-size-label,.memo-color-control').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right};}));
   assert.ok(Math.max(...controls.map(r=>r.top))-Math.min(...controls.map(r=>r.top))<=1,JSON.stringify({width,controls}));
   await fits('#memo-format-toolbar');
   if(width===390)await page.screenshot({path:join(output,'memo-tools-mobile.png'),fullPage:true});
  }
  await page.locator('#work-memo .ql-editor').fill('한 줄 도구로 서식 저장');await page.locator('#work-memo .ql-editor').press('ControlOrMeta+a');
  await page.locator('[data-action="memo-format-underline"]').click();await page.locator('#memo-font-size').selectOption('24px');
  await page.locator('#memo-font-color').evaluate(node=>{node.value='#1db954';node.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#memo-background-color').evaluate(node=>{node.value='#ffe885';node.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.reload();const delta=await page.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')).workMemoDelta);
  assert.ok(delta.ops.some(op=>op.attributes?.underline&&op.attributes?.size==='24px'&&op.attributes?.color==='#1db954'&&op.attributes?.background==='#ffe885'));
 });
 await check('모바일 근무 날짜는 하이픈으로 표시되고 달력 연동·날짜 검증·기록 저장 유지',async()=>{
  const mobile=await browser.newContext({isMobile:true,hasTouch:true,locale:'ko-KR',viewport:{width:390,height:844}}),tab=await mobile.newPage();
  tab.on('pageerror',error=>errors.push(error.message));
  try{
   for(const width of [320,390,432,768])for(const theme of ['light','dark']){
    await tab.setViewportSize({width,height:844});await tab.goto(new URL('calculator.html',site.base).href);await tab.locator('main[data-ready]').waitFor();
    if(await tab.locator('html').getAttribute('data-theme')!==theme)await tab.locator('#theme-toggle').click();
    const field=tab.locator('#calculator-form [name="date"]'),box=await field.boundingBox(),grid=await tab.locator('.calculator-basics').boundingBox();
    assert.ok(Math.abs(box.width-grid.width)<=1&&box.width>=200,JSON.stringify({width,box,grid}));
    assert.equal(await tab.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    assert.equal(await field.getAttribute('type'),'text');await field.fill('20261017');assert.equal(await field.inputValue(),'2026-10-17');
    const picker=tab.locator('#calculator-form [data-date-picker]');
    assert.equal(await picker.inputValue(),'2026-10-17');
    await picker.evaluate(node=>{node.value='2026-12-31';node.dispatchEvent(new Event('change',{bubbles:true}));});
    assert.equal(await field.inputValue(),'2026-12-31');
    assert.equal(await tab.locator('#calculator-form [name="workplace"]').getAttribute('placeholder'),'예: 행사장');
    assert.equal(await tab.locator('.mini-calculator h2').innerText(),'계산기');assert.equal(await tab.locator('.mini-calculator .small-badge').count(),0);
    assert.equal(await tab.locator('.mini-key.operator').first().evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(29, 185, 84)');
    assert.equal(await tab.locator('.mini-calculator').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
    assert.deepEqual(await tab.locator('.mobile-nav [data-page]').evaluateAll(nodes=>nodes.map(n=>n.dataset.page)),['home','notes','schedule','calculator']);
    if(width===390){await tab.screenshot({path:join(output,`calculator-date-${theme}.png`),fullPage:true});await tab.locator('.mini-calculator').screenshot({path:join(output,`calculator-device-${theme}.png`)});}
   }
   await tab.goto(new URL('records.html',site.base).href);await tab.locator('main[data-ready]').waitFor();await tab.locator('[data-action="add-record"]').first().click();
   assert.equal(await tab.locator('#record-form [name="task"]').getAttribute('placeholder'),'예: 운영스텝');
   for(const width of [320,390]){
    await tab.setViewportSize({width,height:844});const date=tab.locator('#record-form [name="date"]');
    await date.fill('20261017');assert.equal(await date.inputValue(),'2026-10-17');
    const box=await date.boundingBox(),grid=await tab.locator('#record-form > .form-grid').first().boundingBox();assert.ok(Math.abs(box.width-grid.width)<=1);
    assert.ok(await date.evaluate(node=>node.scrollWidth<=node.clientWidth+1));
   }
   await tab.locator('#record-form [name="date"]').fill('2026-02-30');assert.equal(await tab.locator('#record-form [name="date"]').evaluate(n=>n.checkValidity()),false);
   await tab.locator('#record-form [name="date"]').fill('2026-10-17');await tab.locator('#record-form [name="workplace"]').fill('날짜 형식 테스트 행사장');
   await tab.locator('#record-form button[type="submit"]').click();
   assert.equal(await tab.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')).records[0].date),'2026-10-17');
   await tab.reload();await tab.locator('main[data-ready]').waitFor();assert.ok((await tab.locator('#record-results').innerText()).includes('2026-10-17'));
   await tab.goto(new URL('calculator.html',site.base).href);await tab.locator('main[data-ready]').waitFor();
   const expression=tab.locator('#mini-expression');await expression.fill('9 × 9');await expression.press('Enter');assert.equal(await expression.inputValue(),'81');
   await tab.locator('[data-key="±"]').click();assert.equal(await expression.inputValue(),'-81');
   await tab.locator('[data-key="%"]').click();assert.equal(await expression.inputValue(),'-0.81');
   await tab.locator('[data-key="7"]').click();assert.equal(await expression.inputValue(),'7');
   await tab.locator('[data-key="⌫"]').click();assert.equal(await expression.inputValue(),'');
   await expression.fill('2+(3*4)');await expression.press('Enter');assert.ok((await tab.locator('#mini-answer').innerText()).includes('14'));
   await expression.fill('1/0');await expression.press('Enter');assert.equal(await tab.locator('#mini-answer').getAttribute('data-error'),'true');
   await tab.locator('[data-key="C"]').click();assert.equal(await tab.locator('#mini-answer').innerText(),'0');
  }finally{await mobile.close();}
 });
 await check('새 버전 안내·저장 오류·알림 배너가 모바일 화면 안에서 줄바꿈',async()=>{
  await page.route('**/version.json',route=>route.fulfill({json:{version:'111111111111'}}));
  for(const width of [320,390,768]){
   await page.setViewportSize({width,height:700});await go('notes.html');await page.locator('#app-update-banner').waitFor();await fits('#app-update-banner');
   await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='dangi-alba:data')throw new DOMException('Full','QuotaExceededError');return original.call(this,key,value);};});
   await page.locator('#work-memo .ql-editor').fill('저장 실패 안내도 잘리지 않는지 확인');await fits('#storage-alert');
   // Another tab's update exercises the real, longer status toast.
   await page.evaluate(()=>{const raw=localStorage.getItem('dangi-alba:data');dispatchEvent(new StorageEvent('storage',{key:'dangi-alba:data',newValue:raw}));});await fits('#toast');
  }
 });
 assert.deepEqual(errors,[]);console.log(`모바일 창·도구·배너 시나리오 ${count}개 통과`);
}finally{await browser.close();await site.close();}
