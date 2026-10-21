import {chromium} from 'playwright';
import assert from 'node:assert/strict';
for(const [name,width,height] of [['desktop',1366,1024],['ipad-landscape',1180,820],['ipad-portrait',820,1180],['mobile',390,844]]){
if(process.env.UNBOUND_DEVICE&&process.env.UNBOUND_DEVICE!==name)continue;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:process.env.CHROMIUM_EXECUTABLE_PATH?['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--disable-gpu-sandbox','--in-process-gpu']:[]});
try{
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>{errors.push(e.message);console.log('BROWSER ERROR',e.message);});
 await page.route('**/*',route=>new URL(route.request().url()).hostname===new URL(process.env.UNBOUND_TEST_URL||'http://localhost:4173/').hostname?route.continue():route.abort());await page.goto(process.env.UNBOUND_TEST_URL||'http://localhost:4173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{localStorage.setItem('unbound-days-v1-backup-onboarding','deferred');const today=new Date().toISOString().slice(0,10);localStorage.setItem('unbound-days-v1',JSON.stringify({version:1,events:['Early',' EARLY ','Late','Long Day','Appointment'].map((title,i)=>({id:'sample-'+i,title,date:today,endDate:today,lastDate:today,time:'',category:'personal',repeat:'none'})),tasks:[],notes:[],habits:[],entries:{},settings:{cover:0,favorites:[],selectedCalendars:[],ink:'#313a41',backupPromptSeen:true},ink:{},trash:[],bookmarks:[]}));});
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-action="open"]').click();
 // Dismiss optional first-run backup prompt, if shown.
 if(await page.locator('[data-action="backup-later"]').isVisible())await page.locator('[data-action="backup-later"]').click();
 await page.locator('[data-section="goals"]').first().click();
 await page.locator('[data-planner-choice="custom"]').click();await page.locator('[data-custom-new]').click();
 await page.locator('[data-custom-add="note"]').click();await page.locator('.custom-note').fill('Filled source answer');
 await page.locator('[data-custom-add="voice"]').click();
 const sizes=await page.locator('.custom-component').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));assert.ok(Math.abs(sizes[0]-sizes[1])<2);
 await page.locator('[data-template-save]').click();await page.locator('#template-library-form [name="name"]').fill('Ward review');await page.locator('#template-library-form [type="submit"]').click();
 const source=await page.evaluate(()=>JSON.parse(localStorage.getItem('unbound-days-v1')).entries);assert.ok(Object.values(source).includes('Filled source answer'));
 await page.locator('[data-planner-root]').click();await page.locator('[data-planner-choice="forms"]').click();
 await page.locator('[data-template-new-folder]').click();await page.locator('#template-library-form [name="name"]').fill('Work');await page.locator('#template-library-form [type="submit"]').click();
 await page.locator('[data-template-move]').click();await page.locator('#template-library-form [name="parent"]').selectOption({label:'Work'});await page.locator('#template-library-form [type="submit"]').click();
 await page.getByRole('button',{name:'Work',exact:true}).click();await page.locator('[data-template-use]').click();assert.equal(await page.locator('.custom-note').inputValue(),'');
 await page.locator('.custom-note').fill('New separate sheet');await page.reload({waitUntil:'domcontentloaded'});
 assert.ok(Object.values(await page.evaluate(()=>JSON.parse(localStorage.getItem('unbound-days-v1')).entries)).includes('New separate sheet'));
 // Navigate to Month, verify title-derived backgrounds and containment.
 await page.locator('[data-section="calendar"]').first().click();await page.locator(width<600?'[data-mobile-view="month"]':'[data-view="month"]').click();
 const chips=page.locator('.calendar-table .title-coloured');await chips.first().waitFor();
 if(process.env.UNBOUND_SCREENSHOTS)await page.screenshot({path:`/tmp/unbound-${name}-month.png`,fullPage:true,timeout:30000});
 const colours=await chips.evaluateAll(ns=>ns.map(n=>getComputedStyle(n).backgroundColor));assert.equal(colours[0],colours[1]);
 const overflow=await chips.evaluateAll(ns=>ns.some(n=>{const a=n.getBoundingClientRect(),b=n.closest('td').getBoundingClientRect();return a.right>b.right+1||a.left<b.left-1;}));assert.equal(overflow,false);
 await chips.first().click();await page.locator('#event-form [name="titleColour"]').selectOption('#d6ecec');await page.locator('#event-form [type="submit"]').click();
 await page.reload({waitUntil:'domcontentloaded'});assert.ok(Object.values(await page.evaluate(()=>JSON.parse(localStorage.getItem('unbound-days-v1')).entries)).includes('#d6ecec'));
 assert.deepEqual(errors,[]);console.log(name+' template, folder, colour, containment and persistence passed');
}finally{await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,2000))]);}
}
