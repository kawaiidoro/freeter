import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateState,validateApplication} from '../core.js';
import {mergeWorkspaces,FreeterCloud} from '../cloud.js';
const post=(id='one',title='전시회 안내')=>({id,title,body:'근무시간 09:00~18:00\n지원 완료',url:'https://example.com/job',createdAt:'2026-10-17T03:00:00.000Z',updatedAt:'2026-10-17T03:00:00.000Z'});
test('이전 백업은 지원 공고·경력·문자 양식의 기본값으로 열리고 기존 메모 보존',()=>{const old={...emptyState(),workMemo:'기존 업무'};for(const key of ['applications','applicationCareer','applicationTemplate'])delete old[key];const data=validateState(old);assert.deepEqual(data.applications,[]);assert.equal(data.applicationCareer,'');assert.equal(data.applicationTemplate,'');assert.equal(data.workMemo,'기존 업무');assert.equal(data.version,3);});
test('이전 기본 예시는 빈 입력란으로 옮기고 실제 문자 내용은 보존',()=>{
 const state=emptyState();state.applicationTemplate='행사명/이름/나이/거주지/경력사항';
 assert.equal(validateState(state).applicationTemplate,'');
 state.applicationTemplate='공연 안내/홍길동/25/서울/진행 3회';
 assert.equal(validateState(state).applicationTemplate,state.applicationTemplate);
});
test('공고 떨어짐 상태는 백업·기기 병합 후 유지되고 이전 결정 기록과 구분',()=>{
 const base={...emptyState(),applications:[post('a'),post('b')]},local=structuredClone(base),remote=structuredClone(base);
 local.applications[0].rejected=true;remote.applications[1].title='다른 기기 공고 수정';
 const merged=mergeWorkspaces(base,local,remote);assert.deepEqual(merged.conflicts,[]);
 const restored=validateState(JSON.parse(JSON.stringify(merged.data)));
 assert.equal(restored.applications.find(p=>p.id==='a').rejected,true);
 assert.equal(restored.applications.find(p=>p.id==='b').title,'다른 기기 공고 수정');
 assert.deepEqual(validateApplication({...post(),rejected:false}),post());
 assert.throws(()=>validateApplication({...post(),rejected:'true'}));
 const legacy=validateApplication({...post(),pinned:true,decided:true});
 assert.equal(legacy.pinned,true);assert.equal(legacy.decided,true);assert.ok(!legacy.rejected,'이전 고정·결정 설정은 떨어짐으로 바꾸지 않음');
});
test('지원 자료 JSON 왕복과 허용 필드만 복사',()=>{const data={...emptyState(),applications:[{...post(),unexpected:'drop'}],applicationCareer:'행사 안내 3회',applicationTemplate:'행사/홍길동/25/서울/안내'};const out=validateState(JSON.parse(JSON.stringify(data)));assert.equal(out.applications[0].unexpected,undefined);assert.equal(out.applicationCareer,data.applicationCareer);assert.equal(out.applicationTemplate,data.applicationTemplate);});
test('공고 링크의 실행 코드·로그인정보, 잘못된 항목·중복 ID·과대 자료 거부',()=>{for(const url of ['javascript:alert(1)','data:text/html,test','file:///tmp/a','https://name:pass@example.com','invalid'])assert.throws(()=>validateApplication({...post(),url}));for(const item of [{...post(),title:' '},{...post(),body:'x'.repeat(20001)},{...post(),createdAt:'not-date'}])assert.throws(()=>validateApplication(item));assert.throws(()=>validateState({...emptyState(),applications:[post(),post()]}));assert.throws(()=>validateState({...emptyState(),applicationCareer:'x'.repeat(30001)}));assert.throws(()=>validateState({...emptyState(),applications:Array.from({length:2001},(_,i)=>post(String(i)))}));});
test('두 기기에서 서로 다른 공고를 작성해도 모두 보존',()=>{const base=emptyState(),a=structuredClone(base),b=structuredClone(base);a.applications=[post('a')];b.applications=[post('b')];const merged=mergeWorkspaces(base,a,b);assert.deepEqual(merged.conflicts,[]);assert.deepEqual(new Set(merged.data.applications.map(p=>p.id)),new Set(['a','b']));});
test('경력과 문자 양식의 독립 수정 병합, 같은 공고 동시 수정은 충돌로 보존',()=>{const base={...emptyState(),applications:[post()]},a=structuredClone(base),b=structuredClone(base);a.applicationCareer='정리 업무';b.applicationTemplate='나의 양식';let m=mergeWorkspaces(base,a,b);assert.deepEqual(m.conflicts,[]);assert.equal(m.data.applicationCareer,'정리 업무');assert.equal(m.data.applicationTemplate,'나의 양식');a.applications[0].title='PC 수정';b.applications[0].title='모바일 수정';m=mergeWorkspaces(base,a,b);assert.deepEqual(m.conflicts,['application:one']);assert.equal(m.data.applications[0].title,'PC 수정');});
test('삭제한 공고의 원격 무수정 사본은 복원하지 않음',()=>{const base={...emptyState(),applications:[post()]},local=structuredClone(base);local.applications=[];const m=mergeWorkspaces(base,local,base);assert.deepEqual(m.conflicts,[]);assert.deepEqual(m.data.applications,[]);});

test('이전 버전 기기가 새 지원 필드를 누락해 저장하면 기기 사본 보존·자동 삭제 중지',()=>{const cache=new Map(),storage={getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)},cloud=new FreeterCloud({config:{url:'https://abcdefghijklmnopqrst.supabase.co',publishableKey:'sb_publishable_isolated_test'},createClient:()=>({}),storage});cloud.user={id:'test-user'};cloud.current={...emptyState(),applications:[post()]};cloud.base=structuredClone(cloud.current);cloud.revision=4;cloud.generation=1;assert.equal(cloud.reconcile({data:emptyState(),revision:5,generation:1,applicationFieldsPresent:false}),false);assert.equal(cloud.phase,'conflict');assert.equal(cloud.current.applications.length,1);assert.equal(cloud.reconcile({data:emptyState(),revision:6,generation:2,applicationFieldsPresent:false}),true);assert.equal(cloud.current.applications.length,0);cloud.stop();});
