// Decorative desk layer; independent of notebook layout and cover personalisation.
const KEY='unbound-desk-background-v1';
const dbName='unbound-desk-images';
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(dbName,1);r.onupgradeneeded=()=>r.result.createObjectStore('images');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function storeImage(blob){const db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').put(blob,'selected');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}
async function readImage(){const db=await openDB();const result=await new Promise((resolve,reject)=>{const tx=db.transaction('images','readonly');const req=tx.objectStore('images').get('selected');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});db.close();return result;}
let imageURL;
const style=document.createElement('style');
style.textContent=`
body.desk-enabled{background:#dfc49d!important;background-image:url('a_clean_warmly_lit_top_down_angled_overhead_stil.png')!important;background-size:cover!important;background-position:var(--desk-position,50% 50%)!important;background-attachment:fixed!important}
body.desk-custom{background-image:var(--desk-image)!important;background-size:cover!important;background-position:var(--desk-position,50% 50%)!important}
body.desk-enabled:before{content:'';position:fixed;inset:0;pointer-events:none;background:linear-gradient(115deg,#fff9e62b,transparent 48%,#63401a16);z-index:0}
body.desk-enabled #app{isolation:isolate}
body.desk-enabled .desk-button{touch-action:manipulation}
@media(prefers-reduced-motion:reduce){body.desk-enabled{background-attachment:scroll!important}}
.desk-button{position:fixed;right:12px;bottom:calc(76px + env(safe-area-inset-bottom, 0px));z-index:2147483000;background:#fffaf0eF;border:1px solid #9c866b;border-radius:24px;padding:8px 13px;box-shadow:0 3px 12px #34241733;font:13px system-ui;cursor:pointer}
.desk-menu{position:fixed;right:12px;bottom:calc(120px + env(safe-area-inset-bottom, 0px));z-index:2147483001;background:#fffaf2;padding:16px;border-radius:12px;box-shadow:0 5px 24px #34241755;max-width:min(300px,calc(100vw - 24px));font:14px system-ui}
.desk-menu[hidden]{display:none!important}
.desk-menu label{display:block;margin:10px 0 4px}.desk-menu input[type=range]{width:100%}
.desk-menu button{display:block;padding:9px;margin:3px 0;width:100%;text-align:left;border-radius:6px;background:#eee4d6}
@media(max-width:700px){.desk-button{right:8px;bottom:calc(76px + env(safe-area-inset-bottom, 0px));padding:5px 8px;font-size:11px}}
`;
document.head.append(style);
const button=document.createElement('button');button.className='desk-button';button.textContent='Desk background';button.setAttribute('aria-label','Choose desk background');
const menu=document.createElement('div');menu.className='desk-menu';menu.hidden=true;
menu.innerHTML='<strong>Desk background</strong><button data-desk="wood">Light wooden table</button><button data-desk="upload">Choose your own photograph</button><button data-desk="none">No background</button><input type="file" accept="image/jpeg,image/png,image/webp" hidden><small>Backgrounds do not change notebook dimensions. Default: Unbound sunlit wooden desk photograph.</small>';
document.body.append(button,menu);
// Mount the existing selector beside Personalise cover whenever the cover renders.
button.type='button';
button.className='quiet-button desk-button';
function mountDeskButton(){
  const controls=document.querySelector('.cover-controls');
  if(controls&&button.parentElement!==controls)controls.append(button);
}
const coverObserver=new MutationObserver(mountDeskButton);
coverObserver.observe(document.querySelector('#app')||document.body,{childList:true,subtree:true});
mountDeskButton();
style.textContent+=`
.desk-button{position:static!important;right:auto!important;bottom:auto!important;z-index:auto!important;background:transparent!important;border:inherit;box-shadow:inherit;font:inherit;padding:inherit;white-space:nowrap}
.cover-controls{display:flex!important;justify-content:flex-end;align-items:center;gap:8px;flex-wrap:wrap}
.cover-controls .desk-button{background:#f3eee4!important;border:1px solid #d4c8b7!important;border-radius:24px!important;padding:8px 13px!important;box-shadow:0 2px 5px #34241718!important;font:inherit!important;color:#50483f!important}
.cover-controls .quiet-button[data-action="gallery"]{background:#f3eee4!important;border:1px solid #d4c8b7!important;border-radius:24px!important;padding:8px 13px!important;box-shadow:0 2px 5px #34241718!important;color:#50483f!important}
.desk-menu{top:unset;bottom:calc(76px + env(safe-area-inset-bottom,0px));max-height:min(75vh,540px);overflow:auto}
@media(max-width:700px){.cover-controls{gap:6px}.cover-controls .desk-button,.cover-controls .quiet-button[data-action="gallery"]{padding:7px 10px!important;font-size:12px!important}.desk-menu{top:90px;bottom:auto;right:8px}}
`;
const input=menu.querySelector('input[type=file]');
const x={value:'50'},y={value:'50'};
function setPosition(){document.body.style.setProperty('--desk-position','50% 50%');}
setPosition();
function apply(mode,blob){if(imageURL){URL.revokeObjectURL(imageURL);imageURL=null;}if(mode!=='custom'||!blob)document.body.style.removeProperty('--desk-image');document.body.classList.toggle('desk-enabled',mode!=='none');document.body.classList.toggle('desk-custom',mode==='custom'&&!!blob);if(blob){imageURL=URL.createObjectURL(blob);document.body.style.setProperty('--desk-image',`url("${imageURL}")`);}try{localStorage.setItem(KEY,mode);}catch{}}
let lastRemote='';
let selectedData='';
async function ensureSelectedData(){if(selectedData)return;try{const saved=await readImage();if(saved){selectedData=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(saved);});}}catch{}}
function broadcast(mode,data=''){if(mode==='custom'&&data)selectedData=data;/* Image bytes live in IndexedDB, never in the notebook's localStorage/sync state. */const detail={mode,x:Number(x.value),y:Number(y.value)};lastRemote=JSON.stringify(detail);window.dispatchEvent(new CustomEvent('unbound:desk-change',{detail}));}
async function compactImage(file){let bitmap;let objectURL;try{try{bitmap=await createImageBitmap(file);}catch{objectURL=URL.createObjectURL(file);bitmap=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=objectURL;});}const w=bitmap.width,h=bitmap.height;const scale=Math.min(1,1600/Math.max(w,h));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.78);}finally{if(bitmap&&typeof bitmap.close==='function')bitmap.close();if(objectURL)URL.revokeObjectURL(objectURL);}}
window.addEventListener('unbound:desk-state',async e=>{const d=e.detail;if(!d||!['wood','none','custom'].includes(d.mode))return;const signature=JSON.stringify(d);if(signature===lastRemote)return;lastRemote=signature;setPosition();if(d.mode==='custom'&&typeof d.data==='string'&&d.data.startsWith('data:image/jpeg;base64,')&&d.data.length<2200000){try{const blob=await(await fetch(d.data)).blob();await storeImage(blob);selectedData=d.data;apply('custom',blob);}catch{}}else if(d.mode==='custom'){try{const local=await readImage();apply(local?'custom':'wood',local);}catch{apply('wood');}}else apply(d.mode);});
function toggleMenu(){menu.hidden=!menu.hidden;const expanded=String(!menu.hidden);button.setAttribute('aria-expanded',expanded);}
button.onclick=toggleMenu;
menu.onclick=e=>{const action=e.target.closest('[data-desk]')?.dataset.desk;if(!action)return;if(action==='upload'){input.click();return;}apply(action);broadcast(action);menu.hidden=true;button.setAttribute('aria-expanded','false');};
input.onchange=async()=>{const file=input.files?.[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024){alert('Choose a JPG, PNG or WebP image smaller than 12 MB.');return;}try{let blob=file;try{const data=await compactImage(file);blob=await(await fetch(data)).blob();}catch(error){console.warn('Desk photo compression unavailable; using original photograph',error);}apply('custom',blob);try{await storeImage(blob);}catch(error){console.warn('Desk photo storage unavailable; showing photo for this session',error);window.alert('Your photograph is displayed, but this browser could not save it permanently. It may disappear after refresh.');}broadcast('custom');menu.hidden=true;button.setAttribute('aria-expanded','false');}catch(error){console.error('Desk background upload failed',error);alert('Could not display this photograph: '+(error?.message||String(error)));}input.value='';};
document.addEventListener('click',e=>{if(!menu.contains(e.target)&&e.target!==button){menu.hidden=true;button.setAttribute('aria-expanded','false');}});
(async()=>{let mode='wood';try{mode=localStorage.getItem(KEY)||'wood';}catch{}if(mode==='custom'){try{const blob=await readImage();apply(blob?'custom':'wood',blob);if(blob)await ensureSelectedData();}catch{apply('wood');}}else apply(mode);window.dispatchEvent(new Event('unbound:desk-request'));})();

