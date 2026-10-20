import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createVoiceRecorder,recorderOptions} from '../voice-recorder.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function harness({permission,empty=false,constructError=false}={}){
 const saved=[],errors=[],changes=[];let stops=0,requests=0,time=1000,recorder;
 const stream={getTracks:()=>[{stop:()=>stops++}]};
 class FakeRecorder{
  static isTypeSupported(type){return type==='audio/mp4';}
  constructor(stream,options){if(constructError)throw Error('Codec failed');this.mimeType=options.mimeType;this.state='inactive';recorder=this;}
  start(){this.state='recording';}
  stop(){this.state='inactive';if(!empty)this.ondataavailable({data:new Blob(['audio'],{type:this.mimeType})});this.onstop();}
 }
 const controller=createVoiceRecorder({capture:async()=>{requests++;if(permission)throw Object.assign(Error(),{name:permission});return stream;},Recorder:()=>FakeRecorder,readBlob:async blob=>'data:'+blob.type+';base64,YXVkaW8=',store:(s,data,duration)=>saved.push({s,data,duration}),error:x=>errors.push(x),changed:s=>changes.push(s?.phase||'idle'),now:()=>time});
 return {controller,saved,errors,changes,get stops(){return stops;},get requests(){return requests;},get recorder(){return recorder;},tick:()=>time+=2000};
}
test('Safari-compatible audio is captured, stopped, read and saved before replacing a memo',async()=>{
 const h=harness(),notebook={};await h.controller.toggle('sheet','memo',notebook);
 assert.equal(h.controller.session.phase,'recording');h.tick();h.controller.stop();await flush();
 assert.equal(h.saved.length,1);assert.equal(h.saved[0].duration,2000);assert.equal(h.saved[0].s.notebook,notebook);assert.match(h.saved[0].data,/audio\/mp4/);assert.equal(h.stops,1);assert.equal(h.controller.session,null);assert.deepEqual(h.errors,[]);
});
test('permission refusal gives actionable feedback and permits retry',async()=>{
 const h=harness({permission:'NotAllowedError'});await h.controller.toggle('sheet','memo',{});assert.equal(h.controller.session,null);assert.match(h.errors[0],/Allow microphone access/);assert.equal(h.saved.length,0);await h.controller.toggle('sheet','memo',{});assert.equal(h.requests,2);
});
test('empty capture and recorder construction failure preserve old audio and release microphone',async()=>{
 for(const option of [{empty:true},{constructError:true}]){const h=harness(option);await h.controller.toggle('sheet','memo',{});h.controller.stop();await flush();assert.equal(h.saved.length,0);assert.equal(h.stops,1);assert.equal(h.controller.session,null);assert.equal(h.errors.length,1);}
});
test('rapid double taps never request a second microphone while permission is pending',async()=>{
 let resolve,requests=0,stops=0;const stream={getTracks:()=>[{stop:()=>stops++}]};
 const c=createVoiceRecorder({capture:()=>{requests++;return new Promise(r=>resolve=r);},Recorder:()=>class{},readBlob(){},store(){}});
 const start=c.toggle('a','b',{});await c.toggle('a','b',{});assert.equal(requests,1);c.cancel();resolve(stream);await start;assert.equal(stops,1);assert.equal(c.session,null);
});
test('cancelling an active recording cannot write into another notebook',async()=>{
 const h=harness();await h.controller.toggle('a','b',{});h.controller.cancel();await flush();assert.equal(h.saved.length,0);assert.equal(h.controller.session,null);assert.ok(h.stops>=1);
});
test('playback CSP explicitly permits stored audio and device permission is same-origin',()=>{
 const headers=fs.readFileSync(new URL('../_headers',import.meta.url),'utf8');assert.match(headers,/media-src 'self' data: blob:/);assert.match(headers,/microphone=\(self\)/);
 assert.deepEqual(recorderOptions({isTypeSupported:()=>false}),{});
});
