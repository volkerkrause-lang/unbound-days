import test from 'node:test';
import assert from 'node:assert/strict';
import {moneyToMinor,moneyFromMinor,monthTotals,csvForMonth,createBudgetPlanner,recurrenceApplies} from '../budget-planner.js';

test('money conversion uses integer minor units and rounds by entered pence',()=>{
 assert.equal(moneyToMinor('22.80'),2280);
 assert.equal(moneyToMinor('1,234.56'),123456);
 assert.equal(moneyToMinor(''),0);
 assert.equal(moneyFromMinor(1003),'10.03');
});
test('recurring entries honor start/end dates and frequency intervals',()=>{
 const quarterly={frequency:'Quarterly',recurringStartMonth:'2026-09'};
 assert.equal(recurrenceApplies(quarterly,'2026-09','2026-08'),true);
 assert.equal(recurrenceApplies(quarterly,'2026-10','2026-09'),false);
 assert.equal(recurrenceApplies(quarterly,'2026-12','2026-11'),true);
 assert.equal(recurrenceApplies({frequency:'Monthly',startDate:'2026-11-15',endDate:'2027-01-01'},'2026-10'),false);
 assert.equal(recurrenceApplies({frequency:'Monthly',startDate:'2026-11-15',endDate:'2027-01-01'},'2027-02'),false);
 assert.equal(recurrenceApplies({frequency:'One-off'},'2026-11'),false);
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
 assert.match(planner.render(),/More views/);
 assert.doesNotMatch(planner.render(),/Monthly Review|Subscriptions<|Check the handwritten figures|Month &amp; tools/);
});

test('savings reduce available money but are not counted as expenditure',()=>{
 const totals=monthTotals({categories:[{kind:'income',items:[{planned:200000,actual:200000}]},{kind:'expense',items:[{planned:50000,actual:40000,flow:'cash'},{planned:30000,actual:20000,flow:'savings'}]}]});
 assert.equal(totals.planned,50000);assert.equal(totals.savings,30000);assert.equal(totals.remaining,120000);assert.equal(totals.actualCashflow,140000);
});

test('monthly summary separates fixed commitments, flexible spending, savings and the unallocated balance',()=>{
 const totals=monthTotals({categories:[
  {kind:'income',items:[{planned:300000}]},
  {kind:'expense',items:[{planned:120000,fixed:true,flow:'cash'},{planned:50000,fixed:false,flow:'cash'},{planned:20000,flow:'savings'},{planned:10000,flow:'transfer'}]}
 ]});
 assert.equal(totals.income,300000);
 assert.equal(totals.fixed,120000);
 assert.equal(totals.availableToAllocate,180000);
 assert.equal(totals.variable,50000);
 assert.equal(totals.savings,20000);
 assert.equal(totals.remaining,110000);
 assert.equal(totals.unallocated,110000);
 assert.equal(totals.planned,170000,'transfers and savings are not counted as expenses');
 assert.equal(monthTotals({categories:[{kind:'income',items:[{planned:0}]},{kind:'expense',items:[{planned:0,fixed:true}]}]}).remaining,0);
 assert.equal(monthTotals({categories:[{kind:'income',items:[{planned:10000}]},{kind:'expense',items:[{planned:10000,fixed:true},{planned:5000}]}]}).remaining,-5000);
});

test('new actual values remain blank until entered and CSV distinguishes missing from zero',()=>{
 const csv=csvForMonth({categories:[{name:'Income',kind:'income',items:[{name:'Salary',planned:100000,actual:null,status:'planned',frequency:'Monthly',flow:'cash'}]},{name:'Bills',kind:'expense',items:[{name:'Water',planned:5000,actual:0,actualEntered:true,status:'paid',frequency:'Monthly',flow:'cash'}]}]},'2026-11');
 assert.match(csv,/"2026-11","Income","Salary","1000\.00","",""/);assert.match(csv,/"Water","50\.00","0\.00","50\.00"/);
});

test('deleting an entry updates totals and Undo restores all saved entry fields',()=>{
 const original={version:1,active:'2026-11',months:{'2026-11':{name:'November 2026 Budget',categories:[{id:'bills',name:'Bills',kind:'expense',items:[{id:'rent',name:'Rent',planned:125000,actual:123000,dueDate:'2026-11-01',status:'paid',frequency:'Monthly',flow:'cash',notes:'standing order',fixed:true}]}]}},goals:[]};
 let redraws=0;const bag={'budget:test:data':JSON.stringify(original)},planner=createBudgetPlanner({entries:()=>bag,form:()=>'test',save:()=>{},render:()=>redraws++,toast:()=>{}});
 planner.handle({budgetAction:'remove',budgetItem:'rent'});
 assert.equal(monthTotals(JSON.parse(bag['budget:test:data']).months['2026-11']).planned,0);
 assert.equal(redraws,1,'delete must redraw the app immediately');
 assert.match(planner.render(),/data-budget-action="undo-delete"/);
 planner.handle({budgetAction:'undo-delete'});
 assert.equal(redraws,2,'undo must redraw the app immediately');
 assert.deepEqual(JSON.parse(bag['budget:test:data']).months['2026-11'].categories[0].items[0],original.months['2026-11'].categories[0].items[0]);
});

