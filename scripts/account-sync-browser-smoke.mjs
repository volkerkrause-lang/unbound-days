// Synthetic browser regression coverage. Every Supabase request is intercepted;
// requests to any other external service are blocked before reaching the network.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

const origin=process.env.UNBOUND_TEST_URL||'http://127.0.0.1:4173/';
const userId='00000000-0000-4000-8000-000000000042';
const storageKey=`unbound-days-v1-account-${userId}`;
const sessionKey='sb-msgitgnzgfrsaxgklohy-auth-token';
const user={id:userId,email:'synthetic-account@example.test',app_metadata:{provider:'email',providers:['email']},user_metadata:{},aud:'authenticated',created_at:'2026-01-01T00:00:00Z'};
const session={access_token:'synthetic.access.token',refresh_token:'synthetic-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user};
const blank=()=>({version:1,events:[],tasks:[],notes:[],habits:[],entries:{},ink:{},trash:[],bookmarks:[],settings:{favorites:[],selectedCalendars:[],ink:'#313a41'}});
const writing='Synthetic writing must survive failed sync';
const seed=(entry=writing,base=null)=>({...blank(),tasks:[{id:'synthetic-task',title:writing,date:'2026-10-28',done:false}],entries:{'synthetic-note':entry},...(base?{_cloud:{revision:2,base}}:{})});
const chromiumArgs=process.env.CHROMIUM_EXECUTABLE_PATH?['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--disable-gpu-sandbox','--in-process-gpu']:[];
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:chromiumArgs});
const remoteRows=data=>[{data,revision:2}];
const waitForServer=async()=>{for(let i=0;i<40;i++){try{const r=await fetch(origin);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,250));}throw Error(`Preview server did not become ready at ${origin}`);};

async function scenario({name,initialState,read,holdFirstRead=false,injectUnknown=false,run}){
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
 const page=await context.newPage(),errors=[],blockedExternal=[];let reads=0,rpcs=0,releaseFirst;
 const firstGate=new Promise(resolve=>releaseFirst=resolve);
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(({sessionKey,session,storageKey,state})=>{localStorage.setItem(sessionKey,JSON.stringify(session));localStorage.setItem(storageKey,JSON.stringify(state));}, {sessionKey,session,storageKey,state:initialState});
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.origin===new URL(origin).origin){
   if(injectUnknown&&u.pathname.endsWith('/account-sync.js')){
    const upstream=await route.fetch(),source=await upstream.text(),needle="busy=true;status('Checking cloud…');";
    assert.ok(source.includes(needle),'Test status injection point must match the real sync module');
    return route.fulfill({response:upstream,body:source.replace(needle,"busy=true;status('Future unrecognised sync state');")});
   }
   return route.continue();
  }
  if(u.hostname!=='msgitgnzgfrsaxgklohy.supabase.co'){blockedExternal.push(u.origin);return route.abort();}
  if(u.pathname==='/auth/v1/user')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(user)});
  if(u.pathname==='/rest/v1/profiles')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({role:'user'})});
  if(u.pathname==='/rest/v1/notebooks'){
   reads++;
   if(holdFirstRead&&reads===1)await firstGate;
   return route.fulfill(await read({reads}));
  }
  if(u.pathname==='/rest/v1/rpc/save_notebook'){
   rpcs++;
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({revision:3})});
  }
  blockedExternal.push(u.origin+u.pathname);return route.abort();
 });
 try{
  await page.goto(origin,{waitUntil:'commit'});
  await page.locator('#account-open').waitFor();
  await page.locator('#account-open').click({force:true});
  try{await page.locator('#account-sync-state').waitFor({timeout:8000});}
  catch(e){
   const diagnostic=await page.evaluate(()=>({accountButton:document.querySelector('#account-open')?.textContent,modalText:document.querySelector('#modal')?.innerText?.slice(0,1200),statusPresent:!!document.querySelector('#account-sync-state'),sessionKeys:Object.keys(localStorage).filter(k=>k.includes('auth-token'))}));
   console.error('Account dialog failed to initialise:',JSON.stringify({scenario:name,diagnostic,pageErrors:errors,blockedExternal},null,2));
   await mkdir('test-results',{recursive:true});
   await page.screenshot({path:'test-results/account-dialog-failure.png',fullPage:true});
   throw e;
  }
  await run({page,context,errors,blockedExternal,releaseFirst,counts:()=>({reads,rpcs}),name});
  assert.deepEqual(errors,[],`${name}: no browser runtime errors`);
  assert.deepEqual(blockedExternal,[],`${name}: no request escaped the synthetic/local origins`);
 }finally{await context.close();}
}

