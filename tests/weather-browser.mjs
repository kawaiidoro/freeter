import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { serveSite } from './support/site-server.mjs';
const { chromium }=createRequire(import.meta.url)('playwright');
const site=await serveSite(),browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const output=process.env.TEST_OUTPUT_DIR||'/tmp/freeter-weather-tests';await mkdir(output,{recursive:true});
const contexts=[],errors=[];let count=0;
const sample=temperature=>({current_units:{temperature_2m:'°C'},current:{time:'2026-10-17T10:30',temperature_2m:temperature,apparent_temperature:temperature-1,weather_code:0,is_day:1,relative_humidity_2m:64},daily:{time:['2026-10-17'],temperature_2m_max:[temperature+4],temperature_2m_min:[temperature-5],uv_index_max:[4.2],sunrise:['2026-10-17T06:40'],sunset:['2026-10-17T17:52']}});
async function setup(options={}) {
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR',...options});contexts.push(context);
 const control={requests:[],mode:'ok',wait:null};
 await context.route('https://*.open-meteo.com/**',async route=>{
  const request=route.request(),url=new URL(request.url());control.requests.push({url:url.href,headers:request.headers()});
  if(control.wait)await control.wait(url);
  if(control.mode==='offline')return route.abort('internetdisconnected');
  const data=control.mode==='invalid'?{current:{temperature_2m:'<img src=x onerror=bad()>'}}:sample(url.searchParams.get('latitude')==='35.18'?26:21);
  await route.fulfill({status:control.mode==='http'?503:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(control.mode==='ok'&&url.hostname.startsWith('air-quality')?{current:{time:'2026-10-17T10:00',pm10:28,pm2_5:12},current_units:{pm10:'μg/m³',pm2_5:'μg/m³'}}:data)}).catch(error=>{if(!request.failure())throw error;});
 });
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));return{context,page,control};
}
const go=(page,path='')=>page.goto(new URL(path,site.base).href);
const show=page=>page.locator('.header-weather-toggle').click();
const ready=page=>page.locator('.weather-degrees strong').waitFor();
async function check(name,fn){try{await fn();count++;console.log('PASS '+name);}catch(error){console.log('::error title=Freeter weather and input::'+(name+': '+error.stack).replace(/%/g,'%25').replace(/\n/g,'%0A'));throw error;}}
try {
 await check('실제 한글 IME 조합 중에도 안내 문구가 입력 순간 사라지고 비우면 복원',async()=>{
  const{page}=await setup();await go(page,'notes.html');const editor=page.locator('#work-memo .ql-editor');await editor.click();
  assert.notEqual(await editor.evaluate(node=>getComputedStyle(node,'::before').display),'none');
  const cdp=await page.context().newCDPSession(page);await cdp.send('Input.imeSetComposition',{text:'ㅎ',selectionStart:1,selectionEnd:1});
  const composing=await editor.evaluate(node=>({text:node.textContent,blank:node.classList.contains('ql-blank'),display:getComputedStyle(node,'::before').display}));
  assert.equal(composing.text,'ㅎ');assert.equal(composing.blank,true);assert.equal(composing.display,'none');
  await cdp.send('Input.insertText',{text:'한'});await page.waitForFunction(()=>JSON.parse(localStorage.getItem('dangi-alba:data')).workMemo==='한');
  await editor.press('ControlOrMeta+a');await editor.press('Backspace');await page.waitForFunction(()=>getComputedStyle(document.querySelector('#work-memo .ql-editor'),'::before').display!=='none');
  await editor.fill('붙여넣은 업무 설명');assert.equal(await editor.evaluate(node=>getComputedStyle(node,'::before').display),'none');await page.reload();assert.equal(await editor.innerText(),'붙여넣은 업무 설명');
 });
 await check('영문·한글 로고와 상단 날씨는 모든 화면에 표시하고 구석 도우미·자동 날씨 조회는 없음',async()=>{
  const{page,control}=await setup();
  for(const route of ['','schedule.html','calculator.html','records.html','stats.html','notes.html','guide.html','privacy.html','settings.html']){
   await go(page,route);assert.ok(await page.locator('.mobile-brand .freeter-wordmark').isVisible());assert.equal(await page.locator('.mobile-brand .freeter-wordmark').getAttribute('alt'),'FREETER · 프리터');assert.ok(await page.locator('.topbar .header-weather-toggle').isVisible());assert.equal(await page.locator('.gomssi-weather,.gomssi-button,.gomssi-bubble,.gomssi-restore').count(),0);
   if(route==='schedule.html')assert.equal(await page.locator('main h1').innerText(),'교대 근무표');
  }
  assert.equal(control.requests.length,0);assert.equal(await page.locator('.weather-panel').isVisible(),false);
 });
 await check('상단 날씨를 누르면 현재 기온·최저·최고를 표시하고 선택 지역을 정확히 변경',async()=>{
  const{page,control}=await setup();await go(page);await show(page);await ready(page);
  assert.equal(await page.locator('.weather-place').innerText(),'서울');assert.equal(await page.locator('.weather-degrees strong').innerText(),'21');assert.equal(await page.locator('.weather-low').innerText(),'최저 16°');assert.equal(await page.locator('.weather-high').innerText(),'최고 25°');
  for(const [key,value]of [['humidity','64%'],['uv','4.2'],['sunrise','06:40'],['sunset','17:52'],['pm10','28.0 ㎍/㎥'],['pm25','12.0 ㎍/㎥']])assert.equal(await page.locator(`[data-metric="${key}"] strong`).innerText(),value);
  assert.ok((await page.locator('.weather-symbol').evaluate(node=>getComputedStyle(node).backgroundImage)).includes('weather-illustrations.png'));
  await page.locator('#weather-city').selectOption('busan');await page.waitForFunction(()=>document.querySelector('.weather-degrees strong')?.textContent==='26');assert.equal(await page.locator('.weather-place').innerText(),'부산');
  const requests=control.requests.length;await page.locator('.weather-close').click();await show(page);await ready(page);assert.equal(control.requests.length,requests,'A fresh in-memory weather result can be reused');await page.screenshot({path:join(output,'gomssi-weather-mobile.png')});
 });
 await check('내 위치는 클릭 후에만 사용하고 좌표를 줄여 전송하며 계정·브라우저 저장소에 남기지 않음',async()=>{
  const{context,page,control}=await setup({permissions:['geolocation'],geolocation:{latitude:37.566535,longitude:126.9779692}});await go(page,'notes.html');await page.locator('#work-memo .ql-editor').fill('보존해야 할 업무');
  const before=await page.evaluate(()=>JSON.stringify({...localStorage}));await show(page);await ready(page);await page.locator('.weather-locate').click();await page.waitForFunction(()=>document.querySelector('.weather-place')?.textContent==='내 위치 주변');
  const request=control.requests.at(-1),url=new URL(request.url);assert.equal(url.searchParams.get('latitude'),'37.57');assert.equal(url.searchParams.get('longitude'),'126.98');assert.equal(request.headers.authorization,undefined);assert.equal(request.headers.cookie,undefined);assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),before);
  assert.equal((await context.cookies()).length,0);const cached=await page.evaluate(async()=>{const urls=[];for(const name of await caches.keys())urls.push(...(await(await caches.open(name)).keys()).map(request=>request.url));return urls;});assert.ok(cached.every(url=>!url.includes('open-meteo.com')));
 });
 await check('API 오류·오프라인·악성 응답을 안전하게 안내하고 재시도·위치 거부 후 지역 선택으로 복구',async()=>{
  const{page,control}=await setup();
  for(const mode of ['http','offline','invalid']){
   control.mode=mode;await go(page);await show(page);await page.locator('.weather-retry').waitFor();assert.equal(await page.locator('.weather-status').getAttribute('data-error'),'true');assert.equal(await page.locator('.weather-content img').count(),0);
   control.mode='ok';await page.locator('.weather-retry').click();await ready(page);assert.equal(await page.locator('.weather-degrees strong').innerText(),'21');
  }
  await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(_success,failure){failure({code:1});}}}));
  await page.locator('.weather-locate').click();assert.ok((await page.locator('.weather-status').innerText()).includes('허용되지'));await page.locator('#weather-city').selectOption('busan');await page.waitForFunction(()=>document.querySelector('.weather-place')?.textContent==='부산');
 });
 await check('이전 지역의 늦은 응답이 새 지역 날씨를 덮어쓰지 않음',async()=>{
  const{page,control}=await setup();let release;const hold=new Promise(resolve=>{release=resolve;});control.wait=url=>url.searchParams.get('latitude')==='37.57'?hold:undefined;
  await go(page);await show(page);await page.waitForFunction(()=>document.querySelector('.weather-content').getAttribute('aria-busy')==='true');await page.locator('#weather-city').selectOption('busan');await ready(page);release();
  assert.equal(await page.locator('.weather-place').innerText(),'부산');assert.equal(await page.locator('.weather-degrees strong').innerText(),'26');
 });
 await check('320px·작은 높이·다크모드에서도 창이 화면 안에 있고 Escape·동작 줄이기 지원',async()=>{
  const{page}=await setup();await go(page);
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:1440,height:1000}]){
   await page.setViewportSize(viewport);await show(page);await ready(page);const box=await page.locator('.weather-panel').boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width&&box.y+box.height<=viewport.height,JSON.stringify(box));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const button=await page.locator('.header-weather-toggle').boundingBox(),header=await page.locator('.topbar').boundingBox();assert.ok(button.y>=header.y&&button.y+button.height<=header.y+header.height);assert.ok(box.y>=header.y+header.height);
   await page.keyboard.press('Escape');assert.equal(await page.locator('.header-weather-toggle').getAttribute('aria-expanded'),'false');assert.equal(await page.locator('.header-weather-toggle').evaluate(node=>node===document.activeElement),true);
  }
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.gomssi-weather,.gomssi-button,.gomssi-bubble').count(),0);await page.locator('#theme-toggle').click();await show(page);await ready(page);await page.screenshot({path:join(output,'gomssi-weather-desktop-dark.png')});
 });
 assert.deepEqual(errors,[],'Unexpected browser errors');console.log(`날씨·입력 반응 브라우저 시나리오 ${count}개 통과`);
} finally {await browser.close();await site.close();}
