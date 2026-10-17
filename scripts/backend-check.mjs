// Public, non-destructive production checks. Never use a user's session or read records.
import { readFile } from 'node:fs/promises';
import { cloudConfig } from '../cloud.js';

const config = cloudConfig(JSON.parse(await readFile(new URL('../cloud-config.json', import.meta.url), 'utf8')));
if (!config) throw new Error('Supabase public configuration is missing');
// Pool acquisition can fail only after ~63 seconds. Wait for the actual PGRST003
// response once instead of adding a second request to the blocked connection pool.
const request = async (path, options = {}) => {
  return fetch(config.url+path,{...options,headers:{apikey:config.publishableKey,...options.headers},credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(path.startsWith('/rest/')?70000:10000)});
};
let passed = 0;
async function blocked(path, options) {
  const response = await request(path, options);
  if (![401, 403].includes(response.status)) {
    if(response.status===504){const body=await response.json().catch(()=>null);if(body?.code==='PGRST003')throw new Error('PGRST003: Data API cannot acquire a database connection from its pool (HTTP 504). Inspect DB connections and PostgREST health; sign-in is a separate service.');}
    else await response.body?.cancel();
    throw new Error(`Anonymous access must be denied (HTTP ${response.status}); response body omitted`);
  }
  const error = await response.json();
  if (error.code !== '42501') throw new Error('Unexpected denial response; no private response logged');
  passed++;
}
try {
const settings = await request('/auth/v1/settings');
if (!settings.ok) throw new Error(`Auth settings unavailable (HTTP ${settings.status})`);
if ((await settings.json()).external?.google !== true) throw new Error('Google sign-in is not enabled');
console.log('PASS live Supabase: Google sign-in enabled'); passed++;
// limit=0 and revision-only selection avoid retrieving user data even on misconfiguration.
await blocked('/rest/v1/freeter_workspaces?select=revision&limit=0');
console.log('PASS live Supabase: anonymous table reads denied');
// Null cannot satisfy the table's NOT NULL constraint; this probe cannot save a workspace.
await blocked('/rest/v1/rpc/freeter_save_workspace', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ p_data: null, p_expected_revision: 0, p_expected_generation: 1, p_reset: false }),
});
console.log('PASS live Supabase: anonymous save RPC denied');
console.log(`Live backend checks: ${passed} passed. Signed-in cross-account access is tested separately in isolation.`);

}catch(error){console.log('::error title=Live Supabase API::'+String(error.name+': '+error.message).replaceAll('%','%25').replaceAll('\n','%0A'));throw error;}
