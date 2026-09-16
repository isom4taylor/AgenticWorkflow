// Quizzes: Listening (dictation), Speaking (the timed numbers game) and
// Refresher (write a sentence using a word you've learned). All three draw
// on the Learned list, since that's the vocabulary you've signed off on.

import { api } from '../api.js';
import { showPanel, backLink } from '../panels.js';
import { baseLanguage, learningLanguage, learningLangCode } from '../state.js';
import { escapeHtml, toast } from '../ui.js';
import { canSpeak, speak, stopSpeaking } from '../speech.js';
import { compareAnswer, containsPhrase, normalize, tokens } from '../textMatch.js';
import { renderNumbersGame } from './numbersGame.js';

const QUIZZES = [
  { id: 'listening', icon: '🎧', title: 'Listening', blurb: 'Hear a phrase built from your Learned words and type what it means.' },
  { id: 'speaking', icon: '🎤', title: 'Speaking', blurb: 'Say the number on screen before the timer runs out.' },
  { id: 'refresher', icon: '✍️', title: 'Refresher', blurb: 'Write a sentence using a word from your Learned list.' },
];

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function sample(list, count) {
  const copy = [...list];
  const picked = [];
  while (copy.length && picked.length < count) {
    picked.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return picked;
}

// ---------------------------------------------------------------- index

export function renderQuizzes() {
  const panel = showPanel('page-quizzes');
  panel.innerHTML = `
    ${backLink('/', 'Home')}
    <header class="page-header">
      <h1>❓ Quizzes</h1>
      <p class="muted">Scored challenges built from your <strong>Learned</strong> list.</p>
    </header>
    <div class="sub-grid">
      ${QUIZZES.map(
        (quiz) => `
        <a class="sub-tile" href="#/quizzes/${quiz.id}">
          <span class="sub-tile-icon">${quiz.icon}</span>
          <span class="sub-tile-title">${quiz.title}</span>
          <span class="sub-tile-blurb">${quiz.blurb}</span>
        </a>`
      ).join('')}
    </div>
  `;
}

export function renderQuiz(quizId) {
  const panel = showPanel('page-quizzes');
  const quiz = QUIZZES.find((q) => q.id === quizId);
  if (!quiz) {
    panel.innerHTML = `${backLink('/quizzes', 'Quizzes')}<p class="muted">That quiz doesn't exist.</p>`;
    return undefined;
  }

  panel.innerHTML = `
    ${backLink('/quizzes', 'Quizzes')}
    <header class="page-header">
      <h1>${quiz.icon} ${quiz.title}</h1>
      <p class="muted">${quiz.blurb}</p>
    </header>
    <div id="quiz-body"></div>
  `;
  const body = panel.querySelector('#quiz-body');

  switch (quizId) {
    case 'listening': return renderListeningQuiz(body);
    case 'speaking':
      return renderNumbersGame(body, { timed: true, backRoute: '/quizzes', backLabel: 'Quizzes' });
    case 'refresher': return renderRefresherQuiz(body);
    default: return undefined;
  }
}

// ------------------------------------------------------------- listening

// Sentence frames for building a phrase out of vocabulary. Grading only
// looks at the content words, so the frame wording never decides a score -
// which is what makes it safe to use frames at all with arbitrary
// vocabulary. Languages without frames fall back to a plain joined list.
const SENTENCE_FRAMES = {
  es: [
    { learning: 'Necesito {list}.', base: 'I need {list}.' },
    { learning: 'Veo {list}.', base: 'I see {list}.' },
    { learning: 'Tengo {list}.', base: 'I have {list}.' },
    { learning: 'Aquí hay {list}.', base: 'Here there is {list}.' },
    { learning: 'Quiero {list}.', base: 'I want {list}.' },
  ],
  en: [
    { learning: 'I need {list}.', base: 'I need {list}.' },
    { learning: 'I see {list}.', base: 'I see {list}.' },
    { learning: 'I have {list}.', base: 'I have {list}.' },
  ],
};

const LIST_CONNECTORS = { es: 'y', en: 'and' };

function joinWords(words, langCode) {
  const connector = LIST_CONNECTORS[String(langCode).slice(0, 2)];
  if (words.length === 1) return words[0];
  if (!connector) return words.join(', ');
  return `${words.slice(0, -1).join(', ')} ${connector} ${words[words.length - 1]}`;
}

function renderListeningQuiz(body) {
  const langCode = learningLangCode();
  const baseLang = baseLanguage();
  let records = [];
  let question = null;
  let score = 0;
  let asked = 0;

  function buildQuestion() {
    const picked = sample(records, Math.min(records.length, Math.random() < 0.5 ? 2 : 3));
    const learningWords = picked.map((r) => r.learning_text);
    const baseWords = picked.map((r) => r.base_text);
    const list = joinWords(learningWords, langCode);

    const frames = SENTENCE_FRAMES[String(langCode).slice(0, 2)];
    // Frames read naturally with nouns; anything else stays a plain list.
    const allNouns = picked.every((r) => String(r.part_of_speech || '').toLowerCase() === 'noun');
    if (frames && allNouns) {
      const frame = randomItem(frames);
      question = {
        records: picked,
        learningPhrase: frame.learning.replace('{list}', list),
        expectedHint: frame.base.replace('{list}', joinWords(baseWords, 'en')),
        baseWords,
      };
    } else {
      question = {
        records: picked,
        learningPhrase: list,
        expectedHint: joinWords(baseWords, 'en'),
        baseWords,
      };
    }
  }

  function playAudio() {
    stopSpeaking();
    speak(question.learningPhrase, { lang: langCode, rate: 0.85 }).catch((err) => toast(err.message, 'error'));
  }

  function draw({ feedback = '', revealed = false, answerText = '' } = {}) {
    body.innerHTML = `
      <div class="card">
        <div class="drill-controls">
          <span class="drill-score">${score} / ${asked} correct</span>
        </div>

        ${!canSpeak()
          ? '<p class="notice">This browser can\'t synthesize speech, so the phrase is shown as text instead.</p>'
          : ''}

        <div class="quiz-audio">
          ${canSpeak()
            ? '<button id="lq-play" class="btn btn-primary quiz-play-btn">🔊 Play the phrase</button><p class="muted">Replay it as many times as you need.</p>'
            : `<div class="drill-question">${escapeHtml(question.learningPhrase)}</div>`}
        </div>

        <label>What does it mean in ${escapeHtml(baseLang)}?
          <input type="text" id="lq-input" placeholder="Type the ${escapeHtml(baseLang)} translation" autocomplete="off" />
        </label>
        <div class="drill-answer-row">
          <button id="lq-check" class="btn btn-ghost">Check</button>
          <button id="lq-reveal" class="btn btn-ghost">${revealed ? 'Hide answer' : 'Show answer'}</button>
          <button id="lq-next" class="btn btn-ghost">Next →</button>
        </div>

        <div class="drill-feedback">${feedback}</div>

        ${revealed
          ? `<div class="quiz-reveal">
              <p><strong>${escapeHtml(question.learningPhrase)}</strong></p>
              <p class="muted">≈ ${escapeHtml(question.expectedHint)}</p>
            </div>`
          : ''}
      </div>
    `;

    const playBtn = body.querySelector('#lq-play');
    if (playBtn) playBtn.onclick = playAudio;

    const input = body.querySelector('#lq-input');
    input.value = answerText;
    input.focus();
    const caretAtEnd = answerText.length;
    input.setSelectionRange(caretAtEnd, caretAtEnd);
    input.onkeydown = (e) => { if (e.key === 'Enter') grade(input.value.trim()); };
    body.querySelector('#lq-check').onclick = () => grade(input.value.trim());
    body.querySelector('#lq-reveal').onclick = () => {
      draw({ feedback, revealed: !revealed, answerText: input.value });
    };
    body.querySelector('#lq-next').onclick = () => { buildQuestion(); draw(); if (canSpeak()) playAudio(); };
  }

  // Graded on the content words: each Learned word's base-language form has
  // to appear somewhere in the answer. Filler ("I need…", "some…") is
  // ignored, so a correct understanding isn't punished for phrasing.
  function answerMatches(given) {
    if (!given) return { ok: false, found: [], missing: question.baseWords };
    const found = question.baseWords.filter((word) => containsPhrase(given, word));
    const missing = question.baseWords.filter((word) => !found.includes(word));
    const fullPhraseOk =
      compareAnswer(given, question.expectedHint) !== 'no' ||
      normalize(given) === normalize(question.expectedHint);
    return { ok: missing.length === 0 || fullPhraseOk, found, missing };
  }

  function grade(given) {
    if (!given) return;
    asked += 1;
    const { ok, found, missing } = answerMatches(given);

    if (ok) {
      score += 1;
      draw({
        feedback: `<span class="fb-right">✅ Correct — ${escapeHtml(question.learningPhrase)}</span>`,
        revealed: true,
        answerText: given,
      });
      setTimeout(() => {
        if (body.isConnected) { buildQuestion(); draw(); if (canSpeak()) playAudio(); }
      }, 1800);
    } else if (found.length > 0) {
      draw({
        feedback: `<span class="fb-close">🟡 Partly there — you got ${found.length} of ${question.baseWords.length}. Missing: <strong>${escapeHtml(missing.join(', '))}</strong></span>`,
        answerText: given,
      });
    } else {
      draw({
        feedback: `<span class="fb-wrong">❌ Not quite. Listen again, or show the answer.</span>`,
        answerText: given,
      });
    }
  }

  (async () => {
    body.innerHTML = '<p class="muted">Loading…</p>';
    try {
      const { data } = await api.listRecords('Learned');
      records = data.records.filter((r) => r.base_text && r.learning_text);
      if (records.length < 2) {
        body.innerHTML = `<p class="muted">
          This quiz needs at least 2 translated entries in your <strong>Learned</strong> list
          (you have ${records.length}). Move some words there from
          <a href="#/words">My Words</a> once you know them.
        </p>`;
        return;
      }
      buildQuestion();
      draw();
    } catch (err) {
      body.innerHTML = `<p class="muted">Failed to load: ${escapeHtml(err.message)}</p>`;
    }
  })();

  return () => stopSpeaking();
}

// ------------------------------------------------------------- refresher

const MIN_SENTENCE_WORDS = 4;

function renderRefresherQuiz(body) {
  const langCode = learningLangCode();
  const learningLang = learningLanguage();
  const baseLang = baseLanguage();
  let records = [];
  let item = null;
  let written = 0;

  function pick() {
    item = randomItem(records);
  }

  function draw({ feedback = '', hint = false, draft = '' } = {}) {
    body.innerHTML = `
      <div class="card">
        <div class="drill-controls">
          <span class="drill-score">${written} sentence${written === 1 ? '' : 's'} written</span>
        </div>

        <div class="drill-prompt">
          <p class="muted">Write a sentence in <strong>${escapeHtml(learningLang)}</strong> that uses this word</p>
          <div class="drill-question">${escapeHtml(item.base_text)}</div>
          <p class="muted">
            ${escapeHtml(baseLang)}
            ${item.part_of_speech ? ` · ${escapeHtml(item.part_of_speech)}` : ''}
          </p>
          ${hint ? `<p class="fb-reveal">In ${escapeHtml(learningLang)}: <strong>${escapeHtml(item.learning_text)}</strong></p>` : ''}
        </div>

        <textarea id="rq-input" rows="3" placeholder="Write your ${escapeHtml(learningLang)} sentence here…"></textarea>

        <div class="drill-answer-row">
          <button id="rq-check" class="btn btn-ghost">Check</button>
          <button id="rq-hint" class="btn btn-ghost">${hint ? 'Hide the word' : 'Show the word'}</button>
          <button id="rq-next" class="btn btn-ghost">New word →</button>
        </div>

        <div class="drill-feedback">${feedback}</div>
      </div>
    `;

    const input = body.querySelector('#rq-input');
    input.value = draft;
    input.focus();
    body.querySelector('#rq-check').onclick = () => grade(input.value.trim());
    body.querySelector('#rq-hint').onclick = () => draw({ feedback, hint: !hint, draft: input.value });
    body.querySelector('#rq-next').onclick = () => { pick(); draw(); };
  }

  // There's no grammar checker here, so the check is deliberately
  // mechanical: did the sentence actually use the target word, and is it a
  // sentence rather than a two-word fragment?
  function grade(given) {
    if (!given) return;
    const usesWord = containsPhrase(given, item.learning_text);
    const wordCount = tokens(given).length;

    if (!usesWord) {
      draw({
        feedback: `<span class="fb-wrong">❌ I can't find <strong>${escapeHtml(item.learning_text)}</strong> in there. Use the ${escapeHtml(learningLang)} word for “${escapeHtml(item.base_text)}”.</span>`,
        hint: true,
        draft: given,
      });
      return;
    }
    if (wordCount < MIN_SENTENCE_WORDS) {
      draw({
        feedback: `<span class="fb-close">🟡 Good, you used the word — now stretch it into a full sentence (at least ${MIN_SENTENCE_WORDS} words).</span>`,
        draft: given,
      });
      return;
    }

    written += 1;
    const speakBtn = canSpeak() ? ' Press ▶ to hear it read back.' : '';
    draw({
      feedback: `<span class="fb-right">✅ Nice — that's a sentence using <strong>${escapeHtml(item.learning_text)}</strong>.${speakBtn}</span>
        ${canSpeak() ? `<br /><button id="rq-hear" class="btn btn-ghost btn-small">▶ Hear it</button>` : ''}`,
      draft: given,
    });

    const hearBtn = body.querySelector('#rq-hear');
    if (hearBtn) {
      hearBtn.onclick = () => {
        stopSpeaking();
        speak(given, { lang: langCode, rate: 0.9 }).catch((err) => toast(err.message, 'error'));
      };
    }
  }

  (async () => {
    body.innerHTML = '<p class="muted">Loading…</p>';
    try {
      const { data } = await api.listRecords('Learned');
      records = data.records.filter((r) => r.base_text && r.learning_text);
      if (records.length === 0) {
        body.innerHTML = `<p class="muted">
          Your <strong>Learned</strong> list is empty. Move words there from
          <a href="#/words">My Words</a> once you know them, then come back.
        </p>`;
        return;
      }
      pick();
      draw();
    } catch (err) {
      body.innerHTML = `<p class="muted">Failed to load: ${escapeHtml(err.message)}</p>`;
    }
  })();

  return () => stopSpeaking();
}
