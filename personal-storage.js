const AUTH_KEY='unbound-personal-storage-oauth-v1';
const PROVIDERS=new Set(['google-drive','dropbox','box']);
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const safeName=value=>String(value||'attachment').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').slice(0,180);

export function createPersonalStorage({client,config,fetcher=fetch,storage=sessionStorage,preferenceStorage=globalThis.localStorage,locationRef=location,historyRef=history}){
 const tokens=new Map();let cachedStatus=null,statusAt=0;
 const preferenceKey=async()=>{try{const {data}=await client?.auth.getSession();return data?.session?.user?.id?`unbound-personal-storage-preference-${data.session.user.id}`:null;}catch{return null;}};
 const persistPreference=async info=>{const key=await preferenceKey();if(key&&preferenceStorage)try{preferenceStorage.setItem(key,JSON.stringify({attachment_provider:info.preferences?.attachment_provider||null,backup_provider:info.preferences?.backup_provider||null}));}catch{}};
 const invoke=async body=>{if(!client)throw Error('Sign in to Unbound before connecting cloud storage.');const {data,error}=await client.functions.invoke('personal-storage',{body});if(error)throw Error(data?.message||'Personal storage is unavailable. Please retry.');return data;};
 const redirectUri=()=>new URL(locationRef.pathname,locationRef.origin).href;
 const ready=provider=>provider==='google-drive'?!!config.googleClientId:provider==='dropbox'?!!config.dropboxAppKey:provider==='box'?!!config.boxClientId:false;
 async function startConnect(provider){
  if(!client)throw Error('Sign in to Unbound before connecting cloud storage.');if(!PROVIDERS.has(provider))throw Error('Choose a supported cloud storage provider.');if(!ready(provider))throw Error(provider==='box'?'Box connection is awaiting app registration.':'This storage connection is awaiting app registration.');
  const verifier=encode(crypto.getRandomValues(new Uint8Array(48))),state=encode(crypto.getRandomValues(new Uint8Array(24))),challenge=encode(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
  storage.setItem(AUTH_KEY,JSON.stringify({provider,verifier,state,createdAt:Date.now()}));
  const redirect=redirectUri(),query=new URLSearchParams({response_type:'code',redirect_uri:redirect,state,code_challenge:challenge,code_challenge_method:'S256'});
  let url;
  if(provider==='google-drive'){
   query.set('client_id',config.googleClientId);query.set('scope','openid email https://www.googleapis.com/auth/drive.file');query.set('access_type','offline');query.set('include_granted_scopes','true');query.set('prompt','consent');url='https://accounts.google.com/o/oauth2/v2/auth?'+query;
  }else if(provider==='dropbox'){
   query.set('client_id',config.dropboxAppKey);query.set('token_access_type','offline');query.set('scope','files.content.read files.content.write files.content.delete files.metadata.read');url='https://www.dropbox.com/oauth2/authorize?'+query;
  }else{
   query.set('client_id',config.boxClientId);url='https://account.box.com/api/oauth2/authorize?'+query;
  }
  locationRef.assign(url);
 }
 async function finishConnect(){
  const params=new URLSearchParams(locationRef.search),code=params.get('code'),returnedState=params.get('state'),raw=storage.getItem(AUTH_KEY);if(!raw||(!code&&!params.has('error')))return false;
  storage.removeItem(AUTH_KEY);historyRef.replaceState(null,'',redirectUri());if(params.has('error'))throw Error('Cloud storage connection was cancelled.');
  let pending;try{pending=JSON.parse(raw||'null');}catch{}if(!pending||pending.state!==returnedState||Date.now()-pending.createdAt>10*60*1000)throw Error('Storage sign-in expired. Please try again.');
  const data=await invoke({action:'exchange',provider:pending.provider,code,codeVerifier:pending.verifier,redirectUri:redirectUri()});tokens.set(pending.provider,{accessToken:data.accessToken,expiresAt:Date.now()+data.expiresIn*1000,account:data.account});cachedStatus=null;return data;
 }
 async function status(force=false){if(!force&&cachedStatus&&Date.now()-statusAt<15000)return cachedStatus;try{cachedStatus=await invoke({action:'status'});statusAt=Date.now();await persistPreference(cachedStatus);return cachedStatus;}catch(error){const key=await preferenceKey();if(key&&preferenceStorage)try{const preferences=JSON.parse(preferenceStorage.getItem(key)||'null');if(preferences)return {connections:[],preferences,offline:true};}catch{}throw error;}}
 async function accessToken(provider){const cached=tokens.get(provider);if(cached&&cached.expiresAt>Date.now()+60000)return cached.accessToken;const data=await invoke({action:'refresh',provider});if(data.status!=='connected')throw Error('Reconnect '+label(provider)+' to continue.');tokens.set(provider,{accessToken:data.accessToken,expiresAt:Date.now()+data.expiresIn*1000,account:data.account});return data.accessToken;}
 const label=provider=>provider==='google-drive'?'Google Drive':provider==='dropbox'?'Dropbox':'Box';
 async function setDefault(provider,kind='attachment'){
  if(provider!==null&&!PROVIDERS.has(provider))throw Error('Unsupported storage provider.');
  const current=await status(),connected=new Set(current.connections.map(x=>x.provider));if(provider&&!connected.has(provider))throw Error('Connect '+label(provider)+' first.');
  const user=(await client.auth.getSession()).data.session?.user;if(!user)throw Error('Sign in to save storage preferences.');
  const values={user_id:user.id,attachment_provider:current.preferences?.attachment_provider||null,backup_provider:current.preferences?.backup_provider||null,updated_at:new Date().toISOString()};values[kind==='backup'?'backup_provider':'attachment_provider']=provider;
  const result=await client.from('storage_preferences').upsert(values,{onConflict:'user_id'});if(result.error)throw Error(result.error.message||'Storage preference could not be saved.');cachedStatus={...(current||{connections:[]}),preferences:{attachment_provider:values.attachment_provider,backup_provider:values.backup_provider}};statusAt=Date.now();await persistPreference(cachedStatus);
 }
 async function disconnect(provider){tokens.delete(provider);cachedStatus=null;const result=await invoke({action:'disconnect',provider});return result;}
 async function providerUpload(provider,file,id){
  const token=await accessToken(provider),name=safeName(file.name||'attachment'),capture=id||crypto.randomUUID();
  if(provider==='google-drive'){
   const boundary='unbound-'+crypto.randomUUID(),meta={name,mimeType:file.type||'application/octet-stream',description:'Unbound attachment '+capture};
   const body=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n',JSON.stringify(meta),'\r\n--'+boundary+'\r\nContent-Type: '+(file.type||'application/octet-stream')+'\r\n\r\n',file,'\r\n--'+boundary+'--'],{type:'multipart/related; boundary='+boundary});
   let response;
   if(file.size>5*1024*1024){
    const start=await fetcher('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':file.type||'application/octet-stream','X-Upload-Content-Length':String(file.size)},body:JSON.stringify(meta)});if(!start.ok)throw Error(start.status===401?'Reconnect Google Drive and retry.':'Google Drive could not start this upload.');const url=start.headers.get('Location');if(!url)throw Error('Google Drive did not provide an upload session.');response=await fetcher(url,{method:'PUT',headers:{'Content-Type':file.type||'application/octet-stream'},body:file});
   }else response=await fetcher('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'multipart/related; boundary='+boundary},body});
   if(!response.ok)throw Error(response.status===401?'Reconnect Google Drive and retry.':'Google Drive could not save this file. Check your available storage and try again.');const saved=await response.json();return saved.id;
  }
  if(provider==='dropbox'){
   for(const folder of ['/Unbound','/Unbound/Attachments']){const made=await fetcher('https://api.dropboxapi.com/2/files/create_folder_v2',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({path:folder,autorename:false})});if(!made.ok&&made.status!==409)throw Error('Dropbox could not prepare its Unbound folder.');}
   const path='/Unbound/Attachments/'+capture+'-'+name;
   const response=await fetcher('https://content.dropboxapi.com/2/files/upload',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/octet-stream','Dropbox-API-Arg':JSON.stringify({path,mode:'add',autorename:false,mute:true})},body:file});if(!response.ok)throw Error(response.status===401?'Reconnect Dropbox and retry.':'Dropbox could not save this file. Check your available storage and try again.');return (await response.json()).id;
  }
  const form=new FormData();form.append('attributes',JSON.stringify({name,parent:{id:'0'}}));form.append('file',file,name);
  const response=await fetcher('https://upload.box.com/api/2.0/files/content',{method:'POST',headers:{Authorization:'Bearer '+token},body:form});if(!response.ok)throw Error(response.status===401?'Reconnect Box and retry.':'Box could not save this file. Check your available storage and try again.');return (await response.json()).entries?.[0]?.id;
 }
 async function removeProviderFile(provider,fileId){
  const token=await accessToken(provider);let response;
  if(provider==='google-drive')response=await fetcher('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(fileId),{method:'DELETE',headers:{Authorization:'Bearer '+token}});
  else if(provider==='dropbox')response=await fetcher('https://api.dropboxapi.com/2/files/delete_v2',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({path:fileId})});
  else response=await fetcher('https://api.box.com/2.0/files/'+encodeURIComponent(fileId),{method:'DELETE',headers:{Authorization:'Bearer '+token}});
  if(!response.ok&&response.status!==404)throw Error('Could not remove the file from '+label(provider)+'.');
 }
 async function upload({noteId,file,captureId=null,width=100,left=0,durationMs=null,provider:providerOverride=null}){
  if(!file)throw Error('Choose a file to upload.');if(file.size>15*1024*1024)throw Error('Choose a file smaller than 15 MB.');
  const prefs=await status(),provider=providerOverride||prefs.preferences?.attachment_provider;if(!provider)return null;
  if(!prefs.connections.some(item=>item.provider===provider))throw Error('Reconnect '+label(provider)+' before uploading this file.');
  if(!navigator.onLine)throw Error('You are offline. Keep this capture open; it has not been uploaded.');
  const user=(await client.auth.getUser()).data.user;if(!user)throw Error('Sign in again before uploading.');
  const capture=captureId||crypto.randomUUID(),already=await client.from('attachments').select('id,provider,provider_file_id,name,mime_type,byte_size,width,left_position,duration_ms').eq('user_id',user.id).eq('capture_id',capture).maybeSingle();
  if(already.error)throw Error('Attachment status could not be checked. Retry before saving again.');if(already.data)return {...already.data,provider:already.data.provider,storage:{provider:already.data.provider,fileId:already.data.provider_file_id,status:'saved'}};
  let providerFileId;
  try{providerFileId=await providerUpload(provider,file,capture);if(!providerFileId)throw Error('The cloud provider did not confirm this upload.');}
  catch(error){throw error;}
  const attachment={id:crypto.randomUUID(),user_id:user.id,note_id:String(noteId),capture_id:capture,provider,provider_file_id:providerFileId,name:file.name||'Attachment',mime_type:file.type||'application/octet-stream',byte_size:file.size,width,left_position:left,duration_ms:durationMs,content_hash:null};
  const saved=await client.from('attachments').insert(attachment).select('id,provider,provider_file_id,name,mime_type,byte_size,width,left_position,duration_ms').single();
  if(saved.error){try{await removeProviderFile(provider,providerFileId);}catch{}throw Error('The file uploaded, but its Unbound reference could not be saved. It was removed where possible; please retry.');}
  return {...saved.data,storage:{provider,fileId:providerFileId,status:'saved'}};
 }
 async function download(attachment){
  const provider=attachment.storage?.provider||attachment.provider,fileId=attachment.storage?.fileId||attachment.provider_file_id,token=await accessToken(provider);let response;
  if(provider==='google-drive')response=await fetcher('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(fileId)+'?alt=media',{headers:{Authorization:'Bearer '+token}});
  else if(provider==='dropbox')response=await fetcher('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{Authorization:'Bearer '+token,'Dropbox-API-Arg':JSON.stringify({path:fileId})}});
  else response=await fetcher('https://api.box.com/2.0/files/'+encodeURIComponent(fileId)+'/content',{headers:{Authorization:'Bearer '+token}});
  if(!response.ok)throw Error(response.status===401?'Reconnect '+label(provider)+' to preview this file.':'This file could not be opened from '+label(provider)+'.');return response.blob();
 }
 async function deleteAttachment(attachment,{deleteCloudFile=false}={}){
  const provider=attachment.storage?.provider||attachment.provider,fileId=attachment.storage?.fileId||attachment.provider_file_id;
  if(deleteCloudFile)await removeProviderFile(provider,fileId);
  const result=await client.from('attachments').delete().eq('id',attachment.storage?.attachmentId||attachment.id);if(result.error)throw Error('Attachment reference could not be removed.');
 }
 return {ready:!!client,startConnect,finishConnect,status,setDefault,disconnect,upload,download,deleteAttachment,hasConfig:ready};
}
