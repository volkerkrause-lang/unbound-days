const COMPONENTS={
 note:{label:'Note',icon:'▤',title:'Notes',size:'wide'},
 checklist:{label:'Tick-list',icon:'☑',title:'Checklist',size:'wide'},
 drawing:{label:'Freehand drawing',icon:'✎',title:'Drawing',size:'wide'},
 voice:{label:'Voice memo',icon:'●',title:'Voice memo',size:'compact'},
 rating:{label:'Visual rating',icon:'★',title:'Confidence',size:'compact'},
 stopwatch:{label:'Stopwatch',icon:'◷',title:'Stopwatch',size:'compact'},
 deadline:{label:'Date & deadline',icon:'◫',title:'Deadline',size:'compact'},
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
  {id:`${prefix}-deadline`,type:'deadline',title:'Target date',size:'compact'},
  {id:`${prefix}-review`,type:'rating',title:'Progress',size:'compact',ratingStyle:'percentage'}
 ]};
}

export function deadlineStatus(value,today=new Date()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return '';
 const start=new Date(today.getFullYear(),today.getMonth(),today.getDate()),end=new Date(value+'T00:00:00');
 const days=Math.round((end-start)/86400000);
 return days===0?'Due today':days>0?`${days} day${days===1?'':'s'} remaining`:`${Math.abs(days)} day${days===-1?'':'s'} overdue`;
}

function control(key,c,esc){return `<div class="custom-component-actions"><button type="button" data-custom-move="${c.id}" data-direction="-1" aria-label="Move ${esc(c.title)} up">↑</button><button type="button" data-custom-move="${c.id}" data-direction="1" aria-label="Move ${esc(c.title)} down">↓</button><button type="button" data-custom-duplicate="${c.id}" aria-label="Duplicate ${esc(c.title)}">⧉</button><button type="button" data-custom-resize="${c.id}" aria-label="Resize ${esc(c.title)}">↔</button><button type="button" class="danger" data-custom-remove="${c.id}" aria-label="Remove ${esc(c.title)}">×</button><span class="custom-drag-handle" draggable="true" data-custom-drag="${c.id}" title="Drag to reorder">⋮⋮</span></div>`;}
function entryKey(form,c,field='value'){return `form:${form}:custom:${c.id}:${field}`;}
function titleInput(c,esc){return `<input class="custom-component-title" data-custom-title="${c.id}" value="${esc(c.title)}" aria-label="Component heading" maxlength="100">`;}

