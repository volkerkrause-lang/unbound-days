// Recognition is bound to the original field and notebook. Manual edits always win.
export function createDictation({toast,identity,Recognition=()=>window.SpeechRecognition||window.webkitSpeechRecognition}){
 let session=null,review=null,panel=null,writing=false;
 const valid=s=>s?.field.isConnected&&s.identity===identity();
 function stop(){const s=session;if(!s)return;session=null;s.recognition.onresult=null;s.button?.classList.remove('recording');try{s.recognition.stop();}catch{}update();}
 function dismiss(){stop();review=null;panel?.remove();panel=null;}
 function commit(s,value,start,end){
  writing=true;
  try{s.field.value=value;s.field.setSelectionRange(start,end);s.field.dispatchEvent(new Event('input',{bubbles:true}));s.lastValue=s.field.value;}finally{writing=false;}
 }
 function update(){
  if(!valid(review)){dismiss();return;}
  if(!panel){
   panel=document.createElement('section');panel.className='dictation-review';panel.setAttribute('aria-label','Dictation corrections');
   panel.innerHTML='<div><strong data-dictation-status role="status"></strong><button type="button" data-dictation="done" aria-label="Finish dictation">Done</button></div><p data-dictation-hint></p><div class="dictation-actions"><button type="button" data-dictation="stop">Stop</button><button type="button" data-dictation="select">Select phrase</button><button type="button" data-dictation="replace">Replace selection</button><button type="button" data-dictation="undo">Undo dictation</button></div>';
   panel.addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault();});
   panel.addEventListener('click',e=>{
    const action=e.target.closest('[data-dictation]')?.dataset.dictation,s=review;if(!valid(s)){dismiss();return;}
    if(action==='done'){dismiss();s.field.focus({preventScroll:true});return;}
    if(action==='stop'){stop();s.field.focus({preventScroll:true});return;}
    if(action==='select'){stop();s.field.focus({preventScroll:true});s.field.setSelectionRange(s.start,s.insertEnd);update();return;}
    if(action==='replace'){const start=s.field.selectionStart,end=s.field.selectionEnd;if(start===end){toast('Select the words to replace in your text first.');return;}stop();startDictation(s.field,s.button);return;}
    if(action==='undo'){stop();if(s.field.value!==s.lastValue){toast('Your manual edits have been kept. Select words to correct them.');return;}commit(s,s.before,s.start,s.end);dismiss();s.field.focus({preventScroll:true});}
   });document.body.append(panel);
  }
  panel.querySelector('[data-dictation-status]').textContent=session?'Listening…':'Check your dictation';
  panel.querySelector('[data-dictation-hint]').textContent=session?'Stop to correct your words. Typing also stops the microphone.':'Select incorrect words, then tap Replace selection and say the correction.';
  panel.querySelector('[data-dictation="stop"]').hidden=!session;
  panel.querySelector('[data-dictation="select"]').disabled=review.insertEnd<=review.start;
  panel.querySelector('[data-dictation="replace"]').disabled=!!session||review.field.selectionStart===review.field.selectionEnd;
  panel.querySelector('[data-dictation="undo"]').disabled=review.field.value!==review.lastValue;
  const viewport=window.visualViewport;
  panel.style.bottom=Math.max(10,innerHeight-((viewport?.offsetTop||0)+(viewport?.height||innerHeight))+10)+'px';
 }
 function startDictation(field,button){
  if(session){stop();return;}
  if(!field?.isConnected){toast('Tap a writing field first, then Dictate.');return;}
  const Constructor=Recognition();if(!Constructor){toast('Use the microphone on your device keyboard. Select incorrect words to replace them.');field.focus();return;}
  const before=field.value,start=field.selectionStart??before.length,end=field.selectionEnd??start;
  const s={field,button,before,start,end,lastValue:before,insertEnd:start,identity:identity(),recognition:new Constructor()};review=session=s;
  s.recognition.lang='en-GB';s.recognition.continuous=true;s.recognition.interimResults=true;
  s.recognition.onresult=e=>{
   if(session!==s)return;
   if(!valid(s)){dismiss();return;}
   if(field.value!==s.lastValue){stop();return;}
   let text=Array.from(e.results).map(r=>r[0].transcript).join(' ').trim();
   if(!text)return;
   if(!before.slice(0,start).trim()||/[.!?]\s*$/.test(before.slice(0,start)))text=text.replace(/\p{L}/u,c=>c.toLocaleUpperCase('en-GB'));
   // Keep recognition from joining neighbouring words when inserting at a caret.
   if(start===end&&start>0&&!/\s$/.test(before.slice(0,start))&&!/^[,.;:!?]/.test(text))text=' '+text;
   if(end<before.length&&!/^\s|^[,.;:!?]/.test(before.slice(end)))text+=' ';
   s.insertEnd=start+text.length;commit(s,before.slice(0,start)+text+before.slice(end),s.insertEnd,s.insertEnd);update();
  };
  s.recognition.onerror=e=>{if(session===s){stop();toast(e.error==='not-allowed'?'Microphone permission is needed for dictation.':'Dictation stopped. Your text has been kept.');}};
  s.recognition.onend=()=>{if(session===s){session=null;button?.classList.remove('recording');update();}};
  button?.classList.add('recording');field.focus({preventScroll:true});
  try{s.recognition.start();update();}catch(e){stop();dismiss();toast(e.message);}
 }
 document.addEventListener('beforeinput',e=>{if(!writing&&session?.field===e.target)stop();},true);
 document.addEventListener('input',e=>{if(!writing&&review?.field===e.target){stop();update();}},true);
 document.addEventListener('selectionchange',()=>{if(review&&!session)update();});
 document.addEventListener('focusin',e=>{if(review&&e.target!==review.field&&!panel?.contains(e.target))dismiss();});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stop();});
 window.visualViewport?.addEventListener('resize',()=>{if(review)update();});
 window.visualViewport?.addEventListener('scroll',()=>{if(review)update();});
 return {start:startDictation,stop,dismiss};
}
