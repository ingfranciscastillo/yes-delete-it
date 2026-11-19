// The only UI the extension puts on a page: a small physical key under each
// confirmation field, and a short toast when there is nothing to do.
//
// Security: closed shadow roots (the page can't read or restyle it), text only
// via textContent, and only trusted (real user) clicks do anything.
(() => {
  const ns = (globalThis.__ydi ??= {});
  if (ns.ui) return;

  const TAG = 'yes-delete-it-key';
  const GAP = 6;
  const live = new Set();

  // Layout: a small tray (our own background, so contrast never depends on the
  // page) holding one physical key — the primary action — and two quiet, flat
  // secondary buttons. Every size is fixed in px so system fonts can't change
  // heights or clip anything.
  const CSS = `
    :host { color-scheme: light dark; }
    * { box-sizing: border-box; }
    .wrap {
      --tray: #F3F5F8; --tray-line: #D8DDE5;
      --key: #FFFFFF; --key-line: #C5CDD8; --key-edge: #A9B3C1; --hi: rgba(255,255,255,.9);
      --quiet-hover: #E5E9EF; --quiet-press: #D9DEE6;
      --ink: #1B2230; --muted: #566074; --signal: #2A55E0; --signal-edge: #1C3BA8;
      --shadow: 0 1px 2px rgba(27,34,48,.08), 0 4px 12px -4px rgba(27,34,48,.18);
      display: inline-flex; flex-direction: column; align-items: flex-start; gap: 6px;
      max-width: 100%; padding: 5px; border-radius: 12px;
      background: var(--tray); border: 1px solid var(--tray-line); box-shadow: var(--shadow);
      font: 500 13px/16px system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, Cantarell, sans-serif;
      color: var(--ink); text-align: left; direction: ltr;
    }
    @media (prefers-color-scheme: dark) {
      .wrap {
        --tray: #1D222C; --tray-line: #333B4A;
        --key: #323B4D; --key-line: #4A5569; --key-edge: #10141B; --hi: rgba(255,255,255,.07);
        --quiet-hover: #2A313E; --quiet-press: #323A49;
        --ink: #E8ECF3; --muted: #A3ACBD; --signal: #8AA6FF; --signal-edge: #4F6FD8;
        --shadow: 0 1px 2px rgba(0,0,0,.3), 0 6px 16px -6px rgba(0,0,0,.5);
      }
    }
    .row { display: flex; gap: 8px; align-items: flex-start; max-width: 100%; }
    button {
      all: unset; box-sizing: border-box; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 8px; flex: none;
      white-space: nowrap; user-select: none; -webkit-user-select: none; color: var(--ink);
    }
    button:focus-visible { outline: 2px solid var(--signal); outline-offset: 2px; }

    /* Primary: the key. 31px face + 3px edge; pressing sinks it 1px. */
    .type {
      height: 34px; padding: 0 12px; border-radius: 8px; flex: 0 1 auto; min-width: 0;
      background: var(--key); border: 1px solid var(--key-line); border-bottom: 3px solid var(--key-edge);
      box-shadow: inset 0 1px 0 var(--hi);
      transition: transform 80ms ease-out, border-bottom-width 80ms ease-out, height 80ms ease-out;
    }
    .type:active { transform: translateY(1px); border-bottom-width: 2px; height: 33px; }
    .verb { color: var(--muted); }
    .value {
      font: 600 12.5px/16px ui-monospace, "SFMono-Regular", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, "Liberation Mono", monospace;
      overflow: hidden; text-overflow: ellipsis; min-width: 0;
    }
    .type[data-state="written"] { border-color: var(--signal); border-bottom-color: var(--signal-edge); }
    .type[data-state="written"] .verb { color: var(--signal); }

    /* Secondary: flat, same height as the key's face, no edge to look cut off. */
    .copy, .close {
      height: 31px; border-radius: 8px; border: 1px solid transparent; background: transparent;
      transition: background-color 120ms ease-out;
    }
    .copy { padding: 0 11px; border-color: var(--tray-line); }
    .close { width: 31px; color: var(--muted); }
    .copy:hover, .close:hover { background: var(--quiet-hover); }
    .copy:active, .close:active { background: var(--quiet-press); }
    .close svg { width: 10px; height: 10px; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; }

    .note { margin: 0; padding: 0 6px 2px; font-size: 12px; line-height: 16px; color: var(--muted); }
    .note:empty { display: none; }
    .toast { padding: 7px 10px; }
    @media (prefers-reduced-motion: reduce) { button { transition: none; } }
  `;

  const HOST_STYLE = 'all: initial !important; position: absolute !important; z-index: 2147483000 !important; top: 0; left: 0; display: block !important;';

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const crossIcon = () => {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 10 10');
    svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', 'M1 1l8 8M9 1l-8 8');
    svg.append(p);
    return svg;
  };

  const middleTruncate = (s, max = 44) =>
    s.length <= max ? s : `${s.slice(0, Math.ceil(max / 2) - 1)}…${s.slice(-(Math.floor(max / 2) - 1))}`;


  const parentOf = (n) => n.parentElement ?? (n.getRootNode() instanceof ShadowRoot ? n.getRootNode().host : null);

  const isRow = (el) => {
    const cs = getComputedStyle(el);
    const d = cs.display;
    if (d === 'contents' || d.startsWith('inline') || d.includes('grid') || d.startsWith('table') || d === 'ruby') return true;
    if (d.includes('flex')) return !cs.flexDirection.startsWith('column');
    return false;
  };

  // The element to insert after: the field (or its <label>), climbing out of
  // row-like parents so the key gets its own line. Null = no safe spot.
  const flowSpot = (input) => {
    let node = input.closest('label') ?? input;
    for (let i = 0; i < 4; i++) {
      const parent = parentOf(node);
      if (!parent || parent === document.documentElement) return null;
      if (parent instanceof HTMLButtonElement || parent.tagName === 'SELECT') return null;
      if (!isRow(parent)) return node;
      node = parent;
    }
    return null;
  };

  // Fallback: absolutely positioned under the field, measured each frame it
  // matters (doesn't assume the containing block or transforms).
  const floatUnder = (input, host, listeners, setFrame, setRo) => {
    let x = 0;
    let y = 0;
    let frame = 0;
    const place = () => {
      frame = 0;
      setFrame(0);
      if (!input.isConnected || !host.isConnected) return;
      const r = input.getBoundingClientRect();
      const hidden = r.width === 0 && r.height === 0;
      host.style.setProperty('visibility', hidden ? 'hidden' : 'visible', 'important');
      if (hidden) return;
      host.style.setProperty('max-width', `${Math.max(r.width, 280)}px`, 'important');
      const h = host.getBoundingClientRect();
      x += r.left - h.left;
      y += r.bottom + GAP - h.top;
      host.style.setProperty('left', `${x}px`, 'important');
      host.style.setProperty('top', `${y}px`, 'important');
    };
    const schedule = () => {
      if (!frame) setFrame((frame = requestAnimationFrame(place)));
    };
    (input.closest('dialog, [role="dialog"], [role="alertdialog"], [aria-modal="true"]') ?? document.body).append(host);
    const ro = new ResizeObserver(schedule);
    ro.observe(input);
    setRo(ro);
    const opts = { capture: true, passive: true };
    addEventListener('scroll', schedule, opts);
    addEventListener('resize', schedule, opts);
    listeners.push(['scroll', schedule, opts], ['resize', schedule, opts]);
    const until = performance.now() + 1200;
    const settle = () => {
      if (!host.isConnected) return;
      place();
      if (performance.now() < until) requestAnimationFrame(settle);
    };
    requestAnimationFrame(settle);
  };

  const makeHost = () => {
    const host = document.createElement(TAG);
    host.setAttribute('style', HOST_STYLE);
    const root = host.attachShadow({ mode: 'closed' });
    const style = el('style');
    style.textContent = CSS;
    const wrap = el('div', 'wrap');
    root.append(style, wrap);
    return { host, wrap };
  };

  const trusted = (handler) => (e) => {
    e.stopPropagation();
    if (!e.isTrusted) return;
    handler(e);
  };

  const copyText = async (text, wrap) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback inside our own shadow root.
      const ta = el('textarea');
      ta.value = text;
      ta.setAttribute('style', 'position:fixed;opacity:0;pointer-events:none');
      wrap.append(ta);
      ta.select();
      let ok;
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      ta.remove();
      return ok;
    }
  };

  // ── Escape closes everything ──────────────────────────────────────────────
  const onKey = (e) => {
    if (e.key === 'Escape' && e.isTrusted) ns.ui.unmountAll();
  };

  // ── Key ───────────────────────────────────────────────────────────────────
  const mountKey = ({ input, expected }, settings) => {
    const { host, wrap } = makeHost();
    const row = el('div', 'row');

    const typeBtn = el('button', 'type');
    typeBtn.type = 'button';
    const verb = el('span', 'verb', ns.t('keyType'));
    const value = el('span', 'value', middleTruncate(expected));
    typeBtn.append(verb, value);
    typeBtn.title = expected;
    typeBtn.setAttribute('aria-label', ns.t('keyTypeLabel', [expected]));
    row.append(typeBtn);

    let copyBtn = null;
    if (settings.showCopy) {
      copyBtn = el('button', 'copy', ns.t('keyCopy'));
      copyBtn.type = 'button';
      copyBtn.setAttribute('aria-label', ns.t('keyCopyLabel', [expected]));
      row.append(copyBtn);
    }

    const closeBtn = el('button', 'close');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', ns.t('keyClose'));
    closeBtn.title = ns.t('keyClose');
    closeBtn.append(crossIcon());
    row.append(closeBtn);

    const note = el('p', 'note');
    note.setAttribute('role', 'status');
    note.setAttribute('aria-live', 'polite');
    wrap.append(row, note);

    const type = () => {
      const ok = ns.fill(input, expected);
      typeBtn.dataset.state = ok ? 'written' : 'failed';
      verb.textContent = ns.t(ok ? 'keyWritten' : 'keyType');
      note.textContent = ns.t(ok ? 'keyReview' : 'keyFailed');
      return ok;
    };

    typeBtn.addEventListener('click', trusted(type));
    copyBtn?.addEventListener(
      'click',
      trusted(async () => {
        const ok = await copyText(expected, wrap);
        copyBtn.textContent = ns.t(ok ? 'keyCopied' : 'keyCopy');
        setTimeout(() => {
          if (copyBtn.isConnected) copyBtn.textContent = ns.t('keyCopy');
        }, 1600);
      }),
    );
    closeBtn.addEventListener('click', trusted(() => controller.destroy()));
    for (const ev of ['mousedown', 'mouseup', 'pointerdown', 'pointerup']) {
      wrap.addEventListener(ev, (e) => e.stopPropagation());
    }

    // Insert in the page flow right after the field, inside the same subtree:
    // it shares the field's modal, top layer and focus trap, and pushes content
    // down instead of covering it. If the field sits in a row (flex/grid/inline),
    // go up to the row. If no good spot exists, float under the field instead.
    const spot = flowSpot(input);
    let ro = null;
    let frame = 0;
    const listeners = [];
    if (spot) {
      host.style.setProperty('position', 'relative', 'important');
      host.style.setProperty('margin', '6px 0 10px', 'important');
      spot.after(host);
    } else {
      floatUnder(input, host, listeners, (f) => (frame = f), (r) => (ro = r));
    }
    const controller = {
      expected,
      input,
      type,
      alive: () => host.isConnected,
      destroy() {
        if (!live.has(controller)) return;
        live.delete(controller);
        ro?.disconnect();
        for (const [type, fn, opts] of listeners) removeEventListener(type, fn, opts);
        if (frame) cancelAnimationFrame(frame);
        host.remove();
        if (live.size === 0) removeEventListener('keydown', onKey, true);
      },
    };
    if (live.size === 0) addEventListener('keydown', onKey, true);
    live.add(controller);
    return controller;
  };

  // ── Toast ─────────────────────────────────────────────────────────────────
  let toastHost = null;
  let toastTimer = 0;
  const hideToast = () => {
    clearTimeout(toastTimer);
    toastHost?.remove();
    toastHost = null;
  };
  const toast = (message) => {
    hideToast();
    const { host, wrap } = makeHost();
    host.style.setProperty('position', 'fixed', 'important');
    host.style.setProperty('top', 'auto', 'important');
    host.style.setProperty('bottom', '24px', 'important');
    host.style.setProperty('left', '50%', 'important');
    host.style.setProperty('transform', 'translateX(-50%)', 'important');
    const box = el('div', 'toast', message);
    box.setAttribute('role', 'status');
    wrap.append(box);
    // Top layer when available, so it shows above modal dialogs.
    host.setAttribute('popover', 'manual');
    document.documentElement.append(host);
    try {
      host.showPopover();
    } catch {
      // Older engines: stays as a fixed element.
    }
    toastHost = host;
    toastTimer = setTimeout(hideToast, 3500);
  };

  ns.ui = {
    mountKey,
    toast,
    hideToast,
    unmountAll() {
      for (const c of [...live]) c.destroy();
      hideToast();
      ns.stopWatching?.();
    },
  };
})();
