// String-backed records participate in existing recovery, account and Drive sync.
const prefix='planning-template:',folderPrefix='planning-folder:';
const clone=x=>structuredClone(x);
export function records(entries,kind='template'){
 const p=kind==='folder'?folderPrefix:prefix;
 return Object.entries(entries).filter(([key])=>key.startsWith(p)).flatMap(([key,value])=>{try{const record=JSON.parse(value);return record&&!record.deleted&&record.id&&record.name?[record]:[];}catch{return [];}});
}
export function putRecord(entries,record,kind='template'){
 const name=String(record.name||'').trim();if(!name)throw Error('Give it a name.');
 const next={...clone(record),name,updatedAt:new Date().toISOString()};
 entries[(kind==='folder'?folderPrefix:prefix)+record.id]=JSON.stringify(next);return next;
}
export function folderDescendants(entries,id){
 const folders=records(entries,'folder'),ids=new Set([id]);let changed=true;
 while(changed){changed=false;for(const f of folders)if(ids.has(f.parent)&&!ids.has(f.id)){ids.add(f.id);changed=true;}}
 return ids;
}
export function moveFolder(entries,id,parent){
 if(parent&&folderDescendants(entries,id).has(parent))throw Error('A folder cannot be moved inside itself.');
 const f=records(entries,'folder').find(x=>x.id===id);if(!f)throw Error('Folder not found.');
 return putRecord(entries,{...f,parent},'folder');
}
export function templateFromDefinition(id,name,description,definition,parent=''){
 return {id,name,description,parent,version:1,definition:clone({...definition,title:name})};
}
export function createTemplateLibrary({entries,save,render,id,esc,openModal,closeModal,builder,current,toast}){
 let folder='',query='';
 const templates=()=>records(entries()),folders=()=>records(entries(),'folder');
 const find=(key,kind)=>records(entries(),kind).find(x=>x.id===key);
 const path=f=>{const names=[],seen=new Set();while(f&&!seen.has(f)){seen.add(f);const r=find(f,'folder');if(!r)break;names.unshift(r.name);f=r.parent;}return names.join(' / ');};
 const destinations=(selected='',exclude='')=>`<option value="">My Forms</option>${folders().filter(f=>!exclude||!folderDescendants(entries(),exclude).has(f.id)).map(f=>`<option value="${esc(f.id)}" ${selected===f.id?'selected':''}>${esc(path(f.id))}</option>`).join('')}`;
 const form=(title,operation,key,body)=>openModal(title,`<form id="template-library-form" data-operation="${operation}" data-id="${esc(key||'')}">${body}<div id="form-error" class="error-text" role="alert"></div><div class="modal-footer"><button type="button" class="secondary" data-action="close-modal">Cancel</button><button class="primary" type="submit">Save</button></div></form>`);
 const nameFields=(r={})=>`<label>Name<input name="name" maxlength="120" required value="${esc(r.name||'')}" autofocus></label><label>Description (optional)<textarea name="description" maxlength="1000">${esc(r.description||'')}</textarea></label><label>Folder<select name="parent">${destinations(r.parent??folder)}</select></label>`;
 function html(){
  if(folder&&!find(folder,'folder'))folder='';
  const matches=templates().filter(t=>query?(t.name+' '+(t.description||'')).toLowerCase().includes(query.toLowerCase()):(t.parent||'')===folder);
  const action=(name,key,label)=>`<button class="text-action" data-template-${name}="${esc(key)}">${label}</button>`;
  return `<section class="my-template-library"><h2>My Forms</h2><p class="planner-guide">Reusable templates. Opening one creates a separate planning sheet.</p><div class="planner-toolbar"><button class="secondary" data-template-folder="">My Forms</button>${folder?`<button class="secondary" data-template-folder="${esc(find(folder,'folder')?.parent||'')}">Up a folder</button><span>${esc(path(folder))}</span>`:''}<button class="secondary" data-template-new-folder>New Folder</button></div><label>Search saved templates<input type="search" id="my-template-search" value="${esc(query)}" data-no-writing-tools></label><div id="my-template-results">${results()}</div></section>`;
  function results(){return `<div class="template-folders">${!query?folders().filter(f=>(f.parent||'')===folder).map(f=>`<div><button class="secondary" data-template-folder="${esc(f.id)}">▱ ${esc(f.name)}</button>${action('folder-rename',f.id,'Rename')}${action('folder-move',f.id,'Move')}${action('folder-delete',f.id,'Delete')}</div>`).join(''):''}</div><div class="planner-cards">${matches.map(t=>`<article class="template-card"><button class="planner-card" data-template-use="${esc(t.id)}"><strong>${esc(t.name)}</strong><span>${esc(t.description||'')}</span><small>${esc((t.definition?.components||[]).map(c=>c.title).join(' · '))}</small></button><div>${action('edit',t.id,'Edit layout')}${action('rename',t.id,'Rename / details')}${action('duplicate',t.id,'Duplicate')}${action('move',t.id,'Move')}${action('delete',t.id,'Delete')}</div></article>`).join('')||'<p class="planner-guide">No templates here yet. Use Save as Template in Build Your Own.</p>'}</div>`;}
 }
 function handle(data){
  if('templateSave'in data){const key=current();form('Save as Template','save',key,nameFields({name:entries()[`form:${key}:title`]||'My form'}));return true;}
  if(data.templateUpdate){const r=find(data.templateUpdate);if(r)form('Update reusable template','update',r.id,`<p>This replaces the template layout with this sheet’s layout. Existing filled sheets remain unchanged.</p>${nameFields(r)}<label><input type="checkbox" name="confirmed" required> Replace the saved template</label>`);return true;}
  if('templateSaveSheet'in data){save();toast('Sheet saved. Check the notebook save status for backup progress.');return true;}
  if('templateFolder'in data){folder=data.templateFolder;query='';render();return true;}
  if('templateNewFolder'in data){form('New Folder','folder-new','',`<label>Folder name<input name="name" maxlength="120" required autofocus></label><label>Parent folder<select name="parent">${destinations(folder)}</select></label>`);return true;}
  for(const [field,kind,op] of [['templateFolderRename','folder','rename'],['templateFolderMove','folder','move'],['templateFolderDelete','folder','delete'],['templateRename','template','rename'],['templateMove','template','move'],['templateDelete','template','delete']]){
   if(!(field in data))continue;const r=find(data[field],kind);if(!r)return true;
   const operation=kind+'-'+op;
   if(op==='delete')form('Delete '+r.name,operation,r.id,`<p>${kind==='folder'?'Delete this folder and its subfolders? Templates inside will be moved to My Forms.':'Delete this reusable template? Existing planning sheets are preserved.'}</p><label><input type="checkbox" name="confirmed" required> Confirm deletion</label>`);
   else if(op==='move')form('Move '+r.name,operation,r.id,`<label>Destination<select name="parent">${destinations(r.parent,kind==='folder'?r.id:'')}</select></label>`);
   else form('Rename '+r.name,operation,r.id,kind==='folder'?`<label>Name<input name="name" required maxlength="120" value="${esc(r.name)}"></label>`:nameFields(r));return true;
  }
  if(data.templateDuplicate){const r=find(data.templateDuplicate);if(r){putRecord(entries(),{...r,id:id(),name:r.name+' copy'});save();render();}return true;}
  if(data.templateUse||data.templateEdit){const r=find(data.templateUse||data.templateEdit);if(r){const key=builder.create(r.name,clone(r.definition));if(data.templateEdit){entries()[`form:${key}:template-edit`]=r.id;save();render();toast('Editing a separate draft. Choose Update Template when ready.');}}return true;}
  return false;
 }
 function submit(formElement,data){
  if(formElement.id!=='template-library-form')return false;
  const op=formElement.dataset.operation,key=formElement.dataset.id;
  if(data.parent&&!find(data.parent,'folder'))throw Error('That folder no longer exists.');
  if(op==='save')putRecord(entries(),templateFromDefinition(id(),data.name,data.description,builder.get(key),data.parent));
  else if(op==='update'){if(!data.confirmed)throw Error('Confirm replacement.');const r=find(key);if(!r)throw Error('Template no longer exists.');putRecord(entries(),{...r,...data,definition:clone({...builder.get(current()),title:data.name})});}
  else if(op==='folder-new')putRecord(entries(),{id:id(),name:data.name,parent:data.parent},'folder');
  else {const kind=op.startsWith('folder-')?'folder':'template',r=find(key,kind);if(!r)throw Error('Item no longer exists.');
   if(op.endsWith('-delete')){if(!data.confirmed)throw Error('Confirm deletion.');if(kind==='folder'){const descendants=folderDescendants(entries(),key);for(const t of templates())if(descendants.has(t.parent))putRecord(entries(),{...t,parent:''});for(const f of folders())if(descendants.has(f.id))putRecord(entries(),{...f,deleted:true},'folder');}else putRecord(entries(),{...r,deleted:true});}
   else if(op==='folder-move')moveFolder(entries(),key,data.parent);
   else putRecord(entries(),{...r,...data},kind);
  }
  save();closeModal();render();toast('Saved.');return true;
 }
 function input(target){if(target.id!=='my-template-search')return;query=target.value;const root=document.querySelector('#my-template-results');if(root){const holder=document.createElement('div');holder.innerHTML=html();root.innerHTML=holder.querySelector('#my-template-results').innerHTML;}}
 return {html,handle,submit,input};
}
