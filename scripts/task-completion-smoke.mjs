// Isolated local notebook; uses synthetic data only and never signs in or syncs.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:process.env.CHROMIUM_EXECUTABLE_PATH?['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process']:[]});
try{
 const page=await browser.newPage({viewport:{width:1366,height:900},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(localStorage.getItem('unbound-days-v1'))return;localStorage.setItem('unbound-days-v1',JSON.stringify({version:1,events:[],tasks:[{id:'smoke-task',title:'Task completion smoke',date:'2026-11-06',done:false,notes:'Retain task notes',listId:'local'}],notes:[],habits:[],entries:{},settings:{cover:0,favorites:[],selectedCalendars:[],ink:'#313a41'},ink:{},trash:[],bookmarks:[]}));});
 await page.goto(process.env.UNBOUND_TEST_URL||'http://localhost:4173/');await page.locator('#account-open').waitFor();
 await page.locator('[data-action="open"]').click();await page.locator('.section-tabs [data-section="tasks"]').click();
 const row=page.locator('[data-task-row="smoke-task"]');await row.waitFor();
 const done=row.locator('[data-task-done="smoke-task"]');assert.equal(await done.innerText(),'Done');assert.equal(await row.locator('[data-task-check]').count(),0);assert.equal(await row.locator('[data-task-reschedule], [data-task-duplicate]').count(),0);
 for(const width of [390,820,1366]){await page.setViewportSize({width,height:900});const layout=await row.evaluate(el=>{const content=el.querySelector('.todo-card-content').getBoundingClientRect(),button=el.querySelector('.task-done-button').getBoundingClientRect();return{contentRight:content.right,buttonLeft:button.left,buttonWidth:button.width,buttonHeight:button.height,overflow:el.scrollWidth>el.clientWidth};});assert.ok(layout.buttonWidth>=72&&layout.buttonHeight>=44,`touch target at ${width}px`);assert.ok(layout.contentRight<=layout.buttonLeft,`no overlap at ${width}px`);assert.equal(layout.overflow,false,`no horizontal overflow at ${width}px`);}
 await page.setViewportSize({width:1366,height:900});
 await row.locator('.task-name').click();assert.equal(await page.locator('#task-form [name="date"]').inputValue(),'2026-11-06');assert.equal(await page.locator('#task-form [name="notes"]').inputValue(),'Retain task notes');await page.locator('#modal [data-action="close-modal"]').click();
 await done.click();assert.equal(await done.getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('unbound-days-v1')).tasks[0].done),true);
 await page.locator('.task-completion-undo button').click();assert.equal(await page.locator('[data-task-done="smoke-task"]').getAttribute('aria-pressed'),'false','Undo restores the previous completion state');
 await page.locator('[data-task-done="smoke-task"]').click();await page.reload();await page.locator('[data-action="open"]').click();await page.locator('.section-tabs [data-section="tasks"]').click();assert.equal(await page.locator('[data-task-done="smoke-task"]').getAttribute('aria-pressed'),'true','completion persists after reload');
 await page.locator('[data-task-done="smoke-task"]').click();assert.equal(await page.locator('[data-task-done="smoke-task"]').getAttribute('aria-pressed'),'false');
 await page.locator('[data-task-action="toggle-selection"]').click();assert.equal(await row.locator('[data-task-done]').count(),0);assert.equal(await row.locator('[data-task-select]').count(),1);assert.equal(await page.locator('.task-management').count(),0);assert.equal(await page.getByText('Edit Lists',{exact:true}).count(),0);assert.equal(await page.getByText('New list',{exact:true}).count(),0);
 await row.locator('[data-task-select]').check();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('unbound-days-v1')).tasks[0].done),false);assert.equal(await page.locator('.task-selected-count').innerText(),'1 selected');
 await page.locator('[data-task-action="clear-selection"]').click();
 await row.locator('.task-archive-desktop').click({force:true});await page.waitForFunction(()=>JSON.parse(localStorage.getItem('unbound-days-v1')).tasks[0].archived===true);
 assert.deepEqual(errors,[]);console.log('Task Done toggle/undo state, editing dates and notes, independent selection, archive, and mobile/iPad/desktop layout passed');
}finally{await browser.close();}
