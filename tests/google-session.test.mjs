import test from 'node:test';
import assert from 'node:assert/strict';
import {googleLoginOptions,googleScopes,authStorage,createGoogleSession} from '../google-session.js';
import {createHandler,seal,unseal} from '../supabase/functions/google-connection/handler.js';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
test('one redirect login requests Calendar, Tasks, Drive and offline renewal',()=>{
 const r=googleLoginOptions('https://development.example/','owner@example.test');
 assert.equal(r.options.redirectTo,'https://development.example/');assert.equal(r.options.queryParams.access_type,'offline');assert.equal(r.options.queryParams.prompt,'consent');for(const scope of googleScopes)assert.ok(r.options.scopes.includes(scope));
});
test('provider credentials are excluded from persistent auth session',()=>{
 const map=new Map(),s=authStorage({getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});
 s.setItem('session',JSON.stringify({access_token:'supabase',provider_token:'google',provider_refresh_token:'secret',user:{id:'one'}}));
 assert.deepEqual(JSON.parse(s.getItem('session')),{access_token:'supabase',user:{id:'one'}});s.removeItem('session');assert.equal(s.getItem('session'),undefined);
});
test('restore uses server connection across devices and coalesces renewal',async()=>{
 let count=0,time=0;const response={data:{accessToken:'access',account:'google',expiresIn:3600,scopes:googleScopes}};
 const invoke=async()=>{count++;return response;};const first=createGoogleSession({invoke,now:()=>time});
 await Promise.all([first.restore(),first.restore()]);assert.equal(count,1);await first.restore();assert.equal(count,1);
 const otherDevice=createGoogleSession({invoke,now:()=>time});assert.equal((await otherDevice.restore()).account,'google');assert.equal(count,2);
 time=3550000;await first.restore();assert.equal(count,3);
});
test('in-flight renewal cannot reconnect after logout',async()=>{
 let resolve;const s=createGoogleSession({invoke:()=>new Promise(r=>resolve=r)});const p=s.restore();s.clear();resolve({data:{accessToken:'late',account:'a',expiresIn:3600}});assert.equal(await p,null);
});
test('renewal failure is visible and retryable',async()=>{
 let fail=true;const s=createGoogleSession({invoke:async()=>fail?{error:new Error('offline')}:{data:{status:'reconnect'}}});await assert.rejects(s.restore(),/could not be restored/);fail=false;assert.equal(await s.restore(),null);
});
const key=btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
test('refresh credentials use authenticated encryption and reject corruption',async()=>{
 const a=await seal('test-refresh',key),b=await seal('test-refresh',key);assert.notEqual(a,b);assert.equal(await unseal(a,key),'test-refresh');await assert.rejects(unseal(a.slice(0,10)+'A'+a.slice(11),key));
});
function fixture({sub='google-one',aud='client',scopes=googleScopes,googleError='',existing=null,authenticated=true}={}){
 const calls=[],writes=[];const env={APP_ORIGINS:'https://dev.test',GOOGLE_CLIENT_ID:'client',GOOGLE_CLIENT_SECRET:'secret',GOOGLE_TOKEN_KEY:key};
 const q={select(){return this;},eq(){return this;},maybeSingle:async()=>({data:existing}),upsert:async row=>{writes.push(row);return {};},delete(){return {eq:async()=>({})};}};
 const handler=createHandler({env,admin:{from:()=>q},authenticate:async()=>authenticated?{id:'user-one',identities:[{provider:'google',identity_data:{sub:'google-one'}}]}:null,
 fetch:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(url.includes('tokeninfo')?{aud,sub,scope:scopes.join(' '),expires_in:3600}:googleError?{error:googleError}:{access_token:'test-access',expires_in:3600}),{status:googleError?400:200});}});
 return {calls,writes,send:(body,origin='https://dev.test')=>handler(new Request('https://function.test',{method:'POST',headers:{Origin:origin,Authorization:'Bearer signed-in'},body:JSON.stringify(body)}))};
}
test('server rejects untrusted origins, unauthenticated users and mismatched Google identity/client',async()=>{
 const f=fixture();assert.equal((await f.send({action:'refresh'},'https://attacker.test')).status,403);assert.equal(f.calls.length,0);
 assert.equal((await fixture({authenticated:false}).send({action:'refresh'})).status,401);
 for(const args of [{sub:'different'},{aud:'different'}]){const f=fixture(args);assert.equal((await f.send({action:'store',accessToken:'a',refreshToken:'refresh'})).status,403);assert.equal(f.writes.length,0);}
});
test('server stores only encrypted account-bound refresh token and returns short-lived access',async()=>{
 const f=fixture();const response=await f.send({action:'store',accessToken:'a',refreshToken:'refresh',user_id:'attacker'});const body=await response.json();assert.equal(response.status,200);assert.equal(body.account,'google-one');assert.equal(body.accessToken,'test-access');assert.equal(body.refreshToken,undefined);assert.equal(response.headers.get('Cache-Control'),'no-store');
 assert.equal(f.writes[0].user_id,'user-one');assert.equal(await unseal(f.writes[0].refresh_ciphertext,key),'refresh');
 const g=fixture({existing:f.writes[0]});assert.equal((await (await g.send({action:'refresh'})).json()).status,'connected');
});
test('partial consent and revoked grants require consent without overwriting stored grant',async()=>{
 for(const args of [{scopes:googleScopes.slice(0,2)},{googleError:'invalid_grant'}]){const f=fixture(args);assert.equal((await (await f.send({action:'store',accessToken:'a',refreshToken:'r'})).json()).status,'reconnect');assert.equal(f.writes.length,0);}
});
test('Google grants are inaccessible to browser roles and cascade on account deletion',async()=>{
 const db=new PGlite();try{
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);');
 await db.exec(await readFile(new URL('../supabase/migrations/202610160001_google_connections.sql',import.meta.url),'utf8'));
 await db.exec("insert into auth.users values('00000000-0000-4000-8000-000000000001');insert into google_connections(user_id,google_sub,refresh_ciphertext) values('00000000-0000-4000-8000-000000000001','g','encrypted');");
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from google_connections'),/permission denied/);await db.exec('reset role');}
 await db.exec('set role service_role');assert.equal((await db.query('select * from google_connections')).rows.length,1);await db.exec("reset role;delete from auth.users;");assert.equal((await db.query('select * from google_connections')).rows.length,0);
 }finally{await db.close();}
});
