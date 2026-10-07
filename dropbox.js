import {cloudConfig} from './cloud-config.js?v=0.3.2';
let token='',expiry=0;
const redirect=()=>location.origin+location.pathname;
export const connected=()=>!!token&&Date.now()<expiry;
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export async function connect(){
 if(!cloudConfig.dropboxAppKey)throw Error('Dropbox connection is awaiting app registration. File backup is available now.');
 const verifier=b64(crypto.getRandomValues(new Uint8Array(48))),state=b64(crypto.getRandomValues(new Uint8Array(24)));
 const challenge=b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
 sessionStorage.setItem('unbound-dropbox-oauth',JSON.stringify({verifier,state,time:Date.now()}));
 const p=new URLSearchParams({client_id:cloudConfig.dropboxAppKey,response_type:'code',code_challenge:challenge,code_challenge_method:'S256',state,redirect_uri:redirect(),token_access_type:'online'});
 location.assign('https://www.dropbox.com/oauth2/authorize?'+p);
}
export async function finishAuth(){
 const p=new URLSearchParams(location.search);if(!p.has('state')||!sessionStorage.getItem('unbound-dropbox-oauth'))return false;
 const pending=JSON.parse(sessionStorage.getItem('unbound-dropbox-oauth'));sessionStorage.removeItem('unbound-dropbox-oauth');history.replaceState(null,'',redirect());
 if(p.get('state')!==pending.state||Date.now()-pending.time>600000)throw Error('Dropbox sign-in expired. Try again.');if(p.has('error'))throw Error('Dropbox connection was cancelled.');
 const r=await fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code:p.get('code'),client_id:cloudConfig.dropboxAppKey,code_verifier:pending.verifier,redirect_uri:redirect()})});
 const data=await r.json();if(!r.ok)throw Error(data.error_description||'Dropbox sign-in failed.');token=data.access_token;expiry=Date.now()+data.expires_in*1000;return true;
}
async function api(route,body){if(!connected())throw Error('Reconnect Dropbox to resume backups.');const r=await fetch('https://api.dropboxapi.com/2/'+route,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(r.status===401?'Reconnect Dropbox to resume backups.':'Dropbox could not complete this backup request.');return r.json();}
export async function listBackups(){let r;try{r=await api('files/list_folder',{path:'/Unbound Days'});}catch(e){if(!connected())throw e;await api('files/create_folder_v2',{path:'/Unbound Days',autorename:false});return [];}
 let entries=[...r.entries];while(r.has_more){r=await api('files/list_folder/continue',{cursor:r.cursor});entries.push(...r.entries);}return entries.filter(x=>x['.tag']==='file'&&x.name.startsWith('unbound-days-')&&x.name.endsWith('.json')).map(x=>({id:x.path_lower,name:x.name,createdTime:x.server_modified})).sort((a,b)=>b.createdTime.localeCompare(a.createdTime));}
export async function backupNotebook(data,device){if(!connected())throw Error('Reconnect Dropbox to resume backups.');const path='/Unbound Days/unbound-days-'+new Date().toISOString().replace(/:/g,'-')+'-'+device+'.json';const r=await fetch('https://content.dropboxapi.com/2/files/upload',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/octet-stream','Dropbox-API-Arg':JSON.stringify({path,mode:'add',autorename:false,mute:true})},body:JSON.stringify(data)});if(!r.ok)throw Error('Dropbox backup failed. Your writing remains on this device.');const x=await r.json();return {id:x.path_lower,createdTime:x.server_modified};}
export async function readBackup(path){if(!/^\/unbound days\/unbound-days-[^/]+\.json$/i.test(path))throw Error('Invalid backup path.');if(!connected())throw Error('Reconnect Dropbox to read backups.');const r=await fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{Authorization:'Bearer '+token,'Dropbox-API-Arg':JSON.stringify({path})}});if(!r.ok)throw Error('Dropbox copy could not be read.');return r.json();}
export function disconnect(){token='';expiry=0;}
