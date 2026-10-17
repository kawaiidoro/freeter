// One transactional SQL file for Dashboard → SQL Editor. Contains no secret.
import {readFile,writeFile} from 'node:fs/promises';
import {cloudConfig} from '../cloud.js';
const root=new URL('../',import.meta.url);
const config=cloudConfig(JSON.parse(await readFile(new URL('cloud-config.json',root),'utf8')));
if(!config?.allowedEmailHash)throw Error('Set the verified owner account hash first.');
const files=['202610160001_workspaces.sql','202610170001_single_owner.sql','202610170002_conflict_http.sql'];
const migrations=await Promise.all(files.map(name=>readFile(new URL('supabase/migrations/'+name,root),'utf8')));
const body=migrations.map(sql=>sql.replace(/^begin;\s*$/gm,'').replace(/^commit;\s*$/gm,'')).join('\n');
const setup=`-- Freeter single-owner setup. Run as postgres in the Supabase SQL Editor.\n-- Preserves workspace rows and revisions. Does not print or embed private keys.\nbegin;\n${body}\ninsert into private.freeter_access_config(singleton,owner_email_hash) values(true,'${config.allowedEmailHash}')\non conflict(singleton) do update set owner_email_hash=excluded.owner_email_hash;\ncommit;\n`;
const output=new URL('supabase/setup-owner.sql',root);
if(process.argv.includes('--check')){if(await readFile(output,'utf8')!==setup)throw Error('Run node scripts/build-owner-setup.mjs');}else await writeFile(output,setup);
console.log('Owner SQL '+(process.argv.includes('--check')?'verified.':'generated.'));