/* Restrained, matching cover and desk controls */
style.textContent+=`
.cover-controls .desk-button,.cover-controls .quiet-button[data-action="gallery"]{background:rgba(244,238,228,.72)!important;border:1px solid rgba(110,91,72,.22)!important;color:#544a40!important;box-shadow:0 1px 3px #34241712!important;font-size:12px!important;font-weight:400!important;padding:6px 10px!important}
.cover-controls .desk-button:hover,.cover-controls .quiet-button[data-action="gallery"]:hover{background:rgba(244,238,228,.92)!important}
`;

/* Keep the background and cover controls within the viewport on narrow devices. */
style.textContent+=`
html,body{max-width:100%;overflow-x:clip}
body.desk-enabled{background-repeat:no-repeat!important}
.cover-controls{max-width:100%;box-sizing:border-box;min-width:0}
@media(max-width:700px){.cover-controls{width:100%;justify-content:flex-end!important;padding-inline:8px;gap:6px!important}.cover-controls .desk-button,.cover-controls .quiet-button[data-action="gallery"]{max-width:calc(50vw - 14px);font-size:clamp(10px,2.7vw,12px)!important;padding:6px 8px!important;white-space:normal;line-height:1.25}.desk-menu{max-width:calc(100vw - 16px);box-sizing:border-box}}
`;

