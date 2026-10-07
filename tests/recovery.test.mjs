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
test('Google backup uses only the private app data folder and immutable uploads',async()=>{
 let scope,requests=[];const previousFetch=globalThis.fetch;
 const oauth={hasGrantedAllScopes:()=>true,initTokenClient:options=>{scope=options.scope;return {requestAccessToken:()=>options.callback({access_token:'test-only',expires_in:3600})}},revoke:()=>{}};
 globalThis.window={google:{accounts:{oauth2:oauth}}};globalThis.google=window.google;
 globalThis.fetch=async(url,options)=>{requests.push({url,options});return {ok:true,status:200,json:async()=>({id:'backup',files:[{id:'backup'}]})};};
 try{await Google.connect('test-client',true);const state=notebook('2026-10-07T12:01:00Z');await Google.backupNotebook(state,'device-test');await Google.backupNotebook(state,'device-test');await Google.listBackups();
 assert.ok(scope.includes('auth/drive.appdata'));assert.ok(!scope.includes('auth/drive '));
 assert.equal(requests[0].options.method,'POST');assert.equal(requests[1].options.method,'POST');
 assert.ok(requests[0].options.body.includes('"parents":["appDataFolder"]'));assert.ok(requests[0].options.body.includes('"entries":{}'));
 assert.ok(requests[2].url.includes('spaces=appDataFolder'));Google.disconnect();assert.equal(Google.backupConnected(),false);
 }finally{globalThis.fetch=previousFetch;delete globalThis.window;delete globalThis.google;}
});
