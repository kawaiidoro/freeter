import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {serveSite} from './support/site-server.mjs';
import {emptyState,calculatePay} from '../core.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const site=await serveSite(),browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Seoul',locale:'ko-KR'}),page=await context.newPage(),errors=[];
const output=process.env.TEST_OUTPUT_DIR||'/tmp/freeter-dashboard';await mkdir(output,{recursive:true});
page.on('pageerror',error=>errors.push(error.message));await page.clock.install({time:new Date('2026-10-18T10:00:00+09:00')});
const go=async route=>{await page.goto(new URL(route,site.base).href);await page.locator('main[data-ready]').waitFor();};
const data=emptyState();data.workMemo='출근 전 담당자에게 도착 연락\n준비물: 신분증, 편한 운동화';
const record=(id,date,workplace,changes={})=>({id,date,workplace,start:'09:00',end:'18:00',breakMinutes:60,payType:'hourly',rate:12000,extra:0,deduction:0,taxType:'none',taxExempt:0,task:'운영스텝',dueDate:'2026-10-25',note:'',payments:[],...changes});
data.records=[record('paid','2026-10-17','행사 스태프',{payments:[{date:'2026-10-17',amount:96000}]}),record('unpaid','2026-10-15','물류센터 분류',{payType:'daily',rate:120000,dueDate:'2026-10-16'}),record('next','2026-10-20','다음 행사장')];
let count=0;async function check(name,fn){await fn();count++;console.log('PASS '+name);}
const fits=async selector=>assert.equal(await page.locator(selector).evaluate(node=>node.getBoundingClientRect().left<-.5||node.getBoundingClientRect().right>innerWidth+.5),false,selector);
try{
 await check('빈 기록에서 요약은 0원과 일정 등록을 표시하고 기록 추가 창을 연다',async()=>{
  await go('');assert.equal(await page.locator('.overview-income .overview-value').textContent(),'0원');assert.equal(await page.locator('.overview-next .overview-date').innerText(),'일정 등록');
  await page.locator('.overview-next').click();await page.locator('#record-dialog[open]').waitFor();await page.keyboard.press('Escape');
 });
 await page.evaluate(data=>localStorage.setItem('dangi-alba:data',JSON.stringify(data)),data);await go('');
 await check('월 급여·입금을 반영한 미수령액·실제 다음 근무를 표시하고 기록 수정 즉시 갱신',async()=>{
  assert.equal(await page.locator('.overview-income .overview-value').textContent(),'312,000원');assert.equal(await page.locator('.overview-outstanding .overview-value').textContent(),'216,000원');
  assert.ok((await page.locator('.overview-next .overview-date').innerText()).includes('10월 20일'));assert.equal(await page.locator('.overview-hours').innerText(),'09:00–18:00');assert.equal(await page.locator('.overview-place').innerText(),'다음 행사장');
  await page.locator('.overview-next').click();assert.equal(await page.locator('#record-form [name="date"]').inputValue(),'2026-10-20');
  await page.locator('#record-form [name="workplace"]').fill('수정한 다음 행사장');await page.locator('#record-form button[type="submit"]').click();assert.equal(await page.locator('.overview-place').innerText(),'수정한 다음 행사장');
  await page.reload();await page.locator('main[data-ready]').waitFor();assert.equal(await page.locator('.overview-place').innerText(),'수정한 다음 행사장');
  await page.locator('.overview-income').click();assert.equal(await page.locator('body').getAttribute('data-page'),'stats');
  await page.locator('#stats-month').fill('2026-09');await page.locator('.mobile-nav [data-page="home"]').click();await page.locator('.overview-income').click();assert.equal(await page.locator('#stats-month').inputValue(),'2026-10');
  await page.locator('.mobile-nav [data-page="home"]').click();await page.locator('.overview-outstanding').click();assert.equal(await page.locator('body').getAttribute('data-page'),'records');
  await page.locator('#record-filters [name="month"]').fill('2026-09');await page.locator('#record-filters [name="status"]').selectOption('paid');
  await page.locator('.mobile-nav [data-page="home"]').click();await page.locator('.overview-outstanding').click();assert.equal(await page.locator('#record-filters [name="month"]').inputValue(),'2026-10');assert.equal(await page.locator('#record-filters [name="status"]').inputValue(),'');
 });
 const baseline=await page.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')));
 await check('320px~PC 두 테마에서 배너 그라데이션 유지·요약 우선·아이콘 중앙 정렬·가로 넘침 없음',async()=>{
  for(const width of [320,360,390,480,768,1024,1440])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:1000});await go('');if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('#theme-toggle').click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${width} ${theme}`);
   for(const selector of ['.profile-widget','.dashboard-overview','.launcher-widget','.records-widget','.memo-widget'])await fits(selector);
   const banner=await page.locator('.profile-widget').boundingBox(),summary=await page.locator('.dashboard-overview').boundingBox(),launcher=await page.locator('.launcher-widget').boundingBox(),recent=await page.locator('.records-widget').boundingBox();
   assert.ok(banner.height<=180);assert.ok(launcher.y>=Math.max(banner.y+banner.height,summary.y+summary.height)+10);assert.ok(recent.y>=launcher.y+launcher.height+10);if(width<=1200)assert.ok(summary.y>=banner.y+banner.height+10);
   const background=await page.locator('.profile-widget').evaluate(node=>getComputedStyle(node).backgroundImage);assert.equal(background,'linear-gradient(145deg, rgb(29, 185, 84) -5%, rgb(20, 120, 60) 28%, rgb(11, 48, 32) 55%, rgb(6, 9, 8) 100%)');
   const tiles=page.locator('.app-tile-icon');assert.equal(await tiles.count(),8);assert.equal(await tiles.evaluateAll(nodes=>nodes.every(node=>{const b=node.getBoundingClientRect(),a=node.closest('a').getBoundingClientRect();return Math.abs(b.x+b.width/2-a.x-a.width/2)<1&&node.querySelector('svg').getBBox().width>0&&!node.innerHTML.includes('undefined');})),true);
   if(width<=480)assert.equal(await page.locator('.recent-row:visible').count(),2);
   assert.equal(await page.locator('.dashboard-stat').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth+1)),true);
   if([320,390,1440].includes(width))await page.screenshot({path:join(output,`dashboard-${width}-${theme}.png`),fullPage:true});
  }
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')));assert.deepEqual(after.records,baseline.records);assert.equal(after.workMemo,baseline.workMemo);
 });
 await check('가이드는 홈 화면 배너 없이 짧은 단계와 기능별 바로가기를 제공한다',async()=>{
  for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:1000});await go('guide.html');if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('#theme-toggle').click();
   assert.equal(await page.locator('.homescreen-banner').count(),0);assert.equal(await page.locator('.guide-howto').count(),6);assert.equal(await page.locator('.guide-howto-steps li').count(),18);await fits('.guide-howto-grid');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   if(width===390||width===1440)await page.screenshot({path:join(output,`guide-top-${width}-${theme}.png`),fullPage:true});
  }
 });
 await check('긴 근무지와 큰 금액도 모바일에서 넘치지 않고 모든 도구로 이동할 수 있다',async()=>{
  const large=structuredClone(baseline);for(const r of large.records){r.workplace='아주 긴 행사장과 담당 업무 '.repeat(4);r.payType='daily';r.rate=1000000000;}
  await page.evaluate(data=>localStorage.setItem('dangi-alba:data',JSON.stringify(data)),large);await page.setViewportSize({width:320,height:844});await go('');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(await page.locator('.overview-income .overview-value').textContent(),'3,000,000,000원');
  for(const route of ['applications','notes','schedule','calculator','records','stats','settings','guide']){await go('');await page.locator(`.app-launcher [data-route="${route}"]`).click();assert.equal(await page.locator('body').getAttribute('data-page'),route);}
  assert.equal(calculatePay(large.records[0]).expected,1000000000);
 });
 assert.deepEqual(errors,[]);console.log(`대시보드·가이드 브라우저 시나리오 ${count}개 통과`);
}finally{await browser.close();await site.close();}
