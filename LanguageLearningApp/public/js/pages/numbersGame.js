// The spoken-numbers drill.
//
// Shared by two callers with slightly different rules:
//   Quizzes > Speaking  -> { timed: true }: a countdown per number, the
//                          round ends when the clock runs out.
//   Practice > Speaking -> { timed: false }: same mechanic, no clock, so
//                          you can take your time on each number.
//
// Answers can arrive three ways (see voiceInput.js): live browser speech
// recognition, recording the mic and transcribing server-side, or typing.
// The mode is resolved at load and re-resolved if live recognition fails
// mid-round, so a broken speech service downgrades instead of dead-ending.

import { escapeHtml, toast } from '../ui.js';
import { fluency, learningLanguage, learningLangCode } from '../state.js';
import { startListening, speak, stopSpeaking, canSpeak } from '../speech.js';
import { INPUT_MODES, resolveInputMode, modeExplanation, recordAnswer } from '../voiceInput.js';
import { spellNumber, supportsSpelling, transcriptMatchesNumber, normalize } from '../numberWords.js';

const MAX_NUMBER_OPTIONS = [10, 100, 1000];

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', seconds: 10 },
  { id: 'medium', label: 'Medium', seconds: 6 },
  { id: 'hard', label: 'Hard', seconds: 3 },
];

// The user's fluency picks the default difficulty.
const FLUENCY_DEFAULT = { beginner: 'easy', intermediate: 'medium', advanced: 'hard' };

function difficultyById(id) {
  return DIFFICULTIES.find((d) => d.id === id) || DIFFICULTIES[0];
}

