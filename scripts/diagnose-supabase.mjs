// Read-only diagnostics. Never logs tokens, user rows, emails, SQL text or auth config.
import{readFile}from'node:fs/promises';import{cloudConfig}from'../cloud.js';
const config=cloudConfig(JSON.parse(await readFile(new URL('../cloud-config.json',import.meta.url),'utf8')));
if(!config)throw Error('Supabase public configuration is missing.');
async function probe(name,path,timeout){
 const start=Date.now();
 try{
  const r=await fetch(config.url+path,{headers:{apikey:config.publishableKey},cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(timeout)});
  const data=await r.json().catch(()=>null);const report={name,http:r.status,seconds:Math.round((Date.now()-start)/100)/10};
  if(name==='auth')report.googleEnabled=data?.external?.google===true;
  else if(!r.ok&&data?.code){report.code=data.code;if(data.code==='PGRST003')report.cause='Data API timed out acquiring a database connection from its pool.';}
  console.log(JSON.stringify(report));return report;
 }catch(e){const report={name,seconds:Math.round((Date.now()-start)/100)/10,error:e.name};console.log(JSON.stringify(report));return report;}
}
const reports=await Promise.all([probe('auth','/auth/v1/settings',10000),probe('data-api','/rest/v1/freeter_workspaces?select=revision&limit=0',70000)]);
const token=process.env.SUPABASE_ACCESS_TOKEN;
if(!token){console.log('Management credential absent. DB connection holders and service logs cannot be inspected with the public key. Run supabase/diagnose-sync.sql in the Dashboard or connect SUPABASE_ACCESS_TOKEN in environment settings.');}
else{
 const base='https://api.supabase.com/v1/projects/'+config.project;
 const manage=async(path,body)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Management diagnostic failed (HTTP '+r.status+'); private response omitted.');return r.json();};
 const health=await manage('/health?services=auth,db,rest&timeout_ms=5000');console.log(JSON.stringify({services:health.map(item=>({name:item.name,status:item.status,error:!!item.error}))}));
 const auth=await manage('/config/auth');console.log(JSON.stringify({googleEnabled:auth.external_google_enabled,ownerSignupHook:auth.hook_before_user_created_enabled&&auth.hook_before_user_created_uri==='pg-functions://postgres/public/freeter_before_user_created',ownerTokenHook:auth.hook_custom_access_token_enabled&&auth.hook_custom_access_token_uri==='pg-functions://postgres/public/freeter_custom_access_token_hook'}));
 const query=await readFile(new URL('../supabase/diagnose-sync.sql',import.meta.url),'utf8');
 // These queries return only service metadata and aggregates, never workspace data.
 console.log(JSON.stringify({databaseDiagnostics:await manage('/database/query',{query,read_only:true})}));
}
if(!reports.some(r=>r.name==='auth'&&r.http===200&&r.googleEnabled)||!reports.some(r=>r.name==='data-api'&&[401,403].includes(r.http)&&r.code==='42501'))process.exitCode=1;
