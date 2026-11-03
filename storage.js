// A second transactional copy survives a broken localStorage record. Neither
// browser store replaces an off-device backup.
export const validNotebook=s=>s?.version===1&&Array.isArray(s.events)&&Array.isArray(s.tasks)&&Array.isArray(s.notes)&&s.entries&&s.settings&&s.ink;
export function chooseRecovery(local,mirror){
  const a=validNotebook(local)?local:null,b=validNotebook(mirror)?mirror:null;
  if(!a)return b;if(!b)return a;
  const time=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?Date.parse(value):null;
  const aTime=time(a.savedAt),bTime=time(b.savedAt);
  if(aTime===null)return bTime===null?a:b;
  if(bTime===null)return a;
  return bTime>aTime?b:a;
}
let database;
function open(){if(!database)database=new Promise((resolve,reject)=>{
  const r=indexedDB.open('unbound-days-recovery',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('copies');
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
});return database;}
export async function readMirror(key='latest'){if(key==='unbound-days-v1')key='latest';const db=await open();return new Promise((resolve,reject)=>{const r=db.transaction('copies').objectStore('copies').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function writeMirror(data,key='latest'){if(key==='unbound-days-v1')key='latest';const db=await open();return new Promise((resolve,reject)=>{const t=db.transaction('copies','readwrite');t.objectStore('copies').put(data,key);t.oncomplete=resolve;t.onabort=t.onerror=()=>reject(t.error||Error('Recovery copy failed'));});}

export async function deleteMirror(key){const db=await open();return new Promise((resolve,reject)=>{const t=db.transaction('copies','readwrite');t.objectStore('copies').delete(key);t.oncomplete=resolve;t.onabort=t.onerror=()=>reject(t.error||Error('Could not delete local recovery copy'));});}
