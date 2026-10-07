import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.dirname(new URL(import.meta.url).pathname), port=Number(process.env.PORT||4173);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'); const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/ ' ? '/' : url.pathname)); if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end();}const target=url.pathname.endsWith('/')?path.join(file,'index.html'):file;const body=await fs.readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'0.0.0.0',()=>console.log(`Unbound available on port ${port}`));
