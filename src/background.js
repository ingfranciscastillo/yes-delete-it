// Yes, Delete It — background.
// Its only job: when the user clicks the toolbar button or presses the shortcut
// (_execute_action), inject the detector into the active tab. activeTab grants
// access to that tab only, and only for this user gesture.
// Nothing is read from the page here and nothing is sent anywhere.

const ext = globalThis.browser ?? globalThis.chrome;

const CONTENT_FILES = [
  'src/shared/api.js',
  'src/shared/patterns.js',
  'src/content/detect.js',
  'src/content/fill.js',
  'src/content/ui.js',
  'src/content/main.js',
];

async function inject(tabId) {
  // Top frame only: in Chrome, one frame without permission (e.g. a cross-origin
  // iframe) makes the whole allFrames injection fail.
  await ext.scripting.executeScript({ target: { tabId }, files: CONTENT_FILES });
}

async function flagUnsupported(tabId) {
  try {
    await ext.action.setBadgeBackgroundColor({ tabId, color: '#5B6578' });
    await ext.action.setBadgeText({ tabId, text: '–' });
    await ext.action.setTitle({ tabId, title: ext.i18n.getMessage('unsupportedPage') });
    setTimeout(() => {
      ext.action.setBadgeText({ tabId, text: '' }).catch(() => {});
      ext.action.setTitle({ tabId, title: ext.i18n.getMessage('actionTitle') }).catch(() => {});
    }, 3000);
  } catch {
    // The tab may have closed; nothing to do.
  }
}

ext.action.onClicked.addListener((tab) => {
  if (tab.id == null) return;
  inject(tab.id).catch(() => flagUnsupported(tab.id));
});
