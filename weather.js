// Public weather only. Coordinates stay in memory and never enter account records.
export const WEATHER_CITIES = [
  { id:'seoul', name:'서울', lat:37.57, lon:126.98 },
  { id:'incheon', name:'인천', lat:37.46, lon:126.71 },
  { id:'suwon', name:'수원', lat:37.26, lon:127.03 },
  { id:'daejeon', name:'대전', lat:36.35, lon:127.38 },
  { id:'cheongju', name:'청주', lat:36.64, lon:127.49 },
  { id:'gwangju', name:'광주', lat:35.16, lon:126.85 },
  { id:'jeonju', name:'전주', lat:35.82, lon:127.15 },
  { id:'daegu', name:'대구', lat:35.87, lon:128.60 },
  { id:'busan', name:'부산', lat:35.18, lon:129.08 },
  { id:'ulsan', name:'울산', lat:35.54, lon:129.31 },
  { id:'chuncheon', name:'춘천', lat:37.88, lon:127.73 },
  { id:'gangneung', name:'강릉', lat:37.75, lon:128.88 },
  { id:'jeju', name:'제주', lat:33.50, lon:126.53 },
];
export function weatherUrl(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>90 || Math.abs(lon)>180) throw new Error('위치를 확인하지 못했어요. 지역을 선택해 주세요.');
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({ latitude:lat.toFixed(2), longitude:lon.toFixed(2),
    current:'temperature_2m,apparent_temperature,weather_code,is_day,relative_humidity_2m',
    daily:'temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset', temperature_unit:'celsius', timezone:'auto', forecast_days:'1' }).toString();
  return url.href;
}
export function weatherCondition(code, daytime=true) {
  if (code===0) return { label:daytime?'맑음':'맑은 밤', symbol:daytime?'☀':'☾', kind:daytime?'sun':'moon' };
  if ([1,2].includes(code)) return { label:'구름 조금', symbol:'⛅', kind:'cloud' };
  if (code===3) return { label:'흐림', symbol:'☁', kind:'cloud' };
  if ([45,48].includes(code)) return { label:'안개', symbol:'≋', kind:'fog' };
  if ([51,53,55,56,57].includes(code)) return { label:'이슬비', symbol:'☂', kind:'rain' };
  if ([61,63,65,66,67,80,81,82].includes(code)) return { label:'비', symbol:'☂', kind:'rain' };
  if ([71,73,75,77,85,86].includes(code)) return { label:'눈', symbol:'❄', kind:'snow' };
  if ([95,96,99].includes(code)) return { label:'천둥·번개', symbol:'ϟ', kind:'storm' };
  return { label:'현재 날씨', symbol:'○', kind:'cloud' };
}
export function parseWeather(data) {
  const current=data?.current, daily=data?.daily;
  const temperature=current?.temperature_2m, feelsLike=current?.apparent_temperature;
  const high=daily?.temperature_2m_max?.[0], low=daily?.temperature_2m_min?.[0];
  if (data?.current_units?.temperature_2m!=='°C' || ![temperature,feelsLike,high,low].every(value=>Number.isFinite(value)&&value>=-150&&value<=100)
      || low>high || !Number.isInteger(current?.weather_code) || ![0,1].includes(current?.is_day)
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(current?.time||'') || daily?.time?.[0]!==current.time.slice(0,10)) throw new Error('날씨 응답을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
  const bounded=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max?value:null;
  const sunTime=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)&&value.slice(0,10)===current.time.slice(0,10)?value.slice(11):null;
  return { temperature, feelsLike, high, low, time:current.time, humidity:bounded(current.relative_humidity_2m,0,100),uv:bounded(daily.uv_index_max?.[0],0,40),sunrise:sunTime(daily.sunrise?.[0]),sunset:sunTime(daily.sunset?.[0]), ...weatherCondition(current.weather_code,current.is_day===1) };
}
export function airQualityUrl(lat,lon) {
  const url=new URL(weatherUrl(lat,lon));url.hostname='air-quality-api.open-meteo.com';url.pathname='/v1/air-quality';
  url.search=new URLSearchParams({latitude:lat.toFixed(2),longitude:lon.toFixed(2),current:'pm10,pm2_5',timezone:'auto',forecast_days:'1'}).toString();return url.href;
}
export function parseAirQuality(data) {
  const current=data?.current,units=data?.current_units;
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(current?.time||'')||![current.pm10,current.pm2_5].every(value=>Number.isFinite(value)&&value>=0&&value<=5000)||![units?.pm10,units?.pm2_5].every(unit=>['μg/m³','µg/m³'].includes(unit)))throw new Error('대기질 정보가 올바르지 않습니다.');
  return {pm10:current.pm10,pm25:current.pm2_5,time:current.time};
}
export function dustGrade(value,fine=false) {
  if(!Number.isFinite(value))return '정보 없음';const limits=fine?[15,35,75]:[30,80,150];return ['좋음','보통','나쁨','매우 나쁨'][limits.filter(limit=>value>limit).length];
}
export const GOMSSI_HELP = Object.freeze([
  '근무표에서 이름 칸을 누르면 휴식자를 바꿀 수 있어요.',
  '공평하게 배분을 켜면 근무시간 차이를 줄여 드려요.',
  '점심은 함께, 한 명씩, 두 명 먼저 골라 보세요.',
  '급여 계산기에서 일용근로·프리랜서 세금을 선택해요.',
  '급여를 받았다면 기록장의 지급 완료 버튼을 눌러요.',
  '업무 메모에서 중요한 글자는 형광펜으로 표시해요.',
  '메모를 읽기 모드로 바꾸면 업무에 집중하기 좋아요.',
  'Google로 로그인하면 PC와 모바일 기록이 함께 보여요.',
  '설정에서 JSON 백업을 받아 소중한 기록을 보관해요.',
  'PNG 저장으로 지금 보는 근무표를 이미지로 나눠요.',
]);
export const GOMSSI_CHAT = Object.freeze([
  '오늘도 출근한 당신, 곰씨가 조용히 응원할게요.',
  '안전모는 꽉, 어깨 힘은 살짝 빼고 시작해요.',
  '물을 한 모금 마실 시간 아닐까요?',
  '바쁜 날에도 밥은 꼭 챙겨 먹어요.',
  '잠깐 기지개! 굳은 어깨를 풀어 주세요.',
  '오늘의 작은 성취도 기록할 만한 일이에요.',
  '퇴근 후 나에게 줄 작은 보상은 뭘까요?',
  '곰씨의 주머니에는 응원 한 움큼이 있어요.',
  '구름이 지나가듯 바쁜 시간도 지나갈 거예요.',
  '급할수록 한 번 더 확인해요. 오늘도 안전하게!',
]);
export function gomssiTipDeck(random=Math.random) {
  let bag=[],previous='';return()=>{
    if(!bag.length){bag=[...GOMSSI_HELP,...GOMSSI_CHAT];for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag.at(-1)===previous)[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];}
    previous=bag.pop();return previous;
  };
}
export async function fetchWeather(lat, lon, { signal, request=(...args)=>globalThis.fetch(...args) }={}) {
  const get=async url=>{const response=await request(url,{signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'});if(!response.ok)throw new Error('날씨를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.');return response.json();};
  const [forecast,quality]=await Promise.allSettled([get(weatherUrl(lat,lon)),get(airQualityUrl(lat,lon))]);if(forecast.status==='rejected')throw forecast.reason;
  let airQuality=null;try{if(quality.status==='fulfilled')airQuality=parseAirQuality(quality.value);}catch{/* Keep weather usable when air quality is unavailable. */}
  return {...parseWeather(forecast.value),airQuality};
}
export function mountWeatherWidget() {
  const root=document.createElement('div');root.className='header-weather';root.setAttribute('aria-label','상단 날씨');
  root.innerHTML=`<section id="header-weather-panel" class="weather-panel" role="dialog" aria-labelledby="weather-title" hidden>
    <div class="weather-head"><div><span class="weather-eyebrow">GOMSSI WEATHER</span><h2 id="weather-title">곰씨의 오늘 날씨</h2></div><button type="button" class="icon-button weather-close" aria-label="날씨 창 닫기">×</button></div>
    <div class="weather-location"><label><span class="sr-only">날씨 지역</span><select id="weather-city"><option value="current" hidden>내 위치</option>${WEATHER_CITIES.map(city=>`<option value="${city.id}" ${city.id==='seoul'?'selected':''}>${city.name}</option>`).join('')}</select></label><button type="button" class="weather-locate">⌖ 내 위치</button></div>
    <p class="weather-status" role="status" aria-live="polite"></p><div class="weather-content" aria-busy="false"></div>
    <p class="weather-location-note">지역을 선택하거나 내 위치를 허용해 주세요.</p>
    <a class="weather-source" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo · CAMS 대기질 예측 ↗</a>
    </section><button type="button" class="header-weather-toggle" aria-label="오늘 날씨와 기온 보기" aria-controls="header-weather-panel" aria-haspopup="dialog" aria-expanded="false"><svg class="header-illustration" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v2M2 8h2m0-5 1.5 1.5m9-1.5L13 4.5M4.7 11.2A4.5 4.5 0 1 1 12 6.5"/><path d="M7 20h10a4 4 0 0 0 .3-8 5.4 5.4 0 0 0-10.2 0A4 4 0 0 0 7 20Z"/></svg><span>날씨</span></button>`;
  const host=document.querySelector('.header-clock')||document.querySelector('.topbar');host.prepend(root);
  const find=selector=>root.querySelector(selector),panel=find('.weather-panel'),toggle=find('.header-weather-toggle'),content=find('.weather-content'),status=find('.weather-status'),citySelect=find('#weather-city');
  let open=false,serial=0,active=null,location={...WEATHER_CITIES[0]},cache=null;
  const position=()=>{
    if(!open)return;
    const button=toggle.getBoundingClientRect(),bar=document.querySelector('.topbar').getBoundingClientRect(),width=Math.min(420,innerWidth-32);
    const top=Math.max(8,Math.min(Math.max(bar.bottom,button.bottom)+8,innerHeight-100));
    panel.style.setProperty('--weather-top',top+'px');panel.style.setProperty('--weather-left',Math.max(16,Math.min(button.right-width,innerWidth-width-16))+'px');
  };
  const setStatus=(message,error=false)=>{status.textContent=message;status.dataset.error=String(error);};
  const close=(focus=true)=>{open=false;serial++;active?.abort();panel.hidden=true;toggle.setAttribute('aria-expanded','false');if(focus)toggle.focus({preventScroll:true});};
  const showWeather=data=>{
    // API strings never enter HTML. Only validated numbers and local labels are displayed.
    const metricIcon=kind=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${kind==='humidity'?'<path d="M12 3C9 8 5 11 5 15a7 7 0 0 0 14 0c0-4-4-7-7-12Z"/><path d="M8 15a4 4 0 0 0 4 4"/>':kind==='uv'?'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>':kind.startsWith('sun')?'<path d="M3 18h18M6 15a6 6 0 0 1 12 0M12 2v4m-8 3 2 2m12 0 2-2M8 21h8"/>':'<path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 17h6"/>'}</svg>`;
    content.innerHTML='<div class="weather-report"><div class="weather-speech"><span class="weather-reporter-label">곰씨가 알려드려요</span><div class="weather-now"><div><p class="weather-place"></p><div class="weather-degrees"><strong></strong><span>°C</span></div><p class="weather-description"></p></div><span class="weather-symbol" aria-hidden="true"></span></div><p class="weather-tip"></p></div><figure class="weather-guide-character"><img src="./assets/gomssi.png" width="1280" height="1280" alt="안전모를 쓰고 옆에서 오늘의 날씨를 알려주는 곰씨"><figcaption>오늘도 안전하게!</figcaption></figure></div><div class="weather-range"><span class="weather-low"></span><span class="weather-high"></span></div><div class="weather-metrics">'+[['humidity','습도'],['uv','오늘 최대 자외선'],['sunrise','일출'],['sunset','일몰'],['pm10','미세먼지 PM10'],['pm25','초미세먼지 PM2.5']].map(([key,label])=>`<div class="weather-metric" data-metric="${key}"><span class="weather-metric-label">${metricIcon(key)}${label}</span><strong></strong><small></small></div>`).join('')+'</div><p class="weather-air-note"></p>';
    find('.weather-place').textContent=location.name;
    find('.weather-degrees strong').textContent=String(Math.round(data.temperature));
    find('.weather-description').textContent=`${data.label} · 체감 ${Math.round(data.feelsLike)}°`;
    find('.weather-symbol').dataset.kind=data.kind;
    find('.weather-low').textContent=`최저 ${Math.round(data.low)}°`;find('.weather-high').textContent=`최고 ${Math.round(data.high)}°`;
    const metric=(key,value,note='')=>{find(`[data-metric="${key}"] strong`).textContent=value;find(`[data-metric="${key}"] small`).textContent=note;};
    metric('humidity',data.humidity===null?'확인 불가':Math.round(data.humidity)+'%');
    metric('uv',data.uv===null?'확인 불가':data.uv.toFixed(1),data.uv===null?'':['낮음','보통','높음','매우 높음','위험'][[3,6,8,11].filter(limit=>data.uv>=limit).length]);
    metric('sunrise',data.sunrise||'확인 불가');metric('sunset',data.sunset||'확인 불가');
    for(const key of ['pm10','pm25'])metric(key,data.airQuality?data.airQuality[key].toFixed(1)+' ㎍/㎥':'확인 불가',data.airQuality?dustGrade(data.airQuality[key],key==='pm25'):'정보 없음');
    find('.weather-air-note').textContent=data.airQuality?`대기질 ${data.airQuality.time.slice(11)} 기준 · CAMS 모델 예측값`:'대기질 정보를 불러오지 못했어요. 날씨 창을 다시 열어 확인해 주세요.';
    find('.weather-tip').textContent=data.kind==='storm'?'천둥·번개가 있으면 야외 작업에 주의해요.':data.kind==='rain'?'비 오는 현장은 미끄럼에 주의해요.':data.temperature>=30?'더운 날엔 물과 휴식 챙기기.':data.temperature<=5?'체온이 떨어지지 않게 따뜻하게.':'오늘도 안전하게, 곰씨가 응원해요.';
    setStatus(`${data.time.slice(5,10).replace('-','월 ')}일 · ${data.time.slice(11)} 기준`);
  };
  const load=async(force=false)=>{
    const ticket=++serial;active?.abort();
    const key=weatherUrl(location.lat,location.lon);
    if(!force&&cache?.key===key&&cache.data.airQuality&&Date.now()-cache.at<300000){showWeather(cache.data);content.setAttribute('aria-busy','false');return;}
    const controller=new AbortController();active=controller;
    const timer=setTimeout(()=>controller.abort(),12000);
    setStatus('곰씨가 날씨를 확인하고 있어요…');content.setAttribute('aria-busy','true');content.innerHTML='<div class="weather-loading" aria-hidden="true"><span>☁</span></div>';
    try {
      const data=await fetchWeather(location.lat,location.lon,{signal:controller.signal});
      if(ticket!==serial||!open)return;
      cache={key,data,at:Date.now()};showWeather(data);
    } catch {
      if(ticket!==serial||!open)return;
      setStatus('날씨를 불러오지 못했어요. 연결을 확인하거나 다른 지역을 선택해 주세요.',true);
      content.innerHTML='<div class="weather-error"><span aria-hidden="true">☁</span><button type="button" class="button secondary small weather-retry">다시 불러오기</button></div>';
    } finally {clearTimeout(timer);if(ticket===serial)content.setAttribute('aria-busy','false');}
  };
  toggle.addEventListener('click',()=>{
    if(open){close();return;}
    open=true;panel.hidden=false;position();toggle.setAttribute('aria-expanded','true');citySelect.focus({preventScroll:true});load();
  });
  find('.weather-close').addEventListener('click',()=>close());
  window.addEventListener('resize',position);window.addEventListener('scroll',position,{passive:true});
  window.addEventListener('popstate',()=>close(false));window.addEventListener('hashchange',()=>close(false));
  root.addEventListener('click',event=>{if(event.target.closest('.weather-retry'))load(true);});
  citySelect.addEventListener('change',()=>{
    const selected=WEATHER_CITIES.find(city=>city.id===citySelect.value);if(!selected)return;
    location={...selected};load();
  });
  find('.weather-locate').addEventListener('click',()=>{
    if(!navigator.geolocation){setStatus('이 브라우저에서는 위치를 사용할 수 없어요. 지역을 선택해 주세요.',true);return;}
    const ticket=++serial;active?.abort();content.setAttribute('aria-busy','false');setStatus('위치를 확인하고 있어요…');
    if(!content.querySelector('.weather-now'))content.innerHTML='<div class="weather-error"><span aria-hidden="true">☁</span><button type="button" class="button secondary small weather-retry">선택 지역 날씨 보기</button></div>';
    navigator.geolocation.getCurrentPosition(position=>{
      if(ticket!==serial||!open)return;
      try{weatherUrl(position.coords.latitude,position.coords.longitude);}catch{setStatus('위치를 확인하지 못했어요. 지역을 선택해 주세요.',true);return;}
      location={id:'current',name:'내 위치 주변',lat:position.coords.latitude,lon:position.coords.longitude};citySelect.value='current';load(true);
    },error=>{if(ticket===serial&&open)setStatus(error.code===1?'위치 사용이 허용되지 않았어요. 지역을 직접 선택해 주세요.':'위치를 찾지 못했어요. 지역을 직접 선택해 주세요.',true);},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
  });
  // Rendering a loading state can detach the clicked retry button before bubbling.
  document.addEventListener('click',event=>{if(open&&!event.composedPath().includes(root))close(false);});
  document.addEventListener('keydown',event=>{if(open&&event.key==='Escape'){event.preventDefault();close();}});
}
