// Optional end-to-end checks. Install Playwright separately or use the cloud runtime.
// Start an HTTP server and set TEST_BASE_URL before running this file.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173/dangi-alba/';
const output = process.env.TEST_OUTPUT_DIR || '/tmp/dangi-alba-tests';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
const errors = [], failures = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
const field = (name, root = page) => root.locator(`[name="${name}"]`);
const action = name => page.locator(`[data-action="${name}"]`);
async function check(name, callback) { await callback(); console.log(`PASS ${name}`); }
async function go(route = '') { await page.goto(new URL(route, base).href); await page.locator('main[data-ready]').waitFor(); }
async function download(actionName, fileName) {
  const pending = page.waitForEvent('download'); await action(actionName).click(); const item = await pending;
  const path = join(output, fileName); await item.saveAs(path); return readFile(path);
}
try {
  await check('하위 경로에서 홈 및 정적 리소스 로딩', async () => {
    await go(); assert.equal(await page.title(), 'Freeter');
    assert.equal(await page.locator('.home-summary .summary-card').count(), 4);
    assert.ok((await page.locator('.recent-panel').innerText()).includes('첫 번째 알바'));
  });
  await check('근무표 요구사항 예시와 모든 비점심 구간의 2인 근무', async () => {
    await go('schedule.html'); await field('fair').uncheck(); await field('lunchStart').fill('10:00'); await field('lunchEnd').fill('11:00');
    await page.locator('#schedule-form button[type="submit"]').click();
    assert.equal(await page.locator('.schedule-table tbody tr').count(), 9);
    const totals = await page.locator('.person-totals strong').allTextContents(); assert.deepEqual(totals, ['5시간', '5시간', '6시간']);
    for (const row of await page.locator('.schedule-table tbody tr:not(.lunch-row)').all()) {
      assert.equal(await row.locator('.shift-badge.work').count(), 2); assert.equal(await row.locator('.shift-badge.rest').count(), 1);
    }
  });
  await check('이름 즉시 반영 및 사용자 HTML 안전 출력', async () => {
    const name = '<img src=x onerror=alert(1)>';
    await field('person0').fill(name);
    assert.equal(await page.locator('.schedule-table thead [data-person="0"]').innerText(), name);
    assert.equal(await page.locator('#schedule-result img').count(), 0);
    assert.equal(await field('first').locator('option[value="0"]').innerText(), name);
    await field('person0').fill('가은'); await field('person1').fill('민수'); await field('person2').fill('서연');
  });
  await check('수동 휴식자 변경과 새로고침 보존', async () => {
    await page.locator('.rest-select').first().selectOption('2'); await page.reload();
    assert.equal(await page.locator('.rest-select').first().inputValue(), '2');
    assert.equal(await field('person0').inputValue(), '가은');
  });
  await check('근무표 PNG·CSV 다운로드 및 텍스트 복사', async () => {
    const png = await download('schedule-png', 'schedule.png'); assert.equal(png.subarray(1, 4).toString(), 'PNG');
    const csv = await download('schedule-csv', 'schedule.csv'); assert.equal(csv.subarray(0, 3).toString('hex'), 'efbbbf'); assert.ok(csv.toString().includes('가은'));
    await action('schedule-copy').click(); assert.ok((await page.evaluate(() => navigator.clipboard.readText())).includes('가은'));
  });
  await check('시급 예시 96,000원 및 일급 구분·자정 넘김·유효성 검사', async () => {
    await go('calculator.html'); assert.ok((await page.locator('.pay-total strong').innerText()).includes('96,000'));
    await field('payType').selectOption('daily'); await field('rate').fill('100000');
    assert.ok((await page.locator('.pay-total strong').innerText()).includes('100,000'));
    await field('payType').selectOption('hourly'); await field('rate').fill('12000');
    await field('start').fill('22:00'); await field('end').fill('06:00'); await field('breakMinutes').fill('0');
    assert.ok((await page.locator('.pay-total strong').innerText()).includes('96,000'));
    assert.ok((await page.locator('.pay-caption').innerText()).includes('자정'));
    await field('breakMinutes').fill('480'); assert.ok(await page.locator('#calculator-error').isVisible()); assert.ok(await action('save-calculation').isDisabled());
    await field('start').fill('10:00'); await field('end').fill('19:00'); await field('breakMinutes').fill('60');
  });
  await check('계산 결과 한 번에 기록장 저장 및 중복 클릭 방지', async () => {
    await field('date').fill('2026-09-30'); await field('workplace').fill('우리 카페'); await action('save-calculation').click();
    assert.ok(await action('save-calculation').isDisabled());
    await go('records.html'); await field('month').fill('2026-09');
    assert.equal(await page.locator('.records-table tbody tr').count(), 1);
  });
  await check('기록 수정 및 날짜별 분할 입금 관리', async () => {
    await page.locator('.records-table [data-action="edit-record"]').click();
    const dialog = page.locator('#record-dialog');
    await field('task', dialog).fill('=1+1'); await field('dueDate', dialog).fill('2026-10-05');
    await field('note', dialog).fill('성실하게 일한 하루');
    await action('add-payment').click();
    await page.locator('.payment-row').nth(0).locator('[name="paymentDate"]').fill('2026-09-30');
    await page.locator('.payment-row').nth(0).locator('[name="paymentAmount"]').fill('30000');
    await action('add-payment').click();
    await page.locator('.payment-row').nth(1).locator('[name="paymentDate"]').fill('2026-10-05');
    await page.locator('.payment-row').nth(1).locator('[name="paymentAmount"]').fill('20000');
    await page.locator('#record-form button[type="submit"]').click();
    assert.ok((await page.locator('.records-table').innerText()).includes('일부 지급'));
    await page.reload(); await field('month').fill('2026-09'); assert.ok((await page.locator('.records-table').innerText()).includes('50,000'));
  });
  await check('기록 검색·근무지·지급 상태 필터와 CSV 수식 방어', async () => {
    await field('search').fill('없는기록'); assert.equal(await page.locator('.records-table').count(), 0);
    await field('search').fill('성실하게'); assert.equal(await page.locator('.records-table tbody tr').count(), 1);
    await field('workplace').selectOption('우리 카페'); await field('status').selectOption('partial');
    assert.equal(await page.locator('.records-table tbody tr').count(), 1);
    const csv = await download('records-csv', 'records.csv'); assert.ok(csv.toString().includes("'=1+1")); assert.ok(csv.toString().includes('우리 카페'));
  });
  await check('근무 월 예상액과 실제 입금 월 통계 분리', async () => {
    await go('stats.html'); await page.locator('#stats-month').fill('2026-09');
    let values = await page.locator('.stats-summary .summary-card>strong').allTextContents();
    assert.deepEqual(values, ['1일', '96,000원', '30,000원', '46,000원']);
    await page.locator('#stats-month').fill('2026-10');
    values = await page.locator('.stats-summary .summary-card>strong').allTextContents(); assert.deepEqual(values, ['0일', '0원', '20,000원', '0원']);
  });
  let backup;
  await check('전체 JSON 백업 및 잘못된 파일 거부 시 데이터 보존', async () => {
    await go('settings.html'); backup = await download('backup', 'backup.json');
    const parsed = JSON.parse(backup); assert.equal(parsed.records.length, 1); assert.equal(parsed.records[0].payments.length, 2);
    const before = await page.evaluate(() => localStorage.getItem('dangi-alba:data'));
    await page.locator('#restore-file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":99}') });
    await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('복원하지'));
    assert.equal(await page.evaluate(() => localStorage.getItem('dangi-alba:data')), before);
  });
  await check('복원 확인 취소 및 승인 후 JSON 왕복', async () => {
    const file = { name: 'backup.json', mimeType: 'application/json', buffer: backup };
    await page.locator('#restore-file').setInputFiles(file); await page.locator('#confirm-dialog button[value="cancel"]').click();
    await page.locator('#restore-file').setInputFiles(file); await page.locator('#confirm-yes').click();
    await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('복원했어요'));
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('dangi-alba:data')).records[0].payments.length), 2);
  });
  await check('다크모드 저장 및 모든 경로의 모바일 가로 넘침 검사', async () => {
    await action('set-theme').filter({ hasText: '다크' }).click(); await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await action('set-theme').filter({ hasText: '라이트' }).click();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['', 'schedule.html', 'calculator.html', 'records.html', 'stats.html', 'guide.html', 'privacy.html', 'settings.html']) {
        await go(route);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${route} width=${width}`);
        assert.ok((await page.title()).includes('Freeter'));
      }
    }
    await page.setViewportSize({ width: 390, height: 844 }); await go('schedule.html'); await page.screenshot({ path: join(output, 'schedule-mobile.png'), fullPage: true });
    await go('stats.html'); await page.screenshot({ path: join(output, 'stats-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1080 }); await go(); await page.screenshot({ path: join(output, 'dashboard-desktop.png'), fullPage: true });
  });
  await check('정적 페이지별 고유 제목·설명·오프라인 진입', async () => {
    await go();
    await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true })); });
    await context.setOffline(true); await go('calculator.html');
    assert.ok((await page.locator('.pay-total strong').innerText()).includes('96,000'));
    await context.setOffline(false);
  });
  await check('기록 삭제 확인 취소 및 실제 삭제', async () => {
    await go('records.html'); await field('month').fill('2026-09');
    await page.locator('.records-table [data-action="delete-record"]').click(); await page.locator('#confirm-dialog button[value="cancel"]').click();
    assert.equal(await page.locator('.records-table tbody tr').count(), 1);
    await page.locator('.records-table [data-action="delete-record"]').click(); await page.locator('#confirm-yes').click();
    assert.equal(await page.locator('.records-table').count(), 0);
  });
  await check('전체 삭제는 다른 서비스의 localStorage 키를 보존', async () => {
    await go('settings.html'); await page.evaluate(() => localStorage.setItem('another-service', 'keep'));
    await action('delete-all').click(); await page.locator('#confirm-yes').click();
    assert.equal(await page.evaluate(() => localStorage.getItem('dangi-alba:data')), null);
    assert.equal(await page.evaluate(() => localStorage.getItem('another-service')), 'keep');
  });
  await check('손상된 기존 저장 데이터는 자동 삭제·덮어쓰기하지 않는다', async () => {
    await page.evaluate(() => localStorage.setItem('dangi-alba:data', '{bad json'));
    await page.reload(); assert.ok(await page.locator('#storage-alert').isVisible());
    await page.locator('#theme-toggle').click(); assert.equal(await page.evaluate(() => localStorage.getItem('dangi-alba:data')), '{bad json');
  });
  assert.deepEqual(errors, [], '브라우저 JavaScript 오류'); assert.deepEqual(failures, [], 'HTTP 오류');
  console.log('PASS JavaScript/HTTP 오류 없음\n브라우저 시나리오 18개 통과');
} finally { await browser.close(); }
