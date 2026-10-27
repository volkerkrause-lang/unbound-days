import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 for(const [name,width,height] of [['desktop',1366,1024],['ipad-landscape',1180,820],['ipad-portrait',820,1180],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height}});
  await page.goto(process.env.UNBOUND_TEST_URL||'http://localhost:4173');
  const result=await page.evaluate(async()=>{
   const {createDictation}=await import('/dictation.js?v=0.4.19');
   document.body.innerHTML='<textarea></textarea><button>Dictate</button>';
   const field=document.querySelector('textarea'),button=document.querySelector('button');let user='one',writes=0;
   field.addEventListener('input',()=>writes++);
   class Recognition{constructor(){window.rec=this;}start(){}stop(){this.onend?.();}}
   const options={toast:()=>{},identity:()=>user,Recognition:()=>Recognition};
   let api=createDictation(options);
   const emit=(slots,index=0)=>window.rec.onresult?.({resultIndex:index,results:slots.map(([text,final])=>Object.assign([{transcript:text}],{isFinal:final}))});
   const check=(expected)=>{if(field.value!==expected)throw Error(JSON.stringify({expected,actual:field.value}));};
   api.start(field,button);
   emit([['this',false]]);emit([['this is',false]]);emit([['this is testing',false]]);check('');
   emit([['this is testing',true]]);check('This is testing');const count=writes;
   emit([['this is testing',true]]);if(writes!==count)throw Error('Repeated event wrote twice');
   if(window.rec.continuous!==false||window.rec.interimResults!==false)throw Error('Continuous recognition enabled');
   emit([['this',true],['this is',true],['this is testing',true]],2);check('This is testing');
   emit([['this is testing again again',true]],0);check('This is testing again again');
   emit([['so',true]],0);emit([['so is',true]],0);emit([['so is it possible to dictate',true]],0);check('So is it possible to dictate');
   emit([['so is it possible to dictate',true],['discard',false]],1);check('So is it possible to dictate');
   const stale=window.rec.onresult;api.stop();stale({resultIndex:0,results:[Object.assign([{transcript:'late'}],{isFinal:true})]});check('So is it possible to dictate');
   field.value='Bring blue folder';field.setSelectionRange(6,10);api.start(field,button);emit([['green',true]]);check('Bring green folder');api.stop();document.querySelector('[data-dictation="undo"]').click();check('Bring blue folder');
   api.start(field,button);const old=window.rec;api=createDictation(options);if(old.onresult!==null)throw Error('Old owner still listens');
   field.value='';field.setSelectionRange(0,0);api.start(field,button);emit([['hello',true]]);check('Hello');
   field.value='Manual';field.dispatchEvent(new Event('input',{bubbles:true}));emit([['overwrite',true]]);check('Manual');
   api.dismiss();api.start(field,button);user='two';emit([['wrong account',true]]);check('Manual');api.destroy();
   return {passed:true,writes};
  });
  assert.equal(result.passed,true);console.log(name+': interim/final/resultIndex, repeated events, intentional repetitions, removed interim, stale callbacks, selection/undo, owner cleanup, manual edits and account boundary passed');await page.close();
 }
}finally{await browser.close();}
