import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const policy=fs.readFileSync(new URL('../_headers',import.meta.url),'utf8').match(/Content-Security-Policy: (.*)/)[1];
for(const [name,width,height] of [['desktop',1366,1024],['ipad',1180,820],['mobile',390,844]]){
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:process.env.CHROMIUM_EXECUTABLE_PATH?['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--in-process-gpu']:[]});
 try{
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://localhost:4173/',async route=>{const response=await route.fetch();await route.fulfill({response,headers:{...response.headers(),'content-security-policy':policy,'permissions-policy':'microphone=(self), camera=(), geolocation=()'}});});
  await page.addInitScript(()=>{
   // Synthetic microphone: native MediaRecorder and audio playback remain real.
   navigator.mediaDevices.getUserMedia=async()=>{
    if(!window.permissionRefused){window.permissionRefused=true;throw new DOMException('Denied','NotAllowedError');}
    const ctx=new AudioContext(),osc=ctx.createOscillator(),dest=ctx.createMediaStreamDestination();osc.connect(dest);osc.start();window.testAudioContext=ctx;window.testAudioStream=dest.stream;return dest.stream;
   };
   localStorage.setItem('unbound-days-v1-backup-onboarding','deferred');
  });
  await page.goto('http://localhost:4173/');await page.locator('[data-action="open"]').click();await page.locator('[data-section="goals"]').first().click();await page.locator('[data-planner-choice="custom"]').click();await page.locator('[data-custom-new]').click();await page.locator('[data-custom-add="voice"]').click();
  await page.locator('[data-custom-record]').click();await page.getByText(/Microphone access was blocked/).waitFor();assert.equal(await page.locator('[data-custom-record]').isEnabled(),true);
  await page.locator('[data-custom-record]').click();await page.getByText(/Voice memo · Recording/).waitFor();
  // Re-rendering the sheet must keep Stop and the same capture session.
  await page.locator('[data-custom-add="note"]').click();assert.equal(await page.locator('[data-custom-record]').textContent(),'Stop recording');
  await page.waitForFunction(()=>window.testAudioContext.currentTime>0.6);
  await page.locator('[data-custom-record]').click();const audio=page.locator('.custom-voice audio');await audio.waitFor();
  await page.waitForFunction(()=>document.querySelector('.custom-voice audio')?.readyState>=2);
  assert.equal(await page.evaluate(()=>window.testAudioStream.getTracks().every(t=>t.readyState==='ended')),true);
  await audio.evaluate(a=>a.play());await page.waitForFunction(()=>document.querySelector('.custom-voice audio')?.currentTime>0.1);await audio.evaluate(a=>a.pause());
  const old=await audio.getAttribute('src');assert.match(old,/^data:audio\//);
  // Copy has a recognisable SVG and visible label; it still copies memo content.
  const copy=page.locator('.custom-component').filter({has:page.locator('[data-custom-record]')}).locator('[data-custom-duplicate]');assert.equal(await copy.locator('svg').count(),1);assert.match(await copy.textContent(),/Copy/);await copy.click();assert.equal(await page.locator('.custom-voice audio').count(),2);
  const overflow=await page.locator('.custom-component').evaluateAll(nodes=>nodes.some(n=>n.scrollWidth>n.clientWidth+2));assert.equal(overflow,false);
  await page.reload();await page.locator('[data-action="open"]').click();await page.locator('[data-section="goals"]').first().click();await page.locator('[data-planner-choice="custom"]').click();await page.locator('[data-planner-open]').first().click();
  assert.equal(await page.locator('.custom-voice audio').first().getAttribute('src'),old);assert.deepEqual(errors,[]);
  console.log(name+': permission retry, recording through redraw, native playback with CSP, copy and reload passed');
 }finally{await browser.close();}
}
