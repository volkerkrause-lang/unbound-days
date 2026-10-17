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
  await page.getByRole('button',{name:'Monthly Reflection'}).click();
  await page.locator('.reflection-grid').waitFor();
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('Desktop, tablet and mobile: highlight persistence, undo, navigation and Reflection passed');
}finally{await browser.close();}
