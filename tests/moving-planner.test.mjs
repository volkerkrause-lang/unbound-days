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
