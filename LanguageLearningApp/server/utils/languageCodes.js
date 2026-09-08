// Small ISO-639-1-ish language code <-> display name lookup, used to figure
// out which column of an imported row is the user's base language (e.g.
// "English") regardless of whether Google Translate exported a language
// code ("en") or a full language name ("English") in that column.

const CODE_TO_NAME = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  'pt-br': 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  'zh-cn': 'Chinese',
  'zh-tw': 'Chinese (Traditional)',
  ru: 'Russian',
  ar: 'Arabic',
  hi: 'Hindi',
  nl: 'Dutch',
  sv: 'Swedish',
  no: 'Norwegian',
  da: 'Danish',
  fi: 'Finnish',
  pl: 'Polish',
  tr: 'Turkish',
  vi: 'Vietnamese',
  th: 'Thai',
  id: 'Indonesian',
  el: 'Greek',
  he: 'Hebrew',
  iw: 'Hebrew',
  cs: 'Czech',
  ro: 'Romanian',
  hu: 'Hungarian',
  uk: 'Ukrainian',
  bg: 'Bulgarian',
  sk: 'Slovak',
  hr: 'Croatian',
  lt: 'Lithuanian',
  lv: 'Latvian',
  et: 'Estonian',
  fa: 'Persian',
  ur: 'Urdu',
  bn: 'Bengali',
  ta: 'Tamil',
  te: 'Telugu',
  ms: 'Malay',
  sw: 'Swahili',
  af: 'Afrikaans',
  sq: 'Albanian',
  am: 'Amharic',
  ca: 'Catalan',
  is: 'Icelandic',
  ga: 'Irish',
  mt: 'Maltese',
  sr: 'Serbian',
  sl: 'Slovenian',
  cy: 'Welsh',
};

// Normalizes any incoming "language" cell (a code like "en"/"en-US", or a
// full name like "English") into a canonical display name.
function toDisplayName(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  const lower = value.toLowerCase();
  if (CODE_TO_NAME[lower]) return CODE_TO_NAME[lower];
  const base = lower.split('-')[0];
  if (CODE_TO_NAME[base]) return CODE_TO_NAME[base];
  // Not a recognized code - assume it's already a language name. Title-case it.
  return value
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

// True if `raw` (a code or name from a CSV column) refers to the same
// language as `languageName` (a name from user settings, e.g. "English").
function matchesLanguage(raw, languageName) {
  if (!raw || !languageName) return false;
  return toDisplayName(raw).toLowerCase() === String(languageName).trim().toLowerCase();
}

module.exports = { toDisplayName, matchesLanguage };
