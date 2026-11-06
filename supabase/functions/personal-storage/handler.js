const enc=new TextEncoder(),dec=new TextDecoder();
const providers={
 'google-drive':{client:'GOOGLE_STORAGE_CLIENT_ID',secret:'GOOGLE_STORAGE_CLIENT_SECRET',token:'https://oauth2.googleapis.com/token',refresh:'https://oauth2.googleapis.com/token',identity:'https://www.googleapis.com/oauth2/v3/userinfo'},
 dropbox:{client:'DROPBOX_APP_KEY',secret:'DROPBOX_APP_SECRET',token:'https://api.dropboxapi.com/oauth2/token',refresh:'https://api.dropboxapi.com/oauth2/token',identity:'https://api.dropboxapi.com/2/users/get_current_account'},
 box:{client:'BOX_CLIENT_ID',secret:'BOX_CLIENT_SECRET',token:'https://api.box.com/oauth2/token',refresh:'https://api.box.com/oauth2/token',identity:'https://api.box.com/2.0/users/me'}
};
const safeProvider=value=>Object.hasOwn(providers,value)?value:null;
async function keyFrom(text){if(typeof text!=='string')throw Error('Token encryption unavailable');let raw;try{raw=Uint8Array.from(atob(text),c=>c.charCodeAt(0));}catch{throw Error('Token encryption unavailable');}if(raw.length!==32)throw Error('Token encryption unavailable');return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);}
export async function seal(value,keyText){const iv=crypto.getRandomValues(new Uint8Array(12)),key=await keyFrom(keyText),body=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(value)));return btoa(String.fromCharCode(...iv,...body));}
export async function unseal(value,keyText){const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));if(bytes.length<29)throw Error('Invalid credential');const key=await keyFrom(keyText);return dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12)},key,bytes.slice(12)));}
async function jsonResponse(response){let value;try{value=await response.json();}catch{throw Error('Provider returned an invalid response');}if(!response.ok)throw Error('Provider authorisation failed');return value;}
export function createHandler({env,authenticate,admin,fetch:request=fetch,now=Date.now}){
 return async req=>{
  const origin=req.headers.get('Origin')||'',allowed=(env.APP_ORIGINS||'').split(',').map(x=>x.trim()).includes(origin)&&!!origin;
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':allowed?origin:'','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
  const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
  if(!allowed)return reply(403,{message:'Origin denied'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply(405,{message:'Method denied'});
  try{
   const jwt=req.headers.get('Authorization')?.replace(/^Bearer /,'');if(!jwt)return reply(401,{message:'Authentication required'});
   const user=await authenticate(jwt);if(!user?.id)return reply(401,{message:'Invalid session'});
   if(Number(req.headers.get('Content-Length'))>16384)return reply(413,{message:'Request too large'});
   const raw=await req.text();if(raw.length>16384)return reply(413,{message:'Request too large'});
   let body;try{body=JSON.parse(raw);}catch{return reply(400,{message:'Invalid request'});}
   const provider=safeProvider(body.provider),table=()=>admin.from('personal_storage_connections');
   const getStored=async()=>{const r=await table().select('provider_account_id,refresh_ciphertext,scopes,updated_at').eq('user_id',user.id).eq('provider',provider).maybeSingle();if(r.error)throw Error('Storage connection unavailable');return r.data;};
   if(body.action==='status'){
    const [connections,prefs]=await Promise.all([table().select('provider,provider_account_id,connected_at,updated_at').eq('user_id',user.id),admin.from('storage_preferences').select('attachment_provider,backup_provider,updated_at').eq('user_id',user.id).maybeSingle()]);
    if(connections.error||prefs.error)throw Error('Storage preferences unavailable');
    return reply(200,{connections:(connections.data||[]).map(x=>({provider:x.provider,account:x.provider_account_id,connectedAt:x.connected_at,updatedAt:x.updated_at})),preferences:prefs.data||{attachment_provider:null,backup_provider:null}});
   }
   if(!provider)return reply(400,{message:'Unsupported storage provider'});
   if(body.action==='disconnect'){
    const preference=await admin.from('storage_preferences').select('attachment_provider,backup_provider').eq('user_id',user.id).maybeSingle();if(preference.error)throw Error('Storage preferences unavailable');
    if(preference.data){const p=preference.data;const next={attachment_provider:p.attachment_provider===provider?null:p.attachment_provider,backup_provider:p.backup_provider===provider?null:p.backup_provider,updated_at:new Date(now()).toISOString()};const r=await admin.from('storage_preferences').update(next).eq('user_id',user.id);if(r.error)throw Error('Storage preferences unavailable');}
    const deleted=await table().delete().eq('user_id',user.id).eq('provider',provider);if(deleted.error)throw Error('Storage disconnect failed');return reply(200,{status:'disconnected'});
   }
   const cfg=providers[provider],clientId=env[cfg.client],secret=env[cfg.secret];if(!clientId||!secret||!env.STORAGE_TOKEN_KEY)return reply(503,{message:'This provider is not configured yet'});
   if(body.action==='exchange'){
    if(typeof body.code!=='string'||body.code.length>4096||typeof body.codeVerifier!=='string'||! /^[A-Za-z0-9._~-]{43,128}$/.test(body.codeVerifier))return reply(400,{message:'Invalid authorisation response'});
    let redirect;try{redirect=new URL(body.redirectUri);}catch{return reply(400,{message:'Invalid redirect'});}if(redirect.origin!==origin||redirect.search||redirect.hash)return reply(400,{message:'Invalid redirect'});
    const form=new URLSearchParams({grant_type:'authorization_code',code:body.code,client_id:clientId,client_secret:secret,redirect_uri:redirect.href,code_verifier:body.codeVerifier});
    const token=await jsonResponse(await request(cfg.token,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form}));
    if(typeof token.access_token!=='string'||typeof token.refresh_token!=='string'||!Number.isFinite(Number(token.expires_in)))return reply(502,{message:'Provider did not grant a renewable connection'});
    const identityResponse=await request(cfg.identity,{method:provider==='dropbox'?'POST':'GET',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},...(provider==='dropbox'?{body:'{}'}:{})});
    const identity=await jsonResponse(identityResponse),account=provider==='google-drive'?identity.sub:provider==='dropbox'?identity.account_id:identity.id;
    if(typeof account!=='string'&&typeof account!=='number')return reply(502,{message:'Provider account could not be verified'});
    const scopes=String(token.scope||'').split(/[ ,]+/).filter(Boolean);const saved=await table().upsert({user_id:user.id,provider,provider_account_id:String(account),refresh_ciphertext:await seal(token.refresh_token,env.STORAGE_TOKEN_KEY),scopes,connected_at:new Date(now()).toISOString(),updated_at:new Date(now()).toISOString()});
    if(saved.error)throw Error('Storage connection could not be saved');return reply(200,{status:'connected',provider,account:String(account),accessToken:token.access_token,expiresIn:Number(token.expires_in)});
   }
   if(body.action==='refresh'){
    const stored=await getStored();if(!stored)return reply(200,{status:'disconnected'});
    const refreshToken=await unseal(stored.refresh_ciphertext,env.STORAGE_TOKEN_KEY);
    const token=await jsonResponse(await request(cfg.refresh,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:refreshToken,client_id:clientId,client_secret:secret})}));
    if(typeof token.access_token!=='string'||!Number.isFinite(Number(token.expires_in)))return reply(502,{message:'Provider could not renew access'});
    if(typeof token.refresh_token==='string'){
     const updated=await table().update({refresh_ciphertext:await seal(token.refresh_token,env.STORAGE_TOKEN_KEY),updated_at:new Date(now()).toISOString()}).eq('user_id',user.id).eq('provider',provider);if(updated.error)throw Error('Storage connection could not be renewed');
    }
    return reply(200,{status:'connected',provider,account:stored.provider_account_id,accessToken:token.access_token,expiresIn:Number(token.expires_in)});
   }
   return reply(400,{message:'Invalid storage action'});
  }catch{return reply(503,{message:'Personal storage is unavailable. Please retry.'});}
 };
}
