import test from 'node:test';
import assert from 'node:assert/strict';
import {createMovingPlanner} from '../moving-planner.js';

const field=(dataset,value)=>({closest:()=>true,matches:selector=>selector==='[data-move-field]'&&!!dataset.moveField,dataset,value});
function setup(entries={}){
  const handlers={};
  globalThis.document={addEventListener:(name,fn)=>{handlers[name]=fn;},removeEventListener:()=>{}};
  let saves=0,renders=0;
  const planner=createMovingPlanner({entries:()=>entries,form:()=> 'move-one',save:()=>saves++,render:()=>renders++,toast:()=>{}});
  return {entries,planner,handlers,saves:()=>saves,renders:()=>renders};
}

test('moving plan is account-entry backed and generated dates follow a changed moving date',()=>{
  const c=setup();
  assert.match(c.planner.render(),/Tell us about your move/);
  c.planner.changed(field({moveField:'setup.moveDate'},'2027-06-20'));
  c.planner.handle('generate');
  let data=JSON.parse(c.entries['form:move-one:moving-planner:v2']);
  assert.equal(data.tasks.length,26);
  assert.equal(data.tasks.find(t=>t.templateId==='budget').dueDate,'2027-03-28');
  assert.equal(data.tasks.find(t=>t.templateId==='keys').dueDate,'2027-06-20');
  c.planner.changed(field({moveField:'setup.moveDate'},'2027-07-01'));
  data=JSON.parse(c.entries['form:move-one:moving-planner:v2']);
  assert.equal(data.tasks.find(t=>t.templateId==='budget').dueDate,'2027-04-08');
  assert.equal(data.tasks.find(t=>t.templateId==='keys').dueDate,'2027-07-01');
  assert.ok(c.saves()>=3);
});

test('manually adjusted timeline dates survive a later move-date change',()=>{
  const c=setup();
  c.planner.render();
  c.planner.changed(field({moveField:'setup.moveDate'},'2027-06-20'));
  c.planner.handle('generate');
  const dateField=field({moveTaskDate:'plan-budget'},'2027-04-01');
  c.planner.changed(dateField);
  c.planner.changed(field({moveField:'setup.moveDate'},'2027-07-01'));
  const data=JSON.parse(c.entries['form:move-one:moving-planner:v2']);
  assert.equal(data.tasks.find(t=>t.templateId==='budget').dueDate,'2027-04-01');
  assert.equal(data.tasks.find(t=>t.templateId==='quotes').dueDate,'2027-04-15');
});

test('budget figures calculate deterministically and checklists persist',()=>{
  const c=setup();
  c.planner.render();
  c.planner.handle('section','more');
  let data=JSON.parse(c.entries['form:move-one:moving-planner:v2']);
  const budget=data.budget[0];
  c.planner.changed(field({moveBudget:budget.id,moveProp:'estimate'},'650'));
  c.planner.changed(field({moveBudget:budget.id,moveProp:'actual'},'625'));
  c.planner.changed(field({moveBudget:budget.id,moveProp:'paid'},'300'));
  assert.match(c.planner.render(),/Outstanding £325\.00/);
  data=JSON.parse(c.entries['form:move-one:moving-planner:v2']);
  assert.equal(data.budget[0].estimate,'650');
  c.planner.toggle('kit','kit-0');
  data=JSON.parse(c.entries['form:move-one:moving-planner:v2']);
  assert.equal(data.firstNight[0].done,true);
});

test('timeline keeps unscheduled and out-of-window tasks visible and preserves their order',()=>{
  const c=setup();c.planner.render();
  c.planner.changed(field({moveField:'setup.moveDate'},'2027-06-20'));
  c.planner.handle('generate');
  const key='form:move-one:moving-planner:v2';
  let data=JSON.parse(c.entries[key]);
  data.tasks.push({id:'custom-later',title:'Collect storage keys',dueDate:'2027-09-01',priority:'normal',done:false,generated:false});
  data.tasks.push({id:'custom-undated',title:'Ask neighbours',dueDate:'',priority:'normal',done:false,generated:false});
  c.entries[key]=JSON.stringify(data);
  const reopened=setup(c.entries);reopened.planner.handle('section','timeline');
  const html=reopened.planner.render();
  assert.match(html,/Later/);assert.match(html,/Collect storage keys/);
  assert.match(html,/No date yet/);assert.match(html,/Ask neighbours/);
  reopened.planner.handle('task-down','plan-budget');
  data=JSON.parse(c.entries[key]);
  const order=data.tasks.map(t=>t.id);
  reopened.planner.handle('generate');
  assert.deepEqual(JSON.parse(c.entries[key]).tasks.map(t=>t.id),order);
});

test('moving-day times are user-entered and persist, never fabricated',()=>{
  const c=setup();c.planner.render();c.planner.handle('section','moving-day');
  assert.match(c.planner.render(),/data-move-day-time="day-0" value=""/);
  c.planner.changed(field({moveDayTime:'day-0'},'09:30'));
  assert.match(c.planner.render(),/data-move-day-time="day-0" value="09:30"/);
});

test('move details tailor generated tasks while preserving edited titles',()=>{
  const c=setup();c.planner.render();
  c.planner.changed(field({moveField:'setup.removals'},'self'));
  c.planner.changed(field({moveField:'setup.moveType'},'Renting'));
  c.planner.handle('generate');
  let data=JSON.parse(c.entries['form:move-one:moving-planner:v2']);
  assert.match(data.tasks.find(t=>t.templateId==='quotes').title,/van and helpers/);
  assert.match(data.tasks.find(t=>t.templateId==='notice').title,/tenancy notice/);
  c.planner.changed(field({moveTaskTitle:'plan-quotes'},'Book my brother’s van'));
  c.planner.changed(field({moveField:'setup.removals'},'professional'));
  c.planner.handle('generate');
  data=JSON.parse(c.entries['form:move-one:moving-planner:v2']);
  assert.equal(data.tasks.find(t=>t.templateId==='quotes').title,'Book my brother’s van');
});

test('renaming rooms retains origin and destination box links',()=>{
  const c=setup();c.planner.render();c.planner.handle('generate');c.planner.handle('add-box');
  let data=JSON.parse(c.entries['form:move-one:moving-planner:v2']);
  const room=data.rooms[0];
  c.planner.changed(field({moveRoom:room.id,moveProp:'name'},'Lounge'));
  c.planner.changed(field({moveRoom:room.id,moveProp:'destination'},'Front room'));
  data=JSON.parse(c.entries['form:move-one:moving-planner:v2']);
  assert.equal(data.boxes[0].originRoom,'Lounge');
  assert.equal(data.boxes[0].room,'Front room');
});
