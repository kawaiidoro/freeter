import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SCHEDULE,generateSchedule,scheduleTotals,emptyState,validateState} from '../core.js';
const clock=minutes=>`${String(Math.floor(minutes/60)%24).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
test('새 기본값은 공평 배분이며 마지막 식사자가 식사 직후 다시 휴식하지 않음',()=>{
 assert.equal(DEFAULT_SCHEDULE.fair,true);
 for(const lunchMode of ['single','pair']){
  const rows=generateSchedule({...DEFAULT_SCHEDULE,lunchMode});const last=rows.findLastIndex(row=>row.rest===null);
  assert.ok(!rows[last].lunchers.includes(rows[last+1].rest));const work=scheduleTotals(rows).map(total=>total.work);assert.ok(Math.max(...work)-Math.min(...work)<=1);
 }
});
test('다양한 짧은 일정·식사 순서·간격에서도 연속성·근무 인원·1분 이내 균형을 보장',()=>{
 for(const count of [2,3])for(const lunchMode of ['single',...(count===3?['pair']:[])])for(const lunchMinutes of [1,17,60])for(const before of [0,1,17,121])for(const after of [0,1,7,181])for(const interval of [1,17,60,1440])for(let first=0;first<count;first++)for(let lunchFirst=0;lunchFirst<count;lunchFirst++){
  const mealCount=lunchMode==='pair'?2:count,end=600+before+mealCount*lunchMinutes+after;
  const rows=generateSchedule({...DEFAULT_SCHEDULE,count,lunchMode,lunchMinutes,first,lunchFirst,interval,start:'10:00',lunchStart:clock(600+before),end:clock(end)});
  const totals=scheduleTotals(rows,count),work=totals.map(total=>total.work);assert.ok(Math.max(...work)-Math.min(...work)<=1);
  rows.forEach((row,i)=>{assert.ok(row.end>row.start);if(i)assert.equal(rows[i-1].end,row.start);if(row.rest!==null)assert.ok(row.rest>=0&&row.rest<count);});
  assert.equal(rows[0].start,600);assert.equal(rows.at(-1).end,end);assert.ok(totals.every(total=>total.work+total.rest+total.lunch===end-600&&total.lunch===lunchMinutes));
  const last=rows.findLastIndex(row=>row.rest===null);if(after)assert.ok(!rows[last].lunchers.includes(rows[last+1].rest));
 }
});
test('순환 간격 우선 선택에서도 마지막 식사자의 즉시 휴식을 피함',()=>{
 for(const lunchMode of ['single','pair'])for(const first of [0,1,2])for(const lunchFirst of [0,1,2]){
  const rows=generateSchedule({...DEFAULT_SCHEDULE,fair:false,lunchMode,first,lunchFirst});const last=rows.findLastIndex(row=>row.rest===null);assert.ok(!rows[last].lunchers.includes(rows[last+1].rest));
 }
});
test('규칙 변경 전 저장된 구간·수동 휴식 배정은 새로고침과 백업에서 그대로 보존',()=>{
 const state=emptyState();state.schedule.config={...DEFAULT_SCHEDULE,fair:false,rulesVersion:1,lunchMode:'single'};state.schedule.generatedConfig=structuredClone(state.schedule.config);state.schedule.rows=generateSchedule(state.schedule.config);state.schedule.rows[0].rest=2;
 delete state.schedule.config.rulesVersion;delete state.schedule.generatedConfig.rulesVersion;
 const restored=validateState(JSON.parse(JSON.stringify(state)));assert.equal(restored.schedule.config.rulesVersion,1);assert.deepEqual(restored.schedule.rows,state.schedule.rows);assert.deepEqual(validateState(restored),restored);
});
test('자정 이후 식사 교대도 동일한 균형과 복귀 규칙 적용',()=>{
 const rows=generateSchedule({...DEFAULT_SCHEDULE,start:'22:00',end:'07:01',lunchStart:'01:00',lunchMode:'single',interval:37});const work=scheduleTotals(rows).map(total=>total.work);assert.ok(Math.max(...work)-Math.min(...work)<=1);const last=rows.findLastIndex(row=>row.rest===null);assert.ok(!rows[last].lunchers.includes(rows[last+1].rest));assert.equal(rows.at(-1).end,1861);
});
