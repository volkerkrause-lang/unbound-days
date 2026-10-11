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
export function resolveConflict(data,conflict,choice){
 let node=data;
 const path=conflict.path,len=path.length-1;
 for(let i=0;i<len;i++){
  const k=path[i];
  if(Array.isArray(node)){
   let found=undefined;
   for(let j=0;j<node.length;j++){
    if(node[j]?.id===k){found=node[j];break;}
   }
   node=found;
  }else node=node?.[k];
 }
 const key=path[len],value=copy(conflict[choice]);
 if(Array.isArray(node)){
  let idx=-1;
  for(let j=0;j<node.length;j++){
   if(node[j]?.id===key){idx=j;break;}
  }
  if(value===undefined){
   if(idx>=0)node.splice(idx,1);
  }else if(idx<0)node.push(value);
  else node[idx]=value;
 }else if(node!==undefined&&node!==null){
  if(value===undefined)delete node[key];
  else node[key]=value;
 }
}
export const unwrapBackup=x=>x?.format==='unbound-days-snapshot-v2'?x.data:x;
