const DRAFT_DB = 'unbound-quick-capture';
const DRAFT_STORE = 'drafts';

function openDraftDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DRAFT_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DRAFT_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function draftStore(method, key, value) {
  const db = await openDraftDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, 'readwrite');
    const store = tx.objectStore(DRAFT_STORE);
    const request = method === 'get' ? store.get(key) : method === 'delete' ? store.delete(key) : store.put(value, key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.onabort = tx.onerror = () => reject(tx.error || Error('Draft storage is unavailable.'));
  });
}

export function normaliseShareUrl(value) {
  if (!value) return null;
  const candidate = String(value).trim().replace(/[),.;!?\]}]+$/u, '');
  if (candidate.length > 4096) return null;
  try {
    const parsed = new URL(candidate);
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : null;
  } catch { return null; }
}

export function shareSource(value) {
  const safe = normaliseShareUrl(value);
  if (!safe) return '';
  try { return new URL(safe).hostname.replace(/^www\./iu, ''); } catch { return ''; }
}

export function parseShareTarget(params) {
  const title = (params.get('title') || '').trim().slice(0, 500);
  const text = (params.get('text') || '').trim().slice(0, 8000);
  const rawUrl = params.get('url') || text.match(/https?:\/\/[^\s<>"']+/iu)?.[0] || '';
  const url = normaliseShareUrl(rawUrl);
  let comment = text;
  if (url) comment = comment.replace(rawUrl, '').trim();
  if (title && comment.toLocaleLowerCase('en-GB') === title.toLocaleLowerCase('en-GB')) comment = '';
  return { title, text: comment, url, fromShare: true };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/gu, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function imagePreviewUrl(blob) {
  return blob ? URL.createObjectURL(blob) : '';
}

async function imageToJpeg(file) {
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw Error('This image could not be opened. Choose another photo.'); }
  let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  for (let attempt = 0; attempt < 5; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d', { alpha: false });
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', [0.78, 0.72, 0.66, 0.6, 0.54][attempt]));
    if (blob && blob.size <= 350 * 1024) { bitmap.close?.(); return blob; }
    if (attempt >= 2) scale *= 0.78;
  }
  bitmap.close?.();
  throw Error('This photo is too large to store safely. Try a smaller image.');
}

export function mountQuickCapture({ root, shared = null, standalone = false, dictation, onSave, onClose, toast }) {
  const mode = shared?.fromShare ? 'type' : 'dictate';
  const draftKey = shared?.fromShare ? `share:${shared.url || shared.title || 'incoming'}` : 'capture';
  let value = { mode, text: shared?.text || '', image: null, sharedTitle: shared?.title || '', sharedUrl: normaliseShareUrl(shared?.url) || '', fromShare: !!shared?.fromShare, captureId: crypto.randomUUID() };
  let imageUrl = '';
  let busy = false;
  let saveTimer;

  root.innerHTML = `<section class="quick-capture" aria-label="Quick Capture">
    <p class="quick-capture-intro">${value.fromShare ? 'Save this page to Notes &amp; Ideas · Inbox.' : 'Capture now. Save to Inbox. Organise later.'}</p>
    ${value.sharedUrl ? `<article class="quick-capture-link"><small>Website · ${escapeHtml(shareSource(value.sharedUrl))}</small><strong>${escapeHtml(value.sharedTitle || shareSource(value.sharedUrl))}</strong><a href="${escapeHtml(value.sharedUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(value.sharedUrl)}</a></article>` : ''}
    <div class="quick-capture-photo" data-qc-photo-wrap hidden>
      <div class="quick-capture-photo-preview" data-qc-photo-preview hidden></div>
      <div class="quick-capture-photo-actions"><button type="button" class="text-action danger" data-qc-action="remove-photo" hidden>Remove photo</button></div>
    </div>
    <input type="file" data-qc-file accept="image/*" capture="environment" hidden>
    <label class="quick-capture-writing"><span data-qc-label>${value.fromShare ? 'Why save this? · optional' : 'Your note'}</span><textarea data-qc-text rows="5" maxlength="8000" placeholder="${value.fromShare ? 'Add a note for later…' : 'Your note…'}">${escapeHtml(value.text)}</textarea></label>
    <div class="quick-capture-controls" aria-label="Capture methods">
      <button type="button" class="quick-capture-method" data-qc-action="type" aria-label="Type a note"><svg class="quick-capture-vintage-icon quick-capture-typewriter" viewBox="0 0 120 100" aria-hidden="true"><defs><linearGradient id="type-enamel" x1="0" y1="0" x2="0.9" y2="1"><stop stop-color="#78906a"/><stop offset=".45" stop-color="#43583c"/><stop offset="1" stop-color="#26372c"/></linearGradient><linearGradient id="type-brass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0bd"/><stop offset=".3" stop-color="#bd9250"/><stop offset=".64" stop-color="#f3d18a"/><stop offset="1" stop-color="#8b602b"/></linearGradient><linearGradient id="type-key" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff9e8"/><stop offset=".48" stop-color="#e5d3a9"/><stop offset="1" stop-color="#b69a6c"/></linearGradient></defs><ellipse cx="62" cy="88" rx="48" ry="6" fill="#4c38254d"/><path d="M21 43 13 76q-1 5 5 7l79 1q7 0 8-6l-9-35Z" fill="#213025" opacity=".45" transform="translate(2 3)"/><path d="M19 40h82l9 34q2 7-6 9H17q-8-2-6-9l8-34Z" fill="url(#type-enamel)" stroke="#3c3123" stroke-width="2.5"/><path d="M18 42h84l-2 8H16Z" fill="url(#type-brass)" stroke="#76542c" stroke-width="1.6"/><path d="M26 38V26q0-5 5-5h58q5 0 5 5v12M28 21V15h59v6m-50-6V9h42v6" fill="none" stroke="url(#type-brass)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M32 29h56" stroke="#5a4426" stroke-width="7" stroke-linecap="round"/><path d="M31 57h57" stroke="#d6b875" stroke-width="2" opacity=".9"/><g fill="url(#type-key)" stroke="#725a35" stroke-width="1"><rect x="27" y="52" width="10" height="8" rx="2"/><rect x="40" y="52" width="10" height="8" rx="2"/><rect x="53" y="52" width="10" height="8" rx="2"/><rect x="66" y="52" width="10" height="8" rx="2"/><rect x="79" y="52" width="10" height="8" rx="2"/><rect x="32" y="63" width="10" height="8" rx="2"/><rect x="45" y="63" width="10" height="8" rx="2"/><rect x="58" y="63" width="10" height="8" rx="2"/><rect x="71" y="63" width="10" height="8" rx="2"/><path d="M42 75h35q2 0 2 2v2H40v-2q0-2 2-2Z"/></g><path d="M96 25 107 17M104 17h7v8" fill="none" stroke="#9a432f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="100" cy="31" r="3" fill="url(#type-brass)"/></svg><small>Type</small></button>
      <button type="button" class="quick-capture-method" data-qc-action="camera" aria-label="Add a photo"><svg class="quick-capture-vintage-icon quick-capture-camera" viewBox="0 0 120 100" aria-hidden="true"><defs><linearGradient id="cam-leather" x1="0" y1="0" x2="0.9" y2="1"><stop stop-color="#b86f49"/><stop offset=".5" stop-color="#80452f"/><stop offset="1" stop-color="#4c3028"/></linearGradient><linearGradient id="cam-brass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff1bf"/><stop offset=".34" stop-color="#c39343"/><stop offset=".7" stop-color="#f2d58c"/><stop offset="1" stop-color="#815728"/></linearGradient><radialGradient id="cam-glass" cx="35%" cy="28%"><stop stop-color="#8bc3c3"/><stop offset=".35" stop-color="#304e54"/><stop offset=".72" stop-color="#192a34"/><stop offset="1" stop-color="#080e16"/></radialGradient></defs><ellipse cx="61" cy="87" rx="48" ry="6" fill="#4c38254d"/><path d="M18 35h84q6 0 6 6v34q0 6-7 7H18q-7 0-7-7V42q0-7 7-7Z" fill="#382a25" opacity=".4" transform="translate(2 3)"/><path d="M18 32h84q6 0 6 6v34q0 6-7 7H18q-7 0-7-7V39q0-7 7-7Z" fill="url(#cam-leather)" stroke="#493322" stroke-width="2.5"/><path d="M18 34h84v8H18Z" fill="url(#cam-brass)" stroke="#755125" stroke-width="1.5"/><path d="M29 31 36 20h26l7 11M30 20h31" fill="url(#cam-brass)" stroke="#755125" stroke-width="2" stroke-linejoin="round"/><rect x="76" y="23" width="16" height="9" rx="2" fill="#24312b" stroke="url(#cam-brass)" stroke-width="2"/><circle cx="84" cy="27" r="2.4" fill="#f7df9a"/><path d="M16 49h8v24h-8Zm82 0h7v24h-7Z" fill="#e5c783" opacity=".55"/><circle cx="60" cy="56" r="25" fill="#202324" stroke="url(#cam-brass)" stroke-width="5"/><circle cx="60" cy="56" r="19" fill="#604731" stroke="#e6c781" stroke-width="2.5"/><circle cx="60" cy="56" r="14" fill="url(#cam-glass)" stroke="#2d3234" stroke-width="3"/><circle cx="55" cy="50" r="4" fill="#e5ffff" opacity=".58"/><path d="M33 77h54" stroke="#e0bd78" stroke-width="2" opacity=".8"/><circle cx="29" cy="46" r="2" fill="#f2d18c"/><circle cx="91" cy="46" r="2" fill="#f2d18c"/><path d="M40 82h41" stroke="#463126" stroke-width="2" stroke-linecap="round"/></svg><small>Camera</small></button>
      <button type="button" class="quick-capture-mic" data-qc-action="dictate" aria-label="Start dictation" aria-pressed="false"><svg class="vintage-mic" viewBox="0 0 64 88" aria-hidden="true"><defs><linearGradient id="mic-metal" x1="0" x2="1"><stop stop-color="#7c5730"/><stop offset=".22" stop-color="#f6e0a7"/><stop offset=".48" stop-color="#a16c34"/><stop offset=".7" stop-color="#fff0bc"/><stop offset="1" stop-color="#76502c"/></linearGradient></defs><rect x="20" y="5" width="24" height="50" rx="12" fill="url(#mic-metal)" stroke="#53391d" stroke-width="2"/><path d="M24 17h16M24 23h16M24 29h16M24 35h16M24 41h16" stroke="#493a29" stroke-width="2.4" stroke-linecap="round"/><path d="M14 35v7a18 18 0 0 0 36 0v-7M32 60v12m-10 0h20" fill="none" stroke="url(#mic-metal)" stroke-width="5" stroke-linecap="round"/><path d="M27 75h10" stroke="#674621" stroke-width="4" stroke-linecap="round"/></svg><small data-qc-dictate-label>Dictate</small></button>
      <span class="quick-capture-draft" role="status" data-qc-status></span>
    </div>
    <footer class="quick-capture-footer">${standalone ? '<a class="secondary quick-capture-open-app" href="./">Open Unbound</a>' : ''}<button type="button" class="secondary" data-qc-action="cancel">Cancel</button><button type="button" class="primary" data-qc-action="save" disabled>${value.fromShare ? 'Save to Ideas' : 'Save to Inbox'}</button></footer>
  </section>`;

  const field = root.querySelector('[data-qc-text]');
  const status = root.querySelector('[data-qc-status]');
  const saveButton = root.querySelector('[data-qc-action="save"]');
  const photoWrap = root.querySelector('[data-qc-photo-wrap]');
  const fileInput = root.querySelector('[data-qc-file]');
  const showState = text => { if (status) status.textContent = text; };
  const micButton = root.querySelector('.quick-capture-mic');
  const micLabel = root.querySelector('[data-qc-dictate-label]');
  const updateMicState = () => {
    const active = micButton.classList.contains('recording') || micButton.classList.contains('reconnecting');
    micButton.setAttribute('aria-pressed', String(active));
    micButton.setAttribute('aria-label', active ? 'Stop dictation' : 'Start dictation');
    micLabel.textContent = active ? 'Stop' : 'Dictate';
  };
  const micState = new MutationObserver(updateMicState);
  micState.observe(micButton, { attributes: true, attributeFilter: ['class'] });
  micButton.addEventListener('click', event => {
    if (micButton.getAttribute('aria-pressed') !== 'true') return;
    event.preventDefault(); event.stopImmediatePropagation();
    dictation?.stop(); micButton.classList.remove('recording','reconnecting');
    micButton.setAttribute('aria-pressed','false'); micButton.setAttribute('aria-label','Start dictation');
    micLabel.textContent='Dictate'; updateMicState();
  });
  const update = () => {
    value.text = field.value;
    const canSave = !!(value.text.trim() || value.image || value.sharedUrl || value.sharedTitle);
    saveButton.disabled = busy || !canSave;
    saveButton.textContent = busy ? 'Saving…' : value.fromShare ? 'Save to Ideas' : 'Save to Inbox';
    root.querySelector('.quick-capture').dataset.mode = value.mode;
    photoWrap.hidden = value.mode !== 'camera' && !value.image;
    root.querySelector('[data-qc-label]').textContent = value.fromShare ? 'Why save this? · optional' : value.mode === 'camera' ? 'Caption · optional' : 'Your note';
  };
  const persist = () => {
    value.text = field.value;
    showState('Saving draft…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushDraft, 100);
  };
  const flushDraft = () => {
    clearTimeout(saveTimer); value.text = field.value;
    draftStore('put', draftKey, value).then(() => showState('Draft saved on this device')).catch(() => showState('Draft recovery is unavailable'));
  };
  const flushWhenHidden = () => { if (document.visibilityState === 'hidden') flushDraft(); };
  document.addEventListener('visibilitychange', flushWhenHidden);
  window.addEventListener('pagehide', flushDraft);
  const displayPhoto = () => {
    const preview = root.querySelector('[data-qc-photo-preview]');
    const remove = root.querySelector('[data-qc-action="remove-photo"]');
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    imageUrl = imagePreviewUrl(value.image);
    preview.hidden = !imageUrl;
    preview.innerHTML = imageUrl ? `<img src="${imageUrl}" alt="Photo ready to save">` : '';
    remove.hidden = !value.image;
    update();
  };

  let editedBeforeRestore = false;
  draftStore('get', draftKey).then(draft => {
    if (!draft || editedBeforeRestore) return;
    value = { ...value, ...draft, fromShare: !!shared?.fromShare };
    field.value = value.text || '';
    displayPhoto();
    showState('Draft restored');
  }).catch(() => showState('Draft recovery is unavailable'));

  field.addEventListener('input', () => { editedBeforeRestore = true; update(); persist(); });
  root.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    const action = button.dataset.qcAction;
    if (action === 'cancel') { onClose(); return; }
    if (action === 'type') { value.mode = 'type'; update(); field.focus({ preventScroll: true }); return; }
    if (action === 'camera' || action === 'choose') { value.mode = 'camera'; fileInput.setAttribute('capture', action === 'camera' ? 'environment' : 'user'); update(); fileInput.click(); return; }
    if (action === 'remove-photo') { value.image = null; displayPhoto(); persist(); return; }
    if (action === 'dictate') {
      if (!dictation) { toast('Speech dictation is unavailable. Use the keyboard microphone.'); return; }
      if (button.getAttribute('aria-pressed') === 'true' || button.classList.contains('recording') || button.classList.contains('reconnecting')) { dictation.stop(); button.classList.remove('recording','reconnecting'); button.setAttribute('aria-pressed','false'); button.setAttribute('aria-label','Start dictation'); micLabel.textContent='Dictate'; updateMicState(); return; }
      dictation.start(field, button);
      return;
    }
    if (action === 'save') {
      if (busy) return;
      clearTimeout(saveTimer);
      value.text = field.value;
      if (!(value.text.trim() || value.image || value.sharedUrl || value.sharedTitle)) { toast('Add a note, photo or shared link before saving.'); return; }
      busy = true; update(); showState('Saving to this device…');
      try {
        await onSave({ ...value, draftKey });
        await draftStore('delete', draftKey);
        showState('Saved to Inbox');
      } catch (error) {
        busy = false; update(); persist(); showState('Not saved · your draft is still here');
        toast(error?.message || 'Could not save this capture. Your draft is still here.');
      }
    }
  });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0]; fileInput.value = '';
    if (!file) return;
    try {
      value.image = await imageToJpeg(file);
      displayPhoto(); persist(); showState('Photo ready · draft saved on this device');
    } catch (error) { toast(error.message); }
  });
  update();
  if (!value.fromShare && value.mode === 'dictate') root.querySelector('[data-qc-action="dictate"]')?.focus({ preventScroll: true });
  return { destroy() { if (!busy) flushDraft(); else clearTimeout(saveTimer); document.removeEventListener('visibilitychange', flushWhenHidden); window.removeEventListener('pagehide', flushDraft); micState.disconnect(); dictation?.dismiss(); if (imageUrl) URL.revokeObjectURL(imageUrl); } };
}
