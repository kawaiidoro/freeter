import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { cloudConfig } from '../cloud.js';
const root=new URL('../',import.meta.url),read=name=>readFile(new URL(name,root),'utf8');
cloudConfig(JSON.parse(await read('cloud-config.json')));
const checksums=JSON.parse(await read('vendor/checksums.json'));
for(const [file,hash]of Object.entries(checksums))if(createHash('sha256').update(await readFile(new URL('vendor/'+file,root))).digest('hex')!==hash)throw Error('Vendor checksum mismatch: '+file);
const patched=await read('scripts/build-vendor.mjs');
if(!patched.includes('freeter-safe-quill-export')||!patched.includes('return escapeText(this.getText(index, length))'))throw Error('Quill HTML export guard missing.');
for(const workflow of ['.github/workflows/pages.yml','.github/workflows/security.yml'])for(const match of (await read(workflow)).matchAll(/uses:\s*([^\s]+)@([^\s]+)/g))if(!/^[a-f0-9]{40}$/.test(match[2]))throw Error('Unpinned action: '+match[1]);
let stdout;
try{({stdout}=await promisify(execFile)('npm',['audit','--json'],{cwd:root,maxBuffer:8*1024*1024}));}catch(error){stdout=error.stdout;if(!stdout)throw Error('Dependency audit could not complete.');}
const audit=JSON.parse(stdout);if(audit.error||!audit.metadata)throw Error('Dependency audit could not complete.');
const known='https://github.com/advisories/GHSA-v3m3-f69x-jf25',unexpected=[];
for(const [name,v]of Object.entries(audit.vulnerabilities||{})){
 const guarded=name==='quill'&&v.via.every(item=>typeof item==='object'&&item.url===known);
 if(!guarded)unexpected.push(name+': '+v.severity);
}
await writeFile('/tmp/freeter-security-audit.json',JSON.stringify(audit,null,2)+'\n');
console.log('npm audit upstream counts: '+JSON.stringify(audit.metadata.vulnerabilities));
if(unexpected.length)throw Error('Unresolved dependency advisories: '+unexpected.join(', '));
if(audit.vulnerabilities?.quill)console.log('DISCLOSED: upstream Quill 2.0.3 has one unpatched advisory. The shipped build replaces its vulnerable serializer with escaped text; security-browser.mjs verifies hostile HTML/attributes cannot survive export. See docs/SECURITY.md.');
console.log('No other advisories. Public configuration, vendor hashes and immutable action pins verified.');
