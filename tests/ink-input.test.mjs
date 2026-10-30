// Exercise the real canvas handlers with simulated pen/touch events, without a
// browser or personal notebook. Hardware latency and palm rejection need a device.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as ink from '../idea-workspace.js';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const handlers=source.slice(source.indexOf('let inkNoteKey='),source.indexOf('function convertIdeaToText()'));
const selection=source.slice(source.indexOf('if(data.inkTool)'),source.indexOf('if(data.deleteNote)'));
const history=source.slice(source.indexOf("case 'undo-ink':"),source.indexOf("case 'clear-ink':"));

function notebook({saved,fingerDrawing=false,userAgent='Android Samsung Galaxy S23 Ultra'}={}){
 const storage=new Map(),captures=new Set(),frames=[];let paints=0;
 const state=saved?JSON.parse(saved):{ink:{},settings:{fingerDrawing,noteColour:'#123456',noteSize:5}};
 const ctx={setTransform(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},stroke(){paints++;}};
 const canvas={style:{},isConnected:true,getBoundingClientRect:()=>({left:10,top:20,width:400,height:600}),getContext:()=>ctx,
  setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id)};
 const buttons=['pen','pencil','eraser'].map(tool=>({dataset:{inkTool:tool},classList:{toggle(){}},attrs:{},setAttribute(k,v){this.attrs[k]=v;}}));
 const sandbox={...ink,state,structuredClone,Date,storageError:false,KEY:'synthetic-notebook',noteId:'test-note',devicePixelRatio:2,
  navigator:{maxTouchPoints:5,userAgent},document:{querySelector:s=>s==='#ink-canvas'?canvas:null,querySelectorAll:()=>buttons,addEventListener(){}},
  window:{addEventListener(){}},ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:cb=>(frames.push(cb),frames.length),
  localStorage:{setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  save:()=>storage.set('notebook',JSON.stringify(state)),entry:()=>'',noteMedia:{undo:()=>false,redo:()=>false}};
 const context=vm.createContext(sandbox);
 vm.runInContext(handlers+`\nfunction selectTool(data){${selection}} function historyAction(action){switch(action){${history}}} setupInk();`,context);
 const event=(type,{id=1,pointerType='pen',x=100,y=160,pressure=.7,button=0,...extra}={})=>{
  const e={type,pointerId:id,pointerType,clientX:x,clientY:y,pressure,button,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...extra};
  canvas['on'+type]?.(e);return e;
 };
 return {state,canvas,storage,event,captures,context,paths:()=>JSON.parse(vm.runInContext('JSON.stringify(inkPaths)',context)),
  tool:value=>sandbox.selectTool({inkTool:value}),buttons,history:action=>sandbox.historyAction(action),
  flush:()=>{while(frames.length)frames.shift()();return paints;}};
}

test('selected Pen accepts non-primary S Pen input, coalesced samples, pressure and reload',()=>{
 const n=notebook();let sampleReads=0;
 n.tool('eraser');n.tool('pen');assert.equal(n.buttons[0].attrs['aria-pressed'],'true');assert.equal(n.buttons[2].attrs['aria-pressed'],'false');
 assert.equal(n.event('pointerdown',{isPrimary:false}).defaultPrevented,true);
 assert.ok(n.storage.has('synthetic-notebook-active-ink'),'live stroke checkpoint');
 const samples=[{clientX:130,clientY:180,pressure:.2},{clientX:170,clientY:200,pressure:.9}];
 assert.equal(n.event('pointermove',{getCoalescedEvents:()=>{sampleReads++;return samples;}}).defaultPrevented,true);
 n.event('pointerup',{x:200,y:220,pressure:0});n.flush();
 assert.equal(sampleReads,1);assert.equal(n.paths().length,1);
 assert.deepEqual(n.paths()[0].points.map(p=>p.p),[.7,.2,.9,.5]);
 assert.equal(n.paths()[0].points.at(-1).x,.475,'include final pen position');
 assert.equal(n.paths()[0].color,'#123456');assert.equal(n.paths()[0].size,5);
 assert.equal(n.captures.size,0);assert.equal(n.storage.has('synthetic-notebook-active-ink'),false);
 const restored=notebook({saved:n.storage.get('notebook')});
 assert.deepEqual(restored.paths(),n.paths());assert.ok(restored.flush()>0,'restored ink renders');
});

test('palm contacts and hover do not draw; outside input and finger preference are preserved',()=>{
 const n=notebook();
 n.event('pointermove');assert.equal(n.paths().length,0);
 assert.equal(n.event('pointerdown',{pointerType:'touch'}).defaultPrevented,false);
 n.event('pointerdown',{id:5});n.event('pointerdown',{id:6,pointerType:'touch'});
 n.event('pointerup',{id:6,pointerType:'touch'});n.event('pointerup',{id:5});
 assert.equal(n.paths().length,1);assert.equal(n.canvas.style.touchAction,'none');
 const before=n.paths();assert.equal(n.event('pointermove',{id:9}).defaultPrevented,false);assert.deepEqual(n.paths(),before);
 const fingers=notebook({fingerDrawing:true});
 fingers.event('pointerdown',{pointerType:'touch'});fingers.event('pointerup',{pointerType:'touch'});
 assert.equal(fingers.paths().length,1,'finger drawing remains available when enabled');
});

test('S Pen takes over palm-first contact and retains undo/redo and erasing',()=>{
 const n=notebook({fingerDrawing:true});
 n.event('pointerdown',{id:1,pointerType:'touch',x:350});
 n.event('pointerdown',{id:2,isPrimary:false});n.event('pointerup',{id:2});
 n.event('pointerup',{id:1,pointerType:'touch'});
 assert.equal(n.paths().length,1);assert.equal(n.paths()[0].points[0].x,.225);
 n.history('undo-ink');assert.equal(n.paths().length,0);
 n.history('redo-ink');assert.equal(n.paths().length,1);
 n.tool('eraser');n.event('pointerdown');n.event('pointerup');assert.equal(n.paths().length,0);
 n.history('undo-ink');assert.equal(n.paths().length,1);
});

test('capture loss and cancellation save ink and allow the next stroke, including Apple Pencil',()=>{
 for(const userAgent of ['Android','iPad'])for(const end of ['lostpointercapture','pointercancel']){
  const n=notebook({userAgent});n.event('pointerdown');n.event('pointermove',{x:150});
  n.captures.clear();n.event(end);assert.ok(n.storage.has('notebook'));
  n.event('pointerdown',{id:2});n.event('pointerup',{id:2});
  assert.equal(n.paths().length,2);
 }
});
