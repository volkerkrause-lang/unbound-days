import test from 'node:test';
import assert from 'node:assert/strict';
import {lists,filterTasks,moveList,duplicateTask,reschedule,restoreTask} from '../tasks.js';
test('legacy tasks remain in My tasks and Today combines lists without completed/deleted records',()=>{const tasks=[{id:'old',date:'2026-10-14'},{id:'remote',listId:'work',date:'2026-10-14'},{id:'done',date:'2026-10-14',done:true},{id:'deleted',date:'2026-10-14',deleted:true}];assert.deepEqual(filterTasks(tasks,{today:'2026-10-14',filter:'today'}).map(t=>t.id),['old','remote']);assert.deepEqual(filterTasks(tasks,{today:'2026-10-14',list:'local'}).map(t=>t.id),['old']);});
test('pinned lists sort before movable lists and removed list preferences are harmless',()=>{const state={settings:{taskLists:[{id:'a',title:'A'},{id:'b',title:'B'}],taskListOrder:['gone','b','local','a'],taskListPins:['a']}};assert.deepEqual(lists(state).map(l=>l.id),['a','b','local']);assert.deepEqual(moveList(['a','b','local'],'b',-1),['b','a','local']);assert.deepEqual(moveList(['a'],'a',-1),['a']);});
test('duplicate preserves writing and planner links but strips remote identity and completion',()=>{const original={id:'old',title:'Example',notes:'Keep this',goal:'Goal',ideaId:'idea',done:true,google:{id:'remote'},googleTask:{id:'remote'},sync:{pending:true},completed:'yesterday',steps:[{id:'step',title:'Do it',done:true}]};const next=duplicateTask(original,'new');assert.equal(next.id,'new');assert.equal(next.done,false);assert.equal(next.notes,original.notes);assert.equal(next.ideaId,'idea');assert.equal(next.google,undefined);assert.equal(next.googleTask,undefined);assert.equal(next.sync,undefined);assert.notEqual(next.steps[0].id,'step');assert.equal(next.steps[0].done,false);assert.equal(original.steps[0].done,true);});
test('bulk reschedule preserves unrelated tasks and local-only time',()=>{const tasks=[{id:'a',date:'2026-10-14',time:'12:00'},{id:'b',date:'2026-10-15'}];const next=reschedule(tasks,['a'],'2026-10-16');assert.equal(next[0].time,'12:00');assert.equal(next[0].date,'2026-10-16');assert.equal(next[1].date,'2026-10-15');assert.equal(tasks[0].date,'2026-10-14');});
import {createTaskView} from '../task-view.js';
test('quick entry, bulk actions and list preferences preserve existing task fields',()=>{const state={tasks:[{id:'old',title:'Legacy',notes:'Original',goal:'Goal',date:'2026-10-14',time:'09:00',done:false}],settings:{}};let writes=0;globalThis.document={querySelector:()=>null};try{const view=createTaskView({getState:()=>state,save:()=>writes++,render:()=>{},esc:s=>String(s??''),today:()=> '2026-10-14',addDays:()=> '2026-10-15',openModal:()=>{},closeModal:()=>{},taskForm:()=>{},tools:()=>'',toast:()=>{}});view.submit({id:'task-quick'},{title:' New task ',listId:'local'});assert.equal(state.tasks[1].title,'New task');view.click({taskAction:'select-all'});view.submit({id:'task-bulk-priority'},{priority:'urgent'});assert.equal(state.tasks[0].priority,'urgent');assert.equal(state.tasks[0].notes,'Original');assert.equal(state.tasks[0].goal,'Goal');assert.equal(state.tasks[0].time,'09:00');view.changed({dataset:{},hasAttribute:()=>true,value:'today'});view.enter();assert.equal(state.settings.taskView.list,'all');assert.equal(state.settings.taskView.filter,'today');assert.ok(writes>0);}finally{delete globalThis.document;}});

