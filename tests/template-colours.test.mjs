import test from 'node:test';
import assert from 'node:assert/strict';
import {records,putRecord,moveFolder,folderDescendants,templateFromDefinition} from '../form-templates.js';
import {blankDefinition,addComponent,createPlanningBuilder} from '../planning-builder.js';
import {EVENT_PALETTE,normaliseTitle,eventColour,setEventColour} from '../event-colours.js';
import {notebookContent,mergeNotebook} from '../sync.js';

test('templates snapshot layout only and two uses are independent from source and each other',()=>{
 const entries={},ink={};let n=0,current='';
 const builder=createPlanningBuilder({entries:()=>entries,ink:()=>ink,id:()=>`form-${++n}`,save(){},open:key=>current=key,current:()=>current});
 const source=builder.create('Source',addComponent(blankDefinition(),'note','note-1'));
 entries[`form:${source}:custom:note-1:value`]='Private filled answer';
 const saved=templateFromDefinition('t','Reusable','A description',builder.get(source));putRecord(entries,saved);
 const a=builder.create(saved.name,saved.definition),b=builder.create(saved.name,saved.definition);
 entries[`form:${a}:custom:note-1:value`]='Independent answer';
 const def=builder.get(a);def.components[0].title='Changed heading';builder.set(a,def);
 assert.equal(entries[`form:${b}:custom:note-1:value`],undefined);
 assert.equal(builder.get(b).components[0].title,'Notes');
 assert.equal(builder.get(source).components[0].title,'Notes');
 assert.equal(records(JSON.parse(JSON.stringify(entries)))[0].definition.components[0].title,'Notes');
 assert.ok(!JSON.stringify(saved).includes('Private filled answer'));
});
test('folders reject cycles and retain records through reload and account merge',()=>{
 const entries={};putRecord(entries,{id:'a',name:'Work',parent:''},'folder');putRecord(entries,{id:'b',name:'Rounds',parent:'a'},'folder');
 assert.throws(()=>moveFolder(entries,'a','b'),/inside itself/);
 assert.deepEqual([...folderDescendants(entries,'a')],['a','b']);
 const base=notebookContent({entries:{}}),local=notebookContent({entries}),remote=structuredClone(base);
 remote.entries['event-title-colour:early']=EVENT_PALETTE[2];
 const merged=mergeNotebook(base,local,remote);assert.equal(merged.conflicts.length,0);
 assert.equal(records(merged.data.entries,'folder').length,2);
 assert.equal(eventColour('Early',merged.data.entries),EVENT_PALETTE[2]);
});
test('title colours are stable across case, whitespace, reload, sync and input order',()=>{
 assert.equal(normaliseTitle('  LONG   Day '),'long day');
 const entries={};assert.equal(new Set(['Early','Late','Long Day','Appointment','CES Las Vegas'].map(t=>eventColour(t,entries))).size,5);
 assert.equal(eventColour('early'),eventColour(' EARLY '));
 assert.equal(eventColour('LONG   DAY'),eventColour('Long Day'));
 setEventColour(entries,' EARLY ',EVENT_PALETTE[5]);
 assert.equal(eventColour('early',JSON.parse(JSON.stringify(entries))),EVENT_PALETTE[5]);
 assert.equal(eventColour('Arbitrary event'),eventColour('Arbitrary event',{}));
 assert.throws(()=>setEventColour(entries,'Early','#000000'),/readable/);
 setEventColour(entries,'Early','');assert.equal(eventColour('Early',entries),EVENT_PALETTE[0]);
});
test('all newly added components use the same full-width default',()=>{
 let definition=blankDefinition();for(const type of ['note','checklist','drawing','voice','rating','stopwatch','deadline','location'])definition=addComponent(definition,type,type);
 assert.ok(definition.components.every(c=>c.size==='wide'));
});

test('confirmed folder deletion preserves templates and existing sheets',async()=>{
 const {createTemplateLibrary}=await import('../form-templates.js');
 const entries={'form:original:custom:note:value':'Keep this answer'};
 putRecord(entries,{id:'a',name:'Work',parent:''},'folder');putRecord(entries,{id:'b',name:'Rounds',parent:'a'},'folder');
 putRecord(entries,templateFromDefinition('t','Review','',blankDefinition(),'b'));
 const library=createTemplateLibrary({entries:()=>entries,save(){},render(){},id:()=>'',esc:String,openModal(){},closeModal(){},builder:{},current:()=>'',toast(){}});
 const form={id:'template-library-form',dataset:{operation:'folder-delete',id:'a'}};
 assert.throws(()=>library.submit(form,{}),/Confirm deletion/);
 assert.equal(records(entries,'folder').length,2);
 library.submit(form,{confirmed:'on'});
 assert.equal(records(entries,'folder').length,0);
 assert.equal(records(entries)[0].parent,'');
 assert.equal(entries['form:original:custom:note:value'],'Keep this answer');
});
