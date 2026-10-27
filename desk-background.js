// Decorative desk layer; independent of notebook layout and cover personalisation.
const KEY='unbound-desk-background-v1';
const dbName='unbound-desk-images';
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(dbName,1);r.onupgradeneeded=()=>r.result.createObjectStore('images');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function storeImage(blob){const db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').put(blob,'selected');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}
async function readImage(){const db=await openDB();const result=await new Promise((resolve,reject)=>{const tx=db.transaction('images','readonly');const req=tx.objectStore('images').get('selected');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});db.close();return result;}
let imageURL;
const style=document.createElement('style');
style.textContent=`
body.desk-enabled{background:#dfc49d!important;background-image:repeating-linear-gradient(91deg,transparent 0 88px,#8b5d3520 90px,#fff9e533 93px,transparent 97px 190px),linear-gradient(105deg,#ecd7b4,#d9b88e 53%,#e8d0ab)!important;background-attachment:fixed!important}
body.desk-custom{background-image:var(--desk-image)!important;background-size:cover!important;background-position:center!important}
body.desk-enabled:before{content:'';position:fixed;inset:0;pointer-events:none;background:linear-gradient(115deg,#fff9e62b,transparent 48%,#63401a16);z-index:0}
body.desk-enabled #app,body.desk-enabled .app-bar{position:relative;z-index:1}
.desk-button{position:fixed;right:12px;bottom:12px;z-index:100;background:#fffaf0eF;border:1px solid #9c866b;border-radius:24px;padding:8px 13px;box-shadow:0 3px 12px #34241733;font:13px system-ui;cursor:pointer}
.desk-menu{position:fixed;right:12px;bottom:55px;z-index:101;background:#fffaf2;padding:16px;border-radius:12px;box-shadow:0 5px 24px #34241755;max-width:min(300px,calc(100vw - 24px));font:14px system-ui}
.desk-menu button{display:block;padding:9px;margin:3px 0;width:100%;text-align:left;border-radius:6px;background:#eee4d6}
@media(max-width:700px){.desk-button{right:6px;bottom:6px;padding:5px 8px;font-size:11px}}
`;
document.head.append(style);
const button=document.createElement('button');button.className='desk-button';button.textContent='Desk background';button.setAttribute('aria-label','Choose desk background');
const menu=document.createElement('div');menu.className='desk-menu';menu.hidden=true;
menu.innerHTML='<strong>Desk background</strong><button data-desk="wood">Light wooden table</button><button data-desk="upload">Choose your own photograph</button><button data-desk="none">No background</button><input type="file" accept="image/jpeg,image/png,image/webp" hidden><small>Backgrounds do not change notebook dimensions.</small>';
document.body.append(button,menu);
const input=menu.querySelector('input');
function apply(mode,blob){if(imageURL){URL.revokeObjectURL(imageURL);imageURL=null;}document.body.classList.toggle('desk-enabled',mode!=='none');document.body.classList.toggle('desk-custom',mode==='custom'&&!!blob);if(blob){imageURL=URL.createObjectURL(blob);document.body.style.setProperty('--desk-image',`url("${imageURL}")`);}try{localStorage.setItem(KEY,mode);}catch{}}
button.onclick=()=>{menu.hidden=!menu.hidden;button.setAttribute('aria-expanded',String(!menu.hidden));};
menu.onclick=e=>{const action=e.target.closest('[data-desk]')?.dataset.desk;if(!action)return;if(action==='upload'){input.click();return;}apply(action);menu.hidden=true;};
input.onchange=async()=>{const file=input.files?.[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024){alert('Choose a JPG, PNG or WebP image smaller than 12 MB.');return;}try{await storeImage(file);apply('custom',file);menu.hidden=true;}catch{alert('Unable to save background on this device.');}input.value='';};
document.addEventListener('click',e=>{if(!menu.contains(e.target)&&e.target!==button)menu.hidden=true;});
(async()=>{let mode='wood';try{mode=localStorage.getItem(KEY)||'wood';}catch{}if(mode==='custom'){try{const blob=await readImage();apply(blob?'custom':'wood',blob);}catch{apply('wood');}}else apply(mode);})();
