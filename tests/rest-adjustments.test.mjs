import test from 'node:test';
import assert from 'node:assert/strict';
import{DEFAULT_SCHEDULE,generateSchedule,scheduleTotals,shiftState,emptyState,validateState}from'../core.js';
const clock=minutes=>`${String(Math.floor(minutes/60)%24).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
const normal=rows=>{const slots=[];for(const row of rows.filter(row=>Number.isInteger(row.cycle))){const previous=slots.at(-1);if(previous?.cycle===row.cycle&&previous.rest===row.rest)previous.minutes+=row.end-row.start;else slots.push({...row,minutes:row.end-row.start});}return slots;};
const balanced=(rows,count=3)=>{const totals=scheduleTotals(rows,count),rest=totals.map(t=>t.rest),work=totals.map(t=>t.work);assert.ok(Math.max(...rest)-Math.min(...rest)<=1);assert.ok(Math.max(...work)-Math.min(...work)<=1);rows.forEach((row,i)=>{assert.ok(row.end>row.start);if(i)assert.equal(rows[i-1].end,row.start);});};
test('사진의 09–17시: 식사 때문에 A B 휴식 순서를 A C로 뒤바꾸지 않음',()=>{
 const rows=generateSchedule({...DEFAULT_SCHEDULE,start:'09:00',end:'17:00',lunchStart:'11:00',lunchMode:'single'});
 assert.deepEqual(normal(rows).map(row=>[row.rest,row.minutes]),[[0,60],[1,60],[2,60],[0,40],[1,40],[2,40]]);
 assert.deepEqual(rows.filter(row=>row.lunchers).map(row=>[row.start,row.end,row.lunchers]),[[660,720,[0]],[720,780,[1]],[780,840,[2]]]);balanced(rows);
});
test('30·60·그 외 간격에서도 전체 순환을 먼저, 자투리 10분·20분은 마지막에 배치',()=>{
 for(const interval of [15,30,45,60,90])for(const extra of [30,60]){
  const total=interval*6+extra,rows=generateSchedule({...DEFAULT_SCHEDULE,start:'06:00',end:clock(360+total),interval,lunchEnabled:false});const slots=normal(rows),cycles=Math.floor(total/(interval*3));
  assert.ok(slots.slice(0,cycles*3).every(row=>row.minutes===interval));if(total%(interval*3))assert.deepEqual(slots.slice(cycles*3).map(row=>row.minutes),Array(3).fill((total%(interval*3))/3));balanced(rows);
 }
});
test('순환별 휴식 60→90분 증가와 60→30분 감소는 세 사람에게 똑같이 적용',()=>{
 for(const minutes of [30,45,90]){
  const rows=generateSchedule({...DEFAULT_SCHEDULE,start:'08:00',end:'18:00',lunchEnabled:false,roundMinutes:[minutes]});assert.deepEqual(normal(rows).slice(0,3).map(row=>row.minutes),[minutes,minutes,minutes]);balanced(rows);
 }
});
test('09–10시 휴식 없음: 전원 근무로 표시하고 줄어든 휴식도 정확히 균등 배분',()=>{
 const rows=generateSchedule({...DEFAULT_SCHEDULE,start:'09:00',end:'16:00',lunchEnabled:false,workOnly:[{start:'09:00',end:'10:00'}]});
 assert.deepEqual(rows[0],{start:540,end:600,rest:null,allWork:true});assert.deepEqual([0,1,2].map(person=>shiftState(rows[0],person)),['work','work','work']);assert.deepEqual(scheduleTotals(rows).map(t=>t.rest),[120,120,120]);balanced(rows);
});
test('휴식 없음이 점심과 겹쳐도 식사는 보존하며 겹치는 제외 구간은 중복 계산하지 않음',()=>{
 const rows=generateSchedule({...DEFAULT_SCHEDULE,start:'09:00',end:'18:00',lunchMode:'single',workOnly:[{start:'11:30',end:'16:00'},{start:'15:00',end:'17:00'}]});
 assert.deepEqual(rows.filter(row=>row.lunchers).map(row=>[row.end-row.start,row.lunchers]),[[60,[0]],[60,[1]],[60,[2]]]);assert.deepEqual(scheduleTotals(rows).map(t=>[t.rest,t.lunch]),Array(3).fill([70,60]));balanced(rows);
});
test('전 일정의 휴식 제거와 자정 이후 제외·간격 변경도 빈틈이나 잘못된 식사 없이 생성',()=>{
 const all=generateSchedule({...DEFAULT_SCHEDULE,workOnly:[{start:'10:00',end:'19:00'}]});assert.deepEqual(scheduleTotals(all).map(t=>[t.rest,t.lunch,t.work]),Array(3).fill([0,60,480]));
 const night=generateSchedule({...DEFAULT_SCHEDULE,start:'22:00',end:'07:00',lunchStart:'01:00',lunchEnd:'02:00',workOnly:[{start:'23:30',end:'00:30'},{start:'03:00',end:'03:30'}],roundMinutes:[30,60,45]});assert.equal(night[0].start,1320);assert.equal(night.at(-1).end,1860);balanced(night);
});
test('휴식 조정·수동 배정은 JSON 백업 왕복 후 보존하고 위조 메타데이터와 잘못된 시간 거부',()=>{
 const state=emptyState();state.schedule.config={...DEFAULT_SCHEDULE,roundMinutes:[30,null,45],workOnly:[{start:'15:00',end:'15:30'}]};state.schedule.generatedConfig=structuredClone(state.schedule.config);state.schedule.rows=generateSchedule(state.schedule.config);state.schedule.rows.find(row=>row.rest!==null).rest=2;
 const restored=validateState(JSON.parse(JSON.stringify(state)));assert.deepEqual(restored.schedule,state.schedule);assert.deepEqual(validateState(restored),restored);
 for(const bad of [{allWork:true},{cycle:700}]){const value=structuredClone(state);Object.assign(value.schedule.rows.find(row=>row.rest!==null),bad);assert.throws(()=>validateState(value));}
 for(const changes of [{roundMinutes:[0]},{roundMinutes:[1.5]},{roundMinutes:Array(721).fill(1)},{workOnly:[{start:'09:00',end:'11:00'}]},{workOnly:[{start:'18:00',end:'20:00'}]},{workOnly:[{start:'12:00',end:'12:00'}]},{workOnly:[{start:'bad',end:'13:00'}]},{fair:false,roundMinutes:[30]}])assert.throws(()=>generateSchedule({...DEFAULT_SCHEDULE,...changes}));
});
test('순환 길이와 제외 구간을 섞은 여러 일정에서도 ABC·합계·1분 이내 균형 유지',()=>{
 for(const count of [2,3])for(const interval of [1,17,30,60])for(const lunchMode of ['together','single',...(count===3?['pair']:[])])for(const cut of [1,17,30,60]){
  const rows=generateSchedule({...DEFAULT_SCHEDULE,count,interval,lunchMode,lunchMinutes:30,start:'08:00',end:'18:01',workOnly:[{start:'09:00',end:clock(540+cut)},{start:'16:00',end:'16:31'}],roundMinutes:[17,30,60]});balanced(rows,count);assert.deepEqual(normal(rows).map(row=>row.rest),normal(rows).map((_,i)=>i%count));
  assert.ok(scheduleTotals(rows,count).every(t=>t.rest+t.work+t.lunch===601));
 }
});
test('v1·v2·v3 저장 표는 새 규칙으로 자동 재계산하지 않고 수동 휴식자까지 보존',()=>{
 for(const rulesVersion of [1,2,3]){
  const state=emptyState();state.schedule.config={...DEFAULT_SCHEDULE,rulesVersion,lunchMode:'single'};state.schedule.generatedConfig=structuredClone(state.schedule.config);state.schedule.rows=generateSchedule(state.schedule.config);state.schedule.rows[0].rest=2;assert.deepEqual(validateState(JSON.parse(JSON.stringify(state))).schedule.rows,state.schedule.rows);
 }
});
