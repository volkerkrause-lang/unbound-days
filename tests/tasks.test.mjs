import test from 'node:test';
import assert from 'node:assert/strict';
import {lists,filterTasks,moveList,duplicateTask,reschedule,restoreTask} from '../tasks.js';
test('legacy tasks remain in My tasks and Today combines lists without completed/deleted records',()=>{const tasks=[{id:'old',date:'2026-10-14'},{id:'remote',listId:'work',date:'2026-10-14'},{id:'done',date:'2026-10-14',done:true},{id:'deleted',date:'2026-10-14',deleted:true}];assert.deepEqual(filterTasks(tasks,{today:'2026-10-14',filter:'today'}).map(t=>t.id),['old','remote']);assert.deepEqual(filterTasks(tasks,{today:'2026-10-14',list:'local'}).map(t=>t.id),['old']);});
test('pinned lists sort before movable lists and removed list preferences are harmless',()=>{const state={settings:{taskLists:[{id:'a',title:'A'},{id:'b',title:'B'}],taskListOrder:['gone','b','local','a'],taskListPins:['a']}};assert.deepEqual(lists(state).map(l=>l.id),['a','b','local']);assert.deepEqual(moveList(['a','b','local'],'b',-1),['b','a','local']);assert.deepEqual(moveList(['a'],'a',-1),['a']);});
test('duplicate preserves writing and planner links but strips remote identity and completion',()=>{const original={id:'old',title:'Example',notes:'Keep this',goal:'Goal',ideaId:'idea',done:true,google:{id:'remote'},googleTask:{id:'remote'},sync:{pending:true},completed:'yesterday',steps:[{id:'step',title:'Do it',done:true}]};const next=duplicateTask(original,'new');assert.equal(next.id,'new');assert.equal(next.done,false);assert.equal(next.notes,original.notes);assert.equal(next.ideaId,'idea');assert.equal(next.google,undefined);assert.equal(next.googleTask,undefined);assert.equal(next.sync,undefined);assert.notEqual(next.steps[0].id,'step');assert.equal(next.steps[0].done,false);assert.equal(original.steps[0].done,true);});
test('bulk reschedule preserves unrelated tasks and local-only time',()=>{const tasks=[{id:'a',date:'2026-10-14',time:'12:00'},{id:'b',date:'2026-10-15'}];const next=reschedule(tasks,['a'],'2026-10-16');assert.equal(next[0].time,'12:00');assert.equal(next[0].date,'2026-10-16');assert.equal(next[1].date,'2026-10-15');assert.equal(tasks[0].date,'2026-10-14');});
import {createTaskView} from '../task-view.js';
test('quick entry, bulk actions and list preferences preserve existing task fields',()=>{const state={tasks:[{id:'old',title:'Legacy',notes:'Original',goal:'Goal',date:'2026-10-14',time:'09:00',done:false}],settings:{}};let writes=0;globalThis.document={querySelector:()=>null};try{const view=createTaskView({getState:()=>state,save:()=>writes++,render:()=>{},esc:s=>String(s??''),today:()=> '2026-10-14',addDays:()=> '2026-10-15',openModal:()=>{},closeModal:()=>{},taskForm:()=>{},tools:()=>'',toast:()=>{}});view.submit({id:'task-quick'},{title:' New task ',listId:'local'});assert.equal(state.tasks[1].title,'New task');view.click({taskAction:'select-all'});view.submit({id:'task-bulk-priority'},{priority:'urgent'});assert.equal(state.tasks[0].priority,'urgent');assert.equal(state.tasks[0].notes,'Original');assert.equal(state.tasks[0].goal,'Goal');assert.equal(state.tasks[0].time,'09:00');view.changed({dataset:{},hasAttribute:()=>true,value:'today'});view.enter();assert.equal(state.settings.taskView.list,'all');assert.equal(state.settings.taskView.filter,'today');assert.ok(writes>0);}finally{delete globalThis.document;}});

