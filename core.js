export const STORAGE_KEY = 'dangi-alba:data';
export const VERSION = 1;
export const DEFAULT_SCHEDULE = {
  names: ['근무자 A', '근무자 B', '근무자 C'], start: '10:00', end: '19:00',
  lunchEnabled: true, lunchStart: '12:00', lunchEnd: '13:00', interval: 60, first: 0, fair: false,
};
export const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
export const money = value => `${Math.round(value).toLocaleString('ko-KR')}원`;
export const duration = minutes => `${Math.floor(minutes / 60)}시간${minutes % 60 ? ` ${minutes % 60}분` : ''}`;
export const timeText = minutes => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}${minutes >= 1440 ? ' (+1일)' : ''}`;
export function parseTime(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('시간을 올바르게 입력해 주세요.');
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(+date) && date.toISOString().slice(0, 10) === value && value.slice(0, 4) >= '1900';
}
function amount(value, label, max = 1_000_000_000) {
  if (value === '' || value === null || typeof value === 'boolean' || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > max) throw new Error(`${label}을(를) 0 이상 ${max.toLocaleString('ko-KR')} 이하로 입력해 주세요.`);
  return Number(value);
}
export function calculatePay(input) {
  const start = parseTime(input.start), end = parseTime(input.end);
  if (start === end) throw new Error('출근과 퇴근시간이 같습니다. 24시간 미만의 근무를 입력해 주세요.');
  const total = end > start ? end - start : 1440 - start + end;
  const breakMinutes = amount(input.breakMinutes, '휴게시간', 1439);
  if (!Number.isInteger(breakMinutes) || breakMinutes >= total) throw new Error('휴게시간은 전체 근무시간보다 짧은 정수(분)로 입력해 주세요.');
  if (!['hourly', 'daily'].includes(input.payType)) throw new Error('시급 또는 일급을 선택해 주세요.');
  const rate = amount(input.rate, '급여');
  const extra = amount(input.extra, '추가 지급액');
  const deduction = amount(input.deduction, '공제액');
  const paidMinutes = total - breakMinutes;
  const base = Math.round(input.payType === 'hourly' ? paidMinutes * rate / 60 : rate);
  const expected = base + extra - deduction;
  if (expected < 0) throw new Error('공제액이 기본급과 추가 지급액의 합계보다 큽니다.');
  return { total, paidMinutes, base, extra, deduction, expected, overnight: end < start };
}
export function generateSchedule(config) {
  const start = parseTime(config.start);
  let end = parseTime(config.end);
  if (end === start) throw new Error('일정 시작과 종료시간을 다르게 입력해 주세요.');
  if (end < start) end += 1440;
  const interval = Number(config.interval), first = Number(config.first);
  if (!Number.isInteger(interval) || interval < 1 || interval > 1440) throw new Error('교대 간격을 1~1,440분의 정수로 입력해 주세요.');
  if (![0, 1, 2].includes(first)) throw new Error('첫 번째 휴식자를 선택해 주세요.');
  let lunchStart = end, lunchEnd = end;
  if (config.lunchEnabled) {
    lunchStart = parseTime(config.lunchStart);
    lunchEnd = parseTime(config.lunchEnd);
    if (lunchStart < start) lunchStart += 1440;
    if (lunchEnd <= lunchStart) lunchEnd += 1440;
    if (lunchStart < start || lunchEnd > end || lunchEnd <= lunchStart) throw new Error('점심시간은 전체 일정 안에 있어야 합니다.');
  }
  const active = end - start - (lunchEnd - lunchStart);
  if (active <= 0) throw new Error('점심시간 외의 근무시간이 필요합니다.');
  const quotas = [0, 1, 2].map(i => Math.floor(active / 3) + (((i - first + 3) % 3) < active % 3 ? 1 : 0));
  const rows = [];
  let cursor = start, remaining = active, rest = first, lunchInserted = false;
  while (remaining > 0) {
    if (config.fair) {
      while (quotas[rest] === 0) rest = (rest + 1) % 3;
    }
    let segment = Math.min(interval, remaining, config.fair ? quotas[rest] : Infinity);
    const consumed = segment;
    while (segment > 0) {
      if (!lunchInserted && config.lunchEnabled && cursor === lunchStart) {
        rows.push({ start: lunchStart, end: lunchEnd, rest: null });
        cursor = lunchEnd;
        lunchInserted = true;
      }
      const chunk = Math.min(segment, !lunchInserted && config.lunchEnabled ? lunchStart - cursor : segment);
      rows.push({ start: cursor, end: cursor + chunk, rest });
      cursor += chunk;
      segment -= chunk;
    }
    if (config.fair) quotas[rest] -= consumed;
    remaining -= consumed;
    rest = (rest + 1) % 3;
  }
  if (config.lunchEnabled && !lunchInserted) rows.push({ start: lunchStart, end: lunchEnd, rest: null });
  return rows;
}
export function scheduleTotals(rows) {
  return [0, 1, 2].map(person => rows.reduce((sum, row) => {
    const minutes = row.end - row.start;
    if (row.rest === null) sum.lunch += minutes;
    else if (row.rest === person) sum.rest += minutes;
    else sum.work += minutes;
    return sum;
  }, { work: 0, rest: 0, lunch: 0 }));
}
export function recordStatus(record, date = today()) {
  const expected = calculatePay(record).expected;
  const received = record.payments.reduce((sum, payment) => sum + payment.amount, 0);
  if (received >= expected) return 'paid';
  if (received > 0) return 'partial';
  if (record.dueDate && record.dueDate < date) return 'unpaid';
  return 'scheduled';
}
export const STATUS = { paid: '지급 완료', partial: '일부 지급', unpaid: '미지급', scheduled: '지급 예정' };
export function monthStats(records, month) {
  const work = records.filter(record => record.date.startsWith(month));
  const expected = work.reduce((sum, record) => sum + calculatePay(record).expected, 0);
  const receivedForWork = work.reduce((sum, record) => sum + record.payments.reduce((s, p) => s + p.amount, 0), 0);
  const outstanding = work.reduce((sum, record) => sum + Math.max(0, calculatePay(record).expected - record.payments.reduce((s, p) => s + p.amount, 0)), 0);
  const cash = records.reduce((sum, record) => sum + record.payments.filter(p => p.date.startsWith(month)).reduce((s, p) => s + p.amount, 0), 0);
  return { days: new Set(work.map(r => r.date)).size, minutes: work.reduce((sum, r) => sum + calculatePay(r).paidMinutes, 0), expected, receivedForWork, outstanding, cash, work };
}
export function emptyState() {
  return { version: VERSION, settings: { theme: 'light' }, schedule: { config: structuredClone(DEFAULT_SCHEDULE), generatedConfig: null, rows: [] }, workplaces: [], records: [], calculator: null };
}
const textValue = (value, max = 2000) => typeof value === 'string' && value.length <= max;
export function validateRecord(record) {
  if (!record || !textValue(record.id, 100) || !record.id || !validDate(record.date) || !textValue(record.workplace, 100) || !record.workplace.trim() || !textValue(record.task, 200) || !textValue(record.note) || (record.dueDate !== '' && !validDate(record.dueDate))) throw new Error('근무 기록의 날짜 또는 항목이 올바르지 않습니다.');
  calculatePay(record);
  if (!Array.isArray(record.payments) || record.payments.length > 1000 || record.payments.some(p => !p || !validDate(p.date) || typeof p.amount !== 'number' || !Number.isFinite(p.amount) || p.amount <= 0 || p.amount > 1_000_000_000)) throw new Error('입금 내역의 날짜 또는 금액이 올바르지 않습니다.');
  return record;
}
export function validateState(data) {
  if (!data || data.version !== VERSION || !data.settings || !['light', 'dark'].includes(data.settings.theme) || !data.schedule || !Array.isArray(data.records) || data.records.length > 50000 || !Array.isArray(data.workplaces) || data.workplaces.some(w => !textValue(w, 100))) throw new Error('지원하지 않는 백업 형식 또는 버전입니다.');
  const config = data.schedule.config;
  if (!config || !Array.isArray(config.names) || config.names.length !== 3 || config.names.some(n => !textValue(n, 40)) || typeof config.lunchEnabled !== 'boolean' || typeof config.fair !== 'boolean') throw new Error('근무표 설정이 올바르지 않습니다.');
  // Draft input may be incomplete; validate types here and times when generating.
  for (const key of ['start', 'end', 'lunchStart', 'lunchEnd']) if (typeof config[key] !== 'string' || (config[key] !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(config[key]))) throw new Error('근무표 시간 형식이 올바르지 않습니다.');
  if (!Number.isInteger(config.interval) || config.interval < 1 || config.interval > 1440 || ![0, 1, 2].includes(config.first)) throw new Error('교대 설정이 올바르지 않습니다.');
  const rows = data.schedule.rows;
  if (!Array.isArray(rows) || rows.length > 3000) throw new Error('저장된 근무표가 올바르지 않습니다.');
  if (rows.length) {
    const expected = generateSchedule(data.schedule.generatedConfig);
    if (rows.length !== expected.length || rows.some((row, i) => !row || row.start !== expected[i].start || row.end !== expected[i].end || ![null, 0, 1, 2].includes(row.rest) || (expected[i].rest === null) !== (row.rest === null))) throw new Error('저장된 근무표 구간이 올바르지 않습니다.');
  }
  data.records.forEach(validateRecord);
  if (new Set(data.records.map(record => record.id)).size !== data.records.length) throw new Error('중복된 근무 기록 ID가 있습니다.');
  if (data.calculator !== null) {
    if (!data.calculator || typeof data.calculator !== 'object') throw new Error('계산기 설정이 올바르지 않습니다.');
    for (const key of ['date', 'workplace', 'start', 'end', 'payType', 'rate', 'breakMinutes', 'extra', 'deduction']) if (!textValue(data.calculator[key], 100)) throw new Error('계산기 항목 형식이 올바르지 않습니다.');
  }
  // Copy only the supported schema, never merge arbitrary keys into app objects.
  const copyConfig = c => ({ names: [...c.names], start: c.start, end: c.end, lunchEnabled: c.lunchEnabled, lunchStart: c.lunchStart, lunchEnd: c.lunchEnd, interval: c.interval, first: c.first, fair: c.fair });
  return {
    version: VERSION, settings: { theme: data.settings.theme },
    schedule: { config: copyConfig(config), generatedConfig: rows.length ? copyConfig(data.schedule.generatedConfig) : null, rows: rows.map(row => ({ start: row.start, end: row.end, rest: row.rest })) },
    workplaces: [...new Set(data.workplaces)],
    records: data.records.map(r => ({ id: r.id, date: r.date, workplace: r.workplace, task: r.task, start: r.start, end: r.end, breakMinutes: Number(r.breakMinutes), payType: r.payType, rate: Number(r.rate), extra: Number(r.extra), deduction: Number(r.deduction), dueDate: r.dueDate, note: r.note, payments: r.payments.map(p => ({ date: p.date, amount: p.amount })) })),
    calculator: data.calculator === null ? null : Object.fromEntries(['date', 'workplace', 'start', 'end', 'payType', 'rate', 'breakMinutes', 'extra', 'deduction'].map(k => [k, data.calculator[k]])),
  };
}
export function csvText(rows) {
  return '\ufeff' + rows.map(row => row.map(cell => {
    let value = String(cell ?? '');
    // Neutralize spreadsheet formulas while retaining Korean UTF-8 with BOM.
    if (/^[\s]*[=+@-]/.test(value)) value = `'${value}`;
    return `"${value.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
}
