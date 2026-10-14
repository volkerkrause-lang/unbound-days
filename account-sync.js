import {notebookContent,mergeNotebook} from './sync.js';
export const scopeKey=(id)=>id?`unbound-days-v1-account-${id}`:'unbound-days-v1';
export const cloudContent=state=>structuredClone(notebookContent(state));
export async function fingerprint(state){
 const bytes=new TextEncoder().encode(JSON.stringify(cloudContent(state)));
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
// A local revision/base travels atomically with the durable draft. Failed writes
// leave it unchanged, so a reload can safely retry or merge with newer cloud data.
export function reconcile(state,remote,empty){
 const local=cloudContent(state),base=state._cloud?.base||cloudContent(empty);
 const theirs=remote?.data||cloudContent(empty);
 const merged=mergeNotebook(base,local,theirs);
 return {...merged,revision:remote?.revision||0,base:theirs};
}
export function createSync({client,getState,apply,persist,empty,conflict,status,active=()=>true,validate=()=>{}}){
 let busy=false,again=false,timer;
 async function sync(){
  if(!active()||!globalThis.navigator?.onLine)return;
  if(busy){again=true;return;}busy=true;status('Checking cloud…');
  let rounds=0;
  try{
   do{
    if(++rounds>3){status('Cloud busy · retry shortly');break;}
    again=false;const {data:rows,error}=await client.from('notebooks').select('data,revision').limit(1);if(error)throw error;
    if(!active())return;
    const remote=rows?.[0]||null;if(remote)validate(remote.data);
    if(!remote&&!getState()._cloud&&JSON.stringify(cloudContent(getState()))===JSON.stringify(cloudContent(empty()))){status('New account · import or start writing');return;}
    const result=reconcile(getState(),remote,empty());
    if(result.conflicts.length){conflict(result);status('Cloud conflict · review in My Account');return;}
    apply(result.data,{revision:result.revision,base:result.base});await persist();if(!active())return;
    const content=cloudContent(getState());
    if(JSON.stringify(content)===JSON.stringify(result.base)&&remote){status('Saved to cloud');continue;}
    const requestId=crypto.randomUUID();const {data:written,error:writeError}=await client.rpc('save_notebook',{p_data:content,p_expected_revision:result.revision,p_request_id:requestId,p_import_hash:null});
    if(writeError){if(writeError.message?.includes('revision_conflict')){status('Another device changed this notebook · retrying');again=true;continue;}throw writeError;}
    if(!active())return;
    // Preserve any writing made while this request was in flight.
    apply(cloudContent(getState()),{revision:written.revision,base:content});await persist();
    again=JSON.stringify(cloudContent(getState()))!==JSON.stringify(content);
    status(again?'Cloud save pending':'Saved to cloud');
   }while(again&&active());
  }catch(e){status('Saved locally · cloud retry needed');return {error:e};}
  finally{busy=false;}
 }
 function queue(){status('Saved locally · cloud pending');clearTimeout(timer);timer=setTimeout(sync,1500);}
 return {sync,queue,stop(){clearTimeout(timer);},get busy(){return busy;}};
}

// Restore device-only defaults before validating a cloud snapshot.
export const validationNotebook=(content,empty)=>({...empty,...structuredClone(content),settings:{...empty.settings,...structuredClone(content.settings)}});
