# js-editor-jsoncsv

A tiny, dependency-free, browser-based editor for **CSV / TSV / JSON / JSONL** files.
Drag a file in, edit it in a table or tree view, and export it back out. Everything runs
locally in your browser — no server, no uploads, no build step.

## Features

- **Drag & drop** a file (or click to browse / paste text)
- **CSV / TSV** → spreadsheet-style table editor
  - Edit any cell, add / delete rows and columns
  - Reorder rows by dragging the `⋮` grip or with the `↑`/`↓` buttons
  - Choose the export delimiter (comma, tab, semicolon, pipe)
- **JSON / JSONL** → collapsible tree editor
  - Edit string / number / boolean values, toggle types, rename object keys
  - Add / delete keys, items, and nested objects/arrays
  - Reorder siblings by dragging the `⋮` grip or with the `↑`/`↓` buttons
- **Multiple tabs** — keep several documents open at once (with a colored format dot)
- **Dirty tracking** — edited tabs show a `•`; closing one prompts for confirmation
- **Dark mode** — follows your OS preference, toggleable, persisted
- **Autosave** — open files survive a page refresh (stored in `localStorage`)
- **Export** — Download or Copy back to CSV (with UTF‑8 BOM for Excel), JSON, or JSONL

## Usage

Just open `index.html` in any modern browser. No installation or bundler required.

1. Drop a `.csv`, `.tsv`, `.json`, or `.jsonl` file onto the page (or use one of the
   *Sample* / *Blank* buttons to try it out).
2. Edit the data.
3. Click **Download** to save the file, or **Copy** to copy the text.

## Controls

| Area | Action |
|------|--------|
| Dropzone / toolbar | Drag a file, browse, paste, or start a blank/sample document |
| Table row index | `⋮` drag handle, `↑`/`↓` move, `✕` delete |
| Tree node | `⋮` drag handle, `↑`/`↓` move, `+` add, `✕` delete, `▸`/`▾` expand |
| Header | Theme toggle (Dark/Light) + Download/Copy for the active tab |
| Tab bar | Switch documents, close tabs, or click **+ New** to add another |
| New | Hides the current document and shows the import panel |

## Project layout

```
index.html        markup + script includes
css/style.css      all styling (light/dark via CSS variables)
js/csv.js          delimiter parsing & serialization
js/table-editor.js spreadsheet editor for CSV/TSV
js/json-tree.js    tree editor for JSON/JSONL
js/theme.js        dark/light theme handling
js/app.js          tabs, import/export, autosave, drag & drop glue
```

## Notes

- Large files (> ~8 MB) may be slow to load and won't be autosaved (localStorage limits).
- Autosaved data is browser-local; it is not synced across devices.
- Opened via `file://` it works in most browsers, but storage behavior can vary per browser.

## Embedding on your own page (CDN-style)

You can drop the editor into any existing page by linking the hosted CSS/JS and copying
in the required markup. The scripts rely on a few specific element IDs, so the markup
below must be present (this is the same markup as `index.html`).

```html
<!-- 1. Stylesheet -->
<link rel="stylesheet" href="https://kriss.li/assets/js-editor-jsoncsv/css/style.css">

<!-- 2. Required markup (place anywhere in <body>) -->
<header class="app-header">
  <h1>JSON &middot; CSV Editor</h1>
  <div class="header-right">
    <button id="themeBtn" class="btn small ghost">Dark mode</button>
    <div class="header-actions" id="headerActions" hidden>
      <span class="file-badge" id="fileBadge"></span>
      <button id="exportBtn" class="btn primary">Download</button>
      <button id="copyBtn" class="btn">Copy</button>
    </div>
  </div>
</header>

<main>
  <section id="tabbar" class="tabbar" hidden>
    <div id="tabs" class="tabs"></div>
    <button id="newTabBtn" class="btn small ghost">+ New</button>
  </section>

  <section id="dropzone" class="dropzone" title="Drop a file here">
    <input type="file" id="fileInput" accept=".csv,.tsv,.json,.jsonl,.txt" hidden>
    <div class="dropzone-inner">
      <div class="drop-icon">&#8681;</div>
      <p><strong>Drag &amp; drop</strong> a CSV, TSV, JSON or JSONL file here</p>
      <p class="muted">or click to browse, or paste the text</p>
      <div class="empty-actions">
        <button class="btn" id="browseBtn">Choose file&hellip;</button>
        <button class="btn" id="pasteBtn">Paste text&hellip;</button>
        <button class="btn ghost" id="newCsvBtn">Blank CSV</button>
        <button class="btn ghost" id="newJsonBtn">Blank JSON</button>
        <button class="btn ghost" id="sampleCsvBtn">Sample CSV</button>
        <button class="btn ghost" id="sampleJsonBtn">Sample JSON</button>
      </div>
    </div>
  </section>

  <section id="editorSection" hidden>
    <div id="editorContainer"></div>
  </section>
</main>

<dialog id="pasteDialog">
  <form method="dialog">
    <h2>Paste data</h2>
    <textarea id="pasteText" rows="12" spellcheck="false" placeholder="Paste CSV, TSV, JSON or JSONL here&hellip;"></textarea>
    <div class="dialog-actions">
      <button value="cancel" class="btn">Cancel</button>
      <button id="pasteOk" class="btn primary">Load</button>
    </div>
  </form>
</dialog>

<!-- 3. Scripts (load after the markup) -->
<script src="https://kriss.li/assets/js-editor-jsoncsv/js/csv.js"></script>
<script src="https://kriss.li/assets/js-editor-jsoncsv/js/table-editor.js"></script>
<script src="https://kriss.li/assets/js-editor-jsoncsv/js/json-tree.js"></script>
<script src="https://kriss.li/assets/js-editor-jsoncsv/js/theme.js"></script>
<script src="https://kriss.li/assets/js-editor-jsoncsv/js/app.js"></script>
```

Notes:
- The order of the `js/*.js` scripts matters — `app.js` must come **last**.
- Load the scripts at the end of `<body>` (or add `defer`) so the markup exists first.
- To pre-apply the saved theme before paint, you can also include the small inline
  theme snippet from `index.html` in your `<head>` (optional).
- Cross-origin loading works as long as your host serves these files without blocking
  hotlinking. Editing happens in memory; nothing is uploaded anywhere.

## License

MIT — free to use, modify, and distribute.
