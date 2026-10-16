import test from 'node:test';
import assert from 'node:assert/strict';
import { weatherUrl, weatherCondition, parseWeather, fetchWeather,airQualityUrl,parseAirQuality,dustGrade,GOMSSI_HELP,GOMSSI_CHAT,gomssiTipDeck } from '../weather.js';
const sample=()=>({current_units:{temperature_2m:'°C'},current:{time:'2026-10-17T10:30',temperature_2m:21.4,apparent_temperature:20.8,weather_code:0,is_day:1},daily:{time:['2026-10-17'],temperature_2m_max:[24.5],temperature_2m_min:[14.2]}});
test('날씨는 고정 HTTPS 주소로 좌표 두 자리만 전송하고 무효 위치 거부',()=>{
 const url=new URL(weatherUrl(37.566535,126.9779692));assert.equal(url.origin,'https://api.open-meteo.com');assert.equal(url.searchParams.get('latitude'),'37.57');assert.equal(url.searchParams.get('longitude'),'126.98');assert.equal(url.searchParams.get('temperature_unit'),'celsius');
 for(const pair of [[NaN,0],[0,Infinity],[91,0],[0,-181],['37.5',127]])assert.throws(()=>weatherUrl(...pair));
});
test('날씨의 섭씨·유효 숫자·당일 범위를 검증해 잘못된 기온 표시 방지',()=>{
 assert.equal(parseWeather(sample()).temperature,21.4);
 for(const change of [data=>data.current_units.temperature_2m='°F',data=>data.current.temperature_2m=null,data=>data.daily.temperature_2m_min=[60],data=>data.daily.time=['2026-10-16'],data=>data.current.time='<img src=x>',data=>data.current.weather_code='0']){const data=sample();change(data);assert.throws(()=>parseWeather(data));}
});
test('WMO 강수·눈·뇌우 코드와 맑은 밤을 한국어로 구분',()=>{
 for(const code of [61,65,80,82])assert.equal(weatherCondition(code).kind,'rain');for(const code of [71,75,85,86])assert.equal(weatherCondition(code).kind,'snow');for(const code of [95,96,99])assert.equal(weatherCondition(code).kind,'storm');assert.equal(weatherCondition(0,false).label,'맑은 밤');
});
test('날씨 요청에 세션·쿠키를 보내지 않고 HTTP·본문 오류를 거부',async()=>{
 const data=await fetchWeather(37.57,126.98,{request:async(_url,options)=>{assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.headers,undefined);return{ok:true,json:async()=>sample()};}});assert.equal(data.high,24.5);
 await assert.rejects(fetchWeather(37,127,{request:async()=>({ok:false})}),/날씨를 불러오지/);await assert.rejects(fetchWeather(37,127,{request:async()=>({ok:true,json:async()=>({})})}),/날씨 응답/);
});
test('습도·자외선·일출·일몰은 유효한 당일 자료만 표시하고 누락은 값으로 만들지 않음',()=>{
 const data=sample();Object.assign(data.current,{relative_humidity_2m:64});Object.assign(data.daily,{uv_index_max:[4.2],sunrise:['2026-10-17T06:40'],sunset:['2026-10-17T17:52']});const parsed=parseWeather(data);assert.equal(parsed.humidity,64);assert.equal(parsed.uv,4.2);assert.equal(parsed.sunrise,'06:40');assert.equal(parsed.sunset,'17:52');
 data.current.relative_humidity_2m=101;data.daily.sunrise=['2026-10-16T06:40'];data.daily.uv_index_max=[null];const missing=parseWeather(data);assert.equal(missing.humidity,null);assert.equal(missing.sunrise,null);assert.equal(missing.uv,null);
});
test('PM10·PM2.5 단위와 농도를 검증하고 국내 등급 경계를 구분',()=>{
 const data={current:{time:'2026-10-17T10:00',pm10:28,pm2_5:12},current_units:{pm10:'μg/m³',pm2_5:'μg/m³'}};assert.equal(parseAirQuality(data).pm25,12);data.current_units.pm10='mg/m³';assert.throws(()=>parseAirQuality(data));
 assert.deepEqual([30,31,80,81,150,151].map(value=>dustGrade(value)),['좋음','보통','보통','나쁨','나쁨','매우 나쁨']);assert.deepEqual([15,16,35,36,75,76].map(value=>dustGrade(value,true)),['좋음','보통','보통','나쁨','나쁨','매우 나쁨']);assert.equal(new URL(airQualityUrl(37.566535,126.9779692)).searchParams.get('latitude'),'37.57');
});
test('대기질 API가 실패해도 현재 날씨는 유지하고 미세먼지 값을 임의로 채우지 않음',async()=>{
 const weather=await fetchWeather(37,127,{request:async url=>{if(new URL(url).hostname.startsWith('air-quality'))throw Error('Offline');return{ok:true,json:async()=>sample()};}});assert.equal(weather.temperature,21.4);assert.equal(weather.airQuality,null);
});
test('사용법 10개와 잡담 10개가 중복 없이 섞이고 다음 주기에서도 같은 말을 연속하지 않음',()=>{
 assert.equal(GOMSSI_HELP.length,10);assert.equal(GOMSSI_CHAT.length,10);const next=gomssiTipDeck(()=>0.37),one=Array.from({length:20},next),two=Array.from({length:20},next);assert.equal(new Set(one).size,20);assert.equal(new Set(two).size,20);assert.notEqual(one.at(-1),two[0]);
});
