/* Gym records use the notebook's existing string entries and per-field recovery. */
export const exerciseTypes=['strength','cardio'];
export const loadModes=['weight','assistance','added'];
const setFields=['weight','reps','rest','duration','distance','speed','incline','level','custom','done','previous'];
export function gymExercises(entries,form){
 const prefix=`form:${form}:gym:exercise:`;
 return Object.keys(entries).filter(k=>k.startsWith(prefix)&&k.endsWith(':name')&&entries[k.replace(/name$/,'active')]!=='no').map(k=>{
  const stem=k.slice(0,-4),get=field=>entries[stem+field]||'';
  const sets=Object.keys(entries).filter(s=>s.startsWith(stem+'set:')&&s.endsWith(':active')&&entries[s]==='yes').map(s=>{const key=s.slice(0,-6);return {stem:key,id:key.slice((stem+'set:').length,-1),...Object.fromEntries(setFields.map(f=>[f,entries[key+f]||'']))};});
  return {stem,id:stem.slice(prefix.length,-1),name:get('name'),type:get('type')||'strength',mode:get('mode')||'weight',order:Number(get('order'))||0,notes:get('notes'),metric:get('metric'),sets};
 }).sort((a,b)=>a.order-b.order);
}
export function validateRoutine(data){
 if(!data||data.format!=='unbound-gym-routine'||data.version!==1||!Array.isArray(data.exercises)||data.exercises.length>100)throw Error('Choose an Unbound gym routine file.');
 const bounded=(value,max=500)=>typeof value==='string'&&value.length<=max;
 if(!bounded(data.title||'',120))throw Error('Routine title is too long.');
 for(const ex of data.exercises){
  if(!ex||!bounded(ex.name,160)||!ex.name.trim()||!exerciseTypes.includes(ex.type)||!loadModes.includes(ex.mode||'weight')||!Array.isArray(ex.sets)||!ex.sets.length||ex.sets.length>100||!bounded(ex.notes||'',2000)||!bounded(ex.metric||'',80))throw Error('Invalid exercise in routine.');
  for(const set of ex.sets){if(!set||typeof set!=='object'||Array.isArray(set))throw Error('Invalid set in routine.');for(const f of setFields)if(set[f]!==undefined&&!bounded(set[f],200))throw Error('Invalid set value.');for(const f of ['weight','reps','rest','distance','speed','incline','level','custom'])if(set[f]&&!/^\d+(\.\d+)?$/.test(set[f]))throw Error('Use non-negative numbers for training settings.');if(set.duration&&!/^\d{1,3}:[0-5]\d$/.test(set.duration))throw Error('Use minutes:seconds for duration.');}
 }
 return data;
}
export function addGymExercise(entries,form,exercise,id){
 const stem=`form:${form}:gym:exercise:${id()}:`;
 Object.assign(entries,Object.fromEntries(Object.entries({name:exercise.name,type:exercise.type,mode:exercise.mode||'weight',active:'yes',order:String(gymExercises(entries,form).length+1),notes:exercise.notes||'',metric:exercise.metric||''}).map(([k,v])=>[stem+k,v])));
 for(const set of exercise.sets||[{}])addGymSet(entries,stem,set,id);
 return stem;
}
export function addGymSet(entries,exerciseStem,values,id){
 const stem=exerciseStem+'set:'+id()+':';entries[stem+'active']='yes';for(const f of setFields)entries[stem+f]=f==='done'?'no':String(values[f]||'');return stem;
}
export function importRoutine(entries,form,data,id){
 validateRoutine(data);if(gymExercises(entries,form).length)throw Error('Import into an empty gym form to preserve your current exercises.');
 for(const ex of data.exercises)addGymExercise(entries,form,ex,id);
 if(data.title)entries[`form:${form}:title`]=data.title;
}
export function exportRoutine(entries,form){return {format:'unbound-gym-routine',version:1,title:entries[`form:${form}:title`]||'Gym session',exercises:gymExercises(entries,form).map(ex=>({name:ex.name,type:ex.type,mode:ex.mode,notes:ex.notes,metric:ex.metric,sets:ex.sets.map(s=>Object.fromEntries(setFields.filter(f=>!['done','previous'].includes(f)).map(f=>[f,s[f]])))}))};}
export function newGymSession(entries,from,to){
 const prefix=`form:${from}:`,target=`form:${to}:`;
 for(const [k,v] of Object.entries(entries))if(k.startsWith(prefix)&&!['pinned','archived'].includes(k.slice(prefix.length)))entries[target+k.slice(prefix.length)]=v;
 entries[target+'title']=(entries[prefix+'title']||'Gym session')+' · next session';entries[target+'gym:date']='';
 for(const ex of gymExercises(entries,to))for(const set of ex.sets){set.previous=ex.type==='cardio'?[set.duration&&set.duration+' min:sec',set.distance&&set.distance+' km'].filter(Boolean).join(' · '):[set.weight!==''?set.weight+' kg'+(ex.mode==='assistance'?' assistance':ex.mode==='added'?' added':''):'',set.reps&&set.reps+' reps'].filter(Boolean).join(' · ');entries[set.stem+'previous']=set.previous;entries[set.stem+'done']='no';}
}
export function createGymController(api){
 const {entries,form,esc,save,render,id,openModal,closeModal,toast,confirmAction}=api;
 const key=()=>`form:${form()}:gym:`;
 const get=k=>entries()[k]||'';
 const numeric=(stem,field,label)=>`<input type="number" min="0" ${field==='reps'?'step="1"':'step="any"'} inputmode="decimal" data-entry="${esc(stem+field)}" data-no-quick-delete aria-label="${esc(label)}" value="${esc(get(stem+field))}">`;
 const text=(k,label,type='text')=>`<label>${esc(label)}<input type="${type}" data-entry="${esc(k)}" data-no-quick-delete aria-label="${esc(label)}" value="${esc(get(k))}"></label>`;
 const select=(k,label,options)=>`<label>${esc(label)}<select data-entry="${esc(k)}" aria-label="${esc(label)}">${options.map(([v,t])=>`<option value="${v}" ${get(k)===v?'selected':''}>${t}</option>`).join('')}</select></label>`;
 function gymRender(){
  const exs=gymExercises(entries(),form()),sets=exs.flatMap(e=>e.sets),done=sets.filter(s=>s.done==='yes').length;
  return `<div class="gym-planner"><div class="gym-meta">${text(key()+'date','Session date','date')}${text(key()+'focus','Focus / session goal')}</div><div class="gym-actions"><button class="primary" data-gym-add>Add exercise</button><button class="secondary" data-gym-import>Import routine</button>${exs.length?'<button class="secondary" data-gym-next>New session from this plan</button><button class="text-action" data-gym-export>Export routine</button>':''}</div>${sets.length?`<div class="gym-progress"><span>${done} / ${sets.length} sets complete</span><progress value="${done}" max="${sets.length}" aria-label="Session progress"></progress></div>`:'<p class="empty-note">Add strength exercises or cardio, or import a saved routine.</p>'}<div class="gym-exercises">${exs.map(ex=>{
   const cardio=ex.type==='cardio',loadLabel=ex.mode==='assistance'?'Assistance kg':ex.mode==='added'?'Added kg':'Weight kg';
   const columns=cardio?['Time mm:ss','Distance km','Speed km/h','Incline %','Level',ex.metric||'Other','Rest sec']: [loadLabel,'Reps','Rest sec'];
   const fields=cardio?['duration','distance','speed','incline','level','custom','rest']:['weight','reps','rest'];
   return `<section class="gym-exercise"><div class="gym-exercise-head"><h2>${esc(ex.name)}</h2><span>${cardio?'Cardio':ex.mode==='assistance'?'Assisted strength':ex.mode==='added'?'Bodyweight + load':'Strength'}</span></div><details class="gym-settings"><summary>Exercise details</summary><div class="gym-settings-grid">${text(ex.stem+'name','Exercise name')}${select(ex.stem+'type','Training type',[['strength','Strength'],['cardio','Cardio']])}${cardio?text(ex.stem+'metric','Other metric label / unit'):select(ex.stem+'mode','How load is measured',[['weight','Weight lifted'],['assistance','Assistance'],['added','Added to bodyweight']])}${text(ex.stem+'notes','Notes / machine setup')}</div><div class="gym-actions"><button class="text-action" data-gym-move="${ex.id}" data-gym-direction="-1">Move up</button><button class="text-action" data-gym-move="${ex.id}" data-gym-direction="1">Move down</button><button class="text-action" data-gym-remove="${ex.id}">Remove exercise</button></div></details><div class="gym-table-scroll"><table class="gym-table"><thead><tr><th>Done</th><th>Set</th>${columns.map(c=>`<th>${esc(c)}</th>`).join('')}<th>Previous</th><th><span class="gym-sr">Remove</span></th></tr></thead><tbody>${ex.sets.map((s,i)=>`<tr class="${s.done==='yes'?'gym-set-done':''}"><td><button class="habit-check ${s.done==='yes'?'checked':''}" data-gym-done="${ex.id}" data-gym-set="${s.id}" aria-label="${s.done==='yes'?'Uncheck':'Complete'} ${esc(ex.name)} set ${i+1}" aria-pressed="${s.done==='yes'}">${s.done==='yes'?'✓':''}</button></td><th scope="row">${i+1}</th>${fields.map((f,j)=>`<td>${f==='duration'?`<input type="text" placeholder="mm:ss" inputmode="text" pattern="[0-9]{1,3}:[0-5][0-9]" data-entry="${esc(s.stem+f)}" data-no-quick-delete aria-label="${esc(ex.name+' set '+(i+1)+' '+columns[j])}" value="${esc(get(s.stem+f))}">`:numeric(s.stem,f,ex.name+' set '+(i+1)+' '+columns[j])}</td>`).join('')}<td class="gym-previous">${esc(s.previous)||'—'}</td><td><button class="text-action" data-gym-remove-set="${ex.id}" data-gym-set="${s.id}" aria-label="Remove ${esc(ex.name)} set ${i+1}">×</button></td></tr>`).join('')}</tbody></table></div><button class="text-action" data-gym-add-set="${ex.id}">+ Add ${cardio?'interval':'set'}</button></section>`;
  }).join('')}</div><details class="planner-extra"><summary>Session notes</summary>${text(key()+'notes','How did the session go?')}</details><input id="gym-routine-file" type="file" accept="application/json,.json" hidden></div>`;
 }
 function handle(data){
  if(!Object.keys(data).some(k=>k.startsWith('gym')))return false;
  const exs=gymExercises(entries(),form());
  if('gymAdd'in data){openModal('Add exercise',`<form id="gym-add-form"><label>Exercise name<input name="name" type="text" required maxlength="160" autofocus placeholder="Machine or exercise"></label><label>Training type<select name="type"><option value="strength">Strength</option><option value="cardio">Cardio</option></select></label><label>Strength load<select name="mode"><option value="weight">Weight lifted</option><option value="assistance">Assistance</option><option value="added">Added to bodyweight</option></select></label><div class="modal-footer"><button class="secondary" type="button" data-action="close-modal">Cancel</button><button class="primary" type="submit">Add exercise</button></div></form>`);return true;}
  if('gymImport'in data){api.fileInput().click();return true;}
  if('gymExport'in data){api.download('Gym-routine.json',JSON.stringify(exportRoutine(entries(),form()),null,2),'application/json');return true;}
  if('gymNext'in data){const next=id();newGymSession(entries(),form(),next);api.select(next);save();render();toast('New session created; completed sets reset and previous values kept.');return true;}
  const exercise=exs.find(e=>e.id===(data.gymDone||data.gymAddSet||data.gymRemove||data.gymRemoveSet||data.gymMove));if(!exercise)return true;
  const set=exercise.sets.find(s=>s.id===data.gymSet);
  if(data.gymDone&&set)entries()[set.stem+'done']=set.done==='yes'?'no':'yes';
  if(data.gymAddSet){if(exercise.sets.length>=100){toast('This exercise has reached 100 sets.');return true;}addGymSet(entries(),exercise.stem,exercise.sets.at(-1)||{},id);}
  if(data.gymMove){const i=exs.indexOf(exercise),j=i+Number(data.gymDirection);if(j>=0&&j<exs.length){[exs[i],exs[j]]=[exs[j],exs[i]];exs.forEach((e,n)=>entries()[e.stem+'order']=String(n+1));}}
  if(data.gymRemove||data.gymRemoveSet&&set){const k=data.gymRemove?exercise.stem+'active':set.stem+'active';confirmAction(data.gymRemove?'Remove exercise?':'Remove set?','Values are kept in this notebook for recovery.',()=>{api.snapshot();entries()[k]='no';save();render();});return true;}
  save();render();return true;
 }
 function submit(f,data){if(f.id!=='gym-add-form')return false;if(!data.name?.trim()||!exerciseTypes.includes(data.type)||!loadModes.includes(data.mode))throw Error('Choose a valid exercise and type.');if(gymExercises(entries(),form()).length>=100)throw Error('This form has reached 100 exercises.');addGymExercise(entries(),form(),{name:data.name.trim(),type:data.type,mode:data.mode,sets:[{}]},id);save();closeModal();render();return true;}
 function changed(el){const k=el.dataset.entry;if(!k?.startsWith(key()))return;if(el.type==='number'&&el.value){const n=Number(el.value);if(!Number.isFinite(n)||n<0||k.endsWith(':reps')&&!Number.isInteger(n)){entries()[k]='';save();toast('Use a non-negative number; repetitions must be whole numbers.');}}if(k.endsWith(':duration')&&el.value&&!/^\d{1,3}:[0-5]\d$/.test(el.value))toast('Write cardio time as minutes:seconds, for example 20:00.');render();}
 async function importFile(file){if(!file)return;if(file.size>1024*1024)throw Error('Routine file is too large.');const data=validateRoutine(JSON.parse(await file.text()));importRoutine(entries(),form(),data,id);save();render();toast('Routine imported. All sets start unchecked.');}
 return {render:gymRender,handle,submit,changed,importFile};
}
