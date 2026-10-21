import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('test-results',{recursive:true});
for(const [name,width,height] of [['s23',412,915],['small',360,780],['ipad-portrait',820,1180],['ipad-landscape',1180,820],['desktop',1440,1000]]){
if(process.env.UNBOUND_DEVICE&&process.env.UNBOUND_DEVICE!==name)continue;const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:process.env.CHROMIUM_EXECUTABLE_PATH?['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--disable-gpu-sandbox','--in-process-gpu']:[]});
try{
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.SpeechRecognition=class {start(){this.onresult?.({results:[[{transcript:'dictated test'}]]});this.onend?.();}stop(){this.onend?.();}};});
 page.setDefaultTimeout(30000);
 await page.route('**/*',route=>['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());await page.goto(process.env.UNBOUND_TEST_URL||'http://localhost:4173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{localStorage.setItem('unbound-days-v1-backup-onboarding','deferred');localStorage.setItem('unbound-days-v1',JSON.stringify({version:1,events:[],tasks:[],notes:[],habits:[],entries:{},settings:{cover:0,backupPromptSeen:true,taskLists:Array.from({length:12},(_,i)=>({id:'test-'+i,title:'List '+i,colour:'#516d83'}))},ink:{},trash:[],bookmarks:[]}));});
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-action="open"]').click();if(await page.locator('[data-action="backup-later"]').isVisible())await page.locator('[data-action="backup-later"]').click();
 assert.equal(await page.locator('.shared-write-tools:visible').count(),0);
 const field=page.locator('textarea').first();await field.focus();await page.locator('.shared-write-tools:visible').waitFor();
 const geometry=await page.locator('.shared-write-tools:visible').evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,text:getComputedStyle(el.querySelector('.writing-tool-label')).display}});
 assert.ok(geometry.width<140&&geometry.x>=0&&geometry.right<=width+1,JSON.stringify(geometry));assert.equal(geometry.text,'none');assert.deepEqual(await page.locator('.shared-write-tools:visible button').evaluateAll(ns=>ns.map(n=>n.getAttribute('aria-label'))),['Pencil','Dictate','Keyboard']);
 await page.locator('.shared-write-tools:visible [data-action="pencil"]').click();assert.equal(await field.evaluate(el=>el===document.activeElement),true);
 await page.locator('.shared-write-tools:visible [data-action="dictate"]').click();assert.match(await field.inputValue(),/Dictated test/);
 await field.blur();assert.equal(await page.locator('.shared-write-tools:visible').count(),0);
 await page.locator('[data-section="tasks"]').first().click();
 await page.locator('.task-ribbon-scroll').evaluate(el=>{el.scrollLeft=400;el.dispatchEvent(new Event('scroll'));});
 const left=await page.locator('.task-ribbon-scroll').evaluate(el=>el.scrollLeft);
 await page.locator('#task-quick input[name="title"]').fill('Tab persistence check');await page.locator('#task-quick button').click();
 assert.ok(Math.abs(await page.locator('.task-ribbon-scroll').evaluate(el=>el.scrollLeft)-left)<2);
 await page.screenshot({path:`test-results/refinements-${name}-tasks.png`,fullPage:true});
 await page.locator('[data-section="goals"]').first().click();await page.locator('[data-planner-choice="forms"]').click();
 await page.locator('[data-template-new-folder]').click();await page.locator('[name="name"]').fill('Work');await page.locator('#template-library-form [type="submit"]').click();
 await page.locator('.folder-art').waitFor();await page.screenshot({path:`test-results/refinements-${name}-folders.png`,fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('#planner-search').fill('holiday');await page.locator('[data-planner-template="holiday"]').click();
 await page.locator('#planner-create [type="submit"]').click();await page.locator('.planner-table').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:`test-results/refinements-${name}-form.png`,fullPage:true});
 assert.deepEqual(errors,[]);console.log(name+' toolbar, pencil target, task scroll, folders and overflow passed');
}finally{await browser.close();}}