test('archive is local, reversible, and never changes Google completion',()=>{
 const task={id:'g1',title:'Keep writing',done:false,listId:'local',googleTask:{account:'a',id:'remote'}};const state={tasks:[task],settings:{}};let writes=0,toastMessage='';
 const view=createTaskView({getState:()=>state,save:()=>writes++,render:()=>{},esc:String,today:()=> '2026-11-02',openModal:()=>{},closeModal:()=>{},toast:x=>toastMessage=x});
 view.click({taskArchive:'g1'});assert.equal(task.archived,true);assert.equal(task.done,false);assert.equal(task.notes,undefined);assert.equal(writes,1);assert.match(toastMessage,/Undo/);
 assert.doesNotMatch(view.html(),/data-task-row="g1"/);view.click({taskAction:'show-archived'});assert.match(view.html(),/data-task-row="g1"/);assert.match(view.html(),/Restore Keep writing/);view.click({taskUnarchive:'g1'});assert.equal(task.archived,false);assert.equal(task.archived,false);assert.equal(task.done,false);assert.equal(writes,2);
});
test('selection exposes compact bulk controls and task tapping selects rather than edits',()=>{
 const state={tasks:[{id:'a',title:'One'},{id:'b',title:'Two',listId:'work'}],settings:{taskLists:[{id:'work',title:'Work'}]}};let renders=0;
 const view=createTaskView({getState:()=>state,save:()=>{},render:()=>renders++,esc:String,today:()=> '2026-11-02',openModal:()=>{},closeModal:()=>{},toast:()=>{}});
 view.click({taskAction:'toggle-selection'});assert.match(view.html(),/Select all/);assert.match(view.html(),/bulk-move/);assert.match(view.html(),/bulk-date/);assert.match(view.html(),/bulk-delete/);
 view.click({editTask:'a'});assert.equal(renders,2);assert.match(view.html(),/1 selected/);
 view.click({taskAction:'select-all'});assert.match(view.html(),/2 selected/);view.click({taskAction:'select-all'});assert.match(view.html(),/0 selected/);
});
test('bulk move and reschedule preserve unrelated task fields and roll back on save failure',()=>{
 const state={tasks:[{id:'a',title:'A',notes:'Keep',date:'2026-11-02',listId:'local'},{id:'b',title:'B',listId:'local'}],settings:{taskLists:[{id:'work',title:'Work'}]}};let dialog='',writes=0;
 const view=createTaskView({getState:()=>state,save:()=>{writes++;if(writes===1)throw Error('storage full');},render:()=>{},esc:String,today:()=> '2026-11-02',addDays:()=> '2026-11-03',openModal:(_title,body)=>dialog=body,closeModal:()=>{},toast:()=>{}});
 view.click({taskAction:'select-all'});view.click({taskAction:'bulk-move'});assert.match(dialog,/task-move-form/);
 assert.equal(view.submit({id:'task-move-form',dataset:{taskIds:'["a","b"]'}},{listId:'work'}),true);assert.equal(state.tasks[0].listId,'local');assert.equal(state.tasks[1].listId,'local');
 view.click({taskAction:'bulk-date'});assert.match(dialog,/task-date-form/);assert.equal(state.tasks[0].notes,'Keep');
});
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

test('Google review confirmation tolerates database key reordering without accepting changed values',()=>{
 const state={tasks:[{id:'review',title:'Local',googleTask:{account:'a',id:'remote'},taskConflict:{remote:{title:'Google',done:true,deleted:false},etag:'1'}}],settings:{}};let writes=0;
 const view=createTaskView({getState:()=>state,save:()=>writes++,render:()=>{},openModal:()=>{},closeModal:()=>{},toast:()=>{},identity:()=> 'a'});
 view.click({taskAction:'use-google-reviews'});
 state.tasks[0].taskConflict={etag:'1',remote:{deleted:false,done:true,title:'Google'}};
 view.click({taskAction:'confirm-google-reviews'});assert.equal(writes,1);assert.equal(state.tasks[0].title,'Google');assert.equal(state.tasks[0].taskConflict,undefined);
});

test('task selection and revealed archive actions are labelled, compact and operable',()=>{
 const state={tasks:[{id:'a',title:'One'}],settings:{}};
 const view=createTaskView({getState:()=>state,save:()=>{},render:()=>{},esc:String,today:()=> '2026-11-03',openModal:()=>{},closeModal:()=>{},toast:()=>{}});
 let html=view.html();
 assert.match(html,/data-task-action="toggle-selection"[\s\S]*?<small>Select tasks<\/small>/);
 assert.match(html,/class="task-archive-reveal" data-task-archive="a"[\s\S]*?<small>Archive<\/small>/);
 view.click({taskAction:'toggle-selection'});html=view.html();
 assert.match(html,/data-task-action="select-all"[\s\S]*?<small>Select all<\/small>/);
 assert.match(html,/data-task-select="a"/);
 assert.match(html,/0 selected/);
 view.changed({dataset:{taskSelect:'a'},checked:true});html=view.html();assert.match(html,/1 selected/);
 assert.equal((html.match(/<small>Cancel<\/small>/g)||[]).length,1);
 view.click({taskAction:'toggle-selection'});assert.doesNotMatch(view.html(),/data-task-select="a"/);
});

