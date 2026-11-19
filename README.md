<div align="center">

<img src="assets/icons/icon-128.png" alt="" width="96">

# Yes, Delete It

_Fill “type the name to confirm” fields in one click. You still press delete._

[![Manifest V3](https://img.shields.io/badge/manifest-v3-2A55E0?style=flat-square)](manifest.json)
[![Chrome 121+](https://img.shields.io/badge/chrome-121%2B-2A55E0?style=flat-square)](#installation)
[![Firefox 140+](https://img.shields.io/badge/firefox-140%2B-2A55E0?style=flat-square)](#installation)
[![No data collected](https://img.shields.io/badge/data_collected-none-1B2230?style=flat-square)](PRIVACY.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-1B2230?style=flat-square)](LICENSE)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Privacy](#privacy-and-security) • [Development](#development)

</div>

GitHub, Vercel, Netlify, Supabase, Cloudflare and most dashboards make you type the project name, or a phrase like `delete my project`, before deleting anything. The pause is useful. Copying a 40-character identifier by hand, or retyping it because the site blocks pasting, is not.

Yes, Delete It finds the confirmation field and shows the exact text it expects on a small key under it. Click the key and the text is typed in. The decision, and the delete button, stay yours.

## Features

- **Shows before it types.** The key displays the exact text, and nothing is typed until you click it.
- **Never deletes anything.** It doesn't click, submit or press Enter on the page.
- **Conservative detection.** If a page offers two possible values, it offers nothing.
- **Works where pasting doesn't.** Typing goes through `insertText`, so paste-blocked fields, React/Vue/Svelte controlled inputs and native `<dialog>` modals all work.
- **Several fields at once.** A dialog that asks for the name *and* a fixed phrase gets one key per field.
- **Six languages.** Confirmation phrases are detected in English, Spanish, Portuguese, French, German and Italian.
- **Minimal permissions.** It uses `activeTab`, `scripting` and `storage`, with no host permissions and no install warning about reading your data on all sites.
- **Nothing leaves your browser.** No network requests, analytics or accounts.

## Installation

> [!NOTE]
> Store listings for the Chrome Web Store and Firefox Add-ons are on the way. Until then, load it from source.

Build it once (requires Node 22+ and [pnpm](https://pnpm.io)):

```bash
pnpm install
pnpm run build
```

**Chrome, Edge, Brave:** open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick `dist/chrome`.

**Firefox:** run `pnpm run start:firefox`, or open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on…** and pick `dist/firefox/manifest.json`.

## Usage

1. Open the confirmation dialog on any site (“Delete project”, “Delete repository”…).
2. Click the toolbar button or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd>.
3. A key appears under each confirmation field: **Type `acme/landing-2024`** · **Copy** · **✕**.
4. Click **Type**. The key turns blue and reads *Typed. Check it before deleting.*
5. Press the page's delete button yourself.

Press <kbd>Esc</kbd> or ✕ to dismiss the keys. If there's nothing to fill, a short message says so. If the dialog is still opening when you press the shortcut, the extension keeps looking for 10 seconds and then stops.

> [!TIP]
> The extension only reads a page when you invoke it. This is deliberate: it is what lets it run without permission to read every site you visit.

### Settings

Right-click the toolbar button and choose **Options**.

| Setting | Default | What it does |
|---|---|---|
| When you open the extension | Show the key | Or type into the field straight away, without the extra click |
| Show the Copy button | On | Copies the text so you can paste it yourself |
| Keyboard shortcut | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> | Shown as keycaps, with a button to your browser's shortcut settings |

## Privacy and security

- **Reads on demand.** The current page is read only after you click the button or press the shortcut.
- **Keeps nothing.** The detected text lives in that tab's memory while the key is visible. It is never stored or sent.
- **Isolated UI.** The key lives in a closed shadow root. The page can't read it, restyle it or click it for you, because only trusted clicks count.
- **Skips sensitive fields.** Password, card and one-time-code fields are never touched.
- **Readable code.** It's plain JavaScript with no build step, no minification, no runtime dependencies and no remote code. ESLint rules forbid `innerHTML`, `eval` and every network API in `src/`.

Full policy: [PRIVACY.md](PRIVACY.md).

## Development

| Command | What it does |
|---|---|
| `pnpm run build` | Builds `dist/chrome`, `dist/firefox` and a test-only `dist/test` from the single `manifest.json` |
| `pnpm test` | Runs Playwright: detection and typing on synthetic fixtures, plus the real extension in Chromium |
| `pnpm run lint` | Runs ESLint security rules and `web-ext lint` on the Firefox build |
| `pnpm run start:firefox` | Opens Firefox with the extension loaded |
| `pnpm run icons` | Renders `assets-src/*.svg` to the PNG sizes the browsers need |
| `pnpm run package` | Creates store ZIPs and a source archive in `web-ext-artifacts/` |

> [!IMPORTANT]
> Before the first `pnpm test`, download the test browser with `pnpm exec playwright install chromium`.

```
manifest.json           one manifest; scripts/build.js derives the per-browser ones
src/background.js       injects the content scripts on click or shortcut, nothing else
src/content/detect.js   finds confirmation fields and the exact expected text
src/content/fill.js     types the value the way a person would
src/content/ui.js       the key, in a closed shadow root
src/content/main.js     entry point; re-detects for 10 s for late modals, then stops
src/options/            settings page
tests/fixtures/         synthetic dialogs (no real brands or markup)
```

The design rationale and roadmap are in [BRIEF.md](BRIEF.md) and [PLAN.md](PLAN.md), both in Spanish.
