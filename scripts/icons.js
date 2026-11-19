// Renders the hand-drawn SVG icons to the PNG sizes browsers need
// (Chrome doesn't accept SVG in the manifest). Dev-only; uses Playwright.
import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';

const jobs = [
  ['assets-src/icon-small.svg', [16, 32]],
  ['assets-src/icon.svg', [48, 128]],
];

await mkdir('assets/icons', { recursive: true });
const browser = await chromium.launch();
for (const [src, sizes] of jobs) {
  const svg = await readFile(src, 'utf8');
  for (const size of sizes) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
    );
    await page.screenshot({ path: `assets/icons/icon-${size}.png`, omitBackground: true });
    await page.close();
    console.log(`assets/icons/icon-${size}.png`);
  }
}
await browser.close();
