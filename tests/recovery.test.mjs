import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseRecovery} from '../storage.js';
import * as Google from '../google.js';
const notebook=(savedAt,notes=[])=>({version:1,events:[],tasks:[],notes,entries:{},settings:{},ink:{},savedAt});
test('recovery chooses the newer complete copy and survives corruption',()=>{
 const old=notebook('2026-10-07T12:00:00Z'),newer=notebook('2026-10-07T12:01:00Z',[{id:'note',title:'Keep my writing'}]);
 assert.equal(chooseRecovery(old,newer),newer);assert.equal(chooseRecovery(newer,old),newer);
 assert.equal(chooseRecovery({version:1},newer),newer);assert.equal(chooseRecovery(null,null),null);
});
test('Google backup uses the limited drive.file scope and immutable visible-folder uploads',async()=>{
 let scope,requests=[];const previousFetch=globalThis.fetch;
 const oauth={hasGrantedAllScopes:()=>true,initTokenClient:options=>{scope=options.scope;return {requestAccessToken:()=>options.callback({access_token:'test-only',expires_in:3600})}},revoke:()=>{}};
 globalThis.window={google:{accounts:{oauth2:oauth}}};globalThis.google=window.google;
 globalThis.fetch=async(url,options)=>{requests.push({url,options});return {ok:true,status:200,json:async()=>url.includes('oauth2/v3/userinfo')?{sub:'backup-test-account'}:({id:'backup',files:[{id:'backup'}]})};};
 try{await Google.connect('test-client',true);const state=notebook('2026-10-07T12:01:00Z');await Google.backupNotebook(state,'device-test');await Google.backupNotebook(state,'device-test');await Google.listBackups();
 assert.ok(scope.includes('auth/tasks'));assert.equal(Google.taskIdentity(),'backup-test-account');assert.ok(scope.includes('auth/drive.file'));assert.ok(!scope.includes('auth/drive '));
 const uploads=requests.filter(r=>r.url.includes('upload/drive/v3'));assert.equal(uploads.length,2);assert.ok(uploads.every(r=>r.options.method==='POST'));assert.ok(uploads[0].options.body.includes('\"parents\":[\"backup\"]'));assert.ok(uploads[0].options.body.includes('\"entries\":{}'));assert.ok(requests.some(r=>r.url.includes('drive/v3/files?')));Google.disconnect();assert.equal(Google.backupConnected(),false);
 }finally{globalThis.fetch=previousFetch;delete globalThis.window;delete globalThis.google;}
});

test('Google Tasks transport uses memory-only credentials and expiry clears task identity',async()=>{
 const previousFetch=globalThis.fetch;let scopes,requests=[];
 const oauth={hasGrantedAllScopes:()=>true,initTokenClient:o=>{scopes=o.scope;return {requestAccessToken:()=>o.callback({access_token:'test-only',expires_in:3600})};},revoke:()=>{}};
 globalThis.window={google:{accounts:{oauth2:oauth}}};globalThis.google=window.google;
 globalThis.fetch=async(url,options)=>{requests.push({url,options});return url.includes('userinfo')?{ok:true,json:async()=>({sub:'transport-account'})}:{ok:false,status:401,json:async()=>({})};};
 try{await Google.connect('test-client');assert.ok(scopes.includes('auth/tasks'));assert.equal(Google.tasksConnected(),true);await assert.rejects(Google.tasksApi('users/@me/lists'),/expired/);assert.equal(Google.tasksConnected(),false);assert.equal(Google.taskIdentity(),'');assert.equal(requests[1].options.headers.Authorization,'Bearer test-only');Google.disconnect();}finally{globalThis.fetch=previousFetch;delete globalThis.window;delete globalThis.google;}
});
