import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SCHEDULE, generateSchedule, scheduleTotals, calculatePay, recordStatus, monthStats, emptyState, validateState, validDate, csvText, calculateTax, shiftState, evaluateExpression, validateMemoDelta } from '../core.js';

test('메모의 모든 서식과 본문이 JSON 백업 왕복 후 보존된다', () => {
  const data = emptyState(); data.workMemo = '업무 설명\n준비물';
  data.workMemoDelta = { ops: [{ insert: '업무 설명', attributes: { bold: true, underline: true, size: '24px', color: '#cc2211', background: '#fff59d' } }, { insert: '\n준비물\n' }] };
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(data))), data);
});
test('v1·v2 일반 메모와 기존 기록은 v3에서 서식 없이 보존된다', () => {
  for (const version of [1, 2]) {
    const data = { ...emptyState(), version, workMemo: '기존 메모\n줄바꿈 유지\n' }; delete data.workMemoDelta;
    const restored = validateState(data); assert.equal(restored.version, 3); assert.equal(restored.workMemo, data.workMemo); assert.equal(restored.workMemoDelta, null);
  }
});
test('메모에 HTML·이미지·스크립트·임의 CSS를 서식으로 저장할 수 없다', () => {
  for (const attributes of [{ color: 'url(javascript:alert(1))' }, { color: 'red' }, { background: '#fff;position:fixed' }, { size: '1000px' }, { onclick: 'alert(1)' }, { bold: '<script>' }]) assert.throws(() => validateMemoDelta({ ops: [{ insert: '메모\n', attributes }] }, '메모'));
  assert.throws(() => validateMemoDelta({ ops: [{ insert: { image: 'x' } }] }, ''));
});
test('메모 본문·서식 불일치와 제한 초과 백업을 거부한다', () => {
  assert.throws(() => validateMemoDelta({ ops: [{ insert: '다른 내용\n' }] }, '메모'));
  assert.throws(() => validateMemoDelta({ ops: [{ insert: '메모' }] }, '메모'));
  assert.throws(() => validateMemoDelta({ ops: [{ insert: '가'.repeat(30001) + '\n' }] }, '가'.repeat(30001)));
  assert.ok(validateMemoDelta({ ops: [{ insert: '가'.repeat(30000) + '\n' }] }, '가'.repeat(30000)));
});

const pay = { start: '10:00', end: '19:00', breakMinutes: 60, payType: 'hourly', rate: 12000, extra: 0, deduction: 0, taxType:'none',taxExempt:0 };
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

