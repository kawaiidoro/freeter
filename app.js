import { STORAGE_KEY, VERSION, DEFAULT_SCHEDULE, today, money, duration, timeText, calculatePay, generateSchedule, scheduleTotals, recordStatus, STATUS, monthStats, emptyState, validateRecord, validateState, validDate, csvText, TAX_TYPES, shiftState, evaluateExpression, MEMO_SIZES, validateMemoDelta, validateApplication } from './core.js';

const APP_RELEASE = '__FREETER_RELEASE__';
let latestRelease = APP_RELEASE;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
document.documentElement.dataset.brandFont = globalThis.origin === 'null' ? 'fallback' : 'local';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const icons = {
  apply: '<path d="M8 3H5v18h14V3h-7M8 7h5m-5 4h4m-4 4h3m3-8 7-4-3 8-1-3-3-1Z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18M7 15h2m4 0h4M7 18h2"/>',
  calculator: '<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M8 6h8M8 10h1m6 0h1m-8 4h1m6 0h1m-8 4h1m6 0h1"/>',
  notebook: '<path d="M8 3H5v18h14V3H8Zm0 0v18M11 8h5m-5 4h5m-5 4h3M3 7h4M3 12h4M3 17h4"/>',
  chart: '<path d="M4 3v17h17M9 15v-4m5 4V7m5 8V4"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Zm-4 9 3 3 5-6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3h.01"/>',
  settings: '<path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
  moon: '<path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  wallet: '<path d="M20 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h15V8H5a2 2 0 0 1 0-4m15 8h-5v5h5m-3-2.5h.01"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  save: '<path d="M5 3h12l4 4v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>',
  saved: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  warning: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.5 10.5 7-4m-7 7 7 4"/>',
  edit: '<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  sparkle: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4"/>',
  coffee: '<path d="M4 8h12v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Zm12 0h2a3 3 0 0 1 0 6h-2M7 3v2m5-2v2"/>',
};
const icon = (name, className = '') => `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.notebook}</svg>`;
$$('[data-icon]').forEach(node => { node.innerHTML = icon(node.dataset.icon); });
$('.topbar').before($('#storage-alert'));

