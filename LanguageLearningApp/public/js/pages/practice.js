// Practice: conjugation drills, speaking practice and listen-along
// vocabulary. The index lists the three groups; each drill is a sub-route
// under /practice/:section.

import { api } from '../api.js';
import { showPanel, backLink } from '../panels.js';
import { baseLanguage, learningLanguage, learningLangCode, baseLangCode } from '../state.js';
import { escapeHtml, toast } from '../ui.js';
import { canSpeak, speak, speakSequence, startListening, stopSpeaking } from '../speech.js';
import { INPUT_MODES, resolveInputMode, modeExplanation, recordAnswer } from '../voiceInput.js';
import { PRONOUNS, TENSES, VERB_BANK, conjugate, conjugationTable, isSpanish } from '../conjugation.js';
import { ARTICLE_ITEMS, ARTICLE_CHOICES, SUBJECT_PRONOUN_ITEMS, OBJECT_PRONOUN_ITEMS, TONGUE_TWISTERS } from '../practiceContent.js';
import { compareAnswer, containsPhrase, tokenOverlap } from '../textMatch.js';
import { renderNumbersGame } from './numbersGame.js';

const GROUPS = [
  {
    title: 'Conjugation',
    icon: '🔀',
    items: [
      { id: 'conjugation-verbs', title: 'Verbs', blurb: 'Conjugate regular and common irregular verbs across four tenses.' },
      { id: 'conjugation-nouns', title: 'Nouns / pronouns', blurb: 'Article agreement (el/la/los/las) and subject pronoun recall.' },
      { id: 'conjugation-objects', title: 'Direct / indirect objects', blurb: 'Replace objects with the right pronoun — lo, la, le, se lo…' },
    ],
  },
  {
    title: 'Speaking',
    icon: '🗣️',
    items: [
      { id: 'speaking-numbers', title: 'Numbers', blurb: 'Say the number on screen out loud. Untimed practice.' },
      { id: 'speaking-words', title: 'Words / phrases', blurb: 'Say the translation of words from your own lists.' },
      { id: 'speaking-twisters', title: 'Tongue twisters', blurb: 'Hear a twister, then try it yourself.' },
    ],
  },
  {
    title: 'Listening',
    icon: '🎧',
    items: [
      { id: 'listening', title: 'Read my lists aloud', blurb: 'Plays each word and its translation. Optionally grouped by part of speech.' },
    ],
  },
];

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Shown at the top of the Spanish-specific drills when the user is
// learning something else.
function languageNotice() {
  if (isSpanish(learningLangCode())) return '';
  return `<p class="notice">
    These drills are written for <strong>Spanish</strong> grammar. You're currently learning
    <strong>${escapeHtml(learningLanguage())}</strong>, so treat them as reference only —
    or switch your learning language in <a href="#/settings">Settings</a>.
  </p>`;
}

// ---------------------------------------------------------------- index

export function renderPractice() {
  const panel = showPanel('page-practice');
  panel.innerHTML = `
    ${backLink('/', 'Home')}
    <header class="page-header">
      <h1>🏋️ Practice</h1>
      <p class="muted">Low-pressure drills. Nothing here is scored against you.</p>
    </header>
    ${GROUPS.map(
      (group) => `
      <section class="practice-group">
        <h2>${group.icon} ${group.title}</h2>
        <div class="sub-grid">
          ${group.items
            .map(
              (item) => `
            <a class="sub-tile" href="#/practice/${item.id}">
              <span class="sub-tile-title">${item.title}</span>
              <span class="sub-tile-blurb">${item.blurb}</span>
            </a>`
            )
            .join('')}
        </div>
      </section>`
    ).join('')}
  `;
}

// --------------------------------------------------------- section router

export function renderPracticeSection(sectionId) {
  const panel = showPanel('page-practice');
  const item = GROUPS.flatMap((g) => g.items).find((i) => i.id === sectionId);
  if (!item) {
    panel.innerHTML = `
      ${backLink('/practice', 'Practice')}
      <p class="muted">That practice section doesn't exist.</p>`;
    return undefined;
  }

  panel.innerHTML = `
    ${backLink('/practice', 'Practice')}
    <header class="page-header">
      <h1>${item.title}</h1>
      <p class="muted">${item.blurb}</p>
    </header>
    <div id="practice-body"></div>
  `;
  const body = panel.querySelector('#practice-body');

  switch (sectionId) {
    case 'conjugation-verbs': return renderVerbDrill(body);
    case 'conjugation-nouns': return renderNounDrill(body);
    case 'conjugation-objects': return renderObjectDrill(body);
    case 'speaking-numbers':
      return renderNumbersGame(body, { timed: false, backRoute: '/practice', backLabel: 'Practice' });
    case 'speaking-words': return renderSpeakingWords(body);
    case 'speaking-twisters': return renderTongueTwisters(body);
    case 'listening': return renderListening(body);
    default: return undefined;
  }
}

