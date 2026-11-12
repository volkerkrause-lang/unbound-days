import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('service worker precache has no duplicate request URLs',async()=>{
 const source=await readFile(new URL('../sw.js',import.meta.url),'utf8');
 const context=vm.createContext({self:{addEventListener(){}}});
 vm.runInContext(`${source}\nglobalThis.precacheAssets=ASSETS;`,context);
 const urls=Array.from(context.precacheAssets,path=>new URL(path,'https://example.test/').href);
 assert.equal(new Set(urls).size,urls.length,'cache.addAll rejects duplicate request URLs');
});
