// Entry point, injected last, each time the user invokes the extension.
// Detects, mounts one key per field, and keeps looking for 10 seconds in case
// the modal is still opening. Then it stops: no persistent watching.
(async () => {
  const ns = globalThis.__ydi;
  ns.ui.unmountAll();

  const settings = await ns.getSettings();
  const keys = new Map();

  const run = () => {
    for (const r of ns.detect(document)) {
      const prev = keys.get(r.input);
      if (prev?.alive() && prev.expected === r.expected) continue;
      prev?.destroy();
      const key = ns.ui.mountKey(r, settings);
      keys.set(r.input, key);
      if (settings.mode === 'direct') key.type();
    }
    for (const [input, key] of keys) if (!key.alive()) keys.delete(input);
    return keys.size;
  };

  if (run() === 0) ns.ui.toast(ns.t('toastNone'));

  const UI_TAG = 'YES-DELETE-IT-KEY';
  let debounce = 0;
  const observer = new MutationObserver((records) => {
    if (records.every((r) => r.target.nodeName === UI_TAG || [...r.addedNodes, ...r.removedNodes].every((n) => n.nodeName === UI_TAG))) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      if (run() > 0) ns.ui.hideToast();
    }, 150);
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['open', 'hidden', 'style', 'class', 'aria-hidden'],
  });
  const stopAt = setTimeout(() => observer.disconnect(), 10_000);

  ns.stopWatching = () => {
    observer.disconnect();
    clearTimeout(stopAt);
    clearTimeout(debounce);
  };
})();
