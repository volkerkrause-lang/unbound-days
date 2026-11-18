import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
  await mkdir('test-results',{recursive:true});
  for(const [name,width,height] of [['ipad-small',768,1024],['ipad',820,1180],['ipad-large',1024,1366],['landscape',1180,820],['phone',390,844]]){
    const page=await browser.newPage({viewport:{width,height},hasTouch:true});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(process.env.UNBOUND_TEST_URL||'http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
    await page.evaluate(()=>localStorage.setItem('unbound-days-v1-backup-onboarding','deferred'));
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('.cover-book').waitFor();
    const closed=await page.evaluate(()=>{
      const cover=document.querySelector('.cover-book').getBoundingClientRect();
      const tabs=[...document.querySelectorAll('.cover-tab')].map(tab=>tab.getBoundingClientRect().right);
      return {right:Math.max(cover.right,...tabs),position:getComputedStyle(document.body).backgroundPosition,desk:document.body.classList.contains('desk-enabled')};
    });
    assert.ok(closed.desk,`${name}: default wooden desk is available`);
    if(name.startsWith('ipad')){
      // The photograph is 1536 × 1024. The cup begins at x≈1120 in that image.
      const cupLeft=1120*height/1024-(1.5*height-width)*.73;
      assert.match(closed.position,/73%/,`${name}: portrait crop (computed ${closed.position})`);
      assert.ok(closed.right+8<cupLeft,`${name}: closed cover and tabs must clear cup (${closed.right} < ${cupLeft})`);
    }
    if(name==='ipad')await page.screenshot({path:'test-results/moving-ipad-closed.png'});
    await page.locator('[data-action="open"]').click();
    await page.locator('.book-shell').waitFor();
    const open=await page.evaluate(()=>({right:document.querySelector('.book-shell').getBoundingClientRect().right,scroll:document.documentElement.scrollWidth}));
    assert.ok(open.scroll<=width+2,`${name}: no horizontal page overflow`);
    if(name.startsWith('ipad')){
      const cupLeft=1120*height/1024-(1.5*height-width)*.73;
      assert.ok(open.right+8<cupLeft,`${name}: open notebook must clear cup (${open.right} < ${cupLeft})`);
    }
    if(name==='ipad')await page.screenshot({path:'test-results/moving-ipad-open.png'});
    assert.deepEqual(errors,[],`${name}: no JavaScript errors`);
    await page.close();
  }
} finally {await browser.close();}
