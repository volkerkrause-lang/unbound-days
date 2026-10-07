// A second transactional copy survives a broken localStorage record. Neither
// browser store replaces an off-device backup.
export const validNotebook=s=>s?.version===1&&Array.isArray(s.events)&&Array.isArray(s.tasks)&&Array.isArray(s.notes)&&s.entries&&s.settings&&s.ink;
export function chooseRecovery(local,mirror){
  const a=validNotebook(local)?local:null,b=validNotebook(mirror)?mirror:null;
  if(!a)return b;if(!b)return a;
  return (b.savedAt||'')>(a.savedAt||'')?b:a;
}
let database;
function open(){if(!database)database=new Promise((resolve,reject)=>{
  const r=indexedDB.open('unbound-days-recovery',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('copies');
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
});return database;}
export async function readMirror(){const db=await open();return new Promise((resolve,reject)=>{const r=db.transaction('copies').objectStore('copies').get('latest');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function writeMirror(data){const db=await open();return new Promise((resolve,reject)=>{const t=db.transaction('copies','readwrite');t.objectStore('copies').put(data,'latest');t.oncomplete=resolve;t.onabort=t.onerror=()=>reject(t.error||Error('Recovery copy failed'));});}
