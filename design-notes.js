/*
 * Design notes — annotate any running web app, then batch-process the feedback with an AI agent.
 *
 * Load: paste into the DevTools console, or save as a DevTools Snippet (Sources → Snippets) and run per page load.
 * Use:  Alt+hover highlights elements · Alt+click opens a note box · badge (bottom-left) opens the manager.
 * Notes persist in localStorage per origin until you clear them. Nothing is sent anywhere.
 */
(() => {
  if (window.__designNotes) {
    window.__designNotes.togglePanel();
    return;
  }
  const KEY = 'design-notes';
  const load = () => JSON.parse(localStorage.getItem(KEY) || '[]');
  const save = (notes) => localStorage.setItem(KEY, JSON.stringify(notes));

  const root = document.createElement('div');
  root.id = 'design-notes-root';
  document.body.appendChild(root);

  const style = document.createElement('style');
  style.textContent = `
    #design-notes-root { font: 13px/1.4 -apple-system, system-ui, sans-serif; }
    #design-notes-root * { box-sizing: border-box; }
    .dn-badge { position: fixed; bottom: 16px; left: 16px; z-index: 2147483646; padding: 8px 14px;
      border-radius: 20px; border: none; cursor: pointer; background: #00286A; color: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,.3); font-weight: 600; }
    .dn-outline { position: fixed; z-index: 2147483645; pointer-events: none;
      border: 2px solid #FF8CDF; border-radius: 3px; display: none; }
    .dn-modal { position: fixed; z-index: 2147483647; width: 340px; background: #fff; border-radius: 10px;
      box-shadow: 0 8px 30px rgba(0,0,0,.35); padding: 12px; }
    .dn-modal textarea { width: 100%; min-height: 84px; resize: vertical; padding: 8px;
      border: 1px solid #C8C8C7; border-radius: 6px; font: inherit; }
    .dn-modal .dn-target { color: #64645F; margin: 0 0 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dn-row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
    .dn-btn { padding: 6px 12px; border-radius: 6px; border: 1px solid #C8C8C7; background: #fff; cursor: pointer; font: inherit; }
    .dn-btn.dn-primary { background: #106DFF; border-color: #106DFF; color: #fff; }
    .dn-btn.dn-danger { color: #D70F18; border-color: #D70F18; }
    .dn-panel { position: fixed; bottom: 60px; left: 16px; z-index: 2147483646; width: 400px; max-height: 65vh;
      display: none; flex-direction: column; background: #fff; border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,.35); }
    .dn-panel header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #E3E3E3; }
    .dn-panel header strong { flex: 1; }
    .dn-list { overflow-y: auto; padding: 8px 12px; }
    .dn-item { border: 1px solid #E3E3E3; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }
    .dn-item .dn-meta { color: #64645F; font-size: 11px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dn-item .dn-note-text { white-space: pre-wrap; word-break: break-word; }
    .dn-item .dn-row { justify-content: flex-start; }
    .dn-empty { color: #64645F; padding: 16px; text-align: center; }
    .dn-toast { position: fixed; bottom: 60px; left: 16px; z-index: 2147483647; background: #1C1C1A; color: #fff;
      padding: 8px 14px; border-radius: 6px; }
  `;
  root.appendChild(style);

  const badge = document.createElement('button');
  badge.className = 'dn-badge';
  root.appendChild(badge);

  const outline = document.createElement('div');
  outline.className = 'dn-outline';
  root.appendChild(outline);

  const panel = document.createElement('div');
  panel.className = 'dn-panel';
  panel.innerHTML = `
    <header>
      <strong></strong>
      <button class="dn-btn" data-act="copy" title="Copy all notes as JSON">Copy</button>
      <button class="dn-btn" data-act="download" title="Download design-notes.json">Download</button>
      <button class="dn-btn dn-danger" data-act="clear" title="Delete all notes">Clear</button>
    </header>
    <div class="dn-list"></div>`;
  root.appendChild(panel);

  const toast = (msg) => {
    const el = document.createElement('div');
    el.className = 'dn-toast';
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  };

  const describe = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const fiberKey = Object.keys(el).find((k) => k.startsWith('__reactFiber'));
    let source = null;
    const componentChain = [];
    if (fiberKey) {
      let fiber = el[fiberKey];
      while (fiber && componentChain.length < 6) {
        const name = fiber.type?.displayName || fiber.type?.name || (typeof fiber.type === 'string' ? fiber.type : null);
        if (name) componentChain.push(name);
        if (!source && fiber._debugSource) source = `${fiber._debugSource.fileName}:${fiber._debugSource.lineNumber}`;
        fiber = fiber.return;
      }
    }
    return {
      text: (el.textContent || '').trim().slice(0, 80),
      tag: el.tagName.toLowerCase(),
      testId: el.closest('[data-testid]')?.getAttribute('data-testid') || null,
      classes: typeof el.className === 'string' ? el.className.slice(0, 120) : null,
      componentChain,
      source,
      box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      styles: {
        fontSize: cs.fontSize, lineHeight: cs.lineHeight, fontFamily: cs.fontFamily.split(',')[0],
        color: cs.color, background: cs.backgroundColor, padding: cs.padding, margin: cs.margin,
        border: cs.border, borderRadius: cs.borderRadius, gap: cs.gap
      }
    };
  };

  const updateBadge = () => (badge.textContent = `📝 ${load().length}`);

  const renderPanel = () => {
    const notes = load();
    panel.querySelector('strong').textContent = `Design notes (${notes.length})`;
    const list = panel.querySelector('.dn-list');
    list.innerHTML = notes.length ? '' : '<div class="dn-empty">No notes yet. Alt+click any element to add one.</div>';
    notes.forEach((n, i) => {
      const item = document.createElement('div');
      item.className = 'dn-item';
      const target = [n.element.testId && `#${n.element.testId}`, n.element.text && `“${n.element.text.slice(0, 40)}”`, `<${n.element.tag}>`]
        .filter(Boolean).join(' · ');
      item.innerHTML = `
        <div class="dn-note-text"></div>
        <div class="dn-meta"></div>
        <div class="dn-row">
          <button class="dn-btn" data-act="edit">Edit</button>
          <button class="dn-btn dn-danger" data-act="delete">Delete</button>
        </div>`;
      item.querySelector('.dn-note-text').textContent = n.note;
      item.querySelector('.dn-meta').textContent = `${target} · ${n.page}`;
      item.querySelector('[data-act=edit]').onclick = () => {
        const body = item.querySelector('.dn-note-text');
        const ta = document.createElement('textarea');
        ta.value = n.note;
        Object.assign(ta.style, { width: '100%', minHeight: '70px', font: 'inherit' });
        body.replaceWith(ta);
        ta.focus();
        const row = item.querySelector('.dn-row');
        row.innerHTML = '';
        const saveBtn = document.createElement('button');
        saveBtn.className = 'dn-btn dn-primary';
        saveBtn.textContent = 'Save';
        saveBtn.onclick = () => {
          const all = load();
          all[i].note = ta.value.trim();
          save(all);
          renderPanel();
          updateBadge();
        };
        row.appendChild(saveBtn);
      };
      item.querySelector('[data-act=delete]').onclick = () => {
        const all = load();
        all.splice(i, 1);
        save(all);
        renderPanel();
        updateBadge();
      };
      list.appendChild(item);
    });
  };

  panel.querySelector('[data-act=copy]').onclick = async () => {
    await navigator.clipboard.writeText(JSON.stringify(load(), null, 2));
    toast('Copied to clipboard');
  };
  panel.querySelector('[data-act=download]').onclick = () => {
    const blob = new Blob([JSON.stringify(load(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'design-notes.json';
    a.click();
  };
  panel.querySelector('[data-act=clear]').onclick = () => {
    if (!confirm('Delete all notes?')) return;
    save([]);
    renderPanel();
    updateBadge();
  };

  const togglePanel = () => {
    const open = panel.style.display === 'flex';
    panel.style.display = open ? 'none' : 'flex';
    if (!open) renderPanel();
  };
  badge.onclick = togglePanel;

  let modal = null;
  const closeModal = () => {
    modal?.remove();
    modal = null;
  };
  const openModal = (el, x, y) => {
    closeModal();
    modal = document.createElement('div');
    modal.className = 'dn-modal';
    const d = describe(el);
    modal.innerHTML = `
      <p class="dn-target"></p>
      <textarea placeholder="What is wrong with this element?"></textarea>
      <div class="dn-row">
        <button class="dn-btn" data-act="cancel">Cancel</button>
        <button class="dn-btn dn-primary" data-act="save">Save note</button>
      </div>`;
    modal.querySelector('.dn-target').textContent = [d.testId && `#${d.testId}`, d.text && `“${d.text.slice(0, 50)}”`, `<${d.tag}>`]
      .filter(Boolean).join(' · ');
    Object.assign(modal.style, {
      left: Math.min(x, innerWidth - 360) + 'px',
      top: Math.min(y + 12, innerHeight - 220) + 'px'
    });
    const ta = modal.querySelector('textarea');
    const submit = () => {
      const note = ta.value.trim();
      if (note) {
        const notes = load();
        notes.push({ note, when: new Date().toISOString(), page: location.pathname + location.search, viewport: `${innerWidth}x${innerHeight}`, element: d });
        save(notes);
        updateBadge();
        if (panel.style.display === 'flex') renderPanel();
      }
      closeModal();
    };
    modal.querySelector('[data-act=save]').onclick = submit;
    modal.querySelector('[data-act=cancel]').onclick = closeModal;
    ta.onkeydown = (e) => {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
    };
    root.appendChild(modal);
    ta.focus();
  };

  document.addEventListener('mousemove', (e) => {
    if (!e.altKey || modal) { outline.style.display = 'none'; return; }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || root.contains(el)) return;
    const r = el.getBoundingClientRect();
    Object.assign(outline.style, { display: 'block', left: r.x + 'px', top: r.y + 'px', width: r.width + 'px', height: r.height + 'px' });
  }, true);

  document.addEventListener('click', (e) => {
    if (!e.altKey || modal) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || root.contains(el)) return;
    e.preventDefault();
    e.stopPropagation();
    outline.style.display = 'none';
    openModal(el, e.clientX, e.clientY);
  }, true);

  updateBadge();
  window.__designNotes = { togglePanel };
  console.log('design notes active — Alt+hover to highlight, Alt+click to annotate, badge to manage');
})();
