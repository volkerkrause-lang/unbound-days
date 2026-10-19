/* Bright Ideas iPad workspace enhancement. Keeps the existing notebook data model intact. */
(() => {
  const PAPER_KEY = 'unbound-bright-ideas-paper-v1';
  const state = { root: null, noteId: null, canvas: null, tool: 'pen', color: '#313a41', size: 3 };
  const esc = (s) => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paperStore = () => { try { return JSON.parse(localStorage.getItem(PAPER_KEY) || '{}'); } catch { return {}; } };
  const savePaper = (id, value) => { const p = paperStore(); p[id] = value; localStorage.setItem(PAPER_KEY, JSON.stringify(p)); };
  const noteId = () => document.querySelector('.note-editor [data-note-title]')?.dataset.noteTitle || 'current';
  const toast = (message) => {
    const el = document.querySelector('#toast');
    if (el) { el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200); }
  };
  const applyPaper = (root, value, custom) => {
    root.classList.remove('idea-paper-blank','idea-paper-grid','idea-paper-lined','idea-paper-checklist','idea-paper-custom');
    root.classList.add('idea-paper-' + value);
    if (value === 'custom' && custom) root.style.backgroundImage = 'url("' + custom + '")';
    else root.style.removeProperty('background-image');
  };
  const build = () => {
    const layout = document.querySelector('.launchpad-layout');
    if (!layout) return;
    const editor = layout.querySelector('.note-editor');
    if (!editor) {
      layout.classList.add('bright-ideas-enhanced');
      const starter = layout.querySelector('[data-action="idea-page"]');
      if (starter && layout.dataset.ideaAutostart !== '1') {
        layout.dataset.ideaAutostart = '1';
        starter.click();
      }
      return;
    }
    const id = noteId();
    if (state.root === editor && state.noteId === id && editor.dataset.enhanced === '1') return;
    state.root = editor; state.noteId = id; editor.dataset.enhanced = '1';
    layout.classList.add('bright-ideas-enhanced');
    const side = layout.querySelector('aside');
    if (side) {
      const collection = document.createElement('aside');
      collection.className = 'idea-collection-popover';
      collection.hidden = true;
      collection.innerHTML = '<div class="idea-collection-head"><strong>Saved ideas</strong><button type="button" class="idea-mini-close" aria-label="Close saved ideas">×</button></div>' + side.querySelector('.note-list')?.outerHTML;
      editor.parentElement.append(collection);
      side.remove();
      collection.addEventListener('click', e => {
        if (e.target.closest('.idea-mini-close')) { collection.hidden = true; return; }
        const note = e.target.closest('[data-note]');
        if (note) { collection.hidden = true; }
      });
    }
    const title = editor.querySelector('[data-note-title]');
    const oldControls = editor.querySelector('.note-controls');
    if (oldControls) oldControls.remove();
    const oldHelp = [...editor.querySelectorAll('.ink-toolbar, .note-editor > p.scratch-note')];
    oldHelp.forEach(x => x.remove());
    const head = title?.closest('input')?.parentElement;
    if (head) head.classList.add('idea-editor-head');
    const toolbar = document.createElement('div');
    toolbar.className = 'idea-native-toolbar';
    toolbar.setAttribute('role','toolbar');
    toolbar.innerHTML = [
      ['pen','✒','Ink pen'],['pencil','✎','Pencil'],['highlighter','▰','Highlighter'],['eraser','⌫','Eraser'],['lasso','⌁','Lasso'],
    ].map(([tool,icon,label]) => '<button type="button" class="idea-tool" data-enhanced-tool="'+tool+'" aria-label="'+label+'" title="'+label+'">'+icon+'</button>').join('') +
      '<label class="idea-colour" title="Ink colour"><input type="color" data-enhanced-color value="'+esc(state.color)+'" aria-label="Ink colour"></label>' +
      '<label class="idea-size" title="Stroke thickness"><input type="range" min="1" max="12" value="'+state.size+'" data-enhanced-size aria-label="Stroke thickness"></label>' +
      '<button type="button" class="idea-tool" data-enhanced-action="paper" aria-label="Paper template" title="Paper template">▦</button>' +
      '<button type="button" class="idea-tool" data-enhanced-action="convert" aria-label="Convert handwriting to text" title="Convert handwriting to text">A</button>' +
      '<button type="button" class="idea-tool" data-enhanced-action="dictate" aria-label="Dictate" title="Dictate">🎙</button>' +
      '<button type="button" class="idea-tool idea-new" data-enhanced-action="new" aria-label="New idea" title="New idea">＋</button>' +
      '<button type="button" class="idea-tool" data-enhanced-action="collections" aria-label="Saved ideas" title="Saved ideas">▤</button>';
    editor.insertBefore(toolbar, editor.firstChild);
    const page = editor.closest('.launchpad-layout') || editor;
    const stored = paperStore()[id] || 'blank';
    const custom = paperStore()[id + ':custom'];
    applyPaper(page, stored, custom);
    toolbar.addEventListener('click', e => {
      const tool = e.target.closest('[data-enhanced-tool]')?.dataset.enhancedTool;
      const action = e.target.closest('[data-enhanced-action]')?.dataset.enhancedAction;
      if (tool) {
        state.tool = tool;
        toolbar.querySelectorAll('[data-enhanced-tool]').forEach(b => b.classList.toggle('active', b.dataset.enhancedTool === tool));
        const native = editor.querySelector('[data-ink-tool="'+(tool === 'highlighter' || tool === 'pencil' ? 'pen' : tool)+'"]');
        native?.click();
        toast(tool === 'lasso' ? 'Lasso selected: drag across ink to select and reposition.' : tool[0].toUpperCase()+tool.slice(1)+' selected.');
      }
      if (action === 'collections') {
        const drawer = editor.parentElement.querySelector('.idea-collection-popover');
        if (drawer) drawer.hidden = !drawer.hidden;
      }
      if (action === 'paper') showPaperMenu(page, id);
      if (action === 'convert') showConvert(editor, id);
      if (action === 'dictate') {
        const field = editor.querySelector('[data-entry]');
        field?.focus();
        document.querySelector('[data-action="dictate"]')?.click();
      }
      if (action === 'new') document.querySelector('[data-action="idea-page"]')?.click();
    });
    toolbar.addEventListener('input', e => {
      if (e.target.matches('[data-enhanced-color]')) state.color = e.target.value;
      if (e.target.matches('[data-enhanced-size]')) state.size = Number(e.target.value);
    });
    const canvas = editor.querySelector('#ink-canvas');
    if (canvas) { state.canvas = canvas; canvas.classList.add('idea-native-canvas'); }
  };
  const showPaperMenu = (page, id) => {
    const modal = document.querySelector('#modal');
    const content = document.querySelector('#modal-content');
    if (!modal || !content) return;
    content.innerHTML = '<h2 id="modal-title">Paper template</h2><div class="paper-choice-grid">'+
      [['blank','Blank'],['grid','Squared'],['lined','Ruled'],['checklist','Tick list']].map(([v,l]) => '<button type="button" class="paper-choice" data-paper="'+v+'">'+l+'</button>').join('')+
      '<button type="button" class="paper-choice" data-paper="import">Import custom background</button></div><button type="button" class="secondary" data-enhanced-close>Close</button>';
    modal.showModal();
    content.onclick = e => {
      const choice = e.target.closest('[data-paper]')?.dataset.paper;
      if (choice === 'import') {
        let input = document.querySelector('#enhanced-paper-file');
        if (!input) { input = document.createElement('input'); input.type='file'; input.id='enhanced-paper-file'; input.accept='image/png,image/jpeg,image/webp'; input.hidden=true; document.body.append(input); input.onchange = ev => {
          const file = ev.target.files?.[0]; if (!file) return; const reader = new FileReader();
          reader.onload = () => { savePaper(id,'custom'); savePaper(id+':custom',reader.result); applyPaper(page,'custom',reader.result); modal.close(); };
          reader.readAsDataURL(file);
        }; }
        input.click();
      } else if (choice) { savePaper(id, choice); applyPaper(page, choice); modal.close(); }
      if (e.target.closest('[data-enhanced-close]')) modal.close();
    };
  };
  const showConvert = (editor, id) => {
    const modal = document.querySelector('#modal'), content = document.querySelector('#modal-content');
    const field = editor.querySelector('[data-entry]');
    if (!modal || !content || !field) return;
    content.innerHTML = '<h2 id="modal-title">Convert handwriting to text</h2><p>Review the clean text before replacing the handwriting layer.</p><textarea id="enhanced-conversion" rows="10">'+esc(field.value)+'</textarea><div class="modal-footer"><button type="button" class="secondary" data-enhanced-close>Cancel</button><button type="button" class="primary" data-enhanced-apply>Replace handwriting with text</button></div>';
    modal.showModal();
    content.onclick = e => {
      if (e.target.closest('[data-enhanced-close]')) modal.close();
      if (e.target.closest('[data-enhanced-apply]')) {
        field.value = content.querySelector('#enhanced-conversion').value;
        field.dispatchEvent(new Event('input',{bubbles:true}));
        document.querySelector('[data-action="clear-ink"]')?.click();
        editor.querySelector('#ink-canvas')?.remove();
        const text = document.createElement('div'); text.className='converted-idea-text'; text.textContent=field.value;
        field.replaceWith(text); modal.close(); toast('Handwriting replaced with clean app text.');
      }
    };
  };
  const observer = new MutationObserver(build);
  observer.observe(document.body,{childList:true,subtree:true});
  build();
})();