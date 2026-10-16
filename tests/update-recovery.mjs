// Real browser cache upgrade and capability regressions, without changing host policy.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { emptyState } from '../core.js';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=new URL('../',import.meta.url),release=JSON.parse(await readFile(new URL('version.json',root),'utf8')).version;
let legacy=true,advertisedVersion=release;const optionalRequests=[];
const legacyWorker=`const C='dangi-alba-shell-v6';const A=['./site.js','./brand.css'];self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)));self.skipWaiting();});self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(A.some(p=>new URL(p,self.registration.scope).href===e.request.url))e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});`;
const types={html:'text/html',js:'text/javascript',css:'text/css',json:'application/json',png:'image/png',svg:'image/svg+xml',woff2:'font/woff2',webmanifest:'application/manifest+json'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),path=url.pathname.slice(1)||'index.html';
 res.setHeader('Content-Type',types[path.split('.').at(-1)]||'text/plain');
 try{
  if(path==='bootstrap.html')return res.end('<!doctype html><title>Old Freeter</title><body>Old cached client</body>');
  if(path==='version.json')return res.end(JSON.stringify({version:advertisedVersion}));
  if(legacy&&path==='sw.js')return res.end(legacyWorker);
  if(legacy&&path==='site.js'&&!url.search){res.setHeader('Cache-Control','max-age=86400');return res.end('globalThis.__oldRuntimeLoaded=true;');}
  if(legacy&&path==='brand.css'&&!url.search){res.setHeader('Cache-Control','max-age=86400');return res.end('body { background: rgb(230,210,150); }');}
  if(path==='peer.js'||path==='vendor/quill.js'){optionalRequests.push(path);res.statusCode=503;return res.end('Independent script intentionally unavailable');}
  const file=new URL(path,root);if(!file.href.startsWith(root.href)){res.statusCode=403;return res.end();}
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const errors=[];let count=0;
const context=async init=>{const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36'});if(init)await c.addInitScript(init);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));return[c,p];};
const check=async(name,fn)=>{try{await fn();console.log('PASS '+name);count++;}catch(error){console.log('::error title=Freeter update recovery::'+(name+': '+error.stack).replace(/%/g,'%25').replace(/\n/g,'%0A'));throw error;}};
try{
 const[cached,page]=await context();const initial=emptyState();initial.workMemo='지워지면 안 되는 업무 메모';initial.workMemoDelta={ops:[{insert:initial.workMemo,attributes:{bold:true,size:'24px'}},{insert:'\n'}]};
 await check('이전 HTTP·서비스 워커 캐시에서 최신 화면으로 이동해도 기기 연결 버튼과 기록이 정상',async()=>{
  await page.goto(base+'/bootstrap.html');await page.evaluate(async data=>{localStorage.setItem('dangi-alba:data',JSON.stringify(data));await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));},initial);
  await page.evaluate(async()=>{const source=await(await fetch('./site.js')).text();if(!source.includes('__oldRuntimeLoaded'))throw new Error('Legacy cache fixture missing');});legacy=false;
  await page.goto(base+'/?v=recover');await page.locator('.workspace-grid').waitFor();assert.equal(await page.evaluate(()=>globalThis.__oldRuntimeLoaded),undefined);assert.equal(await page.locator('html').getAttribute('data-app-release'),release);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data'))),initial);
  await page.locator('.sync-top-link').tap();await page.locator('#sync-dialog').waitFor();assert.equal(await page.locator('#sync-status').getAttribute('data-status'),'idle');
  assert.equal(await page.locator('#sync-pairing').isVisible(),true);await page.locator('[data-action="close-sync"]').tap();
  assert.deepEqual(optionalRequests,[],'Runtime must not need separately cached Quill/peer scripts');
 });
 await check('이전 캐시 정리 후 버전 쿼리가 있는 주소도 오프라인에서 동작하고 메모 서식 보존',async()=>{
  await page.waitForFunction(async()=>!(await caches.keys()).includes('dangi-alba-shell-v6'));
  await cached.setOffline(true);await page.goto(base+'/notes.html?v=recover');await page.locator('#work-memo .ql-editor').waitFor();assert.ok(await page.locator('#work-memo strong').isVisible());assert.equal(await page.locator('#work-memo').evaluate(node=>Quill.find(node).getText().slice(0,-1)),initial.workMemo);await cached.setOffline(false);
 });
 await check('삼성 인터넷 터치 화면에서 WebRTC가 없어도 연결 창·이유·최신 화면 링크 표시',async()=>{
  const[c,p]=await context(()=>Object.defineProperty(window,'RTCPeerConnection',{value:undefined,configurable:true}));await p.goto(base+'/');await p.locator('.sync-top-link').tap();await p.locator('#sync-dialog').waitFor();assert.equal(await p.locator('#sync-status').getAttribute('data-status'),'unsupported');assert.ok((await p.locator('#sync-status').innerText()).includes('삼성 인터넷'));
  assert.ok(await p.locator('#sync-unavailable').isVisible());assert.equal(await p.locator('#sync-pairing').isVisible(),false);assert.ok((await p.locator('#sync-dialog a').getAttribute('href')).includes('?v='));await c.close();
 });
 await check('randomUUID가 없는 브라우저도 안전한 임의값으로 기기 연결 창 열기',async()=>{
  const[c,p]=await context(()=>Object.defineProperty(crypto,'randomUUID',{value:undefined,configurable:true}));await p.goto(base+'/');await p.locator('.sync-top-link').tap();assert.ok(await p.locator('#sync-dialog').isVisible());assert.equal(await p.locator('#sync-status').getAttribute('data-status'),'idle');
  assert.match(await p.evaluate(()=>new FreeterPeer({}).actor),/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);await c.close();
 });
 await check('저장소가 제한돼도 연결 버튼은 창 안에 원인 표시',async()=>{
  const[c,p]=await context(()=>{Storage.prototype.getItem=()=>{throw new DOMException('Blocked','SecurityError');};});await p.goto(base+'/');await p.locator('.sync-top-link').tap();assert.ok(await p.locator('#sync-dialog').isVisible());assert.ok((await p.locator('#sync-status').innerText()).includes('저장'));await c.close();
 });
 await check('이전 HTML에 연결 창이 빠져 있어도 창을 생성해 버튼 응답',async()=>{
  const[c,p]=await context();await p.goto(base+'/');await p.locator('#sync-dialog').evaluate(node=>node.remove());await p.locator('.sync-top-link').tap();assert.ok(await p.locator('#sync-dialog').isVisible());await c.close();
 });
 await check('새 버전 안내는 자동 새로고침 없이 표시하고 저장 데이터를 보존',async()=>{
  advertisedVersion='aaaaaaaaaaaa';const[c,p]=await context();await p.goto(base+'/');await p.locator('#app-update-banner').waitFor();assert.equal(p.url(),base+'/');assert.ok((await p.locator('#app-update-banner a').getAttribute('href')).includes('v=aaaaaaaaaaaa'));
  await p.evaluate(data=>localStorage.setItem('dangi-alba:data',JSON.stringify(data)),initial);advertisedVersion=release;await p.locator('#app-update-banner a').click();await p.locator('.workspace-grid').waitFor();assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('dangi-alba:data'))),initial);await c.close();
 });
 assert.deepEqual(errors,[]);console.log(`업데이트·삼성 인터넷 호환 브라우저 시나리오 ${count}개 통과`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
