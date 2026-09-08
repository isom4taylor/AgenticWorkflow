import { api, getToken, setToken, downloadExport } from './api.js';
import { toast, confirmModal, promptMoveModal, editRecordModal, escapeHtml } from './ui.js';

const els = {
  viewAuth: document.getElementById('view-auth'),
  viewApp: document.getElementById('view-app'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  forgotForm: document.getElementById('forgot-form'),
};

let currentUser = null;
let currentList = 'Learn';
const ALL_LISTS = ['Learn', 'Learning', 'Learned'];

// ---------------- Auth view wiring ----------------

function showAuthPanel(panel) {
  els.loginForm.classList.toggle('hidden', panel !== 'login');
  els.registerForm.classList.toggle('hidden', panel !== 'register');
  els.forgotForm.classList.toggle('hidden', panel !== 'forgot');
}

document.getElementById('show-register').onclick = (e) => { e.preventDefault(); showAuthPanel('register'); };
document.getElementById('show-login').onclick = (e) => { e.preventDefault(); showAuthPanel('login'); };
document.getElementById('show-login-2').onclick = (e) => { e.preventDefault(); showAuthPanel('login'); };

document.getElementById('login-submit').onclick = async () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    const { data } = await api.login(email, password);
    onAuthenticated(data);
  } catch (err) {
    toast(err.message, 'error');
  }
};

document.getElementById('register-submit').onclick = async () => {
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  try {
    const { data } = await api.register(email, password);
    onAuthenticated(data);
    toast('Account created! Welcome. 🎉', 'success');
  } catch (err) {
    if (err.data && err.data.code === 'EMAIL_IN_USE') {
      const proceed = await confirmModal({
        title: 'Email already in use',
        body: `An account with "${escapeHtml(email)}" already exists. Would you like to reset its password instead?`,
        confirmText: 'Reset Password',
      });
      if (proceed) {
        document.getElementById('forgot-email').value = email;
        showAuthPanel('forgot');
      }
    } else {
      toast(err.message, 'error');
    }
  }
};

document.getElementById('forgot-submit').onclick = async () => {
  const email = document.getElementById('forgot-email').value.trim();
  const newPassword = document.getElementById('forgot-password').value;
  try {
    await api.forgotPassword(email, newPassword);
    toast('Password reset. You can now log in.', 'success');
    showAuthPanel('login');
  } catch (err) {
    toast(err.message, 'error');
  }
};

function onAuthenticated({ token, user }) {
  setToken(token);
  currentUser = user;
  renderApp();
}

// ---------------- App shell wiring ----------------

document.getElementById('logout-btn').onclick = async () => {
  try { await api.logout(); } catch (e) { /* ignore */ }
  setToken(null);
  currentUser = null;
  els.viewApp.classList.add('hidden');
  els.viewAuth.classList.remove('hidden');
  showAuthPanel('login');
};

document.querySelectorAll('.nav-tab').forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll('.nav-tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.getAttribute('data-tab');
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    if (tab === 'settings') fillSettingsForm();
  };
});

function renderApp() {
  els.viewAuth.classList.add('hidden');
  els.viewApp.classList.remove('hidden');
  document.getElementById('streak-badge').textContent = `🔥 ${currentUser.daily_streak_count}`;
  fillSettingsForm();
  loadListCounts();
  loadCurrentList();
}

// ---------------- Lists tab ----------------

document.querySelectorAll('.list-tab').forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll('.list-tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentList = btn.getAttribute('data-list');
    loadCurrentList();
  };
});

async function loadListCounts() {
  try {
    const { data } = await api.listCounts();
    ALL_LISTS.forEach((t) => {
      const el = document.getElementById(`count-${t}`);
      if (!el) return;
      el.textContent = t === 'Learn' ? `${data.counts[t]}/${data.learnCap}` : String(data.counts[t]);
    });
  } catch (err) {
    // non-fatal
  }
}

async function loadCurrentList() {
  const container = document.getElementById('records-container');
  container.innerHTML = '<p class="muted">Loading…</p>';
  try {
    const { data } = await api.listRecords(currentList);
    renderRecords(data.records);
  } catch (err) {
    container.innerHTML = `<p class="muted">Failed to load: ${escapeHtml(err.message)}</p>`;
  }
}

function renderRecords(records) {
  const container = document.getElementById('records-container');
  if (records.length === 0) {
    container.innerHTML = '<p class="muted">No records in this list yet.</p>';
    return;
  }
  container.innerHTML = '';
  records.forEach((r) => {
    const row = document.createElement('div');
    row.className = 'record-row';
    row.innerHTML = `
      <div class="record-texts">
        <span class="base">${escapeHtml(r.base_text)}</span>
        <span class="learning">${r.learning_text ? escapeHtml(r.learning_text) : '<em>no translation yet</em>'}</span>
      </div>
      <div class="record-actions">
        <button class="btn btn-ghost btn-small" data-action="edit">Edit</button>
        <button class="btn btn-ghost btn-small" data-action="move">Move</button>
        <button class="btn btn-danger btn-small" data-action="delete">Delete</button>
      </div>`;
    row.querySelector('[data-action="edit"]').onclick = () => handleEdit(r);
    row.querySelector('[data-action="move"]').onclick = () => handleMove(r);
    row.querySelector('[data-action="delete"]').onclick = () => handleDelete(r);
    container.appendChild(row);
  });
}

