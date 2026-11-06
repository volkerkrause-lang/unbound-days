import test from 'node:test';
import assert from 'node:assert/strict';
import {normaliseShareUrl,parseShareTarget} from '../quick-capture.js';

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