test('restoring pending deletion keeps identity; confirmed Google deletion creates only a local recovery copy',()=>{const pending={id:'pending',title:'Writing',deleted:true,googleTask:{id:'remote',base:{deleted:false}}};const tasks=[pending];restoreTask(tasks,{...pending},'new');assert.equal(tasks.length,1);assert.equal(pending.deleted,false);assert.equal(pending.googleTask.id,'remote');const deleted={id:'deleted',title:'Original',notes:'Keep',deleted:true,googleTask:{id:'gone',base:{deleted:true}}};tasks.push(deleted);const restored=restoreTask(tasks,deleted,'restored');assert.equal(restored.googleTask,undefined);assert.equal(restored.listId,'local');assert.equal(restored.notes,'Keep');assert.equal(deleted.deleted,true);});

test('Google review batch resolves a large backlog in one save while preserving planner extras and account boundaries',()=>{
 const task=i=>({id:String(i),title:'Local writing',notes:'Local notes',goal:'Keep goal',priority:'urgent',googleTask:{account:'a',id:'remote-'+i},taskSyncError:'Review needed',taskConflict:{remote:{title:'Google writing',notes:'Google notes',date:'2026-10-29',done:true,deleted:true,parentId:''},etag:'etag-'+i}});
 const state={tasks:Array.from({length:1500},(_,i)=>task(i)),settings:{}};
 const other={...task('other'),googleTask:{account:'b',id:'other'}};
 const uncertain={...task('uncertain'),taskSyncUncertain:{kind:'create'}};
 const missing={...task('missing'),taskConflict:{reason:'missing'}};
 state.tasks.push(other,uncertain,missing);
 const untouched=structuredClone([other,uncertain,missing]);let writes=0,dialog='',account='a';
 const view=createTaskView({getState:()=>state,save:()=>writes++,render:()=>{},esc:String,today:()=> '2026-10-29',openModal:(_title,body)=>dialog=body,closeModal:()=>{},toast:()=>{},identity:()=>account});
 assert.match(view.html(),/Use Google fields for all 1500 reviews/);
 view.click({taskAction:'use-google-reviews'});assert.match(dialog,/1500 reviewed tasks/);assert.equal(writes,0);
 view.click({taskAction:'confirm-google-reviews'});assert.equal(writes,1);
 for(const t of state.tasks.slice(0,1500)){assert.equal(t.title,'Google writing');assert.equal(t.notes,'Google notes');assert.equal(t.deleted,true);assert.equal(t.goal,'Keep goal');assert.equal(t.priority,'urgent');assert.equal(t.taskConflict,undefined);assert.equal(t.taskSyncError,undefined);assert.equal(t.googleTask.base.title,'Google writing');assert.notEqual(t.googleTask.base,t.taskConflict?.remote);}
 assert.deepEqual([other,uncertain,missing],untouched);
 assert.doesNotMatch(view.html(),/data-task-action="use-google-reviews"/);
 view.click({taskAction:'confirm-google-reviews'});assert.equal(writes,1);
});

test('Google review batch refuses a changed conflict or switched account after the confirmation opens',()=>{
 const state={tasks:[{id:'review',title:'Local',googleTask:{account:'a',id:'remote'},taskConflict:{remote:{title:'Google'},etag:'1'}}],settings:{}};
 let account='a',writes=0;
 const view=createTaskView({getState:()=>state,save:()=>writes++,render:()=>{},openModal:()=>{},closeModal:()=>{},toast:()=>{},identity:()=>account});
 view.click({taskAction:'use-google-reviews'});state.tasks[0].taskConflict.remote.title='New Google change';
 view.click({taskAction:'confirm-google-reviews'});assert.equal(writes,0);assert.equal(state.tasks[0].title,'Local');assert.ok(state.tasks[0].taskConflict);
 view.click({taskAction:'use-google-reviews'});account='b';view.click({taskAction:'confirm-google-reviews'});
 assert.equal(writes,0);assert.equal(state.tasks[0].title,'Local');assert.ok(state.tasks[0].taskConflict);
});
