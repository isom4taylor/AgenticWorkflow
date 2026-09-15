// "Teach Me Something": read a Wikipedia article in the learning language,
// then harvest vocabulary from it straight into the Learn list by
// highlighting words.

import { api } from '../api.js';
import { showPanel, backLink } from '../panels.js';
import { baseLanguage, learningLanguage, learningLangCode } from '../state.js';
import { escapeHtml, toast, editRecordModal } from '../ui.js';
import { canSpeak, speak, stopSpeaking } from '../speech.js';

export function renderTeachMe() {
  const panel = showPanel('page-teach-me');
  const learningLang = learningLanguage();
  const baseLang = baseLanguage();
  const langCode = learningLangCode();

  let article = null;
  let selection = '';
  let categories = [];

  panel.innerHTML = `
    ${backLink('/', 'Home')}
    <header class="page-header">
      <h1>💡 Teach Me Something</h1>
      <p class="muted">
        Search Wikipedia in <strong>${escapeHtml(learningLang)}</strong>, then highlight any
        word or phrase in the text to add it to your <strong>Learn</strong> list.
      </p>
    </header>

    <div class="card">
      <div class="tm-search-row">
        <input type="text" id="tm-query" placeholder="Search for a topic…" autocomplete="off" />
        <button id="tm-search" class="btn btn-primary">Search</button>
        <button id="tm-random" class="btn btn-ghost">🎲 Random</button>
      </div>
      <label class="tm-category-label">Random from category
        <select id="tm-category">
          <option value="">Any category</option>
        </select>
      </label>
    </div>

    <div id="tm-result"></div>

    <div id="tm-selection-bar" class="tm-selection-bar hidden">
      <span class="tm-selection-text">
        Selected: <strong id="tm-selection-preview"></strong>
      </span>
      <button id="tm-add" class="btn btn-primary btn-small">➕ Add to Learn</button>
      ${canSpeak() ? '<button id="tm-speak" class="btn btn-ghost btn-small">🔊</button>' : ''}
      <button id="tm-clear-selection" class="btn btn-ghost btn-small">Clear</button>
    </div>
  `;

  const queryInput = panel.querySelector('#tm-query');
  const resultEl = panel.querySelector('#tm-result');
  const selectionBar = panel.querySelector('#tm-selection-bar');
  const selectionPreview = panel.querySelector('#tm-selection-preview');
  const categorySelect = panel.querySelector('#tm-category');

  // --------------------------------------------------------- rendering

  function renderArticle() {
    resultEl.innerHTML = `
      <article class="card tm-article">
        <div class="tm-article-header">
          <h2>${escapeHtml(article.title)}</h2>
          <div class="tm-chips">
            ${article.category ? `<span class="tm-chip">${escapeHtml(article.category)}</span>` : ''}
            <span class="tm-chip lang">${escapeHtml(article.language)}</span>
          </div>
        </div>
        ${article.fellBackToEnglish
          ? `<p class="notice">No ${escapeHtml(learningLang)} article exists for this topic, so the English one is shown.</p>`
          : ''}
        <p class="muted tm-hint">✨ Highlight any word or phrase below to add it to your Learn list.</p>
        <div class="tm-extract" id="tm-extract">${escapeHtml(article.extract)
          .split('\n')
          .filter((p) => p.trim())
          .map((p) => `<p>${p}</p>`)
          .join('')}</div>
        <div class="tm-article-actions">
          <a class="btn btn-ghost btn-small" href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer">
            Read the full article ↗
          </a>
          ${canSpeak() ? '<button id="tm-read-aloud" class="btn btn-ghost btn-small">🔊 Read it aloud</button>' : ''}
        </div>
      </article>
    `;

    const readBtn = resultEl.querySelector('#tm-read-aloud');
    if (readBtn) {
      readBtn.onclick = () => {
        stopSpeaking();
        speak(article.extract, { lang: article.language, rate: 0.9 }).catch((err) => toast(err.message, 'error'));
      };
    }
  }

  // ----------------------------------------------------------- loading

  async function runSearch(query) {
    if (!query) return;
    stopSpeaking();
    clearSelection();
    resultEl.innerHTML = '<p class="muted">Searching…</p>';
    try {
      const { data } = await api.wikiSearch(query);
      article = data;
      renderArticle();
    } catch (err) {
      article = null;
      resultEl.innerHTML = `<p class="muted">${escapeHtml(err.message)}</p>`;
    }
  }

  async function runRandom() {
    stopSpeaking();
    clearSelection();
    resultEl.innerHTML = '<p class="muted">Finding something interesting…</p>';
    try {
      const { data } = await api.wikiRandom(categorySelect.value || undefined);
      article = data;
      queryInput.value = data.title;
      renderArticle();
    } catch (err) {
      article = null;
      resultEl.innerHTML = `<p class="muted">${escapeHtml(err.message)}</p>`;
    }
  }

  // --------------------------------------------------------- selection

  function clearSelection() {
    selection = '';
    selectionBar.classList.add('hidden');
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
  }

  // Only selections that fall inside the article text count, so highlighting
  // the page chrome doesn't offer to add nonsense.
  function onSelectionChange() {
    const extract = document.getElementById('tm-extract');
    if (!extract) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    if (!extract.contains(sel.anchorNode) || !extract.contains(sel.focusNode)) return;

    const text = sel.toString().trim().replace(/\s+/g, ' ');
    if (!text) return;
    selection = text;
    selectionPreview.textContent = text.length > 60 ? `${text.slice(0, 60)}…` : text;
    selectionBar.classList.remove('hidden');
  }

  document.addEventListener('selectionchange', onSelectionChange);

  // Adds the highlighted learning-language text to Learn. The Learn record
  // needs a base-language side too, so we auto-translate in reverse and let
  // the user confirm/fix it before saving - which also covers the case where
  // auto-translate is rate-limited and comes back empty.
  async function addSelectionToLearn() {
    if (!selection) return;
    const learningText = selection;
    let baseText = '';

    toast('Translating the selection…', 'info');
    try {
      const { data } = await api.translate(learningText, baseLang, learningLang);
      baseText = data.plainTranslation || (data.options && data.options[0] && data.options[0].text) || '';
    } catch (err) {
      toast(`Couldn't auto-translate — enter the ${baseLang} meaning yourself.`, 'info');
    }

    const fields = await editRecordModal(
      {
        base_text: baseText,
        learning_text: learningText,
        part_of_speech: '',
        base_language: baseLang,
        learning_language: learningLang,
      },
      {
        title: 'Add to Learn',
        saveText: 'Add to Learn',
        intro: 'Check the translation and part of speech, then add it to your Learn list.',
      }
    );
    if (!fields) return;
    if (!fields.baseText.trim()) return toast(`A ${baseLang} word is required.`, 'error');

    try {
      await api.addRecord('Learn', fields);
      toast(`Added "${fields.baseText}" to Learn.`, 'success');
      clearSelection();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  // ------------------------------------------------------------- wiring

  panel.querySelector('#tm-search').onclick = () => runSearch(queryInput.value.trim());
  queryInput.onkeydown = (e) => { if (e.key === 'Enter') runSearch(queryInput.value.trim()); };
  panel.querySelector('#tm-random').onclick = runRandom;
  panel.querySelector('#tm-add').onclick = addSelectionToLearn;
  panel.querySelector('#tm-clear-selection').onclick = clearSelection;
  const speakSelectionBtn = panel.querySelector('#tm-speak');
  if (speakSelectionBtn) {
    speakSelectionBtn.onclick = () => {
      stopSpeaking();
      speak(selection, { lang: langCode }).catch((err) => toast(err.message, 'error'));
    };
  }

  api.wikiCategories()
    .then(({ data }) => {
      categories = data.categories;
      categorySelect.innerHTML =
        '<option value="">Any category</option>' +
        categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    })
    .catch(() => {
      // Non-fatal: the Random button still works without the category list.
    });

  return () => {
    document.removeEventListener('selectionchange', onSelectionChange);
    stopSpeaking();
  };
}
