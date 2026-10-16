// Only pinned, integrity-checked npm dependencies; no remote browser scripts.
import { build } from 'esbuild';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const outputs=new Map();
async function emit(name,value){
  const bytes=typeof value==='string'?Buffer.from(value):value;outputs.set(name,bytes);
  const file=new URL('vendor/'+name,root);
  if(process.argv.includes('--check')){if(!(await readFile(file)).equals(bytes))throw new Error('Vendor file changed: '+name);}
  else await writeFile(file,bytes);
}
const result = await build({ stdin: { contents: "export { createClient } from '@supabase/supabase-js';", resolveDir: new URL('.', root).pathname }, bundle: true, format: 'iife', globalName: 'FreeterSupabase', platform: 'browser', target: ['es2022'], minify: true, legalComments: 'inline', write: false });
// The SDK reads localStorage at module initialization (including lock debugging).
// Evaluate it only after the app has verified that account storage is available.
await emit('supabase.js', '/* Supabase JS 2.118.0, MIT; see SUPABASE-LICENSE.txt. Lazy initialization preserves restricted-browser startup. */\nfunction loadFreeterSupabase(){\n' + result.outputFiles[0].text+'\nreturn FreeterSupabase;\n}\n');
await emit('SUPABASE-LICENSE.txt',await readFile(new URL('node_modules/@supabase/supabase-js/LICENSE',root)));
// GHSA-v3m3-f69x-jf25 has no upstream fixed release. This app exports plain
// text/validated Delta only. Remove the vulnerable HTML serializer at build time,
// keeping clipboard HTML limited to escaped text and trusted <br> separators.
const quill = await build({ stdin: { contents: "import Quill from 'quill'; globalThis.Quill = Quill;", resolveDir: root.pathname }, bundle: true, format: 'iife', platform: 'browser', target: ['es2022'], minify: true, legalComments: 'inline', write: false, plugins: [{ name: 'freeter-safe-quill-export', setup(build) {
  build.onLoad({ filter: /quill\/core\/editor\.js$/ }, async ({ path }) => {
    const original = await readFile(path, 'utf8');
    const pattern = /  getHTML\(index, length\) \{[\s\S]*?\n  \}\n  getText\(index, length\)/;
    if (!pattern.test(original)) throw new Error('Quill source changed: review the HTML export security patch.');
    return { contents: original.replace(pattern, "  getHTML(index, length) {\n    return escapeText(this.getText(index, length)).replace(/\\n/g, '<br>');\n  }\n  getText(index, length)"), loader: 'js' };
  });
} }] });
await emit('quill.js', '/* Quill 2.0.3, BSD-3-Clause. Freeter security patch: escaped-text HTML export; GHSA-v3m3-f69x-jf25. */\n'+quill.outputFiles[0].text);
for (const [from,to] of [['dist/quill.core.css','quill.core.css'],['LICENSE','QUILL-LICENSE.txt']]) await emit(to,await readFile(new URL('node_modules/quill/'+from,root)));
const image=await build({stdin:{contents:"export { toBlob } from 'html-to-image';",resolveDir:root.pathname},bundle:true,format:'iife',globalName:'FreeterImage',platform:'browser',target:['es2022'],minify:true,legalComments:'inline',write:false});
await emit('html-to-image.js','/* html-to-image 1.11.13, MIT; see THIRD-PARTY-LICENSES.txt. */\nfunction loadFreeterImage(){\n'+image.outputFiles[0].text+'\nreturn FreeterImage;\n}\n');
const lock=JSON.parse(await readFile(new URL('package-lock.json',root),'utf8')),licenses=[];
for(const [path,pkg]of Object.entries(lock.packages)){
  if(!path.startsWith('node_modules/')||pkg.dev||pkg.optional)continue;
  const names=(await readdir(new URL(path+'/',root))).filter(name=>/^(licen[sc]e|copying|copyrightnotice|notice)(\.|$)/i.test(name)).sort();
  if(!names.length)throw new Error('Missing bundled dependency license: '+path);
  for(const name of names)licenses.push(`${path} @ ${pkg.version} — ${name}\n${(await readFile(new URL(path+'/'+name,root),'utf8')).replaceAll('\r\n','\n')}`);
}
await emit('THIRD-PARTY-LICENSES.txt',licenses.join('\n\n------------------------------------------------------------\n\n')+'\n');
const files=['supabase.js','quill.js','quill.core.css','html-to-image.js'];
const hashes=Object.fromEntries(await Promise.all(files.map(async name=>[name,createHash('sha256').update(outputs.get(name)).digest('hex')])));
await emit('checksums.json',JSON.stringify(hashes,null,2)+'\n');
console.log(process.argv.includes('--check')?'Verified pinned and patched vendor assets.':'Built pinned Supabase SDK, patched Quill and vendor checksums.');
