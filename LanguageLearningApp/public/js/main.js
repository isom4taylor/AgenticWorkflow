import { api, getToken, setToken, downloadExport } from './api.js';
import { toast, confirmModal, promptMoveModal, editRecordModal, translateOptionsModal, escapeHtml } from './ui.js';
import { PARTS_OF_SPEECH, posOptionsHtml } from './constants.js';
import { registerRoute, startRouter, stopRouter, navigate } from './router.js';
import { showPanel } from './panels.js';
import * as state from './state.js';
import { renderHome } from './pages/home.js';
import { renderWordsOfTheDay } from './pages/wordsOfTheDay.js';
import { renderFlashCards } from './pages/flashCards.js';
import { renderPractice, renderPracticeSection } from './pages/practice.js';
import { renderQuizzes, renderQuiz } from './pages/quizzes.js';
import { renderGuides, renderGuideLesson } from './pages/guides.js';
import { renderTeachMe } from './pages/teachMe.js';

const els = {
  viewAuth: document.getElementById('view-auth'),
  viewApp: document.getElementById('view-app'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  forgotForm: document.getElementById('forgot-form'),
};

let currentUser = null;
let currentList = 'Learn';
let currentRecords = [];
let advancedMode = false;
const selectedIds = new Set();
let selectionAnchorIndex = null; // last non-shift-clicked checkbox index, used as the Shift+Click range anchor
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

document.getElementById('show-forgot').onclick = (e) => {
  e.preventDefault();
  document.getElementById('forgot-form-hint').textContent = 'Enter your account email and a new password to reset it.';
  const loginEmail = document.getElementById('login-email').value.trim();
  if (loginEmail) document.getElementById('forgot-email').value = loginEmail;
  document.getElementById('forgot-password').value = '';
  showAuthPanel('forgot');
};

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
        document.getElementById('forgot-form-hint').textContent = 'That email is already in use. Enter a new password to reset it.';
        document.getElementById('forgot-email').value = email;
        document.getElementById('forgot-password').value = '';
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

function returnToAuth() {
  stopRouter();
  setToken(null);
  currentUser = null;
  state.setUser(null);
  // Drop any deep link so the next sign-in starts at the homepage.
  history.replaceState(null, '', location.pathname);
  els.viewApp.classList.add('hidden');
  els.viewAuth.classList.remove('hidden');
  showAuthPanel('login');
}

// ---------------- Profile dropdown ----------------
// Everything that used to be a top-bar tab lives in this menu.

const profileBtn = document.getElementById('profile-btn');
const profileDropdown = document.getElementById('profile-dropdown');

function setProfileMenuOpen(open) {
  profileDropdown.classList.toggle('hidden', !open);
  profileBtn.setAttribute('aria-expanded', String(open));
}

profileBtn.onclick = (e) => {
  e.stopPropagation();
  setProfileMenuOpen(profileDropdown.classList.contains('hidden'));
};

// Clicking anywhere else, or pressing Escape, closes the menu.
document.addEventListener('click', (e) => {
  if (!profileDropdown.classList.contains('hidden') && !e.target.closest('.profile-menu')) {
    setProfileMenuOpen(false);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setProfileMenuOpen(false);
});

profileDropdown.querySelectorAll('.profile-item[data-route]').forEach((item) => {
  item.onclick = () => {
    setProfileMenuOpen(false);
    navigate(item.getAttribute('data-route'));
  };
});

document.getElementById('logout-btn').onclick = async () => {
  setProfileMenuOpen(false);
  try { await api.logout(); } catch (e) { /* ignore */ }
  returnToAuth();
};

function fillProfileHeader() {
  document.getElementById('profile-initial').textContent =
    (currentUser.email || '?').trim().charAt(0).toUpperCase();
  document.getElementById('profile-email').textContent = currentUser.email;
  document.getElementById('profile-languages').textContent =
    `${currentUser.base_language} → ${currentUser.learning_languages.join(', ')}`;
}

// ---------------- Routes ----------------

registerRoute('/', () => renderHome());
registerRoute('/words-of-the-day', () => renderWordsOfTheDay());
registerRoute('/flash-cards', () => renderFlashCards());
registerRoute('/practice', () => renderPractice());
registerRoute('/practice/:section', ({ section }) => renderPracticeSection(section));
registerRoute('/quizzes', () => renderQuizzes());
registerRoute('/quizzes/:quiz', ({ quiz }) => renderQuiz(quiz));
registerRoute('/guides', () => renderGuides());
registerRoute('/guides/:lessonId', ({ lessonId }) => renderGuideLesson(lessonId));
registerRoute('/teach-me', () => renderTeachMe());

registerRoute('/words', () => {
  showPanel('page-words');
  populatePartOfSpeechSelects();
  populateMoveTargetSelect();
  applyLanguageLabels();
  loadListCounts();
  loadCurrentList();
});
registerRoute('/import', () => { showPanel('page-import'); });
registerRoute('/settings', () => { showPanel('page-settings'); fillSettingsForm(); });
registerRoute('/account', () => { showPanel('page-account'); });

function renderApp() {
  els.viewAuth.classList.add('hidden');
  els.viewApp.classList.remove('hidden');
  state.setUser(currentUser);
  document.getElementById('streak-badge').textContent = `🔥 ${currentUser.daily_streak_count}`;
  fillProfileHeader();
  fillSettingsForm();
  populatePartOfSpeechSelects();
  applyLanguageLabels();
  startRouter({ fallback: '/' });
}

// ---------------- Language-aware labels/placeholders ----------------

function targetLearningLanguage() {
  return (currentUser && currentUser.learning_languages && currentUser.learning_languages[0]) || 'the learning language';
}

function applyLanguageLabels() {
  if (!currentUser) return;
  const baseLang = currentUser.base_language || 'Base language';
  const learningLang = targetLearningLanguage();
  document.getElementById('add-base-text').placeholder = `${baseLang} word/phrase`;
  document.getElementById('add-learning-text').placeholder = `${learningLang} translation (optional)`;
  document.getElementById('mass-add-textarea').placeholder =
    `hello, hola, interjection\nthe library, la biblioteca, noun\n(Base text, ${learningLang} translation, Part of speech — translation & POS optional)`;
}

function populatePartOfSpeechSelects() {
  document.getElementById('add-part-of-speech').innerHTML = posOptionsHtml('');
  document.getElementById('bulk-pos-select').innerHTML = PARTS_OF_SPEECH
    .map((p) => `<option value="${p}">${p === '' ? '(clear part of speech)' : p}</option>`)
    .join('');
}

// Builds a short, human-readable summary of any duplicate words a
// bulk-add call skipped, e.g.:
//   Skipped 2 duplicate(s): "cat" (already in Learn), "dog" (already in Learning).
function formatDuplicatesMessage(duplicates) {
  if (!duplicates || duplicates.length === 0) return '';
  const shown = duplicates
    .slice(0, 5)
    .map((d) => `"${d.baseText}" (already in ${d.existingTable})`)
    .join(', ');
  const extra = duplicates.length > 5 ? `, and ${duplicates.length - 5} more` : '';
  return ` Skipped ${duplicates.length} duplicate(s): ${shown}${extra}.`;
}

function populateMoveTargetSelect() {
  const select = document.getElementById('bulk-move-target');
  const others = ALL_LISTS.filter((l) => l !== currentList);
  select.innerHTML = others.map((l) => `<option value="${l}">${l}</option>`).join('');
}

// ---------------- My Words (list editor) ----------------

document.querySelectorAll('.list-tab').forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll('.list-tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentList = btn.getAttribute('data-list');
    selectedIds.clear();
    selectionAnchorIndex = null;
    populateMoveTargetSelect();
    loadCurrentList();
  };
});

