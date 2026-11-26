import test from 'node:test';
import assert from 'node:assert/strict';
import {moneyToMinor,moneyFromMinor,monthTotals,csvForMonth,createBudgetPlanner} from '../budget-planner.js';

test('money conversion uses integer minor units and rounds by entered pence',()=>{
 assert.equal(moneyToMinor('22.80'),2280);
 assert.equal(moneyToMinor('1,234.56'),123456);
 assert.equal(moneyToMinor(''),0);
 assert.equal(moneyFromMinor(1003),'10.03');
});
test('starter handwritten categories reconcile from their original subtotals without duplication',()=>{
 const month={categories:[
  {kind:'income',items:[{planned:524000,actual:0}]},
  {kind:'expense',items:[{planned:307200,actual:0}]},
  {kind:'expense',items:[{planned:15100,actual:0}]},
  {kind:'expense',items:[{planned:75400,actual:0}]},
  {kind:'expense',items:[{planned:12700,actual:0}]},
  {kind:'expense',items:[{planned:13300,actual:0}]}
 ]};
 const result=monthTotals(month);
 assert.equal(result.remaining,100300);
 assert.equal(result.planned,423700);
});
test('transfers are excluded from cash expenditure while savings and debt are separately visible',()=>{
 const month={categories:[{kind:'income',items:[{planned:100000,actual:100000}]},{kind:'expense',items:[{planned:20000,actual:18000,flow:'cash'},{planned:5000,actual:5000,flow:'transfer'},{planned:10000,actual:10000,flow:'savings'},{planned:4000,actual:4000,flow:'debt'}]}]};
 const result=monthTotals(month);
 assert.equal(result.planned,24000);
 assert.equal(result.actual,22000);
 assert.equal(result.remaining,66000);
 assert.equal(result.actualCashflow,68000);
 assert.equal(result.savings,10000);
 assert.equal(result.debt,4000);
});
test('CSV output quotes values safely',()=>{
 const csv=csvForMonth({categories:[{name:'Home, bills',items:[{name:'Mum "support"',planned:17200,actual:0,dueDate:'',status:'planned',frequency:'Monthly',flow:'cash',notes:''}]}]});
 assert.match(csv,/"Home, bills","Mum ""support""",/);
});

test('September starter budget preserves written subtotals and calculates from individual lines',()=>{
 const bag={};let writes=0;
 const planner=createBudgetPlanner({entries:()=>bag,form:()=>'starter',save:()=>writes++,render:()=>{},esc:value=>String(value),toast:()=>{},schedule:()=>{}});
 planner.initialise();
 const data=JSON.parse(bag['budget:starter:data']),month=data.months[data.active];
 const totals=monthTotals(month);
 assert.equal(data.active,'2026-09');
 assert.equal(month.name,'September 2026 — My Budget');
 assert.equal(totals.income,524000);
 assert.equal(totals.planned,423880);
 assert.equal(totals.remaining,100120);
 assert.equal(month.sourceFigures.categorySubtotals['Utilities'],15100);
 assert.equal(month.sourceFigures.calculatedFromHandwrittenSubtotals,100300);
 assert.equal(month.sourceFigures.finalBalance,100200);
 assert.equal(writes,1);
 assert.match(planner.render(),/Manage Budget/);
 assert.match(planner.render(),/Budget Views/);
 assert.doesNotMatch(planner.render(),/Monthly Review|Subscriptions<|Check the handwritten figures|Month &amp; tools/);
});

test('savings reduce available money but are not counted as expenditure',()=>{
 const totals=monthTotals({categories:[{kind:'income',items:[{planned:200000,actual:200000}]},{kind:'expense',items:[{planned:50000,actual:40000,flow:'cash'},{planned:30000,actual:20000,flow:'savings'}]}]});
 assert.equal(totals.planned,50000);assert.equal(totals.savings,30000);assert.equal(totals.remaining,120000);assert.equal(totals.actualCashflow,140000);
});

test('new actual values remain blank until entered and CSV distinguishes missing from zero',()=>{
 const csv=csvForMonth({categories:[{name:'Income',kind:'income',items:[{name:'Salary',planned:100000,actual:null,status:'planned',frequency:'Monthly',flow:'cash'}]},{name:'Bills',kind:'expense',items:[{name:'Water',planned:5000,actual:0,status:'paid',frequency:'Monthly',flow:'cash'}]}]},'2026-11');
 assert.match(csv,/"2026-11","Income","Salary","1000\.00","",""/);assert.match(csv,/"Water","50\.00","0\.00","50\.00"/);
});

test('deleting an entry updates totals and Undo restores all saved entry fields',()=>{
 const original={version:1,active:'2026-11',months:{'2026-11':{name:'November 2026 Budget',categories:[{id:'bills',name:'Bills',kind:'expense',items:[{id:'rent',name:'Rent',planned:125000,actual:123000,dueDate:'2026-11-01',status:'paid',frequency:'Monthly',flow:'cash',notes:'standing order',fixed:true}]}]}},goals:[]};
 const bag={'budget:test:data':JSON.stringify(original)},planner=createBudgetPlanner({entries:()=>bag,form:()=>'test',save:()=>{},render:()=>{},toast:()=>{}});
 planner.handle({budgetAction:'remove',budgetItem:'rent'});
 assert.equal(monthTotals(JSON.parse(bag['budget:test:data']).months['2026-11']).planned,0);
 assert.match(planner.render(),/data-budget-action="undo-delete"/);
 planner.handle({budgetAction:'undo-delete'});
 assert.deepEqual(JSON.parse(bag['budget:test:data']).months['2026-11'].categories[0].items[0],original.months['2026-11'].categories[0].items[0]);
});
