import test from 'node:test';
import assert from 'node:assert/strict';
import {moneyToMinor,moneyFromMinor,monthTotals,csvForMonth} from '../budget-planner.js';

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
 assert.equal(result.planned,34000);
 assert.equal(result.actual,32000);
 assert.equal(result.remaining,66000);
 assert.equal(result.actualCashflow,68000);
 assert.equal(result.savings,10000);
 assert.equal(result.debt,4000);
});
test('CSV output quotes values safely',()=>{
 const csv=csvForMonth({categories:[{name:'Home, bills',items:[{name:'Mum "support"',planned:17200,actual:0,dueDate:'',status:'planned',frequency:'Monthly',flow:'cash',notes:''}]}]});
 assert.match(csv,/"Home, bills","Mum ""support""",/);
});
