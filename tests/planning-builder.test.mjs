import test from 'node:test';
import assert from 'node:assert/strict';
import {blankDefinition,parseDefinition,serialiseDefinition,addComponent,moveComponent,removeComponent,duplicateComponent,definitionFromTemplate,deadlineStatus} from '../planning-builder.js';

test('custom form definitions remain string-backed and preserve component order',()=>{
 let form=blankDefinition('Ward round');
 form=addComponent(form,'note','a');
 form=addComponent(form,'checklist','b');
 form=moveComponent(form,'b',-1);
 assert.deepEqual(form.components.map(c=>c.type),['checklist','note']);
 const restored=parseDefinition(serialiseDefinition(form));
 assert.equal(restored.title,'Ward round');
 assert.deepEqual(restored.components.map(c=>c.id),['b','a']);
});

test('duplicate and reversible removal do not mutate the source definition',()=>{
 const source=addComponent(blankDefinition(),'rating','rating-a');
 const copy=duplicateComponent(source,'rating-a','rating-b');
 assert.equal(source.components.length,1);
 assert.equal(copy.components.length,2);
 const removed=removeComponent(copy,'rating-a');
 assert.equal(removed.removed.type,'rating');
 assert.equal(removed.index,0);
 assert.deepEqual(removed.definition.components.map(c=>c.id),['rating-b']);
});

test('ready-made forms convert to editable notebook components',()=>{
 const template={id:'trip',title:'Plan a trip',columns:['Day','Place']};
 const flow={contextTitle:'Trip outline',tableTitle:'Itinerary',columns:['Day','Place']};
 const result=definitionFromTemplate(template,flow,'My trip');
 assert.equal(result.sourceTemplate,'trip');
 assert.deepEqual(result.components.map(c=>c.type),['note','checklist','deadline','rating']);
 assert.equal(result.components[1].items[1].label,'Place');
});

test('deadline badges distinguish remaining, due and overdue days',()=>{
 const today=new Date(2026,9,19);
 assert.equal(deadlineStatus('2026-10-21',today),'2 days remaining');
 assert.equal(deadlineStatus('2026-10-19',today),'Due today');
 assert.equal(deadlineStatus('2026-10-18',today),'1 day overdue');
});