export function renderComponent({form,component:c,entry,esc}){
 const key=entryKey(form,c),head=`<header>${titleInput(c,esc)}${control(form,c,esc)}</header>`;
 let body='';
 if(c.type==='note')body=`<textarea class="ruled custom-note" data-entry="${key}" aria-label="${esc(c.title)}" placeholder="Write, dictate or use iPad Scribble…">${esc(entry(key))}</textarea>`;
 if(c.type==='checklist'){
  const items=c.items||[],done=items.filter(item=>entry(entryKey(form,c,'checked-'+item.id))==='yes').length;
  body=`<div class="custom-progress"><progress value="${done}" max="${Math.max(1,items.length)}"></progress><span>${done}/${items.length}</span></div><div class="custom-checklist">${items.map(item=>`<div class="custom-check-row"><button type="button" class="habit-check ${entry(entryKey(form,c,'checked-'+item.id))==='yes'?'checked':''}" data-custom-check="${c.id}" data-item="${item.id}" aria-pressed="${entry(entryKey(form,c,'checked-'+item.id))==='yes'}">${entry(entryKey(form,c,'checked-'+item.id))==='yes'?'✓':''}</button><input data-custom-item-label="${c.id}" data-item="${item.id}" value="${esc(item.label)}" aria-label="Checklist item"><button type="button" data-custom-item-move="${c.id}" data-item="${item.id}" data-direction="-1" aria-label="Move item up">↑</button><button type="button" data-custom-item-move="${c.id}" data-item="${item.id}" data-direction="1" aria-label="Move item down">↓</button><button type="button" data-custom-item-remove="${c.id}" data-item="${item.id}" aria-label="Remove item">×</button></div>`).join('')}</div><button type="button" class="text-action" data-custom-item-add="${c.id}">+ Add item</button>`;
 }
 if(c.type==='drawing')body=`<div class="custom-ink-toolbar"><button type="button" data-custom-ink-tool="pen" data-component="${c.id}" aria-pressed="true">Pen</button><button type="button" data-custom-ink-tool="eraser" data-component="${c.id}">Eraser</button><input type="color" data-custom-ink-colour="${c.id}" value="#313a41" aria-label="Ink colour"><button type="button" data-custom-ink-undo="${c.id}">Undo</button><button type="button" data-custom-ink-redo="${c.id}">Redo</button><button type="button" data-custom-ink-clear="${c.id}">Clear</button></div><canvas class="custom-drawing-canvas" data-custom-canvas="${c.id}" aria-label="${esc(c.title)} drawing area"></canvas>`;
 if(c.type==='voice'){
  const audio=entry(entryKey(form,c,'audio')),name=entry(entryKey(form,c,'name'))||c.title,duration=entry(entryKey(form,c,'duration'))||'0:00';
  body=`<div class="custom-voice"><input data-entry="${entryKey(form,c,'name')}" value="${esc(name)}" aria-label="Voice memo name"><span data-voice-duration="${c.id}">${esc(duration)}</span><button type="button" data-custom-record="${c.id}">${audio?'Record again':'Record'}</button>${audio?`<audio controls src="${esc(audio)}"></audio><button type="button" data-custom-audio-delete="${c.id}" class="text-action danger">Delete recording</button>`:''}</div>`;
 }
 if(c.type==='rating'){
  const value=entry(key)||'0',style=c.ratingStyle||'stars';
  body=`<div class="custom-rating-style"><button type="button" data-custom-rating-style="${c.id}" data-style="stars" aria-pressed="${style==='stars'}">Stars</button><button type="button" data-custom-rating-style="${c.id}" data-style="percentage" aria-pressed="${style==='percentage'}">Percentage</button><button type="button" data-custom-rating-style="${c.id}" data-style="levels" aria-pressed="${style==='levels'}">Low / Med / High</button></div>${style==='stars'?`<div class="custom-stars">${[1,2,3,4,5].map(n=>`<button type="button" data-custom-rating="${c.id}" data-value="${n}" aria-pressed="${Number(value)===n}">${Number(value)>=n?'★':'☆'}</button>`).join('')}</div>`:style==='percentage'?`<label class="custom-slider"><input type="range" min="0" max="100" value="${Number(value)||0}" data-entry="${key}"><output>${Number(value)||0}%</output></label>`:`<div class="custom-levels">${['Low','Medium','High'].map(label=>`<button type="button" data-custom-rating="${c.id}" data-value="${label}" aria-pressed="${value===label}">${label}</button>`).join('')}</div>`}`;
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
  body=`<div class="custom-location"><input data-entry="${key}" value="${esc(address)}" placeholder="Address" aria-label="Address"><input data-entry="${entryKey(form,c,'description')}" value="${esc(description)}" placeholder="Location description (optional)" aria-label="Location description">${address?`<a class="secondary" href="${maps}" target="_blank" rel="noopener">Open directions in Google Maps</a>`:''}</div>`;
 }
 return `<section class="custom-component size-${esc(c.size||'wide')}" data-custom-component="${c.id}" data-custom-drop="${c.id}">${head}<div class="custom-component-body">${body}</div></section>`;
}

export function renderBuilder({record,definition,entry,esc,undoAvailable=false}){
 const library=Object.entries(COMPONENTS).map(([type,item])=>`<button type="button" data-custom-add="${type}"><span>${item.icon}</span><strong>${item.label}</strong></button>`).join('');
 return `<div class="custom-builder"><div class="planner-toolbar"><button class="secondary" data-custom-library>Build Your Own</button><button class="secondary" data-planner-home>Planning Tools</button><button class="secondary" data-planner-pin="${record.key}" aria-pressed="${record.pinned}">${record.pinned?'Unpin form':'Pin as notebook tab'}</button><button class="secondary" data-custom-form-duplicate="${record.key}">Duplicate form</button>${undoAvailable?'<button class="secondary" data-custom-undo>Undo removal</button>':''}<button class="text-action" data-planner-archive="${record.key}">${record.archived?'Restore form':'Archive form'}</button></div><div class="custom-form-name"><label>Form name<input data-entry="form:${record.key}:title" value="${esc(record.title)}" maxlength="120"></label><span>Saved automatically</span></div><details class="custom-component-library" open><summary>Add a component</summary><div>${library}</div></details><div class="custom-page" data-custom-page>${definition.components.map(c=>renderComponent({form:record.key,component:c,entry,esc})).join('')||'<div class="custom-empty"><strong>Your page is ready.</strong><span>Add a component above to begin arranging it.</span></div>'}</div></div>`;
}

