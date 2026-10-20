import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 for(const viewport of [{width:1180,height:820},{width:1024,height:768},{width:390,height:844}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:4173/');
  await page.locator('[data-action="open"]').click();
  await page.locator('.section-calendar.view-day').waitFor();
  assert.equal(await page.locator('.section-tabs [data-section="reflection"]').count(),0);
  assert.equal(await page.locator('.section-tabs [data-section="launchpad"]').textContent(),'Notes & Ideas');
  const canvas=page.locator('#calendar-highlight-canvas');await canvas.waitFor();
  const toggle=page.locator('[data-action="highlight-toggle"]');
  await toggle.click();await page.getByRole('button',{name:'Gold highlight',exact:true}).click();assert.equal(await toggle.getAttribute('aria-pressed'),'true');
  const rect=await canvas.boundingBox();assert.ok(rect?.width>100&&rect?.height>100);
  await page.mouse.move(rect.x+rect.width*.3,rect.y+rect.height*.3);
  await page.mouse.down();await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.4,{steps:6});await page.mouse.up();
  const saved=await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('unbound-days-v1'));return Object.entries(d.ink||{}).filter(([k])=>k.startsWith('calendar-highlight:'));});
  assert.ok(saved.length>0&&saved[0][1].length>0,'Highlight persisted');
  await toggle.click();await toggle.click();
  await page.locator('[data-action="highlight-undo"]').click();
  const erased=await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('unbound-days-v1'));return Object.entries(d.ink||{}).filter(([k])=>k.startsWith('calendar-highlight:'));});
  assert.equal(erased[0][1].length,0);
  await page.locator('[data-section="goals"]').first().click();
  assert.equal(await page.getByRole('button',{name:'Monthly Reflection',exact:true}).count(),0);
  await page.getByText('Build Your Own',{exact:true}).waitFor();
  await page.getByText('Choose from Forms',{exact:true}).waitFor();
  await page.getByRole('button',{name:/Choose from Forms/}).click();
  await page.locator('#planner-search').waitFor();
  assert.equal(await page.locator('.writing-target').count(),0);
  for(const section of ['tasks','habits','launchpad']){await page.locator('.section-tabs [data-section="'+section+'"]').click();assert.equal(await page.locator('.mobile-view-switch').count(),0);assert.equal(await page.locator('.writing-target').count(),0);}
  if(!await page.locator('#ink-canvas').count())await page.getByRole('button',{name:'New idea',exact:true}).click();
  const ideaCanvas=page.locator('#ink-canvas');await ideaCanvas.waitFor();
  const handwritingTools=page.getByRole('toolbar',{name:'Handwriting tools',exact:true});
  for(const tool of ['Ink pen','Pencil','Highlighter','Eraser','Lasso'])assert.equal(await handwritingTools.getByRole('button',{name:tool,exact:true}).count(),1);
  await page.locator('[data-idea-paper]').selectOption('grid');await page.locator('.idea-paper-grid').waitFor();
  const ideaRect=await ideaCanvas.boundingBox();assert.ok(ideaRect?.width>100&&ideaRect?.height>100);
  await page.mouse.move(ideaRect.x+40,ideaRect.y+50);await page.mouse.down();await page.mouse.move(ideaRect.x+140,ideaRect.y+100,{steps:8});await page.mouse.up();
  const ideaInk=await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('unbound-days-v1'));return Object.values(d.ink||{}).filter(x=>Array.isArray(x)&&x.some(s=>s.tool==='pen'));});
  assert.ok(ideaInk.length>0,'Idea ink persisted');
  await page.locator('.idea-transcript summary').click();await page.locator('.idea-transcript textarea').fill('Clean converted note');
  await page.getByRole('button',{name:'Convert handwriting to text',exact:true}).click();await page.getByRole('button',{name:'Replace canvas with text',exact:true}).click();
  await page.locator('.idea-converted-editor').waitFor();assert.equal(await page.locator('#ink-canvas').count(),0);
  await page.locator('.section-tabs [data-section="tasks"]').click();
  await page.getByRole('button',{name:'Pencil',exact:true}).click();
  assert.equal(await page.locator('#task-quick input[name="title"]').evaluate(e=>document.activeElement===e),true);
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('Desktop, tablet and mobile: highlight persistence, undo, navigation and automatic writing focus passed');
}finally{await browser.close();}
