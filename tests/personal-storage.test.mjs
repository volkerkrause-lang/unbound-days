import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createPersonalStorage} from '../personal-storage.js';
import {createHandler,seal,unseal} from '../supabase/functions/personal-storage/handler.js';

const key=btoa(String.fromCharCode(...new Uint8Array(32).fill(17)));
class Query{
 constructor(table,rows){this.table=table;this.rows=rows;this.filters={};this.operation='select';this.patch=null;}
 select(){this.operation='select';return this;}
 eq(name,value){this.filters[name]=value;return this;}
 maybeSingle(){return Promise.resolve({data:this.match()[0]||null,error:null});}
 upsert(row){this.operation='upsert';this.patch=row;return Promise.resolve(this.execute());}
 update(patch){this.operation='update';this.patch=patch;return this;}
 delete(){this.operation='delete';return this;}
 match(){return [...this.rows.values()].filter(row=>Object.entries(this.filters).every(([k,v])=>row[k]===v));}
 execute(){const matching=this.match();if(this.operation==='select')return {data:matching,error:null};if(this.operation==='upsert'){const row={...this.patch};this.rows.set(this.table==='personal_storage_connections'?row.user_id+'|'+row.provider:row.user_id,row);return {data:row,error:null};}if(this.operation==='update'){for(const row of matching)Object.assign(row,this.patch);return {data:matching,error:null};}if(this.operation==='delete'){for(const row of matching)this.rows.delete(this.table==='personal_storage_connections'?row.user_id+'|'+row.provider:row.user_id);return {data:matching,error:null};}return {data:null,error:null};}
 then(resolve,reject){return Promise.resolve(this.execute()).then(resolve,reject);}
}
function fixture({providerResponse,identityResponse,fetcher}={}){
 const rows={personal_storage_connections:new Map(),storage_preferences:new Map(),attachments:new Map()},calls=[];
 const env={APP_ORIGINS:'https://dev.test',STORAGE_TOKEN_KEY:key,GOOGLE_STORAGE_CLIENT_ID:'google-client',GOOGLE_STORAGE_CLIENT_SECRET:'google-secret',DROPBOX_APP_KEY:'dropbox-key',DROPBOX_APP_SECRET:'dropbox-secret',BOX_CLIENT_ID:'box-client',BOX_CLIENT_SECRET:'box-secret'};
 const admin={from:table=>new Query(table,rows[table])};
 const defaultFetch=async(url,options)=>{calls.push({url,options});if(url==='https://oauth2.googleapis.com/token')return Response.json(providerResponse||{access_token:'short-lived',refresh_token:'long-lived-secret',expires_in:3600,scope:'openid email https://www.googleapis.com/auth/drive.file'});if(url==='https://www.googleapis.com/oauth2/v3/userinfo')return Response.json(identityResponse||{sub:'provider-user'});throw Error('unexpected request '+url);};
 const handler=createHandler({env,admin,authenticate:async token=>token==='valid'?{id:'user-1'}:null,fetch:fetcher||defaultFetch});
 const send=(body,origin='https://dev.test',token='valid')=>handler(new Request('https://supabase.test/functions/v1/personal-storage',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)}));
 return {send,rows,calls};
}

test('broker rejects other origins and unauthenticated calls before provider requests',async()=>{
 const f=fixture();assert.equal((await f.send({action:'status'},'https://attacker.test')).status,403);assert.equal((await f.send({action:'status','provider':'google-drive'},'https://dev.test','bad')).status,401);assert.equal(f.calls.length,0);
});

test('refresh credentials are encrypted and never returned to the browser',async()=>{
 const f=fixture(),response=await f.send({action:'exchange',provider:'google-drive',code:'oauth-code',codeVerifier:'a'.repeat(43),redirectUri:'https://dev.test/'}),body=await response.json();
 assert.equal(response.status,200);assert.equal(body.accessToken,'short-lived');assert.equal(body.account,'provider-user');assert.equal(body.refreshToken,undefined);
 const row=f.rows.personal_storage_connections.get('user-1|google-drive');assert.ok(row.refresh_ciphertext);assert.notEqual(row.refresh_ciphertext,'long-lived-secret');assert.equal(await unseal(row.refresh_ciphertext,key),'long-lived-secret');
});

