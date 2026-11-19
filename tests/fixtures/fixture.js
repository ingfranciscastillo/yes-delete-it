// Shared fixture behaviour: each [data-confirm] input enables its delete button
// only when the value matches exactly, like real dashboards do.
window.__deleted = 0;
function wire(root = document) {
  for (const input of root.querySelectorAll('[data-confirm]')) {
    const btn = root.querySelector(`#${input.dataset.button}`);
    if (!btn) continue;
    const check = () => {
      const all = [...root.querySelectorAll(`[data-button="${input.dataset.button}"]`)];
      btn.disabled = !all.every((i) => i.value === i.dataset.confirm);
    };
    input.addEventListener('input', check);
    check();
    btn.addEventListener('click', () => { window.__deleted++; });
  }
}
window.wire = wire;
document.addEventListener('DOMContentLoaded', () => wire());
