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

## License

MIT — free to use, modify, and distribute.
