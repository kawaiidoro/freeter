import { STORAGE_KEY, VERSION, DEFAULT_SCHEDULE, today, money, duration, timeText, calculatePay, generateSchedule, scheduleTotals, recordStatus, STATUS, nextWorkRecord, monthStats, emptyState, validateRecord, validateState, validDate, csvText, TAX_TYPES, shiftState, evaluateExpression, MEMO_SIZES, validateMemoDelta, validateApplication, APPLICATION_TEMPLATE_EXAMPLE } from './core.js';

const APP_RELEASE = '__FREETER_RELEASE__';
let latestRelease = APP_RELEASE;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
document.documentElement.dataset.brandFont = globalThis.origin === 'null' ? 'fallback' : 'local';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const icons = {
  apply: '<path d="M8 3H5v18h14V3h-7M8 7h5m-5 4h4m-4 4h3m3-8 7-4-3 8-1-3-3-1Z"/>',
  user: '<circle cx="12" cy="7" r="3"/><path d="M4 20v-1a8 6 0 0 1 16 0v1"/>',
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
  table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 10h18M10 3v18"/>',
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
// Match header controls to the navigation's simple, lightweight outlines.
const headerIcon=name=>icon(name,'header-illustration');
// Older cached HTML may still contain the retired header shortcut.
$$('.updates-top-link,.clock-face').forEach(node=>node.remove());
$$('.mobile-nav [data-page]').filter(node=>!['home','notes','schedule','calculator'].includes(node.dataset.page)).forEach(node=>node.remove());
$$('[data-icon]').forEach(node => { node.innerHTML = node.closest('.top-actions')?headerIcon(node.dataset.icon):icon(node.dataset.icon); });
$('.topbar').before($('#storage-alert'));

let state = emptyState(), storageBlocked = false, rawStored = null;
try {
  rawStored = localStorage.getItem(STORAGE_KEY);
  if (rawStored !== null) state = validateState(JSON.parse(rawStored));
} catch {
  storageBlocked = true;
  $('#storage-alert').hidden = false;
  $('#storage-alert').textContent = rawStored === null
    ? '이 환경에서는 브라우저 저장소를 사용할 수 없습니다. 일반 브라우저 탭에서 열어 주세요. 창을 닫기 전에 필요한 내용을 복사해 두세요.'
    : '저장 데이터를 읽을 수 없습니다. 원본은 그대로 보존했습니다. 브라우저 설정을 확인해 주세요. 지금 변경한 내용은 저장되지 않습니다.';
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
    $('#storage-alert').textContent = '브라우저 저장 공간에 기록하지 못했습니다. 창을 닫기 전에 필요한 내용을 복사하고 저장 공간·브라우저 설정을 확인해 주세요.';
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
function persisted(message) { toast(save() ? message : '현재 화면에만 반영했어요. 창을 닫기 전에 필요한 내용을 복사해 주세요.'); }
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
  guide: '근무표 생성과 급여 계산, 알바 기록과 계정 연결 방법을 안내합니다.',
  privacy: '브라우저 저장·Google 로그인·계정 동기화와 개인정보 보호 안내입니다.',
  settings: '계정 연결과 화면 설정, 개인정보 안내와 곰씨 커피 후원을 확인하세요.',
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
  $('#theme-toggle').innerHTML = headerIcon(theme === 'dark' ? 'sun' : 'moon');
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
  $$('[data-iso-date]', $('#main')).forEach(input=>syncIsoDate(input));
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
// A text value fixes the visible format; the companion native control keeps the calendar picker.
function workDateField(id,value) {
  return `<div class="field iso-date-field"><label for="${id}">근무 날짜</label><div class="iso-date-control"><input id="${id}" name="date" type="text" inputmode="numeric" data-iso-date value="${esc(value)}" placeholder="YYYY-MM-DD" maxlength="10" pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" required autocomplete="off"><button type="button" class="date-picker-button" data-action="open-date-picker" aria-label="근무 날짜 달력 열기">${icon('calendar')}</button><input type="date" data-date-picker value="${validDate(value)?esc(value):''}" min="1900-01-01" max="9999-12-31" tabindex="-1" aria-hidden="true"></div></div>`;
}
function syncIsoDate(input,format=false) {
  if(format){
    const raw=input.value,caret=input.selectionStart??raw.length,before=raw.slice(0,caret).replace(/\D/g,'').length;
    const digits=raw.replace(/\D/g,'').slice(0,8),value=[digits.slice(0,4),digits.slice(4,6),digits.slice(6,8)].filter(Boolean).join('-');
    if(value!==raw){
      input.value=value;let position=0,count=0;
      while(position<value.length&&count<before){if(/\d/.test(value[position]))count++;position++;}
      input.setSelectionRange(position,position);
    }
  }
  input.setCustomValidity(input.value&&!validDate(input.value)?'올바른 날짜를 YYYY-MM-DD 형식으로 입력해 주세요.':'');
  input.parentElement.querySelector('[data-date-picker]').value=validDate(input.value)?input.value:'';
}
const smallEmpty = (title, text, button = '') => `<div class="empty-state"><div class="empty-icon">${icon('notebook')}</div><h3>${title}</h3><p>${text}</p>${button}</div>`;
const workplaceOptions = () => [...new Set([...state.workplaces, ...state.records.map(r => r.workplace)])].sort((a, b) => a.localeCompare(b, 'ko'));
// Each mark uses a 48-unit grid. Filled shapes have no automatic stroke;
// only deliberate outlines are stroked, so overlapping parts stay crisp.
const toolIllustrations = {
 applications:'<rect class="tool-paper tool-outline" x="6" y="10" width="27" height="32" rx="4"/><path class="tool-dark" d="M16.5 8V7a3 3 0 0 1 6 0v1h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2Z"/><path class="tool-outline" d="M12 22h14M12 28h10M12 34h6"/><circle class="tool-accent tool-badge" cx="33.5" cy="34" r="9.5"/><path class="tool-white-line" d="m29 34 3 3 6-6" stroke-width="3"/>',
 notes:'<rect class="tool-panel" x="5" y="9" width="29" height="33" rx="4"/><path class="tool-green-line" d="M12 5v7m8-7v7m8-7v7" stroke-width="3.5"/><path class="tool-white-line" d="M12 20h15M12 26h10"/><g transform="translate(32 28) rotate(40)"><path class="tool-accent tool-badge" d="M-4-10a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3V7l-4 7-4-7Z"/><path class="tool-white-line" d="M-4-7h8" stroke-width="2"/><path class="tool-paper" d="M-4 7h8l-4 7Z"/><path class="tool-dark" d="m-1.5 11.5 1.5 2.5 1.5-2.5Z"/></g>',
 schedule:'<rect class="tool-sheet" x="6" y="10" width="36" height="33" rx="5"/><path class="tool-accent" d="M11 10h26a5 5 0 0 1 5 5v7H6v-7a5 5 0 0 1 5-5Z"/><path class="tool-outline" d="M15 6v9m18-9v9" stroke-width="3.5"/><g class="tool-gray"><rect x="12" y="26" width="6" height="6" rx="1.5"/><rect x="21" y="26" width="6" height="6" rx="1.5"/><rect x="30" y="26" width="6" height="6" rx="1.5"/><rect x="12" y="34" width="6" height="6" rx="1.5"/><rect x="21" y="34" width="6" height="6" rx="1.5"/><rect x="30" y="34" width="6" height="6" rx="1.5"/></g>',
 calculator:'<rect class="tool-panel" x="5" y="5" width="38" height="38" rx="6"/><path class="tool-divider" d="M24 8v13M8 24h13"/><rect class="tool-accent" x="24" y="24" width="19" height="19" rx="6"/><path class="tool-white-line" d="M11 15h8m-4-4v8M29 15h8M12 30l6 6m-6 0 6-6M29 31h9m-9 5h9" stroke-width="3"/>',
 records:'<rect class="tool-sheet" x="6" y="10" width="36" height="33" rx="5"/><path class="tool-accent" d="M11 10h26a5 5 0 0 1 5 5v7H6v-7a5 5 0 0 1 5-5Z"/><path class="tool-outline" d="M15 6v9m18-9v9" stroke-width="3.5"/><path class="tool-outline" d="M14 27h20M14 32.5h15M14 38h10"/>',
 stats:'<rect class="tool-solid" x="6" y="30" width="8" height="13" rx="2.5"/><rect class="tool-solid" x="19" y="24" width="8" height="19" rx="2.5"/><rect class="tool-accent" x="32" y="18" width="9" height="25" rx="2.5"/><path class="tool-green-line" d="M8 22 38 6m-8 0h8v8" stroke-width="3"/>',
 settings:'<g class="tool-solid"><circle cx="24" cy="24" r="15"/><rect x="20" y="4" width="8" height="12" rx="1.5"/><rect x="20" y="4" width="8" height="12" rx="1.5" transform="rotate(45 24 24)"/><rect x="20" y="4" width="8" height="12" rx="1.5" transform="rotate(90 24 24)"/><rect x="20" y="4" width="8" height="12" rx="1.5" transform="rotate(135 24 24)"/><rect x="20" y="4" width="8" height="12" rx="1.5" transform="rotate(180 24 24)"/><rect x="20" y="4" width="8" height="12" rx="1.5" transform="rotate(225 24 24)"/><rect x="20" y="4" width="8" height="12" rx="1.5" transform="rotate(270 24 24)"/><rect x="20" y="4" width="8" height="12" rx="1.5" transform="rotate(315 24 24)"/></g><circle class="tool-paper" cx="24" cy="24" r="8"/><circle class="tool-accent" cx="24" cy="24" r="5.5"/>',
 guide:'<path class="tool-paper tool-outline" d="M24 16c-6-4-12-5-18-3v27c6-2 12-1 18 3 6-4 12-5 18-3V13c-6-2-12-1-18 3Z"/><path class="tool-outline" d="M24 16v26"/><circle class="tool-accent tool-badge" cx="35" cy="14" r="9"/><path class="tool-white-line" d="M32 11a3 3 0 0 1 6 0c0 2-3 2.5-3 4"/><circle class="tool-paper" cx="35" cy="19" r="1.25"/>'
};
// Painted bounds include round stroke caps and the rotated pencil, unlike getBBox().
// Fit every complete drawing into the same 40-unit square, without stretching.
const toolInkBounds = {
 applications: [4.75,4,44,44.5], notes: [5,3.25,43.2,42],
 schedule: [5.5,4.25,42.5,43.5], calculator: [5,5,43,43],
 records: [5.5,4.25,42.5,43.5], stats: [6,4.5,41,43],
 settings: [4,4,44,44], guide: [4.75,4,45,44.25]
};
// Optical adjustments account for the dark document body, light calendar page,
// and attached badges. Equal outer bounds alone make these marks look off-center.
const toolOpticalOffsets = {
 applications: [2.5,-1.5], notes: [3.25,-2], schedule: [0,-2],
 records: [0,-2], guide: [0.75,-2]
};
const toolIllustration = route => {
 const [left,top,right,bottom]=toolInkBounds[route];
 const scale=40/Math.max(right-left,bottom-top);
 const [opticalX,opticalY]=toolOpticalOffsets[route]||[0,0];
 const x=24-(left+right)*scale/2+opticalX,y=24-(top+bottom)*scale/2+opticalY;
 return `<svg class="tool-illustration" viewBox="0 0 48 48" fill="none" stroke="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><g transform="translate(${x.toFixed(4)} ${y.toFixed(4)}) scale(${scale.toFixed(4)})">${toolIllustrations[route]}</g></svg>`;
};

const appTile = (route, image, name, color) => `<a class="app-tile" href="#${route}"><span class="app-tile-icon ${color}">${toolIllustration(route)}</span><span>${name}</span></a>`;
const shortWorkDate = date => new Intl.DateTimeFormat('ko-KR', {month:'long',day:'numeric',weekday:'short'}).format(new Date(`${date}T12:00:00`));
function dashboardOverview(stats) {
  const now=new Date(),next=nextWorkRecord(state.records,now);
  const ongoing=next&&new Date(`${next.date}T${next.start}:00`)<=now;
  return `<section class="dashboard-overview" aria-label="급여와 다음 근무 요약">
    <a class="dashboard-stat overview-income" href="#stats" data-overview="income"><span class="overview-label">이번 달 예상 급여</span><strong class="overview-value">${numberWon(stats.expected)}</strong><span class="overview-note">${now.getMonth()+1}월 근무 기록 기준</span><span class="overview-icon">${icon('chart')}${icon('chevron')}</span></a>
    <a class="dashboard-stat overview-outstanding" href="#records" data-overview="outstanding"><span class="overview-label">미지급 급여</span><strong class="overview-value">${numberWon(stats.outstanding)}</strong><span class="overview-note">이번 달 미수령액</span><span class="overview-icon">${icon('clock')}${icon('chevron')}</span></a>
    <button type="button" class="dashboard-stat overview-next" data-action="${next?'edit-record':'add-record'}" ${next?`data-id="${esc(next.id)}"`:''}><span class="overview-label">${ongoing?'진행 중인 근무':'다음 근무'}</span>${next?`<strong class="overview-date"><time datetime="${esc(next.date)}">${esc(shortWorkDate(next.date))}</time></strong><span class="overview-note overview-hours">${esc(next.start)}–${esc(next.end)}</span><span class="overview-place" title="${esc(next.workplace)}">${esc(next.workplace)}</span>`:'<strong class="overview-date">일정 등록</strong><span class="overview-note">알바 기록을 추가해요</span>'}<span class="overview-icon">${icon('calendar')}${icon(next?'chevron':'plus')}</span></button>
  </section>`;
}
function homeView() {
  const stats = monthStats(state.records, monthNow());
  const recent = [...state.records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  return `
    <div class="workspace-grid dashboard-layout">
      <section class="workspace-widget profile-widget" aria-label="나의 Freeter"><img class="profile-logo" src="./assets/freeter-512.png" width="96" height="96" alt="안전모를 쓴 곰씨 정면 얼굴 Freeter 로고"><div class="profile-copy"><img class="profile-wordmark freeter-wordmark" src="./assets/freeter-wordmark.png" width="220" height="73" alt="FREETER · 프리터"><h1 class="profile-slogan">저는 단기알바입니다.</h1><p>일한 만큼 기록하고,<br>번 만큼 확인하세요.</p></div><a href="#calculator" class="profile-link" aria-label="급여 계산하기"><span>급여 계산하기</span>${icon('arrow')}</a></section>
      ${dashboardOverview(stats)}
      <section class="workspace-widget launcher-widget" aria-label="근무 관리 도구"><div class="app-launcher">${[['applications','apply','알바 지원','tile-apply'],['notes','edit','업무 메모','tile-notes'],['schedule','calendar','근무표','tile-emerald'],['calculator','calculator','급여 계산','tile-black'],['records','notebook','알바 기록','tile-silver'],['stats','chart','수입 통계','tile-chart'],['settings','settings','데이터 · 설정','tile-settings'],['guide','help','사용 가이드','tile-settings']].map(args=>appTile(...args)).join('')}</div></section>
      <section class="workspace-widget recent-panel records-widget"><div class="widget-bar"><div><h2>최근 알바 기록</h2></div><a href="#records" class="widget-open" aria-label="알바 기록 전체 보기">전체보기 ${icon('chevron')}</a></div><div class="widget-content">${recent.length ? `<div class="recent-list">${recent.map(r=>`<button type="button" class="recent-row" data-action="edit-record" data-id="${esc(r.id)}"><time class="recent-date" datetime="${esc(r.date)}" aria-label="${esc(shortWorkDate(r.date))}"><strong>${esc(r.date.slice(5).replace('-','.'))}</strong><small>${new Intl.DateTimeFormat('ko-KR',{weekday:'short'}).format(new Date(`${r.date}T12:00:00`))}</small></time><span class="recent-details"><strong>${esc(r.workplace)}</strong><span>${esc(r.start)}–${esc(r.end)} · ${duration(calculatePay(r).paidMinutes)}</span></span><span class="recent-amount"><strong>${money(calculatePay(r).expected)}</strong><span class="status ${recordStatus(r)}">${STATUS[recordStatus(r)]}</span></span></button>`).join('')}</div>` : smallEmpty('첫 번째 알바를 기록해 보세요','근무한 하루를 남기면, 급여 관리가 쉬워져요.','<button class="button secondary small" data-action="add-record">'+icon('plus')+'첫 기록 추가하기</button>')}</div></section>
      <section class="workspace-widget memo-widget"><div class="widget-bar"><span class="widget-heading-icon tile-notes">${icon('edit')}</span><div><h2>업무 메모</h2><p>출근 전, 한 번 더 확인</p></div><a href="#notes" class="widget-open" aria-label="업무 메모장 열기">${icon('edit')}</a></div><a class="memo-preview" href="#notes"><span class="memo-preview-title">나의 업무 메모</span><p>${esc(state.workMemo.trim()||'전달받은 업무 설명과 준비물을 적어 두세요.\n필요할 때 바로 꺼내볼 수 있어요.')}</p><span class="memo-preview-cta">${state.workMemo.trim()?'메모 이어 보기':'첫 메모 쓰기'} ${icon('arrow')}</span></a></section>
      <section class="workspace-widget month-widget" aria-labelledby="month-title"><div class="widget-heading"><h2 id="month-title">${new Date().getMonth()+1}월의 기록</h2><a href="#stats" class="text-link">수입 통계 ${icon('chevron')}</a></div><div class="summary-grid home-summary">${summaryCard('calendar','blue','근무한 날',`${stats.days}<small>일</small>`,`${duration(stats.minutes)} 근무`)}${summaryCard('wallet','purple','예상 급여',numberWon(stats.expected),'이번 달 근무 기준')}${summaryCard('check','green','실제 받은 급여',numberWon(stats.cash),'이번 달 입금 기준')}${summaryCard('clock','orange','아직 못 받은 급여',numberWon(stats.outstanding),'이번 달 근무의 미수령액')}</div></section>
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
let miniExpression='', miniAnswer='', miniEvaluated=false;
function miniCalculatorView() {
  const labels={'C':'계산식 초기화','±':'부호 바꾸기','%':'백분율','=':'계산 결과'};
  return `<section class="panel mini-calculator"><div class="mini-calculator-heading"><h2>${icon('calculator')}계산기</h2></div><form id="mini-form" class="calculator-device"><div class="mini-display"><label class="field"><span class="sr-only">계산식</span><input id="mini-expression" type="text" inputmode="decimal" spellcheck="false" autocapitalize="off" maxlength="200" placeholder="계산식 입력" value="${esc(miniExpression)}" autocomplete="off" aria-describedby="mini-help"></label><output id="mini-answer" aria-live="polite">${esc(miniAnswer||'0')}</output></div><div class="mini-keys">${['C','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','='].map(key=>`<button type="button" data-action="mini-key" data-key="${key}" class="mini-key ${['÷','×','−','+'].includes(key)?'operator':['C','±','%'].includes(key)?'utility':key==='='?'equals':key==='0'?'zero':''}" aria-label="${labels[key]||key}">${key==='C'?'AC':key}</button>`).join('')}</div></form><p class="sr-only" id="mini-help">숫자와 +, −, ×, ÷, 소수점, 괄호를 입력하고 Enter로 계산할 수 있어요. 부호와 백분율은 현재 계산한 값에 적용합니다.</p></section>`;
}
function taxFormula(result) {
  if(result.taxType==='daily')return '일용: max(1일 과세급여 − 150,000원, 0) × 6% × (1 − 55%). 소득세 1,000원 미만은 소액부징수로 0원. 지방소득세는 소득세의 10%. 1일분씩 지급받는 기준이며 여러 날 급여를 합쳐 지급받으면 소액부징수 판단이 달라질 수 있어요.';
  if(result.taxType==='freelance')return '프리랜서: 과세 지급액 × 소득세 3% + 지방소득세(소득세의 10%). 통상 합계 3.3%이며 끝수 처리에 따라 차이가 날 수 있어요.';
  return '세금 자동 공제를 적용하지 않았어요. 일용근로 또는 프리랜서를 선택하면 예상 원천징수액을 표시해요.';
}
function calculatorView() {
  const calc=calculatorDefaults();
  return head('PAY CALCULATOR','급여 계산기','하루부터 여러 날까지, 실제 근무시간과 예상 수령액을 확인해요.')+`<div class="tool-layout"><section class="panel form-panel"><div class="panel-title"><h2>${icon('calculator')}근무 정보</h2><span class="small-badge">자동 계산</span></div><form id="calculator-form"><div class="form-grid calculator-basics">${workDateField('calculator-work-date',calc.date)}${field('근무지 이름','workplace','text',calc.workplace,'maxlength="100" list="workplaces" placeholder="예: 행사장"')}${field('총 근무일 수','days','number',calc.days,'required min="1" max="366" step="1" inputmode="numeric"')}</div><p class="field-hint">매일 같은 조건으로 일하는 경우예요. 아래 시간·급여·공제액은 모두 1일 기준으로 입력해 주세요.</p><div class="form-divider"></div>${payFields(calc)}<p class="field-hint">퇴근이 출근보다 이르면 다음 날 퇴근으로 계산해요.</p><button class="button primary full-width" type="submit">${icon('calculator')}급여 계산하기</button></form></section><div class="pay-side"><section class="panel calculation-panel"><div class="panel-title"><h2>내 예상 수령액</h2><span class="small-badge blue-badge">세금 선택 반영</span></div><div id="calculation-result" aria-live="polite"></div><div id="calculator-error" class="form-error" role="alert" hidden></div><button class="button primary full-width" data-action="save-calculation" id="save-calculation">${icon('plus')}선택한 날짜의 1일 기록 저장</button><p class="field-hint centered">기록장에는 입력한 날짜의 하루치만 저장해요. 날짜별 기록은 각각 추가해 주세요.</p><a href="#records" class="text-link centered-link">나의 알바 기록 보기 ${icon('arrow')}</a></section>${miniCalculatorView()}</div></div><aside class="info-strip">${icon('shield')}<p><strong>입력에 따른 예상 원천징수액이에요.</strong> 전체 예상액은 1일 예상 수령액에 근무일 수를 곱한 금액입니다. 실제 소득 분류·비과세·지급 방식에 따라 달라질 수 있으며 4대보험과 최종 정산세액, 주휴·야간·연장 수당은 별도예요.</p><a href="#guide">계산 기준 ${icon('arrow')}</a></aside>${workplacesDatalist()}`;
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
  return head('MY WORK LOG', '나의 알바 기록', '차곡차곡 남긴 나의 하루. 근무와 입금 내역을 한곳에서 관리해요.', `<button class="button primary" data-action="add-record">${icon('plus')}알바 기록 추가</button>`) + `<section class="panel records-panel"><form id="record-filters" class="filters"><label class="field"><span>근무 월</span><input type="month" name="month" value="${esc(recordFilters.month)}" min="1900-01" max="9999-12"><small>비우면 전체 기간</small></label><label class="field"><span>근무지</span><select name="workplace"><option value="">모든 근무지</option>${workplaceOptions().map(w => `<option value="${esc(w)}" ${recordFilters.workplace === w ? 'selected' : ''}>${esc(w)}</option>`).join('')}</select></label><label class="field"><span>지급 상태</span><select name="status"><option value="">모든 상태</option>${Object.entries(STATUS).map(([key, value]) => `<option value="${key}" ${recordFilters.status === key ? 'selected' : ''}>${value}</option>`).join('')}</select></label><label class="field search-field"><span>기록 검색</span><div>${icon('search')}<input type="search" name="search" value="${esc(recordFilters.search)}" placeholder="근무지, 업무, 메모 검색"></div></label><label class="field"><span>정렬</span><select name="sort"><option value="desc" ${recordFilters.sort === 'desc' ? 'selected' : ''}>최근 날짜순</option><option value="asc" ${recordFilters.sort === 'asc' ? 'selected' : ''}>오래된 날짜순</option></select></label></form><div id="record-results" aria-live="polite"></div></section><aside class="info-strip">${icon('help')}<p>지급 상태는 입금 내역과 지급 예정일로 자동 표시돼요. 예정일이 지났고 입금이 없으면 <strong>미지급</strong>, 일부만 입금되면 <strong>일부 지급</strong>으로 표시해요. 지급 완료로 변경 버튼으로 입금일과 남은 금액을 확인하거나 기록을 열어 입금 내역을 추가하세요.</p><a href="#settings">저장 · 계정 설정 ${icon('arrow')}</a></aside>`;
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
  return head('WORK NOTES','업무 메모장','설명은 적어 두고, 필요한 순간 가볍게 꺼내 보세요.')+`<div class="notes-layout"><aside class="notes-sidebar"><div class="notes-collection"><span class="notes-collection-icon">${icon('notebook')}</span><div><h2>나의 업무 메모</h2><p>이 브라우저에 자동 저장</p></div>${icon('lock')}</div><div class="note-selected"><span>업무 메모</span><p>${esc(state.workMemo.trim().split('\n')[0]||'첫 업무 설명을 남겨 보세요.')}</p></div><div class="notes-sidebar-help"><h3>출근 전 체크</h3><p>담당자 연락처와 도착 장소<br>꼭 챙겨야 할 준비물<br>업무 순서와 주의사항</p><a href="#settings">메모 저장 설정 ${icon('chevron')}</a></div></aside>
    <section class="panel notes-panel"><div class="notes-toolbar"><div class="notes-document-title"><span class="notes-document-icon">${icon('edit')}</span><div><h2>오늘의 업무 설명</h2><p>나의 업무 메모</p></div></div><button type="button" class="button primary small memo-save-button" data-action="save-memo" data-save-state="ready" aria-label="업무 메모 저장">${icon('save')}<span>저장</span></button></div>
      <div id="memo-format-toolbar" class="memo-format-toolbar" aria-label="메모 서식"><div class="memo-format-group"><button type="button" class="memo-format-button" data-action="memo-format-bold" aria-label="굵게" aria-pressed="false"><b>B</b></button><button type="button" class="memo-format-button" data-action="memo-format-underline" aria-label="밑줄" aria-pressed="false"><u>U</u></button><label class="memo-size-label"><span class="sr-only">글자 크기</span><select id="memo-font-size" data-memo-format="size" aria-label="글자 크기">${MEMO_SIZES.map(size=>`<option value="${size}" ${size==='17px'?'selected':''}>${size.replace('px','')}</option>`).join('')}</select><span>px</span></label></div><div class="memo-format-group"><label class="memo-color-control"><span>글자색</span><input type="color" id="memo-font-color" data-memo-format="color" value="#1d1d1f" aria-label="글자색"></label><label class="memo-color-control"><span>배경색</span><input type="color" id="memo-background-color" data-memo-format="background" value="#a7f3d0" aria-label="배경색"></label></div></div>
      <div class="notes-paper"><div id="work-memo" class="notes-editor" aria-label="업무 메모 편집"></div></div>
      <div class="notes-save-state"><span id="memo-status" role="status">${state.workMemo.length.toLocaleString('ko-KR')} / 30,000자 · 브라우저 자동 저장</span><span id="memo-lines">${lines}줄</span></div><div class="notes-bottom-bar"><div class="export-actions"><button class="button secondary" data-action="copy-memo">${icon('copy')}메모 복사</button><button class="button secondary" data-action="download-memo">${icon('download')}TXT 저장</button></div><button class="button ghost" data-action="clear-memo" aria-label="메모 내용 비우기">${icon('trash')}비우기</button></div>
    </section></div><p class="notes-privacy-note">${icon('lock')}입력 즉시 이 브라우저에 저장돼요. 다른 기기에서 사용하려면 <a href="#settings">계정 연결 상태</a>를 확인해 주세요.</p>`;
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
  $('#memo-status').textContent=`${state.workMemo.length.toLocaleString('ko-KR')} / 30,000자 · ${saved?(cloud.user?'기기에 저장됨 · 계정 자동 동기화':'브라우저 자동 저장'):'저장되지 않음 · 내용을 복사해 두세요'}`;
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
  for(const [action,active] of [['bold',format.bold===true],['underline',format.underline===true]])$(`[data-action="memo-format-${action}"]`).setAttribute('aria-pressed',String(active));
  $('#memo-font-size').value=MEMO_SIZES.includes(format.size)?format.size:'17px';
  if(typeof format.color==='string'&&/^#[a-f0-9]{6}$/i.test(format.color))$('#memo-font-color').value=format.color;
  if(typeof format.background==='string'&&/^#[a-f0-9]{6}$/i.test(format.background))$('#memo-background-color').value=format.background;
}
function formatMemo(key,value) {
  if(!memoQuill)return;
  const max=memoQuill.getLength()-1,range=memoQuill.getSelection()||memoSelection,index=Math.min(range.index,max),length=Math.min(range.length,max-index);
  memoQuill.focus();memoQuill.setSelection(index,length,'silent');
  const format=memoQuill.getFormat(index,length);
  if(key==='bold'||key==='underline')value=format[key]!==true;
  if(length)memoQuill.formatText(index,length,key,value,'user');else memoQuill.format(key,value,'user');
  if(key==='background'&&value&&!format.color){if(length)memoQuill.formatText(index,length,'color','#1d1d1f','user');else memoQuill.format('color','#1d1d1f','user');}
  memoSelection={index,length};updateMemoTools();
}
function newFeaturesGuide() {
  return `<details class="panel tax-guide"><summary>세금 계산 자세히 보기 ${icon('chevron')}</summary><div class="tax-guide-content"><h2>세금 유형별 예상 수령액</h2><p><strong>일용근로소득:</strong> 1일 과세급여에서 150,000원을 공제한 금액에 6% 세율과 55% 세액공제를 적용합니다. 일일 산식은 max(과세급여 − 150,000, 0) × 0.06 × 0.45입니다. 소득세가 1,000원 미만이면 소액부징수로 0원, 지방소득세는 계산된 소득세의 10%입니다. 소득세와 지방소득세는 각각 10원 미만을 절사합니다. 1일 200,000원이면 소득세 1,350원, 지방소득세 130원, 예상 수령액은 198,520원입니다.</p><p>이 계산은 기록 1건이 1일분이고 따로 지급받는 기준입니다. 여러 날의 급여를 한 번에 받는 경우 소액부징수 기준이 달라질 수 있으므로 지급처의 원천징수 명세서를 확인하세요. 근무 기간 등 법상 일용근로 요건에 해당할 때 선택해야 합니다.</p><p><strong>프리랜서:</strong> 사업소득 원천징수 대상인 경우 과세 지급액의 3%를 소득세로, 소득세의 10%를 지방소득세로 계산합니다. 통상 총 3.3%이며 끝수 처리로 차이가 날 수 있습니다. 200,000원이면 합계 6,600원 공제, 예상 수령액은 193,400원입니다. 4대보험과 최종 종합소득세 정산은 포함하지 않습니다.</p><p>추가 지급액도 기본적으로 과세금액에 포함합니다. 지급처에서 확인한 비과세 금액만 별도로 입력하세요. 자동 계산되는 세금을 기타 공제액에 다시 넣으면 중복 차감됩니다. 기존 기록은 세금 유형을 바꾸기 전까지 공제 안 함으로 보존됩니다.</p><p>법령 참고: <a href="https://www.law.go.kr/법령/소득세법/제47조" target="_blank" rel="noopener noreferrer">근로소득공제</a> · <a href="https://www.law.go.kr/법령/소득세법/제59조" target="_blank" rel="noopener noreferrer">근로소득세액공제</a> · <a href="https://www.law.go.kr/법령/소득세법/제129조" target="_blank" rel="noopener noreferrer">원천징수 세율</a> · <a href="https://www.nts.go.kr/nts/main.do" target="_blank" rel="noopener noreferrer">국세청 안내</a></p></div></details><button type="button" class="updates-trigger" data-action="open-updates"><span class="updates-trigger-icon">${icon('sparkle')}</span><span><strong>업데이트 내역</strong><small>새로운 근무 관리 도구를 확인해 보세요.</small></span>${icon('chevron')}</button>`;
}
function openUpdates() {
  const dialog=ensureAppDialog('updates-dialog','updates-title');
  dialog.innerHTML=`<div class="dialog-head"><div><p class="eyebrow">WHAT’S NEW</p><h2 id="updates-title">업데이트 내역</h2></div><button type="button" class="icon-button" data-action="close-updates" aria-label="업데이트 내역 닫기">${icon('close')}</button></div><div class="updates-layout"><section class="updates-content"><span class="update-date">2026.10.17 · FREETER UPDATE</span><h3>새로운 근무 관리 도구</h3><p class="updates-intro">곰씨와 함께, 오늘의 일을 조금 더 편하게.</p><ul class="update-list"><li><span>${icon('calendar')}</span><div><h4>우리 현장에 맞는 교대</h4><p>3인 밀어내기·2인 맞교대, 모두 함께·1명씩·2명 먼저 점심을 선택해요. 모바일에서도 표를 한눈에 볼 수 있어요.</p></div></li><li><span>${icon('calculator')}</span><div><h4>세금까지 계산하는 급여</h4><p>일용근로소득과 프리랜서 3.3%를 선택하고 예상 수령액을 확인해요. 작은 계산기로 추가 계산도 할 수 있어요.</p></div></li><li><span>${icon('check')}</span><div><h4>받은 급여는 지급 완료</h4><p>실제 입금일과 금액을 남기면 지급 상태와 수입 통계에 함께 반영돼요.</p></div></li><li><span>${icon('edit')}</span><div><h4>입력 즉시 반응하는 업무 메모</h4><p>한글을 입력하는 순간 안내 문구가 사라져요. 굵게·크기·밑줄·글자색·형광펜으로 중요한 내용을 표시해요. 입력 즉시 자동 저장하고 저장 버튼으로도 바로 저장해요. 저장한 서식은 다시 열어도 유지돼요.</p></div></li><li><span>${icon('sun')}</span><div><h4>곰씨가 알려주는 오늘 날씨</h4><p>상단 날씨 버튼에서 기온·습도·자외선·일출·일몰·미세먼지를 확인해요. 지역을 고르거나 내 위치를 사용할 수 있어요.</p></div></li></ul></section><aside class="updates-mascot"><img src="./assets/gomssi.png" width="240" height="280" alt="노란 안전모와 작업 조끼를 입고 인사하는 노가다 곰씨"><span>노가다 곰씨</span><p>오늘도 안전하게,<br>기록은 꼼꼼하게.</p></aside></div>`;
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
  try{const result=evaluateExpression(miniExpression);miniAnswer=`= ${result.toLocaleString('ko-KR',{maximumFractionDigits:12})}`;miniExpression=miniNumber(result);miniEvaluated=true;updateMiniDisplay();}
  catch(failure){$('#mini-answer').textContent=failure.message;$('#mini-answer').dataset.error='true';}
}
const miniNumber=value=>value.toLocaleString('en-US',{useGrouping:false,maximumFractionDigits:12});
const filterMiniExpression=value=>value.replace(/[^\d\s.()+\-*/×÷−]/g,'').slice(0,200);
function readMiniInput(input) {
  const raw=input.value,start=input.selectionStart??raw.length,end=input.selectionEnd??start;
  const filtered=filterMiniExpression(raw);
  if(raw!==filtered){input.value=filtered;input.setSelectionRange(filterMiniExpression(raw.slice(0,start)).length,filterMiniExpression(raw.slice(0,end)).length);}
  if(raw!==filtered&&filtered===miniExpression)return;
  miniExpression=filtered;miniAnswer='';miniEvaluated=false;updateMiniDisplay();
}
function updateMiniDisplay(){
  $('#mini-expression').value=miniExpression;$('#mini-answer').textContent=miniAnswer||'0';$('#mini-answer').dataset.error='false';
}

function applicationsView() {
  return head('MY APPLICATIONS','알바 지원','지원한 공고, 나의 경력, 문자 지원 양식을 한곳에 모아 두세요.')+`
    <div class="applications-layout">
      <section class="panel application-board" aria-labelledby="application-board-title">
        <div class="panel-title"><div><h2 id="application-board-title"><img src="./assets/applications-icon.png?v=${APP_RELEASE}" width="39" height="39" alt="">지원한 알바 공고</h2><p>공고 내용을 확인하고, 버튼을 눌러 fix · 떨어짐 상태를 표시하세요.</p></div><button type="button" class="button primary" data-action="new-application">${icon('plus')}공고 작성</button></div>
        <label class="field application-search"><span>제목 검색</span><input id="application-search" type="search" maxlength="160" placeholder="찾는 공고 제목" value="${esc(applicationSearch)}"></label>
        <div id="application-list" aria-live="polite"></div>
      </section>
      <div class="application-writing">
        <section class="panel application-note">
          <div class="panel-title"><h2>${icon('edit')}문자 지원 양식</h2><button type="button" class="button secondary small" data-action="copy-application-template">${icon('copy')}복사</button></div>
          <p class="field-hint">${APPLICATION_TEMPLATE_EXAMPLE} 순서로 작성해 보세요.</p>
          <label class="field"><span>나의 문자 지원 내용</span><textarea id="application-template" maxlength="30000" rows="6" placeholder="${APPLICATION_TEMPLATE_EXAMPLE}">${esc(state.applicationTemplate)}</textarea></label>
          <p id="template-save-state" class="application-save-state" role="status">${state.applicationTemplate.length.toLocaleString('ko-KR')} / 30,000자 · 자동 저장</p>
        </section>
        <section class="panel application-note">
          <div class="panel-title"><h2>${icon('notebook')}단기 알바 경력</h2><button type="button" class="button secondary small" data-action="copy-career">${icon('copy')}복사</button></div>
          <label class="field"><span>참여한 행사와 업무 경험</span><textarea id="application-career" maxlength="30000" rows="9" placeholder="예: 2026.10 전시회 안내 · 3일\n입장 안내, 관람객 응대, 물품 정리">${esc(state.applicationCareer)}</textarea></label>
          <p id="career-save-state" class="application-save-state" role="status">${state.applicationCareer.length.toLocaleString('ko-KR')} / 30,000자 · 자동 저장</p>
        </section>
      </div>
    </div>`;
}
function renderApplicationList() {
  const host=$('#application-list');if(!host)return;
  const posts=state.applications.filter(post=>post.title.toLocaleLowerCase('ko-KR').includes(applicationSearch.trim().toLocaleLowerCase('ko-KR'))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id));
  const pages=Math.max(1,Math.ceil(posts.length/10));applicationPage=Math.max(0,Math.min(applicationPage,pages-1));
  const shown=posts.slice(applicationPage*10,applicationPage*10+10);
  host.innerHTML=`<div class="application-list-caption"><span>${posts.length.toLocaleString('ko-KR')}개의 공고</span></div>${shown.length?`<ul class="application-titles">${shown.map(post=>`<li${post.rejected?' class="is-rejected"':''}><button type="button" data-action="view-application" data-id="${esc(post.id)}" title="${esc(post.title)}"><span>${esc(post.title)}</span>${icon('chevron')}</button><button type="button" class="application-fix" data-action="fix-application" data-id="${esc(post.id)}" aria-label="${esc(post.title)} ${post.rejected?'fix로 변경':'떨어짐으로 변경'}" aria-pressed="${!!post.rejected}" title="${post.rejected?'떨어짐 · 다시 누르면 fix로 변경':'클릭하면 떨어짐으로 변경'}">${post.rejected?'떨어짐':'fix'}</button></li>`).join('')}</ul>`:smallEmpty(applicationSearch?'검색한 제목이 없어요':'지원한 공고를 모아 보세요',applicationSearch?'다른 제목으로 검색해 보세요.':'지원 내용이나 모집 조건을 남기면 다시 찾기 쉬워요.')}<div class="application-pagination"><button type="button" class="button secondary small" data-action="application-prev" ${applicationPage===0?'disabled':''}>이전</button><span>${applicationPage+1} / ${pages}</span><button type="button" class="button secondary small" data-action="application-next" ${applicationPage>=pages-1?'disabled':''}>다음</button></div>`;
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
    if(!id&&state.applications.length>=2000)throw new Error('공고는 2,000개까지 저장할 수 있어요. 필요 없는 공고를 정리한 뒤 추가해 주세요.');
    const now=new Date().toISOString(),post=validateApplication({id:id||crypto.randomUUID(),title:values.title,body:values.body,url:values.url.trim(),createdAt:existing?.createdAt||now,updatedAt:now,pinned:existing?.pinned,decided:existing?.decided,rejected:existing?existing.rejected:true});
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
function accountStatusText(view) {
  return view.phase==='guest'&&view.label==='이 브라우저에 저장'?'':view.label;
}
function accountContent() {
  const view=cloud.snapshot,statusText=accountStatusText(view);
  const status=`<p class="account-status" data-cloud-status data-status="${esc(view.phase)}" role="status" ${statusText?'':'hidden'}>${esc(statusText)}</p>`;
  if(!view.user)return `<div class="account-intro"><span class="account-avatar" aria-hidden="true"><svg viewBox="0 0 96 96" width="64" height="64" focusable="false"><circle cx="48" cy="35" r="20"/><path d="M12 96a36 36 0 0 1 72 0Z"/></svg></span><h3>프로필</h3></div>${status}<button class="button google-login" data-action="google-login" ${!view.configured||view.phase==='loading'?'disabled':''}><span class="google-mark" aria-hidden="true"><svg viewBox="0 0 48 48" width="18" height="18" focusable="false"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"/><path fill="#FBBC05" d="M10.53 28.59A14.41 14.41 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.87 23.87 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg></span>Google로 계속하기</button><p class="field-hint account-contact-note">로그인 전 기록은 이 브라우저에 별도로 남아요. 로그인 후 직접 가져올 수 있습니다.<br>Google 계정으로 PC·모바일 동기화와 백업을 이용하려면 개발자에게 문의해 주세요.</p>`;
  return `<p class="account-email">${esc(view.user.email||'Google 계정')}</p>${status}<p class="field-hint" data-cloud-verified>${esc(serverVerifiedLabel(view))}</p><div class="account-actions"><button class="button primary small" data-action="account-sync">${icon('check')}지금 동기화</button><button class="button secondary small" data-action="account-import">브라우저 기록 가져오기</button>${!cloud.config?.allowedEmailHash?'<button class="button secondary small" data-action="account-switch">다른 Google 계정으로 로그인</button>':''}<button class="button ghost small" data-action="account-logout">로그아웃</button></div><div class="account-conflict" data-cloud-conflict ${view.phase==='conflict'?'':'hidden'}><h3>같은 내용을 다른 기기에서 수정했어요.</h3><p>자동 덮어쓰기를 멈췄어요. 사용할 내용을 직접 선택해 주세요. 선택할 때까지 현재 기록을 덮어쓰지 않아요.</p><div class="account-actions"><button class="button secondary small" data-action="account-use-remote">서버 기록 사용</button><button class="button secondary small" data-action="account-use-local">이 기기 기록 사용</button></div></div><p class="field-hint">변경 사항은 자동으로 저장되며, 다른 기기의 내용은 약 10초 간격으로 확인해요. 서버 전송 전 로그아웃한 기록은 이 기기에 계정별로 보관하고, 같은 Google 계정으로 다시 로그인하면 전송합니다.</p>`;
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
  const statusText=accountStatusText(view);
  for(const node of $$('[data-cloud-status]')){node.textContent=statusText;node.dataset.status=view.phase;node.hidden=!statusText;}
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
  if(!await confirmAction(`계정의 현재 기록 ${state.records.length}건과 메모·근무표를 이 브라우저의 로그인 전 기록 ${incoming.records.length}건으로 교체합니다. 기존 계정 기록이 바뀝니다. 브라우저의 원래 기록은 유지됩니다.`,'브라우저 기록을 계정으로 가져올까요?','가져오기'))return;
  browserStorage.setItem(cloud.cacheKey+':recovery',JSON.stringify(state));
  if(!cloud.save(incoming,{reset:true}))throw new Error(cloud.snapshot.label);
  state=incoming;rawStored=JSON.stringify(state);render();toast('브라우저 기록을 가져왔어요. 계정 저장 상태를 확인해 주세요.');
}

let coffeeClicked=false;
function coffeeUrl(){
  try{const url=new URL(SUPPORT_CONFIG.coffeeUrl);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
function coffeeBanner(){
  const linked=!!coffeeUrl();
  return `<section class="panel settings-card wide coffee-banner" data-coffee-state="${coffeeClicked?'drive':'please'}" aria-labelledby="coffee-title"><div class="coffee-copy"><span class="coffee-eyebrow">A LITTLE COFFEE FOR GOMSSI</span><h2 id="coffee-title">곰씨에게 커피 한 잔</h2><p class="coffee-message">프리터가 도움이 되었다면<br>곰씨에게 커피 한 잔 보내 주세요.</p><p class="coffee-detail">자동 저장과 파일 백업·복원은 무료예요.<br>도움이 필요하면 카카오톡에서 문의해 주세요.</p><button type="button" class="button coffee-button" data-action="coffee-gomssi">${icon('coffee')}곰씨한테 커피 값 보내기 ${icon('arrow')}</button><p class="coffee-link-note" role="status">${linked?(coffeeClicked?'카카오톡 문의 창을 열었어요. 곰씨는 드라이브 중!':'카카오톡 오픈채팅으로 연결돼요.'):(coffeeClicked?'곰씨의 드라이브 미리보기예요. 후원 링크는 준비 중이에요.':'후원 링크 연결 전 · 버튼으로 곰씨의 반응을 미리 볼 수 있어요.')}</p></div><div class="coffee-art"><img class="coffee-illustration" src="./assets/gomssi-coffee-${coffeeClicked?'drive':'please'}.png?v=${APP_RELEASE}" alt="${coffeeClicked?'초록색 스포츠카를 타고 떠나는 곰씨':'큰 눈망울로 안전모를 들고 커피 한 잔을 부탁하는 곰씨'}" width="360" height="360"></div></section>`;
}
function homeScreenBanner(extraClass='') {
  const arrow=icon('arrow','homescreen-arrow');
  return `<section class="panel homescreen-banner ${extraClass}" aria-labelledby="homescreen-title"><div class="homescreen-heading"><img class="homescreen-preview" src="./assets/freeter-homescreen-192.png?v=${APP_RELEASE}" width="80" height="80" alt="여백을 두고 중앙에 배치한 곰씨 홈 화면 아이콘"><div><span class="homescreen-eyebrow">FREETER, ONE TAP AWAY</span><h2 id="homescreen-title">스마트폰 홈 화면에 추가해 보세요</h2><p>곰씨 아이콘을 누르면 프리터가 바로 열려요.</p></div></div><div class="homescreen-steps"><div><strong>삼성 인터넷</strong><p><span class="homescreen-step">메뉴 ☰</span><span class="homescreen-step">${arrow}현재 페이지 추가</span><span class="homescreen-step">${arrow}홈 화면</span></p></div><div><strong>Android Chrome</strong><p><span class="homescreen-step">메뉴 ⋮</span><span class="homescreen-step">${arrow}홈 화면에 추가</span><span class="homescreen-step">${arrow}추가 또는 설치</span></p></div><div><strong>iPhone Safari</strong><p><span class="homescreen-step">공유 ${icon('upload','homescreen-menu-icon')}</span><span class="homescreen-step">${arrow}홈 화면에 추가</span><span class="homescreen-step">${arrow}추가</span></p></div></div><p class="homescreen-note">한 번 접속하면 주요 도구를 오프라인에서도 사용할 수 있어요. 설치 후 계정 저장 상태도 확인해 주세요.</p></section>`;
}
function dataTransferBanner() {
  return `<section class="panel settings-card wide data-transfer" aria-labelledby="data-transfer-title"><h2 id="data-transfer-title" class="sr-only">데이터 백업과 복원</h2>${[['backup','download','전체 데이터 백업','기록·메모·근무표를 JSON 파일로 저장'],['restore','upload','백업 파일 복원','이전에 저장한 JSON 파일 가져오기'],['records-excel','table','엑셀로 내보내기','근무 내역과 급여 정리 · CSV 파일']].map(([action,image,title,description])=>`<button type="button" class="data-transfer-row" data-action="${action}"><span class="data-transfer-icon">${icon(image)}</span><span><strong>${title}</strong><small>${description}</small></span>${icon('chevron')}</button>`).join('')}<input type="file" id="restore-file" accept=".json,application/json" hidden><p id="data-transfer-status" class="data-transfer-status" role="status" hidden></p></section>`;
}
function setTransferStatus(message,error=false){const node=$('#data-transfer-status');if(node){node.hidden=false;node.textContent=message;node.dataset.error=String(error);}}
document.addEventListener('change',async event=>{
  if(event.target.id!=='restore-file')return;
  const file=event.target.files?.[0];if(!file)return;
  const owner=cloud.user?.id||null,before=JSON.stringify(state);
  try{
    if(file.size>10*1024*1024)throw new Error('10MB 이하의 JSON 백업 파일을 선택해 주세요.');
    const incoming=validateState(JSON.parse((await file.text()).replace(/^\uFEFF/,'')));
    const unchanged=()=>owner===(cloud.user?.id||null)&&before===JSON.stringify(state);
    if(!unchanged())throw new Error('파일을 읽는 동안 계정이나 기록이 바뀌었어요. 파일을 다시 선택해 주세요.');
    if(cloud.user&&cloud.snapshot.phase==='conflict')throw new Error('계정 창에서 동기화 충돌을 먼저 해결한 뒤 복원해 주세요.');
    if(!await confirmAction(`현재 공간의 기록과 메모·근무표를 파일의 알바 기록 ${incoming.records.length}건과 저장 내용으로 교체해요. 필요한 현재 기록은 먼저 JSON으로 백업해 주세요.${owner?' 복원한 내용은 현재 로그인 계정에도 저장됩니다.':''}`,'백업 파일을 복원할까요?','복원하기'))return;
    if(!unchanged())throw new Error('확인 중 기록이 변경되어 복원을 멈췄어요. 최신 기록을 확인해 주세요.');
    if(owner){if(!cloud.save(incoming,{reset:true}))throw new Error(cloud.snapshot.label);}
    else localStorage.setItem(STORAGE_KEY,JSON.stringify(incoming));
    state=incoming;rawStored=JSON.stringify(state);storageBlocked=false;$('#storage-alert').hidden=true;calcSavedHash='';render();
    setTransferStatus(owner?'이 기기에 복원했어요. 계정 창에서 서버 저장 상태를 확인해 주세요.':'백업 파일의 기록을 복원했어요.');
  }catch(failure){setTransferStatus(failure.name==='QuotaExceededError'?'브라우저 저장 공간이 부족해 복원하지 못했어요. 현재 기록은 유지됩니다.':failure instanceof SyntaxError?'JSON 백업 파일을 읽을 수 없어요. 파일을 다시 확인해 주세요.':failure.message||'복원하지 못했어요. 현재 기록은 유지됩니다.',true);}
  finally{event.target.value='';}
});
function settingsView() {
  return head('YOUR DATA, YOUR CONTROL','데이터 · 설정','계정 연결과 화면 설정을 한곳에서 관리하세요.')+`<div class="settings-grid">${accountCard()}${dataTransferBanner()}${homeScreenBanner('settings-card wide')}<section class="panel settings-card"><span class="feature-icon purple">${icon('moon')}</span><h2>내게 편한 화면</h2><p>늦은 시간에도 편안하게. 원하는 테마를 선택하세요.</p><div class="theme-options"><button class="theme-option ${effectiveTheme()==='light'?'selected':''}" data-action="set-theme" data-theme="light">${icon('sun')}라이트 모드</button><button class="theme-option ${effectiveTheme()==='dark'?'selected':''}" data-action="set-theme" data-theme="dark">${icon('moon')}다크 모드</button></div></section><section class="panel settings-card settings-privacy"><span class="feature-icon blue">${icon('shield')}</span><h2>개인정보 안내</h2><p>기록 저장과 계정 동기화, 날씨 위치 정보, 후원 링크의 처리 방식을 확인하세요.</p><a class="text-link" href="#privacy">개인정보 안내 자세히 보기 ${icon('arrow')}</a></section><section class="panel settings-card wide danger-zone"><div><h2>전체 데이터 삭제</h2><p>지원 자료·근무표·알바와 입금 기록·메모를 모두 삭제해요. 삭제한 기록은 되돌릴 수 없어요.</p></div><button class="button danger-outline" data-action="delete-all">${icon('trash')}전체 삭제</button></section>${coffeeBanner()}</div>`;
}
function guideView() {
  const cards=[
    ['calculator','급여 계산하기','하루 일하면 얼마를 받을까요?',[
      ['근무 조건 입력','날짜, 근무지, 시급 또는 일급을 입력해요.'],['시간과 휴게 입력','출근·퇴근시간과 무급 휴게시간을 넣어요. 여러 날이면 근무일 수도 바꿔요.'],['금액 확인하고 저장','예상 급여를 확인한 뒤 기록 저장을 누르면 하루치 기록이 남아요.']],'09:00–18:00 · 휴게 1시간 · 시급 12,000원 → 1일 96,000원','계산기 열기'],
    ['records','급여 입금 확인하기','일한 날과 받은 돈을 함께 정리해요.',[
      ['알바 기록 열기','급여 계산기에서 저장했거나 새로 추가한 기록을 눌러요.'],['입금 내역 추가','실제로 받은 날짜와 금액을 적어요. 나눠 받았다면 여러 번 추가할 수 있어요.'],['지급 상태 확인','예상 급여만큼 받으면 지급 완료, 일부만 받으면 일부 지급으로 바뀌어요.']],'예상 급여는 근무한 달, 실제 받은 돈은 입금된 달의 통계에 표시돼요.','알바 기록 열기'],
    ['schedule','교대 근무표 만들기','이름과 시간만 넣고 공평하게 쉬어요.',[
      ['인원과 이름 입력','3인 밀어내기 또는 2인 맞교대를 선택하고 이름을 넣어요.'],['일정과 식사 설정','시작·종료시간, 점심 방식, 휴식 간격을 정해요.'],['생성하고 조정','근무표 생성하기를 눌러요. 휴식 시간 조정에서 길이 변경이나 휴식 없음을 선택할 수 있어요.']],'휴식은 A→B→C 순서예요. 마지막에 1시간이 남으면 20분씩, 30분이면 10분씩 나눠요. 분 단위로 나누어떨어지지 않으면 최대 1분 차이가 나요.','근무표 열기'],
    ['applications','알바 지원 준비하기','경력과 문자 양식을 한곳에 모아요.',[
      ['지원 문자 준비','행사명/이름/나이/거주지/경력사항 순서로 양식을 적어요.'],['경력과 공고 저장','단기 알바 경력을 정리하고 지원한 공고를 제목과 함께 저장해요.'],['공고 결과 표시','처음에는 떨어짐으로 표시돼요. 버튼을 누르면 fix로 바뀌고, 다시 눌러 바꿀 수 있어요.']],'저장한 공고는 제목을 누르면 내용을 볼 수 있어요.','알바 지원 열기'],
    ['notes','업무 메모 쓰기','출근 전 준비물과 업무를 빠르게 확인해요.',[
      ['바로 입력','전달받은 업무 내용, 담당자 연락 방법, 준비물을 적어요.'],['필요한 부분 강조','굵게·밑줄·글자 크기·글자색·배경색으로 중요한 내용을 표시해요.'],['저장 상태 확인','입력 내용은 자동 저장돼요. 저장 버튼을 누르면 완료 아이콘으로 한 번 더 확인할 수 있어요.']],'복사하거나 TXT로 저장해 다른 곳에서도 메모를 볼 수 있어요.','업무 메모 열기'],
    ['settings','백업하고 다른 기기에서 이어 쓰기','내 기록을 파일로 안전하게 챙겨요.',[
      ['전체 데이터 백업','데이터 · 설정에서 전체 데이터 백업을 누르면 JSON 파일이 저장돼요.'],['파일로 복원','백업 파일 복원에서 JSON 파일을 골라요. 복원하면 현재 기록을 파일 내용으로 교체해요.'],['기기 간 연결','Google 로그인·동기화 이용은 개발자에게 문의해 주세요. 로그인 후에는 계정 창에서 서버 저장 상태를 확인해요.']],'엑셀로 내보내기는 근무·급여 기록을 CSV로 저장해요. CSV는 전체 데이터 복원용 파일이 아니에요.','데이터 · 설정 열기']
  ];
  return head('FREETER GUIDE','프리터, 이렇게 쓰세요.','처음이라면 급여 계산부터 시작해 보세요. 필요한 기능만 골라 읽을 수 있어요.')+`<nav class="guide-shortcuts" aria-label="사용법 바로가기">${cards.map(([route,title])=>`<a href="#help-${route}" data-guide-jump="${route}">${icon(route==='settings'?'shield':route==='records'?'notebook':route==='applications'?'apply':route==='notes'?'edit':route==='schedule'?'calendar':'calculator')}${title}</a>`).join('')}</nav><div class="guide-howto-grid">${cards.map(([route,title,description,steps,note,cta],index)=>`<article class="panel guide-howto" id="help-${route}"><div class="guide-howto-heading"><span class="guide-number">0${index+1}</span><div><h2>${title}</h2><p>${description}</p></div></div><ol class="guide-howto-steps">${steps.map(([label,text])=>`<li><strong>${label}</strong><p>${text}</p></li>`).join('')}</ol><p class="guide-tip">${icon('help')}<span>${note}</span></p><a class="text-link" href="#${route}">${cta} ${icon('arrow')}</a></article>`).join('')}</div><aside class="panel guide-pay-note"><h2>급여 계산에서 알아두세요</h2><p>시급제는 무급 휴게시간을 뺀 시간으로 계산하고, 일급제는 입력한 계약 일급을 사용해요. 세금은 선택한 유형에 따라 계산해요. 주휴·야간·연장 수당은 자동 적용하지 않으니 실제 계약 조건도 확인해 주세요.</p></aside>${newFeaturesGuide()}`;
}

function privacyView() {
  return head('YOUR DATA, YOUR CHOICE','내 기록을 안전하게.','저장 위치와 계정 연결, 위치 정보와 후원 링크의 처리 방식을 안내합니다.')+`<article class="panel prose privacy-current"><p class="privacy-updated">최종 수정 · 2026년 10월 18일</p>
    <h2>이 브라우저에 저장하는 기록</h2><p>지원 공고와 결과, 단기 알바 경력·문자 지원 내용, 근무표, 근무·급여·입금 기록, 업무 메모와 서식, 화면 설정을 브라우저 localStorage에 저장합니다. 로그인 전 작성한 기록을 자동으로 서버에 보내지 않습니다. 시크릿 모드를 닫거나 브라우저 데이터를 삭제하면 기기 기록이 사라질 수 있습니다.</p>
    <h2>Google 계정과 Supabase 동기화</h2><p>Google 로그인은 등록된 계정용으로 제공됩니다. Supabase Auth가 계정 식별자·이메일·기본 프로필과 로그인 세션을 처리합니다. Freeter는 Google 비밀번호를 받지 않으며 메일·Google Drive 접근 권한을 요청하지 않습니다.</p><p>로그인 후 작성한 기록은 계정별 기기 사본에 저장하고 Supabase 연결 상태에 따라 서버와 동기화합니다. 기기에 저장됐다는 표시가 서버 저장 완료를 뜻하지는 않습니다. 계정 창의 저장 상태와 최근 서버 확인 시각을 확인해 주세요. 로그인 전 기록은 사용자가 가져오기를 선택한 경우에만 계정 기록으로 옮깁니다.</p>
    <h2>기기 사본과 접근</h2><p>로그인 세션과 전송 대기 중인 계정 기록은 브라우저에 보관합니다. 로그아웃 시 기기 로그인 정보를 지우고 로그인 전 기록으로 돌아갑니다. 미전송 자료는 같은 계정으로 다시 로그인했을 때 전송을 이어가기 위해 계정별로 남을 수 있습니다. 동시 수정 시 자동 덮어쓰기를 멈추고 사용할 기록을 선택합니다.</p><p>계정 데이터는 서버의 사용자별 접근 정책으로 관리하며 종단간 암호화 저장소는 아닙니다. 기기의 브라우저 자료와 내려받은 파일은 그 기기를 사용하는 사람이 열람할 수 있습니다. 공용 기기에서는 사용 후 로그아웃해 주세요.</p>
    <h2>내려받기와 전체 삭제</h2><p>현재 열어 둔 브라우저 또는 로그인 계정의 전체 기록을 JSON 파일로 백업하고 복원할 수 있습니다. 백업 파일에는 근무·입금 기록, 메모와 서식, 지원 자료, 근무표, 화면 설정이 포함되며 로그인 세션과 인증 토큰은 포함되지 않습니다. 복원 전 파일 형식을 검사하고 교체 여부를 확인합니다. 복원은 현재 공간의 기록을 교체하며 로그인 중에는 해당 계정에도 반영될 수 있습니다. 근무표 PNG·CSV·텍스트 공유, 알바 기록 CSV, 메모 TXT·복사는 사용자가 실행할 때만 동작합니다. 공유하거나 내려받은 자료에는 직접 입력한 개인정보가 포함될 수 있으며 외부에 전달한 파일은 Freeter에서 삭제할 수 없습니다.</p><p>로그인 전 전체 삭제는 이 서비스의 브라우저 기록과 이전 기기 사본을 삭제합니다. 로그인 후 전체 삭제는 현재 계정의 기록을 비우며 서버에 반영되면 같은 계정의 다른 기기에도 적용됩니다. Google 계정과 로그인 전의 별도 기록은 삭제하지 않습니다. 삭제한 기록은 서비스에서 되돌릴 수 없습니다. 서비스 제공자의 로그·서버 보관 자료에는 각 제공자의 보관 정책이 적용됩니다.</p>
    <h2>날씨와 위치 정보</h2><p>상단 날씨 창을 열면 선택 지역의 좌표를 Open-Meteo에 보내 날씨와 대기질을 조회합니다. 기본 지역은 서울입니다. 내 위치 버튼을 누르고 브라우저에서 허용한 경우에만 기기 위치를 사용하며 전송 좌표는 소수점 둘째 자리로 줄입니다. 위치를 계정 기록·브라우저 저장소·오프라인 캐시에 저장하지 않습니다.</p>
    <h2>곰씨 커피 후원</h2><p>버튼을 누르면 개발자의 카카오톡 오픈채팅이 새 창으로 열립니다. 대화나 별도 후원은 사용자가 카카오톡에서 직접 진행합니다. Freeter는 채팅 내용, 카드·계좌 정보나 결제 완료 정보를 수집하지 않으며 버튼 클릭만으로 송금하지 않습니다.</p><p>곰씨의 스포츠카 그림은 버튼 클릭에 따른 연출이며 결제 완료 표시가 아닙니다. 파일 백업·복원은 후원 여부와 관계없이 무료로 사용할 수 있습니다. 후원 버튼을 누르거나 후원하더라도 개인 기록이 개발자에게 자동 전송되지 않습니다. 별도 지원은 개발자와 협의해 주세요.</p>
    <h2>호스팅과 오프라인 사용</h2><p>GitHub Pages가 사이트 파일을 제공하고 Google·Supabase가 계정 인증과 저장을, Open-Meteo가 날씨 정보를 제공합니다. 서비스 워커는 공개 화면과 이미지 등 사이트 파일을 캐시하며 개인 기록 API·인증 응답·위치 응답을 캐시하지 않습니다. 광고·분석용 추적 스크립트는 사용하지 않습니다.</p><a class="button secondary" href="#settings">계정과 내 데이터 관리 ${icon('arrow')}</a></article>`;
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
  dialog.innerHTML = `<div class="dialog-head"><div><span class="eyebrow">MY WORK LOG</span><h2 id="record-dialog-title">${id ? '알바 기록 수정' : '새로운 알바 기록'}</h2></div><button type="button" class="icon-button" data-action="close-record" aria-label="기록 편집 닫기">${icon('close')}</button></div><form id="record-form" data-id="${esc(record.id)}"><div class="form-grid">${workDateField('record-work-date',record.date)}${field('근무지', 'workplace', 'text', record.workplace, 'required maxlength="100" list="record-workplaces" placeholder="근무지 이름"')}${field('담당 업무', 'task', 'text', record.task, 'maxlength="200" placeholder="예: 운영스텝"')}${field('급여 지급 예정일 (선택)', 'dueDate', 'date', record.dueDate, 'min="1900-01-01" max="9999-12-31"')}</div><div class="form-divider"></div>${payFields(record)}<div class="modal-pay-preview" id="record-preview" aria-live="polite"></div><section class="payment-section"><div class="section-heading"><h3>급여 입금 내역</h3><button type="button" class="button secondary small" data-action="add-payment">${icon('plus')}입금 내역 추가</button></div><p class="field-hint">나누어 입금받았다면 날짜별로 추가하세요. 지급 상태는 자동으로 계산돼요.</p><div id="payments">${record.payments.map(paymentFields).join('')}</div></section><label class="field"><span>메모 (선택)</span><textarea name="note" rows="3" maxlength="2000" placeholder="기억해 두고 싶은 내용을 남겨 주세요.">${esc(record.note)}</textarea></label><div id="record-error" class="form-error" role="alert" hidden></div><div class="dialog-actions"><button type="button" class="button secondary" data-action="close-record">취소</button><button type="submit" class="button primary">${icon('check')}기록 저장</button></div><datalist id="record-workplaces">${workplaceOptions().map(w => `<option value="${esc(w)}"></option>`).join('')}</datalist></form>`;
  $$('[data-iso-date]',dialog).forEach(input=>syncIsoDate(input));
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
  if(event.target.matches('[data-iso-date]'))syncIsoDate(event.target,true);
  if(event.target.id==='application-search'){applicationSearch=event.target.value;applicationPage=0;renderApplicationList();return;}
  if(['application-career','application-template'].includes(event.target.id)){const career=event.target.id==='application-career',value=event.target.value;if(value.length>30000)return;state[career?'applicationCareer':'applicationTemplate']=value;const saved=save();$('#'+(career?'career':'template')+'-save-state').textContent=value.length.toLocaleString('ko-KR')+' / 30,000자 · '+(saved?'저장했어요':'저장되지 않음 · 내용을 복사해 두세요');return;}
  if(event.target.id==='memo-fallback'){state.workMemo=event.target.value;state.workMemoDelta=null;const saved=save();updateMemoStatus(saved);setMemoSaveState(saved?'ready':'error');return;}
  if(event.target.id==='mini-expression'){readMiniInput(event.target);return;}
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
  if(event.target.matches('[data-date-picker]')){
    const input=event.target.parentElement.querySelector('[data-iso-date]');input.value=event.target.value;
    input.dispatchEvent(new Event('input',{bubbles:true}));return;
  }
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
});
document.addEventListener('click', async event => {
  const guideJump=event.target.closest('[data-guide-jump]');
  if(guideJump){event.preventDefault();$('#help-'+guideJump.dataset.guideJump)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});return;}
  const routeLink = event.target.closest('a[data-route]');
  if (routeLink && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    if(routeLink.dataset.overview==='income')statsMonth=monthNow();
    if(routeLink.dataset.overview==='outstanding')recordFilters={month:monthNow(),workplace:'',status:'',search:'',sort:'desc'};
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
    if(action==='coffee-gomssi'){
      coffeeClicked=true;const banner=$('.coffee-banner');
      if(banner){const holder=document.createElement('div');holder.innerHTML=coffeeBanner();banner.replaceWith(holder.firstElementChild);$('.coffee-button')?.focus({preventScroll:true});}
      const url=coffeeUrl();if(url)window.open(url,'_blank','noopener,noreferrer');
      return;
    }
    if(action==='open-date-picker'){
      const control=button.parentElement,picker=control.querySelector('[data-date-picker]'),input=control.querySelector('[data-iso-date]');
      picker.value=validDate(input.value)?input.value:today();
      try{if(picker.showPicker)picker.showPicker();else{picker.focus();picker.click();}}catch{picker.focus();picker.click();}
      return;
    }
    if(action==='new-application'){openApplication(null,true);return;}
    if(action==='view-application'){openApplication(button.dataset.id);return;}
    if(action==='fix-application'){
      const index=state.applications.findIndex(post=>post.id===button.dataset.id);if(index<0)return;
      const post=state.applications[index];
      state.applications[index]=validateApplication({...post,rejected:!post.rejected});
      if(!save())toast('공고 결과가 저장되지 않았어요. 창을 닫기 전에 내용을 복사해 주세요.');
      renderApplicationList();
      $$('[data-action="fix-application"]').find(node=>node.dataset.id===post.id)?.focus({preventScroll:true});
      return;
    }
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
      if(!await confirmAction('선택한 기록으로 현재 내용을 바꾸고 동기화를 이어갑니다. 선택하지 않은 내용이 달라질 수 있으니 확인해 주세요.','사용할 기록을 선택할까요?','선택한 기록 사용'))return;
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
    if(action==='clear-memo'&&await confirmAction('업무 메모 내용을 모두 비웁니다. 필요한 내용은 먼저 복사하거나 TXT로 저장해 주세요.','업무 메모를 비울까요?','비우기',{compact:true})){state.workMemo='';state.workMemoDelta=null;persisted('업무 메모를 비웠어요.');render();}
    if(action==='mini-key'){
      const key=button.dataset.key;
      if(key==='='){calculateMini();return;}
      if(key==='±'||key==='%'){
        try{const value=evaluateExpression(miniExpression||'0'),result=key==='±'?-value:value/100;miniExpression=miniNumber(result);miniAnswer=`= ${result.toLocaleString('ko-KR',{maximumFractionDigits:12})}`;miniEvaluated=true;updateMiniDisplay();}
        catch(failure){$('#mini-answer').textContent=failure.message;$('#mini-answer').dataset.error='true';}return;
      }
      if(key==='C')miniExpression='';
      else{if(miniEvaluated&&/^[\d.]$/.test(key))miniExpression='';if(miniExpression.length<200)miniExpression+=key;}
      miniAnswer='';miniEvaluated=false;updateMiniDisplay();
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
    if(action==='backup'){if(storageBlocked)throw new Error('브라우저 기록을 읽을 수 없어 백업을 중지했어요. 저장 상태를 먼저 확인해 주세요.');download(JSON.stringify(validateState(structuredClone(state)),null,2),`Freeter-backup-${today()}.json`,'application/json');const status=$('#data-transfer-status');if(status){status.hidden=true;status.textContent='';}}
    if(action==='restore'){const input=$('#restore-file');input.value='';input.click();}
    if(action==='records-excel'){download(recordsCsv(state.records),`Freeter-records-${today()}.csv`,'text/csv;charset=utf-8');setTransferStatus('엑셀에서 열 수 있는 CSV 파일로 저장했어요.');}
    if (action === 'records-csv') { download(recordsCsv(filteredRecords()), `Freeter-records-${today()}.csv`, 'text/csv;charset=utf-8'); toast('한글 CSV를 다운로드했어요.'); }
    if (action === 'delete-all' && await confirmAction(cloud.user?'로그인한 계정의 근무표, 알바·입금 기록과 메모를 비웁니다. 서버에 반영되면 같은 계정의 다른 기기에도 적용됩니다. 삭제한 기록은 되돌릴 수 없습니다.':'이 브라우저의 지원 자료, 근무표, 알바·입금 기록, 메모와 서식, 설정과 이전 버전의 기기 사본을 삭제합니다. 삭제한 기록은 되돌릴 수 없습니다.', '모든 데이터를 삭제할까요?', '전체 데이터 삭제')) {
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
  catch { storageBlocked = true; $('#storage-alert').hidden = false; $('#storage-alert').textContent = '다른 탭의 데이터를 읽지 못해 저장을 중지했습니다. 필요한 내용을 먼저 복사해 두세요.'; }
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
// Only the calendar date remains in the header; no time or seconds control.
const headerDate=new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short'});
function updateHeaderDate(){const now=new Date(),text=headerDate.format(now);if($('#today-label').textContent!==text)$('#today-label').textContent=text;$('#year').textContent=now.getFullYear();}
updateHeaderDate();setInterval(()=>{if(!document.hidden)updateHeaderDate();},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateHeaderDate();});
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
