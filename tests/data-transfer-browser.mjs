import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {serveSite} from './support/site-server.mjs';
import {emptyState,generateSchedule,validateState} from '../core.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const site=await serveSite(),browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ko-KR',acceptDownloads:true}),page=await context.newPage(),errors=[];
const output=process.env.TEST_OUTPUT_DIR||'/tmp/freeter-data-transfer';await mkdir(output,{recursive:true});page.on('pageerror',error=>errors.push(error.message));
const go=async path=>{await page.goto(new URL(path,site.base).href);await page.locator('main[data-ready]').waitFor();};
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')));
const data=emptyState();data.workMemo='준비물과 업무\n안전 교육';data.workMemoDelta={ops:[{insert:'준비물과 업무',attributes:{bold:true,color:'#1db954'}},{insert:'\n안전 교육\n'}]};data.applicationCareer='행사 안내 3회';data.applicationTemplate='행사A/곰씨/25/서울/행사 안내';data.workplaces=['행사장'];
data.applications=[{id:'post',title:'행사 지원',body:'준비물 확인',url:'https://example.com/job',createdAt:'2026-10-18T00:00:00.000Z',updatedAt:'2026-10-18T00:00:00.000Z',rejected:true}];
data.records=[{id:'record',date:'2026-10-17',workplace:'=2+2',task:'운영스텝',start:'09:00',end:'18:00',breakMinutes:60,payType:'hourly',rate:12000,extra:0,deduction:0,taxType:'none',taxExempt:0,dueDate:'2026-10-20',note:'신분증',payments:[{date:'2026-10-18',amount:30000}]}];
data.schedule.generatedConfig=structuredClone(data.schedule.config);data.schedule.rows=generateSchedule(data.schedule.config);data.schedule.rows[0].rest=2;
let count=0;async function check(name,fn){await fn();count++;console.log('PASS '+name);}
const upload=async content=>page.locator('#restore-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(typeof content==='string'?content:JSON.stringify(content))});
try{
 await go('settings.html');await page.evaluate(data=>localStorage.setItem('dangi-alba:data',JSON.stringify(data)),data);await page.reload();
 let backup;
 await check('전체 JSON은 서식·지원 자료·교대 배정·입금까지 저장하며 로그인 세션을 포함하지 않는다',async()=>{
  const event=page.waitForEvent('download');await page.locator('[data-action="backup"]').tap();const file=await event;assert.ok(file.suggestedFilename().endsWith('.json'));const path=join(output,'full-backup.json');await file.saveAs(path);backup=JSON.parse(await readFile(path,'utf8'));assert.deepEqual(backup,validateState(structuredClone(data)));assert.ok(!Object.keys(backup).some(key=>/token|session|auth/i.test(key)));assert.deepEqual(await saved(),data);
 });
 await check('복원 취소·손상 파일·잘못된 서식은 현재 기록을 교체하지 않는다',async()=>{
  const incoming=structuredClone(backup);incoming.workMemo='교체할 메모';incoming.workMemoDelta=null;
  const chooserEvent=page.waitForEvent('filechooser');await page.locator('[data-action="restore"]').tap();const chooser=await chooserEvent;await chooser.setFiles({name:'restore.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incoming))});
  await page.locator('#confirm-dialog[open]').waitFor();await page.locator('#confirm-dialog button[value="cancel"]').tap();assert.deepEqual(await saved(),data);
  for(const bad of ['{not json}',{version:999},{...incoming,workMemoDelta:{ops:[{insert:'교체할 메모\n',attributes:{color:'url(javascript:bad())'}}]}}]){await upload(bad);await page.waitForFunction(()=>document.querySelector('#data-transfer-status')?.dataset.error==='true');assert.equal(await page.locator('#confirm-dialog[open]').count(),0);assert.deepEqual(await saved(),data);}
 });
 await check('확인 중 다른 탭의 변경이 있으면 복원을 멈추고 최신 기록을 보존한다',async()=>{
  await upload(backup);await page.locator('#confirm-dialog[open]').waitFor();const other=await context.newPage();await other.goto(site.base);await other.locator('main[data-ready]').waitFor();const latest=structuredClone(data);latest.applicationCareer='다른 탭에서 수정한 최신 경력';
  await other.evaluate(data=>localStorage.setItem('dangi-alba:data',JSON.stringify(data)),latest);await page.waitForFunction(()=>document.querySelector('#confirm-dialog')?.open&&document.querySelector('#data-transfer-status')?.hidden===true);await page.locator('#confirm-yes').tap();await page.waitForFunction(()=>document.querySelector('#data-transfer-status')?.textContent.includes('기록이 변경'));assert.deepEqual(await saved(),latest);await other.close();
 });
 await check('확정한 JSON 복원은 모든 항목을 교체하고 새로고침 뒤에도 그대로 남는다',async()=>{
  await upload(backup);await page.locator('#confirm-dialog[open]').waitFor();await page.locator('#confirm-yes').tap();await page.waitForFunction(()=>document.querySelector('#data-transfer-status')?.textContent.includes('복원했어요'));assert.deepEqual(await saved(),backup);await page.reload();assert.deepEqual(await saved(),backup);
 });
 await check('엑셀용 CSV는 전체 기록·입금액·한글 BOM을 포함하고 수식으로 해석되는 이름을 보호한다',async()=>{
  const event=page.waitForEvent('download');await page.locator('[data-action="records-excel"]').tap();const file=await event;assert.ok(file.suggestedFilename().endsWith('.csv'));const path=join(output,'records.csv');await file.saveAs(path);const bytes=await readFile(path);assert.equal(bytes.subarray(0,3).toString('hex'),'efbbbf');assert.ok(bytes.toString().includes("'=2+2"));assert.ok(bytes.toString().includes('30000'));assert.deepEqual(await saved(),backup);
 });
 await check('시간 제거·가이드 단계·설정 배너 순서·PC 하단 중앙 정렬이 두 테마에서 유지된다',async()=>{
  for(const width of [320,390,768,1024,1440])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:1000});await go('settings.html');if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('#theme-toggle').tap();
   assert.equal(await page.locator('#live-clock,.clock-face,#seconds-toggle').count(),0);assert.ok(await page.locator('#today-label').isVisible());assert.equal(await page.locator('.settings-grid > :last-child').getAttribute('data-coffee-state'),'please');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   const nav=await page.locator('.mobile-nav').isVisible();assert.equal(nav,width<=800);
   if(width>800){const f=await page.locator('.site-footer').boundingBox(),app=await page.locator('.app-shell').boundingBox();assert.ok(Math.abs(f.x+f.width/2-app.x-app.width/2)<1);}
   if(width===390||width===1440)await page.screenshot({path:join(output,`settings-backup-${width}-${theme}.png`),fullPage:true});
   await go('guide.html');assert.equal(await page.locator('.homescreen-banner').count(),0);assert.equal(await page.locator('.guide-howto-steps li').count(),18);assert.ok(await page.locator('.guide-howto-steps p').evaluateAll(nodes=>nodes.every(n=>parseFloat(getComputedStyle(n).fontSize)>=14)));
   await page.locator('[data-guide-jump="notes"]').tap();assert.equal(await page.locator('body').getAttribute('data-page'),'guide');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   if(width===390||width===1440){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:join(output,`guide-readable-${width}-${theme}.png`),fullPage:true});}
   await go('');assert.equal(await page.locator('.app-tile-icon svg').count(),8);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   if(width===390||width===1440)await page.screenshot({path:join(output,`updated-icons-${width}-${theme}.png`)});
  }
 });
 assert.deepEqual(errors,[]);console.log(`백업·복원·화면 브라우저 시나리오 ${count}개 통과`);
}finally{await browser.close();await site.close();}
