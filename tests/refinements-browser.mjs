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
  for(const width of [1024,1440]){await page.setViewportSize({width,height:1000});await go('');const text=await page.locator('body').innerText();assert.ok(!text.includes('FREETER WORKSPACE')&&!text.includes('나의 워크스페이스'));const rail=await page.locator('.sidebar').boundingBox(),logo=await page.locator('.brand .freeter-wordmark').boundingBox(),mark=await page.locator('.brand > img').boundingBox();assert.ok(logo.x>=rail.x&&logo.x+logo.width<=rail.x+rail.width-15);assert.ok(Math.abs(logo.x+logo.width/2-(rail.x+rail.width/2))<=1,'Wordmark must share the centre of the rail');assert.ok(Math.abs(mark.x+mark.width/2-(logo.x+logo.width/2))<=1,'App icon and wordmark centres must align');assert.ok(mark.y+mark.height<=logo.y);assert.equal(await page.locator('.workspace-heading').count(),0);assert.match(await page.locator('.brand .freeter-wordmark').getAttribute('alt'),/프리터/);}
  await page.screenshot({path:join(output,'centred-korean-logo-desktop.png'),fullPage:true});
 });
 await check('업데이트 문구와 모바일 메모 비우기 확인창의 작은 크기·취소 보존',async()=>{
  await page.setViewportSize({width:390,height:844});await go('guide.html');await page.locator('.updates-trigger').click();assert.equal(await page.getByRole('heading',{name:'받은 급여는 지급 완료',exact:true}).count(),1);await page.locator('[data-action="close-updates"]').click();await go('notes.html');await page.locator('#work-memo .ql-editor').fill('보존할 업무 메모');
  for(const width of [320,390]){await page.setViewportSize({width,height:700});await page.locator('[data-action="clear-memo"]').click();const box=await page.locator('#confirm-dialog').boundingBox();assert.ok(box.width<=width-39&&box.height<=260,JSON.stringify(box));await page.locator('#confirm-dialog button[value="cancel"]').click();assert.equal(await page.locator('#work-memo .ql-editor').innerText(),'보존할 업무 메모');}
  await page.locator('[data-action="clear-memo"]').click();await page.screenshot({path:join(output,'memo-confirm-mobile.png')});await page.locator('#confirm-yes').click();assert.equal(await page.locator('#work-memo .ql-editor').innerText(),'\n');
 });
 await check('이전 근무표와 수동 배정을 보존하고 재생성하면 공평한 점심 복귀 규칙 적용',async()=>{
  const state=emptyState();state.schedule.config={...DEFAULT_SCHEDULE,rulesVersion:1,fair:false,lunchMode:'single'};state.schedule.generatedConfig=structuredClone(state.schedule.config);state.schedule.rows=generateSchedule(state.schedule.config);delete state.schedule.config.rulesVersion;delete state.schedule.generatedConfig.rulesVersion;
  await page.evaluate(data=>localStorage.setItem('dangi-alba:data',JSON.stringify(data)),state);await go('schedule.html');assert.ok((await page.locator('.inline-notice').innerText()).includes('기존 배정을 보존'));assert.equal(await page.locator('[name="fair"]').isChecked(),true);const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')).schedule.rows);assert.deepEqual(before,state.schedule.rows);
  await generate();let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')).schedule);assert.equal(saved.generatedConfig.rulesVersion,4);const slots=saved.rows.filter(row=>row.rest!==null);assert.deepEqual(slots.map(row=>row.rest),slots.map((_,i)=>i%3));const work=scheduleTotals(saved.rows).map(total=>total.work);assert.ok(Math.max(...work)-Math.min(...work)<=1);await page.reload();assert.equal(await page.locator('.inline-notice').count(),0);
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
  const downloads=[];const collect=item=>downloads.push(item);page.on('download',collect);await page.locator('[data-action="schedule-png"]').click();await page.waitForFunction(()=>!document.querySelector('[data-action="schedule-png"]').disabled,{},{timeout:60000});
  const parts=Number((await page.locator('#toast').textContent()).match(/(\d+)장의/)?.[1]||0);assert.ok(parts>1,'Long schedules should be paginated');
  // Browser download events can arrive after the button becomes enabled again.
  if(downloads.length<parts)await new Promise((resolve,reject)=>{const cleanup=()=>{page.off('download',done);clearTimeout(timer);};const done=()=>{if(downloads.length>=parts){cleanup();resolve();}};const timer=setTimeout(()=>{cleanup();reject(new Error(`Expected ${parts} downloads, received ${downloads.length}`));},5000);page.on('download',done);done();});
  page.off('download',collect);assert.equal(downloads.length,parts);
  for(let i=0;i<downloads.length;i++){const path=join(output,`long-schedule-${i+1}.png`);await downloads[i].saveAs(path);const bytes=await readFile(path);assert.ok(bytes.readUInt32BE(20)<16384);}assert.equal(await page.locator('.schedule-export-stage').count(),0);
 });
 await check('곰씨를 숨겼던 기기에서도 상단 날씨가 보이고 구석 캐릭터·말풍선·자동 요청 없음',async()=>{
  await page.clock.install();await go('');await page.evaluate(()=>localStorage.setItem('freeter:gomssi-hidden','true'));let calls=0;await page.route('https://*.open-meteo.com/**',route=>{calls++;return route.abort();});
  for(const path of ['','notes.html','schedule.html']){await go(path);assert.equal(await page.locator('.topbar .header-weather-toggle').isVisible(),true);assert.equal(await page.locator('.gomssi-weather,.gomssi-button,.gomssi-bubble,.gomssi-hide,.gomssi-restore').count(),0);await page.clock.fastForward(28000);}
  assert.equal(calls,0);await page.unroute('https://*.open-meteo.com/**');
 });
 await check('상단 날씨 열기·닫기·화면 이동은 메모와 기기 기록을 바꾸지 않음',async()=>{
  await go('notes.html');await page.locator('#work-memo .ql-editor').fill('날씨를 열어도 보존되는 업무 메모');const before=await page.evaluate(()=>localStorage.getItem('dangi-alba:data'));await page.route('https://*.open-meteo.com/**',route=>route.abort());
  await page.locator('.header-weather-toggle').click();assert.equal(await page.locator('.weather-panel').isVisible(),true);await page.locator('.weather-close').click();assert.equal(await page.locator('.weather-panel').isVisible(),false);assert.equal(await page.locator('.header-weather-toggle').getAttribute('aria-expanded'),'false');assert.equal(await page.evaluate(()=>localStorage.getItem('dangi-alba:data')),before);
  await page.locator('.header-weather-toggle').click();await page.locator('.main-nav [data-page="schedule"]').click();assert.equal(await page.locator('.weather-panel').isVisible(),false);await page.unroute('https://*.open-meteo.com/**');
 });
 await check('시간 표시 없이 자정 날짜 변경, 이전 초 설정 무시와 메모·커서 보존',async()=>{
  await go('notes.html');await page.clock.setSystemTime(new Date('2026-10-17T23:59:50'));await page.clock.pauseAt(new Date('2026-10-17T23:59:58'));await page.clock.runFor(1000);
  assert.equal(await page.locator('#live-clock').count(),0);assert.equal(await page.locator('#seconds-toggle').count(),0);
  await page.locator('#work-memo .ql-editor').fill('시계가 움직여도 보존되는 메모');
  await page.locator('#work-memo .ql-editor').click();const cursor=await page.locator('#work-memo').evaluate(node=>Quill.find(node).getSelection());await page.clock.runFor(2000);
  assert.equal(await page.locator('#live-clock').count(),0);assert.ok((await page.locator('#today-label').innerText()).includes('18일'));assert.equal(await page.locator('#work-memo .ql-editor').innerText(),'시계가 움직여도 보존되는 메모');assert.deepEqual(await page.locator('#work-memo').evaluate(node=>Quill.find(node).getSelection()),cursor);
  await page.evaluate(()=>localStorage.setItem('freeter:clock-seconds','true'));await page.reload();assert.equal(await page.locator('#live-clock').count(),0);assert.equal(await page.locator('#seconds-toggle').count(),0);
 });
 await check('모바일 320px부터 PC까지 날짜·상단 버튼·로고가 겹치지 않음',async()=>{
  for(const width of [320,360,390,430,768,801,1024,1440]){
   await page.setViewportSize({width,height:844});await go('');{
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}px overflow`);
    const clock=await page.locator('.header-clock').boundingBox(),actions=await page.locator('.top-actions').boundingBox(),brand=await page.locator(width<=800?'.mobile-brand':'.breadcrumb').boundingBox();
    assert.ok(clock.x>=0&&clock.x+clock.width<=width);assert.ok(clock.y>=actions.y+actions.height||clock.x+clock.width<=actions.x,`${width}px clock overlaps actions`);assert.ok(brand.x+brand.width<=actions.x,`${width}px brand overlaps actions`);assert.equal(await page.locator('#live-clock').count(),0);const weather=await page.locator('.header-weather-toggle').boundingBox(),date=await page.locator('#today-label').boundingBox();assert.ok(weather.x+weather.width<=date.x,`${width}px weather/date order`);
   }
  }
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:join(output,'clock-and-header-weather-mobile.png'),fullPage:true});
 });
 await check('저장소를 차단해도 상단 날씨와 날짜은 정상 동작',async()=>{
  const restricted=await browser.newContext(),tab=await restricted.newPage();try{
   await tab.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new DOMException('Blocked','SecurityError');};Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError');};});
   await tab.goto(site.base);await tab.locator('main[data-ready]').waitFor();assert.equal(await tab.locator('#seconds-toggle').count(),0);assert.equal(await tab.locator('#live-clock').count(),0);assert.ok(await tab.locator('#today-label').isVisible());await tab.route('https://*.open-meteo.com/**',route=>route.abort());await tab.locator('.header-weather-toggle').click();assert.equal(await tab.locator('.weather-panel').isVisible(),true);await tab.keyboard.press('Escape');assert.equal(await tab.locator('.weather-panel').isVisible(),false);assert.equal(await tab.locator('.gomssi-weather').count(),0);
  }finally{await restricted.close();}
 });
 await check('실제 생성 버튼에서도 1시간 순환 뒤 30분·60분을 10분·20분씩 배정',async()=>{
  for(const [end,minutes]of [['11:30',10],['12:00',20]]){
   const state=emptyState();state.schedule.config={...DEFAULT_SCHEDULE,start:'08:00',end,lunchEnabled:false};await page.evaluate(data=>localStorage.setItem('dangi-alba:data',JSON.stringify(data)),state);await go('schedule.html');await generate();
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data')).schedule);assert.equal(saved.generatedConfig.rulesVersion,4);assert.deepEqual(saved.rows.map(row=>row.end-row.start),[60,60,60,minutes,minutes,minutes]);assert.deepEqual(saved.rows.map(row=>row.rest),[0,1,2,0,1,2]);assert.deepEqual(scheduleTotals(saved.rows).map(t=>t.rest),Array(3).fill(60+minutes));
  }
 });
 await check('새 로고의 버전 주소도 오프라인 재접속에서 정상 표시',async()=>{
  const offline=await browser.newContext(),tab=await offline.newPage();try{
   await tab.goto(site.base);await tab.locator('main[data-ready]').waitFor();await tab.evaluate(()=>navigator.serviceWorker.ready);await tab.waitForFunction(()=>navigator.serviceWorker.controller);await offline.setOffline(true);await tab.reload();await tab.locator('main[data-ready]').waitFor();
   for(const selector of ['.brand > img','.brand .freeter-wordmark','.profile-logo','.profile-wordmark'])assert.equal(await tab.locator(selector).evaluate(image=>image.complete&&image.naturalWidth>0),true,selector);
   const manifestIcons=await tab.evaluate(async()=>{const url=document.querySelector('link[rel="manifest"]').href,manifest=await(await fetch(url)).json();return Promise.all(manifest.icons.map(async icon=>{const response=await fetch(new URL(icon.src,url));return{url:icon.src,ok:response.ok,bytes:(await response.arrayBuffer()).byteLength};}));});assert.equal(manifestIcons.length,3);assert.ok(manifestIcons.every(icon=>icon.ok&&icon.bytes>1000&&new URL(icon.url,'https://freeter.test/').searchParams.has('v')),'Versioned app icons must remain available offline');
  }finally{await offline.close();}
 });
 assert.deepEqual(errors,[]);console.log(`화면·공평 배분·PNG·시계·곰씨 브라우저 시나리오 ${count}개 통과`);
}finally{await browser.close();await site.close();}