document.getElementById('advanced-mode-toggle').onchange = (e) => {
  advancedMode = e.target.checked;
  document.getElementById('bulk-toolbar').classList.toggle('hidden', !advancedMode);
  document.getElementById('mass-add-panel').classList.toggle('hidden', !advancedMode);
  selectedIds.clear();
  selectionAnchorIndex = null;
  populateMoveTargetSelect();
  renderRecords(currentRecords);
};

document.getElementById('select-all-checkbox').onchange = (e) => {
  if (e.target.checked) currentRecords.forEach((r) => selectedIds.add(r.id));
  else selectedIds.clear();
  selectionAnchorIndex = null;
  renderRecords(currentRecords);
};

// Handles Click / Ctrl(Cmd)+Click / Shift+Click on a record's selection
// checkbox, mirroring the familiar file-manager multi-select convention:
//   - Click:        select only this row (clears any other selection).
//   - Ctrl/Cmd+Click: toggle just this row in/out of the selection, leaving
//                      the rest of the selection untouched.
//   - Shift+Click:  select the contiguous range between the last clicked
//                    row (the anchor) and this row, adding it to whatever
//                    is already selected.
// We call preventDefault() so the checkbox's native checked state never
// gets out of sync with our own selectedIds source of truth.
function handleCheckboxClick(e, record, index) {
  e.preventDefault();
  if (e.shiftKey && selectionAnchorIndex !== null) {
    const start = Math.min(selectionAnchorIndex, index);
    const end = Math.max(selectionAnchorIndex, index);
    for (let i = start; i <= end; i++) {
      selectedIds.add(currentRecords[i].id);
    }
  } else if (e.ctrlKey || e.metaKey) {
    if (selectedIds.has(record.id)) selectedIds.delete(record.id);
    else selectedIds.add(record.id);
    selectionAnchorIndex = index;
  } else {
    selectedIds.clear();
    selectedIds.add(record.id);
    selectionAnchorIndex = index;
  }
  renderRecords(currentRecords);
}

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
    currentRecords = data.records;
    renderRecords(currentRecords);
  } catch (err) {
    container.innerHTML = `<p class="muted">Failed to load: ${escapeHtml(err.message)}</p>`;
  }
}

