import {drawInkStroke} from './idea-workspace.js?v=0.4.4';
import {createVoiceRecorder} from './voice-recorder.js?v=0.4.4';
const actionIcons={
 'custom-layout':'M3 3h18v18H3zM3 9h18M9 9v12',
 'custom-library':'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
 'planner-root':'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
 'planner-home':'M3 6h6l2 3h10v12H3z',
 'planner-pin':'m8 3 8 0-1 6 4 4H5l4-4zM12 13v9',
 'planner-copy':'M8 8h13v13H8zM16 8V3H3v13h5',
 'custom-form-duplicate':'M8 8h13v13H8zM16 8V3H3v13h5',
 'template-save':'M3 3h15l3 3v15H3zM7 3v6h10V3M7 21v-7h10v7',
 'template-save-sheet':'M3 3h15l3 3v15H3zM7 3v6h10V3M7 21v-7h10v7',
 'template-update':'M20 7a9 9 0 1 0 1 8M20 2v6h-6',
 'planner-archive':'M3 3h18v5H3zM5 8v13h14V8M9 12h6'
};
const actionCaptions={'custom-library':'Build','planner-root':'Tools','planner-home':'Forms','planner-copy':'Copy','custom-form-duplicate':'Copy','template-save':'Template','template-save-sheet':'Save','template-update':'Update','planner-archive':'Archive'};
const drawingIcons={pen:'M12 3l8 8-6 9-4 1-7-7 1-4zM3 21l8-8M10 12h4',pencil:'m15 5 4 4M4 20l4-1L21 6l-3-3L5 16z',eraser:'m4 14 9-10 8 7-9 10H7zM9 10l8 7M12 21h9',undo:'M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12',redo:'m15 5 5 5-5 5M20 10H10a6 6 0 0 0 0 12',clear:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',size:'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6'};
const drawingIcon=name=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${drawingIcons[name]}"/></svg>`;
const recordContent=label=>`<span class="record-control" aria-hidden="true"><span></span></span><span>${label}</span>`;
export function compactFormToolbar(html){
 return html.replace(/<button([^>]+)>([^<]*)<\/button>/g,(whole,attrs,label)=>{
  const name=attrs.match(/\bdata-([a-z-]+)(?:=|\s|$)/)?.[1],path=actionIcons[name];
  if(!path)return whole;
  const title=label.trim(),iconPath=name==='custom-layout'?(title==='Edit layout'?'m4 16 12-12 4 4-12 12-5 1zM13 7l4 4':'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0'):name==='template-save'?'M4 3h11l5 5v13H4zM14 3v6h6M12 11l1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5L7 14.5l3.5-.5z':path;
  attrs=attrs.replace(/\s(?:aria-label|title)="[^"]*"/g,'').replace(/class="([^"]*)"/,(_,classes)=>`class="${classes} form-icon-action"`);
  const caption=name==='custom-layout'?(title==='Edit layout'?'Edit':'View'):name==='planner-pin'?(/^(Unpin|Remove)/.test(title)?'Unpin':'Pin'):actionCaptions[name]||title;
  return `<button${attrs} aria-label="${title}" title="${title}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${iconPath}"/></svg><span class="form-action-label" aria-hidden="true">${caption}</span></button>`;
 });
}
const COMPONENTS={
 note:{label:'Note',icon:'▤',title:'Notes',size:'wide'},
 checklist:{label:'Tick-list',icon:'☑',title:'Checklist',size:'wide'},
 drawing:{label:'Freehand drawing',icon:'✎',title:'Drawing',size:'wide'},
 voice:{label:'Voice memo',icon:'●',title:'Voice memo',size:'wide'},
 rating:{label:'Visual rating',icon:'★',title:'Confidence',size:'wide'},
 stopwatch:{label:'Stopwatch',icon:'◷',title:'Stopwatch',size:'wide'},
 deadline:{label:'Date & deadline',icon:'◫',title:'Deadline',size:'wide'},
 location:{label:'Address & location',icon:'⌖',title:'Location',size:'wide'}
};

const clone=value=>structuredClone(value);
const safeId=value=>String(value||'').replace(/[^a-zA-Z0-9-]/g,'');
const component=(type,id)=>({id:safeId(id),type,title:COMPONENTS[type]?.title||'Component',size:COMPONENTS[type]?.size||'wide',ratingStyle:'stars',items:type==='checklist'?[{id:safeId(id)+'-item',label:'First item'}]:[]});

export function blankDefinition(title='My planning page'){return {version:1,title,components:[]};}
export function parseDefinition(raw,title='My planning page'){
 try{const value=JSON.parse(raw);if(value?.version===1&&Array.isArray(value.components))return {...value,title:value.title||title,components:value.components.filter(c=>c&&COMPONENTS[c.type]&&safeId(c.id)).map(c=>({...c,id:safeId(c.id)}))};}catch{}
 return blankDefinition(title);
}
export const serialiseDefinition=value=>JSON.stringify(value);
export function addComponent(definition,type,id){if(!COMPONENTS[type])return clone(definition);const next=clone(definition);next.components.push(component(type,id));return next;}
export function moveComponent(definition,id,direction){const next=clone(definition),index=next.components.findIndex(c=>c.id===id),target=index+direction;if(index<0||target<0||target>=next.components.length)return next;[next.components[index],next.components[target]]=[next.components[target],next.components[index]];return next;}
export function removeComponent(definition,id){const next=clone(definition),index=next.components.findIndex(c=>c.id===id);if(index<0)return {definition:next,removed:null,index:-1};const [removed]=next.components.splice(index,1);return {definition:next,removed,index};}
export function duplicateComponent(definition,id,newId){const next=clone(definition),index=next.components.findIndex(c=>c.id===id);if(index<0)return next;const copy=clone(next.components[index]);copy.id=safeId(newId);copy.title+=' copy';next.components.splice(index+1,0,copy);return next;}
export function definitionFromTemplate(template,flow,title=template.title){
 const prefix=String(template.id||'form').replace(/[^a-z0-9-]/gi,'');
 return {version:1,title,sourceTemplate:template.id,components:[
  {id:`${prefix}-context`,type:'note',title:flow?.contextTitle||'Planning notes',size:'wide'},
  {id:`${prefix}-actions`,type:'checklist',title:flow?.tableTitle||'Actions',size:'wide',items:(flow?.columns||template.columns||['Action']).map((label,i)=>({id:`${prefix}-item-${i}`,label}))},
  {id:`${prefix}-deadline`,type:'deadline',title:'Target date',size:'wide'},
  {id:`${prefix}-review`,type:'rating',title:'Progress',size:'wide',ratingStyle:'percentage'}
 ]};
}

export function deadlineStatus(value,today=new Date()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return '';
 const start=new Date(today.getFullYear(),today.getMonth(),today.getDate()),end=new Date(value+'T00:00:00');
 const days=Math.round((end-start)/86400000);
 return days===0?'Due today':days>0?`${days} day${days===1?'':'s'} remaining`:`${Math.abs(days)} day${days===-1?'':'s'} overdue`;
}

function control(key,c,esc){return `<div class="custom-component-actions"><button type="button" data-custom-move="${c.id}" data-direction="-1" aria-label="Move ${esc(c.title)} up">↑</button><button type="button" data-custom-move="${c.id}" data-direction="1" aria-label="Move ${esc(c.title)} down">↓</button><button type="button" data-custom-duplicate="${c.id}" aria-label="Copy ${esc(c.title)}" title="Copy component"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/></svg><span>Copy</span></button><button type="button" data-custom-resize="${c.id}" aria-label="Resize ${esc(c.title)}">↔</button><button type="button" class="danger" data-custom-remove="${c.id}" aria-label="Remove ${esc(c.title)}">×</button><span class="custom-drag-handle" draggable="true" data-custom-drag="${c.id}" title="Drag to reorder">⋮⋮</span></div>`;}
function entryKey(form,c,field='value'){return `form:${form}:custom:${c.id}:${field}`;}
function titleInput(c,esc){return `<input class="custom-component-title" data-custom-title="${c.id}" value="${esc(c.title)}" aria-label="Component heading" maxlength="100">`;}

export function renderComponent({form,component:c,entry,esc,polished=false}){
 const key=entryKey(form,c),head=`<header>${polished?`<h2>${esc(c.title)}</h2>`:titleInput(c,esc)}${polished?'':control(form,c,esc)}</header>`;
 let body='';
 if(c.type==='note')body=`<textarea class="ruled custom-note" data-entry="${key}" aria-label="${esc(c.title)}" placeholder="Write, dictate or use iPad Scribble…">${esc(entry(key))}</textarea>`;
 if(c.type==='checklist'){
  const items=c.items||[],done=items.filter(item=>entry(entryKey(form,c,'checked-'+item.id))==='yes').length;
  body=`<div class="custom-progress"><progress value="${done}" max="${Math.max(1,items.length)}"></progress><span>${done}/${items.length}</span></div><div class="custom-checklist">${items.map(item=>`<div class="custom-check-row"><button type="button" class="habit-check ${entry(entryKey(form,c,'checked-'+item.id))==='yes'?'checked':''}" data-custom-check="${c.id}" data-item="${item.id}" aria-pressed="${entry(entryKey(form,c,'checked-'+item.id))==='yes'}">${entry(entryKey(form,c,'checked-'+item.id))==='yes'?'✓':''}</button><input data-custom-item-label="${c.id}" data-item="${item.id}" value="${esc(item.label)}" aria-label="Checklist item"><button type="button" data-custom-item-move="${c.id}" data-item="${item.id}" data-direction="-1" aria-label="Move item up">↑</button><button type="button" data-custom-item-move="${c.id}" data-item="${item.id}" data-direction="1" aria-label="Move item down">↓</button><button type="button" data-custom-item-remove="${c.id}" data-item="${item.id}" aria-label="Remove item">×</button></div>`).join('')}</div><button type="button" class="text-action" data-custom-item-add="${c.id}">+ Add item</button>`;
 }
 if(c.type==='drawing')body=`<div class="custom-ink-toolbar" role="toolbar" aria-label="Drawing tools">${[['pen','Ink pen'],['pencil','Pencil'],['eraser','Eraser']].map(([tool,label])=>`<button type="button" data-custom-ink-tool="${tool}" data-component="${c.id}" aria-label="${label}" title="${label}" aria-pressed="${tool==='pen'}">${drawingIcon(tool)}</button>`).join('')}<label class="custom-ink-colour" title="Ink colour"><span class="sr-only">Ink colour</span><input type="color" data-custom-ink-colour="${c.id}" value="#313a41" aria-label="Ink colour"></label><details class="custom-size-picker"><summary aria-label="Pen and eraser thickness" title="Thickness">${drawingIcon('size')}<output>3</output></summary><label>Thickness <output data-size-value>3</output><input type="range" min="1" max="40" step="1" value="3" data-custom-ink-size="${c.id}" aria-label="Pen and eraser size"></label></details>${[['undo','Undo'],['redo','Redo'],['clear','Clear drawing']].map(([tool,label])=>`<button type="button" data-custom-ink-${tool}="${c.id}" aria-label="${label}" title="${label}">${drawingIcon(tool)}</button>`).join('')}</div><canvas class="custom-drawing-canvas" data-custom-canvas="${c.id}" aria-label="${esc(c.title)} drawing area"></canvas>`;
 if(c.type==='voice'){
  const audio=entry(entryKey(form,c,'audio')),name=entry(entryKey(form,c,'name'))||c.title,duration=entry(entryKey(form,c,'duration'))||'0:00';
  body=`<div class="custom-voice"><input data-entry="${entryKey(form,c,'name')}" value="${esc(name)}" aria-label="Voice memo name"><span data-voice-duration="${c.id}">${esc(duration)}</span><button type="button" data-custom-record="${c.id}">${recordContent(audio?'Record again':'Record')}</button>${audio?`<audio controls src="${esc(audio)}"></audio><button type="button" data-custom-audio-delete="${c.id}" class="text-action danger">Delete recording</button>`:''}</div>`;
 }
 if(c.type==='rating'){
  const value=entry(key)||'0',style=c.ratingStyle||'stars';
  body=`${polished?'':`<label class="custom-rating-style">Rating style<select data-custom-rating-select="${c.id}" aria-label="Rating style"><option value="stars" ${style==='stars'?'selected':''}>Stars</option><option value="percentage" ${style==='percentage'?'selected':''}>Percentage</option><option value="levels" ${style==='levels'?'selected':''}>Low / Med / High</option></select></label>`}${style==='stars'?`<div class="custom-stars">${[1,2,3,4,5].map(n=>`<button type="button" data-custom-rating="${c.id}" data-value="${n}" aria-pressed="${Number(value)===n}">${Number(value)>=n?'★':'☆'}</button>`).join('')}</div>`:style==='percentage'?`<label class="custom-slider"><input type="range" min="0" max="100" value="${Number(value)||0}" data-entry="${key}"><output>${Number(value)||0}%</output></label>`:`<div class="custom-levels">${['Low','Medium','High'].map(label=>`<button type="button" data-custom-rating="${c.id}" data-value="${label}" aria-pressed="${value===label}">${label}</button>`).join('')}</div>`}`;
 }
 if(c.type==='stopwatch'){
  const elapsed=Number(entry(entryKey(form,c,'elapsed')))||0,running=entry(entryKey(form,c,'running'))==='yes';
  body=`<div class="custom-stopwatch"><output data-stopwatch="${c.id}" data-elapsed="${elapsed}" data-running="${running}" data-started="${esc(entry(entryKey(form,c,'started')))}">${formatTime(elapsed)}</output><button type="button" data-custom-stopwatch="${c.id}" data-command="${running?'pause':'start'}">${running?'Pause':elapsed?'Resume':'Start'}</button><button type="button" data-custom-stopwatch="${c.id}" data-command="reset">Reset</button></div>`;
 }
 if(c.type==='deadline'){
  const value=entry(key),status=deadlineStatus(value);
  body=`<div class="custom-deadline"><input type="date" data-entry="${key}" value="${esc(value)}" aria-label="${esc(c.title)} date"><span class="deadline-badge ${status.includes('overdue')?'overdue':''}">${esc(status||'Choose a date')}</span><button type="button" data-custom-calendar="${c.id}" ${value?'':'disabled'}>Add to calendar</button></div>`;
 }
 if(c.type==='location'){
  const address=entry(key),description=entry(entryKey(form,c,'description')),maps=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  body=`<div class="custom-location"><input data-entry="${key}" value="${esc(address)}" placeholder="Address" aria-label="Address"><input data-entry="${entryKey(form,c,'description')}" value="${esc(description)}" placeholder="Location description (optional)" aria-label="Location description"><a class="secondary" data-custom-map="${c.id}" href="${maps}" target="_blank" rel="noopener" ${address?'':'hidden'}>Open directions in Google Maps</a></div>`;
 }
 return `<section class="custom-component size-${esc(c.size||'wide')}" data-custom-component="${c.id}" data-custom-drop="${c.id}">${head}<div class="custom-component-body">${body}</div></section>`;
}

export function renderBuilder({record,definition,entry,esc,undoAvailable=false,editingTemplate=''}){
 const polished=definition.presentation==='form'&&entry(`form:${record.key}:layout-edit`)!=='yes';
 const library=Object.entries(COMPONENTS).map(([type,item])=>`<button type="button" data-custom-add="${type}"><span>${item.icon}</span><strong>${item.label}</strong></button>`).join('');
 return compactFormToolbar(`<div class="custom-builder ${polished?'polished-form':''}"><div class="planner-toolbar"><button class="secondary" data-custom-layout>${polished?'Edit layout':'View form'}</button><button class="secondary form-secondary-action" data-custom-library>Build Your Own</button><button class="secondary" data-planner-pin="${record.key}" aria-pressed="${record.pinned}">${record.pinned?'Unpin form':'Pin as notebook tab'}</button><button class="primary form-secondary-action" data-template-save>Save as Template</button><button class="secondary form-secondary-action" data-template-save-sheet>Save sheet</button>${editingTemplate?`<button class="secondary form-secondary-action" data-template-update="${esc(editingTemplate)}">Update Template</button>`:''}<button class="secondary form-secondary-action" data-custom-form-duplicate="${record.key}">Duplicate form</button>${undoAvailable?'<button class="secondary" data-custom-undo>Undo removal</button>':''}<button class="form-delete" data-planner-delete="${record.key}" aria-label="Delete form" title="Delete form"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg><span class="form-delete-label">Delete</span></button></div><div class="custom-form-name"><label>Form name<input data-entry="form:${record.key}:title" value="${esc(record.title)}" maxlength="120"></label><span>Saved automatically</span></div><details class="custom-component-library" ${polished?'hidden':'open'}><summary>Add a component</summary><div>${library}</div></details><div class="custom-page" data-custom-page>${polished?`<div class="form-letterhead"><span class="form-wordmark">u · unbound</span><h1>${esc(record.title)}</h1><span>Your space to plan</span></div>`:''}${definition.components.map(c=>renderComponent({form:record.key,component:c,entry,esc,polished})).join('')||'<div class="custom-empty"><strong>Your page is ready.</strong><span>Add a component above to begin arranging it.</span></div>'}</div></div>`);
}

export function renderCustomLibrary({records,esc}){
 const active=records.filter(r=>!r.archived),archived=records.filter(r=>r.archived);
 return `<div class="custom-library"><div class="planner-toolbar"><button class="primary" data-custom-new>+ New custom form</button></div><p class="planner-intro">Arrange notes, checklists, drawings, voice memos and practical widgets on your own notebook page.</p><div class="planner-cards">${active.map(r=>`<button class="planner-card" data-planner-open="${r.key}"><strong>${r.pinned?'★ ':''}${esc(r.title)}</strong><span>Custom planning page</span></button>`).join('')||'<p class="empty-note">Create your first custom planning page.</p>'}</div>${archived.length?`<details><summary>Archived custom forms (${archived.length})</summary>${archived.map(r=>`<button class="planner-saved-item" data-planner-open="${r.key}">${esc(r.title)}</button>`).join('')}</details>`:''}</div>`;
}

export function formatTime(ms){const total=Math.max(0,Math.floor(Number(ms||0)/1000)),hours=Math.floor(total/3600),minutes=Math.floor(total%3600/60),seconds=total%60;return hours?`${hours}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`:`${minutes}:${String(seconds).padStart(2,'0')}`;}

export function createPlanningBuilder(options){
 const {entries,ink,save,render,toast,id,esc,schedule}=options;let removed=null,dragged=null,timers=[],voiceTimer=null;
 const definitionKey=form=>`form:${form}:custom-definition`;
 const get=form=>parseDefinition(entries()[definitionKey(form)],entries()[`form:${form}:title`]);
 const set=(form,value)=>{entries()[definitionKey(form)]=serialiseDefinition(value);save();};
 const current=()=>options.current();
 const finish=form=>{const def=get(form);entries()[definitionKey(form)]=serialiseDefinition({...def,presentation:'form'});entries()[`form:${form}:layout-edit`]='no';};
 const create=(title='My planning page',definition=blankDefinition(title))=>{const key=id();entries()[`form:${key}:type`]='custom';entries()[`form:${key}:title`]=title;entries()[definitionKey(key)]=serialiseDefinition({...definition,title});save();options.open(key);return key;};
 const updateComponent=(form,componentId,fn)=>{const def=get(form),index=def.components.findIndex(c=>c.id===componentId);if(index<0)return;fn(def.components[index],def);set(form,def);};
 const handle=async data=>{
  const form=current();
  if('customLibrary'in data){options.library();return true;}
  if('customNew'in data){create();return true;}
  if('customLayout'in data){const def=get(form),polished=def.presentation==='form'&&entries()[`form:${form}:layout-edit`]!=='yes';def.presentation='form';set(form,def);entries()[`form:${form}:layout-edit`]=polished?'yes':'no';save();render();return true;}
  if(data.customAdd){const def=addComponent(get(form),data.customAdd,id());set(form,def);render();return true;}
  if(data.customMove){set(form,moveComponent(get(form),data.customMove,Number(data.direction)));render();return true;}
  if(data.customDuplicate){const newId=id(),prefix=`form:${form}:custom:${data.customDuplicate}:`,target=`form:${form}:custom:${newId}:`;set(form,duplicateComponent(get(form),data.customDuplicate,newId));for(const [key,value] of Object.entries(entries()))if(key.startsWith(prefix))entries()[target+key.slice(prefix.length)]=value;save();render();return true;}
  if(data.customResize){updateComponent(form,data.customResize,c=>c.size=c.size==='compact'?'wide':c.size==='wide'?'tall':'compact');render();return true;}
  if(data.customRemove){const result=removeComponent(get(form),data.customRemove);removed={form,component:result.removed,index:result.index};set(form,result.definition);render();toast('Component removed. Undo is available.');return true;}
  if('customUndo'in data&&removed?.component){const def=get(removed.form);def.components.splice(Math.max(0,removed.index),0,removed.component);set(removed.form,def);removed=null;render();return true;}
  if(data.customItemAdd){updateComponent(form,data.customItemAdd,c=>{c.items??=[];c.items.push({id:id(),label:'New item'});});render();return true;}
  if(data.customItemMove){updateComponent(form,data.customItemMove,c=>{const items=c.items||[],from=items.findIndex(item=>item.id===data.item),to=from+Number(data.direction);if(from>=0&&to>=0&&to<items.length)[items[from],items[to]]=[items[to],items[from]];});render();return true;}
  if(data.customItemRemove){updateComponent(form,data.customItemRemove,c=>c.items=(c.items||[]).filter(item=>item.id!==data.item));render();return true;}
  if(data.customCheck){const key=`form:${form}:custom:${data.customCheck}:checked-${data.item}`;entries()[key]=entries()[key]==='yes'?'no':'yes';save();render();return true;}
  if(data.customRatingStyle){updateComponent(form,data.customRatingStyle,c=>c.ratingStyle=data.style);render();return true;}
  if(data.customRating){entries()[`form:${form}:custom:${data.customRating}:value`]=String(data.value);save();render();return true;}
  if(data.customStopwatch){const base=`form:${form}:custom:${data.customStopwatch}:`,elapsed=Number(entries()[base+'elapsed'])||0,running=entries()[base+'running']==='yes';if(data.command==='reset'){entries()[base+'elapsed']='0';entries()[base+'running']='no';delete entries()[base+'started'];}else if(data.command==='pause'&&running){entries()[base+'elapsed']=String(elapsed+(Date.now()-Number(entries()[base+'started']||Date.now())));entries()[base+'running']='no';delete entries()[base+'started'];}else if(data.command==='start'&&!running){entries()[base+'started']=String(Date.now());entries()[base+'running']='yes';}save();render();return true;}
  if(data.customCalendar){const c=get(form).components.find(x=>x.id===data.customCalendar),date=entries()[`form:${form}:custom:${c.id}:value`];schedule({title:c.title,date,source:`form:${form}:custom:${c.id}`});return true;}
  if(data.customAudioDelete){if(voice.session){toast('Stop recording before deleting a voice memo.');return true;}delete entries()[`form:${form}:custom:${data.customAudioDelete}:audio`];delete entries()[`form:${form}:custom:${data.customAudioDelete}:duration`];save();render();return true;}
  if(data.customRecord){await recordAudio(form,data.customRecord);return true;}
  if(data.customFormDuplicate){const old=data.customFormDuplicate,source=get(old),title=(entries()[`form:${old}:title`]||'Custom form')+' copy',next=create(title,{...clone(source),title}),prefix=`form:${old}:custom:`;for(const [key,value] of Object.entries(entries()))if(key.startsWith(prefix))entries()[`form:${next}:custom:`+key.slice(prefix.length)]=value;for(const [key,value] of Object.entries(ink()))if(key.startsWith(`planner:${old}:`))ink()[`planner:${next}:`+key.slice(`planner:${old}:`.length)]=clone(value);save();render();return true;}
  if(data.customInkUndo||data.customInkRedo||data.customInkClear||data.customInkTool)return true;
  return false;
 };
 const input=target=>{
  const form=current();if(!form)return false;
  if(target.dataset.customTitle){updateComponent(form,target.dataset.customTitle,c=>c.title=target.value);return true;}
  if(target.dataset.customItemLabel){updateComponent(form,target.dataset.customItemLabel,c=>{const item=(c.items||[]).find(x=>x.id===target.dataset.item);if(item)item.label=target.value;});return true;}
  if(target.getAttribute('aria-label')==='Address'){const componentId=target.dataset.entry?.split(':').at(-2),link=document.querySelector(`[data-custom-map="${componentId}"]`);if(link){link.href=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target.value)}`;link.hidden=!target.value.trim();}}
  if(target.matches('.custom-slider input'))target.nextElementSibling.textContent=target.value+'%';
  return false;
 };
 const changed=target=>{if(target.dataset.customRatingSelect){updateComponent(current(),target.dataset.customRatingSelect,c=>c.ratingStyle=target.value);render();return;}if(target.dataset.entry?.startsWith(`form:${current()}:custom:`)&&(target.type==='date'||target.getAttribute('aria-label')==='Address'))render();};
 const voice=createVoiceRecorder({
  capture:()=>{
   if(!globalThis.isSecureContext)throw Error('Voice recording needs a secure HTTPS connection. Open Unbound directly in Safari or Chrome.');
   if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Voice recording is unavailable here. Open Unbound directly in Safari or Chrome and allow microphone access.');
   return navigator.mediaDevices.getUserMedia({audio:true});
  },
  Recorder:()=>window.MediaRecorder,
  readBlob:blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('Could not read the recording. Your previous memo has been kept.'));reader.readAsDataURL(blob);}),
  store:(session,data,duration)=>{
   if(options.blocked?.()||(options.notebookIdentity?.()||entries())!==session.notebook)throw Error('The notebook changed while recording. The memo was not added to a different account.');
   if(!get(session.form).components.some(c=>c.id===session.component&&c.type==='voice'))throw Error('The voice memo component was removed before recording finished.');
   const base=`form:${session.form}:custom:${session.component}:`;
   entries()[base+'audio']=data;entries()[base+'duration']=formatTime(duration);save();
  },
  changed:()=>{updateVoiceControls();if(!voice.session)render();},error:toast
 });
 const recordAudio=(form,componentId)=>voice.toggle(form,componentId,options.notebookIdentity?.()||entries());
 function updateVoiceControls(){
  clearInterval(voiceTimer);voiceTimer=null;
  const update=()=>{
   const session=voice.session;
   document.querySelectorAll('[data-custom-record]').forEach(button=>{
    const active=session?.form===current()&&session?.component===button.dataset.customRecord;
    const audio=entries()[`form:${current()}:custom:${button.dataset.customRecord}:audio`];
    const label=active?(session.phase==='requesting'?'Allow microphone…':session.phase==='saving'?'Saving…':'Stop recording'):(audio?'Record again':'Record');
    button.innerHTML=recordContent(label);button.setAttribute('aria-label',label);
    button.disabled=!!session&&(!active||session.phase!=='recording');
    button.setAttribute('aria-pressed',String(active&&session.phase==='recording'));
    const wrapper=button.closest('.custom-voice');
    wrapper?.querySelectorAll('[data-custom-audio-delete]').forEach(b=>b.disabled=!!session);
    if(active){const duration=wrapper?.querySelector('[data-voice-duration]');if(duration)duration.textContent=session.phase==='recording'?formatTime(Date.now()-session.startedAt):session.phase==='requesting'?'Waiting for microphone permission':'Saving recording…';}
   });
   let banner=document.getElementById('planning-voice-status');
   if(!session){banner?.remove();return;}
   if(!banner){banner=document.createElement('div');banner.id='planning-voice-status';banner.className='planning-voice-status';banner.setAttribute('role','status');document.body.append(banner);}
   banner.replaceChildren();const label=document.createElement('span');label.textContent=session.phase==='recording'?`Voice memo · Recording ${formatTime(Date.now()-session.startedAt)}`:session.phase==='requesting'?'Voice memo · Allow microphone access in your browser':'Voice memo · Saving…';banner.append(label);
   const stop=document.createElement('button');stop.type='button';stop.textContent=session.phase==='requesting'?'Cancel':'Stop recording';stop.disabled=session.phase==='saving';stop.onclick=()=>session.phase==='requesting'?voice.cancel():voice.stop();banner.append(stop);
  };
  update();if(voice.session?.phase==='recording')voiceTimer=setInterval(update,500);
 }
 globalThis.addEventListener?.('beforeunload',event=>{if(voice.session){event.preventDefault();event.returnValue='';}});
 const mount=()=>{
  observers.forEach(o=>o.disconnect());observers.length=0;updateVoiceControls();
  timers.forEach(clearInterval);timers=[];
  document.querySelectorAll('[data-stopwatch][data-running="true"]').forEach(output=>{const tick=()=>output.textContent=formatTime(Number(output.dataset.elapsed||0)+Date.now()-Number(output.dataset.started||Date.now()));tick();timers.push(setInterval(tick,1000));});
  document.querySelectorAll('[data-custom-drag]').forEach(handle=>handle.addEventListener('dragstart',()=>dragged=handle.dataset.customDrag));
  document.querySelectorAll('[data-custom-drop]').forEach(target=>{target.addEventListener('dragover',e=>e.preventDefault());target.addEventListener('drop',e=>{e.preventDefault();if(!dragged||dragged===target.dataset.customDrop)return;const def=get(current()),from=def.components.findIndex(c=>c.id===dragged),to=def.components.findIndex(c=>c.id===target.dataset.customDrop);const [item]=def.components.splice(from,1);def.components.splice(to,0,item);set(current(),def);dragged=null;render();});});
  document.querySelectorAll('[data-custom-canvas]').forEach(canvas=>mountCanvas(canvas,current()));
 };
 const canvasHistory=new Map(),observers=[];
 function mountCanvas(canvas,form){
  const componentId=canvas.dataset.customCanvas,key=`planner:${form}:${componentId}`,toolbar=canvas.previousElementSibling;let paths=clone(ink()[key]||[]),history=canvasHistory.get(key)||{undo:[],redo:[]},active=null,tool='pen',colour='#313a41',size=3,ctx,pointer=null;canvasHistory.set(key,history);let undo=history.undo,redo=history.redo;const stylusOnly=navigator.maxTouchPoints>1&&!options.allowFinger?.();canvas.style.touchAction='none';const persistInk=(live=false)=>{ink()[key]=live?paths:clone(paths);if(live&&options.protectInk)options.protectInk(key,paths);else save();};
  const draw=()=>{const rect=canvas.getBoundingClientRect(),scale=devicePixelRatio||1;canvas.width=Math.max(1,Math.round(rect.width*scale));canvas.height=Math.max(1,Math.round(rect.height*scale));ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.lineCap='round';ctx.lineJoin='round';ctx.clearRect(0,0,rect.width,rect.height);for(const path of paths)drawInkStroke(ctx,path,rect.width,rect.height);ctx.globalCompositeOperation='source-over';};
  let frame=0;const requestDraw=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(canvas.isConnected)draw();});};
  const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height,p:e.pressure||.5};};const observer=new ResizeObserver(draw);observer.observe(canvas);observers.push(observer);draw();
  canvas.onpointerdown=e=>{if(e.button>0||pointer!==null||(stylusOnly&&e.pointerType==='touch'))return;pointer=e.pointerId;paths=clone(ink()[key]||[]);e.preventDefault();canvas.setPointerCapture(e.pointerId);undo.push(clone(paths));redo.length=0;active={tool,color:colour,size:tool==='eraser'?size*3:size,points:[point(e)]};paths.push(active);persistInk(true);requestDraw();};canvas.onpointermove=e=>{if(active&&e.pointerId===pointer){for(const sample of (e.getCoalescedEvents?.()?.length?e.getCoalescedEvents():[e]))active.points.push(point(sample));persistInk(true);requestDraw();}};canvas.onpointerup=canvas.onpointercancel=e=>{if(e.pointerId!==pointer)return;pointer=null;if(active){active=null;persistInk();}if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
  toolbar?.querySelectorAll('[data-custom-ink-tool]').forEach(button=>button.onclick=()=>{tool=button.dataset.customInkTool;toolbar.querySelectorAll('[data-custom-ink-tool]').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));});
  canvas.addEventListener('notebook-content-updated',()=>{if(!active){paths=clone(ink()[key]||[]);draw();}});
  const sizePicker=toolbar?.querySelector('[data-custom-ink-size]');if(sizePicker)sizePicker.oninput=e=>{size=Number(e.target.value);toolbar.querySelectorAll('.custom-size-picker output').forEach(o=>o.textContent=size);};
  toolbar?.querySelectorAll('.custom-size-picker').forEach(p=>p.addEventListener('toggle',()=>{if(p.open)toolbar.querySelectorAll('.custom-size-picker').forEach(other=>{if(other!==p)other.open=false;});}));
  const picker=toolbar?.querySelector('[data-custom-ink-colour]');if(picker)picker.oninput=e=>colour=e.target.value;
  const undoButton=toolbar?.querySelector('[data-custom-ink-undo]');if(undoButton)undoButton.onclick=()=>{if(undo.length){redo.push(clone(paths));paths=undo.pop();ink()[key]=paths;save();draw();}};
  const redoButton=toolbar?.querySelector('[data-custom-ink-redo]');if(redoButton)redoButton.onclick=()=>{if(redo.length){undo.push(clone(paths));paths=redo.pop();ink()[key]=paths;save();draw();}};
  const clearButton=toolbar?.querySelector('[data-custom-ink-clear]');if(clearButton)clearButton.onclick=()=>{undo.push(clone(paths));redo.length=0;paths=[];ink()[key]=paths;save();draw();};
 }
 return {create,get,set,finish,handle,input,changed,mount,hasUndo:()=>!!removed,definitionFromTemplate,cancelRecording:()=>voice.cancel()};
}

export {COMPONENTS};
