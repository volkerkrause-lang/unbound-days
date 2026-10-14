// Unbound extras stay in notebook settings; legacy task records remain unchanged.
export const colours=['#bc6150','#2f7778','#b58127','#667e4c','#527b9c','#856a96'];
export const defaultList={id:'local',title:'My tasks',colour:'#2f7778'};
export function lists(state){const source=Array.isArray(state.settings.taskLists)?state.settings.taskLists:[];const all=[defaultList,...source.filter(x=>x?.id&&x.id!=='local'&&typeof x.title==='string')];const order=state.settings.taskListOrder||[];const pins=state.settings.taskListPins||[];return all.sort((a,b)=>Number(pins.includes(b.id))-Number(pins.includes(a.id))||(order.indexOf(a.id)<0?9999:order.indexOf(a.id))-(order.indexOf(b.id)<0?9999:order.indexOf(b.id)));}
export function filterTasks(tasks,{list='all',filter='all',today}){return tasks.filter(t=>!t.deleted&&(list==='all'||(t.listId||'local')===list)&&(filter==='completed'?t.done:!t.done)&&(filter==='today'?t.date===today:filter==='upcoming'?t.date>today:filter==='overdue'?t.date&&t.date<today:true));}
export function duplicateTask(task,newId){const {id,google,googleTask,sync,syncHistory,completed,completedAt,deleted,updated,updatedAt,...copy}=structuredClone(task);return {...copy,id:newId,done:false,steps:copy.steps?.map(s=>({...s,id:crypto.randomUUID(),done:false}))};}
export function moveList(order,list,direction){const next=[...order],i=next.indexOf(list),j=i+direction;if(i>=0&&j>=0&&j<next.length)[next[i],next[j]]=[next[j],next[i]];return next;}
export function reschedule(tasks,ids,date){return tasks.map(t=>ids.includes(t.id)?{...t,date}:t);}
