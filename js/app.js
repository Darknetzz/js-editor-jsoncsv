/* App glue: multi-tab document management, drag & drop, format detection, export. */

'use strict';

(function () {
  var els = {
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('fileInput'),
    browseBtn: document.getElementById('browseBtn'),
    pasteBtn: document.getElementById('pasteBtn'),
    pasteDialog: document.getElementById('pasteDialog'),
    pasteText: document.getElementById('pasteText'),
    pasteOk: document.getElementById('pasteOk'),
    editorSection: document.getElementById('editorSection'),
    editorContainer: document.getElementById('editorContainer'),
    tabbar: document.getElementById('tabbar'),
    tabs: document.getElementById('tabs'),
    newTabBtn: document.getElementById('newTabBtn'),
    headerActions: document.getElementById('headerActions'),
    fileBadge: document.getElementById('fileBadge'),
    exportBtn: document.getElementById('exportBtn'),
    copyBtn: document.getElementById('copyBtn'),
    newCsvBtn: document.getElementById('newCsvBtn'),
    newJsonBtn: document.getElementById('newJsonBtn'),
    sampleCsvBtn: document.getElementById('sampleCsvBtn'),
    sampleJsonBtn: document.getElementById('sampleJsonBtn')
  };

  var state = { tabs: [], activeId: null, nextId: 1, adding: false };
  var MAX_BYTES = 8 * 1024 * 1024;
  var SAVE_KEY = 'editor-tabs';
  var saveTimer = null;

  function persist() {
    try {
      var payload = {
        tabs: state.tabs.map(function (t) {
          var item = { kind: t.kind, name: t.name, dirty: t.dirty };
          if (t.kind === 'json' || t.kind === 'jsonl') {
            item.data = t.editor.getValue();
          } else {
            item.data = t.editor.getData();
            item.delimiter = t.editor.getDelimiter();
          }
          return item;
        }),
        activeId: state.activeId,
        nextId: state.nextId
      };
      if (payload.tabs.length === 0) {
        localStorage.removeItem(SAVE_KEY);
        return;
      }
      var json = JSON.stringify(payload);
      if (json.length > 4 * 1024 * 1024) return;
      localStorage.setItem(SAVE_KEY, json);
    } catch (e) { /* storage unavailable or full */ }
  }

  function schedulePersist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 400);
  }

  var SAMPLE_CSV = 'name,age,city\nAlice,30,Berlin\nBob,25,Paris\nCarol,35,"New York, NY"';
  var SAMPLE_JSON = '{\n  "project": "js-editor-jsoncsv",\n  "version": "1.0.0",\n  "tags": ["csv", "json", "editor"],\n  "settings": { "theme": "light", "autosave": false }\n}';

  function activeTab() {
    for (var i = 0; i < state.tabs.length; i++) {
      if (state.tabs[i].id === state.activeId) return state.tabs[i];
    }
    return null;
  }

  // ---------- format detection & parsing ----------

  function detectFormat(text, filename) {
    var t = text.trimStart();
    if (t.startsWith('{') || t.startsWith('[')) {
      try { JSON.parse(text); return 'json'; } catch (e) { /* fall through */ }
    }
    if (/\.jsonl$/i.test(filename || '')) {
      var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
      if (lines.length && lines.every(function (l) {
        try { JSON.parse(l); return true; } catch (e) { return false; }
      })) return 'jsonl';
    }
    var delim = detectDelimiter(text);
    return delim === '\t' ? 'tsv' : 'csv';
  }

  function parseFile(text, kind) {
    if (kind === 'json') return JSON.parse(text);
    if (kind === 'jsonl') {
      return text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) { return JSON.parse(l); });
    }
    var delim = kind === 'tsv' ? '\t' : detectDelimiter(text);
    return { rows: parseDelimited(text, delim), delim: delim };
  }

  // ---------- tab management ----------

  function openDocument(text, name, kindHint) {
    var kind = kindHint || detectFormat(text, name);
    var tab = { id: state.nextId++, kind: kind, name: name, dirty: false, editor: null, pane: null };
    var pane = document.createElement('div');
    pane.className = 'tab-pane';
    els.editorContainer.appendChild(pane);

    try {
      if (kind === 'json' || kind === 'jsonl') {
        tab.editor = createJsonTree(pane, { onChange: markDirty });
        tab.editor.setValue(parseFile(text, kind));
      } else {
        var parsed = parseFile(text, kind);
        tab.editor = createTableEditor(pane, { onChange: markDirty });
        tab.editor.setData(parsed.rows, parsed.delim);
      }
    } catch (err) {
      pane.remove();
      alert('Could not parse this file: ' + err.message);
      showEmptyIfNeeded();
      return false;
    }

    tab.pane = pane;
    state.tabs.push(tab);
    els.editorSection.hidden = false;
    setAdding(false);
    setActive(tab.id);
    return true;
  }

  function openBlank(kind) {
    var name = kind === 'csv' ? 'untitled.csv' : 'untitled.json';
    var tab = { id: state.nextId++, kind: kind, name: name, dirty: false, editor: null, pane: null };
    var pane = document.createElement('div');
    pane.className = 'tab-pane';
    els.editorContainer.appendChild(pane);

    if (kind === 'csv') {
      tab.editor = createTableEditor(pane, { onChange: markDirty });
      tab.editor.setData([['']], ',');
    } else {
      tab.editor = createJsonTree(pane, { onChange: markDirty });
      tab.editor.setValue({});
    }

    tab.pane = pane;
    state.tabs.push(tab);
    els.editorSection.hidden = false;
    setAdding(false);
    setActive(tab.id);
  }

  function setAdding(adding) {
    state.adding = adding;
    els.dropzone.hidden = !adding;
    els.newTabBtn.classList.toggle('active', adding);
  }

  function markDirty() {
    var t = activeTab();
    if (t && !t.dirty) {
      t.dirty = true;
      if (t.nameEl) t.nameEl.textContent = t.name + ' \u2022';
    }
    schedulePersist();
  }

  function setActive(id) {
    setAdding(false);
    state.activeId = id;
    state.tabs.forEach(function (t) { t.pane.hidden = t.id !== id; });
    var t = activeTab();
    if (t) {
      els.fileBadge.textContent = t.name + ' \u00b7 ' + t.kind.toUpperCase();
      els.fileBadge.className = 'file-badge kind-' + t.kind;
      els.headerActions.hidden = false;
    }
    renderTabs();
    schedulePersist();
  }

  function renderTabs() {
    els.tabs.innerHTML = '';
    state.tabs.forEach(function (t) {
      var el = document.createElement('div');
      el.className = 'tab tab-dot-' + t.kind + (t.id === state.activeId ? ' active' : '');
      el.title = t.name + (t.dirty ? ' (unsaved changes)' : '');

      var name = document.createElement('span');
      name.className = 'tab-name';
      name.textContent = t.dirty ? t.name + ' \u2022' : t.name;
      t.nameEl = name;
      name.addEventListener('click', function () { setActive(t.id); });

      var close = document.createElement('button');
      close.className = 'icon-btn tab-close';
      close.textContent = '\u2715';
      close.title = 'Close tab';
      close.addEventListener('click', function (e) { e.stopPropagation(); closeTab(t.id); });

      el.appendChild(name);
      el.appendChild(close);
      els.tabs.appendChild(el);
    });
    els.tabbar.hidden = state.tabs.length === 0;
  }

  function closeTab(id) {
    var idx = -1;
    for (var i = 0; i < state.tabs.length; i++) {
      if (state.tabs[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return;
    var tab = state.tabs[idx];
    if (tab.dirty && !confirm('Discard unsaved changes in "' + tab.name + '"?')) return;

    tab.pane.remove();
    state.tabs.splice(idx, 1);

    if (state.activeId === id) {
      var next = state.tabs[Math.min(idx, state.tabs.length - 1)];
      if (next) {
        setActive(next.id);
      } else {
        state.activeId = null;
        showEmptyIfNeeded();
      }
    } else {
      renderTabs();
    }
    schedulePersist();
  }

  function showEmptyIfNeeded() {
    setAdding(false);
    els.editorContainer.innerHTML = '';
    els.tabbar.hidden = true;
    els.editorSection.hidden = true;
    els.headerActions.hidden = true;
    els.dropzone.hidden = false;
  }

  function restoreTabs() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) {}
    if (!saved || !Array.isArray(saved.tabs) || saved.tabs.length === 0) return;

    state.nextId = saved.nextId || 1;

    saved.tabs.forEach(function (st) {
      var tab = {
        id: state.nextId++,
        kind: st.kind,
        name: st.name,
        dirty: !!st.dirty,
        editor: null,
        pane: null
      };
      var pane = document.createElement('div');
      pane.className = 'tab-pane';
      els.editorContainer.appendChild(pane);
      try {
        if (st.kind === 'json' || st.kind === 'jsonl') {
          tab.editor = createJsonTree(pane, { onChange: markDirty });
          tab.editor.setValue(st.data);
        } else {
          tab.editor = createTableEditor(pane, { onChange: markDirty });
          tab.editor.setData(st.data, st.delimiter);
        }
      } catch (e) {
        pane.remove();
        return; // skip a corrupt entry
      }
      tab.pane = pane;
      state.tabs.push(tab);
    });

    if (state.tabs.length === 0) return;

    var exists = state.tabs.some(function (t) { return t.id === saved.activeId; });
    var target = exists ? saved.activeId : state.tabs[state.tabs.length - 1].id;
    els.editorSection.hidden = false;
    setActive(target);
  }

  // ---------- export ----------

  function serializeCurrent() {
    var t = activeTab();
    if (!t) return '';
    if (t.kind === 'json') return JSON.stringify(t.editor.getValue(), null, 2);
    if (t.kind === 'jsonl') {
      return t.editor.getValue().map(function (v) { return JSON.stringify(v); }).join('\n');
    }
    return serializeDelimited(t.editor.getData(), t.editor.getDelimiter());
  }

  function exportData() {
    var t = activeTab();
    if (!t) return;
    var content = serializeCurrent();
    var ext, mime;
    if (t.kind === 'json') { ext = 'json'; mime = 'application/json'; }
    else if (t.kind === 'jsonl') { ext = 'jsonl'; mime = 'application/jsonl'; }
    else { ext = t.kind; mime = 'text/csv'; content = '\uFEFF' + content; } // BOM for Excel
    var base = (t.name || 'data').replace(/\.[^.]+$/, '');
    download(base + '.edited.' + ext, content, mime);
  }

  function download(filename, content, mime) {
    var blob = new Blob([content], { type: mime + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 100);
  }

  // ---------- file reading ----------

  function readFile(file) {
    if (file.size > MAX_BYTES) {
      alert('File is larger than ~8 MB and may be slow to load. Consider trimming it first.');
    }
    var reader = new FileReader();
    reader.onload = function () { openDocument(String(reader.result), file.name); };
    reader.readAsText(file);
  }

  // ---------- events ----------

  els.browseBtn.addEventListener('click', function (e) { e.stopPropagation(); els.fileInput.click(); });
  els.newCsvBtn.addEventListener('click', function (e) { e.stopPropagation(); openBlank('csv'); });
  els.newJsonBtn.addEventListener('click', function (e) { e.stopPropagation(); openBlank('json'); });
  els.sampleCsvBtn.addEventListener('click', function (e) { e.stopPropagation(); openDocument(SAMPLE_CSV, 'sample.csv'); });
  els.sampleJsonBtn.addEventListener('click', function (e) { e.stopPropagation(); openDocument(SAMPLE_JSON, 'sample.json'); });

  els.newTabBtn.addEventListener('click', function () {
    if (state.adding) {
      setActive(state.activeId);
    } else {
      setAdding(true);
      var t = activeTab();
      if (t) t.pane.hidden = true;
    }
  });

  els.dropzone.addEventListener('click', function (e) {
    if (e.target.closest('button')) return;
    els.fileInput.click();
  });

  els.fileInput.addEventListener('change', function () {
    var file = els.fileInput.files[0];
    if (file) readFile(file);
    els.fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach(function (ev) {
    els.dropzone.addEventListener(ev, function (e) {
      e.preventDefault();
      els.dropzone.classList.add('dragging');
    });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    els.dropzone.addEventListener(ev, function (e) {
      e.preventDefault();
      els.dropzone.classList.remove('dragging');
    });
  });
  els.dropzone.addEventListener('drop', function (e) {
    var file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) readFile(file);
  });

  els.pasteBtn.addEventListener('click', function () {
    els.pasteText.value = '';
    els.pasteDialog.showModal();
    els.pasteText.focus();
  });
  els.pasteOk.addEventListener('click', function (e) {
    e.preventDefault();
    if (els.pasteText.value.trim()) els.pasteDialog.close('ok');
  });
  els.pasteDialog.addEventListener('close', function () {
    if (els.pasteDialog.returnValue === 'ok') {
      var text = els.pasteText.value;
      if (text.trim()) openDocument(text, 'pasted-data');
    }
  });

  els.exportBtn.addEventListener('click', exportData);
  els.copyBtn.addEventListener('click', function () {
    if (!activeTab()) return;
    navigator.clipboard.writeText(serializeCurrent()).catch(function (err) {
      alert('Could not copy: ' + err.message);
    });
  });

  window.addEventListener('beforeunload', persist);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') persist();
  });

  restoreTabs();
})();