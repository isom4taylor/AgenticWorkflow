// Page panels live in index.html as <section class="page-panel">. Routes show
// exactly one at a time; the dynamically rendered pages also get their markup
// written into their panel by the page module.

export function showPanel(id) {
  document.querySelectorAll('.page-panel').forEach((panel) => {
    panel.classList.toggle('hidden', panel.id !== id);
  });
  window.scrollTo({ top: 0 });
  return document.getElementById(id);
}

export function panelEl(id) {
  return document.getElementById(id);
}

// Standard "← Back to X" link markup used at the top of every sub-page.
export function backLink(href, label) {
  return `<a class="back-link" href="#${href}">← ${label}</a>`;
}
