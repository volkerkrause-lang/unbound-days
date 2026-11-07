import test from 'node:test';
import assert from 'node:assert/strict';
import {createNoteMedia} from '../note-media.js';

function harness({status='pending'}={}){
 const entries={'idea:note-1:attachments':JSON.stringify([{id:'capture-1',name:'photo.jpg',type:'image/jpeg',storage:{status,provider:'dropbox',attempts:5}}])},toasts=[];let confirmation=null;
 const media=createNoteMedia({notebookId:()=> 'book-1',entries:()=>entries,current:()=> 'note-1',save(){},render(){},esc:value=>String(value),toast:value=>toasts.push(value),blocked:()=>false,personalStorage:{async download(){return null;}},confirmAction:(_title,_message,action)=>{confirmation={title:_title,message:_message,action};}});
 return {media,entries,toasts,get confirmation(){return confirmation;}};
}

test('pending attachment offers retry and warns before removing the only local copy',async()=>{
 const h=harness();assert.match(h.media.html('note-1'),/Upload paused/);assert.match(h.media.html('note-1'),/Retry upload/);
 await h.media.click({noteMediaDelete:'capture-1'});assert.equal(h.confirmation.title,'Remove unsynchronised attachment?');assert.match(h.confirmation.message,/has not been confirmed in cloud storage/);assert.equal(JSON.parse(h.entries['idea:note-1:attachments']).length,1);
 const prior=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{querySelector:()=>null}});try{await h.confirmation.action();}finally{if(prior)Object.defineProperty(globalThis,'document',prior);else delete globalThis.document;}assert.equal(JSON.parse(h.entries['idea:note-1:attachments']).length,0);
});
