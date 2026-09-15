// Forgiving text comparison for answers that arrive by microphone or
// keyboard. Learners shouldn't lose a point to a missing accent, stray
// punctuation or an article, and speech recognition adds its own noise.

// Lowercase, strip accents and punctuation, collapse whitespace.
export function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Keeps accents but drops case/punctuation, to tell "wrong word" apart from
// "right word, missing accent".
function normalizeKeepAccents(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(text) {
  const normalized = normalize(text);
  return normalized ? normalized.split(' ') : [];
}

// 'exact'  - matches including accents
// 'accent' - right letters, wrong/missing accents
// 'no'     - doesn't match
export function compareAnswer(given, expected) {
  if (normalizeKeepAccents(given) === normalizeKeepAccents(expected)) return 'exact';
  if (normalize(given) === normalize(expected)) return 'accent';
  return 'no';
}

// True when `needle` appears in `haystack` as a whole word (or phrase).
export function containsPhrase(haystack, needle) {
  const normalizedNeedle = normalize(needle);
  if (!normalizedNeedle) return false;
  const escaped = normalizedNeedle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|\\s)${escaped}($|\\s)`).test(normalize(haystack));
}

// How much of `expected` shows up in `given`, for grading free-form
// sentences where an exact match isn't reasonable.
export function tokenOverlap(given, expected) {
  const expectedTokens = tokens(expected);
  const givenTokens = new Set(tokens(given));
  if (expectedTokens.length === 0) return { matched: 0, total: 0, ratio: 0, missing: [] };
  const missing = expectedTokens.filter((token) => !givenTokens.has(token));
  const matched = expectedTokens.length - missing.length;
  return { matched, total: expectedTokens.length, ratio: matched / expectedTokens.length, missing };
}
