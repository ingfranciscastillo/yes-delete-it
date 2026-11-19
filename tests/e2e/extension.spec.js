// Loads the real extension (dist/test) in Chromium and drives the full flow:
// inject → key appears → real mouse click → field filled → page button enabled
// and never pressed by the extension.
import { test as base, expect, chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

execFileSync('node', ['scripts/build.js'], { stdio: 'ignore' });
const EXT = resolve('dist/test');

const test = base.extend({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
    });
    await use(context);
    await context.close();
  },
  sw: async ({ context }, use) => {
    const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    await use(sw);
  },
});

const invoke = (sw) =>
  sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    await inject(tab.id); // same function the toolbar click and shortcut use
  });

const keys = (page) => page.locator('yes-delete-it-key:not([popover])');

// Clicks the first button of a key (the "Type" button) with a real mouse event.
async function pressType(page, index = 0) {
  const box = await keys(page).nth(index).boundingBox();
  await page.mouse.click(box.x + 24, box.y + 15);
}

test('types the project name on click and never presses delete', async ({ context, sw }) => {
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/name-in-code.html');
  await invoke(sw);
  await expect(keys(page)).toHaveCount(1);
  await expect(page.locator('input')).toHaveValue('');
  await pressType(page);
  await expect(page.locator('input')).toHaveValue('acme/landing-2024');
  await expect(page.locator('#del')).toBeEnabled();
  expect(await page.evaluate(() => window.__deleted)).toBe(0);
});

test('the page cannot reach into the key', async ({ context, sw }) => {
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/name-in-code.html');
  await invoke(sw);
  await expect(keys(page)).toHaveCount(1);
  const shadow = await page.evaluate(() => document.querySelector('yes-delete-it-key').shadowRoot);
  expect(shadow).toBeNull();
  // A synthetic click dispatched by the page does nothing.
  await page.evaluate(() => document.querySelector('yes-delete-it-key').click());
  await expect(page.locator('input')).toHaveValue('');
});

test('two fields get two keys with their own values', async ({ context, sw }) => {
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/two-inputs.html');
  await invoke(sw);
  await expect(keys(page)).toHaveCount(2);
  await pressType(page, 0);
  await pressType(page, 1);
  await expect(page.locator('input').nth(0)).toHaveValue('my-app');
  await expect(page.locator('input').nth(1)).toHaveValue('delete my project');
  await expect(page.locator('#del')).toBeEnabled();
  expect(await page.evaluate(() => window.__deleted)).toBe(0);
});

test('works inside a native modal <dialog>', async ({ context, sw }) => {
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/dialog-modal.html');
  await invoke(sw);
  await expect(keys(page)).toHaveCount(1);
  await pressType(page);
  await expect(page.locator('dialog input')).toHaveValue('staging');
});

test('works with paste blocked and React-style inputs', async ({ context, sw }) => {
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/react-controlled.html');
  await invoke(sw);
  await pressType(page);
  expect(await page.evaluate(() => window.__reactState)).toBe('api-gateway');

  await page.goto('http://127.0.0.1:4173/paste-blocked.html');
  await invoke(sw);
  await pressType(page);
  await expect(page.locator('input')).toHaveValue('billing-service');
});

test('finds a modal that opens after invoking', async ({ context, sw }) => {
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/late-modal.html?delay=800');
  await invoke(sw);
  await expect(keys(page)).toHaveCount(1, { timeout: 5000 });
});

test('shows a toast when there is nothing to fill, and Esc clears keys', async ({ context, sw }) => {
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/unrelated.html');
  await invoke(sw);
  await expect(page.locator('yes-delete-it-key[popover]')).toHaveCount(1);
  await expect(keys(page)).toHaveCount(0);

  await page.goto('http://127.0.0.1:4173/name-in-code.html');
  await invoke(sw);
  await expect(keys(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(keys(page)).toHaveCount(0);
});

test('invoking twice does not duplicate keys', async ({ context, sw }) => {
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/name-in-code.html');
  await invoke(sw);
  await invoke(sw);
  await expect(keys(page)).toHaveCount(1);
});
