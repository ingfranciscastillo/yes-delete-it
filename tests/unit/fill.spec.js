// fill() must make the page's own listeners see the value (button enables),
// including React-style controlled inputs and paste-blocked fields, and must
// never press the page's delete button.
import { test, expect } from '@playwright/test';

const SCRIPTS = ['src/shared/api.js', 'src/shared/patterns.js', 'src/content/detect.js', 'src/content/fill.js'];

async function fillAll(page, name) {
  await page.goto(`/${name}`);
  for (const path of SCRIPTS) await page.addScriptTag({ path });
  return page.evaluate(() => globalThis.__ydi.detect(document).map((r) => globalThis.__ydi.fill(r.input, r.expected)));
}

for (const name of ['name-in-code.html', 'two-inputs.html', 'paste-blocked.html', 'dialog-modal.html', 'spanish.html']) {
  test(`fill: ${name} enables the page's button without clicking it`, async ({ page }) => {
    const ok = await fillAll(page, name);
    expect(ok.length).toBeGreaterThan(0);
    expect(ok.every(Boolean)).toBe(true);
    await expect(page.locator('#del')).toBeEnabled();
    expect(await page.evaluate(() => window.__deleted)).toBe(0);
  });
}

test('fill: React-style controlled input registers the change', async ({ page }) => {
  const ok = await fillAll(page, 'react-controlled.html');
  expect(ok).toEqual([true]);
  expect(await page.evaluate(() => window.__reactState)).toBe('api-gateway');
});

test('fill: fallback path also beats the React value tracker', async ({ page }) => {
  await page.goto('/react-controlled.html');
  for (const path of SCRIPTS) await page.addScriptTag({ path });
  const ok = await page.evaluate(() => {
    document.execCommand = () => false; // force the fallback
    const [r] = globalThis.__ydi.detect(document);
    return globalThis.__ydi.fill(r.input, r.expected);
  });
  expect(ok).toBe(true);
  expect(await page.evaluate(() => window.__reactState)).toBe('api-gateway');
});

test('fill: replaces whatever was already typed', async ({ page }) => {
  await page.goto('/name-in-code.html');
  await page.fill('input', 'acme/landing-20');
  for (const path of SCRIPTS) await page.addScriptTag({ path });
  await page.evaluate(() => {
    const [r] = globalThis.__ydi.detect(document);
    globalThis.__ydi.fill(r.input, r.expected);
  });
  await expect(page.locator('input')).toHaveValue('acme/landing-2024');
});
