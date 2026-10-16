import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SCHEDULE, generateSchedule, scheduleTotals, calculatePay, recordStatus, monthStats, emptyState, validateState, validDate, csvText } from '../core.js';

const pay = { start: '10:00', end: '19:00', breakMinutes: 60, payType: 'hourly', rate: 12000, extra: 0, deduction: 0 };
const record = (changes = {}) => ({ ...pay, id: 'record-one', date: '2026-09-30', workplace: '우리 카페', task: '판매', dueDate: '2026-10-05', note: '', payments: [], ...changes });

test('요구사항 예시: 점심 10–11시, A·B 5시간 / C 6시간', () => {
  const rows = generateSchedule({ ...DEFAULT_SCHEDULE, lunchStart: '10:00', lunchEnd: '11:00' });
  assert.equal(rows.length, 9);
  assert.deepEqual(rows[0], { start: 600, end: 660, rest: null });
  assert.deepEqual(rows.slice(1).map(r => r.rest), [0, 1, 2, 0, 1, 2, 0, 1]);
  assert.deepEqual(scheduleTotals(rows).map(t => t.work), [300, 300, 360]);
});
test('점심은 교대 타이머를 멈추고 같은 휴식자가 남은 시간을 이어간다', () => {
  const rows = generateSchedule({ ...DEFAULT_SCHEDULE, start: '10:00', end: '13:00', lunchStart: '10:20', lunchEnd: '11:10' });
  assert.deepEqual(rows.slice(0, 3), [{ start: 600, end: 620, rest: 0 }, { start: 620, end: 670, rest: null }, { start: 670, end: 710, rest: 0 }]);
  assert.equal(rows.at(-1).end, 780);
});
test('마지막 자투리 시간과 마지막 점심도 정확하게 종료한다', () => {
  const rows = generateSchedule({ ...DEFAULT_SCHEDULE, end: '18:25' });
  assert.equal(rows.at(-1).end - rows.at(-1).start, 25);
  const endLunch = generateSchedule({ ...DEFAULT_SCHEDULE, lunchStart: '18:00', lunchEnd: '19:00' });
  assert.deepEqual(endLunch.at(-1), { start: 1080, end: 1140, rest: null });
});
test('모든 비점심 구간은 2인 근무이고 빈틈·겹침이 없다', () => {
  for (const interval of [1, 17, 30, 60, 90, 120, 1440]) {
    const rows = generateSchedule({ ...DEFAULT_SCHEDULE, interval, lunchStart: '13:17', lunchEnd: '14:03' });
    rows.forEach((r, i) => {
      assert.ok(r.end > r.start);
      if (r.rest !== null) assert.equal([0, 1, 2].filter(p => p !== r.rest).length, 2);
      if (i) assert.equal(rows[i - 1].end, r.start);
    });
    assert.equal(rows.at(-1).end, 1140);
  }
});
test('공평 배분은 다양한 간격·첫 휴식자에서 최대 1분 차이를 보장한다', () => {
  for (const interval of [1, 17, 30, 60, 90, 120, 1440]) for (const first of [0, 1, 2]) for (const end of ['10:01', '10:02', '10:04', '18:25', '19:00']) {
    const rows = generateSchedule({ ...DEFAULT_SCHEDULE, end, interval, first, fair: true, lunchEnabled: false });
    const work = scheduleTotals(rows).map(t => t.work);
    assert.ok(Math.max(...work) - Math.min(...work) <= 1);
    assert.equal(rows.at(-1).end, Number(end.slice(0, 2)) * 60 + Number(end.slice(3)));
  }
});
test('근무표 자정 넘김과 자정 이후 점심 지원', () => {
  const rows = generateSchedule({ ...DEFAULT_SCHEDULE, start: '22:00', end: '06:00', lunchStart: '01:00', lunchEnd: '02:00' });
  assert.equal(rows[0].start, 1320);
  assert.equal(rows.at(-1).end, 1800);
  assert.deepEqual(rows.find(r => r.rest === null), { start: 1500, end: 1560, rest: null });
});
test('잘못된 일정·교대 간격과 일정 전체를 차지하는 점심 거부', () => {
  for (const bad of [{ interval: 0 }, { interval: 1.5 }, { first: 3 }, { start: '19:00', end: '19:00' }, { lunchStart: '09:00' }, { lunchStart: '10:00', lunchEnd: '19:00' }, { start: '25:00' }]) assert.throws(() => generateSchedule({ ...DEFAULT_SCHEDULE, ...bad }));
});
test('시급 12,000원 × 유급 8시간 = 세전 96,000원', () => {
  assert.equal(calculatePay(pay).paidMinutes, 480);
  assert.equal(calculatePay(pay).base, 96000);
  assert.equal(calculatePay(pay).expected, 96000);
});
test('분 단위 계산 후 원 반올림 및 추가·공제 반영', () => {
  const result = calculatePay({ ...pay, end: '10:37', breakMinutes: 0, rate: 10001, extra: 5000, deduction: 1000 });
  assert.equal(result.base, 6167);
  assert.equal(result.expected, 10167);
});
test('일급은 근무시간을 곱하지 않는다', () => {
  const result = calculatePay({ ...pay, payType: 'daily', rate: 100000, extra: 8000, deduction: 3300 });
  assert.equal(result.base, 100000);
  assert.equal(result.expected, 104700);
});
test('자정을 넘긴 근무시간 계산', () => {
  const result = calculatePay({ ...pay, start: '22:30', end: '06:15', breakMinutes: 45 });
  assert.equal(result.paidMinutes, 420);
  assert.equal(result.expected, 84000);
  assert.ok(result.overnight);
});
test('무효 휴게·금액·동일 출퇴근시간을 거부한다', () => {
  for (const bad of [{ breakMinutes: 540 }, { breakMinutes: -1 }, { breakMinutes: 3.5 }, { rate: '' }, { rate: -1 }, { extra: NaN }, { deduction: 1000000 }, { start: '19:00' }, { payType: 'other' }]) assert.throws(() => calculatePay({ ...pay, ...bad }));
});
test('지급 상태: 예정·미지급·일부·완료', () => {
  assert.equal(recordStatus(record(), '2026-10-01'), 'scheduled');
  assert.equal(recordStatus(record(), '2026-10-06'), 'unpaid');
  assert.equal(recordStatus(record({ payments: [{ date: '2026-10-01', amount: 30000 }] })), 'partial');
  assert.equal(recordStatus(record({ payments: [{ date: '2026-10-01', amount: 30000 }, { date: '2026-10-06', amount: 66000 }] })), 'paid');
});
test('근무 월과 입금 월 분리, 분할 입금 집계', () => {
  const records = [record({ payments: [{ date: '2026-09-30', amount: 30000 }, { date: '2026-10-05', amount: 20000 }] })];
  const september = monthStats(records, '2026-09'), october = monthStats(records, '2026-10');
  assert.equal(september.expected, 96000);
  assert.equal(september.cash, 30000);
  assert.equal(september.outstanding, 46000);
  assert.equal(october.cash, 20000);
  assert.equal(october.expected, 0);
});
test('초과 입금이 다른 알바 미수령액을 줄이지 않는다', () => {
  const records = [record({ payments: [{ date: '2026-09-30', amount: 150000 }] }), record({ id: 'two' })];
  assert.equal(monthStats(records, '2026-09').outstanding, 96000);
  assert.equal(monthStats(records, '2026-09').days, 1);
  assert.equal(monthStats(records, '2026-09').minutes, 960);
});
test('JSON 백업 왕복 시 수동 휴식자 변경·입금 내역 유지', () => {
  const data = emptyState();
  data.records.push(record({ payments: [{ date: '2026-10-01', amount: 40000 }] }));
  data.schedule.rows = generateSchedule(data.schedule.config);
  data.schedule.generatedConfig = structuredClone(data.schedule.config);
  data.schedule.rows.find(r => r.rest !== null).rest = 2;
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(data))), data);
});
test('미완성 설정은 보존하지만 손상된 백업·중복 ID·잘못된 날짜는 거부한다', () => {
  const draft = emptyState(); draft.schedule.config.start = ''; assert.equal(validateState(draft).schedule.config.start, '');
  assert.throws(() => validateState({ version: 99 }));
  const badPayment = emptyState(); badPayment.records = [record({ payments: [{ date: '2026-02-30', amount: 1 }] })]; assert.throws(() => validateState(badPayment));
  const duplicate = emptyState(); duplicate.records = [record(), record()]; assert.throws(() => validateState(duplicate));
  const brokenRows = emptyState(); brokenRows.schedule.rows = [{ start: 0, end: 1, rest: 0 }]; assert.throws(() => validateState(brokenRows));
  const brokenCalc = emptyState(); brokenCalc.calculator = { rate: '<script>' }; assert.throws(() => validateState(brokenCalc));
});
test('백업 복원은 알 수 없는 속성을 앱 상태로 병합하지 않는다', () => {
  const data = JSON.parse(JSON.stringify(emptyState()));
  data.__proto__ = { injected: true }; data.extra = 'unexpected';
  const restored = validateState(data);
  assert.equal(restored.extra, undefined);
  assert.equal(restored.injected, undefined);
});
test('한국어 CSV BOM·줄바꿈·따옴표 처리 및 수식 삽입 방어', () => {
  const csv = csvText([['근무지', '메모'], ['우리 카페', '안녕,"친구"'], ['=1+1', '@SUM(A1)']]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.ok(csv.includes('"안녕,""친구"""'));
  assert.ok(csv.includes('"\'=1+1"'));
  assert.ok(csv.includes('"\'@SUM(A1)"'));
});
test('실제 달력 날짜 및 윤년 검증', () => {
  assert.ok(validDate('2024-02-29'));
  assert.equal(validDate('2026-02-29'), false);
  assert.equal(validDate('2026-13-01'), false);
  assert.equal(validDate('2026-01-00'), false);
});
