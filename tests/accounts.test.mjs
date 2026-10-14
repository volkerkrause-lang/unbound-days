import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {scopeKey,reconcile,createSync,fingerprint} from '../account-sync.js';
const empty=()=>({version:1,events:[],tasks:[],notes:[],habits:[],entries:{},ink:{},trash:[],bookmarks:[],settings:{}});
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002';
test('database denies cross-account access and self-appointed admin; CAS/imports stay atomic',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
 await db.exec(await readFile(new URL('../supabase/migrations/202610140001_accounts.sql',import.meta.url),'utf8'));
 await db.query('insert into auth.users values($1),($2)',[A,B]);
 await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${A}',false);`);
 assert.equal((await db.query('select * from public.profiles')).rows.length,1);
 assert.equal((await db.query('select public.has_unrestricted_access() as allowed')).rows[0].allowed,false);
 await assert.rejects(db.exec("update public.profiles set role='admin'"),/permission denied/);
 const request='10000000-0000-4000-8000-000000000001',hash='a'.repeat(64);
 const save=async(data,rev,id=request,importHash=null)=>(await db.query('select public.save_notebook($1::jsonb,$2,$3::uuid,$4) as saved',[JSON.stringify(data),rev,id,importHash])).rows[0].saved;
 assert.equal((await save(empty(),0,request,hash)).revision,1);
 assert.equal((await save(empty(),0,request,hash)).revision,1,'same request retry is idempotent');
 await assert.rejects(save(empty(),0,'10000000-0000-4000-8000-000000000002',hash),/already_imported/);
 await assert.rejects(save({...empty(),entries:{text:'wrong revision'}},0,'10000000-0000-4000-8000-000000000003'),/revision_conflict/);
 assert.deepEqual((await db.query('select data from public.notebooks')).rows[0].data.entries,{});
 await assert.rejects(db.exec('delete from public.notebooks'),/permission denied/);
 await assert.rejects(save({version:1},1),/invalid_notebook/);
 await db.exec(`reset role;update public.profiles set role='admin' where id='${B}';set role authenticated;select set_config('request.jwt.claim.sub','${B}',false);`);
 assert.equal((await db.query('select public.has_unrestricted_access() as allowed')).rows[0].allowed,true);
 assert.equal((await db.query('select * from public.notebooks')).rows.length,0,'admin cannot read another planner');
 assert.equal((await save({...empty(),entries:{mine:'B'}},0)).revision,1);
 await db.exec(`select set_config('request.jwt.claim.sub','${A}',false);`);
 assert.deepEqual((await db.query('select data from public.notebooks')).rows[0].data.entries,{});
 await db.exec(`reset role;delete from auth.users where id='${A}';`);
 assert.equal((await db.query('select * from public.notebooks where user_id=$1',[A])).rows.length,0);
 assert.equal((await db.query('select * from public.notebook_imports where user_id=$1',[A])).rows.length,0);
 await db.exec('set role anon');await assert.rejects(db.query('select public.save_notebook($1,0,$2,null)',[JSON.stringify(empty()),request]),/permission denied/);
 }finally{await db.close();}
});
test('scoped local keys preserve guest and separate accounts; export excludes internal cloud base',async()=>{
 assert.equal(scopeKey(null),'unbound-days-v1');assert.notEqual(scopeKey(A),scopeKey(B));
 const s={...empty(),_cloud:{base:{secret:'private metadata'}}};assert.equal(await fingerprint(s),await fingerprint(empty()));
});
test('offline edits merge with other-device fields; same-field changes require review',()=>{
 const base=empty(),local={...empty(),entries:{a:'local'},_cloud:{revision:1,base}},remote={revision:2,data:{...empty(),entries:{b:'remote'}}};
 const r=reconcile(local,remote,empty());assert.equal(r.conflicts.length,0);assert.deepEqual(r.data.entries,{a:'local',b:'remote'});
 const c=reconcile(local,{revision:2,data:{...empty(),entries:{a:'other'}}},empty());assert.equal(c.conflicts.length,1);assert.equal(c.data.entries.a,'local');
});
test('write failure retains draft/base and reload retries without duplicate entities',async()=>{
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
 let state={...empty(),tasks:[{id:'task-one',title:'Pending'}]},remote=null,fail=true;
 const client={from:()=>({select:()=>({limit:async()=>({data:remote?[remote]:[],error:null})})}),rpc:async(name,args)=>{if(fail)return {error:Error('network')};remote={data:args.p_data,revision:1};return {data:{revision:1},error:null};}};
 const make=()=>createSync({client,getState:()=>state,empty,apply:(data,meta)=>state={...data,_cloud:meta},persist:()=>{},status:()=>{},conflict:()=>assert.fail('unexpected conflict')});
 await make().sync();assert.equal(state.tasks[0].title,'Pending');assert.equal(state._cloud.revision,0);
 state=JSON.parse(JSON.stringify(state));fail=false;await make().sync();assert.equal(remote.data.tasks.length,1);assert.equal(state._cloud.revision,1);
 delete globalThis.navigator;
});
test('typing during in-flight cloud write is retained and saved in next revision',async()=>{
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
 let state={...empty(),entries:{a:'first'}},remote=null,writes=0;
 const client={from:()=>({select:()=>({limit:async()=>({data:remote?[remote]:[],error:null})})}),rpc:async(name,args)=>{writes++;if(writes===1)state.entries.b='new writing';remote={data:structuredClone(args.p_data),revision:writes};return {data:{revision:writes}};}};
 const sync=createSync({client,getState:()=>state,empty,apply:(data,meta)=>state={...data,_cloud:meta},persist:()=>{},status:()=>{},conflict:()=>assert.fail('unexpected conflict')});
 await sync.sync();assert.deepEqual(remote.data.entries,{a:'first',b:'new writing'});assert.equal(writes,2);delete globalThis.navigator;
});
test('an account switch during a cloud read never applies or writes the previous account',async()=>{
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
 let active=true,applies=0,writes=0;
 const client={from:()=>({select:()=>({limit:async()=>{active=false;return {data:[{data:{...empty(),entries:{private:'A'}},revision:1}]};}})}),rpc:async()=>{writes++;}};
 const sync=createSync({client,getState:empty,empty,active:()=>active,apply:()=>applies++,persist:()=>{},status:()=>{},conflict:()=>{}});await sync.sync();assert.equal(applies,0);assert.equal(writes,0);delete globalThis.navigator;
});
test('fresh empty accounts remain available for explicit legacy import',async()=>{
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
 let writes=0;
 const client={from:()=>({select:()=>({limit:async()=>({data:[]})})}),rpc:async()=>{writes++;}};
 const sync=createSync({client,getState:empty,empty,apply:()=>assert.fail('empty account should remain untouched'),persist:()=>{},status:()=>{},conflict:()=>{}});await sync.sync();assert.equal(writes,0);delete globalThis.navigator;
});