export function renderNumbersGame(container, { timed = true, backRoute = '/quizzes', backLabel = 'Quizzes' } = {}) {
  const langCode = learningLangCode();
  const langName = learningLanguage();

  let maxNumber = 100;
  let difficultyId = FLUENCY_DEFAULT[fluency()] || 'easy';
  let score = 0;
  let current = null;
  let attempts = 0;
  let solvedThisNumber = false;
  let torndown = false;

  let inputMode = INPUT_MODES.TYPED;
  let modeNote = '';
  let listener = null;      // live recognition handle
  let recorder = null;      // record-and-transcribe handle
  let recorderState = null; // 'recording' | 'transcribing' | null

  // Timer state. Tracked as "remaining" rather than just a deadline so the
  // clock can be paused while a recording is transcribed - waiting on the
  // network shouldn't burn the player's time.
  let tickInterval = null;
  let deadline = 0;
  let remainingMs = 0;
  let timerPaused = false;

  function clearTimer() {
    if (tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
  }

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

  function teardown() {
    torndown = true;
    clearTimer();
    stopMic();
    stopRecorder();
    stopSpeaking();
  }

  function randomNumber() {
    // Inclusive range 0..maxNumber, per the setting.
    return Math.floor(Math.random() * (maxNumber + 1));
  }

  async function refreshInputMode() {
    inputMode = await resolveInputMode();
    modeNote = await modeExplanation(inputMode);
  }

  // ---------------- setup screen ----------------
  function renderSetup() {
    clearTimer();
    stopMic();
    stopRecorder();
    stopSpeaking();

    const modeLabel = {
      [INPUT_MODES.LIVE]: '🎤 Live speech recognition',
      [INPUT_MODES.RECORD]: '🎙️ Record & transcribe',
      [INPUT_MODES.TYPED]: '⌨️ Typed answers',
    }[inputMode];

    container.innerHTML = `
      <div class="card">
        <h2>🔢 Say the number</h2>
        <p class="muted">
          A number appears on screen and you say it out loud in
          <strong>${escapeHtml(langName)}</strong>.
          ${timed
            ? 'Get it right before the timer runs out to score a point and move on.'
            : 'No timer here - take as long as you need.'}
        </p>

        <label>Maximum number
          <select id="ng-max">
            ${MAX_NUMBER_OPTIONS.map(
              (n) => `<option value="${n}" ${n === maxNumber ? 'selected' : ''}>0 – ${n}</option>`
            ).join('')}
          </select>
        </label>

        ${timed
          ? `<label>Difficulty <span class="muted">(sets the timer)</span>
              <select id="ng-difficulty">
                ${DIFFICULTIES.map(
                  (d) => `<option value="${d.id}" ${d.id === difficultyId ? 'selected' : ''}>${d.label} — ${d.seconds}s per number</option>`
                ).join('')}
              </select>
            </label>
            <p class="muted">Defaulted to <strong>${escapeHtml(difficultyById(difficultyId).label)}</strong> from your ${escapeHtml(fluency())} fluency setting.</p>`
          : ''}

        <div class="ng-mode-row">
          <span class="ng-mode-chip">${modeLabel}</span>
          ${inputMode === INPUT_MODES.RECORD
            ? `<span class="muted">${timed ? 'The clock pauses while your recording is transcribed.' : 'Record your answer, then it gets transcribed.'}</span>`
            : ''}
        </div>
        ${modeNote ? `<p class="notice">${escapeHtml(modeNote)}</p>` : ''}
        ${inputMode !== INPUT_MODES.TYPED && !supportsSpelling(langCode)
          ? `<p class="notice">
              Answers in ${escapeHtml(langName)} are checked against the digits only —
              spelled-out grading is available for Spanish and English.
            </p>`
          : ''}

        <button id="ng-start" class="btn btn-primary">Start</button>
        <p class="switch-link"><a href="#${backRoute}">← Back to ${escapeHtml(backLabel)}</a></p>
      </div>
    `;

    container.querySelector('#ng-max').onchange = (e) => { maxNumber = Number(e.target.value); };
    const difficultySelect = container.querySelector('#ng-difficulty');
    if (difficultySelect) difficultySelect.onchange = (e) => { difficultyId = e.target.value; };
    container.querySelector('#ng-start').onclick = startRound;
  }

  // ---------------- play screen ----------------
  function startRound() {
    score = 0;
    if (inputMode === INPUT_MODES.LIVE) startLiveMic();
    nextNumber();
  }

  function startLiveMic() {
    if (listener) return;
    listener = startListening({
      lang: langCode,
      continuous: true,
      interim: true,
      onResult: ({ transcript }) => {
        if (current === null || solvedThisNumber) return;
        if (transcriptMatchesNumber(transcript, current, langCode)) handleCorrect();
        else showHeard(transcript);
      },
      onError: async (err) => {
        stopMic();
        if (err.fatal) {
          // The browser's speech service is unusable here. Switch to the
          // best remaining mode and carry on with the same number.
          await refreshInputMode();
          if (torndown) return;
          toast(`${err.message} Switched to ${inputMode === INPUT_MODES.RECORD ? 'record & transcribe' : 'typed answers'}.`, 'info');
          if (timed) pauseTimer();
          renderPlaying();
          if (timed) resumeTimer();
        } else {
          toast(err.message, 'error');
          renderPlaying();
        }
      },
    });
  }

  function nextNumber() {
    solvedThisNumber = false;
    attempts = 0;
    stopRecorder();
    current = randomNumber();
    renderPlaying();
    if (timed) startTimer();
  }

  function startTimer() {
    clearTimer();
    timerPaused = false;
    remainingMs = difficultyById(difficultyId).seconds * 1000;
    deadline = Date.now() + remainingMs;
    tickInterval = setInterval(tick, 100);
    tick();
  }

  function tick() {
    if (timerPaused) return;
    remainingMs = Math.max(0, deadline - Date.now());
    paintTimer();
    if (remainingMs <= 0) {
      clearTimer();
      renderGameOver();
    }
  }

  function paintTimer() {
    const total = difficultyById(difficultyId).seconds * 1000;
    const bar = container.querySelector('#ng-timer-bar');
    const label = container.querySelector('#ng-timer-label');
    if (bar) bar.style.width = `${(remainingMs / total) * 100}%`;
    if (label) label.textContent = `${(remainingMs / 1000).toFixed(1)}s`;
  }

  function pauseTimer() {
    if (!timed || timerPaused) return;
    remainingMs = Math.max(0, deadline - Date.now());
    timerPaused = true;
  }

  function resumeTimer() {
    if (!timed || !timerPaused) return;
    timerPaused = false;
    deadline = Date.now() + remainingMs;
  }

  function renderPlaying() {
    const seconds = difficultyById(difficultyId).seconds;
    container.innerHTML = `
      <div class="card ng-stage">
        <div class="ng-topbar">
          <span class="ng-score">Score: <strong id="ng-score">${score}</strong></span>
          <span class="muted">0 – ${maxNumber}${timed ? ` · ${escapeHtml(difficultyById(difficultyId).label)}` : ''}</span>
        </div>

        ${timed
          ? `<div class="ng-timer">
              <div class="ng-timer-track"><div class="ng-timer-bar" id="ng-timer-bar"></div></div>
              <span class="ng-timer-label" id="ng-timer-label">${seconds.toFixed(1)}s</span>
            </div>`
          : ''}

        <div class="ng-number" id="ng-number">${current}</div>
        <p class="ng-prompt">Say this number in <strong>${escapeHtml(langName)}</strong></p>

        <div id="ng-feedback" class="ng-feedback"></div>

        ${renderInputControls()}

        <div class="ng-actions">
          ${!timed ? '<button id="ng-skip" class="btn btn-ghost btn-small">Skip →</button>' : ''}
          <button id="ng-reveal" class="btn btn-ghost btn-small">Show answer</button>
          ${canSpeak() ? '<button id="ng-hear" class="btn btn-ghost btn-small">🔊 Hear it</button>' : ''}
          <button id="ng-quit" class="btn btn-ghost btn-small">End round</button>
        </div>
      </div>
    `;
    if (timed) paintTimer();
    wireInputControls();
    wireCommonActions();
  }

  function renderInputControls() {
    if (inputMode === INPUT_MODES.LIVE) {
      return listener
        ? '<p class="muted">🎤 Listening…</p>'
        : '<p class="muted">Microphone stopped.</p>';
    }

    if (inputMode === INPUT_MODES.RECORD) {
      if (recorderState === 'transcribing') {
        return '<div class="ng-record-row"><span class="ng-recording-dot transcribing"></span><span class="muted">Transcribing your answer…</span></div>';
      }
      if (recorderState === 'recording') {
        return `
          <div class="ng-record-row">
            <button id="ng-record-stop" class="btn btn-danger mic-btn">⏹ Stop &amp; check</button>
            <span class="ng-recording-dot"></span>
            <span class="muted">Recording… say the number, then press stop.</span>
          </div>`;
      }
      return `
        <div class="ng-record-row">
          <button id="ng-record-start" class="btn btn-primary mic-btn">🎙️ Record my answer</button>
          <span class="muted">Press, say the number, then stop.</span>
        </div>`;
    }

    return `
      <div class="ng-typed">
        <input type="text" id="ng-input" placeholder="Type the number in words" autocomplete="off" />
        <button id="ng-submit" class="btn btn-ghost">Check</button>
      </div>`;
  }

  function wireInputControls() {
    const startBtn = container.querySelector('#ng-record-start');
    if (startBtn) startBtn.onclick = beginRecording;

    const stopBtn = container.querySelector('#ng-record-stop');
    if (stopBtn) stopBtn.onclick = finishRecording;

    const input = container.querySelector('#ng-input');
    if (input) {
      input.focus();
      const submit = () => {
        const value = input.value.trim();
        if (!value) return;
        if (transcriptMatchesNumber(value, current, langCode) || normalize(value) === String(current)) {
          handleCorrect();
        } else {
          attempts += 1;
          showFeedback(`Not quite — try again. (attempt ${attempts})`, 'wrong');
          input.select();
        }
      };
      container.querySelector('#ng-submit').onclick = submit;
      input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
    }
  }

  function wireCommonActions() {
    const skipBtn = container.querySelector('#ng-skip');
    if (skipBtn) skipBtn.onclick = () => nextNumber();

    container.querySelector('#ng-reveal').onclick = () => {
      const spelled = spellNumber(current, langCode);
      showFeedback(spelled ? `${current} = <strong>${escapeHtml(spelled)}</strong>` : `${current}`, 'reveal');
    };

    const hearBtn = container.querySelector('#ng-hear');
    if (hearBtn) {
      hearBtn.onclick = () => {
        stopSpeaking();
        const spelled = spellNumber(current, langCode) || String(current);
        speak(spelled, { lang: langCode }).catch((err) => toast(err.message, 'error'));
      };
    }

    container.querySelector('#ng-quit').onclick = () => renderGameOver({ quit: true });
  }

  // ---------------- record & transcribe ----------------

  async function beginRecording() {
    try {
      recorder = await recordAnswer({
        languageName: langName,
        maxMs: 12000,
        onState: (state) => {
          recorderState = state;
          // Transcription happens over the network; don't charge the
          // player's clock for it.
          if (state === 'transcribing') pauseTimer();
          if (!torndown) renderPlaying();
        },
      });
    } catch (err) {
      recorder = null;
      recorderState = null;
      toast(err.message, 'error');
      // Mic unusable -> fall back to typing rather than leaving a button
      // that can't work.
      inputMode = INPUT_MODES.TYPED;
      modeNote = await modeExplanation(INPUT_MODES.TYPED);
      if (!torndown) renderPlaying();
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
        resumeTimer();
        renderPlaying();
        showFeedback("Didn't catch that — try recording again.", 'wrong');
        return;
      }
      if (transcriptMatchesNumber(transcript, current, langCode)) {
        renderPlaying();
        handleCorrect();
      } else {
        attempts += 1;
        resumeTimer();
        renderPlaying();
        showFeedback(
          `heard: “${escapeHtml(transcript)}” — not ${current}. Try again. (attempt ${attempts})`,
          'wrong'
        );
      }
    } catch (err) {
      recorderState = null;
      if (torndown) return;
      resumeTimer();
      renderPlaying();
      showFeedback(escapeHtml(err.message), 'wrong');
    }
  }

  function showFeedback(html, kind) {
    const el = container.querySelector('#ng-feedback');
    if (el) el.innerHTML = `<span class="ng-feedback-${kind}">${html}</span>`;
  }

  function showHeard(transcript) {
    const el = container.querySelector('#ng-feedback');
    if (el) el.innerHTML = `<span class="ng-feedback-heard">heard: “${escapeHtml(transcript.trim())}”</span>`;
  }

  function handleCorrect() {
    if (solvedThisNumber) return;
    solvedThisNumber = true;
    score += 1;
    clearTimer();
    const scoreEl = container.querySelector('#ng-score');
    if (scoreEl) scoreEl.textContent = String(score);
    showFeedback('✅ Correct!', 'right');
    const numberEl = container.querySelector('#ng-number');
    if (numberEl) numberEl.classList.add('correct');
    // Brief pause so the tick registers before the next number appears.
    setTimeout(() => {
      if (!torndown && container.isConnected) nextNumber();
    }, 700);
  }

  // ---------------- game over ----------------
  function renderGameOver({ quit = false } = {}) {
    clearTimer();
    stopMic();
    stopRecorder();
    stopSpeaking();

    const spelled = spellNumber(current, langCode);
    container.innerHTML = `
      <div class="card ng-gameover">
        <h2>${quit ? 'Round ended' : "⏱️ Time's up!"}</h2>
        <div class="ng-final-score">${score}</div>
        <p class="muted">${score === 1 ? '1 number' : `${score} numbers`} said correctly.</p>
        ${!quit && current !== null
          ? `<p class="muted">The last number was <strong>${current}</strong>${spelled ? ` — <strong>${escapeHtml(spelled)}</strong>` : ''}.</p>`
          : ''}
        <button id="ng-again" class="btn btn-primary">Play again</button>
        <p class="switch-link"><a href="#${backRoute}">← Back to ${escapeHtml(backLabel)}</a></p>
      </div>
    `;
    container.querySelector('#ng-again').onclick = renderSetup;
  }

  // Resolve the input mode before the first paint so the setup screen tells
  // the truth about how answers will be captured.
  container.innerHTML = '<p class="muted">Checking microphone support…</p>';
  refreshInputMode().then(() => {
    if (!torndown) renderSetup();
  });

  return teardown;
}