async function handleEdit(record) {
  const result = await editRecordModal(record);
  if (!result) return;
  try {
    await api.updateRecord(currentList, record.id, result);
    toast('Record updated.', 'success');
    loadCurrentList();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function handleMove(record) {
  const others = ALL_LISTS.filter((l) => l !== currentList);
  const target = await promptMoveModal(currentList, others);
  if (!target) return;
  try {
    await api.moveRecord(currentList, record.id, target);
    toast(`Moved to ${target}.`, 'success');
    loadCurrentList();
    loadListCounts();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function handleDelete(record) {
  const ok = await confirmModal({
    title: 'Delete record?',
    body: `Delete "${escapeHtml(record.base_text)}" from ${currentList}? This cannot be undone.`,
    confirmText: 'Delete',
    danger: true,
  });
  if (!ok) return;
  try {
    await api.deleteRecord(currentList, record.id);
    toast('Record deleted.', 'success');
    loadCurrentList();
    loadListCounts();
  } catch (err) {
    toast(err.message, 'error');
  }
}

document.getElementById('add-record-btn').onclick = async () => {
  const baseText = document.getElementById('add-base-text').value.trim();
  const learningText = document.getElementById('add-learning-text').value.trim();
  if (!baseText) return toast('Base text is required.', 'error');
  try {
    await api.addRecord(currentList, { baseText, learningText });
    document.getElementById('add-base-text').value = '';
    document.getElementById('add-learning-text').value = '';
    toast('Record added.', 'success');
    loadCurrentList();
    loadListCounts();
  } catch (err) {
    toast(err.message, 'error');
  }
};

// ---------------- Import tab ----------------

document.getElementById('import-submit').onclick = async () => {
  const fileInput = document.getElementById('import-file');
  const advanced = document.getElementById('import-advanced').checked;
  const resultEl = document.getElementById('import-result');
  if (!fileInput.files[0]) return toast('Choose a CSV file first.', 'error');
  resultEl.textContent = 'Importing…';
  try {
    const { data } = await api.importCsv(fileInput.files[0], advanced);
    resultEl.textContent = `Imported ${data.importedRecords} record(s) into "Learning" (parsed ${data.parsedRows} row(s) from CSV).`;
    toast('Import complete.', 'success');
    loadListCounts();
    if (currentList === 'Learning') loadCurrentList();
  } catch (err) {
    resultEl.textContent = '';
    toast(err.message, 'error');
  }
};

// ---------------- Settings tab ----------------

function fillSettingsForm() {
  if (!currentUser) return;
  document.getElementById('settings-email').value = currentUser.email;
  document.getElementById('settings-base-language').value = currentUser.base_language;
  document.getElementById('settings-learning-languages').value = currentUser.learning_languages.join(', ');
  document.getElementById('settings-fluency').value = currentUser.fluency;
  document.getElementById('settings-streak').value = currentUser.daily_streak_count;
}

document.getElementById('settings-save-btn').onclick = async () => {
  const email = document.getElementById('settings-email').value.trim();
  const baseLanguage = document.getElementById('settings-base-language').value.trim();
  const learningLanguages = document.getElementById('settings-learning-languages').value
    .split(',').map((s) => s.trim()).filter(Boolean);
  const fluency = document.getElementById('settings-fluency').value;
  try {
    const { data } = await api.updateSettings({ email, baseLanguage, learningLanguages, fluency });
    currentUser = data.user;
    toast('Settings saved.', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
};

document.getElementById('settings-password-btn').onclick = async () => {
  const currentPassword = document.getElementById('settings-current-password').value;
  const newPassword = document.getElementById('settings-new-password').value;
  try {
    await api.changePassword(currentPassword, newPassword);
    document.getElementById('settings-current-password').value = '';
    document.getElementById('settings-new-password').value = '';
    toast('Password changed.', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
};

// ---------------- Account tab ----------------

document.getElementById('reset-account-btn').onclick = async () => {
  const ok = await confirmModal({
    title: 'Reset account?',
    body: 'This resets your Learning Language Database to its initial state (default word list). This cannot be undone.',
    confirmText: 'Reset',
    danger: true,
  });
  if (!ok) return;
  try {
    await api.resetAccount();
    toast('Learning Language Database reset.', 'success');
    loadListCounts();
    loadCurrentList();
  } catch (err) {
    toast(err.message, 'error');
  }
};

document.getElementById('export-db-btn').onclick = async () => {
  try {
    await downloadExport();
    toast('Export downloaded.', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
};

document.getElementById('delete-account-btn').onclick = async () => {
  const choice = await confirmModal({
    title: 'Delete account?',
    body: 'This permanently deletes your account and Learning Language Database. This cannot be undone.',
    confirmText: 'Delete Anyway',
    danger: true,
    extraButton: 'Export Data First',
  });
  if (choice === 'extra') {
    await downloadExport();
    const finalOk = await confirmModal({
      title: 'Delete account?',
      body: 'Your data has been exported. Proceed with permanently deleting your account?',
      confirmText: 'Delete',
      danger: true,
    });
    if (!finalOk) return;
  } else if (!choice) {
    return;
  }
  try {
    await api.deleteAccount();
    setToken(null);
    currentUser = null;
    toast('Account deleted.', 'success');
    els.viewApp.classList.add('hidden');
    els.viewAuth.classList.remove('hidden');
    showAuthPanel('login');
  } catch (err) {
    toast(err.message, 'error');
  }
};

// ---------------- Boot ----------------

async function boot() {
  const token = getToken();
  if (!token) {
    els.viewAuth.classList.remove('hidden');
    showAuthPanel('login');
    return;
  }
  try {
    const { data } = await api.me();
    currentUser = data.user;
    renderApp();
  } catch (err) {
    setToken(null);
    els.viewAuth.classList.remove('hidden');
    showAuthPanel('login');
  }
}

boot();
