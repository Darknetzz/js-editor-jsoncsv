/* Spreadsheet-style table editor for delimited data (CSV/TSV). */

'use strict';

function createTableEditor(container, opts) {
  opts = opts || {};
  var state = {
    data: [],
    delimiter: ','
  };
  var dragIndex = null;

  function onChange() { if (opts.onChange) opts.onChange(); }

  container.innerHTML =
    '<div class="editor-toolbar">' +
      '<span class="toolbar-title">Table</span>' +
      '<span class="delimiter-picker">Delimiter: ' +
        '<select data-delimiter>' +
          '<option value=",">Comma (,)</option>' +
          '<option value="\t">Tab</option>' +
          '<option value=";">Semicolon (;)</option>' +
          '<option value="|">Pipe (|)</option>' +
        '</select>' +
      '</span>' +
      '<span class="muted counts" data-counts></span>' +
    '</div>' +
    '<div class="table-wrap">' +
      '<table class="data-table">' +
        '<thead data-head></thead>' +
        '<tbody data-body></tbody>' +
      '</table>' +
    '</div>';

  var headEl = container.querySelector('[data-head]');
  var bodyEl = container.querySelector('[data-body]');
  var countsEl = container.querySelector('[data-counts]');
  var delimSel = container.querySelector('[data-delimiter]');

  delimSel.addEventListener('change', function () { state.delimiter = delimSel.value; });

  function colCount() { return state.data.length ? state.data[0].length : 0; }
  function rowCount() { return state.data.length ? state.data.length - 1 : 0; }

  function setData(rows, delimiter) {
    state.data = rows.map(function (r) { return r.slice(); });
    if (delimiter) { state.delimiter = delimiter; delimSel.value = delimiter; }
    render();
  }

  function getData() { return state.data.map(function (r) { return r.slice(); }); }
  function getDelimiter() { return state.delimiter; }

  function render() {
    headEl.innerHTML = '';
    bodyEl.innerHTML = '';
    var cols = colCount();

    if (cols === 0) {
      countsEl.textContent = 'empty';
      return;
    }

    countsEl.textContent = rowCount() + ' rows \u00d7 ' + cols + ' cols';

    // Column action row (delete buttons).
    var trAct = document.createElement('tr');
    trAct.className = 'col-actions';
    var thIdx = document.createElement('th');
    thIdx.className = 'row-index';
    trAct.appendChild(thIdx);
    for (var j = 0; j < cols; j++) {
      var th = document.createElement('th');
      var del = document.createElement('button');
      del.className = 'icon-btn danger';
      del.title = 'Delete column';
      del.textContent = '\u2715';
      (function (col) {
        del.addEventListener('click', function () { deleteColumn(col); });
      })(j);
      th.appendChild(del);
      trAct.appendChild(th);
    }

    // Green "+" to add a column at the right edge.
    var thAdd = document.createElement('th');
    thAdd.className = 'add-col-cell';
    var addCol = document.createElement('button');
    addCol.className = 'add-col-btn';
    addCol.textContent = '+';
    addCol.title = 'Add column';
    addCol.addEventListener('click', addColumn);
    thAdd.appendChild(addCol);
    trAct.appendChild(thAdd);
    headEl.appendChild(trAct);

    // Header row (row 0 of data).
    var trHead = document.createElement('tr');
    var thLabel = document.createElement('th');
    thLabel.className = 'row-index';
    thLabel.textContent = '#';
    trHead.appendChild(thLabel);
    for (var h = 0; h < cols; h++) {
      var th2 = document.createElement('th');
      th2.appendChild(makeCellInput(0, h, true));
      trHead.appendChild(th2);
    }
    headEl.appendChild(trHead);
    attachRowTargets(trHead, 1);

    // Body rows.
    for (var r = 1; r < state.data.length; r++) {
      var tr = document.createElement('tr');
      var tdIdx = document.createElement('td');
      tdIdx.className = 'row-index';

      var wrap = document.createElement('div');
      wrap.className = 'row-index-wrap';

      var grip = document.createElement('span');
      grip.className = 'grip';
      grip.textContent = '\u22ee';
      grip.title = 'Drag to reorder';
      grip.draggable = true;

      var num = document.createElement('span');
      num.className = 'row-num';
      num.textContent = String(r);

      var btns = document.createElement('div');
      btns.className = 'row-btns';

      var up = document.createElement('button');
      up.className = 'icon-btn mini';
      up.textContent = '\u2191';
      up.title = 'Move up';
      (function (idx) {
        up.addEventListener('click', function () { moveRow(idx, -1); });
      })(r);

      var down = document.createElement('button');
      down.className = 'icon-btn mini';
      down.textContent = '\u2193';
      down.title = 'Move down';
      (function (idx) {
        down.addEventListener('click', function () { moveRow(idx, 1); });
      })(r);

      var delRow = document.createElement('button');
      delRow.className = 'icon-btn mini danger';
      delRow.textContent = '\u2715';
      delRow.title = 'Delete row';
      (function (idx) {
        delRow.addEventListener('click', function () { deleteRow(idx); });
      })(r);

      btns.appendChild(up);
      btns.appendChild(down);
      btns.appendChild(delRow);

      wrap.appendChild(grip);
      wrap.appendChild(num);
      wrap.appendChild(btns);
      tdIdx.appendChild(wrap);
      tr.appendChild(tdIdx);

      for (var c = 0; c < cols; c++) {
        var td = document.createElement('td');
        td.appendChild(makeCellInput(r, c, false));
        tr.appendChild(td);
      }
      attachRowTargets(tr, r);
      attachDragSource(grip, r, tr);
      bodyEl.appendChild(tr);
    }

    // Green "+ Add row" row below the last row.
    var trAddRow = document.createElement('tr');
    trAddRow.className = 'add-row-cell';
    var tdAddIdx = document.createElement('td');
    tdAddIdx.className = 'row-index';
    var tdAdd = document.createElement('td');
    tdAdd.colSpan = cols;
    var addRowBtn = document.createElement('button');
    addRowBtn.className = 'add-row-btn';
    addRowBtn.textContent = '+ Add row';
    addRowBtn.addEventListener('click', addRow);
    tdAdd.appendChild(addRowBtn);
    trAddRow.appendChild(tdAddIdx);
    trAddRow.appendChild(tdAdd);
    bodyEl.appendChild(trAddRow);
  }

  function attachDragSource(grip, idx, row) {
    grip.addEventListener('dragstart', function (e) {
      dragIndex = idx;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
      row.classList.add('dragging');
    });
    grip.addEventListener('dragend', function () {
      dragIndex = null;
      row.classList.remove('dragging');
      clearDragOver();
    });
  }

  function attachRowTargets(tr, targetIdx) {
    tr.addEventListener('dragover', function (e) {
      if (dragIndex === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      tr.classList.add('drag-over');
    });
    tr.addEventListener('dragleave', function () { tr.classList.remove('drag-over'); });
    tr.addEventListener('drop', function (e) {
      e.preventDefault();
      tr.classList.remove('drag-over');
      if (dragIndex === null || dragIndex === targetIdx) return;
      var from = dragIndex, to = targetIdx;
      if (from < to) to--;
      state.data.splice(to, 0, state.data.splice(from, 1)[0]);
      onChange();
      render();
    });
  }

  function clearDragOver() {
    var rows = bodyEl.querySelectorAll('tr');
    for (var i = 0; i < rows.length; i++) rows[i].classList.remove('drag-over');
  }

  function moveRow(i, dir) {
    var j = i + dir;
    if (j < 1 || j >= state.data.length) return;
    var tmp = state.data[i];
    state.data[i] = state.data[j];
    state.data[j] = tmp;
    onChange();
    render();
  }

  function makeCellInput(i, j, isHeader) {
    var input = document.createElement('input');
    input.type = 'text';
    input.className = isHeader ? 'header-input' : 'cell-input';
    input.value = state.data[i][j] == null ? '' : String(state.data[i][j]);
    input.addEventListener('input', function () {
      state.data[i][j] = input.value;
      onChange();
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') input.blur();
    });
    return input;
  }

  function addRow() {
    state.data.push(new Array(colCount()).fill(''));
    onChange();
    render();
  }

  function addColumn() {
    var cols = colCount();
    if (state.data.length === 0) state.data.push(['']);
    for (var i = 0; i < state.data.length; i++) state.data[i][cols] = '';
    onChange();
    render();
  }

  function deleteColumn(j) {
    if (colCount() <= 1) {
      state.data = state.data.map(function () { return ['']; });
    } else {
      for (var i = 0; i < state.data.length; i++) state.data[i].splice(j, 1);
    }
    onChange();
    render();
  }

  function deleteRow(i) {
    state.data.splice(i, 1);
    onChange();
    render();
  }

  return { setData: setData, getData: getData, getDelimiter: getDelimiter };
}

window.createTableEditor = createTableEditor;