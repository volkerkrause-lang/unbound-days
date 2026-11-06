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

export function mountQuickCapture({ root, shared = null, dictation, onSave, onClose, toast }) {
  const mode = shared?.fromShare ? 'type' : 'dictate';
  const draftKey = shared?.fromShare ? `share:${shared.url || shared.title || 'incoming'}` : 'capture';
  let value = { mode, text: shared?.text || '', image: null, sharedTitle: shared?.title || '', sharedUrl: normaliseShareUrl(shared?.url) || '', fromShare: !!shared?.fromShare, captureId: crypto.randomUUID() };
  let imageUrl = '';
  let busy = false;
  let saveTimer;

  root.innerHTML = `<section class="quick-capture" aria-label="Quick Capture">
    <div class="quick-capture-intro"><p>Capture now. Organise later.</p><span>Save to Inbox</span></div>
    ${value.sharedUrl ? `<article class="quick-capture-link"><small>Shared page</small><strong>${escapeHtml(value.sharedTitle || new URL(value.sharedUrl).hostname)}</strong><a href="${escapeHtml(value.sharedUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(value.sharedUrl)}</a></article>` : ''}
    <nav class="quick-capture-methods" role="tablist" aria-label="Choose a capture method">
      <button type="button" role="tab" data-qc-mode="dictate" aria-selected="${mode === 'dictate'}"><span aria-hidden="true">◉</span><small>Dictate</small></button>
      <button type="button" role="tab" data-qc-mode="camera" aria-selected="false"><span aria-hidden="true">▣</span><small>Camera</small></button>
      <button type="button" role="tab" data-qc-mode="type" aria-selected="${mode === 'type'}"><span aria-hidden="true">⌨</span><small>Type</small></button>
    </nav>
    <div class="quick-capture-photo" data-qc-photo-wrap hidden>
      <div class="quick-capture-photo-preview" data-qc-photo-preview hidden></div>
      <div class="quick-capture-photo-actions"><button type="button" class="secondary" data-qc-action="camera">Take a photo</button><button type="button" class="secondary" data-qc-action="choose">Choose image</button><button type="button" class="text-action danger" data-qc-action="remove-photo" hidden>Remove photo</button></div>
    </div>
    <input type="file" data-qc-file accept="image/*" capture="environment" hidden>
    <label class="quick-capture-writing"><span data-qc-label>${value.fromShare ? 'Add a comment · optional' : 'Your note'}</span><textarea data-qc-text rows="5" maxlength="8000" placeholder="${value.fromShare ? 'Add a thought about this page…' : 'Say what is on your mind…'}">${escapeHtml(value.text)}</textarea></label>
    <div class="quick-capture-controls">
      <button type="button" class="quick-capture-mic" data-qc-action="dictate" aria-label="${value.fromShare ? 'Dictate a comment' : 'Start dictation'}"><span aria-hidden="true">🎙</span><small>${value.fromShare ? 'Add spoken comment' : 'Start dictation'}</small></button>
      <span class="quick-capture-draft" role="status" data-qc-status></span>
    </div>
    <footer class="quick-capture-footer"><button type="button" class="secondary" data-qc-action="cancel">Cancel</button><button type="button" class="primary" data-qc-action="save" disabled>Save to Inbox</button></footer>
  </section>`;

  const field = root.querySelector('[data-qc-text]');
  const status = root.querySelector('[data-qc-status]');
  const saveButton = root.querySelector('[data-qc-action="save"]');
  const photoWrap = root.querySelector('[data-qc-photo-wrap]');
  const fileInput = root.querySelector('[data-qc-file]');
  const showState = text => { if (status) status.textContent = text; };
  const update = () => {
    value.text = field.value;
    const canSave = !!(value.text.trim() || value.image || value.sharedUrl || value.sharedTitle);
    saveButton.disabled = busy || !canSave;
    saveButton.textContent = busy ? 'Saving…' : 'Save to Inbox';
    root.querySelectorAll('[data-qc-mode]').forEach(button => button.setAttribute('aria-selected', String(button.dataset.qcMode === value.mode)));
    photoWrap.hidden = value.mode !== 'camera' && !value.image;
    root.querySelector('[data-qc-label]').textContent = value.fromShare ? 'Add a comment · optional' : value.mode === 'camera' ? 'Caption · optional' : 'Your note';
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
    if (button.dataset.qcMode) {
      value.mode = button.dataset.qcMode;
      update(); persist();
      if (value.mode === 'type') field.focus({ preventScroll: true });
      return;
    }
    const action = button.dataset.qcAction;
    if (action === 'cancel') { onClose(); return; }
    if (action === 'camera' || action === 'choose') { fileInput.setAttribute('capture', action === 'camera' ? 'environment' : 'user'); fileInput.click(); return; }
    if (action === 'remove-photo') { value.image = null; displayPhoto(); persist(); return; }
    if (action === 'dictate') {
      if (!dictation) { toast('Speech dictation is unavailable. Use the keyboard microphone.'); return; }
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
  return { destroy() { if (!busy) flushDraft(); else clearTimeout(saveTimer); document.removeEventListener('visibilitychange', flushWhenHidden); window.removeEventListener('pagehide', flushDraft); dictation?.dismiss(); if (imageUrl) URL.revokeObjectURL(imageUrl); } };
}
