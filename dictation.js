const owners=new WeakMap();

// Browser speech recognition is intentionally optional. Permission to use the
// microphone does not imply that the browser provides a recognition engine.
export function createDictation({toast,identity,Recognition=()=>window.SpeechRecognition||window.webkitSpeechRecognition}){
 owners.get(document)?.destroy();
 const controller=new AbortController(),signal=controller.signal;
 let session=null,review=null,toolbar=null,writing=false;
 const valid=s=>s?.field.isConnected&&s.identity===identity();
 const icons={select:'<path d="M4 5h16v14H4zM8 9h8M8 12h6"/>',replace:'<path d="M4 7h16M7 4 4 7l3 3M17 14v6M14 17h6"/>',undo:'<path d="M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12"/>'};
 function action(name,label){return `<button type="button" data-dictation="${name}" aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg></button>`;}
 function ensureToolbar(){if(toolbar?.isConnected)return;toolbar=document.createElement('div');toolbar.className='dictation-tools';toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Dictation corrections');toolbar.innerHTML=action('select','Select dictated phrase')+action('replace','Replace selected words')+action('undo','Undo dictation');toolbar.addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault();});toolbar.addEventListener('click',e=>{
  const name=e.target.closest('[data-dictation]')?.dataset.dictation,s=review;if(!name||!valid(s))return;
  if(name==='select'){stop();s.field.focus({preventScroll:true});s.field.setSelectionRange(s.start,s.insertEnd);update();return;}
   if(name==='replace'){const a=s.field.selectionStart,b=s.field.selectionEnd;if(a===b){toast('Select words to replace first.');return;}stop();review={...s,before:s.field.value,start:a,end:b,lastValue:s.field.value,insertEnd:a,inserted:false};start(s.field,s.button);return;}
  if(name==='undo'){stop();if(s.field.value!==s.lastValue){toast('Manual edits are kept.');return;}commit(s,s.before,s.start,s.end);dismiss();s.field.focus({preventScroll:true});}
 });document.body.append(toolbar);}
 function update(){
  if(!valid(review)){dismiss();return;}ensureToolbar();
  toolbar.classList.toggle('is-recording',!!session);
  toolbar.querySelector('[data-dictation="select"]').disabled=review.insertEnd<=review.start;
  toolbar.querySelector('[data-dictation="replace"]').disabled=!!session||review.field.selectionStart===review.field.selectionEnd;
  toolbar.querySelector('[data-dictation="undo"]').disabled=review.field.value!==review.lastValue;
 }
 function stop(){const s=session;if(!s)return;session=null;s.stopped=true;clearTimeout(s.startTimer);s.button?.classList.remove('recording');try{s.recognition.stop();}catch{}update();}
 function dismiss(){const s=session;stop();if(s)s.recognition.onresult=s.recognition.onerror=s.recognition.onend=s.recognition.onstart=null;review=null;toolbar?.remove();toolbar=null;}
 function commit(s,value,start,end){writing=true;try{s.field.value=value;s.field.setSelectionRange(start,end);s.field.dispatchEvent(new Event('input',{bubbles:true}));s.lastValue=s.field.value;}finally{writing=false;}}
 function start(field,button){
  if(session){stop();return;}
  if(!field?.isConnected){toast('Tap a writing field first.');return;}
  let Constructor;try{Constructor=Recognition();}catch{}
  if(!Constructor){toast('Speech dictation is unavailable in this browser. Use the keyboard microphone.');field.focus({preventScroll:true});return;}
  const previous=review?.field===field?review:null,before=field.value,startAt=field.selectionStart??field.value.length,end=field.selectionEnd??startAt;
  const s={field,button,before,start:startAt,end,lastValue:field.value,insertEnd:startAt,identity:identity(),recognition:new Constructor(),inserted:false};review=session=s;
  s.recognition.lang='en-GB';s.recognition.continuous=false;s.recognition.interimResults=true;
  s.recognition.onstart=()=>{if(session!==s)return;s.started=true;clearTimeout(s.startTimer);button?.classList.add('recording');update();};
  s.recognition.onresult=e=>{
   if((session!==s&&!s.stopped)||s.inserted)return;if(!valid(s)){dismiss();return;}if(field.value!==s.lastValue){stop();return;}
   let finalText='',interim='';for(let i=e.resultIndex||0;i<e.results.length;i++){const result=e.results[i],text=result[0]?.transcript||'';if(result.isFinal)finalText+=text;else interim+=text;}
   if(interim){toolbar?.setAttribute('aria-label',`Dictation in progress: ${interim.trim()}`);}
   if(!finalText.trim()){update();return;}
   let text=finalText.trim();if(!before.slice(0,startAt).trim()||/[.!?]\s*$/.test(before.slice(0,startAt)))text=text.replace(/\p{L}/u,c=>c.toLocaleUpperCase('en-GB'));
   if(startAt===end&&startAt>0&&!/\s$/.test(before.slice(0,startAt))&&!/^[,.;:!?]/.test(text))text=' '+text;
   if(end<before.length&&!/^\s|^[,.;:!?]/.test(before.slice(end)))text+=' ';
   s.inserted=true;s.insertEnd=startAt+text.length;commit(s,before.slice(0,startAt)+text+before.slice(end),s.insertEnd,s.insertEnd);stop();update();
  };
  s.recognition.onerror=e=>{if(session!==s)return;const message=e.error==='not-allowed'||e.error==='service-not-allowed'?'Allow microphone and speech recognition in browser settings, then try again.':e.error==='audio-capture'?'No microphone is available. Check the device input.':e.error==='network'?'Speech recognition needs a working network connection.':'Speech recognition could not start in this browser. Use the keyboard microphone.';stop();toast(message);};
  s.recognition.onend=()=>{if(session!==s)return;session=null;button?.classList.remove('recording');update();if(!s.started)toast('Speech recognition did not start. Use the keyboard microphone.');};
  field.focus({preventScroll:true});ensureToolbar();update();
  try{s.recognition.start();s.startTimer=setTimeout(()=>{if(session!==s||s.started)return;stop();toast('Speech recognition did not start. Use the keyboard microphone.');},3500);}catch(e){clearTimeout(s.startTimer);session=null;review=null;toolbar?.remove();toolbar=null;button?.classList.remove('recording');toast(e.name==='NotAllowedError'?'Allow microphone and speech recognition in browser settings.':'Speech recognition could not start. Use the keyboard microphone.');}
 }
 document.addEventListener('beforeinput',e=>{if(!writing&&session?.field===e.target)stop();},{capture:true,signal});
 document.addEventListener('input',e=>{if(!writing&&review?.field===e.target){stop();update();}},{capture:true,signal});
 document.addEventListener('selectionchange',()=>{if(review&&!session)update();},{signal});
 document.addEventListener('focusin',e=>{if(review&&e.target!==review.field&&!toolbar?.contains(e.target))dismiss();},{signal});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stop();},{signal});
 const api={start,stop,dismiss,destroy(){dismiss();controller.abort();if(owners.get(document)===api)owners.delete(document);}};owners.set(document,api);return api;
}
