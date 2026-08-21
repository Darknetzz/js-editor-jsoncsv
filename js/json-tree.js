/* Collapsible tree editor for JSON values. */

'use strict';

function createJsonTree(container, opts) {
  opts = opts || {};
  var state = {
    root: null,
    expanded: new Set(),
    drag: null
  };

  function notify() { if (opts.onChange) opts.onChange(); }

  container.innerHTML =
    '<div class="editor-toolbar">' +
      '<span class="toolbar-title">Tree</span>' +
      '<span class="muted" data-rootinfo></span>' +
    '</div>' +
    '<div class="tree-root" data-tree></div>';

  var treeEl = container.querySelector('[data-tree]');
  var rootInfoEl = container.querySelector('[data-rootinfo]');

  function isContainer(v) { return v !== null && typeof v === 'object'; }

  function setValue(v) {
    state.root = v;
    state.expanded.clear();
    if (isContainer(state.root)) state.expanded.add(pathKey([]));
    render();
  }

  function getValue() { return state.root; }

  function pathKey(path) { return JSON.stringify(path); }

  function describe(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return '[ ' + v.length + ' ' + (v.length === 1 ? 'item' : 'items') + ' ]';
    var t = typeof v;
    if (t === 'object') {
      var n = Object.keys(v).length;
      return '{ ' + n + ' ' + (n === 1 ? 'key' : 'keys') + ' }';
    }
    if (t === 'string') return '"' + v + '"';
    return String(v);
  }

  function render() {
    treeEl.innerHTML = '';
    if (state.root === undefined) { rootInfoEl.textContent = ''; return; }
    rootInfoEl.textContent = describe(state.root);
    var ul = document.createElement('ul');
    ul.className = 'tree';
    treeEl.appendChild(ul);
    renderNode(ul, state.root, []);
  }

  function getByPath(path) {
    var v = state.root;
    for (var i = 0; i < path.length; i++) v = v[path[i]];
    return v;
  }

  function setByPath(path, newValue) {
    if (path.length === 0) { state.root = newValue; return; }
    var parent = getByPath(path.slice(0, -1));
    parent[path[path.length - 1]] = newValue;
    notify();
  }

  function renderNode(ul, value, path) {
    var li = document.createElement('li');
    var row = document.createElement('div');
    row.className = 'node-row';

    var isRoot = path.length === 0;
    var container = isContainer(value);
    var pkey = pathKey(path);
    var open = state.expanded.has(pkey);

    // Drag handle + drop targets (not for root).
    if (!isRoot) {
      var grip = document.createElement('span');
      grip.className = 'grip';
      grip.textContent = '\u22ee';
      grip.title = 'Drag to reorder';
      grip.draggable = true;
      grip.addEventListener('dragstart', function (e) {
        state.drag = { path: path.slice() };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
        row.classList.add('dragging');
      });
      grip.addEventListener('dragend', function () {
        state.drag = null;
        row.classList.remove('dragging');
        clearDragOver();
      });
      row.appendChild(grip);
    }

    row.addEventListener('dragover', function (e) {
      if (!state.drag || path.length === 0) return;
      if (getByPath(state.drag.path.slice(0, -1)) !== getByPath(path.slice(0, -1))) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', function () { row.classList.remove('drag-over'); });
    row.addEventListener('drop', function (e) {
      e.preventDefault();
      row.classList.remove('drag-over');
      if (!state.drag) return;
      moveNode(state.drag.path, path);
      state.drag = null;
    });

    // Expand/collapse toggle.
    var toggle = document.createElement('button');
    toggle.className = 'icon-btn toggle';
    if (container) {
      toggle.textContent = open ? '\u25be' : '\u25b8';
      toggle.addEventListener('click', function () {
        if (open) state.expanded.delete(pkey); else state.expanded.add(pkey);
        render();
      });
    } else {
      toggle.classList.add('invisible');
    }
    row.appendChild(toggle);

    // Key (editable for object members, index badge for array items).
    if (!isRoot) {
      row.appendChild(makeKeyWidget(path));
      var colon = document.createElement('span');
      colon.className = 'colon';
      colon.textContent = ':';
      row.appendChild(colon);
    }

    // Type control (select for scalars, badge for containers).
    row.appendChild(makeTypeControl(value, path));

    // Value widget.
    if (container) {
      var summary = document.createElement('span');
      summary.className = 'muted preview';
      summary.textContent = describe(value);
      row.appendChild(summary);
    } else {
      row.appendChild(makeValueWidget(value, path));
    }

    // Add child for containers, then move up/down and delete.
    if (container) {
      row.appendChild(iconBtn('+', Array.isArray(value) ? 'Add item' : 'Add key', 'add', function () { addChild(path); }));
    }
    if (!isRoot) {
      row.appendChild(iconBtn('\u2191', 'Move up', '', function () { moveNodeDir(path, -1); }));
      row.appendChild(iconBtn('\u2193', 'Move down', '', function () { moveNodeDir(path, 1); }));
      row.appendChild(iconBtn('\u2715', 'Delete', 'danger', function () { deleteNode(path); }));
    }

    li.appendChild(row);

    if (container && open) {
      var childUl = document.createElement('ul');
      childUl.className = 'tree';
      var parent = getByPath(path);
      if (Array.isArray(parent)) {
        for (var i = 0; i < parent.length; i++) renderNode(childUl, parent[i], path.concat(i));
      } else {
        Object.keys(parent).forEach(function (k) {
          renderNode(childUl, parent[k], path.concat(k));
        });
      }
      li.appendChild(childUl);
    }

    ul.appendChild(li);
  }

  function makeKeyWidget(path) {
    var parent = getByPath(path.slice(0, -1));
    var key = path[path.length - 1];

    if (Array.isArray(parent)) {
      var idx = document.createElement('span');
      idx.className = 'array-index';
      idx.textContent = String(key);
      return idx;
    }

    var input = document.createElement('input');
    input.className = 'key-input';
    input.type = 'text';
    input.value = key;
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') input.blur(); });
    input.addEventListener('change', function () {
      var newKey = input.value.trim();
      if (!newKey || newKey === key) { input.value = key; return; }
      if (Object.prototype.hasOwnProperty.call(parent, newKey)) { input.value = key; return; }

      var obj = {};
      Object.keys(parent).forEach(function (k) {
        obj[k === key ? newKey : k] = parent[k];
      });

      var gpPath = path.slice(0, -1);
      if (gpPath.length === 0) {
        state.root = obj;
      } else {
        var gpKey = gpPath[gpPath.length - 1];
        var ggp = getByPath(gpPath.slice(0, -1));
        ggp[gpKey] = obj;
      }
      render();
      notify();
    });
    return input;
  }

  function makeTypeControl(value, path) {
    if (isContainer(value)) {
      var badge = document.createElement('span');
      badge.className = 'type-badge type-' + (Array.isArray(value) ? 'array' : 'object');
      badge.textContent = Array.isArray(value) ? 'array' : 'object';
      return badge;
    }

    var sel = document.createElement('select');
    sel.className = 'type-select';
    var t = value === null ? 'null' : typeof value;
    ['string', 'number', 'boolean', 'null'].forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o;
      opt.textContent = o;
      if (o === t) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', function () {
      var nt = sel.value;
      var nv = nt === 'null' ? null : nt === 'string' ? '' : nt === 'number' ? 0 : false;
      setByPath(path, nv);
      render();
    });
    return sel;
  }

  function makeValueWidget(value, path) {
    var t = value === null ? 'null' : typeof value;

    if (t === 'null') {
      var span = document.createElement('span');
      span.className = 'value-null';
      span.textContent = 'null';
      return span;
    }

    if (t === 'boolean') {
      var label = document.createElement('label');
      label.className = 'boolean-widget';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = value;
      var txt = document.createElement('span');
      txt.textContent = String(value);
      cb.addEventListener('change', function () {
        setByPath(path, cb.checked);
        txt.textContent = String(cb.checked);
      });
      label.appendChild(cb);
      label.appendChild(txt);
      return label;
    }

    if (t === 'number') {
      var input = document.createElement('input');
      input.type = 'number';
      input.step = 'any';
      input.className = 'value-input number-input';
      input.value = String(value);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') input.blur(); });
      input.addEventListener('change', function () {
        var n = input.value === '' ? NaN : Number(input.value);
        if (Number.isNaN(n)) { input.value = String(value); return; }
        setByPath(path, n);
      });
      return input;
    }

    // string
    var input2 = document.createElement('input');
    input2.type = 'text';
    input2.className = 'value-input string-input';
    input2.value = value;
    input2.addEventListener('keydown', function (e) { if (e.key === 'Enter') input2.blur(); });
    input2.addEventListener('input', function () { setByPath(path, input2.value); });
    return input2;
  }

  function addChild(path) {
    var parent = getByPath(path);
    if (Array.isArray(parent)) {
      parent.push(null);
    } else {
      var i = 1;
      while (Object.prototype.hasOwnProperty.call(parent, 'key' + i)) i++;
      parent['key' + i] = null;
    }
    state.expanded.add(pathKey(path));
    notify();
    render();
  }

  function deleteNode(path) {
    var parent = getByPath(path.slice(0, -1));
    var key = path[path.length - 1];
    if (Array.isArray(parent)) parent.splice(key, 1);
    else delete parent[key];
    notify();
    render();
  }

  function iconBtn(text, title, cls, onClick) {
    var b = document.createElement('button');
    b.className = 'icon-btn mini' + (cls ? ' ' + cls : '');
    b.textContent = text;
    b.title = title;
    b.addEventListener('click', onClick);
    return b;
  }

  function clearDragOver() {
    var rows = treeEl.querySelectorAll('.node-row');
    for (var i = 0; i < rows.length; i++) rows[i].classList.remove('drag-over', 'dragging');
  }

  function positionOf(parent, k) {
    if (Array.isArray(parent)) return k;
    return Object.keys(parent).indexOf(k);
  }

  function replaceParent(parentPath, obj) {
    if (parentPath.length === 0) { state.root = obj; return; }
    var gpKey = parentPath[parentPath.length - 1];
    var ggp = getByPath(parentPath.slice(0, -1));
    ggp[gpKey] = obj;
  }

  function moveSibling(parent, from, to, parentPath) {
    if (Array.isArray(parent)) {
      if (from < to) to--;
      var item = parent.splice(from, 1)[0];
      parent.splice(to, 0, item);
    } else {
      var keys = Object.keys(parent);
      if (from < to) to--;
      var key = keys.splice(from, 1)[0];
      keys.splice(to, 0, key);
      var obj = {};
      keys.forEach(function (k) { obj[k] = parent[k]; });
      replaceParent(parentPath, obj);
    }
  }

  function swapSibling(parent, a, b, parentPath) {
    if (Array.isArray(parent)) {
      var tmp = parent[a];
      parent[a] = parent[b];
      parent[b] = tmp;
    } else {
      var keys = Object.keys(parent);
      var ka = keys[a], kb = keys[b];
      var obj = {};
      keys.forEach(function (k) {
        if (k === ka) obj[kb] = parent[k];
        else if (k === kb) obj[ka] = parent[k];
        else obj[k] = parent[k];
      });
      replaceParent(parentPath, obj);
    }
  }

  function moveNode(dragPath, targetPath) {
    if (dragPath.length === 0 || targetPath.length === 0) return;
    var dp = dragPath.slice(0, -1), tp = targetPath.slice(0, -1);
    var dParent = getByPath(dp), tParent = getByPath(tp);
    if (dParent !== tParent) return;
    var from = positionOf(dParent, dragPath[dragPath.length - 1]);
    var to = positionOf(tParent, targetPath[targetPath.length - 1]);
    if (from === to) return;
    moveSibling(dParent, from, to, dp);
    notify();
    render();
  }

  function moveNodeDir(path, dir) {
    if (path.length === 0) return;
    var parent = getByPath(path.slice(0, -1));
    var from = positionOf(parent, path[path.length - 1]);
    var to = from + dir;
    var len = Array.isArray(parent) ? parent.length : Object.keys(parent).length;
    if (to < 0 || to >= len) return;
    swapSibling(parent, from, to, path.slice(0, -1));
    notify();
    render();
  }

  return { setValue: setValue, getValue: getValue };
}

window.createJsonTree = createJsonTree;