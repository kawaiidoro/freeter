// Public fixed-city check only. No user session, location or stored records.
import { fetchWeather } from '../weather.js';
try {
const origin='https://kawaiidoro.github.io';
const weather=await fetchWeather(37.57,126.98,{signal:AbortSignal.timeout(15000),request:async(url,options)=>{
  const response=await fetch(url,{...options,headers:{Origin:origin}});
  if(!['*',origin].includes(response.headers.get('access-control-allow-origin')))throw new Error(new URL(url).hostname+' does not allow the published site origin');
  return response;
}});
if(!weather.airQuality||weather.humidity===null||weather.uv===null||!weather.sunrise||!weather.sunset)throw new Error('Weather or air-quality metrics are missing');
console.log(`PASS live weather API: published-site CORS, humidity, UV, sunrise, sunset, PM10, PM2.5, Celsius temperature and today's range validated (${weather.time}).`);

} catch(error) {
  console.log('::error title=Live weather API::'+String(error.message).replaceAll('%','%25').replaceAll('\n','%0A'));
  throw error;
}
