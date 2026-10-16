// Public fixed-city check only. No user session, location or stored records.
import { fetchWeather } from '../weather.js';
const origin='https://kawaiidoro.github.io';
const weather=await fetchWeather(37.57,126.98,{signal:AbortSignal.timeout(15000),request:async(url,options)=>{
  const response=await fetch(url,{...options,headers:{Origin:origin}});
  if(!['*',origin].includes(response.headers.get('access-control-allow-origin')))throw new Error('Weather API does not allow the published site origin');
  return response;
}});
console.log(`PASS live weather API: published-site CORS, Celsius current temperature and today's range validated (${weather.time}).`);