function updateSelectedCountLabel() {
  document.getElementById('selected-count').textContent = `${selectedIds.size} selected`;
  const total = currentRecords.length;
  document.getElementById('select-all-checkbox').checked = total > 0 && selectedIds.size === total;
}

function renderRecords(records) {
  const container = document.getElementById('records-container');
  if (records.length === 0) {
    container.innerHTML = '<p class="muted">No records in this list yet.</p>';
    updateSelectedCountLabel();
    return;
  }
  container.innerHTML = '';
  records.forEach((r, index) => {
    const row = document.createElement('div');
    row.className = 'record-row';
    row.innerHTML = `
      ${advancedMode ? `<input type="checkbox" class="record-checkbox" ${selectedIds.has(r.id) ? 'checked' : ''} />` : ''}
      <span class="record-id">#${r.id}</span>
      <div class="record-texts">
        <span class="base">${escapeHtml(r.base_text)}${r.part_of_speech ? `<span class="pos">${escapeHtml(r.part_of_speech)}</span>` : ''}</span>
        <span class="learning">${r.learning_text ? escapeHtml(r.learning_text) : '<em>no translation yet</em>'}</span>
      </div>
      <div class="record-actions">
        <button class="btn btn-ghost btn-small" data-action="edit">Edit</button>
        <button class="btn btn-ghost btn-small" data-action="move">Move</button>
        <button class="btn btn-danger btn-small" data-action="delete">Delete</button>
      </div>`;
    if (advancedMode) {
      const checkbox = row.querySelector('.record-checkbox');
      checkbox.onclick = (e) => handleCheckboxClick(e, r, index);
    }
    row.querySelector('[data-action="edit"]').onclick = () => handleEdit(r);
    row.querySelector('[data-action="move"]').onclick = () => handleMove(r);
    row.querySelector('[data-action="delete"]').onclick = () => handleDelete(r);
    container.appendChild(row);
  });
  updateSelectedCountLabel();
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
  const partOfSpeech = document.getElementById('add-part-of-speech').value;
  if (!baseText) return toast('Base text is required.', 'error');
  try {
    await api.addRecord(currentList, { baseText, learningText, partOfSpeech });
    document.getElementById('add-base-text').value = '';
    document.getElementById('add-learning-text').value = '';
    document.getElementById('add-part-of-speech').value = '';
    toast('Record added.', 'success');
    loadCurrentList();
    loadListCounts();
  } catch (err) {
    toast(err.message, 'error');
  }
};

// ---------------- Auto-translate ----------------

document.getElementById('add-translate-btn').onclick = async () => {
  const baseText = document.getElementById('add-base-text').value.trim();
  if (!baseText) return toast('Enter a base-language word/phrase first.', 'error');
  const targetLanguage = targetLearningLanguage();
  try {
    toast('Translating…', 'info');
    const { data } = await api.translate(baseText, targetLanguage);
    if (!data.options || data.options.length === 0) {
      return toast('No translation options found. Enter it manually.', 'error');
    }
    const selected = await translateOptionsModal({ baseWord: baseText, targetLanguage: data.targetLanguage, options: data.options });
    if (!selected) return;

    if (selected.length === 1) {
      document.getElementById('add-learning-text').value = selected[0].text;
      if (selected[0].partOfSpeech) document.getElementById('add-part-of-speech').value = selected[0].partOfSpeech;
      toast('Translation filled in — review and click "Add Record".', 'success');
    } else {
      // Mass-accept: create one record per selected option (skipping any
      // that are exact duplicates of a record that already exists).
      const records = selected.map((opt) => ({ baseText, learningText: opt.text, partOfSpeech: opt.partOfSpeech }));
      const { data: bulkData } = await api.bulkAdd(currentList, records);
      const dupMsg = formatDuplicatesMessage(bulkData.duplicates);
      toast(`Added ${bulkData.added} record(s) from the selected translation options.${dupMsg}`, dupMsg ? 'info' : 'success');
      document.getElementById('add-base-text').value = '';
      document.getElementById('add-learning-text').value = '';
      document.getElementById('add-part-of-speech').value = '';
      loadCurrentList();
      loadListCounts();
    }
  } catch (err) {
    toast(err.message, 'error');
  }
};

