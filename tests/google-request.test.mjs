import test from 'node:test';
import assert from 'node:assert/strict';
import {googleRequest} from '../google.js';
test('Google reads coalesce and cache; mutations invalidate reads without automatic retries',async()=>{
 let calls=0,release;const wait=new Promise(r=>release=r),url='https://www.googleapis.com/test/dedup';
 const fetcher=async()=>{calls++;await wait;return Response.json({items:[1]});};
 const a=googleRequest('Test',url,{},fetcher),b=googleRequest('Test',url,{},fetcher);release();assert.deepEqual(await a,await b);assert.equal(calls,1);
 await googleRequest('Test',url,{},fetcher);assert.equal(calls,1);
 await googleRequest('Test',url,{method:'POST'},fetcher);assert.equal(calls,2);
 await googleRequest('Test',url,{},fetcher);assert.equal(calls,3);
});
test('quota pauses honour Retry-After and block subsequent requests without looping',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return Response.json({error:{message:'Quota exceeded',errors:[{reason:'rateLimitExceeded'}]}},{status:403,headers:{'Retry-After':'3600'}});};
 const url='https://www.googleapis.com/test/quota';
 await assert.rejects(googleRequest('QuotaTest',url,{},fetcher),e=>e.status===403&&e.retryAt>Date.now()+3590000&&e.endpoint==='/test/quota');
 await assert.rejects(googleRequest('QuotaTest',url,{},fetcher),e=>e.status===429);assert.equal(calls,1);
});
test('ordinary permission failures are not classified as quota failures',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return Response.json({error:{message:'Insufficient permission'}},{status:403});};
 for(let i=0;i<2;i++)await assert.rejects(googleRequest('Permissions','https://www.googleapis.com/test/permission',{},fetcher),e=>e.status===403&&!e.retryAt);
 assert.equal(calls,2);
});
