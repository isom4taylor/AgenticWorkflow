// Global pause / resume / stop bar for any in-app text-to-speech.

import {
  canSpeak,
  isSpeaking,
  isSpeakingPaused,
  pauseSpeaking,
  resumeSpeaking,
  stopSpeaking,
} from './speech.js';

let wired = false;

function syncBar(bar) {
  if (!bar || !canSpeak()) {
    bar.classList.add('hidden');
    return;
  }
  const active = isSpeaking() || isSpeakingPaused();
  bar.classList.toggle('hidden', !active);
  const pauseBtn = bar.querySelector('#speech-pause-btn');
  if (!pauseBtn) return;
  if (isSpeakingPaused()) {
    pauseBtn.textContent = '▶ Resume';
    pauseBtn.setAttribute('aria-label', 'Resume audio');
  } else {
    pauseBtn.textContent = '⏸ Pause';
    pauseBtn.setAttribute('aria-label', 'Pause audio');
  }
}

export function initSpeechControls() {
  if (wired) return;
  wired = true;

  const bar = document.getElementById('speech-control-bar');
  if (!bar) return;

  const onState = () => syncBar(bar);
  window.addEventListener('speechstatechange', onState);

  bar.querySelector('#speech-pause-btn').onclick = () => {
    if (isSpeakingPaused()) resumeSpeaking();
    else pauseSpeaking();
    syncBar(bar);
  };
  bar.querySelector('#speech-stop-btn').onclick = () => {
    stopSpeaking();
    syncBar(bar);
  };

  syncBar(bar);
}
