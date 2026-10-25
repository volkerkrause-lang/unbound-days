import {chromium} from 'playwright';
import {newCovers,artwork} from '../cover-library.js';
import {readFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:process.env.CHROMIUM_EXECUTABLE_PATH?['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process']:[]});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1440}});await page.goto(process.env.UNBOUND_TEST_URL||'http://127.0.0.1:4173/');
 for(const c of newCovers)assert.equal(await readFile(c.file.split('?')[0],'utf8'),artwork(c),c.name+' must match its generator');
 const result=await page.evaluate(async covers=>{const hashes=[],failed=[];for(const c of covers){try{const img=new Image();img.src=c.file;await img.decode();const canvas=document.createElement('canvas');canvas.width=120;canvas.height=84;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,120,84);hashes.push(canvas.toDataURL());}catch{failed.push(c.name)}}return {unique:new Set(hashes).size,failed};},newCovers);
 assert.deepEqual(result.failed,[]);assert.equal(result.unique,96,'All 96 covers must have visually distinct rendered pixels');
 await page.setContent(`<style>body{margin:16px;background:#f4f0e7;font:12px system-ui}.grid{display:grid;grid-template-columns:repeat(8,1fr);gap:12px}img{width:100%;aspect-ratio:10/7;border-radius:6px}p{margin:4px 0 12px}</style><div class="grid">${newCovers.map(c=>`<div><img src="http://127.0.0.1:4173/${c.file}"><p>${c.name}</p></div>`).join('')}</div>`);await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/cover-artwork-all.png',fullPage:true});console.log('96 artwork files match generator, decode and have unique rendered pixels.');
}finally{await browser.close()}