let state = emptyState(), storageBlocked = false, rawStored = null;
try {
  rawStored = localStorage.getItem(STORAGE_KEY);
  if (rawStored !== null) state = validateState(JSON.parse(rawStored));
} catch {
  storageBlocked = true;
  $('#storage-alert').hidden = false;
  $('#storage-alert').textContent = rawStored === null
    ? '이 환경에서는 브라우저 저장소를 사용할 수 없습니다. 새 탭에서 사이트를 열거나 JSON으로 백업해 주세요. 계산은 가능하지만 새로고침하면 변경이 사라집니다.'
    : '저장 데이터를 읽을 수 없습니다. 원본은 보존했습니다. 데이터 · 설정에서 원본을 백업해 주세요. 지금 변경한 내용은 저장되지 않습니다.';
}
const browserStorage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)};
const cloud=new FreeterCloud({config:globalThis.origin==='null'||(storageBlocked&&rawStored===null)?{}:CLOUD_CONFIG,createClient:(...args)=>loadFreeterSupabase().createClient(...args),storage:browserStorage,onStatus:updateCloudUI,onWorkspace:applyAccountWorkspace,onGuest:returnToGuest});
function save() {
  if(cloud.user)return cloud.save(state);
  if (storageBlocked) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    $('#storage-alert').hidden = false;
    $('#storage-alert').textContent = '브라우저 저장 공간에 기록하지 못했습니다. 현재 내용을 JSON으로 백업하고 저장 공간·브라우저 설정을 확인해 주세요. 새로고침하면 저장되지 않은 변경이 사라집니다.';
    return false;
  }
}
let toastTimer;
function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4500);
}
function persisted(message) { toast(save() ? message : '현재 화면에 반영했습니다. 브라우저에 저장되지 않았으니 JSON으로 백업해 주세요.'); }
const monthNow = () => today().slice(0, 7);
const monthLabel = month => `${Number(month.slice(0, 4))}년 ${Number(month.slice(5))}월`;
let page = 'home', statsMonth = monthNow();
const activeTool = () => page;
let applicationSearch='', applicationPage=0;
let recordFilters = { month: monthNow(), workplace: '', status: '', search: '', sort: 'desc' };
let calcSavedHash = '';
let mobileScheduleSettingsOpen = false;
let memoQuill = null, memoSelection = { index: 0, length: 0 };
const compactSchedule = () => window.matchMedia('(max-width: 800px)').matches;
const titles = { home: '홈', applications: '알바 지원', schedule: '교대 근무표', calculator: '급여 계산기', records: '나의 알바 기록', stats: '수입 통계', guide: '사용 가이드', privacy: '개인정보 안내', settings: '데이터 · 설정', notes: '업무 메모장' };
const routeFiles = { home: './', applications: './applications.html', schedule: './schedule.html', calculator: './calculator.html', records: './records.html', stats: './stats.html', guide: './guide.html', privacy: './privacy.html', settings: './settings.html', notes:'./notes.html' };
const descriptions = {
  home: '단기알바 근무시간부터 급여 기록까지, 한 번에 관리하세요.',
  applications: '지원한 알바 공고와 단기알바 경력, 문자 지원 양식을 한곳에 저장하세요.',
  schedule: '3인 밀어내기·2인 맞교대와 다양한 점심 교대 근무표를 무료로 생성하고 공유하세요.',
  notes: '전달받은 업무 설명과 준비물을 브라우저에 자동 저장하는 나의 업무 메모장입니다.',
  calculator: '시급·일급과 분 단위 근무시간으로 예상 급여를 계산하고 기록하세요.',
  records: '여러 근무지의 출퇴근, 예상 급여와 입금 내역을 브라우저에서 관리하세요.',
  stats: '근무한 달의 예상 급여와 실제 입금한 달의 수입을 구분해 확인하세요.',
  guide: '근무표 생성과 급여 계산, 알바 기록과 백업 방법을 안내합니다.',
  privacy: '브라우저 저장·Google 로그인·계정 동기화와 개인정보 보호 안내입니다.',
  settings: '전체 기록을 JSON으로 백업·복원하고 테마와 데이터를 관리하세요.',
};
const THEME_KEY='freeter:theme';
let deviceTheme=null;
try{const storedTheme=localStorage.getItem(THEME_KEY);if(['light','dark'].includes(storedTheme))deviceTheme=storedTheme;}catch{/* A restricted browser can still switch the current screen. */}
function effectiveTheme(){return deviceTheme||state.settings.theme||'dark';}
function chooseTheme(theme){
  if(!['light','dark'].includes(theme))return;
  deviceTheme=theme;state.settings.theme=theme;
  // A device preference survives account refreshes without rewriting incoming account data.
  try{localStorage.setItem(THEME_KEY,theme);}catch{/* Keep the choice for this visit when storage is blocked. */}
}
function applyTheme() {
  const theme=effectiveTheme();
  document.documentElement.dataset.theme = theme;
  $('#theme-toggle').innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
  $('#theme-toggle').setAttribute('aria-label', theme === 'dark' ? '라이트모드로 전환' : '다크모드로 전환');
  $('meta[name="theme-color"]').content = theme === 'dark' ? '#121212' : '#f7f7f7';
}
function render() {
  const filename = location.pathname.split('/').at(-1);
  page = location.hash.slice(1).split('?')[0] || Object.keys(routeFiles).find(key => routeFiles[key] === `./${filename}`) || 'home';
  if (!titles[page]) page = 'home';
  document.body.dataset.page = page;
  document.body.dataset.homeTool = '';
  document.title = page === 'home' ? 'Freeter' : `${titles[page]} | Freeter`;
  $('meta[name="description"]').content = descriptions[page];
  const canonical = $('link[rel="canonical"]');
  canonical.href = new URL(routeFiles[page], canonical.href).href;
  for (const [selector,value] of [['meta[property="og:title"]',document.title],['meta[property="og:description"]',descriptions[page]],['meta[property="og:url"]',canonical.href],['meta[name="twitter:title"]',document.title],['meta[name="twitter:description"]',descriptions[page]]]) { const meta=$(selector); if(meta)meta.content=value; }
  $('#page-label').textContent = titles[page];
  $$('a[data-page]').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
    if (link.dataset.page === page) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  memoQuill = null;
  $('#main').innerHTML = ({ home: homeView, applications: applicationsView, schedule: scheduleView, calculator: calculatorView, records: recordsView, stats: statsView, guide: guideView, privacy: privacyView, settings: settingsView, notes:notesView })[page]();
  applyTheme();updateCloudUI();
  if (activeTool() === 'schedule') renderScheduleResult();
  if (activeTool() === 'calculator') updateCalculator(false);
  if (activeTool() === 'records') updateRecords();
  if (page === 'notes') setupMemoEditor();
  if (page === 'applications') renderApplicationList();
  $('#main').dataset.ready=page;
  $$('a[href^="#"]').forEach(link => {
    const route = link.getAttribute('href').slice(1);
    if (routeFiles[route]) { link.href = routeFiles[route]; link.dataset.route = route; }
  });
}
const head = (eyebrow, title, text, action = '') => `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${text}</p></div>${action}</div>`;
const field = (label, name, type, value, options = '') => `<label class="field"><span>${label}</span><input type="${type}" name="${name}" value="${esc(value)}" ${options}></label>`;
const smallEmpty = (title, text, button = '') => `<div class="empty-state"><div class="empty-icon">${icon('notebook')}</div><h3>${title}</h3><p>${text}</p>${button}</div>`;
const workplaceOptions = () => [...new Set([...state.workplaces, ...state.records.map(r => r.workplace)])].sort((a, b) => a.localeCompare(b, 'ko'));
const appTile = (route, image, name, color) => `<a class="app-tile" href="#${route}"><span class="app-tile-icon ${color}"><img src="./assets/${route}-icon.png?v=${APP_RELEASE}" width="68" height="68" alt=""></span><span>${name}</span></a>`;
function homeView() {
  const stats = monthStats(state.records, monthNow());
  const recent = [...state.records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  return `
    <div class="workspace-grid">
      <section class="workspace-widget profile-widget" aria-label="나의 Freeter"><img class="profile-logo" src="./assets/freeter-512.png" width="96" height="96" alt="안전모를 쓴 곰씨 정면 얼굴 Freeter 로고"><div class="profile-copy"><img class="profile-wordmark freeter-wordmark" src="./assets/freeter-wordmark.png" width="220" height="73" alt="FREETER · 프리터"><h1 class="profile-slogan">저는 단기알바입니다.</h1><p>일한 만큼 기록하고,<br>번 만큼 확인하세요.</p></div><a href="#calculator" class="profile-link">급여 계산하기 ${icon('arrow')}</a></section>
      <section class="workspace-widget launcher-widget" aria-label="근무 관리 도구"><div class="app-launcher">${[['applications','apply','알바 지원','tile-apply'],['notes','edit','업무 메모','tile-notes'],['schedule','calendar','근무표','tile-emerald'],['calculator','calculator','급여 계산','tile-black'],['records','notebook','알바 기록','tile-silver'],['stats','chart','수입 통계','tile-chart'],['settings','settings','데이터 · 설정','tile-settings'],['guide','help','사용 가이드','tile-settings']].map(args=>appTile(...args)).join('')}</div></section>
      <section class="workspace-widget recent-panel records-widget"><div class="widget-bar"><span class="widget-heading-icon tile-silver">${icon('notebook')}</span><div><h2>최근 알바 기록</h2><p>차곡차곡 쌓이는 나의 하루</p></div><a href="#records" class="widget-open" aria-label="알바 기록 전체 보기">${icon('arrow')}</a></div><div class="widget-content">${recent.length ? `<div class="recent-list">${recent.map(r=>`<button class="recent-row" data-action="edit-record" data-id="${esc(r.id)}"><span class="workplace-avatar">${esc(r.workplace.slice(0,1))}</span><span class="recent-details"><strong>${esc(r.workplace)}</strong><span>${esc(r.date)} · ${duration(calculatePay(r).paidMinutes)}</span></span><span class="recent-amount"><strong>${money(calculatePay(r).expected)}</strong><span class="status ${recordStatus(r)}">${STATUS[recordStatus(r)]}</span></span>${icon('chevron')}</button>`).join('')}</div>` : smallEmpty('첫 번째 알바를 기록해 보세요','근무한 하루를 남기면, 급여 관리가 쉬워져요.','<button class="button secondary small" data-action="add-record">'+icon('plus')+'첫 기록 추가하기</button>')}</div></section>
      <section class="workspace-widget memo-widget"><div class="widget-bar"><span class="widget-heading-icon tile-notes">${icon('edit')}</span><div><h2>업무 메모</h2><p>출근 전, 한 번 더 확인</p></div><a href="#notes" class="widget-open" aria-label="업무 메모장 열기">${icon('edit')}</a></div><a class="memo-preview" href="#notes"><span class="memo-preview-title">나의 업무 메모</span><p>${esc(state.workMemo.trim()||'전달받은 업무 설명과 준비물을 적어 두세요.\n필요할 때 바로 꺼내볼 수 있어요.')}</p><span class="memo-preview-cta">${state.workMemo.trim()?'메모 이어 보기':'첫 메모 쓰기'} ${icon('arrow')}</span></a></section>
      <section class="workspace-widget month-widget" aria-labelledby="month-title"><div class="widget-heading"><h2 id="month-title">${new Date().getMonth()+1}월의 기록</h2><a href="#stats" class="text-link">수입 통계 ${icon('chevron')}</a></div><div class="summary-grid home-summary">${summaryCard('calendar','blue','근무한 날',`${stats.days}<small>일</small>`,`${duration(stats.minutes)} 근무`)}${summaryCard('wallet','purple','예상 급여',numberWon(stats.expected),'이번 달 근무 기준')}${summaryCard('check','green','실제 받은 급여',numberWon(stats.cash),'이번 달 입금 기준')}${summaryCard('clock','orange','아직 못 받은 급여',numberWon(stats.outstanding),'이번 달 근무의 미수령액')}</div></section>
      <button type="button" class="workspace-updates" data-action="open-updates"><span class="updates-new-dot"></span>업데이트 내역<span>새로운 근무 관리 도구</span>${icon('chevron')}</button><a class="workspace-backup" href="#settings">${icon('shield')}<span>소중한 기록, JSON 백업으로 보관하세요.</span>${icon('chevron')}</a>
    </div>`;
}
const numberWon = value => `${Math.round(value).toLocaleString('ko-KR')}<small>원</small>`;
const summaryCard = (image, color, label, value, note) => `<article class="summary-card"><div class="summary-label"><span>${label}</span><span class="mini-icon ${color}">${icon(image)}</span></div><strong>${value}</strong><p>${note}</p></article>`;

function scheduleView() {
  const config = state.schedule.config, count = config.count;
  return head('SHIFT PLANNER', '교대 근무표', '3인 밀어내기부터 2인 맞교대까지. 식사하는 방법도 우리 현장에 맞게 정해요.') + `
    <div class="tool-layout schedule-layout"><section class="panel form-panel">
      <details id="schedule-settings" class="schedule-settings" ${!compactSchedule()||!state.schedule.rows.length||mobileScheduleSettingsOpen?'open':''}><summary class="settings-summary"><span>${icon('settings')}근무 설정</span><span class="settings-summary-meta">${count}인 교대 ${icon('chevron')}</span></summary>
      <form id="schedule-form"><fieldset><legend>근무 방식</legend><div class="choice-group two-options">
        ${[[3,'3인 밀어내기','2명 근무 · 1명 휴식'],[2,'2인 맞교대','1명 근무 · 1명 휴식']].map(([n,title,hint])=>`<label class="choice-option"><input type="radio" name="count" value="${n}" ${count===n?'checked':''}><span><strong>${title}</strong><small>${hint}</small></span></label>`).join('')}
      </div></fieldset><fieldset><legend>함께 일하는 사람</legend><div class="three-fields ${count===2?'two-people':''}">
        ${config.names.map((name,i)=>`<label class="field" ${i>=count?'hidden':''}><span>근무자 ${'ABC'[i]}</span><input class="person-name" type="text" name="person${i}" value="${esc(name)}" maxlength="40" autocomplete="off" placeholder="이름"></label>`).join('')}
      </div></fieldset><fieldset><legend>전체 일정</legend><div class="form-grid">
        ${field('시작시간','start','time',config.start,'required')}${field('종료시간','end','time',config.end,'required')}
      </div><p class="field-hint">종료가 시작보다 이르면 다음 날로 계산해요.</p></fieldset>
      <fieldset><legend><label class="check-label"><input type="checkbox" name="lunchEnabled" ${config.lunchEnabled?'checked':''}>점심시간 사용</label></legend>
        <div id="lunch-fields" ${config.lunchEnabled?'':'hidden'}><label class="field"><span>점심 교대 방식</span><select name="lunchMode">
          <option value="together" ${config.lunchMode==='together'?'selected':''}>모두 함께 식사</option>
          <option value="single" ${config.lunchMode==='single'?'selected':''}>1명씩 순서대로 식사</option>
          ${count===3?`<option value="pair" ${config.lunchMode==='pair'?'selected':''}>2명 먼저 · 1명 나중에 식사</option>`:''}
        </select></label><div class="form-grid lunch-options">
          ${field(config.lunchMode==='together'?'점심 시작':'첫 식사 시작','lunchStart','time',config.lunchStart)}
          <div ${config.lunchMode==='together'?'':'hidden'}>${field('점심 종료','lunchEnd','time',config.lunchEnd)}</div>
          <div ${config.lunchMode!=='together'?'':'hidden'}>${field('1인 식사시간 (분)','lunchMinutes','number',config.lunchMinutes,'min="1" max="480" step="1"')}</div>
          <label class="field full" ${config.lunchMode==='together'?'hidden':''}><span>${config.lunchMode==='pair'?'먼저 식사할 2명 중 첫 사람':'첫 번째 식사자'}</span><select name="lunchFirst">${Array.from({length:count},(_,i)=>`<option value="${i}" ${config.lunchFirst===i?'selected':''} data-person="${i}">${esc(personName(i))}</option>`).join('')}</select></label>
        </div><p class="field-hint">${config.lunchMode==='together'?'모든 근무자가 함께 식사하며 근무를 쉬어요.':config.lunchMode==='single'?`${config.lunchMinutes}분씩 ${count}명이 순서대로 식사해요. 식사하지 않는 사람은 근무해요.`:`선택한 사람과 다음 사람이 먼저 ${config.lunchMinutes}분 식사하고, 남은 1명이 이어서 식사해요. 이때 1명 근무인 구간이 생겨요.`}</p></div>
      </fieldset><fieldset><legend>교대 규칙</legend><div class="form-grid"><label class="field"><span>교대 간격</span><select name="intervalPreset">${[30,60,90,120].map(n=>`<option value="${n}" ${config.interval===n?'selected':''}>${duration(n)}</option>`).join('')}<option value="custom" ${![30,60,90,120].includes(config.interval)?'selected':''}>사용자 지정</option></select></label>
        ${field('교대 간격 (분)','interval','number',config.interval,'min="1" max="1440" required')}
        <label class="field full"><span>첫 번째 휴식자</span><select name="first">${Array.from({length:count},(_,i)=>`<option value="${i}" ${config.first===i?'selected':''} data-person="${i}">${esc(personName(i))}</option>`).join('')}</select></label>
      </div><label class="check-label fair-check"><input type="checkbox" name="fair" ${config.fair||config.rulesVersion<4?'checked':''} ${(config.roundMinutes?.length||config.workOnly?.length)?'disabled':''}><span>공평하게 배분 <small>한 바퀴씩 쉰 뒤 남은 시간을 똑같이 나눠요.</small></span></label></fieldset>
      <div id="schedule-error" class="form-error" role="alert" hidden></div><button class="button primary full-width" type="submit">${icon('sparkle')}근무표 생성하기</button><button class="button ghost full-width" type="button" data-action="reset-schedule">설정과 근무표 초기화</button>
    </form></details></section><section id="schedule-result" class="panel result-panel" aria-live="polite"></section></div>
    <aside class="info-strip">${icon('help')}<p><strong>식사 중인 사람과 근무 중인 사람을 구분해요.</strong> 공평 배분을 켜면 모두 교대 간격만큼 한 바퀴씩 쉬고, 남은 시간은 똑같이 나눠요. 점심이 끼어도 휴식은 A→B→C 순서를 이어가요. 점심도 첫 식사자부터 같은 순서로 돌아요. 2명이 함께 식사하는 구간은 1명만 근무합니다. 배정용 도구로 급여는 계산하지 않아요.</p><a href="#guide">사용법 ${icon('arrow')}</a></aside>`;
}
function readSchedule() {
  const data = new FormData($('#schedule-form')), count = Number(data.get('count'));
  const lunchMode = count===2 && data.get('lunchMode')==='pair' ? 'single' : data.get('lunchMode');
  return { names:[0,1,2].map(i=>String(data.get(`person${i}`)??'').slice(0,40)), count, start:data.get('start'), end:data.get('end'), lunchEnabled:data.has('lunchEnabled'), lunchStart:data.get('lunchStart'), lunchEnd:data.get('lunchEnd'), interval:Number(data.get('interval')), first:Math.min(Number(data.get('first')),count-1), fair:data.has('fair')||!!(state.schedule.config.roundMinutes?.length||state.schedule.config.workOnly?.length), rulesVersion:4, roundMinutes:[...(state.schedule.config.roundMinutes||[])], workOnly:(state.schedule.config.workOnly||[]).map(window=>({...window})), lunchMode, lunchMinutes:Number(data.get('lunchMinutes')), lunchFirst:Math.min(Number(data.get('lunchFirst')),count-1) };
}
const personName = i => state.schedule.config.names[i]?.trim() || `근무자 ${'ABC'[i]}`;
const resultCount = () => state.schedule.generatedConfig?.count ?? 3;
const resultPeople = () => Array.from({length:resultCount()},(_,i)=>i);
const shiftLabel = {work:'근무',rest:'휴식',lunch:'점심'};
function renderScheduleResult() {
  const container=$('#schedule-result'); if(!container)return;
  const rows=state.schedule.rows;
  if(!rows.length){ container.innerHTML=`<div class="result-placeholder"><span class="large-feature">${icon('calendar')}</span><span class="eyebrow">READY WHEN YOU ARE</span><h2>우리의 하루를<br>가볍게 계획해요.</h2><p>${state.schedule.config.count}인 교대와 식사 방식을 선택하고<br>근무표 생성하기를 눌러 주세요.</p></div>`;return; }
  const people=resultPeople(), totals=scheduleTotals(rows,people.length), names=people.map(personName);
  const gap=Math.max(...totals.map(t=>t.work))-Math.min(...totals.map(t=>t.work));
  const oldRules=(state.schedule.generatedConfig.rulesVersion??1)<4;
  const dirty=JSON.stringify({...state.schedule.config,names:[]})!==JSON.stringify({...state.schedule.generatedConfig,names:[]});
  container.innerHTML=`<div class="panel-title"><div><h2>우리의 근무표</h2><p>${timeText(rows[0].start)} – ${timeText(rows.at(-1).end)} · ${people.length}인 교대</p></div><div class="result-toolbar"><span class="small-badge blue-badge">${state.schedule.generatedConfig.fair?'균형 우선':'순환 교대'}</span><button type="button" class="button secondary small" data-action="edit-schedule">${icon('settings')}설정</button></div></div>
    ${oldRules?'<p class="inline-notice">휴식·점심 순서를 유지하고 마지막 남은 시간을 균등 배분하도록 개선됐어요. 기존 배정을 보존했으니 근무표를 다시 생성해 적용해 주세요.</p>':''}
    ${dirty?'<p class="inline-notice">시간·인원·규칙이 변경됐어요. 생성 버튼을 눌러 반영해 주세요.</p>':''}
    <div class="schedule-adjust-bar"><button type="button" class="button secondary small" data-action="adjust-rest">${icon('edit')}휴식 조정</button><span>순환별 휴식 길이 · 휴식 없는 시간대</span></div><div class="schedule-legend"><span><i class="legend-dot work"></i>근무</span><span><i class="legend-dot rest"></i>휴식</span><span><i class="legend-dot lunch"></i>점심</span></div><p class="field-hint mobile-scroll-hint">근무자를 누르면 그 시간의 휴식자로 바꿀 수 있어요.</p>
    <div class="table-scroll schedule-scroll" tabindex="0" aria-label="교대 근무표"><table class="schedule-table"><thead><tr><th scope="col">시간</th>${names.map((n,i)=>`<th scope="col" data-person="${i}">${esc(n)}</th>`).join('')}<th scope="col" class="assignment-column">휴식자 변경</th></tr></thead><tbody>
    ${rows.map((row,index)=>`<tr class="${row.allWork?'all-work-row':row.rest===null?'lunch-row':''}"><th scope="row">${timeText(row.start)}<span>– ${timeText(row.end)}</span>${row.allWork?'<small>휴식 없음</small>':''}</th>${people.map(i=>`<td>${row.rest===null?`<span class="shift-badge ${shiftState(row,i)}">${shiftLabel[shiftState(row,i)]}</span>`:`<button type="button" class="shift-badge ${shiftState(row,i)}" data-action="choose-rest" data-row="${index}" data-worker="${i}" aria-pressed="${row.rest===i}" aria-label="${timeText(row.start)} ${esc(names[i])} 휴식자로 변경">${shiftLabel[shiftState(row,i)]}</button>`}</td>`).join('')}<td class="assignment-column">${row.rest===null?`<span class="muted">${row.allWork?'전원 근무':row.lunchers?'식사 교대':'모두 휴식'}</span>`:`<select class="rest-select" data-row="${index}" aria-label="${timeText(row.start)} 휴식자">${names.map((n,i)=>`<option value="${i}" ${row.rest===i?'selected':''}>${esc(n)}</option>`).join('')}</select>`}</td></tr>`).join('')}
    </tbody></table></div><div class="person-totals" style="grid-template-columns:repeat(${people.length},minmax(0,1fr))">${totals.map((t,i)=>`<div><span data-person="${i}">${esc(names[i])}</span><strong>${duration(t.work)}</strong><small>휴식 ${duration(t.rest)} · 점심 ${duration(t.lunch)}</small></div>`).join('')}</div><p class="field-hint">개인별 근무시간 차이: <strong>${gap}분</strong>${gap?' · 첫 휴식자를 바꾸거나 공평하게 배분을 사용해 보세요.':' · 모든 사람의 근무시간이 같아요.'}</p>
    <div class="export-actions"><button class="button secondary small" data-action="schedule-png">${icon('download')}PNG 저장</button><button class="button secondary small" data-action="schedule-csv">${icon('download')}CSV</button><button class="button secondary small" data-action="schedule-copy">${icon('copy')}텍스트 복사</button><button class="button secondary small" data-action="schedule-share">${icon('share')}공유</button></div><p class="field-hint">기기 공유 메뉴에서 카카오톡 등을 선택하세요. 지원하지 않으면 텍스트 복사를 이용해 주세요.</p>`;
}

function calculatorDefaults() { return {days:'1',...(state.calculator || {date:today(),workplace:'',payType:'hourly',rate:'12000',start:'10:00',end:'19:00',breakMinutes:'60',extra:'0',deduction:'0',taxType:'none',taxExempt:'0'})}; }
let restAdjustment=null;
function openRestAdjustment(){
  if(!state.schedule.rows.length)return;
  const generated=state.schedule.generatedConfig,keys=['count','start','end','lunchEnabled','lunchStart','lunchEnd','lunchMode','lunchMinutes','lunchFirst','interval','first'];
  if(keys.some(key=>state.schedule.config[key]!==generated[key])){toast('근무 설정 변경을 먼저 생성 버튼으로 반영한 뒤 휴식을 조정해 주세요.');return;}
  let dialog=$('#rest-adjust-dialog');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='rest-adjust-dialog';dialog.setAttribute('aria-labelledby','rest-adjust-title');document.body.append(dialog);}
  const config={...structuredClone(generated),names:[...state.schedule.config.names],rulesVersion:4,fair:true,roundMinutes:[...(generated.roundMinutes||[])],workOnly:(generated.workOnly||[]).map(window=>({...window}))};
  const rows=generateSchedule(config),cycles=[...new Set(rows.filter(row=>Number.isInteger(row.cycle)).map(row=>row.cycle))].map(cycle=>{
    const parts=rows.filter(row=>row.cycle===cycle),minutes=Math.ceil(parts.reduce((sum,row)=>sum+row.end-row.start,0)/config.count);return {cycle,start:parts[0].start,end:parts.at(-1).end,minutes};
  });
  restAdjustment={config,cycles,owner:cloud.user?.id||null,signature:JSON.stringify(state.schedule)};
  dialog.innerHTML=`<form id="rest-adjust-form"><div class="dialog-head"><div><span class="eyebrow">REST PLANNER</span><h2 id="rest-adjust-title">휴식 시간 조정</h2></div><button type="button" class="icon-button" data-action="close-rest-adjust" aria-label="휴식 조정 창 닫기">${icon('close')}</button></div>
    <fieldset><legend><label class="check-label"><input type="checkbox" name="changeCycle" ${cycles.length?'':'disabled'}>이 구간의 휴식 길이 변경</label></legend><div id="rest-cycle-fields" class="form-grid"><label class="field full"><span>시간 구간 · 한 바퀴</span><select name="restCycle" ${cycles.length?'':'disabled'}>${cycles.map(cycle=>`<option value="${cycle.cycle}">${cycle.cycle+1}번째 · ${timeText(cycle.start)}–${timeText(cycle.end)}</option>`).join('')}</select></label>${field('한 사람당 휴식 (분)','cycleMinutes','number',cycles[0]?.minutes??config.interval,'min="1" max="1440" step="1" required')}</div><p class="field-hint">한 바퀴는 ${config.count}명이 차례로 쉬는 구간이에요. 선택한 길이를 모두에게 똑같이 적용하고 마지막 남은 시간은 균등하게 나눠요. 점심은 따로 유지해요.</p></fieldset>
    <fieldset><legend>휴식 없는 시간대</legend><p class="field-hint">지정한 시간에는 전원이 근무해요. 점심시간은 그대로 유지하고, 나머지 시간에 공평하게 쉬어요.</p><div id="rest-work-windows"></div><button type="button" class="button secondary small" data-action="add-work-window">${icon('plus')}시간대 추가</button></fieldset>
    <p id="rest-adjust-error" class="form-error" role="alert" hidden></p><div class="dialog-actions"><button type="button" class="button secondary" data-action="close-rest-adjust">취소</button><button type="submit" class="button primary">적용하고 재계산</button></div><button type="button" class="text-link rest-reset" data-action="reset-rest-adjust">휴식 조정 초기화</button></form>`;
  renderWorkWindows();updateRestCycleFields();dialog.showModal();
}
function updateRestCycleFields(){
  const form=$('#rest-adjust-form');if(!form)return;
  const enabled=form.elements.changeCycle.checked&&restAdjustment.cycles.length>0;
  for(const input of $$('#rest-cycle-fields input,#rest-cycle-fields select'))input.disabled=!enabled;
}
function readWorkWindows(){
  return $$('#rest-work-windows .work-window').map(row=>({start:$('[name="workStart"]',row).value,end:$('[name="workEnd"]',row).value}));
}
function renderWorkWindows(){
  $('#rest-work-windows').innerHTML=restAdjustment.config.workOnly.map((window,i)=>`<div class="work-window">${field('시작','workStart','time',window.start,'required')}${field('종료','workEnd','time',window.end,'required')}<button type="button" class="icon-button" data-action="remove-work-window" data-index="${i}" aria-label="${i+1}번째 휴식 없는 시간대 삭제">${icon('close')}</button></div>`).join('');
  const add=$('[data-action="add-work-window"]');if(add)add.disabled=restAdjustment.config.workOnly.length>=24;
}
function applyRestAdjustment(form){
  const error=$('#rest-adjust-error');
  try{
    if(!restAdjustment||restAdjustment.owner!==(cloud.user?.id||null)||restAdjustment.signature!==JSON.stringify(state.schedule))throw new Error('다른 화면이나 기기에서 근무표가 변경됐어요. 창을 닫고 최신 근무표에서 다시 조정해 주세요.');
    const config=structuredClone(restAdjustment.config);config.workOnly=readWorkWindows();
    if(form.elements.changeCycle.checked){
      const cycle=Number(form.elements.restCycle.value),minutes=Number(form.elements.cycleMinutes.value);
      if(!Number.isInteger(cycle)||!restAdjustment.cycles.some(item=>item.cycle===cycle)||!Number.isInteger(minutes)||minutes<1||minutes>1440)throw new Error('휴식시간은 1~1,440분으로 입력해 주세요.');
      while(config.roundMinutes.length<=cycle)config.roundMinutes.push(null);config.roundMinutes[cycle]=minutes;
    }
    const rows=generateSchedule(config),next=validateState({...state,schedule:{config,generatedConfig:structuredClone(config),rows}});
    state.schedule=next.schedule;persisted('휴식 시간을 공평하게 다시 계산하고 저장했어요.');$('#rest-adjust-dialog').close();restAdjustment=null;render();
  }catch(failure){error.textContent=failure.message;error.hidden=false;}
}
function taxFields(record) {
  return `<fieldset class="tax-fields"><legend>세금 공제 선택</legend><div class="choice-group tax-choices">${Object.entries(TAX_TYPES).map(([key,label])=>`<label class="choice-option"><input type="radio" name="taxType" value="${key}" ${(record.taxType??'none')===key?'checked':''}><span><strong>${label}</strong></span></label>`).join('')}</div><div class="tax-exempt-field">${field('비과세 금액 (원, 해당하는 경우만)','taxExempt','number',record.taxExempt??0,'required min="0" max="1000000000" step="1"')}</div><p class="field-hint">일용근로는 1일 급여 기준입니다. 비과세 여부와 소득 유형은 지급처에 확인하세요. 자동 계산된 세금을 기타 공제액에 중복 입력하지 마세요.</p></fieldset>`;
}
function payFields(record) {
  return `<div class="form-grid">${field('출근시간','start','time',record.start,'required')}${field('퇴근시간','end','time',record.end,'required')}${field('무급 휴게시간 (분)','breakMinutes','number',record.breakMinutes,'required min="0" max="1439" step="1"')}<label class="field"><span>급여 기준</span><select name="payType"><option value="hourly" ${record.payType==='hourly'?'selected':''}>시급</option><option value="daily" ${record.payType==='daily'?'selected':''}>일급</option></select></label>${field('시급 / 일급 (원)','rate','number',record.rate,'required min="0" max="1000000000" step="1"')}${field('추가 지급액 (원)','extra','number',record.extra,'required min="0" max="1000000000" step="1"')}${field('기타 공제액 (원)','deduction','number',record.deduction,'required min="0" max="1000000000" step="1"')}</div>${taxFields(record)}`;
}
let miniExpression='', miniAnswer='';
function miniCalculatorView() {
  return `<section class="panel mini-calculator"><div class="panel-title"><h2>${icon('calculator')}작은 계산기</h2><span class="small-badge">사칙연산</span></div><form id="mini-form"><label class="field"><span class="sr-only">계산식</span><input id="mini-expression" type="text" inputmode="decimal" maxlength="200" placeholder="예: 12000 × 8" value="${esc(miniExpression)}" autocomplete="off"></label><output id="mini-answer" aria-live="polite">${esc(miniAnswer)}</output><div class="mini-keys">${['C','⌫','(',')','7','8','9','÷','4','5','6','×','1','2','3','−','0','.','=','+'].map(key=>`<button type="button" data-action="mini-key" data-key="${key}" class="mini-key ${key==='='?'equals':''}" aria-label="${key==='C'?'계산식 초기화':key==='⌫'?'한 글자 지우기':key==='='?'계산 결과':key}">${key}</button>`).join('')}</div><p class="field-hint">키보드 입력과 Enter도 지원해요. ×·÷를 먼저 계산해요.</p></form></section>`;
}
function taxFormula(result) {
  if(result.taxType==='daily')return '일용: max(1일 과세급여 − 150,000원, 0) × 6% × (1 − 55%). 소득세 1,000원 미만은 소액부징수로 0원. 지방소득세는 소득세의 10%. 1일분씩 지급받는 기준이며 여러 날 급여를 합쳐 지급받으면 소액부징수 판단이 달라질 수 있어요.';
  if(result.taxType==='freelance')return '프리랜서: 과세 지급액 × 소득세 3% + 지방소득세(소득세의 10%). 통상 합계 3.3%이며 끝수 처리에 따라 차이가 날 수 있어요.';
  return '세금 자동 공제를 적용하지 않았어요. 일용근로 또는 프리랜서를 선택하면 예상 원천징수액을 표시해요.';
}
function calculatorView() {
  const calc=calculatorDefaults();
  return head('PAY CALCULATOR','급여 계산기','하루부터 여러 날까지, 실제 근무시간과 예상 수령액을 확인해요.')+`<div class="tool-layout"><section class="panel form-panel"><div class="panel-title"><h2>${icon('calculator')}근무 정보</h2><span class="small-badge">자동 계산</span></div><form id="calculator-form"><div class="form-grid">${field('근무 날짜','date','date',calc.date,'required min="1900-01-01" max="9999-12-31"')}${field('근무지 이름','workplace','text',calc.workplace,'maxlength="100" list="workplaces" placeholder="예: 동네 카페"')}${field('총 근무일 수','days','number',calc.days,'required min="1" max="366" step="1" inputmode="numeric"')}</div><p class="field-hint">매일 같은 조건으로 일하는 경우예요. 아래 시간·급여·공제액은 모두 1일 기준으로 입력해 주세요.</p><div class="form-divider"></div>${payFields(calc)}<p class="field-hint">퇴근이 출근보다 이르면 다음 날 퇴근으로 계산해요.</p><button class="button primary full-width" type="submit">${icon('calculator')}급여 계산하기</button></form></section><div class="pay-side"><section class="panel calculation-panel"><div class="panel-title"><h2>내 예상 수령액</h2><span class="small-badge blue-badge">세금 선택 반영</span></div><div id="calculation-result" aria-live="polite"></div><div id="calculator-error" class="form-error" role="alert" hidden></div><button class="button primary full-width" data-action="save-calculation" id="save-calculation">${icon('plus')}선택한 날짜의 1일 기록 저장</button><p class="field-hint centered">기록장에는 입력한 날짜의 하루치만 저장해요. 날짜별 기록은 각각 추가해 주세요.</p><a href="#records" class="text-link centered-link">나의 알바 기록 보기 ${icon('arrow')}</a></section>${miniCalculatorView()}</div></div><aside class="info-strip">${icon('shield')}<p><strong>입력에 따른 예상 원천징수액이에요.</strong> 전체 예상액은 1일 예상 수령액에 근무일 수를 곱한 금액입니다. 실제 소득 분류·비과세·지급 방식에 따라 달라질 수 있으며 4대보험과 최종 정산세액, 주휴·야간·연장 수당은 별도예요.</p><a href="#guide">계산 기준 ${icon('arrow')}</a></aside>${workplacesDatalist()}`;
}
function workplacesDatalist(){ return `<datalist id="workplaces">${workplaceOptions().map(name=>`<option value="${esc(name)}"></option>`).join('')}</datalist>`; }
function formValues(form){return Object.fromEntries(new FormData(form));}
function updateCalculator(showError) {
  const form=$('#calculator-form');if(!form)return;
  const data=formValues(form),error=$('#calculator-error');
  try{
    const days=Number(data.days);
    if(!/^\d+$/.test(data.days)||!Number.isInteger(days)||days<1||days>366)throw new Error('총 근무일 수는 1~366일의 정수로 입력해 주세요.');
    data.days=String(days);
    const result=calculatePay(data);error.hidden=true;
    $('#calculation-result').innerHTML=`<div class="pay-total"><span>${days}일 전체 예상 수령액</span><strong>₩${Math.round(result.expected*days).toLocaleString('ko-KR')}</strong><span class="pay-caption">${result.overnight?'자정을 넘긴 근무 · ':''}${data.payType==='hourly'?'시급제':'일급제'} · ${TAX_TYPES[result.taxType]}</span></div><dl class="calculation-breakdown"><div><dt>총 근무일 수</dt><dd>${days}일</dd></div><div><dt>1일 실근무시간</dt><dd>${duration(result.paidMinutes)}</dd></div><div class="emphasis"><dt>총 실근무시간</dt><dd>${duration(result.paidMinutes*days)}</dd></div><div><dt>1일 무급 휴게시간</dt><dd>${duration(Number(data.breakMinutes))}</dd></div><div class="breakdown-divider"><dt>1일 세전 기본급</dt><dd>${money(result.base)}</dd></div><div><dt>1일 추가 지급액</dt><dd>+ ${money(result.extra)}</dd></div><div><dt>1일 소득세</dt><dd>− ${money(result.incomeTax)}</dd></div><div><dt>1일 지방소득세</dt><dd>− ${money(result.localTax)}</dd></div><div><dt>1일 기타 공제액</dt><dd>− ${money(result.deduction)}</dd></div><div class="emphasis"><dt>1일 예상 수령액</dt><dd>${money(result.expected)}</dd></div></dl><div class="formula-note">${data.payType==='hourly'?`${result.paidMinutes}분 ÷ 60 × ${money(Number(data.rate))}`:`계약 일급 ${money(Number(data.rate))}`} = 1일 기본급 ${money(result.base)}<br>${days}일 × 1일 수령액 ${money(result.expected)} = 전체 ${money(result.expected*days)}<br>${taxFormula(result)}<br>각 날짜의 동일한 조건으로 계산한 예상액이에요. 끝수 처리: 소득세·지방소득세 각각 10원 미만 절사.</div>`;
    const saved=calcSavedHash===JSON.stringify({...data,days:'1'});
    $('#save-calculation').disabled=saved;$('#save-calculation').innerHTML=saved?`${icon('check')}이 날짜의 1일 기록을 저장했어요`:`${icon('plus')}선택한 날짜의 1일 기록 저장`;
    return data;
  }catch(failure){$('#calculation-result').innerHTML=smallEmpty('근무 정보를 확인해 주세요','올바른 시간과 금액을 입력하면 예상 수령액을 표시해요.');error.hidden=!showError;error.textContent=failure.message;$('#save-calculation').disabled=true;return null;}
}

