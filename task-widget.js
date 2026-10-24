import {lists} from './tasks.js';
export function createTaskWidget({getState,save,render,esc,today,openTasks}){
 let expanded=false;
 const mode=()=>getState().settings.taskView?.widgetList||'today';
 const current=()=>['today','all',...lists(getState()).map(l=>l.id)].includes(mode())?mode():'today';
 function html(){
  const state=getState(),list=current(),rows=state.tasks.filter(t=>!t.deleted&&!t.done&&(list==='today'?t.date===today():list==='all'||(t.listId||'local')===list));
  const label=list==='today'?'Today':list==='all'?'All tasks':lists(state).find(l=>l.id===list)?.title;
  return `<aside class="task-widget" aria-label="Quick tasks"><button class="task-widget-toggle" data-task-widget="toggle" aria-expanded="${expanded}" aria-controls="quick-task-panel"><span aria-hidden="true">✓</span> ${esc(label)} <span class="task-widget-count">${rows.length}</span></button>${expanded?`<section id="quick-task-panel"><header><strong>Quick tasks</strong><button data-task-widget="close" aria-label="Close quick tasks">×</button></header><label>Show<select data-task-widget-list aria-label="Quick tasks list"><option value="today" ${list==='today'?'selected':''}>Today's tasks</option><option value="all" ${list==='all'?'selected':''}>All tasks</option>${lists(state).map(l=>`<option value="${esc(l.id)}" ${list===l.id?'selected':''}>${esc(l.title)}</option>`).join('')}</select></label><div class="task-widget-rows">${rows.slice(0,20).map(t=>`<div><input type="checkbox" data-task-check="${esc(t.id)}" aria-label="Complete ${esc(t.title)}"><button data-edit-task="${esc(t.id)}">${esc(t.title)}</button></div>`).join('')||'<p>No unfinished tasks in this view.</p>'}</div><button class="text-action" data-task-widget="open">Open To do${rows.length>20?` · ${rows.length} tasks`:''}</button></section>`:''}</aside>`;
 }
 function click(d){if(!d.taskWidget)return false;if(d.taskWidget==='open'){expanded=false;openTasks();}else{expanded=d.taskWidget==='toggle'?!expanded:false;render();}return true;}
 function changed(el){if(!el.hasAttribute('data-task-widget-list'))return false;getState().settings.taskView={...getState().settings.taskView,widgetList:el.value};save();render();return true;}
 function refresh(){const node=document.querySelector('.task-widget');if(node&&!node.contains(document.activeElement))node.outerHTML=html();}
 return {html,click,changed,refresh};
}
