export const STORAGE_KEY = 'dangi-alba:data';
export const VERSION = 3;
export const MEMO_SIZES = ['14px', '16px', '17px', '18px', '20px', '24px', '28px', '32px'];
export function validateMemoDelta(delta, text) {
  if (delta == null) return null;
  if (!delta || !Array.isArray(delta.ops) || delta.ops.length > 30001) throw new Error('메모 서식이 올바르지 않습니다.');
  let length = 0;
  const ops = delta.ops.map(op => {
    if (!op || typeof op.insert !== 'string' || (length += op.insert.length) > 30001) throw new Error('메모에는 30,000자까지 입력할 수 있습니다.');
    const attributes = {};
    if (op.attributes !== undefined) {
      if (!op.attributes || typeof op.attributes !== 'object' || Array.isArray(op.attributes)) throw new Error('메모 서식이 올바르지 않습니다.');
      for (const [key, value] of Object.entries(op.attributes)) {
        if (['bold', 'underline'].includes(key) && value === true) attributes[key] = true;
        else if (key === 'size' && MEMO_SIZES.includes(value)) attributes.size = value;
        else if (['color', 'background'].includes(key) && typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) attributes[key] = value.toLowerCase();
        else throw new Error('지원하지 않는 메모 서식입니다.');
      }
    }
    return { insert: op.insert, ...(Object.keys(attributes).length ? { attributes } : {}) };
  });
  const content = ops.map(op => op.insert).join('');
  if (!content.endsWith('\n') || content.slice(0, -1) !== text) throw new Error('메모 본문과 서식 내용이 일치하지 않습니다.');
  return { ops };
}
export const DEFAULT_SCHEDULE = {
  names: ['', '', ''], count: 3, start: '10:00', end: '19:00',
  lunchEnabled: true, lunchStart: '12:00', lunchEnd: '13:00', interval: 60, first: 0, fair: true, rulesVersion: 4,
  lunchMode: 'together', lunchMinutes: 60, lunchFirst: 0,
  roundMinutes: [], workOnly: [],
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
  const gross = base + extra;
  const tax = calculateTax(gross, input.taxType ?? 'none', input.taxExempt ?? 0);
  const expected = gross - tax.totalTax - deduction;
  if (expected < 0) throw new Error('공제액이 기본급과 추가 지급액의 합계보다 큽니다.');
  return { total, paidMinutes, base, extra, deduction, expected, gross, ...tax, overnight: end < start };
}
export const TAX_TYPES = { none: '공제 안 함', daily: '일용근로소득', freelance: '프리랜서 3.3%' };
export function calculateTax(gross, taxType = 'none', exempt = 0) {
  if (!Object.hasOwn(TAX_TYPES, taxType)) throw new Error('세금 공제 유형을 선택해 주세요.');
  const taxExempt = amount(exempt, '비과세 금액');
  if (taxExempt > gross) throw new Error('비과세 금액이 세전 급여보다 큽니다.');
  const taxable = gross - taxExempt;
  let incomeTax = 0;
  if (taxType === 'freelance') incomeTax = Math.floor(taxable * 3 / 100 / 10) * 10;
  if (taxType === 'daily') {
    // One work record is one day. Daily deduction 150,000; rate 6%; tax credit 55%.
    const calculated = Math.floor(Math.max(0, taxable - 150000) * 27 / 1000 / 10) * 10;
    incomeTax = calculated < 1000 ? 0 : calculated;
  }
  const localTax = Math.floor(incomeTax / 100) * 10;
  return { taxType, taxExempt, taxable, incomeTax, localTax, totalTax: incomeTax + localTax };
}
export function normalizeSchedule(config) {
  return { ...DEFAULT_SCHEDULE, ...config, names: [...config.names], count: config.count ?? 3,
    lunchMode: config.lunchMode ?? 'together', lunchMinutes: config.lunchMinutes ?? 60, lunchFirst: config.lunchFirst ?? 0, rulesVersion: config.rulesVersion ?? 1 };
}
export function generateSchedule(config) {
  config = normalizeSchedule(config);
  if(![1,2,3,4].includes(config.rulesVersion))throw new Error('지원하지 않는 근무표 규칙입니다.');
  validateRestOptions(config);
  const original = generateOriginalSchedule(config);
  if (config.rulesVersion === 4) return config.fair?generateOrderedSchedule(config, original):original;
  if (config.rulesVersion === 3 && config.fair) return generateRoundSchedule(config, original);
  if (config.rulesVersion < 2 || !config.lunchEnabled || config.lunchMode === 'together') return original;
  const meals = original.filter(row => row.rest === null);
  const start = original[0].start, end = original.at(-1).end;
  const before = meals[0].start - start, after = end - meals.at(-1).end;
  if (!before && !after) return meals;
  const count = config.count, first = Number(config.first), interval = Number(config.interval), active = before + after;
  const order = Array.from({ length:count }, (_,i)=>(first+i)%count);
  const lastMeal = meals.at(-1).lunchers;
  const eligible = order.filter(person=>!lastMeal.includes(person));
  const quotas = order.reduce((list,person,i)=>{list[person]=Math.floor(active/count)+(i<active%count?1:0);return list;},[]);
  // Reserve an eligible person's rest for after lunch, so the final diner works first.
  let postFirst = eligible.find(person=>quotas[person]>0) ?? eligible[0];
  if (config.fair && after && quotas[postFirst]===0) {
    const donor=order.find(person=>quotas[person]>0);quotas[donor]--;quotas[postFirst]++;
  }
  const reserved = config.fair ? Math.min(interval,after,quotas[postFirst]) : 0;
  const rows=[];let next=first;
  const build = (cursor,remaining,reserve) => {
    while(remaining>0) {
      const available=person=>config.fair?quotas[person]-(reserve&&person===postFirst?reserved:0):Infinity;
      let searched=0;while(available(next)<=0&&searched++<count)next=(next+1)%count;
      if(available(next)<=0)throw new Error('근무시간을 배분하지 못했어요. 시간을 다시 확인해 주세요.');
      const minutes=Math.min(interval,remaining,available(next));
      rows.push({start:cursor,end:cursor+minutes,rest:next});
      if(config.fair)quotas[next]-=minutes;
      cursor+=minutes;remaining-=minutes;next=(next+1)%count;
    }
  };
  build(start,before,true);rows.push(...meals);
  if(!config.fair){postFirst=next;while(lastMeal.includes(postFirst))postFirst=(postFirst+1)%count;}
  next=postFirst;build(meals.at(-1).end,after,false);
  return rows;
}
function validateRestOptions(config) {
  if(!Array.isArray(config.roundMinutes)||config.roundMinutes.length>720||config.roundMinutes.some(value=>value!==null&&(!Number.isInteger(value)||value<1||value>1440)))throw new Error('순환별 휴식시간은 1~1,440분으로 입력해 주세요.');
  if(!Array.isArray(config.workOnly)||config.workOnly.length>24||config.workOnly.some(window=>!window||typeof window.start!=='string'||typeof window.end!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(window.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(window.end)))throw new Error('휴식 없는 시간대는 올바른 시각으로 최대 24개까지 입력해 주세요.');
  if(config.rulesVersion<4&&(config.roundMinutes.length||config.workOnly.length))throw new Error('휴식 조정은 새 근무표에서 사용할 수 있어요.');
  if((config.roundMinutes.length||config.workOnly.length)&&!config.fair)throw new Error('휴식 조정에는 공평 배분을 켜 주세요.');
}
function generateOrderedSchedule(config, original) {
  validateRestOptions(config);
  const start=original[0].start,end=original.at(-1).end,count=config.count,first=Number(config.first),interval=Number(config.interval);
  const meals=original.filter(row=>row.rest===null);
  const windows=config.workOnly.map(window=>{
    let from=parseTime(window.start),to=parseTime(window.end);if(from<start)from+=1440;if(to<=from)to+=1440;
    if(from<start||to>end||from>=to)throw new Error('휴식 없는 시간대는 전체 일정 안에 있어야 합니다.');
    return {start:from,end:to};
  });
  const boundaries=[...new Set([start,end,...meals.flatMap(row=>[row.start,row.end]),...windows.flatMap(row=>[row.start,row.end])])].sort((a,b)=>a-b);
  const segments=boundaries.slice(0,-1).map((from,i)=>{
    const to=boundaries[i+1],meal=meals.find(row=>row.start<=from&&row.end>=to);
    return {start:from,end:to,...(meal?{rest:null,...(meal.lunchers?{lunchers:[...meal.lunchers]}:{})}:windows.some(row=>row.start<=from&&row.end>=to)?{rest:null,allWork:true}:{})};
  });
  let available=segments.filter(row=>row.rest!==null).reduce((sum,row)=>sum+row.end-row.start,0);
  const slots=[];
  for(let cycle=0;available>0;cycle++){
    const minutes=config.roundMinutes[cycle]??interval,full=available>=minutes*count;
    for(let i=0;i<count;i++){
      const length=full?minutes:Math.floor(available/count)+(i<available%count?1:0);
      if(length)slots.push({minutes:length,rest:(first+i)%count,cycle});
    }
    available-=full?minutes*count:available;
  }
  const rows=[];let index=0,consumed=0;
  const append=row=>{
    const previous=rows.at(-1);
    if(previous&&previous.end===row.start&&previous.rest===row.rest&&previous.cycle===row.cycle&&previous.allWork===row.allWork&&JSON.stringify(previous.lunchers)===JSON.stringify(row.lunchers))previous.end=row.end;
    else rows.push(row);
  };
  for(const segment of segments){
    if(segment.rest===null){append(segment);continue;}
    let cursor=segment.start;
    while(cursor<segment.end){
      const slot=slots[index],minutes=Math.min(segment.end-cursor,slot.minutes-consumed);
      append({start:cursor,end:cursor+minutes,rest:slot.rest,cycle:slot.cycle});cursor+=minutes;consumed+=minutes;
      if(consumed===slot.minutes){index++;consumed=0;}
    }
  }
  return rows;
}
function generateRoundSchedule(config, original) {
  const count=config.count, interval=Number(config.interval), first=Number(config.first);
  const meals=original.filter(row=>row.rest===null), start=original[0].start, end=original.at(-1).end;
  const mealStart=meals[0]?.start??end, mealEnd=meals.at(-1)?.end??end;
  const active=end-start-(mealEnd-mealStart), before=mealStart-start;
  const order=Array.from({length:count},(_,i)=>(first+i)%count), rounds=[];
  // Complete a whole round at the selected interval before sharing the final
  // remainder. Never spend one person's remainder before full rounds finish.
  for(let i=0;i<Math.floor(active/(count*interval));i++)rounds.push(order.map(rest=>({rest,minutes:interval})));
  const remainder=active%(count*interval);
  if(remainder)rounds.push(order.map((rest,i)=>({rest,minutes:Math.floor(remainder/count)+(i<remainder%count?1:0)})));
  if(meals.at(-1)?.lunchers && mealEnd<end) {
    const lastDiners=meals.at(-1).lunchers;
    let elapsed=0;
    outer:for(const round of rounds)for(let i=0;i<round.length;i++){
      const slot=round[i];
      if(elapsed+slot.minutes>before){
        if(lastDiners.includes(slot.rest)) {
          // Reorder people within this same round (not its time slots). This
          // keeps complete intervals and equal totals, including tiny schedules.
          const candidates=[...round.keys()].slice(i+1).concat([...round.keys()].slice(0,i).reverse());
          const other=candidates.find(j=>!lastDiners.includes(round[j].rest));
          [slot.rest,round[other].rest]=[round[other].rest,slot.rest];
        }
        break outer;
      }
      elapsed+=slot.minutes;
    }
  }
  const rows=[];let cursor=start,inserted=false;
  for(const round of rounds)for(const slot of round){
    let remaining=slot.minutes;
    while(remaining>0){
      if(!inserted&&meals.length&&cursor===mealStart){rows.push(...meals);cursor=mealEnd;inserted=true;}
      const minutes=Math.min(remaining,!inserted&&meals.length?mealStart-cursor:remaining);
      rows.push({start:cursor,end:cursor+minutes,rest:slot.rest});cursor+=minutes;remaining-=minutes;
    }
  }
  if(meals.length&&!inserted)rows.push(...meals);
  return rows;
}
function generateOriginalSchedule(config) {
  config = normalizeSchedule(config);
  const count = config.count;
  if (![2, 3].includes(count)) throw new Error('근무자 수를 2명 또는 3명으로 선택해 주세요.');
  const start = parseTime(config.start);
  let end = parseTime(config.end);
  if (end === start) throw new Error('일정 시작과 종료시간을 다르게 입력해 주세요.');
  if (end < start) end += 1440;
  const interval = Number(config.interval), first = Number(config.first);
  if (!Number.isInteger(interval) || interval < 1 || interval > 1440) throw new Error('교대 간격을 1~1,440분의 정수로 입력해 주세요.');
  if (!Number.isInteger(first) || first < 0 || first >= count) throw new Error('첫 번째 휴식자를 선택해 주세요.');
  let lunchStart = end, lunchEnd = end;
  let lunchRows = [];
  if (config.lunchEnabled) {
    lunchStart = parseTime(config.lunchStart);
    if (lunchStart < start) lunchStart += 1440;
    if (!['together', 'single', 'pair'].includes(config.lunchMode) || (count === 2 && config.lunchMode === 'pair')) throw new Error('인원수에 맞는 점심 방식을 선택해 주세요.');
    if (config.lunchMode === 'together') {
      lunchEnd = parseTime(config.lunchEnd);
      if (lunchEnd <= lunchStart) lunchEnd += 1440;
      lunchRows = [{ start: lunchStart, end: lunchEnd, rest: null }];
    } else {
      const minutes = Number(config.lunchMinutes), lunchFirst = Number(config.lunchFirst);
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 480) throw new Error('1인 식사시간은 1~480분의 정수로 입력해 주세요.');
      if (!Number.isInteger(lunchFirst) || lunchFirst < 0 || lunchFirst >= count) throw new Error('첫 식사자를 선택해 주세요.');
      const order = Array.from({ length: count }, (_, i) => (lunchFirst + i) % count);
      const groups = config.lunchMode === 'pair' ? [order.slice(0, 2), order.slice(2)] : order.map(i => [i]);
      lunchRows = groups.map((lunchers, i) => ({ start: lunchStart + i * minutes, end: lunchStart + (i + 1) * minutes, rest: null, lunchers }));
      lunchEnd = lunchRows.at(-1).end;
    }
    if (lunchStart < start || lunchEnd > end || lunchEnd <= lunchStart) throw new Error('점심시간은 전체 일정 안에 있어야 합니다.');
  }
  const active = end - start - (lunchEnd - lunchStart);
  if (active === 0 && config.lunchMode !== 'together') return lunchRows;
  if (active <= 0) throw new Error('점심시간 외의 근무시간이 필요합니다.');
  const quotas = Array.from({ length: count }, (_, i) => Math.floor(active / count) + (((i - first + count) % count) < active % count ? 1 : 0));
  const rows = [];
  let cursor = start, remaining = active, rest = first, lunchInserted = false;
  while (remaining > 0) {
    if (config.fair) {
      while (quotas[rest] === 0) rest = (rest + 1) % count;
    }
    let segment = Math.min(interval, remaining, config.fair ? quotas[rest] : Infinity);
    const consumed = segment;
    while (segment > 0) {
      if (!lunchInserted && config.lunchEnabled && cursor === lunchStart) {
        rows.push(...lunchRows);
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
    rest = (rest + 1) % count;
  }
  if (config.lunchEnabled && !lunchInserted) rows.push(...lunchRows);
  return rows;
}
export function shiftState(row, person) {
  if (row.allWork) return 'work';
  if (row.rest === null) return !row.lunchers || row.lunchers.includes(person) ? 'lunch' : 'work';
  return row.rest === person ? 'rest' : 'work';
}
export function scheduleTotals(rows, count = 3) {
  return Array.from({ length: count }, (_, person) => rows.reduce((sum, row) => {
    const minutes = row.end - row.start;
    const status = shiftState(row, person);
    sum[status === 'lunch' ? 'lunch' : status === 'rest' ? 'rest' : 'work'] += minutes;
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
  return { version: VERSION, settings: { theme: 'light' }, schedule: { config: structuredClone(DEFAULT_SCHEDULE), generatedConfig: null, rows: [] }, workplaces: [], records: [], calculator: null, workMemo: '', workMemoDelta: null };
}
const textValue = (value, max = 2000) => typeof value === 'string' && value.length <= max;
export function validateRecord(record) {
  if (!record || !textValue(record.id, 100) || !record.id || !validDate(record.date) || !textValue(record.workplace, 100) || !record.workplace.trim() || !textValue(record.task, 200) || !textValue(record.note) || (record.dueDate !== '' && !validDate(record.dueDate))) throw new Error('근무 기록의 날짜 또는 항목이 올바르지 않습니다.');
  calculatePay(record);
  if (!Array.isArray(record.payments) || record.payments.length > 1000 || record.payments.some(p => !p || !validDate(p.date) || typeof p.amount !== 'number' || !Number.isFinite(p.amount) || p.amount <= 0 || p.amount > 1_000_000_000)) throw new Error('입금 내역의 날짜 또는 금액이 올바르지 않습니다.');
  return record;
}
export function validateState(data) {
  if (!data || ![1, 2, VERSION].includes(data.version) || !data.settings || !['light', 'dark'].includes(data.settings.theme) || !data.schedule || !Array.isArray(data.records) || data.records.length > 50000 || !Array.isArray(data.workplaces) || data.workplaces.some(w => !textValue(w, 100)) || (data.workMemo !== undefined && !textValue(data.workMemo, 30000))) throw new Error('지원하지 않는 백업 형식 또는 버전입니다.');
  const config = normalizeSchedule(data.schedule.config);
  if (!config || !Array.isArray(config.names) || config.names.length !== 3 || config.names.some(n => !textValue(n, 40)) || typeof config.lunchEnabled !== 'boolean' || typeof config.fair !== 'boolean') throw new Error('근무표 설정이 올바르지 않습니다.');
  // Draft input may be incomplete; validate types here and times when generating.
  for (const key of ['start', 'end', 'lunchStart', 'lunchEnd']) if (typeof config[key] !== 'string' || (config[key] !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(config[key]))) throw new Error('근무표 시간 형식이 올바르지 않습니다.');
  if (!Number.isInteger(config.interval) || config.interval < 1 || config.interval > 1440 || ![1,2,3,4].includes(config.rulesVersion) || ![2, 3].includes(config.count) || !Number.isInteger(config.first) || config.first < 0 || config.first >= config.count || !['together', 'single', 'pair'].includes(config.lunchMode) || (config.count === 2 && config.lunchMode === 'pair') || !Number.isInteger(config.lunchMinutes) || config.lunchMinutes < 1 || config.lunchMinutes > 480 || !Number.isInteger(config.lunchFirst) || config.lunchFirst < 0 || config.lunchFirst >= config.count) throw new Error('교대 설정이 올바르지 않습니다.');
  validateRestOptions(config);
  const rows = data.schedule.rows;
  if (!Array.isArray(rows) || rows.length > 3000) throw new Error('저장된 근무표가 올바르지 않습니다.');
  if (rows.length) {
    const expected = generateSchedule(data.schedule.generatedConfig);
    const generatedCount = data.schedule.generatedConfig.count ?? 3;
    if (rows.length !== expected.length || rows.some((row, i) => !row || row.start !== expected[i].start || row.end !== expected[i].end || (row.rest !== null && (!Number.isInteger(row.rest) || row.rest < 0 || row.rest >= generatedCount)) || (expected[i].rest === null) !== (row.rest === null) || row.allWork!==expected[i].allWork || row.cycle!==expected[i].cycle || JSON.stringify(row.lunchers ?? null) !== JSON.stringify(expected[i].lunchers ?? null))) throw new Error('저장된 근무표 구간이 올바르지 않습니다.');
  }
  data.records.forEach(validateRecord);
  if (new Set(data.records.map(record => record.id)).size !== data.records.length) throw new Error('중복된 근무 기록 ID가 있습니다.');
  if (data.calculator !== null) {
    if (!data.calculator || typeof data.calculator !== 'object') throw new Error('계산기 설정이 올바르지 않습니다.');
    for (const key of ['date', 'workplace', 'start', 'end', 'payType', 'rate', 'breakMinutes', 'extra', 'deduction']) if (!textValue(data.calculator[key], 100)) throw new Error('계산기 항목 형식이 올바르지 않습니다.');
    if (data.calculator.taxType !== undefined && !Object.hasOwn(TAX_TYPES, data.calculator.taxType)) throw new Error('계산기 세금 유형이 올바르지 않습니다.');
    if (data.calculator.taxExempt !== undefined && (!textValue(data.calculator.taxExempt, 20) || !/^\d*$/.test(data.calculator.taxExempt))) throw new Error('계산기 비과세 입력이 올바르지 않습니다.');
  }
  // Copy only the supported schema, never merge arbitrary keys into app objects.
  const copyConfig = c => {
    const n = normalizeSchedule(c);
    return Object.fromEntries(Object.keys(DEFAULT_SCHEDULE).map(key => [key, key === 'names' ? n.names.map((name, i) => data.version === 1 && name === `근무자 ${'ABC'[i]}` ? '' : name) : key==='roundMinutes'?[...n.roundMinutes]:key==='workOnly'?n.workOnly.map(window=>({start:window.start,end:window.end})):n[key]]));
  };
  return {
    version: VERSION, settings: { theme: data.settings.theme }, workMemo: data.workMemo ?? '', workMemoDelta: validateMemoDelta(data.workMemoDelta, data.workMemo ?? ''),
    schedule: { config: copyConfig(config), generatedConfig: rows.length ? copyConfig(data.schedule.generatedConfig) : null, rows: rows.map(row => ({ start: row.start, end: row.end, rest: row.rest, ...(row.lunchers ? { lunchers: [...row.lunchers] } : {}),...(row.allWork?{allWork:true}:{}),...(Number.isInteger(row.cycle)?{cycle:row.cycle}:{}) })) },
    workplaces: [...new Set(data.workplaces)],
    records: data.records.map(r => ({ id: r.id, date: r.date, workplace: r.workplace, task: r.task, start: r.start, end: r.end, breakMinutes: Number(r.breakMinutes), payType: r.payType, rate: Number(r.rate), extra: Number(r.extra), deduction: Number(r.deduction), taxType: r.taxType ?? 'none', taxExempt: Number(r.taxExempt ?? 0), dueDate: r.dueDate, note: r.note, payments: r.payments.map(p => ({ date: p.date, amount: p.amount })) })),
    calculator: data.calculator === null ? null : { ...Object.fromEntries(['date', 'workplace', 'start', 'end', 'payType', 'rate', 'breakMinutes', 'extra', 'deduction'].map(k => [k, data.calculator[k]])), taxType: data.calculator.taxType ?? 'none', taxExempt: data.calculator.taxExempt ?? '0' },
  };
}
export function evaluateExpression(expression) {
  if (typeof expression !== 'string' || expression.length > 200 || !/^[\d\s.()+\-*/×÷−]+$/.test(expression)) throw new Error('숫자와 +, −, ×, ÷, 괄호만 입력해 주세요.');
  const tokens = expression.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-').match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/]/g) || [];
  // Reject unmatched decimal dots rather than silently dropping them during tokenization.
  if (tokens.join('') !== expression.replace(/\s/g, '').replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-')) throw new Error('수식을 확인해 주세요.');
  let at = 0;
  function atom() {
    const token = tokens[at++];
    if (token === '+') return atom();
    if (token === '-') return -atom();
    if (token === '(') { const value = sum(); if (tokens[at++] !== ')') throw new Error('괄호를 확인해 주세요.'); return value; }
    if (!token || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) throw new Error('수식을 확인해 주세요.');
    return Number(token);
  }
  function product() {
    let value = atom();
    while (['*', '/'].includes(tokens[at])) { const op = tokens[at++], right = atom(); if (op === '/' && right === 0) throw new Error('0으로 나눌 수 없어요.'); value = op === '*' ? value * right : value / right; }
    return value;
  }
  function sum() { let value = product(); while (['+', '-'].includes(tokens[at])) { const op = tokens[at++], right = product(); value = op === '+' ? value + right : value - right; } return value; }
  const result = sum();
  if (at !== tokens.length || !Number.isFinite(result) || Math.abs(result) > 1e15) throw new Error('수식 또는 계산 가능한 범위를 확인해 주세요.');
  return Number(result.toPrecision(12));
}
export function csvText(rows) {
  return '\ufeff' + rows.map(row => row.map(cell => {
    let value = String(cell ?? '');
    // Neutralize spreadsheet formulas while retaining Korean UTF-8 with BOM.
    if (/^[\s]*[=+@-]/.test(value)) value = `'${value}`;
    return `"${value.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
}
