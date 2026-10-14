// Google fields and Unbound metadata deliberately have separate representations.
export const fields=t=>({title:t.title||'',notes:t.notes||'',date:t.date||'',done:!!t.done,parentId:t.parentId||'',deleted:!!t.deleted});
export const remoteFields=t=>({title:t.title||'',notes:t.notes||'',date:t.due?.slice(0,10)||'',done:t.status==='completed',parentId:t.parent||'',deleted:!!t.deleted});
export const body=t=>({title:t.title,notes:t.notes||'',due:t.date?`${t.date}T00:00:00.000Z`:null,status:t.done?'completed':'needsAction',...(!t.done?{completed:null}:{})});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function mergeFields(base,local,remote){const merged={...local},conflicts=[];for(const key of Object.keys(remote)){if(same(local[key],remote[key])||same(base[key],remote[key]))continue;if(same(base[key],local[key]))merged[key]=remote[key];else conflicts.push(key);}return {merged,conflicts};}
export const listKey=(account,id)=>`gt:${account}:${id}`;
export const taskKey=(account,list,id)=>`${listKey(account,list)}:${id}`;
export function createTaskSync({api,identity,getState,persist,active=()=>true,status=()=>{},device=()=>''}){
 let busy=false;
 async function pages(path){let result=[],token='';do{const r=await api(path+(path.includes('?')?'&':'?')+'maxResults=100'+(token?'&pageToken='+encodeURIComponent(token):''));result.push(...(r.items||[]));token=r.nextPageToken||'';}while(token);return result;}
 async function sync(){
  if(busy)return;busy=true;const state=getState(),account=identity(),tasksReference=state.tasks,settingsReference=state.settings;
  const valid=()=>active()&&getState()===state&&state.tasks===tasksReference&&state.settings===settingsReference&&identity()===account;
  const checkpoint=async()=>{if(!valid())throw Error('Google account or notebook changed. Reconnect before syncing.');await persist();if(!valid())throw Error('Notebook changed during save.');};
  try{
   if(!account)throw Error('Reconnect Google to synchronise tasks.');
   status('Checking Google Tasks…');
   const remoteLists=await pages('users/@me/lists');if(!valid())return;
   state.settings.taskLists??=[];
   for(const list of remoteLists){const key=listKey(account,list.id);let local=state.settings.taskLists.find(l=>l.id===key);if(!local){local={id:key,googleList:{id:list.id,account},title:list.title};state.settings.taskLists.push(local);}else local.title=list.title;local.unavailable=false;}
   for(const list of state.settings.taskLists.filter(l=>l.googleList?.account===account))list.unavailable=!remoteLists.some(r=>r.id===list.googleList.id);
   await checkpoint();
   for(const list of remoteLists){
    const key=listKey(account,list.id),path=`lists/${encodeURIComponent(list.id)}/tasks`;
    const records=await pages(path+'?showCompleted=true&showHidden=true&showDeleted=true&showAssigned=true');if(!valid())return;
    const byId=new Map(records.map(t=>[t.id,t]));
    for(const remote of records){let task=state.tasks.find(t=>t.googleTask?.account===account&&t.googleTask.list===list.id&&t.googleTask.id===remote.id);if(!task){if(remote.deleted)continue;task={id:taskKey(account,list.id,remote.id),listId:key,...remoteFields(remote),googleTask:{account,list:list.id,id:remote.id,etag:remote.etag,base:remoteFields(remote)}};state.tasks.push(task);}}
    const tasks=state.tasks.filter(t=>t.listId===key||t.googleTask?.account===account&&t.googleTask.list===list.id);
    // Parents must be created before children. Imported child records use Google's parent ID.
    tasks.sort((a,b)=>Number(!!a.parentId)-Number(!!b.parentId));
    for(const task of tasks){
     if(!valid())return;
     if(task.googleTask&&task.googleTask.account!==account)continue;
     if(task.googleTask&&task.listId!==key){task.taskSyncError='Moving between lists requires review; original Google task retained.';continue;}
     if(!task.googleTask&&task.taskOriginDevice&&task.taskOriginDevice!==device()){task.taskSyncError='New task will be created by its original device; open that device to finish syncing.';continue;}
     if(task.taskSyncUncertain){task.taskSyncError='Previous save has an unknown outcome. Check Google before resolving; automatic retry paused.';continue;}
     const sent=fields(task),remote=task.googleTask?byId.get(task.googleTask.id):null;
     if(task.googleTask){
      if(!remote){task.taskConflict={reason:'missing',local:sent};continue;}
      const theirs=remoteFields(remote),base=task.googleTask.base||theirs;
      const {merged,conflicts}=mergeFields(base,sent,theirs);
      // A deletion conflicts with any independently changed remote/local writing.
      if((sent.deleted!==base.deleted&&!same(theirs,base))||(theirs.deleted!==base.deleted&&!same(sent,base)))conflicts.push('deleted');
      if(conflicts.length){task.taskConflict={reason:'changed',fields:[...new Set(conflicts)],local:sent,remote:theirs,etag:remote.etag};continue;}
      if(task.taskConflict){task.taskConflict={...task.taskConflict,local:sent,remote:theirs,etag:remote.etag};continue;} // Explicit review is required.
      Object.assign(task,merged);task.googleTask.etag=remote.etag;task.googleTask.base=theirs;
      if(theirs.deleted){task.deleted=true;continue;}
      if(same(merged,theirs))continue;
      if(merged.parentId!==theirs.parentId){task.taskSyncError='Changing an existing subtask parent requires review; original parent retained.';continue;}
      // Parents with subtasks are never deleted implicitly by the API.
      if(merged.deleted&&remote.assignmentInfo){task.taskSyncError='Delete this assigned task in Google after reviewing its source document or space.';continue;}
      if(merged.deleted&&records.some(r=>!r.deleted&&r.parent===remote.id)){task.taskSyncError='Delete or move the subtasks first, then delete this parent.';continue;}
      await checkpoint();
      try{
       const result=await api(path+'/'+encodeURIComponent(remote.id),{method:merged.deleted?'DELETE':'PATCH',headers:{'If-Match':remote.etag},...(merged.deleted?{}:{body:JSON.stringify(body(merged))})});if(!valid())return;
       task.googleTask.base=merged.deleted?merged:remoteFields(result);task.googleTask.etag=result?.etag||remote.etag;delete task.taskSyncError;
      }catch(e){if(e.status===412)task.taskConflict={reason:'changed-during-save',local:fields(task)};else task.taskSyncError=e.message;}
     }else if(!task.deleted){
      if(task.parentId){const parent=state.tasks.find(p=>p.id===task.parentId||p.googleTask?.id===task.parentId&&p.listId===key);if(!parent?.googleTask||parent.parentId||parent.deleted){task.taskSyncError='Sync a top-level parent in this list first.';continue;}task.parentId=parent.googleTask.id;sent.parentId=task.parentId;}
      // Tasks insert has no idempotency key. Persist an intent BEFORE POST; never
      // blindly retry after a lost response, reload, or account switch.
      task.taskSyncUncertain={kind:'create',time:new Date().toISOString()};await checkpoint();
      try{const result=await api(path+(task.parentId?'?parent='+encodeURIComponent(task.parentId):''),{method:'POST',body:JSON.stringify(body(sent))});if(!valid())return;
       task.googleTask={account,list:list.id,id:result.id,etag:result.etag,base:remoteFields(result)};delete task.taskSyncUncertain;delete task.taskSyncError;
      }catch(e){if(e.status&&e.status<500&&![408,429].includes(e.status))delete task.taskSyncUncertain;task.taskSyncError=e.message;}
     }
     await checkpoint();
    }
   }
   await checkpoint();status(state.tasks.some(t=>t.taskConflict||t.taskSyncError||t.taskSyncUncertain)||state.settings.taskLists.some(l=>l.googleList?.account===account&&l.unavailable)?'Google Tasks · review needed':'Google Tasks synchronised');
  }catch(e){status(e.message);throw e;}finally{busy=false;}
 }
 return {sync,get busy(){return busy;}};
}
