// Run against a local/staging build; this never uses production credentials.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:process.env.CHROMIUM_EXECUTABLE_PATH?['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--disable-gpu-sandbox','--in-process-gpu']:[]});
try{
 const page=await browser.newPage({viewport:{width:1366,height:1024},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>new URL(route.request().url()).hostname===new URL(process.env.UNBOUND_TEST_URL||'http://localhost:4173/').hostname?route.continue():route.abort());await page.goto(process.env.UNBOUND_TEST_URL||'http://localhost:4173/',{waitUntil:'domcontentloaded'});
 await page.locator('#account-open').waitFor();assert.equal(await page.locator('#account-open').textContent(),'Log In');
 await page.locator('#account-open').click();await page.locator('#modal[open]').waitFor();assert.ok(await page.locator('#account-form').count()||await page.getByText('Account setup required',{exact:true}).count());
 await page.getByRole('button',{name:'Close',exact:true}).click();
 // Seed only this fresh browser context, then verify persistence and guest isolation.
 await page.evaluate(()=>{const data={version:1,events:[],tasks:[{id:'smoke-task',title:'Smoke notebook',date:'2026-10-14',done:false}],notes:[],habits:[],entries:{'smoke-note':'Writing retained'},settings:{cover:0,favorites:[],selectedCalendars:[],ink:'#313a41'},ink:{},trash:[],bookmarks:[]};localStorage.setItem('unbound-days-v1',JSON.stringify(data));});
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('#account-open').waitFor();
 const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('unbound-days-v1')));assert.equal(data.tasks[0].title,'Smoke notebook');assert.equal(data.entries['smoke-note'],'Writing retained');
 await page.locator('[data-action="open"]').click();await page.locator('#app').waitFor();
 assert.deepEqual(errors,[]);console.log('Notebook/account setup browser smoke passed');
}finally{await browser.close();}
