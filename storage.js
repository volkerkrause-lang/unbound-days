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

let attachmentDatabase;
function openAttachments(){if(!attachmentDatabase)attachmentDatabase=new Promise((resolve,reject)=>{const r=indexedDB.open('unbound-personal-attachments',1);r.onupgradeneeded=()=>r.result.createObjectStore('attachments');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return attachmentDatabase;}
export async function readAttachment(id){const db=await openAttachments();return new Promise((resolve,reject)=>{const r=db.transaction('attachments').objectStore('attachments').get(id);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});}
export async function listAttachments(){const db=await openAttachments();return new Promise((resolve,reject)=>{const r=db.transaction('attachments').objectStore('attachments').getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);});}
export async function writeAttachment(id,file,{maxTotalBytes=100*1024*1024}={}){
 if(!id||!file||typeof file.size!=='number')throw Error('Attachment could not be stored on this device.');
 if(file.size>15*1024*1024)throw Error('Choose a file smaller than 15 MB.');
 const db=await openAttachments(),current=await listAttachments(),size=current.reduce((sum,item)=>sum+(item.id===id?0:Number(item.file?.size)||0),0)+file.size;
 if(size>maxTotalBytes)throw Error('Local attachment storage is full. Connect cloud storage or remove older device-only files.');
 return new Promise((resolve,reject)=>{const tx=db.transaction('attachments','readwrite');tx.objectStore('attachments').put({id,file,savedAt:Date.now()},id);tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('Attachment could not be saved on this device.'));});
}
export async function deleteAttachment(id){const db=await openAttachments();return new Promise((resolve,reject)=>{const tx=db.transaction('attachments','readwrite');tx.objectStore('attachments').delete(id);tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('Could not remove local attachment.'));});}
