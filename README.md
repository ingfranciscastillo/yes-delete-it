# Yes, Delete It

A Chrome and Firefox extension for the "type the name to confirm" step.

GitHub, Vercel, Netlify, Supabase, Cloudflare and most dashboards ask you to type the
project name (or "delete my project") before deleting something. That pause is useful;
copying a 40-character identifier by hand, or retyping it because the site blocks
pasting, isn't.

Press the toolbar button or **Alt+Shift+D** on the confirmation dialog. A small key
appears under each confirmation field showing the exact text it expects. Click it and
the text is typed in. **You still press the page's delete button yourself.**

## What it does and doesn't do

- Reads the page only when you invoke it (`activeTab`). No host permissions, no
  background reading of pages.
- Shows the detected text before typing anything. If the page is ambiguous, it offers
  nothing.
- Never clicks, submits or presses Enter on the page.
- Never touches password, card or one-time-code fields.
- No network, analytics, accounts or remote code. Nothing leaves your browser. See
  [PRIVACY.md](PRIVACY.md).

Works with React/Vue/Svelte-controlled inputs, pages that block paste, native
`<dialog>` modals, open shadow roots and modals that appear a moment later.
Detects confirmation phrases in English, Spanish, Portuguese, French, German and Italian.

## Settings

- **When you open the extension:** show the key (default) or type straight away.
- **Show the Copy button.**
- **Keyboard shortcut:** shown as keycaps, with a link to your browser's shortcut settings.

## Development

Requires Node 22+ and pnpm.

```bash
pnpm install
pnpm exec playwright install chromium   # first time, for tests and icons
pnpm run build                          # dist/chrome and dist/firefox
```

| Command | What it does |
|---|---|
| `pnpm run build` | Builds `dist/chrome`, `dist/firefox` and a test-only `dist/test` from the single `manifest.json` |
| `pnpm test` | Playwright: detection and typing on synthetic fixtures + the real extension in Chromium |
| `pnpm run lint` | ESLint (bans `innerHTML`, `eval`, network APIs in `src/`) + `web-ext lint` on the Firefox build |
| `pnpm run start:firefox` | Opens Firefox with the extension loaded |
| `pnpm run icons` | Renders `assets-src/*.svg` to the PNG sizes |
| `pnpm run package` | Store-ready ZIPs in `web-ext-artifacts/` |
| `pnpm run store-assets` | Store screenshots and promo tile in `store/` |

**Load it unpacked:** Chrome → `chrome://extensions` → Developer mode → *Load unpacked* →
`dist/chrome`. Firefox → `pnpm run start:firefox`, or `about:debugging` → *Load Temporary
Add-on* → `dist/firefox/manifest.json`.

### Layout

```
manifest.json           one manifest; scripts/build.js derives the per-browser ones
src/background.js       injects the content scripts on click/shortcut, nothing else
src/content/detect.js   finds confirmation fields and the exact expected text
src/content/fill.js     types the value like a person would
src/content/ui.js       the key, in a closed shadow root
src/content/main.js     entry point; re-detects for 10 s for late modals, then stops
src/options/            settings page
tests/fixtures/         synthetic pages (no real brands or markup)
```

The code is plain JavaScript with no build step, no minification and no runtime
dependencies, so store reviewers can read exactly what ships.

## Español

Extensión para Chrome y Firefox que rellena con un clic los campos de "escribe el
nombre del proyecto para confirmar". Pulsa el icono o **Alt+Shift+D** en el diálogo,
revisa el texto que muestra la tecla y haz clic. El botón de borrar lo sigues pulsando
tú. No recoge ni envía ningún dato.

## License

[MIT](LICENSE)
