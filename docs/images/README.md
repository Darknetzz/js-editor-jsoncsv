# js-editor-jsoncsv artwork

Dark flat-vector branding for README / GitLab avatar / social share.

**Palette:** accent `#34d399` · secondary `#6ee7b7` · canvas `#071611`

## Layouts

### Adb-keeper style (root)

| File | Size |
|------|------|
| `logo-{solid,gradient,transparent}.png` | 512×512 |
| `banner-{solid,gradient,transparent}.png` | 1280×640 |

### Code style

| Path | Contents |
|------|----------|
| `repo/` | Transparent 1×1 / 16×9 (+ label) |
| `bg-solid/repo/` | Solid dark canvas variants |
| `bg-gradient/repo/` | Gradient + glow variants |
| `og/js-editor-jsoncsv.png` | Open Graph 1280×640 |
| `svg-src/` | SVG sources |
| `ai/` | Optional AI atmospheric banner |

## Regenerate

```bash
python batch_generate.py --only js-editor-jsoncsv
```
