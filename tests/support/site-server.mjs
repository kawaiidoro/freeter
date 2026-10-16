import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const root=new URL('../../',import.meta.url);
const types={html:'text/html; charset=utf-8',js:'text/javascript',json:'application/json',css:'text/css',png:'image/png',svg:'image/svg+xml',woff2:'font/woff2',webmanifest:'application/manifest+json'};
export async function serveSite(config={url:'',publishableKey:''}){
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname.replace(/^\/freeter\//,'').replace(/^\//,'')||'index.html';
  const file=new URL(path,root);if(!file.href.startsWith(root.href)){res.writeHead(403).end();return;}
  try{
   let bytes=await readFile(file);
   if(path==='site.js')bytes=Buffer.from(bytes.toString().replace(/const CLOUD_CONFIG = [^\n]+;/,'const CLOUD_CONFIG = '+JSON.stringify(config)+';'));
   if(path.endsWith('.html'))bytes=Buffer.from(bytes.toString().replace(/connect-src 'self'[^;\"]*/,"connect-src 'self'"+(config.url?' '+config.url:'')));
   res.setHeader('Content-Type',types[path.split('.').at(-1)]||'application/octet-stream');res.end(bytes);
  }catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return{base:`http://127.0.0.1:${server.address().port}/freeter/`,close:()=>new Promise(resolve=>server.close(resolve))};
}