// ---------------- Advanced editor: bulk actions ----------------

document.getElementById('bulk-move-btn').onclick = async () => {
  if (selectedIds.size === 0) return toast('Select at least one record first.', 'error');
  const to = document.getElementById('bulk-move-target').value;
  try {
    const { data } = await api.bulkMove(currentList, Array.from(selectedIds), to);
    toast(`Moved ${data.moved} record(s) to ${to}.${data.skippedFull ? ` ${data.skippedFull} skipped (Learn list full).` : ''}`, 'success');
    selectedIds.clear();
    loadCurrentList();
    loadListCounts();
  } catch (err) {
    toast(err.message, 'error');
  }
};

document.getElementById('bulk-pos-btn').onclick = async () => {
  if (selectedIds.size === 0) return toast('Select at least one record first.', 'error');
  const partOfSpeech = document.getElementById('bulk-pos-select').value;
  try {
    const { data } = await api.bulkEdit(currentList, Array.from(selectedIds), { partOfSpeech });
    toast(`Updated part of speech on ${data.updated} record(s).`, 'success');
    loadCurrentList();
  } catch (err) {
    toast(err.message, 'error');
  }
};

document.getElementById('bulk-delete-btn').onclick = async () => {
  if (selectedIds.size === 0) return toast('Select at least one record first.', 'error');
  const ok = await confirmModal({
    title: 'Delete selected records?',
    body: `Delete ${selectedIds.size} record(s) from ${currentList}? This cannot be undone.`,
    confirmText: 'Delete',
    danger: true,
  });
  if (!ok) return;
  try {
    const { data } = await api.bulkDelete(currentList, Array.from(selectedIds));
    toast(`Deleted ${data.deleted} record(s).`, 'success');
    selectedIds.clear();
    loadCurrentList();
    loadListCounts();
  } catch (err) {
    toast(err.message, 'error');
  }
};

document.getElementById('mass-add-btn').onclick = async () => {
  const textarea = document.getElementById('mass-add-textarea');
  const lines = textarea.value.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return toast('Enter at least one line.', 'error');
  const records = lines.map((line) => {
    const [baseText, learningText, partOfSpeech] = line.split(',').map((s) => (s || '').trim());
    return { baseText, learningText, partOfSpeech };
  }).filter((r) => r.baseText);
  if (records.length === 0) return toast('No valid lines found.', 'error');
  try {
    const { data } = await api.bulkAdd(currentList, records);
    const dupMsg = formatDuplicatesMessage(data.duplicates);
    const fullMsg = data.skippedFull ? ` ${data.skippedFull} skipped (list full).` : '';
    toast(`Added ${data.added} record(s).${dupMsg}${fullMsg}`, dupMsg || fullMsg ? 'info' : 'success');
    textarea.value = '';
    loadCurrentList();
    loadListCounts();
  } catch (err) {
    toast(err.message, 'error');
  }
};

// ---------------- Import ----------------

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

// ---------------- Settings ----------------

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
    state.setUser(currentUser);
    fillProfileHeader();
    applyLanguageLabels();
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

// ---------------- Account ----------------

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

document.getElementById('dedupe-btn').onclick = async () => {
  const ok = await confirmModal({
    title: 'Remove duplicate records?',
    body: 'Scans Learn, Learning, and Learned for the same word appearing more than once and removes the extras (keeping Learning when a word spans Learn/Learning/Learned or Learn/Learning or Learning/Learned; keeping Learned when a word spans only Learn/Learned). This cannot be undone.',
    confirmText: 'Remove Duplicates',
    danger: true,
  });
  if (!ok) return;
  try {
    const { data } = await api.dedupe();
    if (data.removed === 0) {
      toast('No duplicates found.', 'success');
    } else {
      toast(`Removed ${data.removed} duplicate record(s) across ${data.groupsAffected} word(s).`, 'success');
    }
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
    toast('Account deleted.', 'success');
    returnToAuth();
  } catch (err) {
    toast(err.message, 'error');
  }
};

// ---------------- Boot ----------------

async function boot() {
  populateMoveTargetSelect();
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
