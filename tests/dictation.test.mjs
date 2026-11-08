import test from 'node:test';
import assert from 'node:assert/strict';
import {createDictation} from '../dictation.js';
class Element extends EventTarget{
 constructor(){super();this.value='';this.isConnected=true;this.classes=new Set();this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};this.style={};this.children=new Map();}
 setAttribute(){}setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}focus(){this.focusCount=(this.focusCount||0)+1;}remove(){this.isConnected=false;}contains(){return false;}
 querySelector(key){if(!this.children.has(key))this.children.set(key,new Element());return this.children.get(key);}
}
test('dictation restarts unexpected session endings, stops on second tap, and inserts each final once',async()=>{
 globalThis.document=new Element();document.body={append(){}};document.createElement=()=>new Element();globalThis.window={};globalThis.innerHeight=800;
 const field=new Element(),button=new Element();let rec,user='one',writes=0;field.addEventListener('input',()=>writes++);
 class Recognition{constructor(){rec=this;}start(){this.onstart?.();}stop(){this.onend?.();}abort(){this.onend?.();}}
 const options={toast(){},identity:()=>user,Recognition:()=>Recognition};const api=createDictation(options);
 const emit=(slots,resultIndex=0)=>rec.onresult?.({resultIndex,results:slots.map(([transcript,isFinal])=>Object.assign([{transcript}],{isFinal}))});
 api.start(field,button);assert.equal(rec.continuous,false);assert.equal(rec.interimResults,true);assert.ok(button.classes.has('recording'));
 emit([['Keep this',false]]);assert.equal(field.value,'Keep this','interim speech is shown progressively');emit([['Keep this safe',true]]);assert.equal(field.value,'Keep this safe');const count=writes;emit([['Keep this safe',true]]);assert.equal(writes,count);
 const ended=rec;ended.onend();assert.ok(button.classes.has('reconnecting'));assert.ok(!button.classes.has('recording'));
 await new Promise(resolve=>setTimeout(resolve,400));assert.notEqual(rec,ended);assert.ok(button.classes.has('recording'));assert.equal(field.value,'Keep this safe');
 const intentional=rec;api.start(field,button);assert.ok(!button.classes.has('recording'));assert.ok(!button.classes.has('reconnecting'));intentional.onend?.();await new Promise(resolve=>setTimeout(resolve,400));assert.equal(rec,intentional);assert.equal(field.value,'Keep this safe');
 // Growing final-result lists use the latest final slot, preserving repetitions.
 api.start(field,button);emit([['again',true],['again again',true]],1);assert.equal(field.value,'Keep this safe again again');api.stop();assert.ok(!button.classes.has('recording'));
 field.value='';field.setSelectionRange(0,0);api.start(field,button);emit([['so',true],['so is',true],['so is possible to dictate',true]],0);assert.equal(field.value,'So is possible to dictate');api.stop();
 field.value='I wonder if this works for Every single place';const every=field.value.indexOf('Every');field.setSelectionRange(every,every+5);api.start(field,button);emit([['Every',true]]);assert.equal(field.value,'I wonder if this works for every single place');api.stop();
 field.value='Done. every detail';field.setSelectionRange(6,11);api.start(field,button);emit([['every',true]]);assert.equal(field.value,'Done. Every detail');api.stop();
 field.value='Bring blue folder';field.setSelectionRange(6,10);api.start(field,button);emit([['NASA',true]]);assert.equal(field.value,'Bring NASA folder');api.stop();
 field.value='';field.setSelectionRange(0,0);api.start(field,button);emit([['so',true],['so it is possible to dictate',true]],1);assert.equal(field.value,'So it is possible to dictate');api.stop();
 field.value='So it is possible to dictate';field.setSelectionRange(field.value.length,field.value.length);api.start(field,button);emit([['a phrase recognised so far',false]]);api.stop();assert.equal(field.value,'So it is possible to dictate a phrase recognised so far','stopping preserves the latest interim transcript');
 api.start(field,button);const stale=rec.onresult;api.stop();stale?.({results:[],resultIndex:0});assert.equal(field.value,'So it is possible to dictate a phrase recognised so far');
 api.start(field,button);const previous=rec;const replacement=createDictation(options);assert.equal(previous.onresult,null);assert.equal(previous.onerror,null);assert.equal(previous.onend,null);
 field.value='Manual';field.setSelectionRange(6,6);replacement.start(field,button);user='two';rec.onresult?.({resultIndex:0,results:[Object.assign([{transcript:'wrong account'}],{isFinal:true})]});assert.equal(field.value,'Manual');replacement.destroy();
});

test('Quick Capture dictation can transcribe and restart without focusing its text field',async()=>{
 globalThis.document=new Element();document.body={append(){}};document.createElement=()=>new Element();globalThis.window={};globalThis.innerHeight=800;
 const field=new Element(),button=new Element();let rec;
 class Recognition{constructor(){rec=this;}start(){this.onstart?.();}stop(){this.onend?.();}abort(){this.onend?.();}}
 const states=[];
 const api=createDictation({toast(){},identity:()=> 'quick-capture',Recognition:()=>Recognition});
 api.start(field,button,{focusField:false,onStateChange:state=>states.push(state)});
 assert.equal(states.at(-1),'listening','the state machine exposes successful recognition start');
 assert.equal(field.focusCount||0,0,'starting dictation must not focus the textarea');
 rec.onresult?.({resultIndex:0,results:[Object.assign([{transcript:'Spoken words'}],{isFinal:true})]});
 assert.equal(field.value,'Spoken words','transcribed text remains visible in the field');
 assert.equal(field.focusCount||0,0,'transcription must not focus the textarea');
 const ended=rec;ended.onend();
 assert.equal(states.at(-1),'starting','unexpected session endings expose the automatic restart state');
 await new Promise(resolve=>setTimeout(resolve,400));
 assert.notEqual(rec,ended,'speech recognition can restart');
 assert.equal(field.focusCount||0,0,'recognition restarts without opening the keyboard');
 api.stop();assert.deepEqual(states.slice(-2),['stopping','idle'],'intentional stop transitions cleanly to idle');
 api.destroy();
});

test('Quick Capture microphone denial reports the error and releases recognition handlers',()=>{
 globalThis.document=new Element();document.body={append(){}};document.createElement=()=>new Element();globalThis.window={};globalThis.innerHeight=800;
 const field=new Element(),button=new Element();let rec,message='';
 class Recognition{constructor(){rec=this;}start(){this.onstart?.();}stop(){}abort(){this.aborted=true;}}
 const states=[];
 const api=createDictation({toast(value){message=value;},identity:()=> 'quick-capture',Recognition:()=>Recognition});
 api.start(field,button,{focusField:false,onStateChange:state=>states.push(state)});
 rec.onerror?.({error:'not-allowed'});
 assert.equal(states.at(-1),'error','permission denial ends in a visible error state');
 assert.match(message,/Allow microphone and speech recognition/);
 assert.equal(rec.aborted,true,'failed permission aborts the recognition session');
 assert.equal(rec.onresult,null);assert.equal(rec.onerror,null);assert.equal(rec.onend,null);
 assert.equal(field.focusCount||0,0,'permission errors do not open the keyboard');
 assert.equal(button.classes.has('recording'),false);
 api.destroy();
});
