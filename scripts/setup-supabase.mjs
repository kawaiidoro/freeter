// Optional administrator operation. Credentials come only from secure environment bindings.
import { readFile } from 'node:fs/promises';
import { cloudConfig } from '../cloud.js';
const config=cloudConfig(JSON.parse(await readFile(new URL('../cloud-config.json',import.meta.url),'utf8')));
if(!config)throw Error('Configure the public Project URL and publishable key first.');
const token=process.env.SUPABASE_ACCESS_TOKEN;
if(!token)throw Error('SUPABASE_ACCESS_TOKEN is missing. Add it in environment settings; do not put it in source or chat.');
async function manage(path,method='GET',body){
 const response=await fetch('https://api.supabase.com/v1/projects/'+config.project+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 if(!response.ok)throw Error(`Supabase management request ${method} ${path} failed (${response.status}). No credentials or response body were logged.`);
 return response.json();
}
const migration=await readFile(new URL('../supabase/migrations/202610160001_workspaces.sql',import.meta.url),'utf8');
await manage('/database/query','POST',{query:migration});
console.log('Applied workspace schema, RLS and authenticated compare-and-swap RPC.');
const auth=await manage('/config/auth');
const site='https://kawaiidoro.github.io/freeter/';
const redirects=[...new Set([...(auth.uri_allow_list||'').split(',').filter(Boolean),site])];
const update={site_url:site,uri_allow_list:redirects.join(',')};
if(!auth.external_google_enabled){
 const clientId=process.env.GOOGLE_OAUTH_CLIENT_ID,secret=process.env.GOOGLE_OAUTH_CLIENT_SECRET;
 if(clientId&&secret)Object.assign(update,{external_google_enabled:true,external_google_client_id:clientId,external_google_secret:secret});
}
await manage('/config/auth','PATCH',update);
console.log('Configured the exact production site and OAuth return URL. Existing redirect entries preserved.');
const settings=await fetch(config.url+'/auth/v1/settings',{headers:{apikey:config.publishableKey},cache:'no-store'});
if(!settings.ok)throw Error('Public auth settings check failed ('+settings.status+').');
const providers=await settings.json();
console.log('Google provider enabled: '+(providers.external?.google===true));
if(providers.external?.google!==true)console.log('ACTION REQUIRED: enable Google in Supabase Authentication → Sign In / Providers, with a Google Web OAuth client and this project callback URL. See docs/SUPABASE.md.');
const denied=await fetch(config.url+'/rest/v1/freeter_workspaces?select=user_id&limit=1',{headers:{apikey:config.publishableKey},cache:'no-store'});
if(![401,403].includes(denied.status))throw Error('Anonymous table access did not fail closed ('+denied.status+').');
console.log('Verified anonymous clients cannot read the workspace table.');