await waitForServer();
try{
 await scenario({name:'retry and pending',initialState:seed(),holdFirstRead:true,read:async({reads})=>reads===2?{status:500,contentType:'application/json',body:'{"message":"synthetic offline"}'}:reads===3?{status:500,contentType:'application/json',body:'{"message":"synthetic retry offline"}'}:{status:200,contentType:'application/json',body:'[]'},run:async({page,releaseFirst,counts})=>{
  const status=page.locator('#account-sync-state');
  assert.match(await status.innerText(),/Checking cloud/);
  assert.doesNotMatch(await status.innerText(),/Everything is up to date/);
  releaseFirst();
  await page.getByRole('button',{name:'Try Again'}).waitFor();
  assert.match(await status.innerText(),/Some changes need attention/);
  const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
  assert.equal(stored.tasks[0].title,writing);assert.equal(stored.entries['synthetic-note'],writing);
  await page.getByRole('button',{name:'Try Again'}).click();
  await page.getByRole('button',{name:'Try Again'}).waitFor();
  assert.equal(counts().reads,2,'first rerendered retry performs exactly one request');
  assert.match(await status.innerText(),/Some changes need attention/);
  const stillStored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);assert.equal(stillStored.entries['synthetic-note'],writing);
  await page.getByRole('button',{name:'Try Again'}).click();
  await page.getByText('Everything is up to date',{exact:false}).waitFor();
  assert.equal(counts().reads,3);assert.equal(counts().rpcs,1);
  assert.match(await status.innerText(),/Everything is up to date/);
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);assert.equal(saved.entries['synthetic-note'],writing);
  console.log('Account browser: checking, repeated failed retry, preserved local writing, successful retry passed');
 }});

 const base=blank();base.entries={'synthetic-note':'base writing'};
 const local=seed(writing,base),remote=blank();remote.entries={'synthetic-note':'remote writing'};
 await scenario({name:'explicit conflict review',initialState:local,read:async()=>({status:200,contentType:'application/json',body:JSON.stringify(remoteRows(remote))}),run:async({page,counts})=>{
  const status=page.locator('#account-sync-state');
  await page.getByRole('button',{name:'Review Changes'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Review Changes'}).count(),1,'Conflict review control must appear exactly once');
  assert.match(await status.innerText(),/Some changes need attention/);assert.equal(counts().rpcs,0);
  let stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);assert.equal(stored.entries['synthetic-note'],writing);
  await page.getByRole('button',{name:'Review Changes'}).click();
  await page.locator('#account-review').waitFor();
  assert.match(await page.locator('#account-review').innerText(),/Synthetic writing must survive failed sync/);
  stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);assert.equal(stored.entries['synthetic-note'],writing,'Writing remains unchanged until a choice is submitted');
  await page.locator('input[name="c0"][value="local"]').check();
  await page.getByRole('button',{name:'Apply choices'}).click();
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).entries['synthetic-note']==='Synthetic writing must survive failed sync',storageKey);
  assert.equal(counts().rpcs,1,'explicit local choice is saved through the mocked cloud endpoint');
  console.log('Account browser: conflict review preserves writing until an explicit choice, then keeps chosen writing');
 }});

 await scenario({name:'new account state',initialState:blank(),read:async()=>({status:200,contentType:'application/json',body:'[]'}),run:async({page})=>{
  const status=page.locator('#account-sync-state');await page.getByText('Cloud notebook not created yet').waitFor();
  assert.doesNotMatch(await status.innerText(),/Everything is up to date/);
  console.log('Account browser: new account does not claim a confirmed save');
 }});

 await scenario({name:'unknown status fallback',initialState:seed(),holdFirstRead:true,injectUnknown:true,read:async()=>({status:200,contentType:'application/json',body:'[]'}),run:async({page,releaseFirst})=>{
  const status=page.locator('#account-sync-state');await page.getByText('Cloud sync not confirmed').waitFor();
  assert.doesNotMatch(await status.innerText(),/Everything is up to date/);
  releaseFirst();console.log('Account browser: injected unrecognised status remains unconfirmed (status-boundary fault injection)');
 }});

 // Inspect the actual account dialog at the four requested viewport sizes.
 const responsiveContext=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'}),responsive=await responsiveContext.newPage(),responsiveErrors=[];
 responsive.on('pageerror',e=>responsiveErrors.push(e.message));
 await responsive.addInitScript(({sessionKey,session,storageKey,state})=>{localStorage.setItem(sessionKey,JSON.stringify(session));localStorage.setItem(storageKey,JSON.stringify(state));},{sessionKey,session,storageKey,state:seed()});
 await responsive.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin===new URL(origin).origin)return route.continue();if(u.hostname!=='msgitgnzgfrsaxgklohy.supabase.co')return route.abort();if(u.pathname==='/auth/v1/user')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(user)});if(u.pathname==='/rest/v1/profiles')return route.fulfill({status:200,contentType:'application/json',body:'{"role":"user"}'});if(u.pathname==='/rest/v1/notebooks')return route.fulfill({status:200,contentType:'application/json',body:'[]'});if(u.pathname==='/rest/v1/rpc/save_notebook')return route.fulfill({status:200,contentType:'application/json',body:'{"revision":3}'});return route.abort();});
 await responsive.goto(origin,{waitUntil:'domcontentloaded'});await responsive.locator('#account-open').click();await responsive.locator('#account-sync-state').waitFor();
 for(const [name,width,height] of [['desktop',1440,900],['iPad landscape',1180,820],['iPad portrait',820,1180],['mobile',390,844]]){
  await responsive.setViewportSize({width,height});const layout=await responsive.evaluate(()=>{const d=document.querySelector('#modal'),s=document.querySelector('#account-sync-state');return {width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,dialogOverflow:getComputedStyle(d).overflowY,dialogClient:d.clientHeight,dialogScroll:d.scrollHeight,statusVisible:!!s&&s.getBoundingClientRect().width>0,exportVisible:!!document.querySelector('#account-export')?.getBoundingClientRect().width};});
  assert.ok(layout.documentWidth<=layout.width,`${name}: no horizontal page overflow`);assert.ok(layout.statusVisible&&layout.exportVisible,`${name}: status and controls are visible`);
  if(name==='mobile')assert.equal(layout.dialogOverflow,'auto','mobile account dialog must allow scrolling');
  await mkdir('test-results',{recursive:true});await responsive.screenshot({path:`test-results/account-sync-${name.replaceAll(' ','-')}.png`,fullPage:true});
  console.log(`Account responsive ${name}: ${JSON.stringify(layout)}`);
 }
 assert.deepEqual(responsiveErrors,[],'Responsive account views have no runtime errors');await responsiveContext.close();
 console.log('Synthetic account browser suite passed; all external service calls were mocked or blocked.');
}finally{await browser.close();}
