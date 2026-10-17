import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SCHEDULE,generateSchedule,scheduleTotals,emptyState,validateState} from '../core.js';
const clock=minutes=>`${String(Math.floor(minutes/60)%24).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
test('v3 저장 근무표의 점심 복귀 규칙을 계속 재현',()=>{
 assert.equal(DEFAULT_SCHEDULE.fair,true);
 for(const lunchMode of ['single','pair']){
  const rows=generateSchedule({...DEFAULT_SCHEDULE,rulesVersion:3,lunchMode});const last=rows.findLastIndex(row=>row.rest===null);
  assert.ok(!rows[last].lunchers.includes(rows[last+1].rest));const work=scheduleTotals(rows).map(total=>total.work);assert.ok(Math.max(...work)-Math.min(...work)<=1);
 }
});
test('다양한 짧은 일정·식사 순서·간격에서도 연속성·근무 인원·1분 이내 균형을 보장',()=>{
 for(const rulesVersion of [3,4])for(const count of [2,3])for(const lunchMode of ['single',...(count===3?['pair']:[])])for(const lunchMinutes of [1,17,60])for(const before of [0,1,17,121])for(const after of [0,1,7,181])for(const interval of [1,17,60,1440])for(let first=0;first<count;first++)for(let lunchFirst=0;lunchFirst<count;lunchFirst++){
  const mealCount=lunchMode==='pair'?2:count,end=600+before+mealCount*lunchMinutes+after;
  const rows=generateSchedule({...DEFAULT_SCHEDULE,rulesVersion,count,lunchMode,lunchMinutes,first,lunchFirst,interval,start:'10:00',lunchStart:clock(600+before),end:clock(end)});
  const totals=scheduleTotals(rows,count),work=totals.map(total=>total.work);assert.ok(Math.max(...work)-Math.min(...work)<=1);
  rows.forEach((row,i)=>{assert.ok(row.end>row.start);if(i)assert.equal(rows[i-1].end,row.start);if(row.rest!==null)assert.ok(row.rest>=0&&row.rest<count);});
  assert.equal(rows[0].start,600);assert.equal(rows.at(-1).end,end);assert.ok(totals.every(total=>total.work+total.rest+total.lunch===end-600&&total.lunch===lunchMinutes));
  const last=rows.findLastIndex(row=>row.rest===null);if(after&&rulesVersion===3)assert.ok(!rows[last].lunchers.includes(rows[last+1].rest));
  if(rulesVersion===4){const slots=[];for(const row of rows.filter(row=>row.rest!==null)){if(slots.at(-1)?.cycle!==row.cycle||slots.at(-1)?.rest!==row.rest)slots.push(row);}assert.deepEqual(slots.map(row=>row.rest),slots.map((_,i)=>(first+i)%count));}
 }
});
test('v3의 순환 간격 우선 점심 규칙도 기존 저장 자료에서 보존',()=>{
 for(const lunchMode of ['single','pair'])for(const first of [0,1,2])for(const lunchFirst of [0,1,2]){
  const rows=generateSchedule({...DEFAULT_SCHEDULE,rulesVersion:3,fair:false,lunchMode,first,lunchFirst});const last=rows.findLastIndex(row=>row.rest===null);assert.ok(!rows[last].lunchers.includes(rows[last+1].rest));
 }
});
test('규칙 변경 전 저장된 구간·수동 휴식 배정은 새로고침과 백업에서 그대로 보존',()=>{
 const state=emptyState();state.schedule.config={...DEFAULT_SCHEDULE,fair:false,rulesVersion:1,lunchMode:'single'};state.schedule.generatedConfig=structuredClone(state.schedule.config);state.schedule.rows=generateSchedule(state.schedule.config);state.schedule.rows[0].rest=2;
 delete state.schedule.config.rulesVersion;delete state.schedule.generatedConfig.rulesVersion;
 const restored=validateState(JSON.parse(JSON.stringify(state)));assert.equal(restored.schedule.config.rulesVersion,1);assert.deepEqual(restored.schedule.rows,state.schedule.rows);assert.deepEqual(validateState(restored),restored);
});
test('자정 이후 식사 교대도 동일한 균형과 복귀 규칙 적용',()=>{
 const rows=generateSchedule({...DEFAULT_SCHEDULE,start:'22:00',end:'07:01',lunchStart:'01:00',lunchMode:'single',interval:37});const work=scheduleTotals(rows).map(total=>total.work);assert.ok(Math.max(...work)-Math.min(...work)<=1);const last=rows.findLastIndex(row=>row.rest===null);assert.deepEqual(rows.filter(row=>row.lunchers).map(row=>row.lunchers),[[0],[1],[2]]);assert.equal(rows.at(-1).end,1861);
});

test('3인: 1시간씩 완전한 순환 후 남은 60분은 20분씩, 30분은 10분씩 배분',()=>{
 for(const extra of [30,60,120,1,2,4,59,179])for(const cycles of [0,1,2])for(const first of [0,1,2]){
  const active=cycles*180+extra,rows=generateSchedule({...DEFAULT_SCHEDULE,start:'08:00',end:clock(480+active),lunchEnabled:false,first});
  assert.deepEqual(rows.slice(0,cycles*3).map(row=>[row.rest,row.end-row.start]),Array.from({length:cycles*3},(_,i)=>[(first+i)%3,60]));
  const tail=rows.slice(cycles*3);assert.equal(tail.reduce((sum,row)=>sum+row.end-row.start,0),extra);
  const quotas=scheduleTotals(tail).map(t=>t.rest);assert.ok(Math.max(...quotas)-Math.min(...quotas)<=1);
  if(extra%3===0)assert.deepEqual(tail.map(row=>row.end-row.start),[extra/3,extra/3,extra/3]);
  assert.equal(rows.at(-1).end,480+active);
 }
});
test('함께·개별·2인 식사 전후에도 완전한 휴식 순환을 먼저 지키고 마지막만 균등 분할',()=>{
 for(const lunchMode of ['together','single','pair'])for(const extra of [30,60])for(const before of [60,120,150,180,185]){
  const meal=lunchMode==='single'?180:lunchMode==='pair'?120:60,active=360+extra;
  const rows=generateSchedule({...DEFAULT_SCHEDULE,start:'08:00',end:clock(480+active+meal),lunchStart:clock(480+before),lunchEnd:clock(540+before),lunchMode});
  const slots=[];for(const row of rows.filter(row=>row.rest!==null)){if(slots.at(-1)?.rest===row.rest&&row.start!==slots.at(-1).end){slots.at(-1).end=row.end;slots.at(-1).minutes+=row.end-row.start;}else slots.push({...row,minutes:row.end-row.start});}
  assert.deepEqual(slots.map(row=>row.minutes),[60,60,60,60,60,60,extra/3,extra/3,extra/3]);
  assert.deepEqual(scheduleTotals(rows).map(t=>t.rest),Array(3).fill(120+extra/3));
  for(let round=0;round<3;round++)assert.equal(new Set(slots.slice(round*3,round*3+3).map(row=>row.rest)).size,3);
 }
});
test('v2로 저장된 실제 시간 구간과 수동 배정을 v3에서도 다시 계산하거나 버리지 않음',()=>{
 const state=emptyState();state.schedule.config={...DEFAULT_SCHEDULE,rulesVersion:2,lunchMode:'single',end:'18:30'};
 state.schedule.generatedConfig=structuredClone(state.schedule.config);state.schedule.rows=generateSchedule(state.schedule.config);state.schedule.rows[0].rest=2;
 const restored=validateState(JSON.parse(JSON.stringify(state)));assert.equal(restored.schedule.generatedConfig.rulesVersion,2);assert.deepEqual(restored.schedule.rows,state.schedule.rows);assert.deepEqual(validateState(restored),restored);
 assert.notDeepEqual(generateSchedule({...state.schedule.config,rulesVersion:3}),state.schedule.rows);
});
