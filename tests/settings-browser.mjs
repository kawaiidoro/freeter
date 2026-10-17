import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {serveSite} from './support/site-server.mjs';
import {emptyState} from '../core.js';

const {chromium}=createRequire(import.meta.url)('playwright');
const site=await serveSite(),browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,acceptDownloads:true});
const page=await context.newPage(),errors=[],downloads=[];
page.on('pageerror',e=>errors.push(e.message));page.on('download',file=>downloads.push(file.suggestedFilename()));
const output=process.env.TEST_OUTPUT_DIR||'/tmp/freeter-settings';await mkdir(output,{recursive:true});
const go=async path=>{await page.goto(new URL(path,site.base).href);await page.locator('main[data-ready]').waitFor();};
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')));
let count=0;
async function check(name,fn){await fn();count++;console.log('PASS '+name);}
try{
 await go('settings.html');const data={...emptyState(),workMemo:'설정 변경 후에도 보존할 메모',applicationCareer:'전시회 안내 경력'};
 await page.evaluate(data=>localStorage.setItem('dangi-alba:data',JSON.stringify(data)),data);await page.reload();const before=await state();
 await check('백업·복원·저장 경고와 테마 카드의 저장 건수·버전 안내 제거',async()=>{
  assert.equal(await page.locator('[data-action="backup"],[data-action="raw-backup"],[data-action="restore"],#restore-file').count(),0);
  const text=await page.locator('main').innerText();assert.ok(!text.includes('브라우저 저장, 꼭 알아두세요'));assert.ok(!text.includes('이 브라우저의 알바 기록'));assert.ok(!text.includes('저장 형식 버전'));
  assert.ok(text.includes('브라우저 저장 말고 백업을 따로 원하시면'));assert.ok(text.includes('별도 백업 지원은 카카오톡에서 문의해 주세요.'));
 });
 await check('곰씨 버튼은 카카오톡 문의 링크만 열고 그림 전환·기록 보존·다운로드 없음',async()=>{
  assert.equal(await page.locator('.coffee-banner').getAttribute('data-coffee-state'),'please');
  await page.locator('.coffee-illustration').evaluate(image=>image.decode());
  assert.match(await page.locator('.coffee-illustration').getAttribute('src'),/coffee-please\.png/);
  await page.evaluate(()=>{window.__coffeeOpened=[];window.open=(...args)=>{window.__coffeeOpened.push(args);return null;};});
  await page.locator('[data-action="coffee-gomssi"]').tap();
  assert.deepEqual(await page.evaluate(()=>window.__coffeeOpened),[['https://open.kakao.com/o/sg56FSSi','_blank','noopener,noreferrer']]);
  assert.equal(await page.locator('.coffee-banner').getAttribute('data-coffee-state'),'drive');
  await page.locator('.coffee-illustration').evaluate(image=>image.decode());assert.match(await page.locator('.coffee-illustration').getAttribute('src'),/coffee-drive\.png/);
  assert.equal(await page.locator('.coffee-button').evaluate(node=>node===document.activeElement),true);
  assert.deepEqual(await state(),before);assert.deepEqual(downloads,[]);
  await page.screenshot({path:join(output,'coffee-drive-mobile.png'),fullPage:true});
 });
 await check('320px~PC 두 테마에서 곰씨 배너가 넘치지 않고 글자 대비·이미지 크기 유지',async()=>{
  await page.reload();
  for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:900});await go('settings.html');
   await page.locator(`[data-action="set-theme"][data-theme="${theme}"]`).click();
   await page.locator('.coffee-illustration').evaluate(image=>image.decode());
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   const layout=await page.locator('.coffee-banner').evaluate(node=>{const r=node.getBoundingClientRect(),image=node.querySelector('img').getBoundingClientRect(),button=node.querySelector('.coffee-button').getBoundingClientRect();return{left:r.left,right:r.right,imageWidth:image.width,imageHeight:image.height,buttonLeft:button.left,buttonRight:button.right,background:getComputedStyle(node).backgroundImage,color:getComputedStyle(node.querySelector('.coffee-message')).color};});
   assert.ok(layout.left>=0&&layout.right<=width+1&&layout.buttonLeft>=0&&layout.buttonRight<=width+1,JSON.stringify(layout));
   assert.ok(layout.imageWidth>=160&&layout.imageHeight>=200);assert.ok(layout.background.includes('20, 51, 33'),layout.background);assert.equal(layout.color,'rgb(239, 255, 243)');
   if(width===390||width===1440)await page.screenshot({path:join(output,`coffee-please-${width}-${theme}.png`),fullPage:true});
  }
  await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');assert.deepEqual(await state(),before);
 });
 await check('개인정보 안내에 저장·계정·날씨·카카오톡 링크와 클릭 연출의 범위 반영',async()=>{
  await go('privacy.html');const text=await page.locator('main').innerText();
  for(const copy of ['2026년 10월 17일','Supabase','카카오톡 오픈채팅','버튼 클릭만으로 송금하지 않습니다','별도 백업 기능이 자동 제공되지 않습니다'])assert.ok(text.includes(copy),copy);
  assert.deepEqual(await state(),before);
 });
 await check('오프라인에서도 두 곰씨 그림을 캐시에서 표시',async()=>{
  await go('settings.html');await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
  await context.setOffline(true);await page.reload();await page.locator('main[data-ready]').waitFor();await page.locator('.coffee-illustration').evaluate(image=>image.decode());
  await page.evaluate(()=>{window.open=()=>null;});await page.locator('.coffee-button').click();await page.locator('.coffee-illustration').evaluate(image=>image.decode());
  assert.equal(await page.locator('.coffee-banner').getAttribute('data-coffee-state'),'drive');assert.deepEqual(await state(),before);await context.setOffline(false);
 });
 assert.deepEqual(errors,[]);console.log(`설정·곰씨 후원 브라우저 시나리오 ${count}개 통과`);
}finally{await browser.close();await site.close();}
