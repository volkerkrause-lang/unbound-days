import test from 'node:test';
import assert from 'node:assert/strict';
import {normaliseShareUrl,parseShareTarget,shareSource} from '../quick-capture.js';

test('share target keeps the browser title, safe URL and optional comment',()=>{
 const result=parseShareTarget(new URLSearchParams({title:'A useful article',text:'Worth reading',url:'https://example.org/story?ref=share'}));
 assert.deepEqual(result,{title:'A useful article',text:'Worth reading',url:'https://example.org/story?ref=share',fromShare:true});
});

test('share target extracts a URL from shared text and removes trailing punctuation',()=>{
 const result=parseShareTarget(new URLSearchParams({text:'Look at this: https://example.org/page).'}));
 assert.equal(result.url,'https://example.org/page');
 assert.equal(result.text,'Look at this:');
});

test('unsafe schemes and malformed URLs are never exposed as clickable links',()=>{
 assert.equal(normaliseShareUrl('javascript:alert(1)'),null);
 assert.equal(normaliseShareUrl('data:text/html,<script>alert(1)</script>'),null);
 assert.equal(normaliseShareUrl('not a URL'),null);
 assert.equal(parseShareTarget(new URLSearchParams({url:'javascript:alert(1)'})).url,null);
});

test('title-only shares remain savable content without fabricating a URL',()=>{
 const result=parseShareTarget(new URLSearchParams({title:'Shared title'}));
 assert.equal(result.title,'Shared title');
 assert.equal(result.url,null);
 assert.equal(result.text,'');
});

test('share source is derived only from a safe HTTP URL',()=>{
 assert.equal(shareSource('https://www.example.org/article?id=2'),'example.org');
 assert.equal(shareSource('javascript:alert(1)'),'');
});

test('main PWA share target is separate from the Quick Capture shortcut',async()=>{
 const manifest=JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
 assert.equal(manifest.shortcuts.find(item=>item.name==='Quick Capture').url,'./?quickCapture=1');
 assert.equal(manifest.share_target.action,'./?saveToIdeas=1');
 assert.deepEqual(manifest.share_target.params,{title:'title',text:'text',url:'url'});
});
