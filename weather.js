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
    current:'temperature_2m,apparent_temperature,weather_code,is_day',
    daily:'temperature_2m_max,temperature_2m_min', temperature_unit:'celsius', timezone:'auto', forecast_days:'1' }).toString();
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
  return { temperature, feelsLike, high, low, time:current.time, ...weatherCondition(current.weather_code,current.is_day===1) };
}
export async function fetchWeather(lat, lon, { signal, request=(...args)=>globalThis.fetch(...args) }={}) {
  const response=await request(weatherUrl(lat,lon),{signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'});
  if (!response.ok) throw new Error('날씨를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.');
  return parseWeather(await response.json());
}
export function mountWeatherWidget() {
  const root=document.createElement('aside');root.className='gomssi-weather';root.setAttribute('aria-label','곰씨 날씨 도우미');
  root.innerHTML=`<section id="gomssi-weather-panel" class="weather-panel" role="dialog" aria-labelledby="weather-title" hidden>
    <div class="weather-head"><div><span class="weather-eyebrow">GOMSSI WEATHER</span><h2 id="weather-title">곰씨의 오늘 날씨</h2></div><button type="button" class="icon-button weather-close" aria-label="날씨 창 닫기">×</button></div>
    <div class="weather-location"><label><span class="sr-only">날씨 지역</span><select id="weather-city"><option value="current" hidden>내 위치</option>${WEATHER_CITIES.map(city=>`<option value="${city.id}" ${city.id==='seoul'?'selected':''}>${city.name}</option>`).join('')}</select></label><button type="button" class="weather-locate">⌖ 내 위치</button></div>
    <p class="weather-status" role="status" aria-live="polite"></p><div class="weather-content" aria-busy="false"></div>
    <p class="weather-location-note">지역을 선택하거나 내 위치를 허용해 주세요.</p>
    <a class="weather-source" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">날씨 제공 Open-Meteo ↗</a>
    </section><button type="button" class="gomssi-button" aria-label="노가다 곰씨 · 오늘 날씨와 기온 보기" aria-controls="gomssi-weather-panel" aria-haspopup="dialog" aria-expanded="false"><span class="gomssi-bubble">오늘 날씨</span><img src="./assets/gomssi.png" width="90" height="90" alt="" draggable="false"></button>`;
  document.body.append(root);
  const find=selector=>root.querySelector(selector), panel=find('.weather-panel'), toggle=find('.gomssi-button'), content=find('.weather-content'), status=find('.weather-status'), citySelect=find('#weather-city');
  let open=false, serial=0, active=null, location={...WEATHER_CITIES[0]}, cache=null;
  const setStatus=(message,error=false)=>{status.textContent=message;status.dataset.error=String(error);};
  const close=(focus=true)=>{open=false;serial++;active?.abort();panel.hidden=true;toggle.setAttribute('aria-expanded','false');if(focus)toggle.focus({preventScroll:true});};
  const showWeather=data=>{
    // API strings never enter HTML. Only validated numbers and local labels are displayed.
    content.innerHTML='<div class="weather-now"><div><p class="weather-place"></p><div class="weather-degrees"><strong></strong><span>°C</span></div><p class="weather-description"></p></div><span class="weather-symbol" aria-hidden="true"></span></div><div class="weather-range"><span class="weather-low"></span><span class="weather-high"></span></div><p class="weather-tip"></p>';
    find('.weather-place').textContent=location.name;
    find('.weather-degrees strong').textContent=String(Math.round(data.temperature));
    find('.weather-description').textContent=`${data.label} · 체감 ${Math.round(data.feelsLike)}°`;
    find('.weather-symbol').textContent=data.symbol;find('.weather-symbol').dataset.kind=data.kind;
    find('.weather-low').textContent=`최저 ${Math.round(data.low)}°`;find('.weather-high').textContent=`최고 ${Math.round(data.high)}°`;
    find('.weather-tip').textContent=data.kind==='storm'?'천둥·번개가 있으면 야외 작업에 주의해요.':data.kind==='rain'?'비 오는 현장은 미끄럼에 주의해요.':data.temperature>=30?'더운 날엔 물과 휴식 챙기기.':data.temperature<=5?'체온이 떨어지지 않게 따뜻하게.':'오늘도 안전하게, 곰씨가 응원해요.';
    setStatus(`${data.time.slice(5,10).replace('-','월 ')}일 · ${data.time.slice(11)} 기준`);
  };
  const load=async(force=false)=>{
    const ticket=++serial;active?.abort();
    const key=weatherUrl(location.lat,location.lon);
    if(!force&&cache?.key===key&&Date.now()-cache.at<300000){showWeather(cache.data);content.setAttribute('aria-busy','false');return;}
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
    open=true;panel.hidden=false;toggle.setAttribute('aria-expanded','true');citySelect.focus({preventScroll:true});load();
  });
  find('.weather-close').addEventListener('click',()=>close());
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