test('OAuth code exchange rejects a redirect on another origin',async()=>{
 const f=fixture(),response=await f.send({action:'exchange',provider:'google-drive',code:'oauth-code',codeVerifier:'b'.repeat(43),redirectUri:'https://attacker.test/'});assert.equal(response.status,400);assert.equal(f.calls.length,0);
});

test('status returns account connection metadata without refresh-token ciphertext',async()=>{
 const f=fixture();f.rows.personal_storage_connections.set('user-1|dropbox',{user_id:'user-1',provider:'dropbox',provider_account_id:'dbid:123',refresh_ciphertext:'private-ciphertext',connected_at:'2026-11-06T00:00:00Z'});
 f.rows.storage_preferences.set('user-1',{user_id:'user-1',attachment_provider:'dropbox',backup_provider:null});
 const response=await f.send({action:'status'}),body=await response.json();assert.equal(response.status,200);assert.equal(body.connections[0].provider,'dropbox');assert.equal(body.preferences.attachment_provider,'dropbox');assert.doesNotMatch(JSON.stringify(body),/private-ciphertext/);
});

test('token encryption uses unique authenticated ciphertext',async()=>{
 const a=await seal('refresh',key),b=await seal('refresh',key);assert.notEqual(a,b);assert.equal(await unseal(a,key),'refresh');const bytes=Uint8Array.from(atob(a),c=>c.charCodeAt(0));bytes[bytes.length-1]^=1;await assert.rejects(unseal(btoa(String.fromCharCode(...bytes)),key));
});

test('Box refresh stores its rotated single-use refresh token before returning access',async()=>{
 const f=fixture({fetcher:async(url,options)=>{f.calls.push({url,options});return Response.json({access_token:'box-access',refresh_token:'box-refresh-rotated',expires_in:3600});}});
 f.rows.personal_storage_connections.set('user-1|box',{user_id:'user-1',provider:'box',provider_account_id:'box-account',refresh_ciphertext:await seal('box-refresh-old',key)});
 const response=await f.send({action:'refresh',provider:'box'}),body=await response.json();assert.equal(response.status,200);assert.equal(body.accessToken,'box-access');assert.equal(await unseal(f.rows.personal_storage_connections.get('user-1|box').refresh_ciphertext,key),'box-refresh-rotated');
});

test('Box refresh fails closed if the provider does not rotate its single-use token',async()=>{
 const f=fixture({fetcher:async(url,options)=>{f.calls.push({url,options});return Response.json({access_token:'box-access',expires_in:3600});}});
 f.rows.personal_storage_connections.set('user-1|box',{user_id:'user-1',provider:'box',provider_account_id:'box-account',refresh_ciphertext:await seal('box-refresh-old',key)});
 const response=await f.send({action:'refresh',provider:'box'}),body=await response.json();assert.equal(response.status,502);assert.match(body.message,/Reconnect Box/);assert.equal(await unseal(f.rows.personal_storage_connections.get('user-1|box').refresh_ciphertext,key),'box-refresh-old');
});

test('storage migration enforces owner-only metadata and keeps refresh credentials server-only',async()=>{
 const db=new PGlite(),a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;insert into auth.users values('${a}'),('${b}');`);
  await db.exec(await readFile(new URL('../supabase/migrations/202611060001_personal_storage.sql',import.meta.url),'utf8'));
  await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${a}',false);`);
  await assert.rejects(db.exec(`insert into public.storage_preferences(user_id,attachment_provider) values('${a}','google-drive')`),/storage_provider_not_connected/);
  await assert.rejects(db.query('select * from public.personal_storage_connections'),/permission denied/);
  await db.exec(`reset role;set role service_role;insert into public.personal_storage_connections(user_id,provider,provider_account_id,refresh_ciphertext) values('${a}','google-drive','provider-a','ciphertext');reset role;set role authenticated;select set_config('request.jwt.claim.sub','${a}',false);`);
  await db.exec(`insert into public.storage_preferences(user_id,attachment_provider) values('${a}','google-drive');insert into public.attachments(id,user_id,note_id,provider,provider_file_id,name,mime_type,byte_size) values('10000000-0000-4000-8000-000000000001','${a}','note-a','google-drive','file-a','a.jpg','image/jpeg',100);`);
  assert.equal((await db.query('select count(*)::int as n from public.attachments')).rows[0].n,1);
  await db.exec(`select set_config('request.jwt.claim.sub','${b}',false);`);assert.equal((await db.query('select count(*)::int as n from public.attachments')).rows[0].n,0);
 }finally{await db.close();}
});