// ------------------------------------------------------- verb conjugation

function renderVerbDrill(body) {
  let tenseFilter = 'mixed';
  let verbFilter = 'all';
  let showTable = false;
  let question = null;
  let correct = 0;
  let asked = 0;

  function pickQuestion() {
    const pool = VERB_BANK.filter((v) => {
      if (verbFilter === 'regular') return !v.irregular;
      if (verbFilter === 'irregular') return v.irregular;
      return true;
    });
    const verb = randomItem(pool);
    const tense = tenseFilter === 'mixed' ? randomItem(TENSES) : TENSES.find((t) => t.id === tenseFilter);
    const personIndex = Math.floor(Math.random() * PRONOUNS.length);
    question = {
      verb,
      tense,
      personIndex,
      answer: conjugate(verb.infinitive, tense.id, personIndex),
    };
  }

  function draw({ feedback = '' } = {}) {
    const pronoun = PRONOUNS[question.personIndex];
    body.innerHTML = `
      ${languageNotice()}
      <div class="card">
        <div class="drill-controls">
          <label>Tense
            <select id="vd-tense">
              <option value="mixed" ${tenseFilter === 'mixed' ? 'selected' : ''}>Mixed</option>
              ${TENSES.map((t) => `<option value="${t.id}" ${tenseFilter === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </label>
          <label>Verbs
            <select id="vd-verbs">
              <option value="all" ${verbFilter === 'all' ? 'selected' : ''}>All</option>
              <option value="regular" ${verbFilter === 'regular' ? 'selected' : ''}>Regular only</option>
              <option value="irregular" ${verbFilter === 'irregular' ? 'selected' : ''}>Irregular only</option>
            </select>
          </label>
          <span class="drill-score">${correct} / ${asked} correct</span>
        </div>

        <div class="drill-prompt">
          <span class="drill-tense-chip">${escapeHtml(question.tense.label)}</span>
          ${question.verb.irregular ? '<span class="drill-irregular-chip">irregular</span>' : ''}
          <div class="drill-question">
            <strong>${escapeHtml(pronoun.label)}</strong>
            <span class="drill-blank">______</span>
          </div>
          <p class="muted">
            ${escapeHtml(question.verb.infinitive)} — ${escapeHtml(question.verb.gloss)} ·
            ${escapeHtml(pronoun.gloss)} · ${escapeHtml(question.tense.gloss)}
          </p>
        </div>

        <div class="drill-answer-row">
          <input type="text" id="vd-input" placeholder="Type the conjugated form" autocomplete="off" autocapitalize="off" spellcheck="false" />
          <button id="vd-check" class="btn btn-ghost">Check</button>
          <button id="vd-next" class="btn btn-ghost">Next →</button>
        </div>

        <div class="drill-feedback">${feedback}</div>

        <div class="drill-extras">
          <button id="vd-table-toggle" class="btn btn-ghost btn-small">
            ${showTable ? 'Hide' : 'Show'} full table
          </button>
          ${canSpeak() ? '<button id="vd-hear" class="btn btn-ghost btn-small">🔊 Hear the answer</button>' : ''}
        </div>

        ${showTable ? renderTable() : ''}
      </div>
    `;

    const input = body.querySelector('#vd-input');
    input.focus();
    input.onkeydown = (e) => { if (e.key === 'Enter') check(); };
    body.querySelector('#vd-check').onclick = check;
    body.querySelector('#vd-next').onclick = () => { pickQuestion(); draw(); };
    body.querySelector('#vd-tense').onchange = (e) => { tenseFilter = e.target.value; pickQuestion(); draw(); };
    body.querySelector('#vd-verbs').onchange = (e) => { verbFilter = e.target.value; pickQuestion(); draw(); };
    body.querySelector('#vd-table-toggle').onclick = () => { showTable = !showTable; draw({ feedback: '' }); };
    const hearBtn = body.querySelector('#vd-hear');
    if (hearBtn) {
      hearBtn.onclick = () => {
        stopSpeaking();
        speak(`${PRONOUNS[question.personIndex].label.split(' / ')[0]} ${question.answer}`, { lang: learningLangCode() })
          .catch((err) => toast(err.message, 'error'));
      };
    }
  }

  function renderTable() {
    const rows = conjugationTable(question.verb.infinitive, question.tense.id);
    return `
      <table class="conj-table">
        <caption>${escapeHtml(question.verb.infinitive)} — ${escapeHtml(question.tense.label)}</caption>
        <tbody>
          ${rows
            .map(
              (row) => `<tr><th>${escapeHtml(row.pronoun)}</th><td>${escapeHtml(row.form || '—')}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>`;
  }

  function check() {
    const given = body.querySelector('#vd-input').value.trim();
    if (!given) return;
    asked += 1;
    const verdict = compareAnswer(given, question.answer);
    if (verdict === 'exact') {
      correct += 1;
      draw({ feedback: `<span class="fb-right">✅ Correct — <strong>${escapeHtml(question.answer)}</strong></span>` });
      setTimeout(() => { pickQuestion(); draw(); }, 900);
    } else if (verdict === 'accent') {
      correct += 1;
      draw({ feedback: `<span class="fb-close">🟡 Right form, mind the accent: <strong>${escapeHtml(question.answer)}</strong></span>` });
    } else {
      draw({ feedback: `<span class="fb-wrong">❌ Not quite — the answer is <strong>${escapeHtml(question.answer)}</strong></span>` });
    }
  }

  pickQuestion();
  draw();
  return () => stopSpeaking();
}

// ------------------------------------------------- nouns / subject pronouns

function renderNounDrill(body) {
  let mode = 'articles'; // 'articles' | 'pronouns'
  let item = null;
  let correct = 0;
  let asked = 0;

  function pick() {
    item = mode === 'articles' ? randomItem(ARTICLE_ITEMS) : randomItem(SUBJECT_PRONOUN_ITEMS);
  }

  function draw({ feedback = '' } = {}) {
    body.innerHTML = `
      ${languageNotice()}
      <div class="card">
        <div class="drill-controls">
          <label>Drill
            <select id="nd-mode">
              <option value="articles" ${mode === 'articles' ? 'selected' : ''}>Definite articles</option>
              <option value="pronouns" ${mode === 'pronouns' ? 'selected' : ''}>Subject pronouns</option>
            </select>
          </label>
          <span class="drill-score">${correct} / ${asked} correct</span>
        </div>

        ${mode === 'articles'
          ? `<div class="drill-prompt">
              <div class="drill-question">
                <span class="drill-blank">____</span> ${escapeHtml(item.noun)}
              </div>
              <p class="muted">“${escapeHtml(item.gloss)}” — pick the definite article.</p>
            </div>
            <div class="choice-row">
              ${ARTICLE_CHOICES.map((c) => `<button class="btn btn-ghost choice-btn" data-choice="${c}">${c}</button>`).join('')}
            </div>`
          : `<div class="drill-prompt">
              <div class="drill-question">${escapeHtml(item.prompt)}</div>
              <p class="muted">Type the ${escapeHtml(learningLanguage())} subject pronoun.</p>
            </div>
            <div class="drill-answer-row">
              <input type="text" id="nd-input" placeholder="Subject pronoun" autocomplete="off" spellcheck="false" />
              <button id="nd-check" class="btn btn-ghost">Check</button>
            </div>`}

        <div class="drill-feedback">${feedback}</div>
        <div class="drill-extras">
          <button id="nd-next" class="btn btn-ghost btn-small">Next →</button>
        </div>
      </div>
    `;

    body.querySelector('#nd-mode').onchange = (e) => {
      mode = e.target.value;
      correct = 0;
      asked = 0;
      pick();
      draw();
    };
    body.querySelector('#nd-next').onclick = () => { pick(); draw(); };

    if (mode === 'articles') {
      body.querySelectorAll('.choice-btn').forEach((btn) => {
        btn.onclick = () => grade(btn.getAttribute('data-choice'));
      });
    } else {
      const input = body.querySelector('#nd-input');
      input.focus();
      input.onkeydown = (e) => { if (e.key === 'Enter') grade(input.value.trim()); };
      body.querySelector('#nd-check').onclick = () => grade(input.value.trim());
    }
  }

  function grade(given) {
    if (!given) return;
    asked += 1;
    const verdict = compareAnswer(given, item.answer);
    const note = item.note ? `<br /><span class="muted">${escapeHtml(item.note)}</span>` : '';
    if (verdict === 'exact' || verdict === 'accent') {
      correct += 1;
      draw({ feedback: `<span class="fb-right">✅ <strong>${escapeHtml(item.answer)}</strong> is right.${note}</span>` });
      setTimeout(() => { pick(); draw(); }, 1100);
    } else {
      draw({ feedback: `<span class="fb-wrong">❌ It's <strong>${escapeHtml(item.answer)}</strong>.${note}</span>` });
    }
  }

  pick();
  draw();
  return undefined;
}

// --------------------------------------------------------- object pronouns

function renderObjectDrill(body) {
  let typeFilter = 'all';
  let item = null;
  let correct = 0;
  let asked = 0;

  function pick() {
    const pool = typeFilter === 'all'
      ? OBJECT_PRONOUN_ITEMS
      : OBJECT_PRONOUN_ITEMS.filter((i) => i.type === typeFilter);
    item = randomItem(pool);
  }

  function draw({ feedback = '' } = {}) {
    const typeLabel = { direct: 'direct object', indirect: 'indirect object', both: 'both objects' }[item.type];
    body.innerHTML = `
      ${languageNotice()}
      <div class="card">
        <div class="drill-controls">
          <label>Focus
            <select id="od-type">
              <option value="all" ${typeFilter === 'all' ? 'selected' : ''}>All</option>
              <option value="direct" ${typeFilter === 'direct' ? 'selected' : ''}>Direct objects</option>
              <option value="indirect" ${typeFilter === 'indirect' ? 'selected' : ''}>Indirect objects</option>
              <option value="both" ${typeFilter === 'both' ? 'selected' : ''}>Both together</option>
            </select>
          </label>
          <span class="drill-score">${correct} / ${asked} correct</span>
        </div>

        <div class="drill-prompt">
          <span class="drill-tense-chip">${escapeHtml(typeLabel)}</span>
          <div class="drill-question">${escapeHtml(item.sentence)}</div>
          <p class="muted">
            “${escapeHtml(item.gloss)}” — rewrite it, replacing the ${escapeHtml(typeLabel)} with a pronoun.
          </p>
        </div>

        <div class="drill-answer-row">
          <input type="text" id="od-input" placeholder="Rewritten sentence" autocomplete="off" spellcheck="false" />
          <button id="od-check" class="btn btn-ghost">Check</button>
          <button id="od-next" class="btn btn-ghost">Next →</button>
        </div>

        <div class="drill-feedback">${feedback}</div>
      </div>
    `;

    const input = body.querySelector('#od-input');
    input.focus();
    input.onkeydown = (e) => { if (e.key === 'Enter') grade(input.value.trim()); };
    body.querySelector('#od-check').onclick = () => grade(input.value.trim());
    body.querySelector('#od-next').onclick = () => { pick(); draw(); };
    body.querySelector('#od-type').onchange = (e) => {
      typeFilter = e.target.value;
      pick();
      draw();
    };
  }

  function grade(given) {
    if (!given) return;
    asked += 1;
    const verdict = compareAnswer(given, item.answer);
    const note = item.note ? `<br /><span class="muted">${escapeHtml(item.note)}</span>` : '';
    if (verdict === 'exact' || verdict === 'accent') {
      correct += 1;
      draw({ feedback: `<span class="fb-right">✅ <strong>${escapeHtml(item.answer)}</strong>${note}</span>` });
      setTimeout(() => { pick(); draw(); }, 1200);
    } else if (containsPhrase(given, item.pronoun)) {
      draw({
        feedback: `<span class="fb-close">🟡 Right pronoun, but word order matters: <strong>${escapeHtml(item.answer)}</strong>${note}</span>`,
      });
    } else {
      draw({ feedback: `<span class="fb-wrong">❌ The answer is <strong>${escapeHtml(item.answer)}</strong>${note}</span>` });
    }
  }

  pick();
  draw();
  return undefined;
}

// --------------------------------------------------- speaking words/phrases

function renderSpeakingWords(body) {
  const langCode = learningLangCode();
  const langName = learningLanguage();
  let listName = 'Learning';
  let records = [];
  let item = null;
  let listener = null;
  let recorder = null;
  let recorderState = null;
  let inputMode = INPUT_MODES.TYPED;
  let modeNote = '';
  let correct = 0;
  let asked = 0;
  let solved = false;
  let torndown = false;

  function stopMic() {
    if (listener) {
      listener.stop();
      listener = null;
    }
  }

  function stopRecorder() {
    if (recorder) {
      recorder.cancel();
      recorder = null;
    }
    recorderState = null;
  }

  function pick() {
    item = randomItem(records);
    solved = false;
    stopRecorder();
  }

  async function refreshInputMode() {
    inputMode = await resolveInputMode();
    modeNote = await modeExplanation(inputMode);
  }

  async function load() {
    body.innerHTML = '<p class="muted">Loading…</p>';
    try {
      await refreshInputMode();
      const { data } = await api.listRecords(listName);
      records = data.records.filter((r) => r.base_text && r.learning_text);
      if (records.length === 0) {
        body.innerHTML = `
          ${listSelector()}
          <p class="muted">
            No translated entries in <strong>${escapeHtml(listName)}</strong> yet.
            Add some in <a href="#/words">My Words</a>.
          </p>`;
        wireListSelector();
        return;
      }
      pick();
      draw();
    } catch (err) {
      body.innerHTML = `<p class="muted">Failed to load: ${escapeHtml(err.message)}</p>`;
    }
  }

  function listSelector() {
    return `
      <div class="drill-controls">
        <label>List
          <select id="sw-list">
            ${['Learn', 'Learning', 'Learned']
              .map((l) => `<option value="${l}" ${l === listName ? 'selected' : ''}>${l}</option>`)
              .join('')}
          </select>
        </label>
        <span class="drill-score">${correct} / ${asked} correct</span>
      </div>`;
  }

  function wireListSelector() {
    const select = body.querySelector('#sw-list');
    if (!select) return;
    select.onchange = (e) => {
      listName = e.target.value;
      correct = 0;
      asked = 0;
      stopMic();
      load();
    };
  }

  function inputControls() {
    if (inputMode === INPUT_MODES.LIVE) {
      return `
        <div class="mic-row">
          <button id="sw-mic" class="btn ${listener ? 'btn-danger' : 'btn-primary'} mic-btn">
            ${listener ? '⏹ Stop listening' : '🎤 Start listening'}
          </button>
          ${listener ? '<span class="muted">Listening…</span>' : ''}
        </div>`;
    }
    if (inputMode === INPUT_MODES.RECORD) {
      if (recorderState === 'transcribing') {
        return '<div class="mic-row"><span class="ng-recording-dot transcribing"></span><span class="muted">Transcribing your answer…</span></div>';
      }
      if (recorderState === 'recording') {
        return `
          <div class="mic-row">
            <button id="sw-record-stop" class="btn btn-danger mic-btn">⏹ Stop &amp; check</button>
            <span class="ng-recording-dot"></span>
            <span class="muted">Recording…</span>
          </div>`;
      }
      return `
        <div class="mic-row">
          <button id="sw-record-start" class="btn btn-primary mic-btn">🎙️ Record my answer</button>
        </div>`;
    }
    return `
      <div class="drill-answer-row">
        <input type="text" id="sw-input" placeholder="Type the translation" autocomplete="off" spellcheck="false" />
        <button id="sw-check" class="btn btn-ghost">Check</button>
      </div>`;
  }

  function draw({ feedback = '' } = {}) {
    body.innerHTML = `
      <div class="card">
        ${listSelector()}

        <div class="drill-prompt">
          <p class="muted">Say this in <strong>${escapeHtml(langName)}</strong></p>
          <div class="drill-question">${escapeHtml(item.base_text)}</div>
          ${item.part_of_speech ? `<span class="pos-chip">${escapeHtml(item.part_of_speech)}</span>` : ''}
        </div>

        ${modeNote ? `<p class="notice">${escapeHtml(modeNote)}</p>` : ''}
        ${inputControls()}

        <div class="drill-feedback">${feedback}</div>

        <div class="drill-extras">
          <button id="sw-reveal" class="btn btn-ghost btn-small">Show answer</button>
          ${canSpeak() ? '<button id="sw-hear" class="btn btn-ghost btn-small">🔊 Hear it</button>' : ''}
          <button id="sw-next" class="btn btn-ghost btn-small">Next →</button>
        </div>
      </div>
    `;

    wireListSelector();

    const micBtn = body.querySelector('#sw-mic');
    if (micBtn) micBtn.onclick = () => (listener ? (stopMic(), draw()) : startMic());

    const recStart = body.querySelector('#sw-record-start');
    if (recStart) recStart.onclick = beginRecording;
    const recStop = body.querySelector('#sw-record-stop');
    if (recStop) recStop.onclick = finishRecording;

    const input = body.querySelector('#sw-input');
    if (input) {
      input.focus();
      input.onkeydown = (e) => { if (e.key === 'Enter') grade(input.value.trim()); };
      body.querySelector('#sw-check').onclick = () => grade(input.value.trim());
    }

    body.querySelector('#sw-reveal').onclick = () => {
      draw({ feedback: `<span class="fb-reveal">${escapeHtml(item.learning_text)}</span>` });
    };
    body.querySelector('#sw-next').onclick = () => { pick(); draw(); };
    const hearBtn = body.querySelector('#sw-hear');
    if (hearBtn) {
      hearBtn.onclick = () => {
        stopSpeaking();
        speak(item.learning_text, { lang: langCode }).catch((err) => toast(err.message, 'error'));
      };
    }
  }

  function startMic() {
    listener = startListening({
      lang: langCode,
      onResult: ({ transcript }) => {
        if (solved) return;
        if (compareAnswer(transcript.trim(), item.learning_text) !== 'no' || containsPhrase(transcript, item.learning_text)) {
          grade(transcript.trim(), { fromMic: true });
        } else {
          const el = body.querySelector('.drill-feedback');
          if (el) el.innerHTML = `<span class="fb-heard">heard: “${escapeHtml(transcript.trim())}”</span>`;
        }
      },
      onError: async (err) => {
        stopMic();
        if (err.fatal) {
          await refreshInputMode();
          if (torndown) return;
          toast(`${err.message} Switched to ${inputMode === INPUT_MODES.RECORD ? 'record & transcribe' : 'typed answers'}.`, 'info');
        } else {
          toast(err.message, 'error');
        }
        draw();
      },
    });
    draw();
  }

  async function beginRecording() {
    try {
      recorder = await recordAnswer({
        languageName: langName,
        onState: (state) => {
          recorderState = state;
          if (!torndown) draw();
        },
      });
    } catch (err) {
      recorder = null;
      recorderState = null;
      toast(err.message, 'error');
      inputMode = INPUT_MODES.TYPED;
      modeNote = await modeExplanation(INPUT_MODES.TYPED);
      if (!torndown) draw();
    }
  }

  async function finishRecording() {
    if (!recorder) return;
    const handle = recorder;
    recorder = null;
    try {
      const { transcript } = await handle.stop();
      recorderState = null;
      if (torndown) return;
      if (!transcript) {
        draw({ feedback: '<span class="fb-wrong">Didn\'t catch that — try recording again.</span>' });
        return;
      }
      grade(transcript, { fromMic: true, showHeard: true });
    } catch (err) {
      recorderState = null;
      if (torndown) return;
      draw({ feedback: `<span class="fb-wrong">${escapeHtml(err.message)}</span>` });
    }
  }

  // `fromMic` suppresses the "wrong" verdict for live recognition, where
  // interim results stream in constantly. A finished recording is a
  // deliberate submission, so `showHeard` opts back into feedback.
  function grade(given, { fromMic = false, showHeard = false } = {}) {
    if (!given || solved) return;
    asked += 1;
    const verdict = compareAnswer(given, item.learning_text);
    if (verdict !== 'no' || containsPhrase(given, item.learning_text)) {
      solved = true;
      correct += 1;
      draw({ feedback: `<span class="fb-right">✅ ${escapeHtml(item.learning_text)}</span>` });
      setTimeout(() => {
        if (body.isConnected) { pick(); draw(); }
      }, 1200);
    } else if (!fromMic || showHeard) {
      draw({
        feedback:
          `<span class="fb-wrong">❌ It's <strong>${escapeHtml(item.learning_text)}</strong></span>` +
          (showHeard ? `<br /><span class="fb-heard">heard: “${escapeHtml(given)}”</span>` : ''),
      });
    }
  }

  load();
  return () => { torndown = true; stopMic(); stopRecorder(); stopSpeaking(); };
}

// ---------------------------------------------------------- tongue twisters

function renderTongueTwisters(body) {
  const langCode = learningLangCode();
  const langName = learningLanguage();
  let index = 0;
  let rate = 0.8;
  let listener = null;
  let recorder = null;
  let recorderState = null;
  let inputMode = INPUT_MODES.TYPED;
  let modeNote = '';
  let torndown = false;

  function stopMic() {
    if (listener) {
      listener.stop();
      listener = null;
    }
  }

  function stopRecorder() {
    if (recorder) {
      recorder.cancel();
      recorder = null;
    }
    recorderState = null;
  }

  async function refreshInputMode() {
    inputMode = await resolveInputMode();
    modeNote = await modeExplanation(inputMode);
  }

  function attemptControls() {
    if (inputMode === INPUT_MODES.LIVE) {
      return `<button id="tt-mic" class="btn ${listener ? 'btn-danger' : 'btn-ghost'}">
        ${listener ? '⏹ Stop' : '🎤 Try it yourself'}
      </button>`;
    }
    if (inputMode === INPUT_MODES.RECORD) {
      if (recorderState === 'transcribing') {
        return '<span class="ng-recording-dot transcribing"></span><span class="muted">Transcribing…</span>';
      }
      if (recorderState === 'recording') {
        return `<button id="tt-record-stop" class="btn btn-danger">⏹ Stop &amp; score</button>
          <span class="ng-recording-dot"></span>`;
      }
      return '<button id="tt-record-start" class="btn btn-ghost">🎙️ Record my attempt</button>';
    }
    return '';
  }

  function draw({ feedback = '' } = {}) {
    const twister = TONGUE_TWISTERS[index];
    body.innerHTML = `
      ${languageNotice()}
      <div class="card">
        <div class="drill-controls">
          <span class="drill-score">${index + 1} / ${TONGUE_TWISTERS.length}</span>
          <label>Speed
            <select id="tt-rate">
              <option value="0.6" ${rate === 0.6 ? 'selected' : ''}>Slow</option>
              <option value="0.8" ${rate === 0.8 ? 'selected' : ''}>Relaxed</option>
              <option value="1" ${rate === 1 ? 'selected' : ''}>Normal</option>
              <option value="1.3" ${rate === 1.3 ? 'selected' : ''}>Fast</option>
            </select>
          </label>
        </div>

        <div class="twister">${escapeHtml(twister.text)}</div>
        <p class="muted">“${escapeHtml(twister.gloss)}”</p>
        <p class="muted">Focus: ${escapeHtml(twister.focus)}</p>

        <div class="mic-row">
          ${canSpeak() ? '<button id="tt-hear" class="btn btn-primary">🔊 Hear it</button>' : ''}
          ${attemptControls()}
        </div>
        ${inputMode === INPUT_MODES.TYPED
          ? '<p class="notice">Attempts can\'t be scored here, so there\'s nothing to speak into — but you can still listen and repeat along.</p>'
          : modeNote ? `<p class="notice">${escapeHtml(modeNote)}</p>` : ''}

        <div class="drill-feedback">${feedback}</div>

        <div class="drill-extras">
          <button id="tt-prev" class="btn btn-ghost btn-small">← Previous</button>
          <button id="tt-next" class="btn btn-ghost btn-small">Next →</button>
        </div>
      </div>
    `;

    body.querySelector('#tt-rate').onchange = (e) => { rate = Number(e.target.value); draw(); };
    const hearBtn = body.querySelector('#tt-hear');
    if (hearBtn) {
      hearBtn.onclick = () => {
        stopSpeaking();
        speak(twister.text, { lang: langCode, rate }).catch((err) => toast(err.message, 'error'));
      };
    }
    const micBtn = body.querySelector('#tt-mic');
    if (micBtn) micBtn.onclick = () => (listener ? (stopMic(), draw()) : startMic());

    const recStart = body.querySelector('#tt-record-start');
    if (recStart) recStart.onclick = beginRecording;
    const recStop = body.querySelector('#tt-record-stop');
    if (recStop) recStop.onclick = finishRecording;

    const move = (delta) => {
      stopMic();
      stopRecorder();
      index = (index + delta + TONGUE_TWISTERS.length) % TONGUE_TWISTERS.length;
      draw();
    };
    body.querySelector('#tt-prev').onclick = () => move(-1);
    body.querySelector('#tt-next').onclick = () => move(1);
  }

  // Twisters are long, so grade on how many words came through rather than
  // demanding a perfect match.
  function scoreAttempt(transcript) {
    const twister = TONGUE_TWISTERS[index];
    const { ratio, missing } = tokenOverlap(transcript, twister.text);
    const percent = Math.round(ratio * 100);
    const verdict = percent >= 85 ? 'fb-right' : percent >= 60 ? 'fb-close' : 'fb-wrong';
    const missedNote = missing.length && percent < 100
      ? `<br /><span class="muted">Missed: ${escapeHtml(missing.slice(0, 6).join(', '))}</span>`
      : '';
    return `<span class="${verdict}">${percent}% of the words came through.${missedNote}</span>
      <br /><span class="fb-heard">heard: “${escapeHtml(transcript.trim())}”</span>`;
  }

  function startMic() {
    listener = startListening({
      lang: langCode,
      onResult: ({ transcript, isFinal }) => {
        if (!isFinal) return;
        const el = body.querySelector('.drill-feedback');
        if (el) el.innerHTML = scoreAttempt(transcript);
      },
      onError: async (err) => {
        stopMic();
        if (err.fatal) {
          await refreshInputMode();
          if (torndown) return;
          toast(`${err.message} Switched to ${inputMode === INPUT_MODES.RECORD ? 'record & transcribe' : 'listen-along only'}.`, 'info');
        } else {
          toast(err.message, 'error');
        }
        draw();
      },
    });
    draw();
  }

  async function beginRecording() {
    try {
      recorder = await recordAnswer({
        languageName: langName,
        // Twisters are a mouthful; allow a longer clip than a single word.
        maxMs: 20000,
        onState: (state) => {
          recorderState = state;
          if (!torndown) draw();
        },
      });
    } catch (err) {
      recorder = null;
      recorderState = null;
      toast(err.message, 'error');
      inputMode = INPUT_MODES.TYPED;
      modeNote = await modeExplanation(INPUT_MODES.TYPED);
      if (!torndown) draw();
    }
  }

  async function finishRecording() {
    if (!recorder) return;
    const handle = recorder;
    recorder = null;
    try {
      const { transcript } = await handle.stop();
      recorderState = null;
      if (torndown) return;
      draw({
        feedback: transcript
          ? scoreAttempt(transcript)
          : '<span class="fb-wrong">Didn\'t catch that — try recording again.</span>',
      });
    } catch (err) {
      recorderState = null;
      if (torndown) return;
      draw({ feedback: `<span class="fb-wrong">${escapeHtml(err.message)}</span>` });
    }
  }

  draw();
  refreshInputMode().then(() => { if (!torndown) draw(); });
  return () => { torndown = true; stopMic(); stopRecorder(); stopSpeaking(); };
}

// ------------------------------------------------------------- listening

function renderListening(body) {
  const learningCode = learningLangCode();
  const baseCode = baseLangCode();
  let listName = 'Learning';
  let groupByPos = true;
  let rate = 0.9;
  let records = [];
  let playback = null;
  let queue = [];

  function stopPlayback() {
    if (playback) {
      playback.cancel();
      playback = null;
    }
  }

  // Each entry is read as base word then translation, so the pairing is
  // obvious without looking at the screen.
  function buildQueue(items) {
    const parts = [];
    items.forEach((record, i) => {
      parts.push({ text: record.base_text, lang: baseCode, recordIndex: i, side: 'base' });
      parts.push({ text: record.learning_text, lang: learningCode, recordIndex: i, side: 'learning' });
    });
    return parts;
  }

  function groups() {
    if (!groupByPos) return [{ label: 'All entries', records }];
    const byPos = new Map();
    records.forEach((r) => {
      const key = r.part_of_speech || 'unspecified';
      if (!byPos.has(key)) byPos.set(key, []);
      byPos.get(key).push(r);
    });
    return [...byPos.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, list]) => ({ label, records: list }));
  }

  async function load() {
    body.innerHTML = '<p class="muted">Loading…</p>';
    try {
      const { data } = await api.listRecords(listName);
      records = data.records.filter((r) => r.base_text && r.learning_text);
      draw();
    } catch (err) {
      body.innerHTML = `<p class="muted">Failed to load: ${escapeHtml(err.message)}</p>`;
    }
  }

  function draw({ playingIndex = -1 } = {}) {
    const grouped = groups();
    body.innerHTML = `
      <div class="card">
        <div class="drill-controls">
          <label>List
            <select id="li-list">
              ${['Learn', 'Learning', 'Learned']
                .map((l) => `<option value="${l}" ${l === listName ? 'selected' : ''}>${l}</option>`)
                .join('')}
            </select>
          </label>
          <label>Speed
            <select id="li-rate">
              <option value="0.7" ${rate === 0.7 ? 'selected' : ''}>Slow</option>
              <option value="0.9" ${rate === 0.9 ? 'selected' : ''}>Relaxed</option>
              <option value="1" ${rate === 1 ? 'selected' : ''}>Normal</option>
            </select>
          </label>
          <label class="checkbox-row">
            <input type="checkbox" id="li-group" ${groupByPos ? 'checked' : ''} />
            Group by part of speech
          </label>
        </div>

        ${!canSpeak()
          ? '<p class="notice">This browser can\'t synthesize speech, so playback is unavailable.</p>'
          : ''}

        ${records.length === 0
          ? `<p class="muted">No translated entries in <strong>${escapeHtml(listName)}</strong> yet.
               Add some in <a href="#/words">My Words</a>.</p>`
          : grouped
              .map(
                (group) => `
            <div class="listen-group">
              <div class="listen-group-header">
                <h3>${escapeHtml(group.label)} <span class="muted">(${group.records.length})</span></h3>
                ${canSpeak()
                  ? `<button class="btn btn-ghost btn-small listen-play" data-group="${escapeHtml(group.label)}">▶ Play group</button>`
                  : ''}
              </div>
              <ul class="listen-list">
                ${group.records
                  .map((r) => {
                    const globalIndex = records.indexOf(r);
                    const active = playingIndex === globalIndex ? ' active' : '';
                    return `<li class="listen-item${active}">
                      <span class="listen-base">${escapeHtml(r.base_text)}</span>
                      <span class="listen-arrow">→</span>
                      <span class="listen-learning">${escapeHtml(r.learning_text)}</span>
                    </li>`;
                  })
                  .join('')}
              </ul>
            </div>`
              )
              .join('')}

        ${records.length && canSpeak()
          ? `<div class="drill-extras">
              <button id="li-play-all" class="btn btn-primary">▶ Play everything</button>
              <button id="li-stop" class="btn btn-ghost">⏹ Stop</button>
            </div>`
          : ''}
      </div>
    `;

    body.querySelector('#li-list').onchange = (e) => {
      stopPlayback();
      listName = e.target.value;
      load();
    };
    body.querySelector('#li-rate').onchange = (e) => { rate = Number(e.target.value); draw(); };
    body.querySelector('#li-group').onchange = (e) => { groupByPos = e.target.checked; draw(); };

    const playAll = body.querySelector('#li-play-all');
    if (playAll) playAll.onclick = () => play(records);
    const stopBtn = body.querySelector('#li-stop');
    if (stopBtn) stopBtn.onclick = () => { stopPlayback(); draw(); };

    body.querySelectorAll('.listen-play').forEach((btn) => {
      btn.onclick = () => {
        const label = btn.getAttribute('data-group');
        const group = grouped.find((g) => g.label === label);
        if (group) play(group.records);
      };
    });
  }

  function play(items) {
    stopPlayback();
    queue = buildQueue(items);
    // recordIndex is group-relative; map it back to the full list so the
    // highlight lines up with what's on screen.
    const globalIndexes = items.map((r) => records.indexOf(r));
    playback = speakSequence(queue, {
      rate,
      onIndex: (i) => {
        const part = queue[i];
        draw({ playingIndex: globalIndexes[part.recordIndex] });
      },
    });
    playback.promise
      .then(() => {
        if (playback) {
          playback = null;
          draw();
        }
      })
      .catch((err) => {
        toast(err.message, 'error');
        playback = null;
        draw();
      });
  }

  load();
  return () => stopPlayback();
}
