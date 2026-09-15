// Picks how a spoken answer gets captured, and hides the differences from
// the drills that use it.
//
// Three modes, in order of preference:
//   'live'   - the browser's SpeechRecognition streams results as you speak.
//              Free and instant, but only works where the browser's cloud
//              speech service is reachable (see speech.js).
//   'record' - record the microphone ourselves and post the clip to
//              /api/speech/transcribe. Works anywhere the mic works, but
//              needs a transcription provider configured on the server.
//   'typed'  - type the answer. Always available, so no drill is ever dead.

import { api } from './api.js';
import { canListen, recognitionUnavailable } from './speech.js';
import { canRecord, startRecording } from './recorder.js';

export const INPUT_MODES = { LIVE: 'live', RECORD: 'record', TYPED: 'typed' };

// The server's answer doesn't change during a session, so ask once.
let transcriptionPromise = null;

export function transcriptionSupport() {
  if (!transcriptionPromise) {
    transcriptionPromise = api
      .speechConfig()
      .then(({ data }) => ({ available: Boolean(data.transcriptionAvailable), provider: data.provider }))
      .catch(() => ({ available: false, provider: null }));
  }
  return transcriptionPromise;
}

// Resolves the best mode currently possible. Call again after a fatal live
// error - canListen() will have flipped to false by then.
export async function resolveInputMode() {
  if (canListen()) return INPUT_MODES.LIVE;
  if (canRecord()) {
    const { available } = await transcriptionSupport();
    if (available) return INPUT_MODES.RECORD;
  }
  return INPUT_MODES.TYPED;
}

// Explains, in one sentence, why the drill is in the mode it's in - so a
// downgrade never looks like a bug.
export async function modeExplanation(mode) {
  if (mode === INPUT_MODES.LIVE) return '';

  const { available } = await transcriptionSupport();
  const liveFailed = recognitionUnavailable();

  if (mode === INPUT_MODES.RECORD) {
    return liveFailed
      ? "This browser's built-in speech recognition couldn't reach its transcription service, so your microphone is recorded and transcribed on the server instead."
      : 'Your microphone is recorded and transcribed on the server.';
  }

  // Typed mode - say precisely what's missing.
  if (!canRecord()) {
    return 'This browser can\'t record audio, so type your answer instead.';
  }
  if (!available) {
    return liveFailed
      ? "This browser's built-in speech recognition couldn't reach its transcription service, and no server-side transcription provider is configured — so type your answer instead. " +
        'Set OPENAI_API_KEY (or GOOGLE_SPEECH_API_KEY) on the server to enable microphone answers here.'
      : 'Speech recognition isn\'t available in this browser and no server-side transcription provider is configured, so type your answer instead.';
  }
  return 'Type your answer instead.';
}

// Records until stop() is called, then transcribes. Returns a handle:
//   stop()    -> Promise<{ transcript }>
//   cancel()  -> abandons the recording
// `onState` receives 'recording' | 'transcribing' so callers can update the
// UI and (for timed drills) stop the clock while transcription runs.
export async function recordAnswer({ languageName, maxMs = 12000, onState } = {}) {
  const recording = await startRecording({ maxMs });
  if (onState) onState('recording');

  let cancelled = false;

  return {
    async stop() {
      const blob = await recording.stop();
      if (cancelled || !blob || blob.size === 0) return { transcript: '' };
      if (onState) onState('transcribing');
      const { data } = await api.transcribeAudio(blob, languageName);
      return { transcript: String(data.transcript || '').trim(), provider: data.provider };
    },
    cancel() {
      cancelled = true;
      recording.cancel();
    },
  };
}
