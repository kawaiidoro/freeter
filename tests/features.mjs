import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { emptyState, DEFAULT_SCHEDULE, generateSchedule } from '../core.js';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173/dangi-alba/';
const output=process.env.TEST_OUTPUT_DIR||'/tmp/dangi-alba-feature-tests';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1080},locale:'ko-KR'}),page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const field=(name,root=page)=>root.locator(`[name="${name}"]`),action=name=>page.locator(`[data-action="${name}"]`);
const go=async route=>{await page.goto(new URL(route,base).href);await page.locator('main[data-ready]').waitFor();};
let count=0;async function check(name,fn){await fn();count++;console.log('PASS '+name);}
try{
 await check('이름 입력 안내는 빈 값이며 실제 이름은 다시 눌러도 보존',async()=>{
  await go('schedule.html');await field('person0').focus();assert.equal(await field('person0').inputValue(),'');
  for(const [i,name]of ['가은','민수','서연'].entries())await field('person'+i).fill(name);
  await field('person0').focus();assert.equal(await field('person0').inputValue(),'가은');
 });
 await check('3인 1명씩 식사: 3개 식사 구간에 각각 2명 근무',async()=>{
  await field('lunchMode').selectOption('single');await page.locator('#schedule-form button[type="submit"]').click();
  const rows=page.locator('.schedule-table .lunch-row');assert.equal(await rows.count(),3);
  for(const row of await rows.all()){assert.equal(await row.locator('.shift-badge.lunch').count(),1);assert.equal(await row.locator('.shift-badge.work').count(),2);}
 });
 await check('3인 2명 먼저 식사: 근무 인원 1명·2명으로 구분',async()=>{
  await field('lunchMode').selectOption('pair');await field('lunchFirst').selectOption('1');await page.locator('#schedule-form button[type="submit"]').click();
  const rows=page.locator('.schedule-table .lunch-row');assert.equal(await rows.count(),2);
  assert.equal(await rows.nth(0).locator('.shift-badge.lunch').count(),2);assert.equal(await rows.nth(0).locator('.shift-badge.work').count(),1);
  assert.equal(await rows.nth(1).locator('.shift-badge.work').count(),2);
 });
 await check('2인 맞교대 전환·교대 식사·합계·CSV·PNG 저장',async()=>{
  await page.locator('[name="count"][value="2"]').check();
  assert.equal(await field('person2').isVisible(),false);assert.equal(await field('lunchMode').inputValue(),'single');
  await page.locator('#schedule-form button[type="submit"]').click();assert.equal(await page.locator('.schedule-table thead th').count(),4);
  for(const row of await page.locator('.schedule-table tbody tr').all())assert.equal(await row.locator('.shift-badge.work').count(),1);
  assert.equal(await page.locator('.person-totals>div').count(),2);
  for(const [act,file]of [['schedule-csv','two-person.csv'],['schedule-png','two-person.png']]){
   const pending=page.waitForEvent('download');await action(act).click();await(await pending).saveAs(join(output,file));
  }
  const csv=(await readFile(join(output,'two-person.csv'))).toString();assert.ok(csv.includes('가은'));assert.ok(!csv.includes('서연'));
  await page.reload();assert.equal(await page.locator('[name="count"][value="2"]').isChecked(),true);
 });
 await check('일용근로·프리랜서 선택과 예상 수령액 계산',async()=>{
  await go('calculator.html');await field('payType').selectOption('daily');await field('rate').fill('200000');
  await page.locator('[name="taxType"][value="daily"]').check();assert.ok((await page.locator('.pay-total strong').innerText()).includes('198,520'));
  await page.locator('[name="taxType"][value="freelance"]').check();assert.ok((await page.locator('.pay-total strong').innerText()).includes('193,400'));
  await field('date').fill('2026-10-01');await field('workplace').fill('새 기능 테스트 근무지');await action('save-calculation').click();
 });
 await check('3일 급여·총 실근무시간·일별 세금과 하루치 기록 저장',async()=>{
  const isolated=await browser.newContext({viewport:{width:390,height:844}}),calc=await isolated.newPage();
  calc.on('pageerror',error=>errors.push(error.message));
  const input=name=>calc.locator(`#calculator-form [name="${name}"]`),saved=()=>calc.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')));
  try{
   await calc.goto(new URL('calculator.html',base).href);await calc.locator('main[data-ready]').waitFor();
   await input('start').fill('09:00');await input('end').fill('17:30');await input('days').fill('3');
   assert.equal(await calc.locator('.pay-total strong').innerText(),'₩270,000');
   const actual=label=>calc.locator('.calculation-breakdown>div').filter({has:calc.getByText(label,{exact:true})}).locator('dd');
   assert.equal(await actual('1일 실근무시간').innerText(),'7시간 30분');assert.equal(await actual('총 실근무시간').innerText(),'22시간 30분');
   await calc.reload();await calc.locator('main[data-ready]').waitFor();assert.equal(await input('days').inputValue(),'3');assert.equal(await calc.locator('.pay-total strong').innerText(),'₩270,000');
   await input('payType').selectOption('daily');await input('rate').fill('200000');await calc.locator('[name="taxType"][value="daily"]').check();
   assert.equal(await calc.locator('.pay-total strong').innerText(),'₩595,560');assert.equal(await actual('1일 예상 수령액').innerText(),'198,520원');
   await input('date').fill('2026-10-17');await input('workplace').fill('여러 날 계산');await calc.locator('[data-action="save-calculation"]').click();
   let state=await saved();assert.equal(state.records.length,1);assert.equal(state.records[0].rate,'200000');assert.equal(state.records[0].days,undefined);assert.equal(state.calculator.days,'3');
   await input('days').fill('5');assert.equal(await calc.locator('[data-action="save-calculation"]').isDisabled(),true);assert.equal((await saved()).records.length,1);
   for(const invalid of ['0','1.5','367']){await input('days').fill(invalid);assert.equal(await calc.locator('#calculator-error').isVisible(),true);assert.equal(await calc.locator('[data-action="save-calculation"]').isDisabled(),true);assert.equal((await saved()).calculator.days,'5');}
   await calc.reload();await calc.locator('main[data-ready]').waitFor();assert.equal(await input('days').inputValue(),'5');assert.equal(await calc.locator('#storage-alert').isVisible(),false);state=await saved();assert.equal(state.records.length,1);
  }finally{await isolated.close();}
 });
 await check('기기별 테마는 새 기록 설정·새로고침 후에도 유지하고 메모 입력을 보존',async()=>{
  const isolated=await browser.newContext(),screen=await isolated.newPage();screen.on('pageerror',error=>errors.push(error.message));
  try{
   await screen.goto(new URL('settings.html',base).href);await screen.locator('main[data-ready]').waitFor();
   await screen.locator('[data-action="set-theme"][data-theme="light"]').click();assert.equal(await screen.evaluate(()=>localStorage.getItem('freeter:theme')),'light');
   const incoming=emptyState();incoming.settings.theme='dark';await screen.evaluate(data=>{localStorage.setItem('dangi-alba:data',JSON.stringify(data));dispatchEvent(new StorageEvent('storage',{key:'dangi-alba:data',newValue:JSON.stringify(data)}));},incoming);
   assert.equal(await screen.locator('html').getAttribute('data-theme'),'light');assert.equal(await screen.locator('.theme-option.selected').getAttribute('data-theme'),'light');
   await screen.reload();await screen.locator('main[data-ready]').waitFor();assert.equal(await screen.locator('html').getAttribute('data-theme'),'light');
   await screen.goto(new URL('notes.html',base).href);await screen.locator('#work-memo .ql-editor').fill('테마를 바꿔도 작성 중인 메모');
   await screen.evaluate(()=>{globalThis.beforeThemeEditor=document.querySelector('#work-memo .ql-editor');localStorage.setItem('freeter:theme','dark');dispatchEvent(new StorageEvent('storage',{key:'freeter:theme',newValue:'dark'}));});
   assert.equal(await screen.locator('html').getAttribute('data-theme'),'dark');assert.equal(await screen.evaluate(()=>beforeThemeEditor===document.querySelector('#work-memo .ql-editor')&&document.activeElement===beforeThemeEditor),true);assert.equal(await screen.locator('#work-memo .ql-editor').innerText(),'테마를 바꿔도 작성 중인 메모');
   assert.equal(await screen.locator('meta[name="theme-color"]').getAttribute('content'),'#121212');
   await screen.evaluate(()=>dispatchEvent(new StorageEvent('storage',{key:'freeter:theme',newValue:'<script>'})));assert.equal(await screen.locator('html').getAttribute('data-theme'),'dark');
   await screen.evaluate(()=>localStorage.setItem('dangi-alba:data','original corrupt data'));await screen.reload();await screen.locator('main[data-ready]').waitFor();await screen.locator('#theme-toggle').click();assert.equal(await screen.evaluate(()=>localStorage.getItem('dangi-alba:data')),'original corrupt data');assert.equal(await screen.locator('meta[name="theme-color"]').getAttribute('content'),'#f7f7f7');
  }finally{await isolated.close();}
  const blocked=await browser.newContext();await blocked.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('blocked');};Storage.prototype.setItem=()=>{throw new Error('blocked');};});
  try{const restricted=await blocked.newPage();restricted.on('pageerror',error=>errors.push(error.message));await restricted.goto(new URL('calculator.html',base).href);await restricted.locator('main[data-ready]').waitFor();await restricted.locator('#theme-toggle').click();assert.equal(await restricted.locator('html').getAttribute('data-theme'),'light');}finally{await blocked.close();}
 });
 await check('작은 계산기: 버튼·키보드·소수·잘못된 수식',async()=>{
  await page.locator('#mini-expression').fill('12000 × 8 - 1000');await page.locator('#mini-expression').press('Enter');assert.ok((await page.locator('#mini-answer').innerText()).includes('95,000'));
  await page.locator('[data-action="mini-key"][data-key="C"]').click();
  for(const key of ['2','+','3','='])await page.locator(`[data-action="mini-key"][data-key="${key}"]`).click();
  assert.equal(await page.locator('#mini-expression').inputValue(),'5');
  await page.locator('#mini-expression').fill('1/0');await page.locator('#mini-expression').press('Enter');assert.ok((await page.locator('#mini-answer').innerText()).includes('0으로'));
 });
 await check('지급 완료 버튼: 실제 입금일·잔액 등록, 중복 입금 방지',async()=>{
  await go('records.html');await field('month').fill('2026-10');await action('complete-payment').click();
  const form=page.locator('#complete-payment-form');assert.equal(await field('amount',form).inputValue(),'193400');
  await field('date',form).fill('2026-10-02');await field('amount',form).fill('1000');await form.locator('button[type="submit"]').click();assert.ok(await page.locator('#complete-payment-error').isVisible());
  await field('amount',form).fill('193400');await form.locator('button[type="submit"]').click();assert.equal(await action('complete-payment').count(),0);
  assert.ok((await page.locator('.records-table').innerText()).includes('지급 완료'));assert.ok((await page.locator('.records-table').innerText()).includes('193,400'));
  await page.reload();await field('month').fill('2026-10');assert.equal(await action('complete-payment').count(),0);
  await go('stats.html');await page.locator('#stats-month').fill('2026-10');assert.ok((await page.locator('.stats-summary').innerText()).includes('193,400'));
 });
 const memo='업무 설명: 09:50 담당자에게 연락\n준비물: 신분증 <안전하게 표시>\n<script>throw new Error("memo")</script>';
 await check('업무 메모 자동 저장·새로고침·HTML 안전 출력',async()=>{
  await go('notes.html');await page.locator('#work-memo .ql-editor').fill(memo);await page.reload();assert.equal(await page.locator('#work-memo').evaluate(node=>Quill.find(node).getText().slice(0,-1)),memo);
  assert.equal(await page.locator('.notes-panel script').count(),0);
 });
 await check('설정 변경 후 세금·맞교대·메모 브라우저 저장 유지',async()=>{
  await go('settings.html');assert.equal(await action('backup').count(),1);
  const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')));assert.equal(data.version,3);assert.equal(data.workMemo,memo);assert.equal(data.records[0].taxType,'freelance');assert.equal(data.schedule.generatedConfig.count,2);
  await page.reload();await go('notes.html');assert.equal(await page.locator('#work-memo').evaluate(node=>Quill.find(node).getText().slice(0,-1)),memo);
 });
 await check('새 화면 모바일 320·390·768px 가로 넘침 검사',async()=>{
  for(const width of [320,390,768]){await page.setViewportSize({width,height:900});for(const route of ['calculator.html','schedule.html','records.html','notes.html']){await go(route);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+' '+width);}}
  await page.setViewportSize({width:390,height:844});await go('calculator.html');await page.screenshot({path:join(output,'new-calculator-mobile.png'),fullPage:true});
  await go('schedule.html');await page.screenshot({path:join(output,'new-schedule-mobile.png'),fullPage:true});
 });
 await check('v1 기존 브라우저 데이터 읽기 및 저장 후 보존',async()=>{
  const legacy={...emptyState(),version:1};delete legacy.workMemo;
  legacy.schedule.config={...DEFAULT_SCHEDULE,names:['근무자 A','기존 이름','근무자 C']};for(const key of ['count','lunchMode','lunchMinutes','lunchFirst'])delete legacy.schedule.config[key];
  legacy.schedule.generatedConfig=structuredClone(legacy.schedule.config);legacy.schedule.rows=generateSchedule(legacy.schedule.config);legacy.schedule.rows[0].rest=2;
  legacy.records=[{id:'legacy',date:'2026-10-01',workplace:'기존 기록',task:'',start:'10:00',end:'19:00',breakMinutes:60,payType:'hourly',rate:12000,extra:0,deduction:0,dueDate:'',note:'보존',payments:[{date:'2026-10-02',amount:30000}]}];
  await page.evaluate(data=>localStorage.setItem('dangi-alba:data',JSON.stringify(data)),legacy);await go('records.html');await field('month').fill('2026-10');
  assert.ok((await page.locator('.records-table').innerText()).includes('96,000'));assert.ok((await page.locator('.records-table').innerText()).includes('30,000'));
  await go('schedule.html');assert.equal(await field('person1').inputValue(),'기존 이름');assert.equal(await field('person0').inputValue(),'');
  assert.equal(await page.locator('.rest-select').first().inputValue(),'2');
  await go('notes.html');await page.locator('#work-memo .ql-editor').fill('새 메모');
  const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')));assert.equal(data.version,3);assert.equal(data.records[0].payments[0].amount,30000);
 });
 assert.deepEqual(errors,[]);console.log(`새 기능 브라우저 시나리오 ${count}개 통과`);
}finally{await browser.close();}
