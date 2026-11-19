// Types a value into a field the way a person would, so React, Vue, Svelte and
// plain listeners all notice. Never submits, never presses Enter, never clicks.
(() => {
  const ns = (globalThis.__ydi ??= {});

  const nativeSetter = (el) => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    return Object.getOwnPropertyDescriptor(proto, 'value').set;
  };

  const nativeValue = (el) => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    return Object.getOwnPropertyDescriptor(proto, 'value').get.call(el);
  };

  ns.fill = (input, value) => {
    if (!input.isConnected) return false;
    input.focus({ preventScroll: true });
    input.select();

    // 1. insertText behaves like typing: it fires beforeinput/input and does not
    //    go through the clipboard, so it works where pasting is blocked.
    let ok;
    try {
      ok = document.execCommand('insertText', false, value);
    } catch {
      ok = false;
    }
    if (ok && nativeValue(input) === value) return true;

    // 2. Fallback: the prototype's setter skips React's value tracker, then the
    //    events tell the framework the value changed.
    nativeSetter(input).call(input, value);
    input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: value }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return nativeValue(input) === value;
  };
})();
