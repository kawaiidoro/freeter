import test from 'node:test';
import assert from 'node:assert/strict';
import { weatherUrl, weatherCondition, parseWeather, fetchWeather } from '../weather.js';
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
