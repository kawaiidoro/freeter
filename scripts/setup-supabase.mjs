// Optional administrator operation. Credentials come only from secure environment bindings.
import { readFile } from 'node:fs/promises';
import { cloudConfig } from '../cloud.js';
const config=cloudConfig(JSON.parse(await readFile(new URL('../cloud-config.json',import.meta.url),'utf8')));
if(!config?.allowedEmailHash)throw Error('Configure the public Project URL, publishable key and allowed account hash first.');
const token=process.env.SUPABASE_ACCESS_TOKEN;
if(!token)throw Error('SUPABASE_ACCESS_TOKEN is missing. Add it in environment settings; do not put it in source or chat.');
async function manage(path,method='GET',body){
 const response=await fetch('https://api.supabase.com/v1/projects/'+config.project+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`Supabase management request ${method} ${path} failed (${response.status}). No credentials or response body were logged.`);
 return response.json();
}
const auth=await manage('/config/auth');
const hooks={hook_before_user_created_uri:'pg-functions://postgres/public/freeter_before_user_created',hook_custom_access_token_uri:'pg-functions://postgres/public/freeter_custom_access_token_hook'};
for(const [key,uri]of Object.entries(hooks))if(auth[key]&&auth[key]!==uri)throw Error('An existing '+key+' must be integrated before enabling the owner restriction. No settings changed.');
const migration=await readFile(new URL('../supabase/setup-owner.sql',import.meta.url),'utf8');
if(!migration.includes("values(true,'"+config.allowedEmailHash+"')"))throw Error('Owner SQL is stale. Run node scripts/build-owner-setup.mjs first.');
await manage('/database/query','POST',{query:migration});
console.log('Applied owner-only workspace policies, authenticated CAS RPC and login hooks. Existing workspace rows preserved.');
const site='https://kawaiidoro.github.io/freeter/';
const redirects=[...new Set([...(auth.uri_allow_list||'').split(',').filter(Boolean),site])];
const update={site_url:site,uri_allow_list:redirects.join(','),...hooks,hook_before_user_created_enabled:true,hook_custom_access_token_enabled:true};
if(!auth.external_google_enabled){
 const clientId=process.env.GOOGLE_OAUTH_CLIENT_ID,secret=process.env.GOOGLE_OAUTH_CLIENT_SECRET;
 if(clientId&&secret)Object.assign(update,{external_google_enabled:true,external_google_client_id:clientId,external_google_secret:secret});
}
await manage('/config/auth','PATCH',update);
console.log('Configured owner-only signup/token hooks and the exact production OAuth return URL. Existing redirect entries preserved.');
const verifiedAuth=await manage('/config/auth');
if(!verifiedAuth.hook_before_user_created_enabled||!verifiedAuth.hook_custom_access_token_enabled||Object.entries(hooks).some(([key,uri])=>verifiedAuth[key]!==uri))throw Error('Owner login hook configuration could not be verified.');
const settings=await fetch(config.url+'/auth/v1/settings',{headers:{apikey:config.publishableKey},cache:'no-store'});
if(!settings.ok)throw Error('Public auth settings check failed ('+settings.status+').');
const providers=await settings.json();
console.log('Google provider enabled: '+(providers.external?.google===true));
if(providers.external?.google!==true)console.log('ACTION REQUIRED: enable Google in Supabase Authentication → Sign In / Providers, with a Google Web OAuth client and this project callback URL. See docs/SUPABASE.md.');
await import('./backend-check.mjs');
