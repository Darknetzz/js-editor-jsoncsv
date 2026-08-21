/* CSV / TSV / delimited text parsing and serialization. */

'use strict';

function countChar(text, c) {
  var n = 0, i = 0;
  while ((i = text.indexOf(c, i)) !== -1) { n++; i += c.length; }
  return n;
}

function detectDelimiter(text) {
  var firstLine = (text.split('\n')[0] || '');
  var best = ',', bestCount = -1;
  var delims = [',', '\t', ';', '|'];
  for (var i = 0; i < delims.length; i++) {
    var c = countChar(firstLine, delims[i]);
    if (c > bestCount) { bestCount = c; best = delims[i]; }
  }
  return bestCount > 0 ? best : ',';
}

function parseDelimited(text, delimiter) {
  text = String(text).replace(/\r\n?/g, '\n');
  if (text.trim() === '') return [['']];

  var rows = [], row = [], field = '', inQuotes = false;

  for (var i = 0; i < text.length; i++) {
    var ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field); field = '';
    } else if (ch === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else {
      field += ch;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field); rows.push(row);
  }

  // Drop a trailing empty row caused by a final newline.
  if (rows.length > 1) {
    var last = rows[rows.length - 1];
    if (last.length === 1 && last[0] === '') rows.pop();
  }

  return rows;
}

function serializeDelimited(rows, delimiter) {
  return rows.map(function (row) {
    return row.map(function (field) {
      var s = String(field == null ? '' : field);
      if (s.indexOf(delimiter) !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1 || s.indexOf('\r') !== -1) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(delimiter);
  }).join('\r\n');
}