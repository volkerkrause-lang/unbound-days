import test from 'node:test';
import assert from 'node:assert/strict';
import {createDictation} from '../dictation.js';
class Element extends EventTarget{
 constructor(){super();this.value='';this.isConnected=true;this.classList={add(){},remove(){}};this.style={};this.children=new Map();}
 setAttribute(){}setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}focus(){}remove(){}contains(){return false;}
 querySelector(key){if(!this.children.has(key))this.children.set(key,new Element());return this.children.get(key);}
}
test('dictation inserts finals once, honours changed slots, keeps deliberate repetitions and rejects stale owners',()=>{
 globalThis.document=new Element();document.body={append(){}};document.createElement=()=>new Element();globalThis.window={};globalThis.innerHeight=800;
 const field=new Element(),button=new Element();let rec,user='one',writes=0;field.addEventListener('input',()=>writes++);
 class Recognition{constructor(){rec=this;}start(){}stop(){this.onend?.();}}
 const options={toast(){},identity:()=>user,Recognition:()=>Recognition};let api=createDictation(options);
 const emit=(slots,resultIndex=0)=>rec.onresult?.({resultIndex,results:slots.map(([transcript,isFinal])=>Object.assign([{transcript}],{isFinal}))});
 api.start(field,button);
 emit([['this',false]]);emit([['this is',false]]);emit([['this is testing',false]]);assert.equal(field.value,'');
 emit([['this is testing',true]]);assert.equal(field.value,'This is testing');const count=writes;
 emit([['this is testing',true]]);assert.equal(writes,count);
 emit([['this is testing',true],['again',false]],1);assert.equal(field.value,'This is testing');
 emit([['this is testing',true],['again',true]],1);emit([['this is testing',true],['again',true],['again',true]],2);assert.equal(field.value,'This is testing again again');
 const stale=rec.onresult;api.stop();stale({results:[],resultIndex:0});assert.equal(field.value,'This is testing again again');
 api.start(field,button);const previous=rec;api=createDictation(options);assert.equal(previous.onresult,null);
 field.value='Manual';field.setSelectionRange(6,6);api.start(field,button);user='two';emit([['wrong account',true]]);assert.equal(field.value,'Manual');api.destroy();
});
