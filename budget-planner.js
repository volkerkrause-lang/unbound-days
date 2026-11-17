const SUGGESTIONS={
'Income':['Salary','Second job','Freelance income','Pension','Benefits','Rental income','Investment income','Interest','Refunds','Other income'],
'Housing':['Rent','Mortgage','Service charges','Ground rent','Repairs','Maintenance','Furniture','Household purchases','Home insurance'],
'Family & Children':['Child maintenance','School fees','Childcare','Pocket money','Clothing','School supplies','University support','Family activities','Gifts'],
'Utilities':['Electricity','Gas','Water','Council tax','Broadband','Mobile phone','Landline','TV licence','Household services'],
'Food & Groceries':['Supermarket shopping','Takeaway','Restaurants','Cafés','Work lunches','Food delivery'],
'Transport':['Public transport','Fuel','EV charging','Parking','Car finance','Car insurance','MOT','Servicing','Vehicle tax','Taxis','Cycling','Travel passes'],
'Debt & Credit':['Credit cards','Personal loans','Overdrafts','Student loans','Repayment plans','Other borrowing'],
'Subscriptions & Digital Services':['ChatGPT','Gemini','Amazon Prime','Netflix','Spotify','Apple','Google','Microsoft','Software','Cloud storage','Streaming','News','Memberships'],
'Health & Fitness':['Gym','Dental care','Optical care','Prescriptions','Private healthcare','Health insurance','Fitness activities'],
'Lifestyle & Personal':['Clothing','Grooming','Hairdresser','Entertainment','Hobbies','Books','Art supplies','Social activities'],
'Travel & Holidays':['Flights','Hotels','Rail travel','Car hire','Travel insurance','Activities','Holiday spending','Travel savings'],
'Savings & Investments':['Emergency fund','General savings','Pension contributions','ISA','Investments','Property deposit','Other savings goals'],
'Annual & Irregular Expenses':['Christmas','Birthdays','Insurance renewals','Professional memberships','Tax payments','Car maintenance','School expenses','Unexpected bills'],
'Work & Professional':['Professional registration','Indemnity','Courses','Conferences','Equipment','Subscriptions','Work travel'],
'Other':['Miscellaneous','Charitable donations','Pets','User-defined expenses']
};
const FREQUENCIES=['One-off','Weekly','Fortnightly','Every four weeks','Monthly','Quarterly','Every six months','Annually','Custom'];
const clone=x=>JSON.parse(JSON.stringify(x));
const uuid=()=>crypto.randomUUID();
export function moneyToMinor(value){
 const s=String(value??'').trim().replace(/[£,\s]/g,'');
 if(!s)return 0;
 if(!/^-?\d+(?:\.\d{0,2})?$/.test(s))return 0;
 const negative=s[0]==='-',clean=negative?s.slice(1):s,[whole,part='']=clean.split('.');
 const result=Number(whole)*100+Number((part+'00').slice(0,2));
 return negative?-result:result;
}
export function moneyFromMinor(value){return (Number(value||0)/100).toFixed(2);}
export function monthTotals(month){
 const all=(month?.categories||[]).flatMap(c=>(c.items||[]).map(i=>({category:c,item:i})));
 const income=all.filter(x=>x.category.kind==='income').reduce((n,x)=>n+Number(x.item.planned||0),0);
 const planned=all.filter(x=>x.category.kind!=='income'&&x.item.flow!=='transfer').reduce((n,x)=>n+Number(x.item.planned||0),0);
 const actual=all.filter(x=>x.category.kind!=='income'&&x.item.flow!=='transfer').reduce((n,x)=>n+Number(x.item.actual||0),0);
 const actualIncome=all.filter(x=>x.category.kind==='income').reduce((n,x)=>n+Number(x.item.actual||0),0);
 const savings=all.filter(x=>x.item.flow==='savings').reduce((n,x)=>n+Number(x.item.planned||0),0);
 const debt=all.filter(x=>x.item.flow==='debt').reduce((n,x)=>n+Number(x.item.planned||0),0);
 return {income,planned,actual,actualIncome,remaining:income-planned,actualCashflow:actualIncome-actual,savings,debt};
}
function item(name,amount,extra={}){
 return {id:uuid(),name,planned:amount==null?0:amount,actual:0,dueDate:'',status:'planned',frequency:'Monthly',flow:'cash',fixed:false,notes:'',...extra};
}
function category(name,kind,items=[],extra={}){
 return {id:uuid(),name,kind,colour:'',icon:'',collapsed:false,archived:false,items,...extra};
}
function starterMonth(){
 return {name:'September 2026 — My Budget',currency:'GBP',openingBalance:null,confirmed:false,mode:'simple',categories:[
 category('Income','income',[item('Monthly income',524000,{fixed:true,frequency:'Monthly'})]),
 category('Running Costs','expense',[item('Mum',17200,{fixed:true}),item('Kids',150000,{fixed:true,flow:'debt'}),item('Rent',140000,{fixed:true})]),
 category('Utilities','expense',[item('Thames Water',0,{fixed:true}),item('Council Tax',0,{fixed:true}),item('Octopus Energy',8900,{fixed:true}),item('Hyperoptic',2500,{fixed:true}),item('Phone',1600,{fixed:true}),item('Unclear handwritten utility',2280,{fixed:true,notes:'Handwritten label unclear; amount approximately £22.80'})]),
 category('Debt','expense',[item('RBS Loan',26800,{fixed:true,flow:'debt'}),item('RBS Card',8300,{fixed:true,flow:'debt'}),item('Lloyds',22700,{fixed:true,flow:'debt'}),item('M&S',17600,{fixed:true,flow:'debt'})]),
 category('Transport','expense',[item('Transport',12700)]),
 category('Programmes / Subscriptions','expense',[item('GTC (label to confirm)',4800,{fixed:true}),item('Gemini',1900,{fixed:true}),item('ChatGPT',1900,{fixed:true}),item('Naya (label to confirm)',500,{fixed:true}),item('Amazon Prime',800,{fixed:true})]),
 category('Health','expense',[item('Gym',3400,{fixed:true})])
 ],sourceFigures:{income:524000,categorySubtotals:{'Running Costs':307200,'Utilities':15100,'Debt':75400,'Transport':12700,'Programmes / Subscriptions + Health':13300},intermediateBalance:226800,finalBalance:100200,calculatedFromHandwrittenSubtotals:100300,utilitiesNote:'Written subtotal £151; listed amounts total £152.80 before missing Thames Water and Council Tax.'}};
}
function blankMonth(label){
 return {name:label,currency:'GBP',openingBalance:null,confirmed:true,mode:'simple',categories:[
 category('Income','income',[]),category('Housing','expense'),category('Family & Children','expense'),
 category('Utilities','expense'),category('Food & Groceries','expense'),category('Transport','expense'),
 category('Debt & Credit','expense'),category('Subscriptions & Digital Services','expense'),
 category('Health & Fitness','expense'),category('Lifestyle & Personal','expense'),
 category('Travel & Holidays','expense'),category('Savings & Investments','expense'),
 category('Annual & Irregular Expenses','expense'),category('Work & Professional','expense'),category('Other','expense')
 ],sourceFigures:null};
}
const parse=(raw,active)=>{try{const d=JSON.parse(raw);if(d?.version===1&&d.months&&d.months[active])return d;}catch{}return {version:1,active,months:{[active]:starterMonth()},goals:[],updatedAt:new Date().toISOString()};};
function monthlyEquivalent(i){
 const a=Number(i.planned||0);
 switch(i.frequency){case 'Weekly':return Math.round(a*52/12);case 'Fortnightly':return Math.round(a*26/12);case 'Every four weeks':return Math.round(a*13/12);case 'Quarterly':return Math.round(a/3);case 'Every six months':return Math.round(a/6);case 'Annually':return Math.round(a/12);default:return a;}
}
export function csvForMonth(m){
 const lines=[['Category','Item','Planned GBP','Actual GBP','Due date','Status','Frequency','Flow','Notes']];
 for(const c of m.categories)for(const i of c.items)lines.push([c.name,i.name,moneyFromMinor(i.planned),moneyFromMinor(i.actual),i.dueDate,i.status,i.frequency,i.flow,i.notes||'']);
 return lines.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
}
export function createBudgetPlanner({entries,form,save,render,esc,toast,schedule}){
 const key=()=> 'budget:'+form()+':data';
 const read=()=>parse(entries()[key()],dateOf(entries()[key()]));
 const active=()=>{const d=read();return d.months[d.active];};
 const persist=d=>{d.updatedAt=new Date().toISOString();entries()[key()]=JSON.stringify(d);save();};
 function dateOf(raw){try{return JSON.parse(raw).active||'2026-09';}catch{return '2026-09';}}
 const fmt=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(n||0)/100);
 const e=esc||((s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])));
 const itemRow=(c,i,mode)=>'<div class="budget-line" data-budget-row="'+i.id+'"><input class="budget-name" data-budget-item-name="'+i.id+'" value="'+e(i.name)+'" aria-label="Item name"><label class="budget-money"><span>£</span><input inputmode="decimal" type="number" min="0" step="0.01" data-budget-field="planned" data-budget-item="'+i.id+'" value="'+e(moneyFromMinor(i.planned))+'" aria-label="Planned amount"></label>'+
 (mode==='detailed'?'<label class="budget-money actual"><span>£</span><input inputmode="decimal" type="number" min="0" step="0.01" data-budget-field="actual" data-budget-item="'+i.id+'" value="'+e(moneyFromMinor(i.actual))+'" aria-label="Actual amount"></label><input type="date" data-budget-field="dueDate" data-budget-item="'+i.id+'" value="'+e(i.dueDate||'')+'" aria-label="Due date"><select data-budget-field="status" data-budget-item="'+i.id+'" aria-label="Payment status">'+['planned','due','paid','skipped'].map(x=>'<option '+(i.status===x?'selected':'')+'>'+x+'</option>').join('')+'</select><select data-budget-field="frequency" data-budget-item="'+i.id+'" aria-label="Recurrence">'+FREQUENCIES.map(x=>'<option '+(i.frequency===x?'selected':'')+'>'+e(x)+'</option>').join('')+'</select><select data-budget-field="flow" data-budget-item="'+i.id+'" aria-label="Financial treatment">'+['cash','savings','debt','transfer'].map(x=>'<option '+(i.flow===x?'selected':'')+'>'+x+'</option>').join('')+'</select><label class="budget-check"><input type="checkbox" data-budget-field="fixed" data-budget-item="'+i.id+'" '+(i.fixed?'checked':'')+'>Fixed</label><input data-budget-field="notes" data-budget-item="'+i.id+'" value="'+e(i.notes||'')+'" placeholder="Note" aria-label="Notes">':'')+
 '<span class="budget-row-actions">'+(i.dueDate?'<button type="button" data-budget-action="calendar-item" data-budget-item="'+i.id+'" aria-label="Add payment reminder">Calendar</button>':'')+'<button type="button" data-budget-action="up" data-budget-item="'+i.id+'" aria-label="Move item up">↑</button><button type="button" data-budget-action="down" data-budget-item="'+i.id+'" aria-label="Move item down">↓</button><button type="button" data-budget-action="move" data-budget-item="'+i.id+'">Move</button><button type="button" data-budget-action="remove" data-budget-item="'+i.id+'" aria-label="Remove item">×</button></span></div>';
 function render(){
  let d=read(),m=d.months[d.active],tot=monthTotals(m),mode=m.mode||'simple';
  const reconciliation=m.sourceFigures?'<details class="budget-reconcile"><summary>'+(m.confirmed?'Source figures reviewed':'Check the handwritten figures')+'</summary><p>The written subtotals imply '+fmt(m.sourceFigures.calculatedFromHandwrittenSubtotals)+' remaining, while the written final balance is '+fmt(m.sourceFigures.finalBalance)+'. Listed utility items total £152.80 before two missing bills; the written utility subtotal is £151. No figures have been adjusted.</p>'+(m.confirmed?'<span class="budget-reviewed">Reviewed</span>':'<button type="button" data-budget-action="confirm">I have reviewed these figures</button>')+'</details>':'';
  const categories=m.categories.filter(c=>!c.archived),income=tot.income,allocation=income?Math.round(tot.planned/income*100):0;
  const summary='<section class="budget-summary"><div><span>Remaining planned</span><strong data-budget-summary="remaining" class="'+(tot.remaining<0?'over':'positive')+'">'+fmt(tot.remaining)+'</strong><small>Forecast from your entries, not a bank balance</small></div><div><span>Monthly income</span><strong>'+fmt(income)+'</strong><small>'+fmt(tot.actualIncome)+' received</small></div><div><span>Planned expenses</span><strong>'+fmt(tot.planned)+'</strong><small>'+allocation+'% of income allocated</small></div><div><span>Actual cash flow</span><strong>'+fmt(tot.actualIncome-tot.actual)+'</strong><small>Based on actual amounts entered</small></div></section>';
  const viewControl='<div class="budget-view-control" aria-label="Budget detail"><span>View</span><div class="budget-view-switch"><button type="button" data-budget-action="mode-simple" aria-pressed="'+(mode==='simple')+'">Simple</button><button type="button" data-budget-action="mode-detailed" aria-pressed="'+(mode==='detailed')+'">Detailed</button></div></div>';
  const toolbar='<details class="budget-tools"><summary>Month &amp; tools</summary><div class="budget-toolbar"><label>Budget month <input type="month" data-budget-active-month value="'+e(d.active)+'"></label><button type="button" data-budget-action="copy">Copy this month</button><button type="button" data-budget-action="add-category">+ Category</button><button type="button" data-budget-action="subscriptions">Subscriptions</button><button type="button" data-budget-action="review">Monthly review</button><button type="button" data-budget-action="csv">Export CSV</button><button type="button" data-budget-action="print">Print</button></div></details>';
  const header=mode==='detailed'?'<div class="budget-columns"><span>Item</span><span>Planned</span><span>Actual</span><span>Due</span><span>Status</span><span>Recurrence</span></div>':'';
  const body=categories.map(c=>{
   const amount=c.items.reduce((n,i)=>n+Number(i.planned||0),0),actual=c.items.reduce((n,i)=>n+Number(i.actual||0),0);
   const suggestions=SUGGESTIONS[c.name]||[];
   return '<section class="budget-category budget-category--'+c.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'" style="'+(c.colour?'--budget-accent:'+e(c.colour):'')+'"><header><button type="button" data-budget-action="collapse" data-budget-category="'+c.id+'" aria-expanded="'+(!c.collapsed)+'">'+(c.collapsed?'＋':'−')+'</button><span class="budget-category-icon">'+e(c.icon||'◦')+'</span><input data-budget-category-name="'+c.id+'" value="'+e(c.name)+'" aria-label="Category name"><strong data-budget-category-total="'+c.id+'">'+fmt(amount)+'</strong><small>'+fmt(actual)+' actual</small><button type="button" data-budget-action="rename-category" data-budget-category="'+c.id+'">Rename</button><button type="button" data-budget-action="archive-category" data-budget-category="'+c.id+'">Archive</button></header>'+(c.collapsed?'':header+c.items.map(i=>itemRow(c,i,mode)).join('')+'<div class="budget-category-footer"><select data-budget-suggestion="'+c.id+'" aria-label="Choose suggested item"><option value="">Add a suggested item…</option>'+suggestions.map(x=>'<option>'+e(x)+'</option>').join('')+'</select><button type="button" data-budget-action="add-suggested" data-budget-category="'+c.id+'">Add</button><button type="button" data-budget-action="add-item" data-budget-category="'+c.id+'">+ Custom item</button></div>')+'</section>';
  }).join('');
  const goals=(d.goals||[]).map(g=>'<li><strong>'+e(g.name)+'</strong> · '+fmt(g.saved)+' of '+fmt(g.target)+'<progress max="'+Math.max(1,g.target)+'" value="'+Math.min(g.target,g.saved)+'"></progress><small>Suggested monthly: '+fmt(g.monthly||0)+' · target '+e(g.date||'not set')+'</small></li>').join('');
  const goalPanel='<details class="budget-goals"><summary>Savings goals <button type="button" data-budget-action="add-goal">+ Add goal</button></summary><ul>'+goals+'</ul></details>';
  return '<div class="budget-planner"><div class="budget-title"><div><span class="eyebrow">Planning Tools · Money &amp; Finances</span><h2><span class="budget-title-icon" aria-hidden="true">£</span> Budget Planner</h2></div>'+viewControl+'</div>'+summary+toolbar+reconciliation+'<div class="budget-grid">'+body+'</div>'+goalPanel+'</div>';
 }
 function inputChanged(el){
  const field=el.dataset.budgetField,iid=el.dataset.budgetItem;if(!iid||!['planned','actual'].includes(field))return;
  const d=read(),m=d.months[d.active];let found;
  for(const c of m.categories){found=c.items.find(i=>i.id===iid);if(found)break;}
  if(!found)return;found[field]=moneyToMinor(el.value);const t=monthTotals(m);
  const values={remaining:fmt(t.remaining),income:fmt(t.income),planned:fmt(t.planned),cashflow:fmt(t.actualIncome-t.actual)};
  for(const [name,value] of Object.entries(values)){const node=document.querySelector('[data-budget-summary="'+name+'"]');if(node)node.textContent=value;}
  for(const c of m.categories){const node=document.querySelector('[data-budget-category-total="'+c.id+'"]');if(node)node.textContent=fmt(c.items.reduce((n,i)=>n+Number(i.planned||0),0));}
 }
 function fieldChanged(el){
  const d=read(),m=d.months[d.active],iid=el.dataset.budgetItem;
  if(el.dataset.budgetActiveMonth){const next=el.value;if(!next)return;d.active=next;if(!d.months[next]){const fresh=blankMonth(new Date(next+'-01T12:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'})+' Budget');const previous=Object.keys(d.months).filter(x=>x<next).sort().pop();if(previous){const from=d.months[previous];for(const c of from.categories){const target=fresh.categories.find(x=>x.name===c.name);if(!target)continue;target.items=c.items.filter(i=>i.frequency!=='One-off').map(i=>({...clone(i),id:uuid(),actual:0,status:'planned'}));}}d.months[next]=fresh;}persist(d);render();return;}
  if(el.dataset.budgetCategoryName){const c=m.categories.find(x=>x.id===el.dataset.budgetCategoryName);if(c){c.name=el.value.trim()||c.name;persist(d);}return;}
  if(el.dataset.budgetItemName){for(const c of m.categories){const i=c.items.find(x=>x.id===el.dataset.budgetItemName);if(i){i.name=el.value.trim()||i.name;persist(d);return;}}}
  if(!iid)return;
  for(const c of m.categories){const i=c.items.find(x=>x.id===iid);if(!i)continue;const f=el.dataset.budgetField;
   if(f==='planned'||f==='actual')i[f]=moneyToMinor(el.value);
   else if(f==='fixed')i.fixed=el.checked;
   else i[f]=el.value;
   persist(d);render();return;
  }
 }
 function handle(data){
  const action=data.budgetAction;if(!action)return false;
  const d=read(),m=d.months[d.active],ci=m.categories.findIndex(c=>c.id===data.budgetCategory),cat=m.categories[ci];
  if(action==='mode-simple'||action==='mode-detailed'){m.mode=action.slice(5);persist(d);render();return true;}
  if(action==='confirm'){m.confirmed=true;persist(d);render();return true;}
  if(action==='collapse'&&cat){cat.collapsed=!cat.collapsed;persist(d);render();return true;}
  if(action==='rename-category'&&cat){const v=prompt('Category name',cat.name);if(v?.trim()){cat.name=v.trim();persist(d);render();}return true;}
  if(action==='archive-category'&&cat){if(confirm('Archive this category and its items? It will remain in this month’s history.')){cat.archived=true;persist(d);render();}return true;}
  if(action==='add-category'){const name=prompt('New category name');if(name?.trim()){m.categories.push(category(name.trim(),'expense'));persist(d);render();}return true;}
  if(action==='add-suggested'&&cat){const select=document.querySelector('[data-budget-suggestion="'+cat.id+'"]'),name=select?.value;if(name){cat.items.push(item(name,0));persist(d);render();}return true;}
  if(action==='add-item'&&cat){const name=prompt('Item name');if(name?.trim()){cat.items.push(item(name.trim(),0));persist(d);render();}return true;}
  if(['remove','up','down','move'].includes(action)){
   let source,sourceCategory;for(const c of m.categories){const i=c.items.find(x=>x.id===data.budgetItem);if(i){source=i;sourceCategory=c;break;}}
   if(!source)return true;
   if(action==='remove'){sourceCategory.items=sourceCategory.items.filter(x=>x.id!==source.id);}
   if(action==='up'||action==='down'){const idx=sourceCategory.items.indexOf(source),dest=idx+(action==='up'?-1:1);if(dest>=0&&dest<sourceCategory.items.length)[sourceCategory.items[idx],sourceCategory.items[dest]]=[sourceCategory.items[dest],sourceCategory.items[idx]];}
   if(action==='move'){const names=m.categories.filter(c=>c.id!==sourceCategory.id).map(c=>c.name),name=prompt('Move to category:\n'+names.join('\n'));const dest=m.categories.find(c=>c.name.toLowerCase()===String(name||'').toLowerCase());if(dest){sourceCategory.items=sourceCategory.items.filter(x=>x.id!==source.id);dest.items.push(source);}}
   persist(d);render();return true;
  }
  if(action==='copy'){const target=prompt('Copy this budget to month (YYYY-MM)',nextMonth(d.active));if(!/^\d{4}-\d{2}$/.test(target||''))return true;if(d.months[target]){toast('That month already has a budget. Choose another month.');return true;}const copy=clone(m);copy.name=new Date(target+'-01T12:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'})+' — My Budget';copy.confirmed=true;copy.sourceFigures=null;copy.categories.forEach(c=>c.items.forEach(i=>{i.id=uuid();i.actual=0;i.status='planned';}));d.months[target]=copy;d.active=target;persist(d);render();return true;}
  if(action==='calendar-item'){const itemRow=m.categories.flatMap(c=>c.items).find(i=>i.id===data.budgetItem);if(itemRow&&itemRow.dueDate)schedule({title:'Payment due',date:itemRow.dueDate,source:'budget:'+form()+':'+itemRow.id});return true;}
  if(action==='subscriptions'){const rows=m.categories.flatMap(c=>c.items.filter(i=>i.frequency!=='One-off'&&/subscription|digital|programmes/i.test(c.name)||/prime|netflix|spotify|gemini|chatgpt|apple|google|microsoft|subscription/i.test(i.name)).map(i=>'<tr><td>'+e(i.name)+'</td><td>'+fmt(monthlyEquivalent(i))+'/mo</td><td>'+fmt(monthlyEquivalent(i)*12)+'/yr</td><td>'+e(i.dueDate||'Not set')+'</td></tr>')).join('');alert('Subscriptions in this budget:\n'+rows.replace(/<[^>]*>/g,''));return true;}
  if(action==='review'){const t=monthTotals(m);alert('Monthly review\nIncome: '+fmt(t.income)+'\nPlanned expenses: '+fmt(t.planned)+'\nActual expenses: '+fmt(t.actual)+'\nRemaining planned: '+fmt(t.remaining)+'\nSavings allocation: '+fmt(t.savings)+'\nDebt repayments: '+fmt(t.debt));return true;}
  if(action==='add-goal'){const name=prompt('Savings goal name');if(!name?.trim())return true;const target=moneyToMinor(prompt('Target amount in £','0')),saved=moneyToMinor(prompt('Already saved in £','0')),date=prompt('Target date (YYYY-MM-DD)','');const monthsLeft=Math.max(1,Math.ceil((new Date(date||d.active+'-01')-new Date(d.active+'-01'))/(86400000*30)));d.goals.push({id:uuid(),name:name.trim(),target,saved,date,monthly:Math.max(0,Math.ceil((target-saved)/monthsLeft))});persist(d);render();return true;}
  if(action==='csv'){const blob=new Blob([csvForMonth(m)],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='unbound-budget-'+d.active+'.csv';a.click();URL.revokeObjectURL(a.href);return true;}
  if(action==='print'){window.print();return true;}
  return true;
 }
 function nextMonth(value){const [y,mo]=value.split('-').map(Number);const dt=new Date(y,mo,1);return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0');}
 function scheduleDue(){
  const m=active();if(typeof schedule!=='function')return;
  let count=0;for(const c of m.categories)for(const i of c.items)if(i.dueDate&&i.status!=='paid'){schedule({title:'Payment due',date:i.dueDate,source:'budget:'+form()+':'+i.id});count++;}
  toast(count?'Payment reminders added to your Unbound calendar.':'Add due dates in Detailed Mode first.');
 }
 return {render,handle,changed:fieldChanged,input:inputChanged,scheduleDue,initialise(){const d=read();if(!entries()[key()])persist(d);return d;}};
}
