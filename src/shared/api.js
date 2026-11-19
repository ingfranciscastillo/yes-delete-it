// Shared namespace for the content scripts. They are injected as classic
// scripts, in order, into the extension's isolated world (the page cannot see
// this object). Every file is an IIFE so re-injecting never redeclares anything.
(() => {
  const ns = (globalThis.__ydi ??= {});
  const ext = globalThis.browser ?? globalThis.chrome;
  ns.ext = ext;

  ns.t = (key, subs) => {
    try {
      return ext?.i18n?.getMessage(key, subs) || key;
    } catch {
      return key;
    }
  };

  ns.DEFAULT_SETTINGS = Object.freeze({ mode: 'key', showCopy: true });

  ns.getSettings = async () => {
    try {
      const stored = await ext.storage.sync.get(ns.DEFAULT_SETTINGS);
      return { ...ns.DEFAULT_SETTINGS, ...stored };
    } catch {
      return { ...ns.DEFAULT_SETTINGS };
    }
  };
})();
