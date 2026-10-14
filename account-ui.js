import * as Accounts from './accounts.js';
import {accountConfig} from './account-config.js';
import {scopeKey,cloudContent,fingerprint,createSync} from './account-sync.js';
import {resolveConflict} from './sync.js';
export function mountAccounts({getState,empty,apply,persist,render,openModal,closeModal,toast,exportNotebook,snapshot,validateBackup,lock,finishLocal,onStatus=()=>{},blocked=()=>false}){
 let stopped=false,conflicts=null,cloudText=Accounts.user?'Cloud not checked':'Local notebook',timer;
 const bootId=Accounts.user?.id||null;
 const active=()=>!stopped&&!!bootId&&!blocked();
 const sync=Accounts.client&&bootId?createSync({client:Accounts.client,getState,empty,apply,persist,active,validate:content=>validateBackup({...empty(),...structuredClone(content)}),conflict:r=>{conflicts=r;},status:text=>{cloudText=text;const el=document.querySelector('#account-cloud-status');if(el)el.textContent=text;onStatus();}}):null;
 const buttons=document.createElement('span');buttons.className='account-buttons';document.querySelector('.bar-actions').prepend(buttons);
 buttons.innerHTML=`<button class="text-action" id="account-open">${bootId?'My Account':'Log In'}</button>${bootId?'<button class="text-action" id="account-logout">Log Out</button>':''}`;
 buttons.querySelector('#account-open').onclick=()=>show().catch(e=>toast(e.message));buttons.querySelector('#account-logout')?.addEventListener('click',logout);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const message=(text)=>{const el=document.querySelector('#account-message');if(el)el.textContent=text;else toast(text);};
 async function run(action){const submit=document.querySelector('#account-form button[type=submit]');if(submit)submit.disabled=true;try{await action();}catch(e){message(e.message);}finally{if(submit?.isConnected)submit.disabled=false;}}
 async function logout(){
  if(!confirm('Log out? Unsynced writing remains in this account’s local recovery copy. Export first on a shared device.'))return;
  stopped=true;sync?.stop();lock();
  try{await Accounts.result(Accounts.client.auth.signOut({scope:'local'}));location.reload();}catch(e){toast('Logout failed. Reload to continue: '+e.message);}
 }
 async function show(mode='login'){
  if(!Accounts.configured||!Accounts.client){openModal('Account setup required','<p>Accounts are not configured for this development copy. Set the isolated Supabase project URL and public key in account-config.js after applying the database migration.</p>');return;}
  if(!bootId){
   const signup=mode==='signup',reset=mode==='reset';
   openModal(signup?'Create account':reset?'Reset password':'Log in',`<form id="account-form"><label>Email<input name="email" type="email" required autocomplete="email"></label>${reset?'':`<label>Password<input name="password" type="password" minlength="12" required autocomplete="${signup?'new-password':'current-password'}"></label>`}<div id="account-captcha"></div><p id="account-message" role="status"></p><button class="primary" type="submit">${signup?'Create account':reset?'Send reset email':'Log in'}</button></form>${reset?'':'<button class="secondary" id="account-google">Continue with Google</button>'}<div><button class="text-action" id="account-signup">${signup?'Log in':'Create account'}</button><button class="text-action" id="account-reset">Forgot password?</button></div>`);
   let captchaToken='';
   if(accountConfig.captchaSiteKey){await loadCaptcha();window.turnstile.render('#account-captcha',{sitekey:accountConfig.captchaSiteKey,callback:token=>captchaToken=token,'expired-callback':()=>captchaToken=''});}
   document.querySelector('#account-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);run(async()=>{
    const email=f.get('email'),password=f.get('password'),captcha=captchaToken||undefined;
    if(signup){const data=await Accounts.result(Accounts.client.auth.signUp({email,password,options:{emailRedirectTo:Accounts.redirectURL(),captchaToken:captcha}}));message('Check your email to verify your account.');if(data.session)location.reload();}
    else if(reset){await Accounts.result(Accounts.client.auth.resetPasswordForEmail(email,{redirectTo:Accounts.redirectURL(),captchaToken:captcha}));message('If the account exists, a password reset email has been sent.');}
    else{await Accounts.result(Accounts.client.auth.signInWithPassword({email,password,options:{captchaToken:captcha}}));location.reload();}
   });};
   document.querySelector('#account-signup').onclick=()=>show(signup?'login':'signup').catch(e=>toast(e.message));document.querySelector('#account-reset').onclick=()=>show('reset').catch(e=>toast(e.message));
   document.querySelector('#account-google')?.addEventListener('click',()=>run(()=>Accounts.result(Accounts.client.auth.signInWithOAuth({provider:'google',options:{redirectTo:Accounts.redirectURL()}}))));return;
  }
  openModal('My Account',`<p>${esc(Accounts.user.email||'Signed in')}</p><p id="account-role">Access: checking…</p><p id="account-cloud-status" role="status">${esc(cloudText)}</p><p id="account-message" role="status"></p><div class="account-controls"><button class="secondary" id="account-sync">Sync Now</button><button class="secondary" id="account-export">Export my notebook</button><button class="secondary" id="account-import">Import legacy notebook</button>${conflicts?'<button class="secondary" id="account-conflicts">Review cloud conflict</button>':''}</div><form id="account-form"><label>Email<input name="email" type="email" autocomplete="email" value="${esc(Accounts.user.email||'')}" required></label><label>New password (optional)<input name="password" type="password" autocomplete="new-password" minlength="12"></label><label>Current password (for password change)<input name="current_password" type="password" autocomplete="current-password"></label><button class="primary" type="submit">Save account settings</button></form><button class="text-action" id="account-delete">Delete account</button><p>Legacy notebooks remain separate until explicitly imported. Export before deletion. Existing Google backups require separate removal; Google connections will be managed in the next implementation group.</p>`);
  Accounts.role().then(r=>{const el=document.querySelector('#account-role');if(el)el.textContent='Access: '+(r==='admin'?'Administrator · all features':'Regular account · Free');}).catch(()=>message('Account role could not be checked.'));
  document.querySelector('#account-sync').onclick=()=>run(async()=>{const result=await sync.sync();render();if(result?.error)throw result.error;});
  document.querySelector('#account-export').onclick=exportNotebook;
  document.querySelector('#account-import').onclick=()=>run(importLegacy);
  document.querySelector('#account-conflicts')?.addEventListener('click',review);
  document.querySelector('#account-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);run(async()=>{const updates={};if(f.get('email')!==Accounts.user.email)updates.email=f.get('email');if(f.get('password')){if(!f.get('current_password'))throw Error('Enter your current password. Use the reset email if you do not have one.');updates.password=f.get('password');updates.current_password=f.get('current_password');}if(!Object.keys(updates).length)return;await Accounts.result(Accounts.client.auth.updateUser(updates,{emailRedirectTo:Accounts.redirectURL()}));message(updates.email?'Confirm the email change using the verification emails.':'Password updated.');e.target.reset();});};
  document.querySelector('#account-delete').onclick=()=>deleteForm().catch(e=>toast(e.message));
 }
 async function deleteForm(){
  openModal('Delete account',`<p>Export your notebook first. This permanently deletes your live cloud account and planner. Legacy guest notebooks and separate Google backups are retained.</p><button class="secondary" id="delete-export">Export notebook</button><form id="account-form"><label>Type DELETE<input name="confirmation" required pattern="DELETE" autocomplete="off"></label><label>Password<input name="password" type="password" required autocomplete="current-password"></label><p>Google-only account? Use a password reset email first to set a password.</p><div id="account-captcha"></div><p id="account-message" role="status"></p><button class="primary" type="submit">Delete account permanently</button></form>`);
  document.querySelector('#delete-export').onclick=exportNotebook;
  let captchaToken='';if(accountConfig.captchaSiteKey){await loadCaptcha();window.turnstile.render('#account-captcha',{sitekey:accountConfig.captchaSiteKey,callback:token=>captchaToken=token});}
  document.querySelector('#account-form').onsubmit=e=>{e.preventDefault();run(async()=>{
   const f=new FormData(e.target);if(f.get('confirmation')!=='DELETE')return;
   // Do not freeze editing until credentials have been checked by the backend.
   const {error}=await Accounts.client.functions.invoke('delete-account',{body:{password:f.get('password'),captchaToken}});
   if(error)throw Error('Account was not deleted. '+error.message);
   stopped=true;sync.stop();lock();await finishLocal();
   for(const key of Object.keys(localStorage))if(key===scopeKey(bootId)||key.startsWith(scopeKey(bootId)+'-'))localStorage.removeItem(key);
   const {deleteMirror}=await import('./storage.js');try{await deleteMirror(scopeKey(bootId));}catch{alert('Cloud account deleted. Clear site data on this device to remove an inaccessible recovery copy.');}await Accounts.client.auth.signOut({scope:'local'});location.reload();
  });};
 }
 async function importLegacy(){
  const raw=localStorage.getItem(scopeKey(null));if(!raw)throw Error('No legacy notebook on this origin. Export from the old site, then use the file import option below.');
  await importData(JSON.parse(raw));
 }
 async function importData(data){
  if(!active())throw Error('Notebook changed in another tab or needs recovery. Export unsaved writing, then reload before importing.');
  validateBackup(data);
  if(!confirm('This replaces any unsynced writing in this account. Import into this account? Download and keep the recovery export first. Import is allowed only before this account has a cloud notebook.'))return;
  // Download BEFORE attempting any migration. Original guest copies remain untouched.
  downloadJSON(data,'unbound-before-account-import.json');
  const recovered=JSON.parse(JSON.stringify(data));validateBackup(recovered);
  const hash=await fingerprint(data);if(hash!==await fingerprint(recovered))throw Error('Recovery export roundtrip failed.');const content=cloudContent(recovered);
  const response=await Accounts.result(Accounts.client.rpc('save_notebook',{p_data:content,p_expected_revision:0,p_request_id:crypto.randomUUID(),p_import_hash:hash}));
  snapshot();apply(content,{revision:response.revision,base:content});persist();render();message('Imported. Original legacy notebook retained.');
 }
 function review(){
  const pending=conflicts;if(!pending)return;const atReview=JSON.stringify(cloudContent(getState()));
  openModal('Review cloud conflict',`<p>Export first if you need a separate recovery copy. Choose each field explicitly.</p><form id="account-review">${pending.conflicts.map((c,i)=>`<fieldset><legend>${esc(c.path.join(' / '))}</legend><label><input type="radio" name="c${i}" value="local" required> This device <pre>${esc(JSON.stringify(c.local??'(deleted)'))}</pre></label><label><input type="radio" name="c${i}" value="remote"> Cloud <pre>${esc(JSON.stringify(c.remote??'(deleted)'))}</pre></label></fieldset>`).join('')}<button class="primary" type="submit">Apply choices</button></form>`);
  document.querySelector('#account-review').onsubmit=e=>{e.preventDefault();if(JSON.stringify(cloudContent(getState()))!==atReview){conflicts=null;closeModal();toast('Writing changed. Recheck cloud before reviewing.');sync.sync();return;}const values=new FormData(e.target);for(let i=0;i<pending.conflicts.length;i++)resolveConflict(pending.data,pending.conflicts[i],values.get('c'+i));snapshot();apply(pending.data,{revision:pending.revision,base:pending.base});persist();conflicts=null;closeModal();render();sync.sync();};
 }
 if(Accounts.client){Accounts.client.auth.onAuthStateChange((event,session)=>{
  if(event==='INITIAL_SESSION')return;
  if((session?.user?.id||null)!==bootId){stopped=true;sync?.stop();lock();setTimeout(()=>location.reload(),0);}
  if(event==='PASSWORD_RECOVERY'){setTimeout(recoveryForm,0);}
 });}
 function recoveryForm(){
  openModal('Choose a new password','<form id="account-form"><label>New password<input name="password" type="password" minlength="12" autocomplete="new-password" required></label><p id="account-message" role="status"></p><button class="primary" type="submit">Save password</button></form>');
  document.querySelector('#account-form').onsubmit=e=>{e.preventDefault();run(async()=>{await Accounts.result(Accounts.client.auth.updateUser({password:new FormData(e.target).get('password')}));closeModal();toast('Password updated.');});};
 }
 // Empty accounts are not uploaded automatically before the owner has a chance
 // to import their legacy data. Explicit Sync Now can create an empty notebook.
 if(sync){timer=setInterval(()=>{if(document.visibilityState==='visible')sync.sync();},60000);window.addEventListener('online',()=>sync.sync());
  if(getState()._cloud||localStorage.getItem(scopeKey(bootId)))sync.sync();
  else Accounts.result(Accounts.client.from('notebooks').select('data,revision').limit(1)).then(rows=>{if(rows.length&&active())sync.sync();}).catch(()=>{cloudText='Cloud unavailable · retry in My Account';});
 }
 if(Accounts.recovery)setTimeout(recoveryForm,0);
 const file=document.createElement('input');file.type='file';file.accept='.json,application/json';file.hidden=true;document.body.append(file);
 file.onchange=()=>run(async()=>{const f=file.files[0];if(!f)return;if(f.size>15*1024*1024)throw Error('Backup is too large.');await importData(JSON.parse(await f.text()));file.value='';});
 // Attach file-import button whenever the account panel is opened.
 const observer=new MutationObserver(()=>{const button=document.querySelector('#account-import');if(button&&!document.querySelector('#account-import-file')){const extra=document.createElement('button');extra.id='account-import-file';extra.className='secondary';extra.textContent='Import legacy export file';extra.onclick=()=>file.click();button.after(extra);}});observer.observe(document.querySelector('#modal-content'),{childList:true,subtree:true});
 return {queue:()=>{if(active())sync?.queue();},active,cloudStatus:()=>cloudText};
}
function downloadJSON(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function loadCaptcha(){if(window.turnstile)return;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.onload=resolve;s.onerror=()=>reject(Error('Could not load sign-in verification.'));document.head.append(s);});}
