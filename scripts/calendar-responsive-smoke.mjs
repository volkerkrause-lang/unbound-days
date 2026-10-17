// Isolated staging checks: synthetic notebook only, no signed-in account.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try {
 for(const [name,width,height,touch] of [['desktop',1440,1000,false],['ipad-landscape',1194,834,true],['ipad-portrait',834,1194,true],['mobile',390,844,true]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.UNBOUND_TEST_URL||'http://localhost:4173/');
  await page.locator('[data-action="open"]').click();
  await page.locator('.bookmark-today').click();
  await page.getByLabel('Priority 1',{exact:true}).fill('Responsive writing');
  await page.getByRole('button',{name:'Sage highlight',exact:true}).click();
  await page.locator('[data-action="highlight-toggle"]').click();
  const box=await page.locator('#calendar-highlight-canvas').boundingBox();
  await page.mouse.move(box.x+25,box.y+45);await page.mouse.down();await page.mouse.move(box.x+110,box.y+45,{steps:8});await page.mouse.up();
  await page.locator('[data-action="highlight-toggle"]').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('unbound-days-v1')));
  const key=Object.keys(saved.ink).find(k=>k.startsWith('calendar-highlight:day:'));
  assert.equal(saved.ink[key].at(-1).color,'#91a58f');
  await page.reload();
  if(await page.locator('[data-action="open"]').count())await page.locator('[data-action="open"]').click();
  await page.locator('.bookmark-today').click();
  assert.equal(await page.getByLabel('Priority 1',{exact:true}).inputValue(),'Responsive writing');
  assert.ok(await page.locator('#calendar-highlight-canvas').evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).some((v,i)=>i%4===3&&v>0)));
  // Populate the isolated notebook through its existing storage schema.
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('unbound-days-v1')),d=new Date(),date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;s.events=Array.from({length:5},(_,i)=>({id:'responsive-'+i,date,title:i?'Long appointment '+ 'Unbroken'.repeat(60):'Short',category:'work',time:'10:00'}));localStorage.setItem('unbound-days-v1',JSON.stringify(s));});
  await page.reload();if(await page.locator('[data-action="open"]').count())await page.locator('[data-action="open"]').click();
  await page.locator('.bookmark-today').click();
  await page.locator('[data-view="month"]').filter({visible:true}).click();
  const chips=page.locator('.calendar-table .entry-chip');assert.equal(await chips.count(),2);
  assert.ok(await chips.evaluateAll(nodes=>nodes.every(n=>{const a=n.getBoundingClientRect(),b=n.closest('td').getBoundingClientRect();return a.left>=b.left&&a.right<=b.right+1&&n.scrollWidth>=n.clientWidth;})));
  assert.equal(await page.locator('.more-count').textContent(),'+3 more');
  assert.equal(await page.locator('.today-button').isVisible(),!touch);
  await page.locator('.day-cell.is-today .more-count').click();assert.ok(await page.locator('.day-spread').isVisible());
  assert.equal(await page.locator('.agenda-item').count(),5);
  await page.locator('[data-action="prev"]').click();await page.locator('.bookmark-today').click();assert.ok(await page.locator('.day-spread').isVisible());
  assert.deepEqual(errors,[]);console.log(`${name}: highlighting/reload, writing, month containment/count, day details and Today navigation passed`);
  await context.close();
 }
}finally{await browser.close();}