test('legacy detailed view opens in the simple view and preserves old entry data',()=>{
 const data={version:1,active:'2026-11',months:{'2026-11':{name:'November',view:'detailed',categories:[{id:'b',name:'Bills',kind:'expense',items:[{id:'water',name:'Water',planned:5000,actual:0,status:'planned',frequency:'Monthly',flow:'cash'}]}]}},goals:[]},bag={'budget:test:data':JSON.stringify(data)},planner=createBudgetPlanner({entries:()=>bag,form:()=>'test',save:()=>{},render:()=>{},toast:()=>{}});
 const html=planner.render();
 assert.match(html,/data-budget-item-name="water"/);
 assert.doesNotMatch(html,/data-budget-view="detailed"|data-budget-field="actual"/);
 const saved=JSON.parse(bag['budget:test:data']);
 assert.equal(saved.months['2026-11'].view,'simple');
 assert.equal(saved.months['2026-11'].categories[0].items[0].actual,0,'legacy actual data is retained');
});

test('planned and actual edits are written back to the notebook before the app save runs',()=>{
 const previousDocument=globalThis.document;globalThis.document={querySelector:()=>null};
 const bag={},planner=createBudgetPlanner({entries:()=>bag,form:()=>'input-save',save:()=>{},render:()=>{},toast:()=>{}});
 try{
  planner.initialise();
  const month=JSON.parse(bag['budget:input-save:data']).months['2026-09'];
  const salary=month.categories[0].items[0];
  planner.input({dataset:{budgetItem:salary.id,budgetField:'planned'},value:'6100.50'});
  let saved=JSON.parse(bag['budget:input-save:data']);
  assert.equal(saved.months['2026-09'].categories[0].items[0].planned,610050);
  planner.input({dataset:{budgetItem:salary.id,budgetField:'actual'},value:'6000'});
  saved=JSON.parse(bag['budget:input-save:data']);
  assert.equal(saved.months['2026-09'].categories[0].items[0].actual,600000);
  assert.equal(saved.months['2026-09'].categories[0].items[0].actualEntered,true);
 }finally{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
});

test('the simple, breakdown, trends and payments views persist; detailed is no longer offered',()=>{
 const data={version:1,active:'2026-11',months:{'2026-11':{name:'November 2026',categories:[{id:'income',name:'Income',kind:'income',items:[{id:'salary',name:'Salary',planned:200000,actual:null,frequency:'Monthly',flow:'cash'}]},{id:'bills',name:'Bills',kind:'expense',items:[{id:'rent',name:'Rent',planned:90000,actual:null,dueDate:'2026-11-30',status:'planned',frequency:'Monthly',flow:'cash',fixed:true}]}]}},goals:[]};
 let redraws=0;const bag={'budget:views:data':JSON.stringify(data)},planner=createBudgetPlanner({entries:()=>bag,form:()=>'views',save:()=>{},render:()=>redraws++,toast:()=>{}});
 assert.doesNotMatch(planner.render(),/data-budget-view="detailed"/);
 for(const [view,marker] of [['simple','data-budget-item-name="rent"'],['breakdown','budget-breakdown'],['trends','budget-trends'],['payments','budget-payments']]){
  planner.handle({budgetAction:'select-view',budgetView:view});
  assert.equal(JSON.parse(bag['budget:views:data']).months['2026-11'].view,view);
  assert.equal(redraws,(['simple','breakdown','trends','payments'].indexOf(view)+1),'each view change must redraw the app');
  assert.match(planner.render(),new RegExp(marker));
 }
});

test('budget edits survive leaving and reopening the planner',()=>{
 const previousDocument=globalThis.document;globalThis.document={querySelector:()=>null};
 try{const bag={},save=()=>true,first=createBudgetPlanner({entries:()=>bag,form:()=>'persistent',save,render:()=>{},toast:()=>{}});
  first.initialise();
  const salary=JSON.parse(bag['budget:persistent:data']).months['2026-09'].categories[0].items[0];
  first.input({dataset:{budgetItem:salary.id,budgetField:'planned'},value:'6100.50'});
  const reopened=createBudgetPlanner({entries:()=>bag,form:()=>'persistent',save,render:()=>{},toast:()=>{}});
  assert.match(reopened.render(),/value="6100\.50"/);
  assert.equal(JSON.parse(bag['budget:persistent:data']).months['2026-09'].categories[0].items[0].planned,610050);
 }finally{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
});

test('a rejected notebook save rolls the budget back instead of showing an unsaved edit as saved',()=>{
 const previousDocument=globalThis.document;globalThis.document={querySelector:()=>null};
 try{const bag={},messages=[];let allowSave=true;const planner=createBudgetPlanner({entries:()=>bag,form:()=>'blocked',save:()=>allowSave,render:()=>{},toast:m=>messages.push(m)});
  planner.initialise();
  allowSave=false;
  const before=bag['budget:blocked:data'],salary=JSON.parse(before).months['2026-09'].categories[0].items[0];
  planner.input({dataset:{budgetItem:salary.id,budgetField:'planned'},value:'9999'});
  assert.equal(bag['budget:blocked:data'],before);
  assert.equal(messages.length,1);
  planner.handle({budgetAction:'save'});
  assert.equal(messages.length,1,'repeated failures do not spam the user');
 }finally{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
});

test('new months start with empty planning sections and no prefilled suggestion collection',()=>{
 const bag={'budget:new-month:data':JSON.stringify({version:1,active:'2026-11',months:{'2026-11':{name:'November',categories:[]}},goals:[]})},planner=createBudgetPlanner({entries:()=>bag,form:()=>'new-month',save:()=>{},render:()=>{},toast:()=>{}});
 planner.changed({dataset:{budgetActiveMonth:'2026-12'},value:'2026-12'});
 const month=JSON.parse(bag['budget:new-month:data']).months['2026-12'];
 assert.deepEqual(month.categories.map(c=>c.name),['Income','Fixed commitments','Variable spending','Savings']);
 assert.ok(month.categories.every(c=>c.items.length===0));
 const html=planner.render();
 assert.match(html,/Flexible spending/);
 assert.match(html,/\+ Add entry/);
 assert.doesNotMatch(html,/suggested item|preselected collection|\+ Custom item/);
});

test('adding an entry creates one blank row and reordering preserves its data',()=>{
 const data={version:1,active:'2026-11',months:{'2026-11':{name:'November',categories:[{id:'flex',name:'Variable spending',kind:'expense',items:[{id:'a',name:'Groceries',planned:25000,frequency:'One-off',flow:'cash'},{id:'b',name:'Transport',planned:8000,frequency:'One-off',flow:'cash'}]}]}},goals:[]};
 const bag={'budget:edit:data':JSON.stringify(data)},planner=createBudgetPlanner({entries:()=>bag,form:()=>'edit',save:()=>{},render:()=>{},toast:()=>{}});
 planner.handle({budgetAction:'add-item',budgetCategory:'flex'});
 let month=JSON.parse(bag['budget:edit:data']).months['2026-11'];
 assert.equal(month.categories[0].items.length,3);
 assert.equal(month.categories[0].items[2].name,'');
 assert.equal(month.categories[0].items[2].planned,0);
 planner.handle({budgetAction:'up',budgetItem:'b'});
 month=JSON.parse(bag['budget:edit:data']).months['2026-11'];
 assert.deepEqual(month.categories[0].items.map(i=>i.id),['b','a',month.categories[0].items[2].id]);
 assert.equal(month.categories[0].items.find(i=>i.id==='b').planned,8000);
});

test('a copied month gets independent entries and does not change its historical source',()=>{
 const source={name:'November 2026',categories:[{id:'bills',name:'Fixed commitments',kind:'expense',items:[{id:'rent',name:'Rent',planned:100000,actual:98000,actualEntered:true,dueDate:'2026-11-01',status:'paid',frequency:'Monthly',flow:'cash',fixed:true}]}]};
 const bag={'budget:copy:data':JSON.stringify({version:1,active:'2026-11',months:{'2026-11':structuredClone(source)},goals:[]})};
 const originalPrompt=globalThis.prompt,originalConfirm=globalThis.confirm;let prompts=['2026-12','recurring only'];
 globalThis.prompt=()=>prompts.shift()??'';globalThis.confirm=()=>true;
 try{
  const planner=createBudgetPlanner({entries:()=>bag,form:()=>'copy',save:()=>{},render:()=>{},toast:()=>{}});
  planner.handle({budgetAction:'copy'});
  const data=JSON.parse(bag['budget:copy:data']),copied=data.months['2026-12'].categories[0].items[0];
  assert.equal(data.active,'2026-12');
  assert.equal(copied.name,'Rent');
  assert.equal(copied.planned,100000);
  assert.equal(copied.actual,null);
  assert.equal(copied.status,'planned');
  assert.notEqual(copied.id,'rent');
  assert.equal(data.months['2026-11'].categories[0].items[0].actual,98000);
 }finally{if(originalPrompt===undefined)delete globalThis.prompt;else globalThis.prompt=originalPrompt;if(originalConfirm===undefined)delete globalThis.confirm;else globalThis.confirm=originalConfirm;}
});

test('invalid budget JSON is preserved and shown without overwriting it',()=>{
 const raw='{not valid budget data';const bag={'budget:corrupt:data':raw};let writes=0;
 const planner=createBudgetPlanner({entries:()=>bag,form:()=>'corrupt',save:()=>writes++,render:()=>{},toast:()=>{}});
 planner.initialise();
 assert.equal(bag['budget:corrupt:data'],raw);
 assert.match(planner.render(),/could not be read/);
 assert.equal(writes,0);
});