function recordsView() {
  return head('MY WORK LOG', '나의 알바 기록', '차곡차곡 남긴 나의 하루. 근무와 입금 내역을 한곳에서 관리해요.', `<button class="button primary" data-action="add-record">${icon('plus')}알바 기록 추가</button>`) + `<section class="panel records-panel"><form id="record-filters" class="filters"><label class="field"><span>근무 월</span><input type="month" name="month" value="${esc(recordFilters.month)}" min="1900-01" max="9999-12"><small>비우면 전체 기간</small></label><label class="field"><span>근무지</span><select name="workplace"><option value="">모든 근무지</option>${workplaceOptions().map(w => `<option value="${esc(w)}" ${recordFilters.workplace === w ? 'selected' : ''}>${esc(w)}</option>`).join('')}</select></label><label class="field"><span>지급 상태</span><select name="status"><option value="">모든 상태</option>${Object.entries(STATUS).map(([key, value]) => `<option value="${key}" ${recordFilters.status === key ? 'selected' : ''}>${value}</option>`).join('')}</select></label><label class="field search-field"><span>기록 검색</span><div>${icon('search')}<input type="search" name="search" value="${esc(recordFilters.search)}" placeholder="근무지, 업무, 메모 검색"></div></label><label class="field"><span>정렬</span><select name="sort"><option value="desc" ${recordFilters.sort === 'desc' ? 'selected' : ''}>최근 날짜순</option><option value="asc" ${recordFilters.sort === 'asc' ? 'selected' : ''}>오래된 날짜순</option></select></label></form><div id="record-results" aria-live="polite"></div></section><aside class="info-strip">${icon('help')}<p>지급 상태는 입금 내역과 지급 예정일로 자동 표시돼요. 예정일이 지났고 입금이 없으면 <strong>미지급</strong>, 일부만 입금되면 <strong>일부 지급</strong>으로 표시해요. 지급 완료로 변경 버튼으로 입금일과 남은 금액을 확인하거나 기록을 열어 입금 내역을 추가하세요.</p><a href="#settings">백업 관리 ${icon('arrow')}</a></aside>`;
}
function filteredRecords() {
  return state.records.filter(r => (!recordFilters.month || r.date.startsWith(recordFilters.month)) && (!recordFilters.workplace || r.workplace === recordFilters.workplace) && (!recordFilters.status || recordStatus(r) === recordFilters.status) && `${r.workplace} ${r.task} ${r.note}`.toLowerCase().includes(recordFilters.search.toLowerCase())).sort((a, b) => recordFilters.sort === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
}
function updateRecords() {
  const records = filteredRecords();
  const expected = records.reduce((sum, r) => sum + calculatePay(r).expected, 0), received = records.reduce((sum, r) => sum + r.payments.reduce((s, p) => s + p.amount, 0), 0);
  $('#record-results').innerHTML = `<div class="record-summary"><span>총 <strong>${records.length}건</strong>의 기록</span><div>예상 <strong>${money(expected)}</strong><span class="summary-separator"></span>수령 <strong>${money(received)}</strong><button class="button ghost small" data-action="records-csv">${icon('download')}CSV</button></div></div>${records.length ? `<div class="table-scroll"><table class="records-table"><thead><tr><th scope="col">근무일 · 근무지</th><th scope="col">근무시간</th><th scope="col">예상 급여</th><th scope="col">실제 입금액</th><th scope="col">지급 상태</th><th scope="col">관리</th></tr></thead><tbody>${records.map(r => `<tr><td><strong>${esc(r.workplace)}</strong><span>${esc(r.date)}${r.task ? ' · ' + esc(r.task) : ''}</span></td><td><strong>${duration(calculatePay(r).paidMinutes)}</strong><span>${esc(r.start)}–${esc(r.end)}${calculatePay(r).overnight ? ' (+1일)' : ''}</span></td><td>${money(calculatePay(r).expected)}</td><td>${money(r.payments.reduce((s, p) => s + p.amount, 0))}</td><td><span class="status ${recordStatus(r)}">${STATUS[recordStatus(r)]}</span>${recordStatus(r)!=='paid'?`<button class="complete-payment-button" data-action="complete-payment" data-id="${esc(r.id)}">${icon('check')}지급 완료로 변경</button>`:''}${r.dueDate ? `<span class="due-date">예정 ${esc(r.dueDate)}</span>` : ''}</td><td><div class="row-actions"><button class="icon-button" data-action="edit-record" data-id="${esc(r.id)}" aria-label="${esc(r.workplace)} ${esc(r.date)} 기록 수정">${icon('edit')}</button><button class="icon-button delete-button" data-action="delete-record" data-id="${esc(r.id)}" aria-label="${esc(r.workplace)} ${esc(r.date)} 기록 삭제">${icon('trash')}</button></div></td></tr>`).join('')}</tbody></table></div><div class="workplace-summary"><h3>조회한 기록의 근무지별 수령액</h3>${[...new Set(records.map(r => r.workplace))].map(w => `<div><span>${esc(w)}</span><strong>${money(records.filter(r => r.workplace === w).reduce((sum, r) => sum + r.payments.reduce((s, p) => s + p.amount, 0), 0))}</strong></div>`).join('')}</div>` : smallEmpty(state.records.length ? '조건에 맞는 기록이 없어요' : '아직 기록된 알바가 없어요', state.records.length ? '기간이나 검색 조건을 바꿔서 다시 확인해 보세요.' : '첫 근무를 추가하고, 나의 수고를 차곡차곡 모아 보세요.', '<button class="button secondary small" data-action="add-record">' + icon('plus') + '알바 기록 추가</button>')}`;
}

function notesView() {
  const lines=state.workMemo.trim()?state.workMemo.split('\n').length:0;
  return head('WORK NOTES','업무 메모장','설명은 적어 두고, 필요한 순간 가볍게 꺼내 보세요.')+`<div class="notes-layout"><aside class="notes-sidebar"><div class="notes-collection"><span class="notes-collection-icon">${icon('notebook')}</span><div><h2>나의 업무 메모</h2><p>이 브라우저에 자동 저장</p></div>${icon('lock')}</div><div class="note-selected"><span>업무 메모</span><p>${esc(state.workMemo.trim().split('\n')[0]||'첫 업무 설명을 남겨 보세요.')}</p></div><div class="notes-sidebar-help"><h3>출근 전 체크</h3><p>담당자 연락처와 도착 장소<br>꼭 챙겨야 할 준비물<br>업무 순서와 주의사항</p><a href="#settings">메모까지 함께 백업 ${icon('chevron')}</a></div></aside>
    <section class="panel notes-panel"><div class="notes-toolbar"><div class="notes-document-title"><span class="notes-document-icon">${icon('edit')}</span><div><h2>오늘의 업무 설명</h2><p>나의 업무 메모</p></div></div><button type="button" class="button primary small memo-save-button" data-action="save-memo" data-save-state="ready" aria-label="업무 메모 저장">${icon('save')}<span>저장</span></button></div>
      <div id="memo-format-toolbar" class="memo-format-toolbar" aria-label="메모 서식"><div class="memo-format-group"><button type="button" class="memo-format-button" data-action="memo-format-bold" aria-label="굵게" aria-pressed="false"><b>B</b></button><button type="button" class="memo-format-button" data-action="memo-format-underline" aria-label="밑줄" aria-pressed="false"><u>U</u></button><label class="memo-size-label"><span class="sr-only">글자 크기</span><select id="memo-font-size" data-memo-format="size" aria-label="글자 크기">${MEMO_SIZES.map(size=>`<option value="${size}" ${size==='17px'?'selected':''}>${size.replace('px','')}</option>`).join('')}</select><span>px</span></label></div><div class="memo-format-group"><label class="memo-color-control"><span>글자색</span><input type="color" id="memo-font-color" data-memo-format="color" value="#1d1d1f" aria-label="글자색"></label><button type="button" class="memo-format-button marker-toggle" data-action="memo-format-highlight" aria-label="형광펜 마커" aria-pressed="false">${icon('edit')}</button><label class="memo-color-control"><span>마커색</span><input type="color" id="memo-highlight-color" data-memo-format="background" value="#a7f3d0" aria-label="마커색"></label></div></div>
      <div class="notes-paper"><div id="work-memo" class="notes-editor" aria-label="업무 메모 편집"></div></div>
      <div class="notes-save-state"><span id="memo-status" role="status">${state.workMemo.length.toLocaleString('ko-KR')} / 30,000자 · 브라우저 자동 저장</span><span id="memo-lines">${lines}줄</span></div><div class="notes-bottom-bar"><div class="export-actions"><button class="button secondary" data-action="copy-memo">${icon('copy')}메모 복사</button><button class="button secondary" data-action="download-memo">${icon('download')}TXT 저장</button></div><button class="button ghost" data-action="clear-memo" aria-label="메모 내용 비우기">${icon('trash')}비우기</button></div>
    </section></div><p class="notes-privacy-note">${icon('lock')}입력 즉시 이 브라우저에 저장돼요. 기기를 바꾸기 전에는 <a href="#settings">JSON 백업</a>을 해 주세요.</p>`;
}
function setupMemoEditor() {
  const element=$('#work-memo');
  if(!globalThis.Quill){element.innerHTML=`<textarea id="memo-fallback" aria-label="업무 메모" maxlength="30000">${esc(state.workMemo)}</textarea>`;$('#memo-format-toolbar').hidden=true;return;}
  const size=Quill.import('attributors/style/size');size.whitelist=MEMO_SIZES;Quill.register(size,true);
  memoQuill=new Quill(element,{theme:null,formats:['bold','underline','size','color','background'],modules:{toolbar:false,history:{delay:500,maxStack:100,userOnly:true}},placeholder:'전달받은 업무 설명을 적어 주세요.\n\n도착 장소와 연락할 담당자\n꼭 챙겨야 할 준비물\n업무 순서와 주의사항'});
  memoQuill.setContents(state.workMemoDelta||{ops:[{insert:state.workMemo+'\n'}]},'silent');
  memoQuill.root.setAttribute('role','textbox');memoQuill.root.setAttribute('aria-label','업무 메모');memoQuill.root.setAttribute('aria-multiline','true');memoQuill.root.setAttribute('spellcheck','false');
  // Quill defers its blank class until IME composition ends. Hide the hint in the native event itself.
  const root=memoQuill.root;let composing=false;
  const syncPlaceholder=()=>root.classList.toggle('memo-input-active',composing||root.textContent.length>0);
  root.addEventListener('compositionstart',()=>{composing=true;syncPlaceholder();},true);
  root.addEventListener('compositionend',()=>{composing=false;syncPlaceholder();},true);
  root.addEventListener('beforeinput',event=>{if(event.inputType?.startsWith('insert')&&!event.defaultPrevented)root.classList.add('memo-input-active');},true);
  root.addEventListener('input',syncPlaceholder,true);root.addEventListener('blur',syncPlaceholder);syncPlaceholder();
  memoQuill.on('selection-change',range=>{if(range){memoSelection={index:range.index,length:range.length};updateMemoTools();}});
  memoQuill.on('text-change',(_delta,_old,source)=>{
    syncPlaceholder();
    if(source!=='user')return;
    const text=memoQuill.getText().slice(0,-1);
    try{
      if(text.length>30000)throw new Error('메모는 30,000자까지 작성할 수 있어요.');
      const delta=validateMemoDelta(memoQuill.getContents(),text);
      state.workMemo=text;state.workMemoDelta=delta;const saved=save();updateMemoStatus(saved);setMemoSaveState(saved?'ready':'error');updateMemoTools();
    }catch(error){memoQuill.setContents(state.workMemoDelta||{ops:[{insert:state.workMemo+'\n'}]},'silent');toast(error.message);}
  });
}
function updateMemoStatus(saved=true) {
  if(!$('#memo-status'))return;
  $('#memo-lines').textContent=`${state.workMemo.trim()?state.workMemo.split('\n').length:0}줄`;
  $('#memo-status').textContent=`${state.workMemo.length.toLocaleString('ko-KR')} / 30,000자 · ${saved?(cloud.user?'기기에 저장됨 · 계정 자동 동기화':'브라우저 자동 저장'):'저장되지 않음 · JSON 백업 필요'}`;
}
function setMemoSaveState(status) {
  const button=$('[data-action="save-memo"]');if(!button)return;
  const saved=status==='saved',failed=status==='error';
  button.dataset.saveState=status;
  button.innerHTML=icon(saved?'saved':failed?'warning':'save')+`<span>${saved?'저장 완료':failed?'다시 저장':'저장'}</span>`;
  // This acknowledges device storage. Account upload is reported separately.
  button.setAttribute('aria-label',saved?'메모 저장 완료 · 이 기기에 저장됨':failed?'메모 저장 실패 · 다시 저장':'업무 메모 저장');
  button.title=saved?'이 기기에 저장했어요.':'업무 메모 저장';
}
function updateMemoTools() {
  if(!memoQuill||!$('#memo-format-toolbar'))return;
  const range=memoQuill.getSelection()||memoSelection,format=memoQuill.getFormat(Math.min(range.index,memoQuill.getLength()-1),range.length);
  for(const [action,active] of [['bold',format.bold===true],['underline',format.underline===true],['highlight',typeof format.background==='string']])$(`[data-action="memo-format-${action}"]`).setAttribute('aria-pressed',String(active));
  $('#memo-font-size').value=MEMO_SIZES.includes(format.size)?format.size:'17px';
  if(typeof format.color==='string'&&/^#[a-f0-9]{6}$/i.test(format.color))$('#memo-font-color').value=format.color;
  if(typeof format.background==='string'&&/^#[a-f0-9]{6}$/i.test(format.background))$('#memo-highlight-color').value=format.background;
}
function formatMemo(key,value) {
  if(!memoQuill)return;
  const max=memoQuill.getLength()-1,range=memoQuill.getSelection()||memoSelection,index=Math.min(range.index,max),length=Math.min(range.length,max-index);
  memoQuill.focus();memoQuill.setSelection(index,length,'silent');
  const format=memoQuill.getFormat(index,length);
  if(key==='bold'||key==='underline')value=format[key]!==true;
  if(key==='highlight'){key='background';value=format.background?false:$('#memo-highlight-color').value;}
  if(length)memoQuill.formatText(index,length,key,value,'user');else memoQuill.format(key,value,'user');
  if(key==='background'&&value&&!format.color){if(length)memoQuill.formatText(index,length,'color','#1d1d1f','user');else memoQuill.format('color','#1d1d1f','user');}
  memoSelection={index,length};updateMemoTools();
}
function newFeaturesGuide() {
  return `<section class="panel tax-guide"><h2>세금 유형별 예상 수령액</h2><p><strong>일용근로소득:</strong> 1일 과세급여에서 150,000원을 공제한 금액에 6% 세율과 55% 세액공제를 적용합니다. 일일 산식은 max(과세급여 − 150,000, 0) × 0.06 × 0.45입니다. 소득세가 1,000원 미만이면 소액부징수로 0원, 지방소득세는 계산된 소득세의 10%입니다. 소득세와 지방소득세는 각각 10원 미만을 절사합니다. 1일 200,000원이면 소득세 1,350원, 지방소득세 130원, 예상 수령액은 198,520원입니다.</p><p>이 계산은 기록 1건이 1일분이고 따로 지급받는 기준입니다. 여러 날의 급여를 한 번에 받는 경우 소액부징수 기준이 달라질 수 있으므로 지급처의 원천징수 명세서를 확인하세요. 근무 기간 등 법상 일용근로 요건에 해당할 때 선택해야 합니다.</p><p><strong>프리랜서:</strong> 사업소득 원천징수 대상인 경우 과세 지급액의 3%를 소득세로, 소득세의 10%를 지방소득세로 계산합니다. 통상 총 3.3%이며 끝수 처리로 차이가 날 수 있습니다. 200,000원이면 합계 6,600원 공제, 예상 수령액은 193,400원입니다. 4대보험과 최종 종합소득세 정산은 포함하지 않습니다.</p><p>추가 지급액도 기본적으로 과세금액에 포함합니다. 지급처에서 확인한 비과세 금액만 별도로 입력하세요. 자동 계산되는 세금을 기타 공제액에 다시 넣으면 중복 차감됩니다. 기존 기록은 세금 유형을 바꾸기 전까지 공제 안 함으로 보존됩니다.</p><p>법령 참고: <a href="https://www.law.go.kr/법령/소득세법/제47조" target="_blank" rel="noopener noreferrer">근로소득공제</a> · <a href="https://www.law.go.kr/법령/소득세법/제59조" target="_blank" rel="noopener noreferrer">근로소득세액공제</a> · <a href="https://www.law.go.kr/법령/소득세법/제129조" target="_blank" rel="noopener noreferrer">원천징수 세율</a> · <a href="https://www.nts.go.kr/nts/main.do" target="_blank" rel="noopener noreferrer">국세청 안내</a></p></section><button type="button" class="updates-trigger" data-action="open-updates"><span class="updates-trigger-icon">${icon('sparkle')}</span><span><strong>업데이트 내역</strong><small>새로운 근무 관리 도구를 확인해 보세요.</small></span>${icon('chevron')}</button>`;
}
function openUpdates() {
  const dialog=ensureAppDialog('updates-dialog','updates-title');
  dialog.innerHTML=`<div class="dialog-head"><div><p class="eyebrow">WHAT’S NEW</p><h2 id="updates-title">업데이트 내역</h2></div><button type="button" class="icon-button" data-action="close-updates" aria-label="업데이트 내역 닫기">${icon('close')}</button></div><div class="updates-layout"><section class="updates-content"><span class="update-date">2026.10.17 · FREETER UPDATE</span><h3>새로운 근무 관리 도구</h3><p class="updates-intro">곰씨와 함께, 오늘의 일을 조금 더 편하게.</p><ul class="update-list"><li><span>${icon('calendar')}</span><div><h4>우리 현장에 맞는 교대</h4><p>3인 밀어내기·2인 맞교대, 모두 함께·1명씩·2명 먼저 점심을 선택해요. 모바일에서도 표를 한눈에 볼 수 있어요.</p></div></li><li><span>${icon('calculator')}</span><div><h4>세금까지 계산하는 급여</h4><p>일용근로소득과 프리랜서 3.3%를 선택하고 예상 수령액을 확인해요. 작은 계산기로 추가 계산도 할 수 있어요.</p></div></li><li><span>${icon('check')}</span><div><h4>받은 급여는 지급 완료</h4><p>실제 입금일과 금액을 남기면 지급 상태와 수입 통계에 함께 반영돼요.</p></div></li><li><span>${icon('edit')}</span><div><h4>입력 즉시 반응하는 업무 메모</h4><p>한글을 입력하는 순간 안내 문구가 사라져요. 굵게·크기·밑줄·글자색·형광펜으로 중요한 내용을 표시해요. 입력 즉시 자동 저장하고 저장 버튼으로도 바로 저장해요. JSON 백업에도 서식이 유지돼요.</p></div></li><li><span>${icon('sun')}</span><div><h4>곰씨가 알려주는 오늘 날씨</h4><p>상단 날씨 버튼에서 기온·습도·자외선·일출·일몰·미세먼지를 확인해요. 지역을 고르거나 내 위치를 사용할 수 있어요.</p></div></li></ul></section><aside class="updates-mascot"><img src="./assets/gomssi.png" width="240" height="280" alt="노란 안전모와 작업 조끼를 입고 인사하는 노가다 곰씨"><span>노가다 곰씨</span><p>오늘도 안전하게,<br>기록은 꼼꼼하게.</p></aside></div>`;
  dialog.showModal();
}
function ensureAppDialog(id,label) {
  let dialog=document.getElementById(id);
  if(!dialog){dialog=document.createElement('dialog');dialog.id=id;dialog.setAttribute('aria-labelledby',label);document.body.append(dialog);}
  return dialog;
}
function openCompletePayment(id) {
  const record=state.records.find(r=>r.id===id);if(!record)return;
  const remaining=Math.max(0,calculatePay(record).expected-record.payments.reduce((s,p)=>s+p.amount,0));
  if(!remaining){toast('이미 지급 완료된 기록이에요.');return;}
  const dialog=$('#record-dialog');
  dialog.innerHTML=`<div class="dialog-head"><h2 id="record-dialog-title">지급 완료로 변경</h2><button class="icon-button" data-action="close-record" aria-label="입금 등록 닫기">${icon('close')}</button></div><p class="field-hint">${esc(record.date)} · ${esc(record.workplace)}<br>아직 받지 않은 예상 수령액 ${money(remaining)}을 입금 내역으로 추가합니다. 실제 입금일과 금액을 확인해 주세요.</p><form id="complete-payment-form" data-id="${esc(record.id)}"><div class="form-grid">${field('실제 입금일','date','date',today(),'required min="1900-01-01" max="9999-12-31"')}${field('추가 입금액 (원)','amount','number',remaining,'required min="1" max="1000000000" step="1"')}</div><div id="complete-payment-error" class="form-error" role="alert" hidden></div><div class="dialog-actions"><button type="button" class="button secondary" data-action="close-record">취소</button><button type="submit" class="button primary">${icon('check')}입금 기록하고 지급 완료</button></div></form>`;
  dialog.showModal();
}
function calculateMini() {
  try{const result=evaluateExpression(miniExpression);miniAnswer=`= ${result.toLocaleString('ko-KR',{maximumFractionDigits:12})}`;miniExpression=String(result);$('#mini-expression').value=miniExpression;$('#mini-answer').textContent=miniAnswer;}
  catch(failure){$('#mini-answer').textContent=failure.message;}
}

function applicationsView() {
  return head('MY APPLICATIONS','알바 지원','지원한 공고, 나의 경력, 문자 지원 양식을 한곳에 모아 두세요.')+`<div class="applications-layout"><section class="panel application-board" aria-labelledby="application-board-title"><div class="panel-title"><div><h2 id="application-board-title"><img src="./assets/applications-icon.png?v=${APP_RELEASE}" width="39" height="39" alt="">지원한 알바 공고</h2><p>제목을 누르면 공고 내용과 링크를 볼 수 있어요.</p></div><button type="button" class="button primary" data-action="new-application">${icon('plus')}공고 작성</button></div><label class="field application-search"><span>제목 검색</span><input id="application-search" type="search" maxlength="160" placeholder="찾는 공고 제목" value="${esc(applicationSearch)}"></label><div id="application-list" aria-live="polite"></div></section><div class="application-writing"><section class="panel application-note"><div class="panel-title"><h2>${icon('notebook')}단기 알바 경력</h2><button type="button" class="button secondary small" data-action="copy-career">${icon('copy')}복사</button></div><label class="field"><span>참여한 행사와 업무 경험</span><textarea id="application-career" maxlength="30000" rows="9" placeholder="예: 2026.10 전시회 안내 · 3일\n입장 안내, 관람객 응대, 물품 정리">${esc(state.applicationCareer)}</textarea></label><p id="career-save-state" class="application-save-state" role="status">${state.applicationCareer.length.toLocaleString('ko-KR')} / 30,000자 · 자동 저장</p></section><section class="panel application-note"><div class="panel-title"><h2>${icon('edit')}문자 지원 양식</h2><button type="button" class="button secondary small" data-action="copy-application-template">${icon('copy')}복사</button></div><p class="field-hint">행사명/이름/나이/거주지/경력사항 순서로 작성해 보세요.</p><label class="field"><span>나의 문자 지원 내용</span><textarea id="application-template" maxlength="30000" rows="6" placeholder="행사명/이름/나이/거주지/경력사항">${esc(state.applicationTemplate)}</textarea></label><p id="template-save-state" class="application-save-state" role="status">${state.applicationTemplate.length.toLocaleString('ko-KR')} / 30,000자 · 자동 저장</p></section></div></div>`;
}
function renderApplicationList() {
  const host=$('#application-list');if(!host)return;
  const posts=state.applications.filter(post=>post.title.toLocaleLowerCase('ko-KR').includes(applicationSearch.trim().toLocaleLowerCase('ko-KR'))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id));
  const pages=Math.max(1,Math.ceil(posts.length/10));applicationPage=Math.max(0,Math.min(applicationPage,pages-1));
  const shown=posts.slice(applicationPage*10,applicationPage*10+10);
  host.innerHTML=`<div class="application-list-caption"><span>${posts.length.toLocaleString('ko-KR')}개의 공고</span><span>제목</span></div>${shown.length?`<ul class="application-titles">${shown.map(post=>`<li><button type="button" data-action="view-application" data-id="${esc(post.id)}" title="${esc(post.title)}"><span>${esc(post.title)}</span>${icon('chevron')}</button></li>`).join('')}</ul>`:smallEmpty(applicationSearch?'검색한 제목이 없어요':'지원한 공고를 모아 보세요',applicationSearch?'다른 제목으로 검색해 보세요.':'지원 내용이나 모집 조건을 남기면 다시 찾기 쉬워요.')}<div class="application-pagination"><button type="button" class="button secondary small" data-action="application-prev" ${applicationPage===0?'disabled':''}>이전</button><span>${applicationPage+1} / ${pages}</span><button type="button" class="button secondary small" data-action="application-next" ${applicationPage>=pages-1?'disabled':''}>다음</button></div>`;
}
function openApplication(id, edit=false) {
  const post=id?state.applications.find(post=>post.id===id):null;
  if(id&&!post){toast('공고가 변경되었거나 삭제됐어요.');return;}
  const dialog=ensureAppDialog('application-dialog','application-dialog-title');
  dialog.dataset.owner=cloud.user?.id||'guest';dialog.dataset.id=post?.id||'';dialog.dataset.base=JSON.stringify(post);
  if(edit||!post){
    dialog.innerHTML=`<div class="dialog-head"><h2 id="application-dialog-title">${post?'공고 수정':'지원한 공고 작성'}</h2><button type="button" class="icon-button" data-action="close-application" aria-label="공고 창 닫기">${icon('close')}</button></div><form id="application-form"><label class="field"><span>공고 제목</span><input name="title" maxlength="160" required placeholder="예: 10월 전시회 안내 스태프" value="${esc(post?.title||'')}"></label><label class="field"><span>공고 링크 (선택)</span><input name="url" type="url" maxlength="2000" placeholder="https://" value="${esc(post?.url||'')}"></label><label class="field"><span>지원 내용·모집 조건</span><textarea name="body" maxlength="20000" rows="9" placeholder="지원 일자, 근무 시간, 급여, 연락처 등을 적어 두세요.">${esc(post?.body||'')}</textarea></label><p id="application-error" class="form-error" role="alert" hidden></p><div class="dialog-actions"><button type="button" class="button secondary" data-action="close-application">취소</button><button class="button primary" type="submit">${icon('check')}저장</button></div></form>`;
  }else{
    dialog.innerHTML=`<div class="dialog-head"><h2 id="application-dialog-title">${esc(post.title)}</h2><button type="button" class="icon-button" data-action="close-application" aria-label="공고 창 닫기">${icon('close')}</button></div><p class="application-post-date">수정 ${esc(new Date(post.updatedAt).toLocaleDateString('ko-KR'))}</p>${post.url?`<a class="button secondary application-open-link" href="${esc(post.url)}" target="_blank" rel="noopener noreferrer">공고 링크 열기 ${icon('arrow')}</a>`:''}<div class="application-post-body">${esc(post.body||'아직 작성한 내용이 없어요.')}</div><div class="dialog-actions"><button type="button" class="button danger-outline" data-action="delete-application" data-id="${esc(post.id)}">삭제</button><button type="button" class="button primary" data-action="edit-application" data-id="${esc(post.id)}">수정</button></div>`;
  }
  if(!dialog.open)dialog.showModal();
  if(edit||!post)dialog.querySelector('[name="title"]')?.focus();
}
function saveApplication(form) {
  const dialog=$('#application-dialog'),values=formValues(form),error=$('#application-error');
  try{
    if(dialog.dataset.owner!==(cloud.user?.id||'guest'))throw new Error('계정이 변경되어 저장하지 않았어요.');
    const id=dialog.dataset.id,existing=id?state.applications.find(post=>post.id===id):null;
    if(JSON.stringify(existing??null)!==dialog.dataset.base)throw new Error('다른 화면에서 공고가 변경됐어요. 입력한 내용을 복사한 뒤 다시 열어 주세요.');
    if(!id&&state.applications.length>=2000)throw new Error('공고는 2,000개까지 저장할 수 있어요. JSON으로 백업한 뒤 정리해 주세요.');
    const now=new Date().toISOString(),post=validateApplication({id:id||crypto.randomUUID(),title:values.title,body:values.body,url:values.url.trim(),createdAt:existing?.createdAt||now,updatedAt:now});
    if(id)state.applications[state.applications.findIndex(item=>item.id===id)]=post;else state.applications.push(post);
    applicationSearch='';applicationPage=0;persisted('지원 공고를 저장했어요.');dialog.close();render();
  }catch(failure){error.hidden=false;error.textContent=failure.message;}
}

function statsView() {
  const stats = monthStats(state.records, statsMonth);
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(`${statsMonth}-15T12:00:00`);
    d.setMonth(d.getMonth() - (5 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const comparison = months.map(month => ({ month, ...monthStats(state.records, month) }));
  const max = Math.max(1, ...comparison.flatMap(s => [s.expected, s.cash]));
  const workplaces = [...new Set(stats.work.map(r => r.workplace))];
  return head('INCOME INSIGHTS', '수입 통계', '나의 수고를 숫자로 확인해요. 일한 달과 돈을 받은 달을 구분해 보여드려요.', `<label class="month-control"><span class="sr-only">통계 근무 월</span><input type="month" id="stats-month" value="${statsMonth}" min="1901-01" max="9999-12" required></label>`) + `<div class="summary-grid stats-summary">${summaryCard('calendar', 'blue', '총 근무 일수', `${stats.days}<small>일</small>`, `${duration(stats.minutes)} 유급 근무`)}${summaryCard('wallet', 'purple', '예상 급여', numberWon(stats.expected), `${monthLabel(statsMonth)} 근무 기준`)}${summaryCard('check', 'green', '실제 입금액', numberWon(stats.cash), `${monthLabel(statsMonth)} 입금일 기준`)}${summaryCard('clock', 'orange', '미수령 급여', numberWon(stats.outstanding), '선택한 달 근무의 남은 급여')}</div><div class="stats-layout"><section class="panel chart-panel"><div class="section-heading"><div><h2>월별 수입 비교</h2><p>최근 6개월, 수입의 흐름을 살펴보세요.</p></div><div class="chart-legend"><span><i class="legend-dot expected"></i>근무 월 예상</span><span><i class="legend-dot cash"></i>입금 월 실제</span></div></div><div class="chart" role="img" aria-label="${esc(comparison.map(s => `${monthLabel(s.month)}: 근무 예상 ${money(s.expected)}, 실제 입금 ${money(s.cash)}`).join('. '))}"><div class="chart-y"><span>${money(max)}</span><span>${money(Math.round(max / 2))}</span><span>0원</span></div><div class="chart-plot">${comparison.map(s => `<div class="chart-group"><div class="bar-pair"><div class="chart-bar expected" style="--bar-height:${s.expected / max * 100}%" title="근무 월 예상 ${money(s.expected)}"><span class="sr-only">${money(s.expected)}</span></div><div class="chart-bar cash" style="--bar-height:${s.cash / max * 100}%" title="입금 월 실제 ${money(s.cash)}"><span class="sr-only">${money(s.cash)}</span></div></div><span class="chart-month ${s.month === statsMonth ? 'selected' : ''}">${Number(s.month.slice(5))}월</span></div>`).join('')}</div></div><details class="chart-data"><summary>수입 비교를 표로 보기</summary><div class="table-scroll"><table><thead><tr><th scope="col">월</th><th scope="col">근무 예상</th><th scope="col">실제 입금</th></tr></thead><tbody>${comparison.map(s => `<tr><th scope="row">${s.month}</th><td>${money(s.expected)}</td><td>${money(s.cash)}</td></tr>`).join('')}</tbody></table></div></details></section><section class="panel workplace-panel"><h2>근무지별 수입</h2><p class="panel-subtitle">선택한 달에 근무한 기록 기준</p>${workplaces.length ? `<div class="workplace-stats">${workplaces.map((w, i) => {
    const group = stats.work.filter(r => r.workplace === w), expected = group.reduce((s, r) => s + calculatePay(r).expected, 0), received = group.reduce((s, r) => s + r.payments.reduce((t, p) => t + p.amount, 0), 0);
    return `<div><div class="workplace-stat-label"><span><i class="workplace-dot color-${i % 4}"></i>${esc(w)}</span><strong>${money(expected)}</strong></div><div class="progress-track"><span class="color-${i % 4}" style="width:${stats.expected ? expected / stats.expected * 100 : 0}%"></span></div><small>근무 예상 · 해당 기록 수령 ${money(received)}</small></div>`;
  }).join('')}</div>` : smallEmpty('수입이 쌓일 공간이에요', '알바를 기록하면 근무지별 수입을 보여드려요.')}</section></div><aside class="info-strip">${icon('help')}<p><strong>같은 달의 예상액과 입금액은 다를 수 있어요.</strong> 예를 들어 9월 근무 급여가 10월에 입금되면, 예상은 9월에 실제 입금은 10월에 집계해요. 미수령은 선택한 근무 월 기록의 모든 입금을 반영하며, 초과 입금이 다른 기록의 미수령액을 줄이지 않아요.</p></aside>`;
}

function serverVerifiedLabel(view) {
  if(view.verifiedAt)return '최근 서버 확인 · '+new Date(view.verifiedAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})+(view.pending?' · 새 변경 사항 전송 대기':'');
  return ['loading','syncing'].includes(view.phase)?'Supabase 서버의 저장 상태를 확인하고 있어요.':'서버 응답 대기 · 이 기기에 저장된 기록으로 자동 재시도해요.';
}
function accountContent() {
  const view=cloud.snapshot;
  const status=`<p class="account-status" data-cloud-status data-status="${esc(view.phase)}" role="status">${esc(view.label)}</p>`;
  if(!view.user)return `<div class="account-intro"><span class="feature-icon orange">${icon('user')}</span><div><h3>어디서든, 나의 기록</h3><p>등록된 Google 계정 전용 공간이에요. 같은 계정으로 PC·모바일의 기록과 메모를 함께 볼 수 있어요.</p></div></div>${status}<button class="button google-login" data-action="google-login" ${!view.configured||view.phase==='loading'?'disabled':''}><span class="google-mark" aria-hidden="true">G</span>Google로 계속하기</button><p class="field-hint">로그인 전 기록은 이 브라우저에 별도로 남아요. 로그인 후 직접 가져올 수 있습니다. <a href="./privacy.html" class="text-link">개인정보 안내</a></p>`;
  return `<p class="account-email">${esc(view.user.email||'Google 계정')}</p>${status}<p class="field-hint" data-cloud-verified>${esc(serverVerifiedLabel(view))}</p><div class="account-actions"><button class="button primary small" data-action="account-sync">${icon('check')}지금 동기화</button><button class="button secondary small" data-action="account-import">브라우저 기록 가져오기</button>${!cloud.config?.allowedEmailHash?'<button class="button secondary small" data-action="account-switch">다른 Google 계정으로 로그인</button>':''}<button class="button ghost small" data-action="account-logout">로그아웃</button></div><div class="account-conflict" data-cloud-conflict ${view.phase==='conflict'?'':'hidden'}><h3>같은 내용을 다른 기기에서 수정했어요.</h3><p>자동 덮어쓰기를 멈췄어요. 현재 기록을 JSON으로 백업한 뒤 사용할 내용을 선택하세요. 선택 전 두 기록을 모두 백업합니다.</p><div class="account-actions"><button class="button secondary small" data-action="account-use-remote">서버 기록 사용</button><button class="button secondary small" data-action="account-use-local">이 기기 기록 사용</button></div></div><p class="field-hint">변경 사항은 자동으로 저장되며, 다른 기기의 내용은 약 10초 간격으로 확인해요. 서버 전송 전 로그아웃한 기록은 이 기기에 계정별로 보관하고, 같은 Google 계정으로 다시 로그인하면 전송합니다.</p>`;
}
function accountCard() { return `<section class="panel settings-card wide account-card"><h2>내 계정 · 동기화</h2>${accountContent()}</section>`; }
function openAccount() {
  const dialog=ensureAppDialog('account-dialog','account-title');
  dialog.innerHTML=`<div class="dialog-head"><div><p class="eyebrow">MY FREETER</p><h2 id="account-title">내 계정 · 동기화</h2></div><button type="button" class="icon-button" data-action="close-account" aria-label="계정 창 닫기">${icon('close')}</button></div><div id="account-content">${accountContent()}</div>`;
  dialog.showModal();
}
let accountRenderIdentity='';
function updateCloudUI(view=cloud.snapshot) {
  $('#main').inert=view.signingOut===true;
  for(const node of $$('[data-cloud-status]')){node.textContent=view.label;node.dataset.status=view.phase;}
  for(const node of $$('[data-cloud-verified]'))node.textContent=serverVerifiedLabel(view);
  for(const node of $$('[data-cloud-conflict]'))node.hidden=view.phase!=='conflict';
  for(const node of $$('.account-top-link')){node.setAttribute('aria-label',view.user?'내 계정 및 동기화':'Google 로그인 및 계정');node.dataset.signedIn=String(!!view.user);}
  const identity=(view.user?.id||'guest')+':'+(view.phase==='loading');
  if(identity!==accountRenderIdentity){
    accountRenderIdentity=identity;
    if($('#account-dialog')?.open)$('#account-content').innerHTML=accountContent();
    if($('.account-card'))$('.account-card').innerHTML='<h2>내 계정 · 동기화</h2>'+accountContent();
  }
}
let visibleAccountId=null;
function resetScopeDialogs() {
  if($('#confirm-dialog').open)$('#confirm-dialog').dispatchEvent(new Event('cancel',{cancelable:true}));
  $('#record-dialog').close();
  $('#application-dialog')?.close();
  $('#rest-adjust-dialog')?.close();restAdjustment=null;
}
function applyAccountWorkspace(next) {
  const changedAccount=visibleAccountId!==cloud.user?.id;
  if(changedAccount){resetScopeDialogs();visibleAccountId=cloud.user?.id||null;}
  const memoChanged=state.workMemo!==next.workMemo||!sameMemoDelta(state.workMemoDelta,next.workMemoDelta);
  state=next;storageBlocked=cloud.cacheBlocked===true;rawStored=storageBlocked?browserStorage.getItem(cloud.cacheKey):JSON.stringify(next);calcSavedHash='';
  if(changedAccount){render();return;}
  if(page==='applications'){
    for(const [selector,key]of [['#application-career','applicationCareer'],['#application-template','applicationTemplate']]){const input=$(selector);if(input&&input.value!==state[key]){const focused=document.activeElement===input,start=input.selectionStart,end=input.selectionEnd;input.value=state[key];if(focused)input.setSelectionRange(Math.min(start,input.value.length),Math.min(end,input.value.length));}const status=$(selector==='#application-career'?'#career-save-state':'#template-save-state');if(status)status.textContent=state[key].length.toLocaleString('ko-KR')+' / 30,000자 · 자동 저장';}
    renderApplicationList();applyTheme();return;
  }
  if(page==='notes'&&memoQuill){
    if(memoChanged){const range=memoQuill.getSelection();memoQuill.setContents(state.workMemoDelta||{ops:[{insert:state.workMemo+'\n'}]},'silent');setMemoSaveState('ready');if(range){const index=Math.min(range.index,memoQuill.getLength()-1);memoQuill.setSelection(index,Math.min(range.length,memoQuill.getLength()-1-index),'silent');}}
    updateMemoStatus();updateMemoTools();applyTheme();
  }else if($('#record-dialog').open||document.activeElement?.closest('form')){applyTheme();if(activeTool()==='records')updateRecords();}
  else render();
  updateCloudUI();
}
const sameMemoDelta=equalWorkspaceData;
function returnToGuest() {
  resetScopeDialogs();visibleAccountId=null;storageBlocked=false;rawStored=null;
  try{rawStored=localStorage.getItem(STORAGE_KEY);state=rawStored?validateState(JSON.parse(rawStored)):emptyState();}
  catch{state=emptyState();storageBlocked=true;}
  $('#storage-alert').hidden=!storageBlocked;calcSavedHash='';render();
}
function guestWorkspace() {
  const raw=localStorage.getItem(STORAGE_KEY);return raw?validateState(JSON.parse(raw)):emptyState();
}
async function importGuestWorkspace() {
  const incoming=guestWorkspace();
  if(!await confirmAction(`계정의 현재 기록 ${state.records.length}건과 메모·근무표를 이 브라우저의 로그인 전 기록 ${incoming.records.length}건으로 교체합니다. 현재 계정 기록을 먼저 JSON으로 백업합니다. 브라우저의 원래 기록은 유지됩니다.`,'브라우저 기록을 계정으로 가져올까요?','가져오기'))return;
  download(JSON.stringify(state,null,2),`Freeter-before-import-${today()}.json`,'application/json;charset=utf-8');
  if(!cloud.save(incoming,{reset:true}))throw new Error(cloud.snapshot.label);
  state=incoming;rawStored=JSON.stringify(state);render();toast('브라우저 기록을 가져왔어요. 계정 저장 상태를 확인해 주세요.');
}

function settingsView() {
  return head('YOUR DATA, YOUR CONTROL', '데이터 · 설정', '내 기록은 나의 것. 주기적인 백업으로 안전하게 보관해 주세요.') + `<div class="settings-grid">${accountCard()}<section class="panel settings-card"><span class="feature-icon blue">${icon('download')}</span><h2>백업과 복원</h2><p>지원 공고, 경력과 문자 양식, 근무표, 알바·입금 기록과 메모를 하나의 JSON 파일로 보관해요. 다른 기기에서는 이 파일을 불러오세요.</p><div class="stack-actions"><button class="button primary" data-action="backup">${icon('download')}전체 기록 JSON 다운로드</button><button class="button secondary" data-action="restore">${icon('upload')}JSON 파일 불러오기 · 복원</button><button class="button ghost" data-action="all-records-csv">${icon('download')}전체 알바 기록 CSV 다운로드</button>${rawStored !== null ? '<button class="button ghost" data-action="raw-backup">기존 브라우저 저장 원본 다운로드</button>' : ''}</div><input type="file" id="restore-file" accept=".json,application/json" hidden><p class="field-hint">복원 전 파일 구조를 검사하고 덮어쓰기 여부를 확인해요.<br>CSV는 엑셀 열람용이에요. 복원하려면 JSON을 사용해 주세요.</p></section><section class="panel settings-card"><span class="feature-icon purple">${icon('moon')}</span><h2>내게 편한 화면</h2><p>늦은 시간에도 편안하게. 테마 설정도 이 브라우저에 저장돼요.</p><div class="theme-options"><button class="theme-option ${effectiveTheme() === 'light' ? 'selected' : ''}" data-action="set-theme" data-theme="light">${icon('sun')}라이트 모드</button><button class="theme-option ${effectiveTheme() === 'dark' ? 'selected' : ''}" data-action="set-theme" data-theme="dark">${icon('moon')}다크 모드</button></div><div class="data-count"><span>이 브라우저의 알바 기록</span><strong>${state.records.length}건</strong></div><p class="field-hint">저장 형식 버전 ${VERSION} · ${cloud.user?'계정별 저장':'브라우저 저장'}</p></section><section class="panel settings-card wide"><div class="privacy-info">${icon('shield')}<div><h2>브라우저 저장, 꼭 알아두세요</h2><ul><li>로그인하면 계정에 저장하고 다른 기기와 동기화해요. 로그인 전 기록은 이 브라우저에 별도로 보관돼요.</li><li>시크릿 모드를 종료하거나 브라우저 데이터를 지우면 기록이 사라질 수 있어요.</li><li>공용 PC에서는 같은 브라우저를 쓰는 다른 사람에게 기록이 보일 수 있어요.</li><li>JSON과 CSV 백업 파일에도 개인 기록이 담겨 있어요. 안전한 곳에 보관해 주세요.</li></ul><a class="text-link" href="#privacy">개인정보 안내 자세히 보기 ${icon('arrow')}</a></div></div></section><section class="panel settings-card wide danger-zone"><div><h2>전체 데이터 삭제</h2><p>이 서비스의 근무표·근무 기록·입금 내역·설정을 모두 삭제해요. 되돌릴 수 없으니 먼저 백업해 주세요.</p></div><button class="button danger-outline" data-action="delete-all">${icon('trash')}전체 삭제</button></section></div>`;
}
function guideView() {
  return head('A LITTLE HELP', '처음이어도 괜찮아요.', '복잡한 건 줄이고, 나의 하루에 집중하세요. 서비스 사용법을 알려드릴게요.') + `<div class="guide-grid"><article class="panel guide-card"><span class="guide-step">01</span><h2>세 사람이 함께하는 밀어내기 근무표</h2><p>이름, 일정, 점심시간, 교대 간격과 첫 휴식자를 입력하고 근무표를 생성하세요. 각 근무 구간에는 두 명 근무, 한 명 휴식이 배정됩니다.</p><p>함께 식사할 때는 모두 쉬고, 교대 식사에서는 식사하지 않는 사람이 근무합니다. 휴식은 A→B→C 순서를 유지하고 점심 교대 후에도 남은 순서를 이어갑니다.</p><p><strong>10:00–19:00, 점심 10:00–11:00, 1시간 교대, 첫 휴식자 A</strong>에 공평 배분을 켜면 A·B·C 모두 5시간 20분 근무하고, 식사 외 휴식은 2시간 40분씩 배정됩니다.</p><p>공평하게 배분은 모두 설정한 간격만큼 한 바퀴씩 쉰 뒤 마지막 남은 시간을 나눕니다. 1시간이 남으면 20분씩, 30분이 남으면 10분씩 쉬어요. 분 단위로 나누어떨어지지 않으면 최대 1분 차이가 납니다. 수동 변경 후에는 실제 차이를 다시 보여드립니다.</p><p>표의 휴식자 선택으로 배정을 조정하고 PNG·CSV·텍스트로 공유하세요. 이름을 바꾸면 표에도 바로 반영돼요. 시간이나 규칙을 바꾸면 생성 버튼을 다시 눌러 주세요.</p><a class="text-link" href="#schedule">근무표 만들기 ${icon('arrow')}</a></article><article class="panel guide-card"><span class="guide-step">02</span><h2>내 예상 급여 계산하기</h2><p><strong>시급제:</strong> (전체 근무시간 − 무급 휴게시간) ÷ 60 × 시급. 분 단위로 계산한 뒤 기본급을 원 단위로 반올림합니다.</p><div class="guide-example">10:00–19:00 · 휴게 60분 · 시급 12,000원<br><strong>유급 8시간 × 12,000원 = 96,000원</strong></div><p><strong>일급제:</strong> 근무시간과 관계없이 입력한 계약 일급을 기본급으로 사용합니다. 추가 지급액을 더하고 직접 입력한 공제액을 빼면 최종 예상액이 됩니다.</p><p>자정을 넘는 근무를 지원하며, 같은 출퇴근 시각은 0시간과 24시간을 구분할 수 없어 허용하지 않아요. 선택한 세금 유형의 공제를 계산합니다. 주휴·야간·연장 수당은 자동 적용하지 않습니다. 실제 근로 조건과 법정 수당은 별도로 확인해 주세요.</p><a class="text-link" href="#calculator">급여 계산하기 ${icon('arrow')}</a></article><article class="panel guide-card"><span class="guide-step">03</span><h2>근무 기록과 입금 관리하기</h2><p>급여 계산기에서 근무일과 근무지를 입력하고 저장하거나, 기록장에서 직접 알바를 추가하세요. 업무·지급 예정일·메모도 남길 수 있습니다.</p><p>입금이 생길 때마다 기록을 열어 <strong>입금 내역 추가</strong>로 금액과 날짜를 남기세요. 여러 번 나눠 받은 내역도 그대로 관리할 수 있어요. 총입금이 예상액 이상이면 지급 완료, 일부 입금이면 일부 지급, 미입금이고 예정일이 지났으면 미지급, 나머지는 지급 예정으로 표시됩니다.</p><p>월별 실적은 <strong>근무 날짜</strong>, 실제 현금 수입은 <strong>입금 날짜</strong>로 집계됩니다. 미수령액은 각 기록의 예상액에서 입금액을 뺀 금액(최소 0원)의 합계입니다.</p><a class="text-link" href="#records">나의 기록장 열기 ${icon('arrow')}</a></article><article class="panel guide-card"><span class="guide-step">04</span><h2>기기를 바꾸기 전에는 백업</h2><p>모든 기록은 현재 브라우저의 localStorage에 자동 저장됩니다. 로그인 전에는 현재 브라우저에 기록합니다. Google 계정으로 로그인하면 계정에 저장하고 PC·모바일에서 함께 볼 수 있습니다. 기존 브라우저 기록은 계정 창의 브라우저 기록 가져오기로 옮기며, JSON 백업·복원도 지원합니다.</p><p>데이터 · 설정에서 <strong>전체 기록 JSON 다운로드</strong>를 누르세요. 다른 기기에서 같은 페이지를 열어 JSON 파일을 복원하면 됩니다. 복원은 현재 기록 전체를 대체하므로 먼저 양쪽 기록을 백업하세요.</p><p>CSV는 한글 UTF-8 BOM 형식으로 내려받아 엑셀에서 열 수 있어요. 파일 가져오기 시 UTF-8을 선택하세요. 데이터가 손상되거나 저장 공간이 부족하면 경고가 표시됩니다. 이때 새로고침하기 전에 JSON을 다운로드해 주세요.</p><a class="text-link" href="#settings">백업 · 복원 관리 ${icon('arrow')}</a></article></div><section class="panel guide-pwa"><span class="feature-icon blue">${icon('home')}</span><div><h2>스마트폰 홈 화면에 추가해 보세요</h2><p>HTTPS에서 한 번 접속하면 핵심 화면과 도구를 오프라인에서도 사용할 수 있어요. Android Chrome의 메뉴 → 홈 화면에 추가, iPhone Safari의 공유 → 홈 화면에 추가를 이용하세요. 브라우저와 설치 방식에 따라 저장 공간이 별도로 관리될 수 있으니 먼저 백업해 주세요.</p></div></section>${newFeaturesGuide()}<div class="ad-space" aria-label="향후 광고 영역"><span>서비스 소식</span><p>오늘도 당신의 알바 생활을 응원합니다.</p></div>`;
}
function privacyView() {
  return head('YOUR DATA, YOUR CHOICE','내 기록을 안전하게.','로그인 전 브라우저 저장과 Google 계정 저장의 차이를 안내합니다.')+`<article class="panel prose"><h2>로그인 전에는 이 브라우저에 저장합니다</h2><p>로그인 없이 작성한 지원 공고·경력·문자 양식·근무표·급여·입금·업무 메모와 서식은 브라우저 localStorage의 <code>${STORAGE_KEY}</code>에 저장합니다. 이 기록을 자동으로 서버에 올리지 않습니다. 같은 도메인과 브라우저에서는 경로가 바뀌어도 기존 기록을 읽을 수 있습니다.</p><h2>Google 로그인과 계정 동기화</h2><p>Google 로그인 시 Supabase Auth가 계정 식별자·이메일·인증 제공자의 기본 프로필과 세션을 처리합니다. 로그인한 상태에서 작성한 지원 공고·경력·문자 양식·근무표·근무·급여·입금 내역·메모와 서식·설정은 Supabase 데이터베이스의 내 계정 공간에 저장되어 같은 계정의 기기에서 조회할 수 있습니다. 로그인 전 기록은 사용자가 브라우저 기록 가져오기를 확인한 경우에만 계정으로 옮깁니다. Freeter는 Google 비밀번호를 받지 않으며 Google Drive·메일 권한을 요청하지 않습니다.</p><h2>접근 권한과 기기 사본</h2><p>데이터베이스는 로그인한 사용자의 계정 ID로 접근을 제한합니다. 이는 다른 일반 사용자의 접근을 막는 방식이며 서비스 운영자의 관리자 접근까지 차단하는 종단간 암호화는 아닙니다. 계정 세션과 오프라인 편집 사본은 브라우저에 보관합니다. 로그아웃하면 기기의 로그인 정보를 지우고 로그인 전 기록으로 돌아갑니다. 서버 저장이 확인된 계정 사본은 지우며, 미전송 편집은 해당 계정의 기기 저장소에 보관합니다. 같은 Google 계정으로 다시 로그인하면 전송을 재개하고 다른 계정에는 표시하지 않습니다. 세션 만료나 연결 오류 시 미전송 자료는 복구를 위해 기기에 남을 수 있습니다.</p><h2>공용 기기와 보관 기간</h2><p>공용 기기에서는 사용 후 로그아웃하고 백업 파일을 직접 정리하세요. 브라우저 저장소와 기기 파일은 같은 기기를 사용하는 사람이 열람할 수 있습니다. 로그인 전 자료는 전체 삭제나 브라우저 데이터 삭제까지, 계정 자료는 사용자가 계정의 전체 데이터 삭제를 실행할 때까지 유지합니다. Supabase의 서비스 로그·백업 보관은 제공자의 정책과 프로젝트 설정을 따릅니다. 시크릿 모드 종료·브라우저 초기화 시 기기의 미전송 기록이 사라질 수 있습니다.</p><h2>백업·공유·동시 수정</h2><p>JSON·CSV·PNG·TXT 다운로드와 근무표 공유는 버튼을 누를 때만 실행합니다. 백업 파일은 암호화하지 않으므로 안전하게 보관하세요. 다른 항목의 변경은 합치고 같은 항목을 동시에 수정하면 자동 덮어쓰기를 멈춥니다. 사용자가 사용할 기록을 고르기 전에 기기·서버 자료를 각각 백업합니다.</p><h2>전체 데이터 삭제의 범위</h2><p>로그인 전 전체 삭제는 이 서비스의 브라우저 자료와 이전 버전의 복구 자료를 삭제합니다. 로그인 후에는 현재 계정의 기록을 비우며, 서버에 반영되면 같은 계정의 다른 기기에서도 반영합니다. 오프라인에서는 연결 후 삭제가 전송됩니다. Google 계정이나 로그인 전 별도 기록을 삭제하지 않습니다. 이미 내려받거나 공유한 파일은 직접 삭제하세요.</p><h2>곰씨 날씨와 위치</h2><p>상단 날씨 버튼으로 창을 열 때만 선택한 지역의 좌표를 Open-Meteo에 보내 날씨를 조회합니다. 기본 지역은 서울이며 내 위치로 자동 판단하지 않습니다. 내 위치 버튼을 누르고 브라우저에서 허용한 경우에만 위치를 사용합니다. 전송 좌표는 소수점 둘째 자리로 줄이며 계정 기록·브라우저 저장소·오프라인 캐시에 위치를 저장하지 않습니다. 위치 권한 없이도 지역 선택으로 사용할 수 있습니다.</p><h2>호스팅·인증 서비스와 오프라인 캐시</h2><p>GitHub Pages가 정적 사이트를 제공하고, Google과 Supabase가 로그인·계정 저장을 제공합니다. 각 제공자는 접속·서비스 제공에 필요한 정보를 처리할 수 있습니다. 서비스 워커는 공개 사이트 파일만 캐시하고 인증 응답·개인 기록 API는 캐시하지 않습니다. 현재 광고·분석·추적 스크립트는 없습니다.</p><a class="button secondary" href="#settings">계정과 내 데이터 관리 ${icon('arrow')}</a></article>`;
}

function confirmAction(message, title = '한 번 더 확인해 주세요', label = '확인', {compact=false}={}) {
  const dialog = $('#confirm-dialog');dialog.classList.toggle('memo-confirm',compact);
  const owner=cloud.user?.id||null;
  $('#confirm-title').textContent = title;
  $('#confirm-message').textContent = message;
  $('#confirm-yes').textContent = label;
  dialog.returnValue = '';
  return new Promise(resolve => {
    const form = $('form', dialog);
    const finish = approved => {
      form.removeEventListener('submit', submit);
      dialog.removeEventListener('cancel', cancel);
      dialog.close(approved ? 'yes' : 'cancel');
      resolve(approved && owner===(cloud.user?.id||null));
    };
    const submit = event => { event.preventDefault(); finish(event.submitter?.value === 'yes'); };
    const cancel = event => { event.preventDefault(); finish(false); };
    form.addEventListener('submit', submit);
    dialog.addEventListener('cancel', cancel);
    dialog.showModal();
  });
}
function paymentFields(payment = { date: today(), amount: '' }) {
  return `<div class="payment-row">${field('실제 입금일', 'paymentDate', 'date', payment.date, 'required min="1900-01-01" max="9999-12-31"')}${field('실제 입금액 (원)', 'paymentAmount', 'number', payment.amount, 'required min="1" max="1000000000" step="1"')}<button type="button" class="icon-button delete-button" data-action="remove-payment" aria-label="이 입금 내역 삭제">${icon('trash')}</button></div>`;
}
function openRecord(id) {
  const record = state.records.find(r => r.id === id) || { ...calculatorDefaults(), id: '', task: '', note: '', dueDate: '', payments: [] };
  const dialog = $('#record-dialog');
  dialog.innerHTML = `<div class="dialog-head"><div><span class="eyebrow">MY WORK LOG</span><h2 id="record-dialog-title">${id ? '알바 기록 수정' : '새로운 알바 기록'}</h2></div><button type="button" class="icon-button" data-action="close-record" aria-label="기록 편집 닫기">${icon('close')}</button></div><form id="record-form" data-id="${esc(record.id)}"><div class="form-grid">${field('근무 날짜', 'date', 'date', record.date, 'required min="1900-01-01" max="9999-12-31"')}${field('근무지', 'workplace', 'text', record.workplace, 'required maxlength="100" list="record-workplaces" placeholder="근무지 이름"')}${field('담당 업무', 'task', 'text', record.task, 'maxlength="200" placeholder="예: 매장 운영"')}${field('급여 지급 예정일 (선택)', 'dueDate', 'date', record.dueDate, 'min="1900-01-01" max="9999-12-31"')}</div><div class="form-divider"></div>${payFields(record)}<div class="modal-pay-preview" id="record-preview" aria-live="polite"></div><section class="payment-section"><div class="section-heading"><h3>급여 입금 내역</h3><button type="button" class="button secondary small" data-action="add-payment">${icon('plus')}입금 내역 추가</button></div><p class="field-hint">나누어 입금받았다면 날짜별로 추가하세요. 지급 상태는 자동으로 계산돼요.</p><div id="payments">${record.payments.map(paymentFields).join('')}</div></section><label class="field"><span>메모 (선택)</span><textarea name="note" rows="3" maxlength="2000" placeholder="기억해 두고 싶은 내용을 남겨 주세요.">${esc(record.note)}</textarea></label><div id="record-error" class="form-error" role="alert" hidden></div><div class="dialog-actions"><button type="button" class="button secondary" data-action="close-record">취소</button><button type="submit" class="button primary">${icon('check')}기록 저장</button></div><datalist id="record-workplaces">${workplaceOptions().map(w => `<option value="${esc(w)}"></option>`).join('')}</datalist></form>`;
  dialog.showModal();
  updateRecordPreview();
}
function updateRecordPreview() {
  try { $('#record-preview').textContent = `유급 ${duration(calculatePay(formValues($('#record-form'))).paidMinutes)} · 예상 급여 ${money(calculatePay(formValues($('#record-form'))).expected)}`; }
  catch (failure) { $('#record-preview').textContent = failure.message; }
}
function readRecord(form) {
  const data = formValues(form);
  const payments = $$('.payment-row', form).map(row => ({ date: $('[name="paymentDate"]', row).value, amount: Number($('[name="paymentAmount"]', row).value) }));
  return validateRecord({ id: form.dataset.id || crypto.randomUUID(), date: data.date, workplace: data.workplace.trim(), task: data.task.trim(), start: data.start, end: data.end, breakMinutes: Number(data.breakMinutes), payType: data.payType, rate: Number(data.rate), extra: Number(data.extra), deduction: Number(data.deduction), taxType:data.taxType, taxExempt:Number(data.taxExempt), dueDate: data.dueDate, note: data.note, payments });
}
function download(content, filename, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function recordsCsv(records) {
  return csvText([['근무일', '근무지', '담당 업무', '출근', '퇴근', '다음 날 퇴근', '무급 휴게(분)', '유급 근무(분)', '급여 기준', '시급/일급', '세전 기본급', '추가 지급액', '기타 공제액', '세금 유형', '비과세 금액', '소득세', '지방소득세', '예상 수령액', '지급 예정일', '실제 입금액 합계', '입금일별 내역', '지급 상태', '메모'], ...records.map(r => {
    const pay = calculatePay(r);
    return [r.date, r.workplace, r.task, r.start, r.end, pay.overnight ? '예' : '아니요', r.breakMinutes, pay.paidMinutes, r.payType === 'hourly' ? '시급' : '일급', r.rate, pay.base, r.extra, r.deduction, TAX_TYPES[pay.taxType], pay.taxExempt, pay.incomeTax, pay.localTax, pay.expected, r.dueDate, r.payments.reduce((s, p) => s + p.amount, 0), r.payments.map(p => `${p.date}: ${p.amount}원`).join(' / '), STATUS[recordStatus(r)], r.note];
  })]);
}
function scheduleMatrix() {
  return [['시간', ...resultPeople().map(personName)], ...state.schedule.rows.map(row => [`${timeText(row.start)}–${timeText(row.end)}`, ...resultPeople().map(i => shiftLabel[shiftState(row,i)])])];
}
function scheduleText() {
  const totals = scheduleTotals(state.schedule.rows,resultCount());
  return ['Freeter | 교대 근무표', ...scheduleMatrix().map(row => row.join(' | ')), '', ...totals.map((t, i) => `${personName(i)}: 근무 ${duration(t.work)}, 휴식 ${duration(t.rest)}, 점심 ${duration(t.lunch)}`)].join('\n');
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('클립보드에 복사했어요. 원하는 곳에 붙여넣어 주세요.'); }
  catch {
    const node = document.createElement('textarea'); node.value = text; node.className = 'clipboard-fallback'; document.body.append(node); node.select();
    const copied = document.execCommand('copy'); node.remove();
    if (copied) toast('클립보드에 복사했어요.'); else download(text, '교대-근무표.txt', 'text/plain;charset=utf-8');
  }
}
async function schedulePng() {
  const source=$('#schedule-result');if(!source||!state.schedule.rows.length)return;
  const owner=cloud.user?.id||null;
  if(document.fonts?.ready)await document.fonts.ready;
  // Snapshot the settled theme, rather than a color halfway through a CSS transition.
  const transitions=source.getAnimations?.({subtree:true})||[];
  await Promise.allSettled(transitions.filter(animation=>animation.effect?.getComputedTiming().endTime<=1000).map(animation=>animation.finished));
  if(owner!==(cloud.user?.id||null)||!source.isConnected)throw new Error('화면이나 계정이 변경되어 이미지 저장을 중지했어요.');
  const width=Math.ceil(source.getBoundingClientRect().width),ratio=2;
  const rowNodes=[...source.querySelectorAll('tbody tr')];
  const heights=rowNodes.map(row=>row.getBoundingClientRect().height);
  const overhead=source.scrollHeight-heights.reduce((sum,height)=>sum+height,0);
  const budget=Math.max(100,Math.min(6000,Math.floor(8000000/(width*ratio*ratio)))-overhead-50);
  const parts=[];let from=0,used=0;
  heights.forEach((height,index)=>{if(used+height>budget&&index>from){parts.push([from,index]);from=index;used=0;}used+=height;});parts.push([from,heights.length]);
  const stage=document.createElement('div');stage.className='schedule-layout schedule-export-stage';stage.setAttribute('aria-hidden','true');stage.inert=true;
  Object.assign(stage.style,{position:'fixed',left:'-100000px',top:'0',width:width+'px',display:'block',pointerEvents:'none'});document.body.append(stage);
  try {
    for(let part=0;part<parts.length;part++) {
      const clone=source.cloneNode(true);clone.removeAttribute('id');clone.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
      clone.querySelector('.export-actions')?.remove();
      const [start,end]=parts[part];[...clone.querySelectorAll('tbody tr')].forEach((row,index)=>{if(index<start||index>=end)row.remove();});
      Object.assign(clone.style,{width:width+'px',height:'auto',maxHeight:'none',overflow:'visible',margin:'0'});
      clone.querySelectorAll('.schedule-scroll').forEach(node=>Object.assign(node.style,{height:'auto',maxHeight:'none',overflow:'visible'}));
      if(parts.length>1){const label=document.createElement('p');label.className='field-hint';label.textContent=`${part+1} / ${parts.length} · 아래 합계는 전체 일정 기준입니다.`;clone.append(label);}
      stage.replaceChildren(clone);
      const blob=await loadFreeterImage().toBlob(clone,{pixelRatio:ratio,skipFonts:true,backgroundColor:getComputedStyle(source).backgroundColor,width});
      if(owner!==(cloud.user?.id||null))throw new Error('계정이 변경되어 이미지 저장을 중지했어요.');
      if(!blob)throw new Error('이미지 생성에 실패했어요. CSV 또는 텍스트 저장을 이용해 주세요.');
      download(blob,`교대-근무표${parts.length>1?'-'+(part+1):''}.png`);
    }
  }finally{stage.remove();}
  toast(parts.length>1?`화면 디자인 그대로 ${parts.length}장의 이미지로 저장했어요.`:'화면 디자인 그대로 근무표를 저장했어요.');
}

document.addEventListener('submit', async event => {
  const form = event.target;
  if(form.id==='application-form'){event.preventDefault();saveApplication(form);return;}
  if(form.id==='rest-adjust-form'){event.preventDefault();applyRestAdjustment(form);return;}
  if (form.id === 'mini-form') { event.preventDefault();calculateMini();return; }
  if (form.id === 'complete-payment-form') {
    event.preventDefault();
    try {
      const values=formValues(form), record=state.records.find(r=>r.id===form.dataset.id);
      if(!record)throw new Error('기록을 찾지 못했어요. 다시 열어 주세요.');
      const updated={...record,payments:[...record.payments,{date:values.date,amount:Number(values.amount)}]};
      validateRecord(updated);
      if(recordStatus(updated)!=='paid')throw new Error('지급 완료로 변경하려면 남은 예상 수령액 이상을 입력해 주세요. 일부 입금은 기록 수정에서 추가할 수 있어요.');
      state.records[state.records.findIndex(r=>r.id===record.id)]=updated;
      persisted('입금 내역을 추가하고 지급 완료로 변경했어요.');$('#record-dialog').close();render();
    }catch(failure){$('#complete-payment-error').hidden=false;$('#complete-payment-error').textContent=failure.message;}
    return;
  }
  if (form.id === 'record-filters') { event.preventDefault(); return; }
  if (!['schedule-form', 'calculator-form', 'record-form'].includes(form.id)) return;
  event.preventDefault();
  if (form.id === 'schedule-form') {
    try {
      const config = readSchedule(), rows = generateSchedule(config);
      state.schedule = { config, generatedConfig: structuredClone(config), rows };
      $('#schedule-error').hidden = true; persisted('근무표를 생성하고 저장했어요.'); renderScheduleResult();
      if(compactSchedule()){ mobileScheduleSettingsOpen=false;$('#schedule-settings').open=false;$('#schedule-result').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}); }
    } catch (failure) { $('#schedule-error').textContent = failure.message; $('#schedule-error').hidden = false; }
  }
  if (form.id === 'calculator-form') { const data=updateCalculator(true);if(data){state.calculator=data;persisted('입력한 조건으로 급여를 계산했어요.');} }
  if (form.id === 'record-form') {
    try {
      const record = readRecord(form), index = state.records.findIndex(r => r.id === record.id);
      if (index >= 0) state.records[index] = record; else state.records.push(record);
      if (!state.workplaces.includes(record.workplace)) state.workplaces.push(record.workplace);
      persisted('알바 기록을 저장했어요.'); $('#record-dialog').close(); render();
    } catch (failure) { $('#record-error').textContent = failure.message; $('#record-error').hidden = false; }
  }
});
document.addEventListener('input', event => {
  if(event.target.id==='application-search'){applicationSearch=event.target.value;applicationPage=0;renderApplicationList();return;}
  if(['application-career','application-template'].includes(event.target.id)){const career=event.target.id==='application-career',value=event.target.value;if(value.length>30000)return;state[career?'applicationCareer':'applicationTemplate']=value;const saved=save();$('#'+(career?'career':'template')+'-save-state').textContent=value.length.toLocaleString('ko-KR')+' / 30,000자 · '+(saved?'저장했어요':'저장되지 않음 · JSON 백업 필요');return;}
  if(event.target.id==='memo-fallback'){state.workMemo=event.target.value;state.workMemoDelta=null;const saved=save();updateMemoStatus(saved);setMemoSaveState(saved?'ready':'error');return;}
  if(event.target.id==='mini-expression'){miniExpression=event.target.value;miniAnswer='';$('#mini-answer').textContent='';return;}
  const form = event.target.closest('form');
  if (form?.id === 'calculator-form') {
    const draft=formValues(form),days=Number(draft.days);
    // Keep an invalid work-day preview from making saved records unreadable on reload.
    if(draft.days!=='')draft.days=/^\d+$/.test(draft.days)&&Number.isInteger(days)&&days>=1&&days<=366?String(days):(state.calculator?.days??'1');
    state.calculator=draft;save();updateCalculator(true);
  }
  if (form?.id === 'schedule-form') {
    if (event.target.name === 'intervalPreset') {
      if (event.target.value !== 'custom') form.elements.interval.value = event.target.value;
      else form.elements.interval.focus();
    }
    if (event.target.name === 'interval') form.elements.intervalPreset.value = [30, 60, 90, 120].includes(Number(event.target.value)) ? event.target.value : 'custom';
    const config = readSchedule();
    // Keep partially entered interval out of persisted state; generation still uses the form value.
    if (Number.isInteger(config.interval) && config.interval > 0 && config.interval <= 1440) { state.schedule.config = config; save(); }
    if(['count','lunchMode','lunchEnabled'].includes(event.target.name)){render();return;}
    $$('[data-person]', form).forEach(node => { node.textContent = personName(Number(node.dataset.person)); });
    renderScheduleResult();
  }
  if (form?.id === 'record-form') updateRecordPreview();
  if (form?.id === 'record-filters') { recordFilters = formValues(form); updateRecords(); }
});
document.addEventListener('toggle',event=>{if(event.target.id==='schedule-settings'&&event.target.isConnected&&compactSchedule())mobileScheduleSettingsOpen=event.target.open;},true);
document.addEventListener('pointerdown',event=>{if(event.target.closest('#memo-format-toolbar button'))event.preventDefault();});
document.addEventListener('change', event => {
  if(event.target.closest('#rest-adjust-form')){
    if(event.target.name==='changeCycle')updateRestCycleFields();
    if(event.target.name==='restCycle'){
      const cycle=Number(event.target.value);$('#rest-adjust-form').elements.cycleMinutes.value=restAdjustment.cycles.find(item=>item.cycle===cycle).minutes;
    }
    return;
  }
  if(event.target.dataset.memoFormat){formatMemo(event.target.dataset.memoFormat,event.target.value);return;}
  if (event.target.matches('.rest-select')) { state.schedule.rows[Number(event.target.dataset.row)].rest = Number(event.target.value); persisted('휴식자 배정을 변경했어요.'); renderScheduleResult(); }
  if (event.target.id === 'stats-month' && /^\d{4}-\d{2}$/.test(event.target.value) && event.target.checkValidity()) { statsMonth = event.target.value; render(); }
  if (event.target.id === 'restore-file') restoreFile(event.target.files[0]);
});
async function restoreFile(file) {
  if (!file) return;
  const owner=cloud.user?.id||null;
  try {
    if (file.size > 20 * 1024 * 1024) throw new Error('20MB 이하의 JSON 백업 파일을 선택해 주세요.');
    let data;
    try { data = JSON.parse(await file.text()); } catch { throw new Error('JSON 파일을 읽을 수 없습니다. 손상되지 않은 백업을 선택해 주세요.'); }
    if(owner!==(cloud.user?.id||null))throw new Error('계정이 변경되어 복원을 중지했어요.');
    const restored = validateState(data);
    if (!await confirmAction(`현재 기록 ${state.records.length}건과 근무표·설정을 백업 파일의 기록 ${restored.records.length}건으로 교체합니다. 현재 내용을 백업하셨나요?`, '백업 파일로 복원할까요?', '덮어쓰고 복원')) return;
    // Atomic single-key write: failures leave the existing storage untouched.
    if(cloud.user){if(!cloud.save(restored,{reset:true}))throw new Error(cloud.snapshot.label);}
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
    state = restored; rawStored = JSON.stringify(restored); storageBlocked = false; calcSavedHash = '';
    $('#storage-alert').hidden = true; render(); toast('백업 파일의 기록을 복원했어요.');
  } catch (failure) { toast(`복원하지 않았습니다. ${failure.message}`); }
  finally { if ($('#restore-file')) $('#restore-file').value = ''; }
}
document.addEventListener('click', async event => {
  const routeLink = event.target.closest('a[data-route]');
  if (routeLink && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    try { history.pushState({}, '', routeLink.href); }
    catch (failure) {
      if (failure.name !== 'SecurityError') throw failure;
      location.hash = routeLink.dataset.route;
      return;
    }
    render(); window.scrollTo({ top: 0, behavior: 'instant' }); $('#main').focus({ preventScroll: true });
    return;
  }
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  try {
    if(action==='new-application'){openApplication(null,true);return;}
    if(action==='view-application'){openApplication(button.dataset.id);return;}
    if(action==='edit-application'){openApplication(button.dataset.id,true);return;}
    if(action==='close-application'){$('#application-dialog').close();return;}
    if(action==='application-prev'||action==='application-next'){applicationPage+=action==='application-prev'?-1:1;renderApplicationList();return;}
    if(action==='copy-career'||action==='copy-application-template'){await copyText(action==='copy-career'?state.applicationCareer:state.applicationTemplate);return;}
    if(action==='delete-application'){const id=button.dataset.id,owner=cloud.user?.id||'guest',post=state.applications.find(item=>item.id===id),base=JSON.stringify(post);if(post&&await confirmAction('지원 공고를 삭제합니다. 경력과 문자 지원 양식은 유지됩니다.','이 공고를 삭제할까요?','공고 삭제')){if(owner!==(cloud.user?.id||'guest')||base!==JSON.stringify(state.applications.find(item=>item.id===id)))throw new Error('계정이나 공고가 변경되어 삭제하지 않았어요.');state.applications=state.applications.filter(item=>item.id!==id);persisted('지원 공고를 삭제했어요.');$('#application-dialog').close();render();}return;}
    if(action==='open-account'){openAccount();return;}
    if(action==='close-account'){$('#account-dialog').close();return;}
    if(action==='google-login'){button.disabled=true;try{location.assign(await cloud.googleLogin(new URL('./',location.href).href));}finally{button.disabled=false;}return;}
    if(action==='account-sync'){await cloud.sync();toast(cloud.snapshot.label);return;}
    if(action==='account-import'){await importGuestWorkspace();return;}
    if(action==='account-logout'||action==='account-switch'){
      button.disabled=true;
      try{
        const result=await cloud.signOut();
        if(action==='account-switch'&&!result.changedAccount){location.assign(await cloud.googleLogin(new URL('./',location.href).href));return;}
        toast(result.changedAccount?'새로 로그인한 계정을 유지합니다.':result.pending?'로그아웃했어요. 전송 대기 기록은 같은 계정으로 다시 로그인하면 이어서 저장해요.':result.revoked?'로그아웃했어요.':'이 기기에서 로그아웃했어요. 서버 세션 해제는 연결 후 확인이 필요해요.');
      }finally{button.disabled=false;}
      return;
    }
    if(action==='account-use-local'||action==='account-use-remote'){
      if(!await confirmAction('현재 기기와 서버의 기록을 각각 JSON으로 백업한 뒤 선택한 기록으로 동기화를 이어갑니다.','사용할 기록을 선택할까요?','백업하고 선택'))return;
      const account=cloud.user?.id,remote=await cloud.read(account);if(account!==cloud.user?.id)return;
      download(JSON.stringify(state,null,2),`Freeter-device-${today()}.json`,'application/json;charset=utf-8');download(JSON.stringify(remote.data,null,2),`Freeter-server-${today()}.json`,'application/json;charset=utf-8');
      await cloud.resolve(action==='account-use-local'?'local':'remote');toast(cloud.snapshot.label);return;
    }
    if(action==='open-updates'){openUpdates();return;}
    if(action==='close-updates'){$('#updates-dialog').close();return;}
    if(action.startsWith('memo-format-')){formatMemo(action.slice('memo-format-'.length));return;}
    if(action==='save-memo'){const saved=save();updateMemoStatus(saved);setMemoSaveState(saved?'saved':'error');if(saved&&cloud.user)void cloud.sync();return;}
    if(action==='edit-schedule'){mobileScheduleSettingsOpen=true;$('#schedule-settings').open=true;$('#schedule-settings').scrollIntoView({behavior:'smooth',block:'start'});}
    if(action==='adjust-rest'){openRestAdjustment();return;}
    if(action==='close-rest-adjust'){$('#rest-adjust-dialog').close();restAdjustment=null;return;}
    if(action==='add-work-window'){
      restAdjustment.config.workOnly=readWorkWindows();if(restAdjustment.config.workOnly.length>=24)return;
      const cycle=restAdjustment.cycles.find(item=>item.cycle===Number($('#rest-adjust-form').elements.restCycle.value));
      const from=cycle?.start??state.schedule.rows[0].start,to=cycle?.end??state.schedule.rows.at(-1).end;
      restAdjustment.config.workOnly.push({start:timeText(from).slice(0,5),end:timeText(to).slice(0,5)});renderWorkWindows();return;
    }
    if(action==='remove-work-window'){restAdjustment.config.workOnly=readWorkWindows();restAdjustment.config.workOnly.splice(Number(button.dataset.index),1);renderWorkWindows();return;}
    if(action==='reset-rest-adjust'){
      restAdjustment.config.roundMinutes=[];restAdjustment.config.workOnly=[];$('#rest-adjust-form').elements.changeCycle.checked=false;$('#rest-adjust-form').elements.cycleMinutes.value=restAdjustment.config.interval;updateRestCycleFields();renderWorkWindows();return;
    }
    if(action==='choose-rest'){
      const row=state.schedule.rows[Number(button.dataset.row)],worker=Number(button.dataset.worker);
      if(row&&row.rest!==null&&Number.isInteger(worker)&&worker>=0&&worker<resultCount()){row.rest=worker;persisted('휴식자 배정을 변경했어요.');renderScheduleResult();}
    }
    if(action==='complete-payment')openCompletePayment(button.dataset.id);
    if(action==='copy-memo')await copyText(state.workMemo);
    if(action==='download-memo')download(state.workMemo,`업무-메모-${today()}.txt`,'text/plain;charset=utf-8');
    if(action==='clear-memo'&&await confirmAction('업무 메모 내용을 모두 비웁니다. 필요하면 먼저 TXT 또는 JSON으로 백업해 주세요.','업무 메모를 비울까요?','비우기',{compact:true})){state.workMemo='';state.workMemoDelta=null;persisted('업무 메모를 비웠어요.');render();}
    if(action==='mini-key'){
      const key=button.dataset.key;
      if(key==='='){calculateMini();return;}
      if(key==='C'){miniExpression='';miniAnswer='';}else if(key==='⌫')miniExpression=miniExpression.slice(0,-1);else if(miniExpression.length<200)miniExpression+=key;
      $('#mini-expression').value=miniExpression;$('#mini-answer').textContent='';
    }
    if (action === 'add-record') openRecord();
    if (action === 'edit-record') openRecord(button.dataset.id);
    if (action === 'close-record') $('#record-dialog').close();
    if (action === 'add-payment') { $('#payments').insertAdjacentHTML('beforeend', paymentFields()); $$('.payment-row').at(-1).querySelector('input').focus(); }
    if (action === 'remove-payment') button.closest('.payment-row').remove();
    if (action === 'delete-record') {
      const record = state.records.find(r => r.id === button.dataset.id);
      if (record && await confirmAction(`${record.date} ${record.workplace}의 근무 기록과 입금 내역을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`, '이 기록을 삭제할까요?', '기록 삭제')) { state.records = state.records.filter(r => r.id !== record.id); persisted('기록을 삭제했어요.'); render(); }
    }
    if (action === 'reset-schedule' && await confirmAction('이름과 일정 설정, 저장된 근무표를 초기화합니다. 알바 기록은 유지됩니다.', '근무표를 초기화할까요?', '초기화')) { state.schedule = { config: structuredClone(DEFAULT_SCHEDULE), generatedConfig: null, rows: [] }; persisted('근무표를 초기화했어요.'); render(); }
    if (action === 'save-calculation') {
      const values = updateCalculator(true);
      if (!values) return;
      if (!validDate(values.date) || !values.workplace.trim()) { $('#calculator-error').hidden = false; $('#calculator-error').textContent = '기록장에 저장하려면 올바른 근무 날짜와 근무지 이름을 입력해 주세요.'; (!validDate(values.date) ? $('[name="date"]') : $('[name="workplace"]')).focus(); return; }
      // A record always represents one date, even when the preview covers several work days.
      const {days:previewDays,...dailyValues}=values;
      const record = validateRecord({ ...dailyValues, id: crypto.randomUUID(), task: '', note: '', dueDate: '', payments: [] });
      state.records.push(record);
      if (!state.workplaces.includes(record.workplace)) state.workplaces.push(record.workplace);
      calcSavedHash = JSON.stringify({...values,days:'1'}); persisted('선택한 날짜의 1일 근무를 알바 기록장에 저장했어요.'); updateCalculator(false);
    }
    if (action === 'backup') { download(JSON.stringify(state, null, 2), `Freeter-backup-${today()}.json`, 'application/json;charset=utf-8'); toast('전체 기록의 JSON 백업을 다운로드했어요.'); }
    if (action === 'raw-backup') download(rawStored, `Freeter-original-${today()}.json`, 'application/json;charset=utf-8');
    if (action === 'restore') $('#restore-file').click();
    if (action === 'all-records-csv' || action === 'records-csv') { download(recordsCsv(action === 'records-csv' ? filteredRecords() : state.records), `Freeter-records-${today()}.csv`, 'text/csv;charset=utf-8'); toast('한글 CSV를 다운로드했어요.'); }
    if (action === 'delete-all' && await confirmAction(cloud.user?'로그인한 계정의 근무표, 알바·입금 기록과 메모를 비웁니다. 서버에 반영되면 같은 계정의 다른 기기에도 적용됩니다. 먼저 JSON으로 백업해 주세요.':'이 브라우저의 근무표, 알바·입금 기록, 메모와 서식, 설정과 이전 버전의 백업을 삭제합니다. 복구하려면 다운로드한 JSON 백업이 필요합니다.', '모든 데이터를 삭제할까요?', '전체 데이터 삭제')) {
      if(cloud.user){const cleared=emptyState();if(!cloud.save(cleared,{reset:true}))throw new Error(cloud.snapshot.label);localStorage.removeItem(cloud.cacheKey+':recovery');state=cleared;rawStored=JSON.stringify(cleared);calcSavedHash='';render();toast('계정 기록을 비웠어요. 서버 동기화 상태를 확인해 주세요.');return;}
      localStorage.removeItem('freeter:before-peer-sync');localStorage.removeItem('freeter:peer-conflict');localStorage.removeItem(STORAGE_KEY); state = emptyState(); rawStored = null; storageBlocked = false; calcSavedHash = ''; $('#storage-alert').hidden = true; render(); toast('이 서비스의 모든 브라우저 데이터를 삭제했어요.');
    }
    if (action === 'set-theme') { chooseTheme(button.dataset.theme); persisted('화면 테마를 변경했어요.'); render(); }
    if (action === 'schedule-csv') download(csvText([...scheduleMatrix(), [], ['개인별 합계', '근무', '휴식', '점심'], ...scheduleTotals(state.schedule.rows,resultCount()).map((t, i) => [personName(i), duration(t.work), duration(t.rest), duration(t.lunch)])]), `교대-근무표-${today()}.csv`, 'text/csv;charset=utf-8');
    if (action === 'schedule-copy') await copyText(scheduleText());
    if (action === 'schedule-share') {
      if (navigator.share) { try { await navigator.share({ title: 'Freeter | 근무표', text: scheduleText() }); } catch (failure) { if (failure.name !== 'AbortError') await copyText(scheduleText()); } }
      else await copyText(scheduleText());
    }
    if (action === 'schedule-png'){button.disabled=true;try{await schedulePng();}finally{button.disabled=false;}}
  } catch (failure) { toast(failure.message || '작업을 완료하지 못했어요. 다시 확인해 주세요.'); }
});
$('#theme-toggle').addEventListener('click', () => { chooseTheme(effectiveTheme() === 'dark' ? 'light' : 'dark'); save(); applyTheme(); if (page === 'settings') render(); });
window.addEventListener('hashchange', () => { render(); window.scrollTo({ top: 0, behavior: 'instant' }); $('#main').focus({ preventScroll: true }); });
window.addEventListener('popstate', () => render());
// Do not silently overwrite another tab's updates.
window.addEventListener('storage', event => {
  if(event.key===THEME_KEY){
    if(event.newValue===null||['light','dark'].includes(event.newValue)){deviceTheme=event.newValue;applyTheme();if(page==='settings')render();}
    return;
  }
  if (cloud.user || event.key !== STORAGE_KEY) return;
  try { state = event.newValue ? validateState(JSON.parse(event.newValue)) : emptyState(); rawStored = event.newValue; storageBlocked = false; calcSavedHash = ''; $('#record-dialog').close(); $('#application-dialog')?.close(); render(); toast('다른 탭의 최신 기록을 반영했어요. 저장 전 편집 내용은 반영되지 않습니다.'); }
  catch { storageBlocked = true; $('#storage-alert').hidden = false; $('#storage-alert').textContent = '다른 탭의 데이터를 읽지 못해 저장을 중지했습니다. 현재 내용을 백업해 주세요.'; }
});
function latestAppUrl() {
  const url=new URL(location.href);url.searchParams.set('v',latestRelease);return url.href;
}
function showAvailableUpdate(version) {
  if(!/^[a-f0-9]{12}$/.test(version)||version===APP_RELEASE)return;
  latestRelease=version;
  let banner=$('#app-update-banner');
  if(!banner){banner=document.createElement('div');banner.id='app-update-banner';banner.className='app-update-banner';banner.setAttribute('role','status');$('.topbar').after(banner);}
  banner.innerHTML=`<span>새 버전이 준비됐어요. 저장한 기록은 그대로 유지됩니다.</span><a class="button secondary small" href="${esc(latestAppUrl())}">업데이트 열기</a>`;
}
let lastVersionCheck=0;
async function checkAppVersion() {
  if(globalThis.origin==='null'||!navigator.onLine||!['http:','https:'].includes(location.protocol)||Date.now()-lastVersionCheck<30000)return;
  lastVersionCheck=Date.now();
  try{const response=await fetch(new URL('./version.json',location.href),{cache:'no-store'});if(response.ok){const data=await response.json();if(typeof data.version==='string')showAvailableUpdate(data.version);}}catch{/* An offline visit keeps the cached tools available. */}
}
document.documentElement.dataset.appRelease=APP_RELEASE;
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkAppVersion();});
// The clock updates only its own text, without re-rendering an active memo.
const clockNode=$('#live-clock');
const clockDate=new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short'});
function updateClock(){
  const now=new Date(),pad=value=>String(value).padStart(2,'0');
  const text=[now.getHours(),now.getMinutes()].map(pad).join(':');
  if(clockNode.textContent!==text)clockNode.textContent=text;
  clockNode.dateTime=now.toISOString();
  $('#today-label').textContent=clockDate.format(now);$('#year').textContent=now.getFullYear();
}
updateClock();setInterval(()=>{if(!document.hidden)updateClock();},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateClock();});
render();
mountWeatherWidget();
if (globalThis.origin !== 'null' && 'serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='FREETER_UPDATE_READY')showAvailableUpdate(event.data.version);});
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(registration=>registration.update()).catch(() => { /* Core tools remain available without offline caching. */ });
}

checkAppVersion();

cloud.start(location.href,url=>{try{history.replaceState({},'',url);}catch{/* Restricted previews do not start account authentication. */}}).then(()=>{if(storageBlocked&&rawStored===null&&!cloud.user)cloud.status('disabled','이 브라우저에서는 계정 정보를 저장할 수 없어요. 일반 탭에서 다시 열어 주세요.');}).catch(()=>toast('계정 서비스에 연결하지 못했어요. 기존 도구는 계속 사용할 수 있어요.'));
window.addEventListener('online',()=>cloud.resume());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)cloud.resume();});
