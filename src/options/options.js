// Options: two preferences in storage.sync, plus the current shortcut.
// No page data is ever stored here.
(() => {
  const ns = globalThis.__ydi;
  const { ext, t } = ns;
  const form = document.querySelector('main');
  const saved = document.getElementById('saved');
  const warn = document.getElementById('direct-warn');

  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  document.documentElement.lang = ext.i18n.getUILanguage();

  const render = (s) => {
    form.querySelector(`input[name="mode"][value="${s.mode === 'direct' ? 'direct' : 'key'}"]`).checked = true;
    form.querySelector('input[name="showCopy"]').checked = Boolean(s.showCopy);
    warn.hidden = s.mode !== 'direct';
  };

  let savedTimer = 0;
  const save = async () => {
    const mode = form.querySelector('input[name="mode"]:checked')?.value === 'direct' ? 'direct' : 'key';
    const showCopy = form.querySelector('input[name="showCopy"]').checked;
    warn.hidden = mode !== 'direct';
    await ext.storage.sync.set({ mode, showCopy });
    saved.textContent = t('optSaved');
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => (saved.textContent = ''), 1600);
  };

  // Shortcut shown as keycaps: "Alt+Shift+D" → [Alt] + [Shift] + [D].
  const renderShortcut = async () => {
    const box = document.getElementById('keys');
    box.replaceChildren();
    let shortcut;
    try {
      const cmds = await ext.commands.getAll();
      shortcut = cmds.find((c) => c.name === '_execute_action')?.shortcut ?? '';
    } catch {
      shortcut = '';
    }
    if (!shortcut) {
      const none = document.createElement('span');
      none.className = 'none';
      none.textContent = t('optShortcutNone');
      box.append(none);
      return;
    }
    // Chrome on macOS returns symbols ("⌥⇧D"); elsewhere "Alt+Shift+D".
    const parts = shortcut.includes('+') ? shortcut.split('+') : [...shortcut];
    parts.forEach((p, i) => {
      if (i > 0) {
        const plus = document.createElement('span');
        plus.className = 'plus';
        plus.textContent = '+';
        plus.setAttribute('aria-hidden', 'true');
        box.append(plus);
      }
      const k = document.createElement('kbd');
      k.textContent = p;
      box.append(k);
    });
  };

  document.getElementById('change-shortcut').addEventListener('click', async () => {
    if (typeof ext.commands.openShortcutSettings === 'function') {
      await ext.commands.openShortcutSettings(); // Firefox 137+
    } else {
      await ext.tabs.create({ url: 'chrome://extensions/shortcuts' });
    }
  });

  form.addEventListener('change', save);
  ns.getSettings().then(render);
  renderShortcut();
})();
