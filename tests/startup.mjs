// Startup regression for opaque-origin previews that block JavaScript modules.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = new URL('../', import.meta.url);
const types = { html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', webmanifest: 'application/manifest+json' };
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const restricted = path.startsWith('/preview/');
  const name = (restricted ? path.slice('/preview/'.length) : path.slice(1)) || 'index.html';
  try {
    const file = new URL(name, root);
    if (!file.href.startsWith(root.href)) { response.writeHead(403).end(); return; }
    const bytes = await readFile(file);
    response.setHeader('Content-Type', types[name.split('.').at(-1)] || 'text/plain');
    if (restricted) response.setHeader('Content-Security-Policy', 'sandbox allow-scripts allow-forms allow-modals allow-downloads');
    response.end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const base = `http://127.0.0.1:${server.address().port}`;
  await page.goto(base + '/'); await page.locator('.hero').waitFor();
  assert.equal(await page.title(), '저는 단기알바입니다.');
  console.log('PASS 일반 웹주소 첫 화면 실행');
  await page.goto(base + '/preview/'); await page.locator('.hero').waitFor();
  assert.equal(await page.evaluate(() => globalThis.origin), 'null');
  assert.ok(await page.locator('#storage-alert').isVisible());
  console.log('PASS 모듈·저장소가 제한된 미리보기 첫 화면 실행');
  await page.evaluate(() => {
    history.pushState = () => { throw new DOMException('Preview blocks History API', 'SecurityError'); };
  });
  await page.locator('.main-nav [data-route="calculator"]').click();
  await page.locator('#calculator-form').waitFor();
  assert.ok(page.url().endsWith('#calculator'));
  assert.ok((await page.locator('.pay-total strong').innerText()).includes('96,000'));
  console.log('PASS History API 제한 시 페이지 이동 및 급여 계산');
  await page.locator('.main-nav [data-route="schedule"]').click();
  await page.locator('#schedule-form button[type="submit"]').click();
  assert.ok(await page.locator('.schedule-table').isVisible());
  console.log('PASS 저장소 접근 불가 시 근무표 생성');
  assert.deepEqual(errors, []);
  console.log('PASS 시작·이동·계산 중 브라우저 오류 없음');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
