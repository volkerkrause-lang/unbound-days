// Keep capture state outside rendered page markup. Existing recordings are only
// replaced after a non-empty recording has been completely read.
export function microphoneMessage(error){
 if(error?.name==='NotAllowedError'||error?.name==='SecurityError')return 'Microphone access was blocked. Allow microphone access for Unbound in your browser or device settings, then try again.';
 if(error?.name==='NotFoundError')return 'No microphone was found. Connect or enable a microphone, then try again.';
 if(error?.name==='NotReadableError')return 'The microphone is unavailable. Close other apps using it and try again.';
 return error?.message||'Recording failed. Your previous voice memo has been kept.';
}
export function recorderOptions(Recorder){
 for(const mimeType of ['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg;codecs=opus']){
  if(Recorder.isTypeSupported?.(mimeType))return {mimeType};
 }
 return {};
}
export function createVoiceRecorder({capture,Recorder,readBlob,store,changed=()=>{},error=()=>{},now=Date.now}){
 let session=null;
 const notify=()=>changed(session);
 function release(s){if(s.released||!s.stream)return;s.released=true;s.stream.getTracks().forEach(track=>track.stop());}
 function fail(s,e){if(session!==s)return;release(s);session=null;notify();error(microphoneMessage(e));}
 async function toggle(form,component,notebook){
  if(session){if(session.form===form&&session.component===component)stop();else error('Stop the current voice memo before starting another.');return;}
  const s={form,component,notebook,phase:'requesting',chunks:[]};session=s;notify();
  try{
   s.stream=await capture();if(session!==s){release(s);return;}
   const Type=Recorder();s.recorder=new Type(s.stream,recorderOptions(Type));
   s.recorder.ondataavailable=e=>{if(e.data?.size)s.chunks.push(e.data);};
   s.recorder.onerror=e=>{fail(s,e.error||new Error('Recording stopped unexpectedly. Your previous memo has been kept.'));};
   s.recorder.onstop=async()=>{
    release(s);if(session!==s)return;
    s.phase='saving';notify();
    try{
     const type=s.recorder.mimeType||s.chunks.find(c=>c.type)?.type;
     if(!s.chunks.length)throw Error('No audio was captured. Try recording again. Your previous memo has been kept.');
     const blob=new Blob(s.chunks,type?{type}:{});if(!blob.size)throw Error('No audio was captured. Please try again.');
     const data=await readBlob(blob);if(session!==s)return;
     await store(s,data,Math.max(0,(s.stoppedAt||now())-s.startedAt));
     session=null;notify();
    }catch(e){fail(s,e);}
   };
   s.startedAt=now();s.recorder.start(250);s.phase='recording';notify();
  }catch(e){fail(s,e);}
 }
 function stop(){const s=session;if(!s||s.phase!=='recording')return;s.stoppedAt=now();s.phase='saving';notify();try{s.recorder.stop();}catch(e){fail(s,e);}}
 function cancel(){const s=session;if(!s)return;session=null;if(s.recorder?.state==='recording'){try{s.recorder.stop();}catch{}}release(s);notify();}
 return {toggle,stop,cancel,get session(){return session;}};
}
