let accessToken='',expires=0,client=null,backupGranted=false;
export const connected=()=>!!accessToken&&Date.now()<expires;
export async function connect(clientId,withBackup=false){
  if(!clientId)throw new Error('Add a Google OAuth client ID in Settings first.');
  if(!window.google?.accounts?.oauth2){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.onload=resolve;script.onerror=()=>reject(new Error('Google sign-in could not load. Check your connection.'));document.head.append(script);});}
  return new Promise((resolve,reject)=>{client=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly'+(withBackup?' https://www.googleapis.com/auth/drive.appdata':''),callback:r=>{if(r.error)return reject(new Error(r.error_description||r.error));backupGranted=google.accounts.oauth2.hasGrantedAllScopes(r,'https://www.googleapis.com/auth/drive.appdata');accessToken=r.access_token;expires=Date.now()+Number(r.expires_in)*1000;resolve();},error_callback:e=>reject(new Error(e.type==='popup_closed'?'Sign-in cancelled.':'Google sign-in was blocked. Allow pop-ups and try again.'))});client.requestAccessToken({prompt:'select_account'});});
}
export function disconnect(){if(accessToken&&window.google)google.accounts.oauth2.revoke(accessToken,()=>{});accessToken='';expires=0;backupGranted=false;}
export async function api(path,options={}){if(!connected())throw new Error('Reconnect Google Calendar to continue.');const response=await fetch('https://www.googleapis.com/calendar/v3/'+path,{...options,headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json',...options.headers}});if(response.status===401){accessToken='';throw new Error('Your Google session expired. Reconnect to continue.');}if(response.status===412)throw new Error('This event changed in Google. Refresh the calendar before editing it again.');if(!response.ok){let error={};try{error=await response.json();}catch{}throw new Error(error.error?.message||'Google Calendar could not complete this change.');}return response.status===204?null:response.json();}
export async function listCalendars(){let result=[],pageToken='';do{const r=await api('users/me/calendarList?maxResults=250'+(pageToken?'&pageToken='+encodeURIComponent(pageToken):''));result.push(...r.items);pageToken=r.nextPageToken;}while(pageToken);return result;}
export async function listEvents(calendar,year){const params=new URLSearchParams({timeMin:new Date(year,0,1).toISOString(),timeMax:new Date(year+1,0,1).toISOString(),singleEvents:'true',maxResults:'2500',orderBy:'startTime'});let result=[],token='';do{if(token)params.set('pageToken',token);const r=await api(`calendars/${encodeURIComponent(calendar)}/events?${params}`);result.push(...r.items);token=r.nextPageToken;}while(token);return result.filter(e=>e.status!=='cancelled'&&e.start);}
export function fromGoogle(e,calendar){const start=e.start.dateTime,end=e.end.dateTime;const local=s=>{const d=new Date(s);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};const time=s=>new Date(s).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false});const endExclusive=e.end.date;let lastDate;if(endExclusive){const d=new Date(endExclusive+'T12:00:00');d.setDate(d.getDate()-1);lastDate=local(d);}else if(end){const d=new Date(end);d.setMilliseconds(d.getMilliseconds()-1);lastDate=local(d);}return {id:`google:${calendar}:${e.id}`,title:e.summary||'Untitled event',date:e.start.date||local(start),lastDate,time:start?time(start):'',endTime:end?time(end):'',endDate:end?local(end):lastDate,location:e.location||'',notes:e.description||'',category:'personal',repeat:'none',google:{id:e.id,calendar,etag:e.etag,recurring:!!e.recurringEventId},reminder:''};}
export function toGoogle(e){const body={summary:e.title,description:e.notes||'',location:e.location||'',start:e.time?{dateTime:new Date(`${e.date}T${e.time}:00`).toISOString()}:{date:e.date},end:e.time?{dateTime:new Date(`${e.endDate||e.date}T${e.endTime}:00`).toISOString()}:{date:(()=>{const d=new Date((e.lastDate||e.date)+'T12:00:00');d.setDate(d.getDate()+1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;})()},reminders:{useDefault:e.reminder===''||e.reminder==null,overrides:e.reminder===''||e.reminder==null?[]:[{method:'popup',minutes:Number(e.reminder)}]}};if(e.repeat&&e.repeat!=='none'){body.recurrence=[`RRULE:FREQ=${e.repeat.toUpperCase()}`];body.start.timeZone=body.end.timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone;}return body;}
export async function saveEvent(e,calendar){const existing=e.google;return api(`calendars/${encodeURIComponent(existing?.calendar||calendar)}/events${existing?'/'+encodeURIComponent(existing.id):''}`,{method:existing?'PATCH':'POST',headers:existing?.etag?{'If-Match':existing.etag}:{},body:JSON.stringify(toGoogle(e))});}
export async function deleteEvent(e){return api(`calendars/${encodeURIComponent(e.google.calendar)}/events/${encodeURIComponent(e.google.id)}`,{method:'DELETE',headers:e.google.etag?{'If-Match':e.google.etag}:{}});}

export const backupConnected=()=>connected()&&backupGranted;
async function drive(path,options={}){
  if(!backupConnected())throw Error('Connect Google with notebook backup enabled.');
  const r=await fetch('https://www.googleapis.com/'+path,{...options,headers:{Authorization:`Bearer ${accessToken}`,...options.headers}});
  if(r.status===401){accessToken='';throw Error('Reconnect Google to resume notebook backups.');}
  if(!r.ok){let e={};try{e=await r.json();}catch{}throw Error(e.error?.message||'Notebook backup could not complete.');}
  return r.json();
}
export async function listBackups(){
  const p=new URLSearchParams({spaces:'appDataFolder',q:"trashed = false and name contains 'unbound-days-'",pageSize:'100',orderBy:'createdTime desc',fields:'nextPageToken,files(id,name,createdTime,description)'});
  let result=[],token='';do{if(token)p.set('pageToken',token);const r=await drive('drive/v3/files?'+p);result.push(...(r.files||[]));token=r.nextPageToken||'';}while(token);return result;
}
// Immutable snapshots avoid one device silently replacing another's notebook.
export async function backupNotebook(state,device){
  const boundary='unbound_'+crypto.randomUUID(),time=new Date().toISOString();
  const metadata={name:`unbound-days-${time}-${device}.json`,parents:['appDataFolder'],mimeType:'application/json',description:`Unbound Days notebook saved ${time}`};
  const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(state)}\r\n--${boundary}--`;
  return drive('upload/drive/v3/files?uploadType=multipart&fields=id,createdTime',{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body});
}
export async function readBackup(id){return drive('drive/v3/files/'+encodeURIComponent(id)+'?alt=media');}
