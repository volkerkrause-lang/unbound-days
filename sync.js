// Three-way merging preserves unrelated edits and exposes same-field conflicts.
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const copy=x=>x===undefined?undefined:structuredClone(x);
export function notebookContent(s){const {googleClientId,selectedCalendars,defaultCalendar,backupProvider,...settings}=s.settings||{};return {version:1,events:s.events||[],tasks:s.tasks||[],notes:s.notes||[],habits:s.habits||[],entries:s.entries||{},ink:s.ink||{},trash:s.trash||[],bookmarks:s.bookmarks||[],settings};}
export function mergeNotebook(base,local,remote){
 const conflicts=[];
 function merge(b,l,r,path){
  if(same(l,r)||same(b,r))return copy(l);
  if(same(b,l))return copy(r);
  if(Array.isArray(l)&&Array.isArray(r)&&Array.isArray(b)&&[...b,...l,...r].every(x=>x&&typeof x==='object'&&typeof x.id==='string')){
   const bm=new Map(b.map(x=>[x.id,x])),lm=new Map(l.map(x=>[x.id,x])),rm=new Map(r.map(x=>[x.id,x]));
   return [...new Set([...lm.keys(),...rm.keys(),...bm.keys()])].map(k=>merge(bm.get(k),lm.get(k),rm.get(k),[...path,k])).filter(x=>x!==undefined);
  }
  if(b&&l&&r&&![b,l,r].some(Array.isArray)&&[b,l,r].every(x=>typeof x==='object')){
   const result={};for(const k of new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])){const v=merge(b[k],l[k],r[k],[...path,k]);if(v!==undefined)result[k]=v;}return result;
  }
  conflicts.push({path,local:copy(l),remote:copy(r)});return copy(l);
 }
 return {data:merge(base,local,remote,[]),conflicts};
}
export function resolveConflict(data,conflict,choice){let node=data;for(const k of conflict.path.slice(0,-1)){node=Array.isArray(node)?node.find(x=>x.id===k):node[k];}const key=conflict.path.at(-1),value=copy(conflict[choice]);if(Array.isArray(node)){const i=node.findIndex(x=>x.id===key);if(value===undefined){if(i>=0)node.splice(i,1);}else if(i<0)node.push(value);else node[i]=value;}else if(value===undefined)delete node[key];else node[key]=value;}
export const unwrapBackup=x=>x?.format==='unbound-days-snapshot-v2'?x.data:x;