test('일용근로 1일 20만원: 소득세 1350원 + 지방소득세 130원',()=>{
  const result=calculatePay({...pay,payType:'daily',rate:200000,taxType:'daily'});
  assert.equal(result.incomeTax,1350);assert.equal(result.localTax,130);assert.equal(result.expected,198520);
});
test('일용근로 일일 공제 및 1000원 미만 소액부징수',()=>{
  for(const gross of [96000,150000,187000])assert.equal(calculateTax(gross,'daily').totalTax,0);
  assert.equal(calculateTax(187037,'daily').incomeTax,0);
  assert.equal(calculateTax(187038,'daily').incomeTax,1000);
});
test('프리랜서 과세금액의 3% + 지방소득세 및 비과세·기타공제 분리',()=>{
  const result=calculatePay({...pay,payType:'daily',rate:200000,taxType:'freelance'});
  assert.equal(result.totalTax,6600);assert.equal(result.expected,193400);
  const exempt=calculatePay({...pay,payType:'daily',rate:220000,taxType:'freelance',taxExempt:20000,deduction:1000});
  assert.equal(exempt.taxable,200000);assert.equal(exempt.expected,212400);
  assert.throws(()=>calculateTax(10000,'daily',20000));assert.throws(()=>calculateTax(10000,'unknown'));
});
test('2인 맞교대는 1인 근무·1인 휴식으로 이름별 합계를 계산한다',()=>{
  const rows=generateSchedule({...DEFAULT_SCHEDULE,count:2,lunchEnabled:false,start:'09:00',end:'17:00'});
  assert.deepEqual(rows.map(r=>r.rest),[0,1,0,1,0,1,0,1]);
  assert.deepEqual(scheduleTotals(rows,2).map(t=>t.work),[240,240]);
  rows.forEach(row=>assert.deepEqual([0,1].map(p=>shiftState(row,p)).sort(),['rest','work']));
});
test('1명씩 식사하면 모든 사람에게 60분 식사, 나머지는 근무',()=>{
  const rows=generateSchedule({...DEFAULT_SCHEDULE,lunchMode:'single'});
  const meals=rows.filter(r=>r.lunchers);
  assert.equal(meals.length,3);assert.deepEqual(meals.map(r=>r.lunchers),[[0],[1],[2]]);
  for(const row of meals)assert.equal([0,1,2].filter(i=>shiftState(row,i)==='work').length,2);
  assert.deepEqual(scheduleTotals(rows).map(t=>t.lunch),[60,60,60]);
  assert.equal(rows.at(-1).end,1140);
});
test('2명 먼저 식사 시 1명 근무, 다음 구간은 2명 근무',()=>{
  const rows=generateSchedule({...DEFAULT_SCHEDULE,lunchMode:'pair',lunchFirst:1});
  const meals=rows.filter(r=>r.lunchers);
  assert.deepEqual(meals.map(r=>r.lunchers),[[1,2],[0]]);
  assert.deepEqual(meals.map(r=>[0,1,2].filter(i=>shiftState(r,i)==='work').length),[1,2]);
  assert.deepEqual(scheduleTotals(rows).map(t=>t.lunch),[60,60,60]);
});
test('맞교대의 1명씩 식사 및 모든 식사 유형 공평 배분',()=>{
  for(const count of [2,3])for(const lunchMode of ['together','single',...(count===3?['pair']:[])]){
    const rows=generateSchedule({...DEFAULT_SCHEDULE,count,lunchMode,fair:true,interval:37});
    const totals=scheduleTotals(rows,count), work=totals.map(t=>t.work);
    assert.ok(Math.max(...work)-Math.min(...work)<=1);
    assert.ok(totals.every(t=>t.work+t.rest+t.lunch===540));
    rows.forEach((r,i)=>{if(i)assert.equal(rows[i-1].end,r.start);});
  }
});
test('교대 식사 창이 전체 일정인 경우와 범위 초과 검증',()=>{
  const rows=generateSchedule({...DEFAULT_SCHEDULE,start:'12:00',end:'15:00',lunchMode:'single'});
  assert.equal(rows.length,3);assert.deepEqual(scheduleTotals(rows).map(t=>t.work),[120,120,120]);
  assert.throws(()=>generateSchedule({...DEFAULT_SCHEDULE,end:'13:30',lunchMode:'single'}));
  assert.throws(()=>generateSchedule({...DEFAULT_SCHEDULE,count:2,lunchMode:'pair'}));
});
test('v1 백업을 v2로 읽으면서 급여·입금·수동 배정을 보존한다',()=>{
  const old=emptyState();old.version=1;delete old.workMemo;
  old.schedule.config={names:['근무자 A','민수','근무자 C'],start:'10:00',end:'19:00',lunchEnabled:true,lunchStart:'12:00',lunchEnd:'13:00',interval:60,first:0,fair:false};
  old.schedule.generatedConfig=structuredClone(old.schedule.config);old.schedule.rows=generateSchedule(old.schedule.config);old.schedule.rows[0].rest=2;
  const r=record({payments:[{date:'2026-10-01',amount:30000}]});delete r.taxType;delete r.taxExempt;old.records=[r];
  const updated=validateState(JSON.parse(JSON.stringify(old)));
  assert.equal(updated.version,3);assert.equal(updated.records[0].taxType,'none');assert.equal(calculatePay(updated.records[0]).expected,96000);
  assert.equal(updated.records[0].payments[0].amount,30000);assert.equal(updated.schedule.rows[0].rest,2);assert.equal(updated.schedule.config.names[0],'');assert.equal(updated.schedule.config.names[1],'민수');
});
test('교대 식사·업무 메모·세금 유형이 JSON 왕복 후 유지된다',()=>{
  const data=emptyState();data.workMemo='<업무> 준비물과 전달사항\n확인';data.records=[record({taxType:'freelance'})];
  data.schedule.config.lunchMode='pair';data.schedule.generatedConfig=structuredClone(data.schedule.config);data.schedule.rows=generateSchedule(data.schedule.config);
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(data))),data);
  const broken=structuredClone(data);broken.schedule.rows.find(r=>r.lunchers).lunchers=[0,2];assert.throws(()=>validateState(broken));
});
test('작은 계산기는 우선순위·소수·음수·괄호를 지원하며 코드 실행을 거부한다',()=>{
  assert.equal(evaluateExpression('12000 × 8 - 1000'),95000);assert.equal(evaluateExpression('(2+3)*4'),20);assert.equal(evaluateExpression('0.1+0.2'),0.3);assert.equal(evaluateExpression('-2×-3'),6);
  for(const text of ['1/0','alert(1)','1..2','2(3)','(2+3','2+'])assert.throws(()=>evaluateExpression(text));
});
