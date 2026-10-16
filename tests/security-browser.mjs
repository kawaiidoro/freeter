import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { serveSite } from './support/site-server.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const site=await serveSite(),browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();let count=0;
async function check(name,fn){try{await fn();count++;console.log('PASS '+name);}catch(error){console.log('::error title=Freeter security browser::'+(name+': '+error.stack).replace(/%/g,'%25').replace(/\n/g,'%0A'));throw error;}}
try{
 await check('모든 페이지에 스크립트 출처 제한·외부 참조 차단·리퍼러 비공개 적용',async()=>{
  for(const file of ['','schedule.html','calculator.html','records.html','stats.html','notes.html','settings.html','privacy.html','guide.html']){
   await page.goto(new URL(file,site.base).href);await page.locator('main h1').waitFor();const csp=await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
   assert.ok(csp.includes("script-src 'self'"));assert.ok(!csp.includes('unsafe-eval'));assert.ok(!/script-src[^;]*unsafe-inline/.test(csp));assert.ok(csp.includes("object-src 'none'"));assert.ok(csp.includes("base-uri 'none'"));assert.equal(await page.locator('meta[name="referrer"]').getAttribute('content'),'no-referrer');
  }
 });
 await check('인라인 스크립트·eval 실행을 실제 브라우저 CSP가 차단',async()=>{
  await page.goto(site.base);const blocked=await page.evaluate(async()=>{
   const promise=new Promise(resolve=>document.addEventListener('securitypolicyviolation',()=>resolve(true),{once:true}));
   const script=document.createElement('script');script.textContent='globalThis.__injected_script=true';document.body.append(script);await promise;
   let evalBlocked=false;try{new Function('globalThis.__injected_eval=true')();}catch{evalBlocked=true;}
   return{script:globalThis.__injected_script,eval:globalThis.__injected_eval,evalBlocked};
  });assert.deepEqual(blocked,{script:undefined,eval:undefined,evalBlocked:true});
 });
 await check('Quill 취약 HTML 내보내기에서 악성 태그·속성·이벤트 제거',async()=>{
  await page.goto(new URL('notes.html',site.base).href);await page.locator('#work-memo .ql-editor').waitFor();
  const exported=await page.locator('#work-memo').evaluate(node=>{
   const q=Quill.find(node);q.setText('<img src=x onerror="globalThis.__memo_xss=true"> & <script>bad()</script>\n','user');
   q.root.firstElementChild.setAttribute('onclick','globalThis.__memo_xss=true');q.root.firstElementChild.setAttribute('data-evil','"><svg onload=bad()>');
   const html=q.getSemanticHTML();const test=document.createElement('div');test.innerHTML=html;document.body.append(test);
   return{html,tags:test.querySelectorAll('img,script,svg,iframe,[onclick],[onerror]').length,text:test.textContent,ran:globalThis.__memo_xss};
  });assert.equal(exported.tags,0);assert.equal(exported.ran,undefined);assert.ok(exported.html.includes('&lt;img'));assert.ok(!exported.html.includes('data-evil='));assert.ok(exported.text.includes('<img'));
 });
 await check('붙여넣은 HTML에서 이미지·링크·이벤트를 계정 메모로 저장하지 않음',async()=>{
  await page.reload();await page.locator('#work-memo .ql-editor').waitFor();
  const data=await page.locator('#work-memo').evaluate(node=>{const q=Quill.find(node);const delta=q.clipboard.convert({html:'<p><b>안전한 강조</b> <a href="javascript:bad()">링크 글자</a><img src="x" onerror="bad()"></p>'});q.setContents(delta,'user');return{delta:JSON.parse(localStorage.getItem('dangi-alba:data')).workMemoDelta,unsafe:node.querySelectorAll('img,iframe,script,a,[onclick],[onerror]').length};});
  assert.equal(data.unsafe,0);for(const op of data.delta.ops){assert.equal(typeof op.insert,'string');assert.ok(Object.keys(op.attributes||{}).every(key=>['bold','underline','size','color','background'].includes(key)));}
 });
 await check('OAuth 콜백 코드·토큰을 주소와 서비스 워커 캐시에 남기지 않음',async()=>{
  await page.goto(site.base);await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
  await page.goto(site.base+'?code=one_time_private_code&access_token=private_token');await page.locator('main h1').waitFor();assert.equal(new URL(page.url()).search,'');
  const urls=await page.evaluate(async()=>{const all=[];for(const key of await caches.keys())all.push(...(await(await caches.open(key)).keys()).map(r=>r.url));return all;});assert.ok(urls.every(url=>!url.includes('one_time_private_code')&&!url.includes('private_token')&&!url.includes('/auth/v1/')&&!url.includes('/rest/v1/')));
 });
 console.log(`보안 브라우저 시나리오 ${count}개 통과`);
}finally{await browser.close();await site.close();}