test('provider adapters upload binary files directly and save only metadata through Supabase',async()=>{
 const providers=[['google-drive','https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size','drive-file-id'],['dropbox','https://content.dropboxapi.com/2/files/upload','dropbox-file-id'],['box','https://upload.box.com/api/2.0/files/content','box-file-id']];
 const oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
 try{for(const [provider,uploadUrl,fileId] of providers){
  const providerRequests=[],functionCalls=[],stored=[];
  const client={functions:{invoke:async(_name,{body})=>{functionCalls.push(body);if(body.action==='status')return {data:{connections:[{provider}],preferences:{attachment_provider:provider}},error:null};return {data:{status:'connected',provider,account:'provider-account',accessToken:'short-lived',expiresIn:3600},error:null};}},auth:{getUser:async()=>({data:{user:{id:'unbound-user'}}})},from:()=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({data:null,error:null}),insert(row){stored.push(row);return {select(){return this;},single:async()=>({data:{...row},error:null})};}})};
  const fetcher=async(url,options)=>{providerRequests.push({url,options});if(provider==='dropbox'&&url.includes('create_folder_v2'))return Response.json({});if(url===uploadUrl)return Response.json(provider==='box'?{entries:[{id:fileId}]}:{id:fileId});throw Error('Unexpected provider request '+url);};
  const storage=new Map(),fakeStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
  const api=createPersonalStorage({client,config:{googleClientId:'google-client',dropboxAppKey:'dropbox-key',boxClientId:'box-client'},fetcher,storage:fakeStorage,preferenceStorage:null,locationRef:{origin:'https://dev.test',pathname:'/'},historyRef:{replaceState(){}}});
  const file=new File(['private image bytes'],'photo.jpg',{type:'image/jpeg'}),result=await api.upload({noteId:'note-1',file,captureId:'capture-1'});
  assert.equal(result.provider_file_id,fileId);assert.equal(stored.length,1);assert.equal(stored[0].provider_file_id,fileId);assert.equal(stored[0].byte_size,file.size);assert.ok(providerRequests.some(request=>request.url===uploadUrl));assert.equal(functionCalls.some(call=>call.file),false);assert.equal(functionCalls.filter(call=>call.action==='refresh').length,1);
 }}finally{if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else delete globalThis.navigator;}
});

