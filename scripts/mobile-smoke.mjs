// Isolated local notebook only; never authenticates or changes remote user data.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.UNBOUND_TEST_URL||'http://localhost:4173/');
 await page.locator('#account-open').waitFor();
 await page.evaluate(()=>{const key='unbound-days-v1',data=JSON.parse(localStorage.getItem(key)||'null')||{version:1,events:[],tasks:[],notes:[],habits:[],entries:{},settings:{cover:0},ink:{},trash:[],bookmarks:[]};Object.assign(data.entries,{'form:mobile-check:type':'holiday','form:mobile-check:title':'Mobile trip','form:mobile-check:pinned':'yes'});localStorage.setItem(key,JSON.stringify(data));});
 await page.reload();await page.locator('[data-action="open"]').click();
 await page.locator('.mobile-view-switch [data-mobile-view="day"]').click();
 await page.getByLabel('Priority 1',{exact:true}).fill('Keep my writing');
 await page.getByLabel('Priority 1',{exact:true}).blur();
 const geometry=await page.evaluate(()=>{const nav=document.querySelector('.section-tabs'),today=document.querySelector('.bookmark-today'),months=document.querySelector('.month-tabs');return{width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,nav:getComputedStyle(nav).position,scrollable:nav.scrollWidth>nav.clientWidth,today:getComputedStyle(today).position,months:getComputedStyle(months).position};});
 assert.deepEqual(geometry,{width:390,overflow:false,nav:'fixed',scrollable:true,today:'fixed',months:'fixed'});
 await page.locator('.mobile-pinned-tab').click();await page.getByRole('heading',{name:'Mobile trip',exact:true}).waitFor();
 await page.locator('.month-tabs [data-month="0"]').click();await page.locator('.section-calendar.view-month').waitFor();
 for(const view of ['year','week','day']){await page.locator(`[data-mobile-view="${view}"]`).click();await page.locator(`.section-calendar.view-${view}`).waitFor();}
 await page.getByRole('button',{name:'Go to today',exact:true}).click();
 await page.getByRole('button',{name:'Search planner',exact:true}).click();await page.getByLabel('Search your notebook').fill('Keep my writing');await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 assert.equal(await page.locator('#modal [data-action="personalize"]').count(),0);
 await page.getByRole('button',{name:'How to Use',exact:true}).click();
 await page.getByRole('heading',{name:'How to Use',exact:true}).waitFor();
 await page.getByRole('button',{name:'Close',exact:true}).click();
 assert.equal(await page.locator('[data-action="fullscreen"]').count(),0);
 await page.getByRole('button',{name:'Close notebook and show cover',exact:true}).click();await page.locator('[data-action="open"]').waitFor();
 assert.equal(await page.locator('[data-action="personalize"]').count(),1);
 await page.locator('[data-action="gallery"]').first().click();
 await page.locator('[data-cover="16"]').click();
 await page.reload();await page.locator('.cover-book[data-cover="16"]').waitFor();
 await page.locator('[data-action="open"]').click();
 await page.reload();await page.locator('[data-action="open"]').click();await page.locator('[data-mobile-view="day"]').click();
 assert.equal(await page.getByLabel('Priority 1',{exact:true}).inputValue(),'Keep my writing');
 await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/classic-clean-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('390px mobile layout, navigation, pinned form, search/settings, cover and writing persistence passed');
}finally{await browser.close();}
