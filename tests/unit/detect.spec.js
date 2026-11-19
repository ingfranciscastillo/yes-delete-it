// Runs the real content scripts inside fixture pages (Chromium) and checks that
// every input gets exactly the value in its data-expect attribute ("" = none).
import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';

const SCRIPTS = ['src/shared/api.js', 'src/shared/patterns.js', 'src/content/detect.js'];

async function load(page, name, query = '') {
  await page.goto(`/${name}${query}`);
  for (const path of SCRIPTS) await page.addScriptTag({ path });
}

async function detected(page) {
  return page.evaluate(() => {
    const found = new Map(globalThis.__ydi.detect(document).map((r) => [r.input, r.expected]));
    const all = [];
    const collect = (root) => {
      for (const el of root.querySelectorAll('[data-expect]')) all.push(el);
      for (const el of root.querySelectorAll('*')) if (el.shadowRoot) collect(el.shadowRoot);
    };
    collect(document);
    return all.map((el) => ({ want: el.dataset.expect, got: found.get(el) ?? '' }));
  });
}

const fixtures = readdirSync('tests/fixtures').filter((f) => f.endsWith('.html') && f !== 'late-modal.html');

for (const name of fixtures) {
  test(`detect: ${name}`, async ({ page }) => {
    await load(page, name);
    const rows = await detected(page);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row.got).toBe(row.want);
  });
}

test('detect: late modal is found once it appears', async ({ page }) => {
  await load(page, 'late-modal.html', '?delay=100');
  await page.waitForSelector('[data-confirm]');
  const rows = await detected(page);
  expect(rows).toEqual([{ want: 'old-worker', got: 'old-worker' }]);
});

test('internals: literal pattern parsing', async ({ page }) => {
  await load(page, 'caps.html');
  const out = await page.evaluate(() => {
    const { literalPattern } = globalThis.__ydi._internals;
    return ['^acme\\.dev$', 'acme', '[a-z]+', 'a\\d', 'x|y'].map((p) => {
      const i = document.createElement('input');
      i.setAttribute('pattern', p);
      return literalPattern(i);
    });
  });
  expect(out).toEqual(['acme.dev', 'acme', null, null, null]);
});
