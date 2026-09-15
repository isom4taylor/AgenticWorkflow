export const PARTS_OF_SPEECH = [
  '', 'noun', 'verb', 'adjective', 'adverb', 'pronoun',
  'preposition', 'conjunction', 'interjection', 'phrase', 'other',
];

export function posOptionsHtml(selected) {
  return PARTS_OF_SPEECH.map((pos) => {
    const label = pos === '' ? '(part of speech)' : pos;
    const isSelected = (selected || '') === pos ? 'selected' : '';
    return `<option value="${pos}" ${isSelected}>${label}</option>`;
  }).join('');
}
