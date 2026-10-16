import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {serveSite} from './support/site-server.mjs';
import {emptyState,DEFAULT_SCHEDULE,generateSchedule,scheduleTotals} from '../core.js';
const{chromium}=createRequire(import.meta.url)('playwright'),site=await serveSite();
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));const output=process.env.TEST_OUTPUT_DIR||'/tmp/freeter-refinements';await mkdir(output,{recursive:true});let count=0;
const go=async path=>{await page.goto(new URL(path,site.base).href);await page.locator('main[data-ready]').waitFor();};
const generate=async()=>{if(await page.locator('#schedule-settings').getAttribute('open')===null)await page.locator('[data-action="edit-schedule"]').click();await page.locator('#schedule-form button[type="submit"]').click();};
async function check(name,fn){try{await fn();count++;console.log('PASS '+name);}catch(error){console.log('::error title=Freeter refinement::'+(name+': '+error.stack).replace(/%/g,'%25').replace(/\n/g,'%0A'));throw error;}}
try{
 await check('홈의 워크스페이스 제목 제거와 PC 로고의 레일 내부 정렬',async()=>{
  for(const width of [1024,1440]){await page.setViewportSize({width,height:1000});await go('');const text=await page.locator('body').innerText();assert.ok(!text.includes('FREETER WORKSPACE')&&!text.includes('나의 워크스페이스'));const rail=await page.locator('.sidebar').boundingBox(),logo=await page.locator('.brand .freeter-wordmark').boundingBox();assert.ok(logo.x>=rail.x&&logo.x+logo.width<=rail.x+rail.width-15);assert.equal(await page.locator('.workspace-heading').count(),0);}
 });
 await check('업데이트 문구와 모바일 메모 비우기 확인창의 작은 크기·취소 보존',async()=>{
  await page.setViewportSize({width:390,height:844});await go('');await page.locator('.updates-top-link').click();assert.equal(await page.getByRole('heading',{name:'받은 급여는 지급 완료',exact:true}).count(),1);await page.locator('[data-action="close-updates"]').click();await go('notes.html');await page.locator('#work-memo .ql-editor').fill('보존할 업무 메모');
  for(const width of [320,390]){await page.setViewportSize({width,height:700});await page.locator('[data-action="clear-memo"]').click();const box=await page.locator('#confirm-dialog').boundingBox();assert.ok(box.width<=width-39&&box.height<=260,JSON.stringify(box));await page.locator('#confirm-dialog button[value="cancel"]').click();assert.equal(await page.locator('#work-memo .ql-editor').innerText(),'보존할 업무 메모');}
  await page.locator('[data-action="clear-memo"]').click();await page.screenshot({path:join(output,'memo-confirm-mobile.png')});await page.locator('#confirm-yes').click();assert.equal(await page.locator('#work-memo .ql-editor').innerText(),'\n');
 });
 await check('이전 근무표와 수동 배정을 보존하고 재생성하면 공평한 점심 복귀 규칙 적용',async()=>{
  const state=emptyState();state.schedule.config={...DEFAULT_SCHEDULE,rulesVersion:1,fair:false,lunchMode:'single'};state.schedule.generatedConfig=structuredClone(state.schedule.config);state.schedule.rows=generateSchedule(state.schedule.config);delete state.schedule.config.rulesVersion;delete state.schedule.generatedConfig.rulesVersion;
  await page.evaluate(data=>localStorage.setItem('dangi-alba:data',JSON.stringify(data)),state);await go('schedule.html');assert.ok((await page.locator('.inline-notice').innerText()).includes('기존 배정을 보존'));assert.equal(await page.locator('[name="fair"]').isChecked(),true);const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')).schedule.rows);assert.deepEqual(before,state.schedule.rows);
  await generate();let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')).schedule);assert.equal(saved.generatedConfig.rulesVersion,2);const last=saved.rows.findLastIndex(row=>row.rest===null);assert.ok(!saved.rows[last].lunchers.includes(saved.rows[last+1].rest));const work=scheduleTotals(saved.rows).map(total=>total.work);assert.ok(Math.max(...work)-Math.min(...work)<=1);await page.reload();assert.equal(await page.locator('.inline-notice').count(),0);
 });
 await check('모바일·PC·다크모드 PNG의 크기와 근무·휴식·점심 색이 실제 화면과 일치',async()=>{
  for(const [width,dark]of [[1440,false],[390,true]]){
   await page.setViewportSize({width,height:1000});await go('schedule.html');await generate();if((await page.locator('html').getAttribute('data-theme'))!==(dark?'dark':'light'))await page.locator('#theme-toggle').click();
   // Finish finite theme transitions, then sample solid fills away from glyph edges and rounded corners.
   const reference=await page.locator('.schedule-table').screenshot({animations:'disabled'});const geometry=await page.locator('#schedule-result').evaluate(node=>{const r=node.getBoundingClientRect(),t=node.querySelector('table').getBoundingClientRect();return{width:Math.ceil(r.width),samples:['work','rest','lunch'].map(kind=>{const b=node.querySelector('.shift-badge.'+kind).getBoundingClientRect();return{exportX:b.x-r.x+b.width/2,exportY:b.y-r.y+3,referenceX:b.x-t.x+b.width/2,referenceY:b.y-t.y+3};})};});
   if(dark){await page.addStyleTag({content:'.shift-badge { transition-duration: .6s !important; }'});await page.locator('#theme-toggle').click();await page.locator('#schedule-result').evaluate(async node=>Promise.allSettled(node.getAnimations({subtree:true}).map(animation=>animation.finished)));await page.locator('#theme-toggle').click();}
   const pending=page.waitForEvent('download');await page.locator('[data-action="schedule-png"]').click();const download=await pending,path=join(output,`schedule-${width}-${dark?'dark':'light'}.png`);await download.saveAs(path);const bytes=await readFile(path);assert.equal(bytes.readUInt32BE(16),geometry.width*2);
   const comparison=await page.evaluate(async({exported,reference,geometry})=>{const load=src=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.src=src;});const [a,b]=await Promise.all([load(exported),load(reference)]);const pixel=(image,x,y)=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');ctx.drawImage(image,-Math.floor(x),-Math.floor(y));return [...ctx.getImageData(0,0,1,1).data];};return geometry.samples.map(point=>[pixel(a,point.exportX*2,point.exportY*2),pixel(b,point.referenceX,point.referenceY)]);},{exported:'data:image/png;base64,'+bytes.toString('base64'),reference:'data:image/png;base64,'+reference.toString('base64'),geometry});
   for(const [actual,expected]of comparison)assert.ok(actual.slice(0,3).every((value,index)=>Math.abs(value-expected[index])<=8),JSON.stringify({width,dark,actual,expected}));assert.equal(await page.locator('.schedule-export-stage').count(),0);
  }
  await page.setViewportSize({width:1440,height:1000});await go('schedule.html');if(await page.locator('#schedule-settings').getAttribute('open')===null)await page.locator('[data-action="edit-schedule"]').click();await page.locator('[name="interval"]').fill('5');await generate();
  const downloads=[];const collect=item=>downloads.push(item);page.on('download',collect);await page.locator('[data-action="schedule-png"]').click();await page.waitForFunction(()=>!document.querySelector('[data-action="schedule-png"]').disabled,{},{timeout:60000});page.off('download',collect);assert.ok(downloads.length>1,'Long schedules should be paginated');
  for(let i=0;i<downloads.length;i++){const path=join(output,`long-schedule-${i+1}.png`);await downloads[i].saveAs(path);const bytes=await readFile(path);assert.ok(bytes.readUInt32BE(20)<16384);}assert.equal(await page.locator('.schedule-export-stage').count(),0);
 });
 await check('곰씨 말풍선이 주기적으로 바뀌고 메모 입력 중에는 읽던 문구를 유지',async()=>{
  await page.clock.install();await go('');const before=await page.locator('.gomssi-tip').innerText();await page.clock.fastForward(14000);assert.notEqual(await page.locator('.gomssi-tip').innerText(),before);await go('notes.html');await page.locator('#work-memo .ql-editor').click();const reading=await page.locator('.gomssi-tip').innerText();await page.clock.fastForward(28000);assert.equal(await page.locator('.gomssi-tip').innerText(),reading);
 });
 assert.deepEqual(errors,[]);console.log(`화면·공평 배분·PNG 브라우저 시나리오 ${count}개 통과`);
}finally{await browser.close();await site.close();}
