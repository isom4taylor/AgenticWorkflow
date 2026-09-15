// Spelling numbers out in words, used by the Speaking quiz to check whether
// what the microphone heard matches the number on screen.
//
// Spanish and English are spelled out properly (0-1000, which covers every
// "maximum number" option). For other learning languages the browser gives
// us no reliable speller, so grading falls back to accepting the digits -
// speech recognition usually transcribes spoken numbers as digits anyway.

import { normalize } from './textMatch.js';

const ES_ONES = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete',
  'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés',
  'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve',
];
const ES_TENS = { 30: 'treinta', 40: 'cuarenta', 50: 'cincuenta', 60: 'sesenta', 70: 'setenta', 80: 'ochenta', 90: 'noventa' };
const ES_HUNDREDS = {
  1: 'ciento', 2: 'doscientos', 3: 'trescientos', 4: 'cuatrocientos', 5: 'quinientos',
  6: 'seiscientos', 7: 'setecientos', 8: 'ochocientos', 9: 'novecientos',
};

function spellSpanish(n) {
  if (n < 0 || n > 1000) return String(n);
  if (n === 1000) return 'mil';
  if (n < 30) return ES_ONES[n];
  if (n < 100) {
    const tens = Math.floor(n / 10) * 10;
    const ones = n % 10;
    return ones === 0 ? ES_TENS[tens] : `${ES_TENS[tens]} y ${ES_ONES[ones]}`;
  }
  if (n === 100) return 'cien';
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return rest === 0 ? ES_HUNDREDS[hundreds] : `${ES_HUNDREDS[hundreds]} ${spellSpanish(rest)}`;
}

const EN_ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const EN_TENS = { 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety' };

function spellEnglish(n) {
  if (n < 0 || n > 1000) return String(n);
  if (n === 1000) return 'one thousand';
  if (n < 20) return EN_ONES[n];
  if (n < 100) {
    const tens = Math.floor(n / 10) * 10;
    const ones = n % 10;
    return ones === 0 ? EN_TENS[tens] : `${EN_TENS[tens]}-${EN_ONES[ones]}`;
  }
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return rest === 0
    ? `${EN_ONES[hundreds]} hundred`
    : `${EN_ONES[hundreds]} hundred ${spellEnglish(rest)}`;
}

const SPELLERS = { es: spellSpanish, en: spellEnglish };

export function supportsSpelling(langCode) {
  return Boolean(SPELLERS[String(langCode || '').slice(0, 2)]);
}

// The canonical spelled-out form, or null when we can't spell this language.
export function spellNumber(n, langCode) {
  const speller = SPELLERS[String(langCode || '').slice(0, 2)];
  return speller ? speller(n) : null;
}

// Re-exported so callers grading a spoken number don't need two imports.
// "Veintidós." and "veintidos" compare equal.
export { normalize };

// Every form we'll accept for a number: the digits, the spelled-out words,
// and (for Spanish) the common "treinta y uno" / "treinta uno" variants.
export function acceptedForms(n, langCode) {
  const forms = new Set([String(n)]);
  const spelled = spellNumber(n, langCode);
  if (spelled) {
    const normalized = normalize(spelled);
    forms.add(normalized);
    forms.add(normalized.replace(/ y /g, ' '));
    forms.add(normalized.replace(/-/g, ' '));
  }
  return [...forms].filter(Boolean);
}

// True when a speech transcript names `n`. Recognition often adds filler or
// returns digits, so a containment check on word boundaries is used rather
// than strict equality.
export function transcriptMatchesNumber(transcript, n, langCode) {
  const heard = normalize(transcript);
  if (!heard) return false;
  return acceptedForms(n, langCode).some((form) => {
    if (heard === form) return true;
    const pattern = new RegExp(`(^|\\s)${form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s)`);
    return pattern.test(heard);
  });
}
