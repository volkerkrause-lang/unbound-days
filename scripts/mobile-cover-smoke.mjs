import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 await page.goto(process.env.UNBOUND_TEST_URL||'http://localhost:4173/');
 await page.locator('#account-open').waitFor();
 const cover=page.locator('.cover-book');
 await cover.waitFor();
 const geometry=await page.evaluate(()=>{
  const cover=document.querySelector('.cover-book'),box=cover.getBoundingClientRect();
  const tabs=['calendar','goals','tasks'].map(section=>{
   const el=cover.querySelector(`.cover-tab[data-section="${section}"]`),r=el.getBoundingClientRect();
   return {section,top:r.top-box.top,height:r.height};
  });
  return {viewport:innerWidth,coverWidth:box.width,coverHeight:box.height,tabs};
 });
 assert.ok(geometry.coverWidth>=geometry.viewport*.74,`cover should occupy at least 74% of the phone width: ${JSON.stringify(geometry)}`);
 assert.deepEqual(geometry.tabs.map(x=>x.section),['calendar','goals','tasks']);
 const centers=geometry.tabs.map(x=>x.top+x.height/2),gaps=[centers[1]-centers[0],centers[2]-centers[1]];
 assert.ok(Math.abs(gaps[0]-gaps[1])<=geometry.coverHeight*.035,`bookmark centres should be evenly spaced: ${JSON.stringify({geometry,gaps})}`);
 assert.ok(geometry.tabs.every(x=>x.top>=0&&x.top+x.height<=geometry.coverHeight),`all bookmarks should fit beside the cover: ${JSON.stringify(geometry)}`);
 await page.screenshot({path:'test-results/mobile-cover.png',fullPage:true});
 console.log(JSON.stringify({passed:true,...geometry,gaps}));
}finally{await browser.close();}
