import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { emptyState, generateSchedule } from '../core.js';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173/dangi-alba/';
const output=process.env.TEST_OUTPUT_DIR||'/tmp/freeter-brand-tests';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR'}),page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const go=async route=>{await page.goto(new URL(route,base).href);await page.locator('main h1').waitFor();};
let count=0;async function check(name,fn){await fn();count++;console.log('PASS '+name);}
try{
 await check('모든 페이지 Freeter 이름·푸터 슬로건 제거·정적 공유 메타데이터',async()=>{
  for(const route of ['','schedule.html','calculator.html','records.html','stats.html','notes.html','guide.html','privacy.html','settings.html']){
   await go(route);assert.ok((await page.title()).includes('Freeter'));assert.equal(await page.locator('meta[property="og:site_name"]').getAttribute('content'),'Freeter');
   const footer=await page.locator('.site-footer').innerText();assert.ok(!footer.includes('오늘의 수고가'));assert.ok(!footer.includes('언제나 무료'));assert.equal(await page.locator('.sidebar-foot,.bottom-note').count(),0);
   const response=await context.request.get(new URL(route,base).href),html=await response.text();assert.equal(response.status(),200);assert.ok(html.includes('property="og:image"'));assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));assert.ok(!html.includes('저는 단기알바입니다.'));
   assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://kawaiidoro.github.io/freeter/'+route);
   for(const selector of ['meta[property="og:url"]','meta[property="og:image"]','meta[name="twitter:image"]'])assert.ok((await page.locator(selector).getAttribute('content')).startsWith('https://kawaiidoro.github.io/freeter/'));
   assert.ok(!html.includes('https://kawaiidoro.github.io/dangi-alba/'));
  }
 });
 await check('공유 PNG·앱 아이콘·브랜드 폰트가 실제 파일로 응답',async()=>{
  const response=await context.request.get(new URL('assets/freeter-share.png',base).href);assert.equal(response.status(),200);const bytes=await response.body();assert.equal(bytes.subarray(1,4).toString(),'PNG');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);assert.ok(width>=1200);assert.ok(width/height>1.8&&width/height<2.0);
  assert.equal(Number(await page.locator('meta[property="og:image:width"]').getAttribute('content')),width);assert.equal(Number(await page.locator('meta[property="og:image:height"]').getAttribute('content')),height);
  for(const file of ['icon.svg','assets/freeter-logo.svg','assets/freeter-192.png','assets/freeter-512.png','assets/freeter-display.woff2','brand.css'])assert.equal((await context.request.get(new URL(file,base).href)).status(),200,file);
 });
 await check('2인·3인 모든 점심 방식이 모바일 내부 가로 스크롤 없이 표시',async()=>{
  for(const workers of [2,3])for(const lunchMode of ['together','single',...(workers===3?['pair']:[])]){
   const state=emptyState();state.schedule.config={...state.schedule.config,count:workers,names:['가은','민수','서연'],lunchMode};state.schedule.generatedConfig=structuredClone(state.schedule.config);state.schedule.rows=generateSchedule(state.schedule.config);
   await page.evaluate(data=>localStorage.setItem('dangi-alba:data',JSON.stringify(data)),state);
   for(const width of [320,360,390,430,768]){
    await page.setViewportSize({width,height:844});await go('schedule.html');
    const size=await page.locator('.schedule-scroll').evaluate(node=>({client:node.clientWidth,scroll:node.scrollWidth}));assert.ok(size.scroll<=size.client+1,`${workers}명 ${lunchMode} ${width}px`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('#schedule-settings').getAttribute('open'),null);
    assert.equal(await page.locator('.schedule-table thead th:visible').count(),workers+1);
    for(const name of ['가은','민수',...(workers===3?['서연']:[])])assert.ok(await page.locator('.schedule-table thead').getByText(name,{exact:true}).isVisible());
   }
  }
 });
 await check('모바일에서 근무자 칸을 눌러 휴식자 변경·새로고침 보존',async()=>{
  await page.setViewportSize({width:390,height:844});await go('schedule.html');await page.locator('[data-action="choose-rest"][data-row="0"][data-worker="1"]').click();
  assert.equal(await page.locator('[data-action="choose-rest"][data-row="0"][data-worker="1"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')).schedule.rows[0].rest),1);await page.reload();assert.equal(await page.locator('[data-action="choose-rest"][data-row="0"][data-worker="1"]').innerText(),'휴식');
 });
 await check('설정 펼치기·2인 전환·생성 후 결과 우선 및 설정 접기',async()=>{
  await page.locator('[data-action="edit-schedule"]').click();assert.ok(await page.locator('#schedule-settings').getAttribute('open')!==null);
  await page.locator('[name="count"][value="2"]').check();await page.locator('#schedule-form button[type="submit"]').click();assert.equal(await page.locator('#schedule-settings').getAttribute('open'),null);assert.equal(await page.locator('.schedule-table thead th:visible').count(),3);
  const result=await page.locator('#schedule-result').boundingBox(),form=await page.locator('.schedule-layout .form-panel').boundingBox();assert.ok(result.y<form.y);
  await page.locator('#schedule-result').scrollIntoViewIfNeeded();await page.screenshot({path:join(output,'freeter-schedule-mobile.png'),fullPage:true});
 });
 await check('장문 이름도 화면 안에 유지되고 다크모드에서 배정 변경 가능',async()=>{
  await page.locator('[data-action="edit-schedule"]').click();await page.locator('[name="person0"]').fill('이름이아주긴근무자이름을표시해도화면을벗어나지않음');await page.locator('#schedule-form button[type="submit"]').click();
  const size=await page.locator('.schedule-scroll').evaluate(n=>[n.clientWidth,n.scrollWidth]);assert.ok(size[1]<=size[0]+1);
  await page.locator('#theme-toggle').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await page.locator('[data-action="choose-rest"][data-row="0"][data-worker="0"]').click();assert.equal(await page.locator('[data-action="choose-rest"][data-row="0"][data-worker="0"]').innerText(),'휴식');
 });
 await check('페이지 이동 시 공유 제목·주소도 해당 페이지로 갱신',async()=>{
  await page.locator('.mobile-nav [data-page="calculator"]').click();assert.ok((await page.locator('meta[property="og:title"]').getAttribute('content')).includes('급여 계산기'));assert.ok((await page.locator('meta[property="og:url"]').getAttribute('content')).endsWith('/calculator.html'));
 });
 await check('중성 라이트 배경과 위젯·앱 바로가기가 모바일·데스크톱에서 화면 안에 표시',async()=>{
  await page.locator('#theme-toggle').click();
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:1000});await go('');
   const neutral=await page.evaluate(()=>getComputedStyle(document.body).backgroundColor.match(/\d+/g).slice(0,3).map(Number));assert.ok(Math.max(...neutral)-Math.min(...neutral)<=3);assert.ok(Math.min(...neutral)>=240);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('.app-launcher .app-tile:visible').count(),6);
   assert.equal(await page.locator('.home-summary .summary-card').count(),4);assert.ok(await page.locator('.memo-widget').isVisible());
   const logo=page.locator('.profile-logo');assert.ok(await logo.evaluate(node=>node.complete&&node.naturalWidth===512));
  }
  await page.screenshot({path:join(output,'freeter-workspace-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:join(output,'freeter-workspace-mobile.png'),fullPage:true});
  await page.locator('.app-launcher [data-route="notes"]').click();await page.locator('#work-memo').waitFor();
 });
 const readingMemo='09:50 담당자에게 도착 연락\n준비물: 신분증, 편한 운동화\n\n업무 순서\n1. 안전교육을 받은 뒤 작업 시작\n2. 물품 정리와 수량 확인\n<script>throw new Error("unsafe memo")</script>\n'+('긴업무설명을읽을때에도화면밖으로넘어가지않아요'.repeat(12));
 await check('모바일 메모 편집·읽기 전환과 줄바꿈·장문·기존 데이터 보존',async()=>{
  await page.locator('#work-memo .ql-editor').fill(readingMemo);
  for(const width of [320,390,768]){
   await page.setViewportSize({width,height:844});
   const typography=await page.locator('#work-memo .ql-editor').evaluate(node=>({size:parseFloat(getComputedStyle(node).fontSize),height:parseFloat(getComputedStyle(node).lineHeight)}));assert.ok(typography.size>=16);assert.ok(typography.height/typography.size>=1.7);
   await page.locator('[data-action="memo-mode"][data-mode="read"]').click();assert.equal(await page.locator('#memo-reader').textContent(),readingMemo);assert.ok(await page.locator('#memo-reader').isVisible());assert.equal(await page.locator('#memo-reader script').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.locator('[data-action="memo-mode"][data-mode="edit"]').click();assert.equal(await page.locator('#work-memo').evaluate(node=>Quill.find(node).getText().slice(0,-1)),readingMemo);
  }
  await page.setViewportSize({width:390,height:844});await page.reload();assert.equal(await page.locator('#work-memo').evaluate(node=>Quill.find(node).getText().slice(0,-1)),readingMemo);assert.ok((await page.locator('#memo-status').innerText()).includes('자동 저장'));
  await page.screenshot({path:join(output,'freeter-notes-mobile.png'),fullPage:true});
  await page.locator('[data-action="memo-mode"][data-mode="read"]').click();await page.locator('#theme-toggle').click();assert.equal(await page.locator('#memo-reader').textContent(),readingMemo);await page.screenshot({path:join(output,'freeter-notes-reading-dark.png'),fullPage:true});
 });
 await check('읽기 보기에서도 메모 복사·TXT 저장·비우기 취소로 원문 보존',async()=>{
  await context.grantPermissions(['clipboard-read','clipboard-write']);await page.locator('[data-action="copy-memo"]').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),readingMemo);
  const pending=page.waitForEvent('download');await page.locator('[data-action="download-memo"]').click();const file=join(output,'freeter-work-memo.txt');await(await pending).saveAs(file);assert.equal(await readFile(file,'utf8'),readingMemo);
  await page.locator('[data-action="clear-memo"]').click();await page.locator('#confirm-dialog button[value="cancel"]').click();assert.equal(await page.locator('#memo-reader').textContent(),readingMemo);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')).workMemo),readingMemo);
 });
 assert.deepEqual(errors,[]);console.log(`Freeter 브랜드·모바일 브라우저 시나리오 ${count}개 통과`);
}finally{await browser.close();}
