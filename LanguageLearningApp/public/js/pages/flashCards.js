// Flash Cards, built from the Learning list.
//
// Front of the card is the learning-language translation in big bold text;
// the base-language word is hidden underneath until you tap. Navigation is
// by swipe, arrow buttons or the keyboard arrows.

import { api } from '../api.js';
import { showPanel, backLink } from '../panels.js';
import { baseLanguage, learningLanguage, learningLangCode, baseLangCode } from '../state.js';
import { escapeHtml, toast } from '../ui.js';
import { canSpeak, speak, stopSpeaking } from '../speech.js';

const SWIPE_THRESHOLD_PX = 50;

function shuffled(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function renderFlashCards() {
  const panel = showPanel('page-flash-cards');
  const learningLang = learningLanguage();
  const baseLang = baseLanguage();

  // --- state -------------------------------------------------------------
  let deck = [];        // the cards in the order currently shown
  let source = [];      // cards in original Learning-list order
  let index = 0;
  let revealed = false;
  let swapped = false;  // front shows the base language instead
  let shuffle = false;  // off by default, per spec
  let sortMode = 'list'; // 'list' | 'learning' | 'base'

  panel.innerHTML = `
    ${backLink('/', 'Home')}
    <header class="page-header">
      <h1>🃏 Flash Cards</h1>
      <p class="muted">From your <strong>Learning</strong> list. Tap the card to reveal the answer.</p>
    </header>
    <div id="fc-body"><p class="muted">Loading…</p></div>
  `;
  const body = panel.querySelector('#fc-body');

  function applyOrder({ keepCurrent = false } = {}) {
    const currentId = keepCurrent && deck[index] ? deck[index].id : null;
    if (shuffle) {
      deck = shuffled(source);
    } else if (sortMode === 'learning') {
      deck = [...source].sort((a, b) => a.learning_text.localeCompare(b.learning_text, learningLangCode()));
    } else if (sortMode === 'base') {
      deck = [...source].sort((a, b) => a.base_text.localeCompare(b.base_text, baseLangCode()));
    } else {
      deck = [...source];
    }
    const found = currentId === null ? -1 : deck.findIndex((r) => r.id === currentId);
    index = found >= 0 ? found : 0;
    revealed = false;
  }

  function go(delta) {
    if (deck.length === 0) return;
    // Wrap around so the deck is a loop in both directions.
    index = (index + delta + deck.length) % deck.length;
    revealed = false;
    draw();
  }

  function draw() {
    const card = deck[index];
    const frontText = swapped ? card.base_text : card.learning_text;
    const backText = swapped ? card.learning_text : card.base_text;
    const frontLang = swapped ? baseLang : learningLang;
    const backLang = swapped ? learningLang : baseLang;
    const frontCode = swapped ? baseLangCode() : learningLangCode();

    body.innerHTML = `
      <div class="fc-stage">
        <button class="fc-arrow" id="fc-prev" title="Previous card (←)" aria-label="Previous card">‹</button>

        <div class="fc-card ${revealed ? 'revealed' : ''}" id="fc-card" role="button" tabindex="0"
             title="Tap to ${revealed ? 'hide' : 'reveal'} the ${escapeHtml(backLang)} word">
          <span class="fc-lang-chip">${escapeHtml(frontLang)}</span>
          <div class="fc-front">${escapeHtml(frontText)}</div>
          <div class="fc-divider"></div>
          <div class="fc-back">
            ${revealed
              ? `<span class="fc-back-text">${escapeHtml(backText)}</span>
                 <span class="fc-lang-label">${escapeHtml(backLang)}</span>`
              : '<span class="fc-tap-hint">Tap to reveal</span>'}
          </div>
        </div>

        <button class="fc-arrow" id="fc-next" title="Next card (→)" aria-label="Next card">›</button>
      </div>

      <div class="fc-meta">
        <span class="fc-counter">${index + 1} / ${deck.length}</span>
        ${canSpeak() ? `<button class="btn btn-ghost btn-small" id="fc-speak">🔊 Hear it</button>` : ''}
        ${card.part_of_speech ? `<span class="pos-chip">${escapeHtml(card.part_of_speech)}</span>` : ''}
      </div>

      <div class="card fc-settings">
        <h3>Settings</h3>
        <div class="fc-settings-row">
          <button class="btn btn-ghost btn-small" id="fc-swap">
            🔁 Swap languages <span class="muted">(front: ${escapeHtml(frontLang)})</span>
          </button>
          <label class="checkbox-row fc-shuffle-row">
            <input type="checkbox" id="fc-shuffle" ${shuffle ? 'checked' : ''} />
            Shuffle mode
          </label>
          ${shuffle ? '<button class="btn btn-ghost btn-small" id="fc-reshuffle">🎲 Re-shuffle</button>' : ''}
        </div>
        <div class="fc-settings-row">
          <button class="btn btn-ghost btn-small ${!shuffle && sortMode === 'list' ? 'active-sort' : ''}" id="fc-sort-list">
            Learning-list order
          </button>
          <button class="btn btn-ghost btn-small ${!shuffle && sortMode === 'learning' ? 'active-sort' : ''}" id="fc-sort-learning">
            A→Z by ${escapeHtml(learningLang)}
          </button>
          <button class="btn btn-ghost btn-small ${!shuffle && sortMode === 'base' ? 'active-sort' : ''}" id="fc-sort-base">
            A→Z by ${escapeHtml(baseLang)}
          </button>
        </div>
        ${shuffle ? '<p class="muted">Shuffle is on, so the sort options are paused until you turn it off.</p>' : ''}
      </div>
    `;

    const cardEl = body.querySelector('#fc-card');
    cardEl.onclick = () => { revealed = !revealed; draw(); };
    cardEl.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); revealed = !revealed; draw(); }
    };

    // Swipe right -> next card, swipe left -> previous card. Tracked on
    // both touch and mouse so it works on a desktop browser too.
    let startX = null;
    const onStart = (x) => { startX = x; };
    const onEnd = (x) => {
      if (startX === null) return;
      const delta = x - startX;
      startX = null;
      if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
      go(delta > 0 ? 1 : -1);
    };
    cardEl.addEventListener('touchstart', (e) => onStart(e.changedTouches[0].clientX), { passive: true });
    cardEl.addEventListener('touchend', (e) => onEnd(e.changedTouches[0].clientX), { passive: true });
    cardEl.addEventListener('mousedown', (e) => onStart(e.clientX));
    cardEl.addEventListener('mouseup', (e) => onEnd(e.clientX));

    body.querySelector('#fc-prev').onclick = () => go(-1);
    body.querySelector('#fc-next').onclick = () => go(1);

    const speakBtn = body.querySelector('#fc-speak');
    if (speakBtn) {
      speakBtn.onclick = (e) => {
        e.stopPropagation();
        stopSpeaking();
        speak(frontText, { lang: frontCode }).catch((err) => toast(err.message, 'error'));
      };
    }

    body.querySelector('#fc-swap').onclick = () => { swapped = !swapped; revealed = false; draw(); };
    body.querySelector('#fc-shuffle').onchange = (e) => {
      shuffle = e.target.checked;
      applyOrder({ keepCurrent: !shuffle });
      draw();
    };
    const reshuffleBtn = body.querySelector('#fc-reshuffle');
    if (reshuffleBtn) reshuffleBtn.onclick = () => { applyOrder(); draw(); };

    const setSort = (mode) => () => {
      sortMode = mode;
      if (shuffle) {
        shuffle = false; // choosing a sort implies turning shuffle off
      }
      applyOrder({ keepCurrent: true });
      draw();
    };
    body.querySelector('#fc-sort-list').onclick = setSort('list');
    body.querySelector('#fc-sort-learning').onclick = setSort('learning');
    body.querySelector('#fc-sort-base').onclick = setSort('base');
  }

  const onKeyDown = (e) => {
    if (deck.length === 0) return;
    if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
  };
  window.addEventListener('keydown', onKeyDown);

  try {
    const { data } = await api.listRecords('Learning');
    // A flash card needs two sides, so entries still missing a translation
    // can't be shown - call that out rather than silently dropping them.
    source = data.records.filter((r) => r.base_text && r.learning_text);
    const skipped = data.records.length - source.length;

    if (source.length === 0) {
      body.innerHTML = `<p class="muted">
        No cards yet. Your <strong>Learning</strong> list needs entries that have both a
        ${escapeHtml(baseLang)} word and a ${escapeHtml(learningLang)} translation.
        Add or translate some in <a href="#/words">My Words</a>.
      </p>`;
    } else {
      applyOrder();
      draw();
      if (skipped > 0) {
        toast(`${skipped} entr${skipped === 1 ? 'y' : 'ies'} skipped - no translation yet.`, 'info');
      }
    }
  } catch (err) {
    body.innerHTML = `<p class="muted">Failed to load: ${escapeHtml(err.message)}</p>`;
  }

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    stopSpeaking();
  };
}
