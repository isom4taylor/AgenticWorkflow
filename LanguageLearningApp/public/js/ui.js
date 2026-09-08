export function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// Renders a confirm modal. Returns a Promise<boolean>. `actions` optionally
// lets callers add extra buttons (e.g. "Export first") that resolve with a
// custom string instead of a boolean.
export function confirmModal({ title, body, confirmText = 'Confirm', cancelText = 'Cancel', danger = false, extraButton = null }) {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <h3>${title}</h3>
        <p class="muted">${body}</p>
        <div class="modal-actions">
          ${extraButton ? `<button class="btn btn-ghost" id="modal-extra">${extraButton}</button>` : ''}
          <button class="btn btn-ghost" id="modal-cancel">${cancelText}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm">${confirmText}</button>
        </div>
      </div>`;
    root.appendChild(overlay);

    const cleanup = (result) => {
      root.removeChild(overlay);
      resolve(result);
    };
    overlay.querySelector('#modal-cancel').onclick = () => cleanup(false);
    overlay.querySelector('#modal-confirm').onclick = () => cleanup(true);
    if (extraButton) overlay.querySelector('#modal-extra').onclick = () => cleanup('extra');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });
  });
}

export function promptMoveModal(currentList, otherLists) {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <h3>Move record</h3>
        <p class="muted">Move this item from <strong>${currentList}</strong> to:</p>
        <div class="modal-actions" style="justify-content:flex-start; flex-direction:column; align-items:stretch;">
          ${otherLists.map((l) => `<button class="btn btn-ghost" data-target="${l}" style="margin-bottom:6px;">${l}</button>`).join('')}
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
        </div>
      </div>`;
    root.appendChild(overlay);
    const cleanup = (result) => {
      root.removeChild(overlay);
      resolve(result);
    };
    overlay.querySelector('#modal-cancel').onclick = () => cleanup(null);
    overlay.querySelectorAll('[data-target]').forEach((btn) => {
      btn.onclick = () => cleanup(btn.getAttribute('data-target'));
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(null);
    });
  });
}

export function editRecordModal(record) {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <h3>Edit record</h3>
        <label class="muted">Base text
          <input type="text" id="edit-base-text" value="${escapeHtml(record.base_text)}" />
        </label>
        <label class="muted">Learning text
          <input type="text" id="edit-learning-text" value="${escapeHtml(record.learning_text || '')}" />
        </label>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="modal-save">Save</button>
        </div>
      </div>`;
    root.appendChild(overlay);
    const cleanup = (result) => {
      root.removeChild(overlay);
      resolve(result);
    };
    overlay.querySelector('#modal-cancel').onclick = () => cleanup(null);
    overlay.querySelector('#modal-save').onclick = () => {
      cleanup({
        baseText: overlay.querySelector('#edit-base-text').value,
        learningText: overlay.querySelector('#edit-learning-text').value,
      });
    };
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(null);
    });
  });
}

export function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
