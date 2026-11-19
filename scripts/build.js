// Builds clean per-browser folders from the single source manifest.
//   dist/chrome   – no browser_specific_settings, no background.scripts
//   dist/firefox  – no service_worker, no minimum_chrome_version
//   dist/test     – chrome + host access to 127.0.0.1 so E2E tests can inject
//                   without a real click (never shipped)
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const SHIP = ['src', '_locales', 'assets', 'LICENSE'];
const base = JSON.parse(await readFile('manifest.json', 'utf8'));

const variants = {
  chrome(m) {
    delete m.browser_specific_settings;
    m.background = { service_worker: m.background.service_worker };
    return m;
  },
  firefox(m) {
    delete m.minimum_chrome_version;
    m.background = { scripts: m.background.scripts };
    return m;
  },
  test(m) {
    m = variants.chrome(m);
    m.host_permissions = ['http://127.0.0.1/*'];
    return m;
  },
};

await rm('dist', { recursive: true, force: true });
for (const [name, transform] of Object.entries(variants)) {
  const out = `dist/${name}`;
  await mkdir(out, { recursive: true });
  for (const entry of SHIP) {
    await cp(entry, `${out}/${entry}`, { recursive: true }).catch((e) => {
      if (e.code !== 'ENOENT') throw e;
    });
  }
  const manifest = transform(structuredClone(base));
  await writeFile(`${out}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`built ${out}`);
}