export function renderCustomLibrary({records,esc}){
 const active=records.filter(r=>!r.archived),archived=records.filter(r=>r.archived);
 return `<div class="custom-library"><div class="planner-toolbar"><button class="secondary" data-planner-home>Planning Tools</button><button class="primary" data-custom-new>+ New custom form</button></div><p class="planner-intro">Arrange notes, checklists, drawings, voice memos and practical widgets on your own notebook page.</p><div class="planner-cards">${active.map(r=>`<button class="planner-card" data-planner-open="${r.key}"><strong>${r.pinned?'★ ':''}${esc(r.title)}</strong><span>Custom planning page</span></button>`).join('')||'<p class="empty-note">Create your first custom planning page.</p>'}</div>${archived.length?`<details><summary>Archived custom forms (${archived.length})</summary>${archived.map(r=>`<button class="planner-saved-item" data-planner-open="${r.key}">${esc(r.title)}</button>`).join('')}</details>`:''}</div>`;
}

export function formatTime(ms){const total=Math.max(0,Math.floor(Number(ms||0)/1000)),hours=Math.floor(total/3600),minutes=Math.floor(total%3600/60),seconds=total%60;return hours?`${hours}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`:`${minutes}:${String(seconds).padStart(2,'0')}`;}

export function createPlanningBuilder(options){
 const {entries,ink,save,render,toast,id,esc,schedule}=options;let removed=null,dragged=null,recorders=new Map(),timers=[];
 const definitionKey=form=>`form:${form}:custom-definition`;
 const get=form=>parseDefinition(entries()[definitionKey(form)],entries()[`form:${form}:title`]);
 const set=(form,value)=>{entries()[definitionKey(form)]=serialiseDefinition(value);save();};
 const current=()=>options.current();
 const create=(title='My planning page',definition=blankDefinition(title))=>{const key=id();entries()[`form:${key}:type`]='custom';entries()[`form:${key}:title`]=title;entries()[definitionKey(key)]=serialiseDefinition({...definition,title});save();options.open(key);return key;};
 const updateComponent=(form,componentId,fn)=>{const def=get(form),index=def.components.findIndex(c=>c.id===componentId);if(index<0)return;fn(def.components[index],def);set(form,def);};
 const handle=async data=>{
  const form=current();
  if('customLibrary'in data){options.library();return true;}
  if('customNew'in data){create();return true;}
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
  if(data.customCalendar){const c=get(form).components.find(x=>x.id===data.customCalendar),date=entries()[`form:${form}:custom:${c.id}:value`];schedule({title:c.title,date});return true;}
  if(data.customAudioDelete){delete entries()[`form:${form}:custom:${data.customAudioDelete}:audio`];delete entries()[`form:${form}:custom:${data.customAudioDelete}:duration`];save();render();return true;}
  if(data.customRecord){await recordAudio(form,data.customRecord);return true;}
  if(data.customFormDuplicate){const old=data.customFormDuplicate,source=get(old),title=(entries()[`form:${old}:title`]||'Custom form')+' copy',next=create(title,{...clone(source),title}),prefix=`form:${old}:custom:`;for(const [key,value] of Object.entries(entries()))if(key.startsWith(prefix))entries()[`form:${next}:custom:`+key.slice(prefix.length)]=value;for(const [key,value] of Object.entries(ink()))if(key.startsWith(`planner:${old}:`))ink()[`planner:${next}:`+key.slice(`planner:${old}:`.length)]=clone(value);save();render();return true;}
  if(data.customInkUndo||data.customInkRedo||data.customInkClear||data.customInkTool)return true;
  return false;
 };
 const input=target=>{
  const form=current();if(!form)return false;
  if(target.dataset.customTitle){updateComponent(form,target.dataset.customTitle,c=>c.title=target.value);return true;}
  if(target.dataset.customItemLabel){updateComponent(form,target.dataset.customItemLabel,c=>{const item=(c.items||[]).find(x=>x.id===target.dataset.item);if(item)item.label=target.value;});return true;}
  if(target.matches('.custom-slider input'))target.nextElementSibling.textContent=target.value+'%';
  return false;
 };
 const changed=target=>{if(target.dataset.entry?.startsWith(`form:${current()}:custom:`)&&(target.type==='date'||target.getAttribute('aria-label')==='Address'))render();};
 async function recordAudio(form,componentId){
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('Voice recording is not available in this browser.');return;}
  if(recorders.has(componentId)){recorders.get(componentId).stop();return;}
  const stream=await navigator.mediaDevices.getUserMedia({audio:true}),chunks=[],started=Date.now(),recorder=new MediaRecorder(stream);
  recorders.set(componentId,recorder);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>{stream.getTracks().forEach(track=>track.stop());recorders.delete(componentId);const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'}),reader=new FileReader();reader.onload=()=>{entries()[`form:${form}:custom:${componentId}:audio`]=String(reader.result);entries()[`form:${form}:custom:${componentId}:duration`]=formatTime(Date.now()-started);save();render();};reader.readAsDataURL(blob);};recorder.start();toast('Recording… tap Stop when finished.');const button=document.querySelector(`[data-custom-record="${componentId}"]`);if(button)button.textContent='Stop';
 }
 const mount=()=>{
  timers.forEach(clearInterval);timers=[];
  document.querySelectorAll('[data-stopwatch][data-running="true"]').forEach(output=>{const tick=()=>output.textContent=formatTime(Number(output.dataset.elapsed||0)+Date.now()-Number(output.dataset.started||Date.now()));tick();timers.push(setInterval(tick,1000));});
  document.querySelectorAll('[data-custom-drag]').forEach(handle=>handle.addEventListener('dragstart',()=>dragged=handle.dataset.customDrag));
  document.querySelectorAll('[data-custom-drop]').forEach(target=>{target.addEventListener('dragover',e=>e.preventDefault());target.addEventListener('drop',e=>{e.preventDefault();if(!dragged||dragged===target.dataset.customDrop)return;const def=get(current()),from=def.components.findIndex(c=>c.id===dragged),to=def.components.findIndex(c=>c.id===target.dataset.customDrop);const [item]=def.components.splice(from,1);def.components.splice(to,0,item);set(current(),def);dragged=null;render();});});
  document.querySelectorAll('[data-custom-canvas]').forEach(canvas=>mountCanvas(canvas,current()));
 };
 function mountCanvas(canvas,form){
  const componentId=canvas.dataset.customCanvas,key=`planner:${form}:${componentId}`,toolbar=canvas.previousElementSibling;let paths=clone(ink()[key]||[]),undo=[],redo=[],active=null,tool='pen',colour='#313a41',ctx;
  const draw=()=>{const rect=canvas.getBoundingClientRect(),scale=devicePixelRatio||1;canvas.width=Math.max(1,Math.round(rect.width*scale));canvas.height=Math.max(1,Math.round(rect.height*scale));ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.lineCap='round';ctx.lineJoin='round';ctx.clearRect(0,0,rect.width,rect.height);for(const path of paths){ctx.globalCompositeOperation=path.tool==='eraser'?'destination-out':'source-over';ctx.strokeStyle=path.color;ctx.lineWidth=path.tool==='eraser'?20:3;ctx.beginPath();path.points.forEach((p,i)=>i?ctx.lineTo(p.x*rect.width,p.y*rect.height):ctx.moveTo(p.x*rect.width,p.y*rect.height));ctx.stroke();}ctx.globalCompositeOperation='source-over';};
  const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};};new ResizeObserver(draw).observe(canvas);draw();
  canvas.onpointerdown=e=>{if(e.button>0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);undo.push(clone(paths));redo=[];active={tool,color:colour,points:[point(e)]};paths.push(active);draw();};canvas.onpointermove=e=>{if(active){active.points.push(point(e));draw();}};canvas.onpointerup=canvas.onpointercancel=()=>{if(active){active=null;ink()[key]=paths;save();}};
  toolbar?.querySelectorAll('[data-custom-ink-tool]').forEach(button=>button.onclick=()=>{tool=button.dataset.customInkTool;toolbar.querySelectorAll('[data-custom-ink-tool]').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));});
  const picker=toolbar?.querySelector('[data-custom-ink-colour]');if(picker)picker.oninput=e=>colour=e.target.value;
  const undoButton=toolbar?.querySelector('[data-custom-ink-undo]');if(undoButton)undoButton.onclick=()=>{if(undo.length){redo.push(clone(paths));paths=undo.pop();ink()[key]=paths;save();draw();}};
  const redoButton=toolbar?.querySelector('[data-custom-ink-redo]');if(redoButton)redoButton.onclick=()=>{if(redo.length){undo.push(clone(paths));paths=redo.pop();ink()[key]=paths;save();draw();}};
  const clearButton=toolbar?.querySelector('[data-custom-ink-clear]');if(clearButton)clearButton.onclick=()=>{undo.push(clone(paths));redo=[];paths=[];ink()[key]=paths;save();draw();};
 }
 return {create,get,set,handle,input,changed,mount,hasUndo:()=>!!removed,definitionFromTemplate};
}

export {COMPONENTS};
