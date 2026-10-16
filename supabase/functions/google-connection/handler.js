const requiredScopes=['https://www.googleapis.com/auth/calendar.events','https://www.googleapis.com/auth/calendar.calendarlist.readonly','https://www.googleapis.com/auth/tasks','https://www.googleapis.com/auth/drive.file'];
const encoder=new TextEncoder(),decoder=new TextDecoder();
export async function seal(token,keyText){
 const key=await crypto.subtle.importKey('raw',Uint8Array.from(atob(keyText),c=>c.charCodeAt(0)),'AES-GCM',false,['encrypt']);
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(token)));
 return btoa(String.fromCharCode(...iv,...ciphertext));
}
export async function unseal(value,keyText){
 const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('raw',Uint8Array.from(atob(keyText),c=>c.charCodeAt(0)),'AES-GCM',false,['decrypt']);
 return decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12)},key,bytes.slice(12)));
}
export function createHandler({env,authenticate,admin,fetch:request=fetch}){
 return async req=>{
  const origin=req.headers.get('Origin')||'';
  const allowed=(env.APP_ORIGINS||'').split(',').map(s=>s.trim()).includes(origin)&&!!origin;
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':allowed?origin:'','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
  const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
  if(!allowed)return reply(403,{message:'Origin denied'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply(405,{message:'Method denied'});
  try{
   const jwt=req.headers.get('Authorization')?.replace(/^Bearer /,'');
   if(!jwt)return reply(401,{message:'Authentication required'});
   const user=await authenticate(jwt);if(!user)return reply(401,{message:'Invalid session'});
   if(Number(req.headers.get('Content-Length'))>16384)return reply(413,{message:'Request too large'});
   const raw=await req.text();if(raw.length>16384)return reply(413,{message:'Request too large'});
   let body;try{body=JSON.parse(raw);}catch{return reply(400,{message:'Invalid request'});}
   const table=()=>admin.from('google_connections');
   const check=result=>{if(result.error)throw Error('Database unavailable');return result.data;};
   if(body.action==='disconnect'){check(await table().delete().eq('user_id',user.id));return reply(200,{status:'disconnected'});}
   if(!['store','refresh'].includes(body.action))return reply(400,{message:'Invalid action'});
   if(!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET||!env.GOOGLE_TOKEN_KEY)return reply(503,{message:'Google connection service requires configuration'});
   const existing=check(await table().select('google_sub,refresh_ciphertext').eq('user_id',user.id).maybeSingle());
   const googleSub=user.identities?.find(i=>i.provider==='google')?.identity_data?.sub;
   if(!googleSub)return reply(200,{status:'reconnect'});
   let accessToken,refreshToken,refreshResponse;
   if(body.action==='store'){
    if(typeof body.accessToken!=='string'||body.accessToken.length>8192)return reply(400,{message:'Google credential missing'});
    accessToken=body.accessToken;
    if(body.refreshToken&&typeof body.refreshToken!=='string')return reply(400,{message:'Invalid Google credential'});
    refreshToken=body.refreshToken||(existing?.google_sub===googleSub?await unseal(existing.refresh_ciphertext,env.GOOGLE_TOKEN_KEY):'');
    if(!refreshToken)return reply(200,{status:'reconnect'});
   }else{
    if(!existing)return reply(200,{status:'disconnected'});
    if(existing.google_sub!==googleSub)return reply(200,{status:'reconnect'});
    refreshToken=await unseal(existing.refresh_ciphertext,env.GOOGLE_TOKEN_KEY);
   }
   // Refresh once before saving too: verifies the refresh token belongs to this
   // OAuth client, then tokeninfo binds its resulting identity to the login.
   refreshResponse=await request('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,refresh_token:refreshToken,grant_type:'refresh_token'})});
   const refreshed=await refreshResponse.json();
   if(!refreshResponse.ok){
    if(refreshed.error==='invalid_grant')return reply(200,{status:'reconnect'});
    return reply(502,{message:'Google renewal unavailable'});
   }
   accessToken=refreshed.access_token;
   if(typeof accessToken!=='string')throw Error('Google renewal failed');
   const infoResponse=await request('https://oauth2.googleapis.com/tokeninfo?access_token='+encodeURIComponent(accessToken));
   if(!infoResponse.ok)return reply(502,{message:'Google verification unavailable'});
   const info=await infoResponse.json(),scopes=String(info.scope||'').split(' ');
   if(info.aud!==env.GOOGLE_CLIENT_ID||info.sub!==googleSub)return reply(403,{message:'Google account does not match your Unbound login'});
   if(!requiredScopes.every(s=>scopes.includes(s)))return reply(200,{status:'reconnect'});
   const expiresIn=Math.min(Number(info.expires_in),Number(refreshed.expires_in));
   if(!Number.isFinite(expiresIn)||expiresIn<1)return reply(502,{message:'Google credential expired'});
   if(body.action==='store'||refreshed.refresh_token){
    const ciphertext=await seal(refreshed.refresh_token||refreshToken,env.GOOGLE_TOKEN_KEY);
    check(await table().upsert({user_id:user.id,google_sub:googleSub,refresh_ciphertext:ciphertext,updated_at:new Date().toISOString()}));
   }
   return reply(200,{status:'connected',accessToken,expiresIn,account:googleSub,scopes});
  }catch{return reply(503,{message:'Google connection unavailable. Please retry.'});}
 };
}
