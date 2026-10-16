// Provider credentials are never included in notebook storage or backups.
export const googleScopes=['https://www.googleapis.com/auth/calendar.events','https://www.googleapis.com/auth/calendar.calendarlist.readonly','https://www.googleapis.com/auth/tasks','https://www.googleapis.com/auth/drive.file'];
export function googleLoginOptions(redirectTo,email,consent=false){
 return {provider:'google',options:{redirectTo,scopes:googleScopes.join(' '),queryParams:{access_type:'offline',include_granted_scopes:'true',...(consent?{prompt:'consent'}:{}),...(email?{login_hint:email}:{})}}};
}
// Supabase persists its own session, but Google credentials belong on the server.
export function authStorage(storage){return {
 getItem:key=>storage.getItem(key),removeItem:key=>storage.removeItem(key),
 setItem(key,value){let clean=value;try{const session=JSON.parse(value);delete session.provider_token;delete session.provider_refresh_token;clean=JSON.stringify(session);}catch{}storage.setItem(key,clean);}
};}
export function createGoogleSession({invoke,credentials=()=>null,enabled=()=>true,now=Date.now}){
 let session=null,pending=null,generation=0;
 async function restore(force=false){
  if(!enabled())return null;
  if(!force&&session&&session.expiresAt>now()+90000)return session;
  if(pending)return pending;
  const current=generation;
  pending=(async()=>{
   const tokens=credentials();
   const {data,error}=await invoke({action:tokens?.accessToken?'store':'refresh',...(tokens?.accessToken?tokens:{})});
   if(error)throw Error('Google connection could not be restored. Check your connection or reconnect in Settings.');
   if(current!==generation)return null;
   if(data?.status==='disconnected'||data?.status==='reconnect'){session=null;return null;}
   if(!data?.accessToken||!data?.account||!Number.isFinite(data.expiresIn))throw Error('Invalid Google connection response.');
   session={...data,expiresAt:now()+data.expiresIn*1000};return session;
  })().finally(()=>{pending=null;});
  return pending;
 }
 function clear(){generation++;session=null;}
 async function disconnect(){clear();const {error}=await invoke({action:'disconnect'});if(error)throw Error('Google disconnect failed. Try again.');}
 return {restore,clear,disconnect};
}
