// "Words of the Day": one word per part of speech (noun, verb, adjective),
// drawn at random from the Learn list.
//
// The pick is seeded from today's date so the words stay the same all day
// (that's what makes them words of *the day*) - "Pick again" re-rolls with a
// throwaway seed for anyone who wants a fresh set right now.

import { api } from '../api.js';
import { showPanel, backLink } from '../panels.js';
import { baseLanguage, learningLanguage, learningLangCode } from '../state.js';
import { escapeHtml, toast } from '../ui.js';
import { canSpeak, speak, stopSpeaking } from '../speech.js';

const SECTIONS = ['noun', 'verb', 'adjective'];

// Small deterministic string hash, so a given (date, part of speech) pair
// always lands on the same index of the list.
function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function renderWordsOfTheDay() {
  const panel = showPanel('page-words-of-the-day');
  const learningLang = learningLanguage();
  const baseLang = baseLanguage();

  panel.innerHTML = `
    ${backLink('/', 'Home')}
    <header class="page-header">
      <h1>🗓️ Words of the Day</h1>
      <p class="muted">Today's picks from your <strong>Learn</strong> list, one per part of speech.</p>
    </header>
    <div id="wotd-cards"><p class="muted">Loading…</p></div>
    <div class="page-actions">
      <button id="wotd-reroll" class="btn btn-ghost">🎲 Pick again</button>
    </div>
  `;

  const cardsEl = panel.querySelector('#wotd-cards');
  let records = [];
  let seed = todayKey();

  function draw() {
    cardsEl.innerHTML = SECTIONS.map((pos) => {
      const matches = records.filter(
        (r) => String(r.part_of_speech || '').toLowerCase() === pos
      );
      if (matches.length === 0) {
        return `
          <div class="wotd-card empty">
            <span class="wotd-pos">${pos}</span>
            <p class="muted">
              No ${pos} in your Learn list yet. Add one (or set a part of speech on an
              existing word) from <a href="#/words">My Words</a>.
            </p>
          </div>`;
      }
      const record = matches[hashString(`${seed}:${pos}`) % matches.length];
      const translated = record.learning_text
        ? escapeHtml(record.learning_text)
        : '<em class="muted">no translation yet</em>';
      return `
        <div class="wotd-card">
          <span class="wotd-pos">${pos}</span>
          <div class="wotd-learning">
            <span class="wotd-word">${translated}</span>
            ${record.learning_text && canSpeak()
              ? `<button class="btn btn-ghost btn-small wotd-speak" data-text="${escapeHtml(record.learning_text)}" title="Hear it in ${escapeHtml(learningLang)}">🔊</button>`
              : ''}
          </div>
          <span class="wotd-lang-label">${escapeHtml(learningLang)}</span>
          <div class="wotd-base">${escapeHtml(record.base_text)}</div>
          <span class="wotd-lang-label">${escapeHtml(baseLang)}</span>
        </div>`;
    }).join('');

    cardsEl.querySelectorAll('.wotd-speak').forEach((btn) => {
      btn.onclick = () => {
        stopSpeaking();
        speak(btn.getAttribute('data-text'), { lang: learningLangCode() }).catch((err) =>
          toast(err.message, 'error')
        );
      };
    });
  }

  try {
    const { data } = await api.listRecords('Learn');
    records = data.records;
    if (records.length === 0) {
      cardsEl.innerHTML =
        '<p class="muted">Your Learn list is empty. Add some words from <a href="#/words">My Words</a> first.</p>';
    } else {
      draw();
    }
  } catch (err) {
    cardsEl.innerHTML = `<p class="muted">Failed to load: ${escapeHtml(err.message)}</p>`;
  }

  panel.querySelector('#wotd-reroll').onclick = () => {
    seed = `${Math.random()}`;
    if (records.length) draw();
  };

  return () => stopSpeaking();
}
