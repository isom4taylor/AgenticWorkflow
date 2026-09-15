// Auto-translate client.
//
// There is no public, documented Google API for "translate a single word
// and give me a part-of-speech-organized list of alternatives" — the
// official Cloud Translation API (which needs a paid API key) only returns
// a single plain translation, with no dictionary/part-of-speech data.
//
// To support the "pull all of the options + part of speech" feature, this
// uses the same unofficial JSON endpoint that powers the word-lookup panel
// on translate.google.com (no API key required, but undocumented, not
// guaranteed to stay stable, and prone to rate-limiting HTTP 429 responses
// under normal use — this is a known limitation of relying on an
// undocumented endpoint, not something a request-header tweak reliably
// fixes). Fallback order when a step fails:
//   1. Unofficial Google endpoint (free, dictionary + part-of-speech data)
//      — retried once after a short delay in case the 429 is transient.
//   2. Official Cloud Translation API v2, only if `GOOGLE_TRANSLATE_API_KEY`
//      is set (paid, reliable, plain translation only - no part-of-speech).
//   3. MyMemory's free translation API (no key required, plain translation
//      only). Translation quality/consistency is community-sourced and not
//      guaranteed, but it keeps the feature usable when Google blocks the
//      unofficial endpoint.
// If every step fails, the caller is told to enter the translation manually.

const https = require('https');
const { toLangCode } = require('./languageCodes');

const UNOFFICIAL_HOST = 'translate.googleapis.com';
const REQUEST_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 500;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpsGetJson(hostname, path) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      { hostname, path, headers: { 'User-Agent': 'Mozilla/5.0 (LanguageLearningApp)' }, timeout: REQUEST_TIMEOUT_MS },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Translate service responded with HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(new Error('Translate service returned an unexpected response.'));
          }
        });
      }
    );
    req.on('error', (err) => reject(new Error(`Could not reach translate service: ${err.message}`)));
    req.on('timeout', () => req.destroy(new Error('Translate request timed out.')));
  });
}

// Pure function (no network) so the parsing logic can be unit tested with a
// mock response shape. `data` is the parsed JSON body from a `dj=1` request
// to translate_a/single.
function parseUnofficialResponse(data) {
  const plainTranslation = Array.isArray(data.sentences)
    ? data.sentences.map((s) => s.trans || '').join('')
    : '';

  const options = [];
  const seen = new Set();
  (data.dict || []).forEach((group) => {
    const pos = group.pos || '';
    const terms = Array.isArray(group.terms) && group.terms.length ? group.terms : [];
    terms.forEach((term) => {
      const key = `${pos}::${term}`;
      if (seen.has(key)) return;
      seen.add(key);
      options.push({ text: term, partOfSpeech: pos });
    });
  });

  if (options.length === 0 && plainTranslation) {
    options.push({ text: plainTranslation, partOfSpeech: '' });
  }

  return { plainTranslation, options: options.slice(0, 15) };
}

async function translateViaUnofficialEndpoint(text, sourceCode, targetCode) {
  const qs = new URLSearchParams();
  qs.append('client', 'gtx');
  qs.append('sl', sourceCode || 'auto');
  qs.append('tl', targetCode);
  qs.append('dt', 't'); // plain translation
  qs.append('dt', 'bd'); // dictionary (part-of-speech grouped alternatives)
  qs.append('dj', '1'); // ask for a parseable JSON object instead of nested arrays
  qs.append('q', text);

  const data = await httpsGetJson(UNOFFICIAL_HOST, `/translate_a/single?${qs.toString()}`);
  return parseUnofficialResponse(data);
}

async function translateViaOfficialApi(text, sourceCode, targetCode, apiKey) {
  const qs = new URLSearchParams({ q: text, target: targetCode, format: 'text', key: apiKey });
  if (sourceCode) qs.append('source', sourceCode);
  const data = await httpsGetJson('translation.googleapis.com', `/language/translate/v2?${qs.toString()}`);
  const translated = data && data.data && data.data.translations && data.data.translations[0]
    ? data.data.translations[0].translatedText
    : '';
  if (!translated) throw new Error('Translation API returned no result.');
  return { plainTranslation: translated, options: [{ text: translated, partOfSpeech: '' }] };
}

// Free, keyless fallback (https://mymemory.translated.net). Plain
// translation only - no part-of-speech breakdown. Quality is
// community/translation-memory sourced, so it's a "better than nothing"
// safety net rather than a primary source.
async function translateViaMyMemory(text, sourceCode, targetCode) {
  const langpair = `${sourceCode || 'en'}|${targetCode}`;
  const qs = new URLSearchParams({ q: text, langpair });
  const data = await httpsGetJson('api.mymemory.translated.net', `/get?${qs.toString()}`);
  const translated = data && data.responseData && data.responseData.translatedText;
  if (!translated) throw new Error('MyMemory returned no result.');
  return { plainTranslation: translated, options: [{ text: translated, partOfSpeech: '' }] };
}

// Translates `text` from `sourceLanguageName` to `targetLanguageName`
// (both plain language names, e.g. "English"/"Spanish" — converted to
// codes internally). Returns { plainTranslation, options } where `options`
// is a de-duplicated list of { text, partOfSpeech } candidates.
async function translateText(text, sourceLanguageName, targetLanguageName) {
  if (!text || !String(text).trim()) throw new Error('Nothing to translate.');
  const sourceCode = toLangCode(sourceLanguageName);
  const targetCode = toLangCode(targetLanguageName);
  if (!targetCode) throw new Error('Unknown target language.');

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  let lastErr;

  // 1. Unofficial endpoint, with one retry on failure (HTTP 429 in
  // particular is often transient, but not always - see fallbacks below).
  try {
    return await translateViaUnofficialEndpoint(text, sourceCode, targetCode);
  } catch (err) {
    lastErr = err;
    try {
      await delay(RETRY_DELAY_MS);
      return await translateViaUnofficialEndpoint(text, sourceCode, targetCode);
    } catch (retryErr) {
      lastErr = retryErr;
    }
  }

  // 2. Official paid API, only available if the operator configured a key.
  if (apiKey) {
    try {
      return await translateViaOfficialApi(text, sourceCode, targetCode, apiKey);
    } catch (err) {
      lastErr = err;
    }
  }

  // 3. Free, keyless fallback so the feature still works out of the box.
  try {
    return await translateViaMyMemory(text, sourceCode, targetCode);
  } catch (err) {
    lastErr = err;
  }

  throw new Error(`Auto-translate is unavailable right now (${lastErr.message}). You can enter the translation manually instead.`);
}

module.exports = { translateText, parseUnofficialResponse, translateViaMyMemory };
