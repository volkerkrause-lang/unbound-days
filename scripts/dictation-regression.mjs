import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 for(const [name,width,height] of [['desktop',1366,1024],['ipad-landscape',1180,820],['ipad-portrait',820,1180],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height}});
  await page.goto(process.env.UNBOUND_TEST_URL||'http://localhost:4173');
  const result=await page.evaluate(async()=>{
   const {createDictation}=await import('/dictation.js?v=0.4.23');
   document.body.innerHTML='<textarea></textarea><button>Dictate</button>';
   const field=document.querySelector('textarea'),button=document.querySelector('button');let writes=0;
   field.addEventListener('input',()=>writes++);
   class Recognition{constructor(){window.rec=this;}start(){this.onstart?.();}stop(){this.onend?.();}abort(){this.onend?.();}}
   const messages=[],api=createDictation({toast:m=>messages.push(m),identity:()=>1,Recognition:()=>Recognition});
   const emit=(text,final=true)=>window.rec.onresult?.({resultIndex:0,results:[Object.assign([{transcript:text}],{isFinal:final})]});
   const wait=()=>new Promise(resolve=>setTimeout(resolve,400));
   api.start(field,button);if(!button.classList.contains('recording')||button.getAttribute('aria-pressed')!=='true')throw Error('First tap did not show active recording');
   emit('keep this',false);if(field.value!=='Keep this')throw Error('Live interim transcript was not visible');emit('keep this safe');if(field.value!=='Keep this safe')throw Error('Final transcript did not replace the interim text');const count=writes;emit('keep this safe');if(writes!==count)throw Error('Final transcript was duplicated');
   const ended=window.rec;ended.onend();if(!button.classList.contains('reconnecting'))throw Error('Unexpected end did not show reconnecting state');await wait();if(window.rec===ended||!button.classList.contains('recording'))throw Error('Unexpected end did not restart');
   const stopped=window.rec;api.start(field,button);if(button.classList.contains('recording')||button.classList.contains('reconnecting')||button.getAttribute('aria-pressed')!=='false')throw Error('Second tap did not restore inactive state');await wait();if(window.rec!==stopped)throw Error('Explicit Stop restarted recognition');
   api.start(field,button);emit('again again');window.rec.onend();await wait();emit('and again');window.rec.onend();await wait();if(field.value!=='Keep this safe again again and again')throw Error(`Text was not appended once: ${field.value}`);api.start(field,button);
   field.value='Bring blue folder';field.setSelectionRange(6,10);api.start(field,button);emit('green');if(field.value!=='Bring green folder')throw Error('Selection replacement failed');api.start(field,button);document.querySelector('[data-dictation="undo"]').click();if(field.value!=='Bring blue folder')throw Error('Undo failed');
   const unavailable=createDictation({toast:m=>messages.push(m),identity:()=>1,Recognition:()=>undefined});unavailable.start(field,button);if(!messages.some(m=>m.includes('unavailable'))||button.getAttribute('aria-pressed')!=='false')throw Error('Unsupported API feedback/state failed');unavailable.destroy();api.destroy();return{passed:true,writes};
  });
  assert.equal(result.passed,true);console.log(name+': tap start/stop, unexpected end/restart, final-only insertion, duplicate guard, append, replacement/undo and unsupported feedback passed');await page.close();
 }
}finally{await browser.close();}