test('account-level notebook backup adapters save, list and read on each selected provider',async()=>{
 for(const provider of ['google-drive','dropbox','box']){
  const requests=[],client={functions:{invoke:async(_name,{body})=>({data:body.action==='status'?{connections:[{provider}],preferences:{attachment_provider:null,backup_provider:provider}}:{status:'connected',provider,accessToken:'short-lived',expiresIn:3600},error:null})},auth:{getSession:async()=>({data:{session:{user:{id:'user-1'}}}})},from:()=>({update(){return this;},eq(){return Promise.resolve({error:null});}})};
  const fetcher=async(url,options={})=>{requests.push({url,options});if(provider==='google-drive'&&url.startsWith('https://www.googleapis.com/drive/v3/files?')){if(options.method==='POST')return Response.json({id:'folder-id'});return Response.json({files:[{id:'folder-id',name:'Unbound'}]});}if(provider==='google-drive'&&url.includes('/upload/drive/v3/files?'))return Response.json({id:'backup-file',createdTime:'2026-11-06T12:00:00Z'});if(provider==='google-drive'&&url.includes('alt=media'))return Response.json({format:'unbound-days-snapshot-v2'});
   if(provider==='dropbox'&&url.includes('create_folder_v2'))return Response.json({});if(provider==='dropbox'&&url.endsWith('/files/upload'))return Response.json({path_lower:'/unbound/backups/backup.json',server_modified:'2026-11-06T12:00:00Z'});if(provider==='dropbox'&&url.endsWith('/files/list_folder'))return Response.json({entries:[{'.tag':'file',name:'unbound-days-backup.json',path_lower:'/unbound days/unbound-days-backup.json',server_modified:'2026-11-06T12:00:00Z'}],has_more:false});if(provider==='dropbox'&&url.endsWith('/files/download'))return Response.json({format:'unbound-days-snapshot-v2'});
   if(provider==='box'&&url.includes('/folders/0/items'))return Response.json({entries:[{id:'folder-id',name:'Unbound',type:'folder'}]});if(provider==='box'&&url.includes('/folders/folder-id/items'))return Response.json({entries:[{id:'backup-file',name:'unbound-days-backup.json',type:'file',created_at:'2026-11-06T12:00:00Z'}]});if(provider==='box'&&url==='https://upload.box.com/api/2.0/files/content')return Response.json({entries:[{id:'backup-file',created_at:'2026-11-06T12:00:00Z'}]});if(provider==='box'&&url.includes('/files/backup-file/content'))return Response.json({format:'unbound-days-snapshot-v2'});throw Error('Unexpected '+provider+' request: '+url);};
  const api=createPersonalStorage({client,config:{},fetcher,storage:{getItem:()=>null,setItem(){},removeItem(){}},preferenceStorage:null,locationRef:{origin:'https://dev.test',pathname:'/'},historyRef:{replaceState(){}}});
  const saved=await api.backupNotebook({format:'unbound-days-snapshot-v2',data:{notes:[]}},'device-a');assert.ok(saved.id);assert.equal((await api.listBackups()).length,1);assert.equal((await api.readBackup(saved.id)).format,'unbound-days-snapshot-v2');await api.markBackupSuccess();assert.ok(requests.some(x=>x.options.body instanceof Blob||typeof x.options.body==='string'||x.options.body instanceof FormData));
 }
});

test('Google Drive storage uses its own PKCE consent and one-time callback state',async()=>{
 const values=new Map(),calls=[];let url='',search='';const fakeStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const client={functions:{invoke:async(_name,{body})=>{calls.push(body);return {data:{status:'connected',provider:body.provider,accessToken:'short',expiresIn:3600,account:'drive-account'},error:null};}}};
 const locationRef={origin:'https://dev.test',pathname:'/',get search(){return search;},assign:value=>{url=value;}};const historyRef={replaceState(_state,_title,path){search=new URL(path,'https://dev.test').search;}};
 const storage=createPersonalStorage({client,config:{googleClientId:'google-client'},storage:fakeStorage,preferenceStorage:null,locationRef,historyRef});
 await storage.startConnect('google-drive');const auth=new URL(url);assert.equal(auth.origin,'https://accounts.google.com');assert.match(auth.searchParams.get('scope'),/drive\.file/);assert.equal(auth.searchParams.get('code_challenge_method'),'S256');assert.equal(auth.searchParams.get('access_type'),'offline');
 search='?code=oauth-code&state='+encodeURIComponent(auth.searchParams.get('state'));const result=await storage.finishConnect();assert.equal(result.account,'drive-account');assert.equal(calls[0].action,'exchange');assert.equal(calls[0].provider,'google-drive');assert.equal(calls[0].redirectUri,'https://dev.test/');assert.equal(values.size,0);
});

test('Dropbox and Box use provider-specific authorization endpoints and app IDs',async()=>{
 for(const [provider,host,clientId] of [['dropbox','www.dropbox.com','dropbox-key'],['box','account.box.com','box-client']]){const values=new Map(),fakeStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)},locationRef={origin:'https://dev.test',pathname:'/',assign:value=>{locationRef.url=value;}};const api=createPersonalStorage({client:{},config:{dropboxAppKey:'dropbox-key',boxClientId:'box-client'},storage:fakeStorage,preferenceStorage:null,locationRef,historyRef:{replaceState(){}}});await api.startConnect(provider);const auth=new URL(locationRef.url);assert.equal(auth.hostname,host);assert.equal(auth.searchParams.get('client_id'),clientId);assert.equal(auth.searchParams.get('code_challenge_method'),'S256');}
});
