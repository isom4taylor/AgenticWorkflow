// Server-side speech-to-text for the spoken drills.
//
// Why this exists: the browser's own SpeechRecognition (Web Speech API) is
// free and instant, but in Chrome it is a thin client for Google's cloud
// speech service. Any browser build without Google's speech API keys -
// Electron shells, Chromium forks, most embedded webviews - still exposes
// `webkitSpeechRecognition` but fails every request with `error: "network"`.
// Restrictive networks produce the same thing. When that happens the client
// records the microphone itself and posts the audio here instead.
//
// Transcription needs a real STT engine, and there is no dependable keyless
// one, so a provider is chosen from whichever API key is configured:
//   OPENAI_API_KEY        -> OpenAI Whisper (recommended; strong multilingual)
//   GOOGLE_SPEECH_API_KEY -> Google Cloud Speech-to-Text
// With neither set, isConfigured() is false and the client keeps offering
// the typed fallback rather than a button that cannot work.

const https = require('https');

const REQUEST_TIMEOUT_MS = 20000;

// Google Speech wants a BCP-47 tag. Our stored languages resolve to bare
// two-letter codes, so map the common ones to a sensible default region.
const STT_LOCALES = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-PT',
  nl: 'nl-NL',
  pl: 'pl-PL',
  ru: 'ru-RU',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  ar: 'ar-SA',
  hi: 'hi-IN',
  tr: 'tr-TR',
  sv: 'sv-SE',
  da: 'da-DK',
  no: 'nb-NO',
  fi: 'fi-FI',
  el: 'el-GR',
  he: 'he-IL',
  cs: 'cs-CZ',
  uk: 'uk-UA',
  vi: 'vi-VN',
  th: 'th-TH',
  id: 'id-ID',
};

function toSttLocale(langCode) {
  const short = String(langCode || 'en').slice(0, 2).toLowerCase();
  return STT_LOCALES[short] || short;
}

function activeProvider() {
  if (process.env.OPENAI_API_KEY) return 'openai-whisper';
  if (process.env.GOOGLE_SPEECH_API_KEY) return 'google-speech';
  return null;
}

function isConfigured() {
  return activeProvider() !== null;
}

function httpsPost({ hostname, path, headers, body }) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname, path, method: 'POST', headers, timeout: REQUEST_TIMEOUT_MS },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(raw);
          } catch (err) {
            parsed = null;
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            const detail = (parsed && parsed.error && (parsed.error.message || parsed.error)) || raw.slice(0, 200);
            reject(new Error(`${hostname} responded with HTTP ${res.statusCode}: ${detail}`));
            return;
          }
          if (!parsed) {
            reject(new Error(`${hostname} returned an unexpected (non-JSON) response.`));
            return;
          }
          resolve(parsed);
        });
      }
    );
    req.on('error', (err) => reject(new Error(`Could not reach ${hostname}: ${err.message}`)));
    req.on('timeout', () => req.destroy(new Error(`Request to ${hostname} timed out.`)));
    req.write(body);
    req.end();
  });
}

// Builds a multipart/form-data body by hand so we don't need a form-data
// dependency just for this one call.
function buildMultipart(fields, file) {
  const boundary = `----LLAudio${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  const parts = [];
  Object.entries(fields).forEach(([name, value]) => {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  });
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${file.field}"; filename="${file.filename}"\r\n` +
        `Content-Type: ${file.contentType}\r\n\r\n`
    )
  );
  parts.push(file.buffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  return { boundary, body: Buffer.concat(parts) };
}

async function transcribeViaWhisper(buffer, mimeType, langCode) {
  const extension = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'm4a' : mimeType.includes('wav') ? 'wav' : 'webm';
  const fields = { model: 'whisper-1', response_format: 'json' };
  // Telling Whisper the expected language markedly improves short clips
  // like a single spoken number.
  const short = String(langCode || '').slice(0, 2).toLowerCase();
  if (short) fields.language = short;

  const { boundary, body } = buildMultipart(fields, {
    field: 'file',
    filename: `audio.${extension}`,
    contentType: mimeType || 'audio/webm',
    buffer,
  });

  const data = await httpsPost({
    hostname: 'api.openai.com',
    path: '/v1/audio/transcriptions',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
    },
    body,
  });

  return String(data.text || '').trim();
}

async function transcribeViaGoogle(buffer, mimeType, langCode) {
  // MediaRecorder in Chromium produces Opus in a WebM (or Ogg) container.
  const encoding = mimeType.includes('ogg') ? 'OGG_OPUS' : 'WEBM_OPUS';
  const payload = JSON.stringify({
    config: {
      encoding,
      sampleRateHertz: 48000,
      languageCode: toSttLocale(langCode),
      maxAlternatives: 3,
      // Numbers come back as digits rather than words, which our grading
      // already accepts.
      enableAutomaticPunctuation: false,
    },
    audio: { content: buffer.toString('base64') },
  });

  const data = await httpsPost({
    hostname: 'speech.googleapis.com',
    path: `/v1/speech:recognize?key=${encodeURIComponent(process.env.GOOGLE_SPEECH_API_KEY)}`,
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    body: payload,
  });

  const results = data.results || [];
  const alternatives = results.flatMap((r) => r.alternatives || []);
  if (alternatives.length === 0) return '';
  // Return every alternative joined; the caller matches against any of them.
  return alternatives.map((a) => String(a.transcript || '').trim()).filter(Boolean).join(' | ');
}

// Resolves with { transcript, provider }. Throws with an actionable message
// when no provider is configured.
async function transcribe(buffer, mimeType, langCode) {
  const provider = activeProvider();
  if (!provider) {
    throw Object.assign(
      new Error(
        'Audio transcription is not configured on this server. Set OPENAI_API_KEY (recommended) or ' +
          'GOOGLE_SPEECH_API_KEY and restart, or type your answer instead.'
      ),
      { code: 'STT_NOT_CONFIGURED' }
    );
  }
  if (!buffer || buffer.length === 0) {
    throw Object.assign(new Error('The recording was empty.'), { code: 'EMPTY_AUDIO' });
  }

  const transcript = provider === 'openai-whisper'
    ? await transcribeViaWhisper(buffer, mimeType, langCode)
    : await transcribeViaGoogle(buffer, mimeType, langCode);

  return { transcript, provider };
}

module.exports = { transcribe, isConfigured, activeProvider, toSttLocale };
