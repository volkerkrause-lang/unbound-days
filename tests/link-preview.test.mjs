import test from 'node:test';
import assert from 'node:assert/strict';
import { videoInfo, fetchLinkPreview, saveCaptureIdea } from '../link-preview.js';
import { mergeNotebook } from '../sync.js';
import { createPreviewRateLimiter, isPublicIp, parseMetadata } from '../functions/api/link-preview.js';

test('preview endpoint limiter bounds per-client bursts and expires old windows', () => {
  let now = 0;
  const allow = createPreviewRateLimiter({ limit: 2, windowMs: 1000, maxClients: 3, now: () => now });
  assert.equal(allow('phone'), true);
  assert.equal(allow('phone'), true);
  assert.equal(allow('phone'), false);
  assert.equal(allow('tablet'), true);
  now = 1000;
  assert.equal(allow('phone'), true);
});

test('video URLs identify YouTube videos and Shorts with a lightweight thumbnail', () => {
  assert.deepEqual(videoInfo('https://www.youtube.com/watch?v=abcdefghijk'), { type: 'video', platform: 'YouTube', thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg' });
  assert.equal(videoInfo('https://youtube.com/shorts/abcdefghijk').type, 'video');
  assert.equal(videoInfo('https://youtu.be/abcdefghijk').platform, 'YouTube');
  assert.equal(videoInfo('https://vimeo.com/12345678').platform, 'Vimeo');
});

test('untrusted metadata is returned as plain bounded strings and safe image URLs', () => {
  const result = parseMetadata(`<html><head><title>Fallback title</title><meta property="og:title" content="A &amp; B"><meta property="og:description" content="&lt;script&gt;alert(1)&lt;/script&gt;"><meta property="og:image" content="https://cdn.example.org/preview.jpg"><link rel="icon" href="/favicon.ico"></head></html>`, 'https://example.org/story');
  assert.equal(result.title, 'A & B');
  assert.equal(result.description, '<script>alert(1)</script>');
  assert.equal(result.image, 'https://cdn.example.org/preview.jpg');
  assert.equal(result.favicon, 'https://example.org/favicon.ico');
  assert.equal(result.contentType, 'webpage');
  const noImage=parseMetadata('<html><title>Only title</title></html>', 'https://example.org/story');
  assert.equal(noImage.title, 'Only title');
  assert.equal(noImage.image, '');
  assert.equal(noImage.favicon, 'https://example.org/favicon.ico');
});

test('metadata parser rejects unsafe image URL schemes and private address literals', () => {
  const result = parseMetadata('<meta property="og:image" content="http://127.0.0.1/secret">', 'https://example.org');
  assert.equal(result.image, '');
  assert.equal(isPublicIp('127.0.0.1'), false);
  assert.equal(isPublicIp('10.0.0.5'), false);
  assert.equal(isPublicIp('::1'), false);
  assert.equal(isPublicIp('example.org'), true);
});

test('metadata API gracefully returns null on failed or slow responses and validates URLs', async () => {
  assert.equal(await fetchLinkPreview('file:///etc/passwd'), null);
  assert.equal(await fetchLinkPreview('https://example.org', { fetcher: async () => ({ ok: false }) }), null);
  assert.equal(await fetchLinkPreview('https://example.org', { timeout: 10, fetcher: (_url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))) }), null);
});


test('ten distinct share events and an intentional repeat remain independent; retry remains idempotent', () => {
  const manual={id:'manual',title:'My existing idea',idea:true};
  const notes=[manual],entries={};let sequence=0;
  const makeId=()=>`idea-${++sequence}`;
  for(let i=0;i<10;i++) saveCaptureIdea({notes,entries,capture:{captureId:`event-${i}`,sharedUrl:`https://example.org/${i}`,sharedTitle:`Page ${i}`,text:''},makeId,now:`2026-11-07T10:00:0${i}.000Z`});
  const sameAgain=saveCaptureIdea({notes,entries,capture:{captureId:'event-repeat',sharedUrl:'https://example.org/0',sharedTitle:'Page 0 again',text:''},makeId});
  const retry=saveCaptureIdea({notes,entries,capture:{captureId:'event-repeat',sharedUrl:'https://example.org/0',sharedTitle:'Page 0 again',text:'personal note'},makeId});
  assert.equal(notes.length,12);
  assert.equal(new Set(notes.map(note=>note.id)).size,12);
  assert.notEqual(sameAgain.id,notes.find(note=>note.quickCaptureId==='event-0').id);
  assert.equal(retry.id,sameAgain.id);
  assert.equal(entries[`note:${retry.id}`],'personal note');
  assert.equal(notes[0].title,'My existing idea');
});

test('concurrent new Ideas from two devices merge by persistent ID', () => {
  const base={version:1,notes:[],entries:{},events:[],tasks:[],habits:[],ink:{},trash:[],bookmarks:[],settings:{}};
  const local={...base,notes:[{id:'from-phone',title:'Phone share'}]};
  const remote={...base,notes:[{id:'from-tablet',title:'Tablet share'}]};
  const merged=mergeNotebook(base,local,remote).data;
  assert.deepEqual(merged.notes.map(note=>note.id).sort(),['from-phone','from-tablet']);
});
