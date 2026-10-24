import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const args=process.env.CHROMIUM_EXECUTABLE_PATH?['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--disable-gpu-sandbox','--in-process-gpu']:[];
for(const [device,width,height] of [['desktop',1366,1024],['ipad-landscape',1180,820],['ipad-portrait',820,1180],['mobile',390,844]]){
 if(process.env.UNBOUND_DEVICE&&process.env.UNBOUND_DEVICE!==device)continue;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args});
 try{
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];page.setDefaultTimeout(15000);
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).hostname===new URL(process.env.UNBOUND_TEST_URL||'http://localhost:4173').hostname?r.continue():r.abort());
  await page.addInitScript(()=>{
   class Recognition{constructor(){window.testRecognition=this;}start(){this.running=true;}stop(){this.running=false;this.onend?.();}emit(text){this.onresult?.({results:[[{transcript:text}]]});}}
   window.SpeechRecognition=Recognition;
  });
  await page.goto(process.env.UNBOUND_TEST_URL||'http://localhost:4173');
  await page.evaluate(()=>{const d=new Date(),today=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;localStorage.setItem('unbound-days-v1-backup-onboarding','deferred');localStorage.setItem('unbound-days-v1',JSON.stringify({version:1,events:[],notes:[],habits:[],entries:{},ink:{},trash:[],bookmarks:[],settings:{cover:0,favorites:[],selectedCalendars:[],taskLists:[{id:'work',title:'Work',colour:'#718b80'}]},tasks:[{id:'today',title:'Today task',date:today,done:false},{id:'later',title:'Work task',listId:'work',date:'2030-01-01',done:false},{id:'done',title:'Completed task',date:today,done:true},{id:'deleted',title:'Deleted task',date:today,deleted:true}]}));});
  await page.reload();await page.locator('[data-action="open"]').click();
  await page.locator('[data-task-widget="toggle"]').click();
  assert.equal(await page.locator('.task-widget-rows button').allTextContents().then(x=>x.join()),'Today task');if(device==='mobile')await page.screenshot({path:'/tmp/unbound-mobile-task-panel.png'});
  await page.locator('[data-task-widget-list]').selectOption('work');assert.equal(await page.locator('.task-widget-rows button').innerText(),'Work task');
  await page.locator('.task-widget-rows input').click();assert.equal(await page.locator('.task-widget-rows button').count(),0);
  await page.reload();await page.locator('[data-action="open"]').click();await page.locator('[data-task-widget="toggle"]').click();assert.equal(await page.locator('[data-task-widget-list]').inputValue(),'work');
  await page.locator('[data-task-widget-list]').selectOption('today');await page.locator('[data-task-widget="close"]').click();
  await page.locator('[data-section="goals"]').first().click();await page.locator('[data-planner-choice="custom"]').click();await page.locator('[data-custom-new]').click();
  await page.locator('[data-custom-add="note"]').click();const field=page.locator('.custom-note');await field.fill('Bring the blue folder tomorrow.');
  await field.evaluate(el=>{el.focus();el.setSelectionRange(10,14);});await page.getByRole('button',{name:'Dictate',exact:true}).click();await page.evaluate(()=>window.testRecognition.emit('green'));
  assert.equal(await field.inputValue(),'Bring the green folder tomorrow.');
  await page.locator('[data-dictation="stop"]').click();if(device==='mobile')await page.screenshot({path:'/tmp/unbound-mobile-dictation-panel.png'});await page.locator('[data-dictation="select"]').click();await page.locator('[data-dictation="replace"]').click();await page.evaluate(()=>window.testRecognition.emit('red'));
  assert.equal(await field.inputValue(),'Bring the red folder tomorrow.');
  await page.locator('[data-dictation="stop"]').click();await page.locator('[data-dictation="undo"]').click();assert.equal(await field.inputValue(),'Bring the green folder tomorrow.');
  // Editing while recognition runs must stop it and ignore queued results.
  await field.evaluate(el=>{el.focus();el.setSelectionRange(el.value.length,el.value.length);});await page.getByRole('button',{name:'Dictate',exact:true}).click();await page.evaluate(()=>window.testRecognition.emit('and pen'));
  await field.press('End');await field.press('!');const edited=await field.inputValue();await page.evaluate(()=>window.testRecognition.emit('late result'));assert.equal(await field.inputValue(),edited);assert.equal(await page.evaluate(()=>window.testRecognition.running),false);await page.locator('[data-dictation="done"]').click();
  await page.locator('[data-custom-add="drawing"]').click();await page.getByLabel('Pen and eraser thickness',{exact:true}).click();const slider=page.getByLabel('Pen and eraser size',{exact:true});assert.ok((await slider.boundingBox()).width>180);await slider.fill('12');assert.equal(await page.locator('[data-size-value]').textContent(),'12');await page.getByLabel('Pen and eraser thickness',{exact:true}).click();
  await page.locator('[data-custom-add="voice"]').click();assert.equal(await page.locator('[data-custom-record] .record-control').count(),1);
  await page.locator('[data-planner-pin]').click();assert.equal(await page.locator('.polished-form').count(),1);assert.equal(await field.inputValue(),edited);
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();await page.locator('[data-template-save-sheet]').click();assert.equal(await page.locator('.polished-form').count(),1);
  const toolbar=page.locator('.planner-toolbar').first();assert.ok((await toolbar.boundingBox()).height<50);assert.ok(await page.locator('.form-action-label').first().isVisible());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  await page.screenshot({path:`/tmp/unbound-${device}-improvements.png`,fullPage:true});
  await page.reload();await page.locator('[data-action="open"]').click();if(device==='mobile'){await page.locator('.mobile-pinned-tab').first().click();}else{await page.locator('[data-section="myforms"]').first().click();await page.locator('.planner-card[data-planner-open]').first().click();}assert.equal(await field.inputValue(),edited);assert.equal(await page.locator('.polished-form').count(),1);
  assert.deepEqual(errors,[]);console.log(`${device}: widget filtering/completion, dictation replacement/undo/manual edits, drawing slider, record button, pin/save and reload passed`);
 }finally{await browser.close();}
}
