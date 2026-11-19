// Builds store-ready ZIPs in web-ext-artifacts/:
//   yes-delete-it-chrome-<v>.zip   → Chrome Web Store
//   yes-delete-it-firefox-<v>.zip  → addons.mozilla.org
//   yes-delete-it-source-<v>.zip   → source for AMO review (git HEAD)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });
const { version } = JSON.parse(readFileSync('manifest.json', 'utf8'));
const out = 'web-ext-artifacts';
mkdirSync(out, { recursive: true });

run('node', ['scripts/build.js']);
for (const target of ['chrome', 'firefox']) {
  run('pnpm', ['exec', 'web-ext', 'build', '--source-dir', `dist/${target}`, '--artifacts-dir', out,
    '--filename', `yes-delete-it-${target}-${version}.zip`, '--overwrite-dest']);
}
run('git', ['archive', '--format=zip', `--output=${out}/yes-delete-it-source-${version}.zip`, 'HEAD']);
console.log(`\nZIPs for ${version} are in ${out}/`);
