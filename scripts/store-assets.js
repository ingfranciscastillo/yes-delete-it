// Generates store images with the real extension running on synthetic scenes:
//   store/<lang>/screenshot-1.png … -3.png  (1280×800)
//   store/<lang>/promo-440x280.png          (Chrome small promo tile)
// for lang = en, es.
import { chromium } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

execFileSync('node', ['scripts/build.js'], { stdio: 'ignore' });
const PORT = 4174;
const server = spawn('node', ['tests/serve.js'], { env: { ...process.env, ROOT: resolve('.'), PORT: String(PORT) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const base = `http://127.0.0.1:${PORT}`;
const EXT = resolve('dist/test');

/* global chrome, inject -- evaluated inside the extension's service worker */
const PROMO = {
  en: 'Types the “type the name to confirm” text for you. You still press delete.',
  es: 'Escribe por ti el texto de «escribe el nombre para confirmar». El botón de borrar lo pulsas tú.',
};

try {
  for (const lang of ['en', 'es']) {
    const out = `store/${lang}`;
    mkdirSync(out, { recursive: true });
    const ctx = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      viewport: { width: 1280, height: 800 },
      colorScheme: 'light',
      locale: lang === 'es' ? 'es-ES' : 'en-US',
      // On Linux, Chromium picks the UI (and extension) language from LANGUAGE.
      env: { ...process.env, LANGUAGE: lang === 'es' ? 'es_ES' : 'en_US' },
      args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, `--lang=${lang}`],
    });
    const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
    const invoke = () =>
      sw.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        await inject(tab.id);
      });
    const keys = (page) => page.locator('yes-delete-it-key:not([popover])');
    const pressType = async (page, i) => {
      const box = await keys(page).nth(i).boundingBox();
      await page.mouse.click(box.x + 30, box.y + 18);
    };

    // 1. The key, before typing.
    const p1 = await ctx.newPage();
    await p1.goto(`${base}/store/scenes/1-key.html?lang=${lang}`);
    await invoke();
    await keys(p1).first().waitFor();
    await p1.waitForTimeout(1300);
    await p1.mouse.move(0, 0);
    await p1.screenshot({ path: `${out}/screenshot-1.png` });

    // 2. Two fields, both typed; delete button enabled but not pressed.
    const p2 = await ctx.newPage();
    await p2.goto(`${base}/store/scenes/2-typed.html?lang=${lang}`);
    await invoke();
    await keys(p2).nth(1).waitFor();
    await p2.waitForTimeout(1300);
    await pressType(p2, 0);
    await pressType(p2, 1);
    await p2.locator('body').click({ position: { x: 5, y: 5 } }); // drop the input focus ring
    await p2.mouse.move(0, 0);
    await p2.waitForTimeout(200);
    await p2.screenshot({ path: `${out}/screenshot-2.png` });

    // 3. Options page (zoomed for legibility), embedded in the privacy scene.
    const opts = await ctx.newPage();
    await opts.setViewportSize({ width: 820, height: 800 });
    await opts.goto(`chrome-extension://${new URL(sw.url()).host}/src/options/options.html`);
    await opts.evaluate(() => (document.body.style.zoom = '1.5'));
    await opts.waitForTimeout(300);
    const box = await opts.locator('main').boundingBox();
    await opts.screenshot({
      path: `store/scenes/options-${lang}.png`,
      clip: { x: 0, y: 0, width: Math.ceil(box.x + box.width), height: Math.ceil(box.y + box.height - 20) },
    });
    const p3 = await ctx.newPage();
    await p3.goto(`${base}/store/scenes/3-private.html?lang=${lang}`);
    await p3.waitForTimeout(400);
    await p3.screenshot({ path: `${out}/screenshot-3.png` });

    // Promo tile.
    const icon = readFileSync('assets/icons/icon-128.png').toString('base64');
    const promo = await ctx.newPage();
    await promo.setViewportSize({ width: 440, height: 280 });
    await promo.setContent(`<style>
      html,body{margin:0;width:440px;height:280px}
      body{background:#E4E8EF;display:grid;grid-template-columns:auto 1fr;align-items:center;gap:6px;padding:0 34px 0 22px;box-sizing:border-box;
        font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,Ubuntu,Cantarell,sans-serif;color:#1B2230}
      h1{margin:0 0 8px;font-size:30px;line-height:1.1;letter-spacing:-.01em}
      p{margin:0;color:#5B6578;font-size:15px}
    </style><img src="data:image/png;base64,${icon}" width="128" height="128"><div><h1>Yes, Delete It</h1><p>${PROMO[lang]}</p></div>`);
    await promo.screenshot({ path: `${out}/promo-440x280.png` });

    await ctx.close();
    console.log(`${out}/screenshot-1..3.png, ${out}/promo-440x280.png`);
  }
} finally {
  server.kill();
}
