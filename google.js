import {createGoogleSession} from './google-session.js';
let persistent=null,persistentEnabled=false;
export function configureAccountConnection(options){persistentEnabled=true;persistent=createGoogleSession(options);}
export async function restoreConnection(force=false){
 if(!persistent)return false;const session=await persistent.restore(force);
 if(!session){accessToken='';expires=0;backupGranted=false;tasksGranted=false;googleAccount='';return false;}
 accessToken=session.accessToken;expires=session.expiresAt;googleAccount=session.account;backupGranted=session.scopes.includes('https://www.googleapis.com/auth/drive.file');tasksGranted=session.scopes.includes('https://www.googleapis.com/auth/tasks');return true;
}
export async function disconnectAccount(){disconnect();if(persistent)await persistent.disconnect();}
async function ensureConnection(){if(persistent&&(!connected()||expires<Date.now()+90000))await restoreConnection();}
let accessToken='',expires=0,client=null,backupGranted=false,tasksGranted=false,googleAccount='',connectionGeneration=0;
export const connected=()=>!!accessToken&&Date.now()<expires;
export async function connect(clientId,withBackup=false){
  const generation=++connectionGeneration;accessToken='';googleAccount='';tasksGranted=false;
  if(!clientId)throw new Error('Add a Google OAuth client ID in Settings first.');
  if(!window.google?.accounts?.oauth2){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.onload=resolve;script.onerror=()=>reject(new Error('Google sign-in could not load. Check your connection.'));document.head.append(script);});}
  return new Promise((resolve,reject)=>{client=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:'openid email https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly'+(withBackup?' https://www.googleapis.com/auth/drive.file':''),callback:async r=>{if(generation!==connectionGeneration)return reject(Error('Google connection cancelled.'));if(r.error)return reject(new Error(r.error_description||r.error));backupGranted=google.accounts.oauth2.hasGrantedAllScopes(r,'https://www.googleapis.com/auth/drive.file');accessToken=r.access_token;expires=Date.now()+Number(r.expires_in)*1000;tasksGranted=google.accounts.oauth2.hasGrantedAllScopes(r,'https://www.googleapis.com/auth/tasks');try{const response=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:`Bearer ${accessToken}`}});if(!response.ok)throw Error('Google identity could not be verified.');const identity=(await response.json()).sub;if(generation!==connectionGeneration)return reject(Error('Google connection cancelled.'));googleAccount=identity;if(!googleAccount)throw Error('Google identity missing.');resolve();}catch(e){if(generation===connectionGeneration){accessToken='';googleAccount='';}reject(e);}},error_callback:e=>reject(new Error(e.type==='popup_closed'?'Sign-in cancelled.':'Google sign-in was blocked. Allow pop-ups and try again.'))});client.requestAccessToken({prompt:'select_account'});});
}
export function disconnect(){connectionGeneration++;responses.clear();flights.clear();eventWindows.clear();limits.clear();persistent?.clear();if(!persistentEnabled&&accessToken&&window.google)google.accounts.oauth2.revoke(accessToken,()=>{});accessToken='';expires=0;backupGranted=false;tasksGranted=false;googleAccount='';}
// One request gate per service/account. Never retry a possibly committed mutation.
const flights=new Map(),responses=new Map(),limits=new Map();let lastFailure=null;
export const syncDiagnostics=()=>lastFailure?structuredClone(lastFailure):null;
export function syncStatus(){const paused=[...limits.entries()].filter(([,v])=>v.until>Date.now());return paused.length?'Google '+paused.map(([k])=>k.split(':')[1]).join(', ')+' paused · changes kept locally':'';}
export async function googleRequest(service,url,options={},fetcher=fetch){
 const scope=googleAccount+':'+service,method=options.method||'GET',key=scope+':'+url,read=method==='GET',now=Date.now(),limit=limits.get(scope);
 if(limit?.until>now){const e=Error('Google '+service+' quota pause; changes remain on this device.');e.status=429;e.retryAt=limit.until;throw e;}
 if(read&&responses.get(key)?.until>now)return structuredClone(responses.get(key).value);
 if(read&&flights.has(key))return structuredClone(await flights.get(key));
 const run=async()=>{
 const r=await fetcher(url,options);
 if(!r.ok){let data={};try{data=await r.json();}catch{}
 const details=data.error,rate=r.status===429||(r.status===403&&/quota|rateLimit|userRateLimit|RESOURCE_EXHAUSTED/i.test(JSON.stringify(details)));
 const e=Error(details?.message||'Google '+service+' request failed.');e.status=r.status;e.service=service;e.endpoint=new URL(url).pathname;lastFailure={service,endpoint:e.endpoint,status:r.status,reason:details?.errors?.map(x=>x.reason).join(', ')||details?.status||details?.message||'Request failed',time:new Date().toISOString()};
 if(rate){const attempt=(limit?.attempt||0)+1,retry=r.headers.get('Retry-After'),seconds=Number(retry),specified=retry?(Number.isFinite(seconds)?seconds*1000:Date.parse(retry)-Date.now()):0;
 const until=Date.now()+Math.max(specified||0,Math.min(3600000,60000*2**Math.min(attempt-1,6))+Math.random()*1000);limits.set(scope,{attempt,until});e.retryAt=until;lastFailure.retryAt=new Date(until).toISOString();e.message='Google '+service+' quota pause · changes kept locally';}
 if(r.status===401){accessToken='';googleAccount='';e.message='Google session expired. Reconnect in Settings.';}if(r.status===412&&service==='Calendar')e.message='This event changed in Google. Refresh the calendar before editing it again.';throw e;}
 limits.delete(scope);const value=r.status===204?null:await r.json();
 if(read)responses.set(key,{value:structuredClone(value),until:Date.now()+60000});else for(const k of responses.keys())if(k.startsWith(scope+':'))responses.delete(k);
 return value;
 };
 if(!read)return run();const promise=run();flights.set(key,promise);try{return structuredClone(await promise);}finally{flights.delete(key);}
}
export async function api(path,options={}){await ensureConnection();if(!connected())throw Error('Reconnect Google Calendar to continue.');return googleRequest('Calendar','https://www.googleapis.com/calendar/v3/'+path,{...options,headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json',...options.headers}});}
export async function listCalendars(){let result=[],pageToken='';do{const r=await api('users/me/calendarList?maxResults=250'+(pageToken?'&pageToken='+encodeURIComponent(pageToken):''));result.push(...r.items);pageToken=r.nextPageToken;}while(pageToken);return result;}
const eventWindows=new Map();
export async function listEvents(calendar,year){
 const key=googleAccount+':'+calendar+':'+year,prior=eventWindows.get(key),params=prior?.syncToken?new URLSearchParams({syncToken:prior.syncToken,singleEvents:'true',maxResults:'2500'}):new URLSearchParams({timeMin:new Date(year,0,1).toISOString(),timeMax:new Date(year+1,0,1).toISOString(),singleEvents:'true',maxResults:'2500'});
 const records=new Map(prior?.records||[]);let token='',nextSync='';
 try{do{if(token)params.set('pageToken',token);const r=await api(`calendars/${encodeURIComponent(calendar)}/events?${params}`);for(const e of r.items||[])e.status==='cancelled'?records.delete(e.id):records.set(e.id,e);token=r.nextPageToken;nextSync=r.nextSyncToken||nextSync;}while(token);}
 catch(e){if(e.status===410&&prior){eventWindows.delete(key);return listEvents(calendar,year);}throw e;}
 eventWindows.set(key,{records:[...records],syncToken:nextSync});return [...records.values()].filter(e=>e.start);
}
export function fromGoogle(e,calendar){const start=e.start.dateTime,end=e.end.dateTime;const local=s=>{const d=new Date(s);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};const time=s=>new Date(s).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false});const endExclusive=e.end.date;let lastDate;if(endExclusive){const d=new Date(endExclusive+'T12:00:00');d.setDate(d.getDate()-1);lastDate=local(d);}else if(end){const d=new Date(end);d.setMilliseconds(d.getMilliseconds()-1);lastDate=local(d);}return {id:`google:${calendar}:${e.id}`,title:e.summary||'Untitled event',date:e.start.date||local(start),lastDate,time:start?time(start):'',endTime:end?time(end):'',endDate:end?local(end):lastDate,location:e.location||'',notes:e.description||'',category:'personal',repeat:'none',google:{id:e.id,calendar,etag:e.etag,recurring:!!e.recurringEventId},reminder:''};}
export function toGoogle(e){const body={summary:e.title,description:e.notes||'',location:e.location||'',start:e.time?{dateTime:new Date(`${e.date}T${e.time}:00`).toISOString()}:{date:e.date},end:e.time?{dateTime:new Date(`${e.endDate||e.date}T${e.endTime}:00`).toISOString()}:{date:(()=>{const d=new Date((e.lastDate||e.date)+'T12:00:00');d.setDate(d.getDate()+1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;})()},reminders:{useDefault:e.reminder===''||e.reminder==null,overrides:e.reminder===''||e.reminder==null?[]:[{method:'popup',minutes:Number(e.reminder)}]}};if(e.repeat&&e.repeat!=='none'){body.recurrence=[`RRULE:FREQ=${e.repeat.toUpperCase()}`];body.start.timeZone=body.end.timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone;}return body;}
export async function saveEvent(e,calendar){const existing=e.google;return api(`calendars/${encodeURIComponent(existing?.calendar||calendar)}/events${existing?'/'+encodeURIComponent(existing.id):''}`,{method:existing?'PATCH':'POST',headers:existing?.etag?{'If-Match':existing.etag}:{},body:JSON.stringify(toGoogle(e))});}
export async function deleteEvent(e){return api(`calendars/${encodeURIComponent(e.google.calendar)}/events/${encodeURIComponent(e.google.id)}`,{method:'DELETE',headers:e.google.etag?{'If-Match':e.google.etag}:{}});}

export const backupConnected=()=>connected()&&backupGranted;
async function drive(path,options={}){await ensureConnection();if(!backupConnected())throw Error('Connect Google with notebook backup enabled.');return googleRequest('Drive','https://www.googleapis.com/'+path,{...options,headers:{Authorization:`Bearer ${accessToken}`,...options.headers}});}
async function backupFolder(){
  const p=new URLSearchParams({q:"trashed = false and mimeType = 'application/vnd.google-apps.folder' and name = 'Unbound'",pageSize:'10',fields:'files(id,name,createdTime)'});
  const found=await drive('drive/v3/files?'+p);
  if(found.files?.length)return found.files[0].id;
  return (await drive('drive/v3/files?fields=id',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Unbound',mimeType:'application/vnd.google-apps.folder'})})).id;
}
export async function listBackups(){
  const folder=await backupFolder();
  const p=new URLSearchParams({q:`trashed = false and '${folder}' in parents and name contains 'unbound-days-'`,pageSize:'100',orderBy:'createdTime desc',fields:'nextPageToken,files(id,name,createdTime,description)'});
  let result=[],token='';do{if(token)p.set('pageToken',token);const r=await drive('drive/v3/files?'+p);result.push(...(r.files||[]));token=r.nextPageToken||'';}while(token);return result;
}
// Immutable snapshots avoid one device silently replacing another's notebook.
export async function backupNotebook(state,device){
  const folder=await backupFolder(),boundary='unbound_'+crypto.randomUUID(),time=new Date().toISOString();
  const metadata={name:`unbound-days-${time}-${device}.json`,parents:[folder],mimeType:'application/json',description:`Unbound notebook saved ${time}`};
  const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(state)}\r\n--${boundary}--`;
  const saved=await drive('upload/drive/v3/files?uploadType=multipart&fields=id,createdTime',{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body});
  // Keep automatic Drive snapshots bounded. The newest 20 complete copies remain available.
  try{
    const copies=await listBackups();
    for(const old of copies.slice(20))await drive('drive/v3/files/'+encodeURIComponent(old.id),{method:'DELETE'});
  }catch{}
  return saved;
}
export async function readBackup(id){return drive('drive/v3/files/'+encodeURIComponent(id)+'?alt=media');}

export const tasksConnected=()=>connected()&&tasksGranted&&!!googleAccount;
export const taskIdentity=()=>tasksConnected()?googleAccount:'';
export async function tasksApi(path,options={}){await ensureConnection();if(!tasksConnected())throw Error('Reconnect Google and grant Tasks access.');return googleRequest('Tasks','https://www.googleapis.com/tasks/v1/'+path,{...options,headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json',...options.headers}});}