test('Done button toggles task completion, offers undo, and selection mode keeps actions separate',()=>{
 const state={tasks:[{id:'a',title:'One',date:'2026-11-06',done:false}],settings:{}};let writes=0,renders=0,message='';
 const view=createTaskView({getState:()=>state,save:()=>writes++,render:()=>renders++,esc:String,today:()=> '2026-11-04',openModal:()=>{},closeModal:()=>{},toast:x=>message=x});
 let html=view.html();assert.match(html,/class="task-done-button[^"]*" data-task-done="a"/);assert.doesNotMatch(html,/data-task-check="a"|data-task-reschedule="a"|data-task-duplicate="a"/);
 view.click({taskDone:'a'});assert.equal(state.tasks[0].done,true);assert.equal(writes,1);assert.match(message,/Undo/);assert.match(view.html(),/task-done-button is-done/);assert.match(view.html(),/✓/);
 view.click({taskAction:'undo-completion'});assert.equal(state.tasks[0].done,false);assert.equal(writes,2);
 view.click({taskDone:'a'});view.click({taskDone:'a'});assert.equal(state.tasks[0].done,true);assert.equal(writes,3);
 view.click({taskAction:'toggle-selection'});html=view.html();assert.doesNotMatch(html,/data-task-done="a"/);assert.match(html,/data-task-select="a"/);assert.match(html,/task-selection-toolbar/);view.click({editTask:'a'});assert.equal(state.tasks[0].done,true);
});


test('custom list deletion preserves task records locally and offers reversible reassignment',()=>{
 const task={id:'t1',title:'Keep this task',notes:'Keep notes',date:'2026-11-06',time:'09:30',done:true,listId:'work',recurrence:{frequency:'weekly'}};
 const state={tasks:[task],settings:{taskLists:[{id:'work',title:'Work',colour:'#123456'}],taskListOrder:['work','local'],taskListPins:['work'],taskView:{list:'work'}}};let writes=0,dialog='',renders=0,message='';
 const view=createTaskView({getState:()=>state,save:()=>writes++,render:()=>renders++,esc:String,today:()=> '2026-11-04',openModal:(_title,body)=>dialog=body,closeModal:()=>{},toast:x=>message=x});
 assert.match(view.html(),/Something to get done, once or on a schedule/);assert.match(view.html(),/A regular activity to build into your routine and track your progress/);assert.doesNotMatch(view.html(),/How Rituals work|Add a Task|Add a Ritual/);
 view.click({taskAction:'reorder'});assert.match(view.html(),/data-task-delete-list="work"/);assert.doesNotMatch(view.html(),/data-task-delete-list="local"/);
 view.click({taskDeleteList:'work'});assert.match(dialog,/Are you sure you want to delete/);assert.match(dialog,/preserve these tasks and move them to My tasks/);
 view.click({taskAction:'confirm-delete-list',listId:'work'});assert.equal(task.listId,'local');assert.deepEqual([task.title,task.notes,task.date,task.time,task.done,task.recurrence.frequency],['Keep this task','Keep notes','2026-11-06','09:30',true,'weekly']);assert.deepEqual(state.settings.taskLists,[]);assert.equal(state.settings.taskView.list,'all');assert.match(view.html(),/undo-delete-list/);assert.equal(writes,1);
 view.click({taskAction:'undo-delete-list'});assert.equal(task.listId,'work');assert.equal(state.settings.taskLists[0].id,'work');assert.deepEqual(state.settings.taskListOrder,['work','local']);assert.deepEqual(state.settings.taskListPins,['work']);assert.equal(writes,2);assert.match(message,/restored/);
});

test('Google task lists are not exposed to deletion controls',()=>{const state={tasks:[],settings:{taskLists:[{id:'gt:work',title:'Google work',googleList:{id:'work',account:'a'}}]}};const view=createTaskView({getState:()=>state,save:()=>{},render:()=>{},esc:String,today:()=> '2026-11-04',openModal:()=>{},closeModal:()=>{},toast:()=>{}});view.click({taskAction:'reorder'});assert.doesNotMatch(view.html(),/data-task-delete-list="gt:work"/);});
