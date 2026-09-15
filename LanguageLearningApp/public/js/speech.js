// Thin wrappers over the browser's Web Speech APIs.
//
//  - speak()          -> SpeechSynthesis (broadly supported)
//  - startListening() -> SpeechRecognition (Chrome/Edge only, needs mic
//                        permission and a secure context/localhost)
//
// Both capabilities are reported up front via canSpeak()/canListen() so
// pages can offer a typed fallback instead of a dead button.

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function canSpeak() {
  return typeof window.speechSynthesis !== 'undefined';
}

// In Chrome, SpeechRecognition is a client for Google's cloud speech
// service. Browser builds without Google's speech API keys (Electron
// shells, Chromium forks, most embedded webviews) still expose the
// constructor but fail every request with `error: "network"` - and so do
// restrictive networks. Once we've seen that, the API is treated as
// unusable for the rest of the session so drills stop offering it and
// switch to recording the mic instead.
let recognitionBroken = false;

export function canListen() {
  return Boolean(Recognition) && !recognitionBroken;
}

// True when SpeechRecognition exists but has proven non-functional.
export function recognitionUnavailable() {
  return Boolean(Recognition) && recognitionBroken;
}

export function markRecognitionBroken() {
  recognitionBroken = true;
}

// Errors that mean "this API will never work here", as opposed to a
// recoverable per-utterance problem.
function isFatalRecognitionError(error) {
  return error === 'network' || error === 'service-not-allowed' || error === 'language-not-supported';
}

// Voice lists load asynchronously in most browsers; cache whatever we have
// and refresh when the browser tells us more arrived.
let voices = [];
function refreshVoices() {
  if (!canSpeak()) return;
  voices = window.speechSynthesis.getVoices() || [];
}
if (canSpeak()) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}

function pickVoice(langCode) {
  if (!voices.length) refreshVoices();
  const wanted = String(langCode || '').toLowerCase();
  if (!wanted) return null;
  return (
    voices.find((v) => v.lang && v.lang.toLowerCase() === wanted) ||
    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(`${wanted}-`)) ||
    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(wanted)) ||
    null
  );
}

// True when the browser has a voice for this language. Speech still "works"
// without one, but it will be read with the wrong accent.
export function hasVoiceFor(langCode) {
  return Boolean(pickVoice(langCode));
}

export function speak(text, { lang = 'en', rate = 1, pitch = 1 } = {}) {
  return new Promise((resolve, reject) => {
    if (!canSpeak()) {
      reject(new Error('This browser cannot synthesize speech.'));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(String(text));
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    const voice = pickVoice(lang);
    if (voice) utterance.voice = voice;
    utterance.onend = () => resolve();
    utterance.onerror = (event) => {
      // "interrupted"/"canceled" just mean we called stopSpeaking(); that's
      // a normal part of navigating away, not a failure worth surfacing.
      if (event.error === 'interrupted' || event.error === 'canceled') resolve();
      else reject(new Error(`Speech failed: ${event.error || 'unknown error'}`));
    };
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

// Speaks a list of { text, lang } parts one after another, pausing between
// them. Returns a handle with cancel(); the promise resolves when finished
// or cancelled.
export function speakSequence(parts, { gapMs = 350, rate = 1, onIndex } = {}) {
  let cancelled = false;
  const promise = (async () => {
    for (let i = 0; i < parts.length; i += 1) {
      if (cancelled) return;
      if (onIndex) onIndex(i);
      const part = parts[i];
      try {
        await speak(part.text, { lang: part.lang, rate });
      } catch (err) {
        if (!cancelled) throw err;
        return;
      }
      if (cancelled) return;
      await new Promise((r) => setTimeout(r, gapMs));
    }
  })();
  return {
    promise,
    cancel() {
      cancelled = true;
      stopSpeaking();
    },
  };
}

// Starts speech recognition. `onResult` receives ({ transcript, isFinal })
// for every hypothesis, so callers can accept an answer mid-utterance.
// Returns a handle with stop().
export function startListening({
  lang = 'en',
  continuous = true,
  interim = true,
  onResult,
  onError,
  onEnd,
} = {}) {
  if (!canListen()) {
    if (onError) onError(new Error('This browser does not support speech recognition. Try Chrome or Edge.'));
    return { stop() {} };
  }

  const recognition = new Recognition();
  recognition.lang = lang;
  recognition.continuous = continuous;
  recognition.interimResults = interim;
  recognition.maxAlternatives = 3;

  let stopped = false;

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      for (let alt = 0; alt < result.length; alt += 1) {
        if (onResult) onResult({ transcript: result[alt].transcript, isFinal: result.isFinal });
      }
    }
  };
  recognition.onerror = (event) => {
    // "no-speech"/"aborted" are expected when the user stays quiet or we
    // stop on purpose - not worth surfacing as a hard error.
    if (event.error === 'no-speech' || event.error === 'aborted') return;

    if (isFatalRecognitionError(event.error)) {
      // Don't let onend restart a recognizer that can't work.
      stopped = true;
      markRecognitionBroken();
    }
    if (onError) {
      let message;
      if (event.error === 'not-allowed') {
        message = 'Microphone access was blocked. Allow it in your browser settings to use this mode.';
      } else if (event.error === 'network') {
        message = "This browser's built-in speech recognition couldn't reach its transcription service.";
      } else if (event.error === 'service-not-allowed') {
        message = "This browser's built-in speech recognition isn't available here.";
      } else {
        message = `Speech recognition error: ${event.error}`;
      }
      const err = new Error(message);
      err.recognitionError = event.error;
      err.fatal = isFatalRecognitionError(event.error);
      onError(err);
    }
  };
  recognition.onend = () => {
    if (stopped) {
      if (onEnd) onEnd();
      return;
    }
    // Chrome ends the session on silence even in continuous mode; restart
    // so the mic stays live for the whole round.
    try {
      recognition.start();
    } catch (err) {
      if (onEnd) onEnd();
    }
  };

  try {
    recognition.start();
  } catch (err) {
    if (onError) onError(new Error(`Could not start the microphone: ${err.message}`));
  }

  return {
    stop() {
      stopped = true;
      try {
        recognition.stop();
      } catch (err) {
        // already stopped
      }
    },
  };
}
