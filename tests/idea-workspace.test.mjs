import test from 'node:test';
import assert from 'node:assert/strict';
import {normaliseStroke,selectedStrokeIndexes,selectionBounds,moveStrokes,scaleStrokes,eraseWholeStrokes,paperEntry} from '../idea-workspace.js';

const strokes=[
  {tool:'pen',color:'#112233',size:4,points:[{x:.1,y:.1,p:.5},{x:.2,y:.2,p:.7}]},
  {tool:'highlighter',points:[{x:.7,y:.7,p:.5},{x:.8,y:.8,p:.5}]},
];

test('legacy ink gains stable GoodNotes-style tool defaults',()=>{
 const pen=normaliseStroke({points:[{x:.2,y:.3}]});
 const marker=normaliseStroke(strokes[1]);
 assert.equal(pen.tool,'pen');assert.equal(pen.size,3);assert.equal(pen.opacity,1);
 assert.equal(marker.size,16);assert.equal(marker.opacity,.3);
});

test('lasso selects, moves and scales only enclosed strokes',()=>{
 const polygon=[{x:0,y:0},{x:.4,y:0},{x:.4,y:.4},{x:0,y:.4}];
 const selected=selectedStrokeIndexes(strokes,polygon);
 assert.deepEqual(selected,[0]);
 const moved=moveStrokes(strokes,selected,.1,.2);
 assert.equal(moved[0].points[0].x,.2);assert.ok(Math.abs(moved[0].points[0].y-.3)<Number.EPSILON);
 assert.equal(moved[1].points[0].x,.7);
 const before=selectionBounds(moved,selected),scaled=scaleStrokes(moved,selected,2),after=selectionBounds(scaled,selected);
 assert.ok(after.right-after.left>before.right-before.left);
});

test('stroke eraser removes a touched stroke without altering neighbours',()=>{
 const remaining=eraseWholeStrokes(strokes,{x:.15,y:.15},.08);
 assert.equal(remaining.length,1);assert.equal(remaining[0].tool,'highlighter');
});

test('paper preferences stay in notebook string entries',()=>{
 assert.equal(paperEntry('abc'),'idea:abc:paper');
 assert.equal(paperEntry('abc','mode'),'idea:abc:mode');
});

test('solid ink remains a single continuous centreline when Pencil pressure changes',async()=>{
 const {drawInkStroke}=await import('../idea-workspace.js');let strokes=0,starts=0;
 const ctx={beginPath(){starts++;},moveTo(){},lineTo(){},quadraticCurveTo(){},stroke(){strokes++;}};
 drawInkStroke(ctx,{tool:'pen',size:3,color:'#123456',points:[{x:.1,y:.2,p:.1},{x:.2,y:.2,p:1},{x:.3,y:.2,p:.2}]},500,300);
 assert.equal(strokes,1);assert.equal(starts,1);assert.equal(ctx.lineWidth,3);assert.equal(ctx.globalCompositeOperation,'source-over');assert.equal(ctx.globalAlpha,1);
});
