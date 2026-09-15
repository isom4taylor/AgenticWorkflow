// Microphone capture via getUserMedia + MediaRecorder.
//
// This is the fallback path for the spoken drills: unlike the Web Speech
// API, it doesn't depend on a browser-bundled cloud speech service, so it
// works in Electron shells and Chromium forks. The recorded clip is posted
// to /api/speech/transcribe for transcription.

export function canRecord() {
  return Boolean(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof window.MediaRecorder !== 'undefined'
  );
}

// Chromium gives us Opus in a WebM container; Safari prefers mp4. Pick the
// first type the browser admits to supporting so the server knows how to
// label the upload.
const PREFERRED_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
];

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  return PREFERRED_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function describeMicError(err) {
  const name = err && err.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Microphone access was blocked. Allow it for this site in your browser settings, then try again.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No microphone was found. Connect one and try again.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The microphone is in use by another application.';
  }
  return `Could not start the microphone: ${(err && err.message) || 'unknown error'}`;
}

// Starts recording immediately. Returns a handle:
//   stop()   -> resolves the promise with a Blob (never rejects on stop)
//   cancel() -> discards the recording and releases the mic
//   promise  -> Blob of recorded audio, or null if cancelled
// `maxMs` stops the recording automatically as a safety net.
export async function startRecording({ maxMs = 15000 } = {}) {
  if (!canRecord()) {
    throw new Error('This browser cannot record audio.');
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (err) {
    throw new Error(describeMicError(err));
  }

  const mimeType = pickMimeType();
  let recorder;
  try {
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error(`Could not start recording: ${err.message}`);
  }

  const chunks = [];
  let cancelled = false;
  let settle;
  const promise = new Promise((resolve) => { settle = resolve; });

  const release = () => stream.getTracks().forEach((track) => track.stop());

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };
  recorder.onstop = () => {
    release();
    if (cancelled) {
      settle(null);
      return;
    }
    settle(new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' }));
  };

  recorder.start();

  const safetyTimer = setTimeout(() => {
    if (recorder.state === 'recording') recorder.stop();
  }, maxMs);

  const finish = () => {
    clearTimeout(safetyTimer);
    if (recorder.state === 'recording') recorder.stop();
    else if (recorder.state === 'inactive') {
      // Already stopped (e.g. by the safety timer) - make sure the mic is
      // released and the promise settles.
      release();
      settle(cancelled ? null : new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' }));
    }
  };

  return {
    mimeType: recorder.mimeType || mimeType,
    promise,
    stop() {
      finish();
      return promise;
    },
    cancel() {
      cancelled = true;
      finish();
      return promise;
    },
  };
}
