# Store listings

Text to paste into the Chrome Web Store dashboard and addons.mozilla.org (AMO).
Fields marked **TODO** need your input before publishing.

---

## Shared

| Field | Value |
|---|---|
| Name | Yes, Delete It |
| Version | `0.1.0` (bump `manifest.json` to `1.0.0` for the first public release) |
| Category | Chrome: **Developer Tools** · AMO: **Web Development** |
| Homepage | https://github.com/ingfranciscastillo/yes-delete-it |
| Support URL | https://github.com/ingfranciscastillo/yes-delete-it/issues |
| Privacy policy URL | https://github.com/ingfranciscastillo/yes-delete-it/blob/main/PRIVACY.md |
| Support email | **TODO** — optional on AMO; use an alias, not your personal address |
| License | MIT |

### Summary (≤ 132 characters)

**en:** Fills “type the name to confirm” fields in one click. You still press delete. No data, no network.
**es:** Rellena con un clic los campos de «escribe el nombre para confirmar». Tú sigues pulsando borrar. Sin datos, sin red.

### Description — English

Dashboards like GitHub, Vercel, Netlify, Supabase or Cloudflare ask you to type the project name, or a phrase like "delete my project", before deleting anything. Yes, Delete It does the typing part, never the deciding part.

How it works
• Open the confirmation dialog.
• Click the toolbar button or press Alt+Shift+D.
• A small key appears under each confirmation field, showing the exact text it expects.
• Click it and the text is typed in. You press the page's delete button yourself.

What it never does
• It never clicks, submits or presses Enter on the page.
• It never types anything you haven't seen first. If a page is ambiguous, it offers nothing.
• It never touches password, card or one-time-code fields.

Works with paste-blocked fields, React/Vue/Svelte inputs, native dialogs and dialogs with two fields (name + phrase). Detects confirmation phrases in English, Spanish, Portuguese, French, German and Italian.

Privacy
It reads the current page only when you invoke it. No host permissions, no network requests, no analytics, no accounts. Nothing leaves your browser. The code is plain, unminified JavaScript you can read in a few minutes.

### Descripción — Español

Paneles como GitHub, Vercel, Netlify, Supabase o Cloudflare te piden escribir el nombre del proyecto, o una frase como "delete my project", antes de borrar algo. Yes, Delete It hace la parte de teclear, nunca la de decidir.

Cómo funciona
• Abre el diálogo de confirmación.
• Pulsa el botón de la extensión o Alt+Shift+D.
• Aparece una tecla pequeña bajo cada campo de confirmación con el texto exacto que espera.
• Haz clic y el texto se escribe. El botón de borrar de la página lo pulsas tú.

Lo que nunca hace
• Nunca pulsa, envía ni presiona Enter en la página.
• Nunca escribe nada que no hayas visto antes. Si la página es ambigua, no ofrece nada.
• Nunca toca campos de contraseña, tarjeta ni códigos de un solo uso.

Funciona con campos que bloquean el pegado, inputs de React/Vue/Svelte, diálogos nativos y diálogos con dos campos (nombre + frase). Detecta frases de confirmación en inglés, español, portugués, francés, alemán e italiano.

Privacidad
Solo lee la página actual cuando la invocas. Sin permisos de host, sin peticiones de red, sin analítica, sin cuentas. Nada sale de tu navegador. El código es JavaScript legible y sin minificar.

---

## Chrome Web Store — Privacy practices tab

**Single purpose**
> Helps the user fill a "type the name to confirm" field on the active page when the user asks for it, by detecting the expected text and typing it on click.

**Permission justifications**

| Permission | Justification |
|---|---|
| `activeTab` | Read the active tab only after the user clicks the toolbar button or presses the keyboard shortcut, to find the confirmation field on that page. |
| `scripting` | Inject the detector and the on-page key into that tab, in response to the same user action. |
| `storage` | Save two user preferences: whether to show the key or type directly, and whether to show the Copy button. |

**Are you using remote code?** No. All JavaScript is included in the package.

**Data usage:** tick none of the data types. Certify all three statements (not sold to third parties, not used for unrelated purposes, not used for creditworthiness or lending).

**Developer account:** a one-time USD 5 registration fee, and 2-Step Verification must be on.

---

## AMO — Notes to reviewer

> Plain JavaScript, no bundler, no minification, no third-party runtime code. The uploaded
> package is `dist/firefox` produced by `node scripts/build.js`, which only copies `src/`,
> `_locales/`, `assets/` and `LICENSE`, and removes Chrome-only keys from `manifest.json`
> (`service_worker`, `minimum_chrome_version`). The source archive is a `git archive` of the
> same commit.
>
> How to test: open any "type X to confirm" dialog (or the synthetic pages in
> `tests/fixtures/` served with `node tests/serve.js` at http://127.0.0.1:4173/), click the
> toolbar button, then click the key under the field.
>
> `data_collection_permissions.required` is `["none"]`: the extension makes no network
> requests at all.

**Source code upload:** not strictly required (nothing is minified or transpiled), but
upload `web-ext-artifacts/yes-delete-it-source-<version>.zip` anyway to speed up review.

---

## Assets

| Asset | Size | File |
|---|---|---|
| Icon | 128×128 | `assets/icons/icon-128.png` |
| Screenshots | 1280×800 | `store/en/screenshot-1..3.png`, `store/es/screenshot-1..3.png` |
| Small promo tile (Chrome) | 440×280 | `store/en/promo-440x280.png`, `store/es/promo-440x280.png` |

Regenerate them with `pnpm run store-assets`: it runs the real extension on the synthetic
scenes in `store/scenes/` (a fictional "Acme Cloud" dashboard, no real brands).