/* Keep the cup and pen on the right edge when the photo is cropped on phones. */
style.textContent+=`
@media(max-width:700px){body.desk-enabled:not(.desk-custom){background-position:85% 50%!important}}
`;

/* Paint the photograph on the cover scene itself, above any app-level desk tint. */
style.textContent+=`
body.desk-enabled:not(.desk-custom) .cover-scene{isolation:isolate;background:transparent!important}
body.desk-enabled:not(.desk-custom) .cover-scene::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;background-image:url("./a_clean_warmly_lit_top_down_angled_overhead_stil.png");background-repeat:no-repeat;background-size:cover;background-position:center center}
@media(max-width:700px){body.desk-enabled:not(.desk-custom) .cover-scene::before{background-position:85% center}}
`;

/* The photograph must sit above the scene background, but below diary and controls. */
style.textContent+=`
body.desk-enabled:not(.desk-custom) .cover-scene>.cover-book,body.desk-enabled:not(.desk-custom) .cover-scene>.cover-controls{position:relative;z-index:1}
body.desk-enabled:not(.desk-custom) .cover-scene>.cover-controls{position:absolute}
`;

/* Reliable desk painting: render on the scene, not behind it or on body. */
style.textContent+=`
body.desk-enabled .cover-scene{background-color:#dfc49d!important;background-image:url("./a_clean_warmly_lit_top_down_angled_overhead_stil.png")!important;background-size:cover!important;background-position:var(--desk-position,50% 50%)!important;background-repeat:no-repeat!important}
body.desk-enabled.desk-custom .cover-scene{background-image:var(--desk-image)!important}
body.desk-enabled .cover-scene::before{content:none!important;display:none!important}
@media(max-width:700px){body.desk-enabled:not(.desk-custom) .cover-scene{background-position:85% center!important}}
`;

/* Verify the actual asset and expose failures rather than silently showing beige. */
const deskAsset='./a_clean_warmly_lit_top_down_angled_overhead_stil.png';
let deskAssetStatus='pending';
const deskNotice=document.createElement('small');
deskNotice.setAttribute('role','status');
deskNotice.style.cssText='display:block;margin-top:7px;color:#805126;overflow-wrap:anywhere';
menu.append(deskNotice);
const deskProbe=new Image();
deskProbe.onload=()=>{deskAssetStatus='ready';deskNotice.textContent='';};
deskProbe.onerror=()=>{deskAssetStatus='missing';deskNotice.textContent='The built-in desk photograph could not be loaded. The image file may be missing from the published site.';};
deskProbe.src=deskAsset+'?asset=20261027';
const oldMenuClick=menu.onclick;
menu.onclick=e=>{oldMenuClick(e);if(e.target.closest('[data-desk="wood"]')&&deskAssetStatus==='missing'){menu.hidden=false;deskNotice.textContent='The built-in desk photograph is not available at '+deskAsset;}};

/* Phone composition: crop to the unobstructed left-hand wood area.
   Keep the notebook size and position unchanged; retain full photo on tablets. */
style.textContent+=`
@media(max-width:700px){
 body.desk-enabled:not(.desk-custom){background-size:auto 180%!important;background-position:left center!important}
 body.desk-enabled:not(.desk-custom) .cover-scene{
  background-size:auto 180%!important;
  background-position:left center!important;
 }
}
`;

/* Final composition guardrails: a flattened photograph cannot be safely
   rearranged at every aspect ratio. Use the existing clean desk artwork when
   the crop would put a solid accessory under the notebook. */
style.textContent+=`
body.desk-enabled:not(.desk-custom) .cover-scene{
 background:#dfc49d url("./assets/desk-oak.svg") center/cover no-repeat!important;
}
body.desk-enabled:not(.desk-custom) .cover-scene>.cover-book{left:0}
@media (orientation:portrait) and (min-width:701px){
 body.desk-enabled:not(.desk-custom) .cover-scene{
  background:#dfc49d url("./assets/desk-oak.svg") center/cover no-repeat!important;
 }
}
@media (max-width:767px){
 body.desk-enabled:not(.desk-custom) .cover-scene{
  background:#dfc49d url("./assets/desk-oak.svg") center/cover no-repeat!important;
 }
}
`;

/* In landscape, move the notebook left enough to leave the cup visible on
   the right side of the desk photograph. Portrait framing stays centred. */
style.textContent+=`
@media (orientation:landscape) and (min-width:768px){
 body.desk-enabled .cover-scene>.cover-book{
  left:clamp(-220px,-14vw,-90px);
 }
}
`;
