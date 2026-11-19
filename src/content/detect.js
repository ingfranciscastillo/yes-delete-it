// Finds "type X to confirm" fields and the exact X they expect.
//
// Principle: when in doubt, offer nothing. A field gets a result only when the
// text around it contains a confirmation sentence AND that sentence yields
// exactly one candidate value.
(() => {
  const ns = (globalThis.__ydi ??= {});

  const UI_TAG = 'yes-delete-it-key';
  const MAX_DEPTH = 6;
  const MAX_VALUE = 200;
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'IFRAME', 'OBJECT', 'CANVAS']);
  const BLOCK_TAGS = new Set([
    'P', 'DIV', 'LI', 'UL', 'OL', 'LABEL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BR', 'TR', 'TD', 'TH',
    'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'DT', 'DD', 'DL', 'FORM', 'FIELDSET', 'LEGEND', 'TABLE',
    'BLOCKQUOTE', 'PRE', 'DIALOG', 'MAIN', 'ASIDE', 'NAV', 'HR', 'BUTTON',
  ]);
  const EMPHASIS = 'code, kbd, samp, strong, b, em, mark, tt, var, q, [class*="mono" i], [class*="code" i]';
  const NEVER_AUTOCOMPLETE = /\b(?:current-password|new-password|one-time-code|username|email|tel|cc-[a-z-]+)\b/i;

  // ── Inputs ────────────────────────────────────────────────────────────────

  const isVisible = (el) => {
    if (typeof el.checkVisibility === 'function') {
      if (!el.checkVisibility({ visibilityProperty: true })) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const isTextField = (el) => {
    if (el instanceof HTMLTextAreaElement) return true;
    if (!(el instanceof HTMLInputElement)) return false;
    return el.type === 'text' || el.type === 'search';
  };

  const isCandidateInput = (el) =>
    isTextField(el) &&
    !el.disabled &&
    !el.readOnly &&
    !NEVER_AUTOCOMPLETE.test(el.getAttribute('autocomplete') || '') &&
    !el.closest(UI_TAG) &&
    isVisible(el);

  function* roots(root) {
    yield root;
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) yield* roots(el.shadowRoot);
    }
  }

  const findInputs = (doc) => {
    const out = [];
    for (const root of roots(doc)) {
      for (const el of root.querySelectorAll('input, textarea')) {
        if (isCandidateInput(el)) out.push(el);
      }
    }
    return out;
  };

  const parentOf = (node) => node.parentElement ?? (node.getRootNode() instanceof ShadowRoot ? node.getRootNode().host : null);

  // ── Text segments ─────────────────────────────────────────────────────────
  // The text inside `container`, split at every candidate text field. For each
  // segment we keep its plain text plus where emphasised runs (<code>, <b>…)
  // start, so they can be matched to the sentence they belong to.

  const buildSegments = (container, isBoundary) => {
    const segments = [{ text: '', emph: [] }];
    const boundaries = [];
    const cur = () => segments[segments.length - 1];

    const visit = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        cur().text += node.data;
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node;
      if (SKIP_TAGS.has(el.tagName) || el.tagName.toLowerCase() === UI_TAG || el.hidden) return;
      if (el.getAttribute('aria-hidden') === 'true' && !el.contains(document.activeElement)) return;

      if (isBoundary(el)) {
        boundaries.push(el);
        segments.push({ text: '', emph: [] });
        return;
      }
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return;
      if (typeof el.checkVisibility === 'function' && !el.checkVisibility()) return;

      const block = BLOCK_TAGS.has(el.tagName);
      if (block) cur().text += '\n';
      if (el.matches(EMPHASIS)) {
        cur().emph.push({ start: cur().text.length, text: el.textContent ?? '' });
      }
      for (const child of el.childNodes) visit(child);
      if (block) cur().text += '\n';
    };

    for (const child of container.childNodes) visit(child);
    return { segments, boundaries };
  };

  // Sentence ranges: split at line breaks and at . ! ? followed by space.
  const sentences = (text) => {
    const out = [];
    const re = /\n|[.!?:](?=\s)/g;
    let start = 0;
    let m;
    while ((m = re.exec(text))) {
      const end = m.index + (m[0] === '\n' ? 0 : 1);
      out.push({ start, end, text: text.slice(start, end) });
      start = m.index + m[0].length;
    }
    out.push({ start, end: text.length, text: text.slice(start) });
    return out.filter((s) => s.text.trim().length > 0);
  };

  // ── Candidate values ──────────────────────────────────────────────────────

  const clean = (v) => {
    const s = (v ?? '').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ').trim();
    if (!s || s.length > MAX_VALUE || /[\r\n]/.test(s)) return null;
    if (!/[\p{L}\p{N}]/u.test(s)) return null;
    return s;
  };

  const QUOTES = [
    /"([^"\n]{1,200})"/g,
    /“([^”\n]{1,200})”/g,
    /«\s?([^»\n]{1,200}?)\s?»/g,
    /‘([^’\n]{1,200})’/g,
    /„([^“”\n]{1,200})[“”]/g,
    /(?:^|[\s(:])'([^'\n]{1,200})'(?=$|[\s.,:;!?)])/g,
  ];

  const quotedIn = (s) => {
    const out = [];
    for (const re of QUOTES) {
      for (const m of s.matchAll(re)) out.push(m[1]);
    }
    return out;
  };

  // "Type DELETE to confirm": an ALL-CAPS token right after a typing verb.
  const capsIn = (s) => {
    const out = [];
    for (const m of s.matchAll(ns.TYPE_VERBS)) {
      const rest = s.slice(m.index + m[0].length);
      const caps = /^\s+([A-Z][A-Z0-9_-]{2,}(?: [A-Z][A-Z0-9_-]+){0,3})(?=$|\s|[,.:;!?])/.exec(rest);
      if (caps) out.push(caps[1]);
    }
    return out;
  };

  // A literal `pattern` attribute ("^acme/web$", "acme\.dev") is the most reliable
  // source. Anything with real regex syntax is ignored.
  const literalPattern = (input) => {
    let p = input.getAttribute('pattern');
    if (!p) return null;
    p = p.replace(/^\^/, '').replace(/\$$/, '');
    let out = '';
    for (let i = 0; i < p.length; i++) {
      const c = p[i];
      if (c === '\\') {
        const next = p[++i];
        if (next === undefined || /[A-Za-z0-9]/.test(next)) return null;
        out += next;
      } else if ('[](){}*+?|^$.'.includes(c)) {
        return null;
      } else {
        out += c;
      }
    }
    return clean(out);
  };

  // Analyse one segment. Returns { status: 'none' | 'found' | 'ambiguous' | 'empty', value }.
  const analyse = (segment) => {
    const list = sentences(segment.text);
    const confirmIdx = new Set();
    list.forEach((s, i) => {
      if (ns.isConfirmSentence(s.text)) confirmIdx.add(i);
    });
    if (confirmIdx.size === 0) return { status: 'none' };

    const found = new Set();
    const add = (v) => {
      const c = clean(v);
      if (c) found.add(c);
    };

    list.forEach((s, i) => {
      if (!confirmIdx.has(i)) return;
      for (const e of segment.emph) {
        if (e.start >= s.start && e.start < s.end) add(e.text);
      }
      quotedIn(s.text).forEach(add);
      capsIn(s.text).forEach(add);
    });

    // The value can sit alone on the line right after the sentence:
    //   <p>Type the project name to confirm:</p><p><code>acme/web</code></p>
    if (found.size === 0) {
      list.forEach((s, i) => {
        if (!confirmIdx.has(i - 1)) return;
        for (const e of segment.emph) {
          if (e.start >= s.start && e.start < s.end && clean(e.text) === clean(s.text)) add(e.text);
        }
      });
    }

    if (found.size === 1) return { status: 'found', value: [...found][0] };
    return { status: found.size === 0 ? 'empty' : 'ambiguous' };
  };

  // Text the input points at itself: aria-describedby, aria-labelledby, its label.
  const ownDescription = (input) => {
    const ids = `${input.getAttribute('aria-describedby') || ''} ${input.getAttribute('aria-labelledby') || ''}`
      .split(/\s+/)
      .filter(Boolean);
    const root = input.getRootNode();
    const els = ids.map((id) => root.getElementById?.(id) ?? document.getElementById(id)).filter(Boolean);
    for (const l of input.labels ?? []) els.push(l);
    return els;
  };

  // ── Per input ─────────────────────────────────────────────────────────────

  const expectedFor = (input, candidateSet) => {
    const fromPattern = literalPattern(input);
    const isBoundary = (el) => candidateSet.has(el);

    let node = input;
    for (let depth = 0; depth < MAX_DEPTH; depth++) {
      node = parentOf(node);
      if (!node || node === document.documentElement) break;

      const { segments, boundaries } = buildSegments(node, isBoundary);
      const k = boundaries.indexOf(input);
      if (k === -1) continue;

      const tries = [segments[k]];
      // Text after the field only counts when no other field follows it.
      if (k === boundaries.length - 1) tries.push(segments[k + 1]);

      for (const seg of tries) {
        const r = analyse(seg);
        if (r.status === 'none') continue;
        if (r.status === 'found') {
          if (fromPattern && fromPattern !== r.value) return { value: fromPattern, source: 'pattern' };
          return { value: r.value, source: 'text' };
        }
        // A confirmation sentence exists but is ambiguous or names nothing.
        return fromPattern ? { value: fromPattern, source: 'pattern' } : null;
      }
      if (node === document.body) break;
    }

    for (const el of ownDescription(input)) {
      const r = analyse(buildSegments(el, () => false).segments[0]);
      if (r.status === 'found') return { value: r.value, source: 'description' };
    }
    const attrs = [input.getAttribute('aria-label'), input.placeholder, input.title].filter(Boolean).join('\n');
    if (attrs) {
      const r = analyse({ text: attrs, emph: [] });
      if (r.status === 'found') return { value: r.value, source: 'attribute' };
    }
    return fromPattern ? { value: fromPattern, source: 'pattern' } : null;
  };

  ns.detect = (doc = document) => {
    const inputs = findInputs(doc);
    const set = new Set(inputs);
    const results = [];
    for (const input of inputs) {
      const r = expectedFor(input, set);
      if (r) results.push({ input, expected: r.value, source: r.source });
    }
    return results;
  };

  // Exposed for tests.
  ns._internals = { sentences, quotedIn, capsIn, literalPattern, analyse };
})();
