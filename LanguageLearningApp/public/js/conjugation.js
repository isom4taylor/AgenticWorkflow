// Spanish verb conjugation, used by the Practice > Conjugation drills.
//
// Regular -ar/-er/-ir verbs are generated from their endings; the handful of
// high-frequency irregulars below are spelled out in full because rules
// can't produce them. Scope is the four indicative tenses a learner meets
// first: present, preterite, imperfect and future.

export const PRONOUNS = [
  { label: 'yo', gloss: 'I' },
  { label: 'tú', gloss: 'you (informal)' },
  { label: 'él / ella / usted', gloss: 'he / she / you (formal)' },
  { label: 'nosotros', gloss: 'we' },
  { label: 'vosotros', gloss: 'you all (Spain)' },
  { label: 'ellos / ellas / ustedes', gloss: 'they / you all' },
];

export const TENSES = [
  { id: 'present', label: 'Present', gloss: 'I speak / I am speaking' },
  { id: 'preterite', label: 'Preterite', gloss: 'I spoke (completed)' },
  { id: 'imperfect', label: 'Imperfect', gloss: 'I used to speak / I was speaking' },
  { id: 'future', label: 'Future', gloss: 'I will speak' },
];

// Endings indexed to match PRONOUNS above.
const REGULAR_ENDINGS = {
  present: {
    ar: ['o', 'as', 'a', 'amos', 'áis', 'an'],
    er: ['o', 'es', 'e', 'emos', 'éis', 'en'],
    ir: ['o', 'es', 'e', 'imos', 'ís', 'en'],
  },
  preterite: {
    ar: ['é', 'aste', 'ó', 'amos', 'asteis', 'aron'],
    er: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
    ir: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
  },
  imperfect: {
    ar: ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'],
    er: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
    ir: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
  },
  // The future is built on the whole infinitive, not the stem.
  future: {
    ar: ['é', 'ás', 'á', 'emos', 'éis', 'án'],
    er: ['é', 'ás', 'á', 'emos', 'éis', 'án'],
    ir: ['é', 'ás', 'á', 'emos', 'éis', 'án'],
  },
};

const IRREGULARS = {
  ser: {
    present: ['soy', 'eres', 'es', 'somos', 'sois', 'son'],
    preterite: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'],
    imperfect: ['era', 'eras', 'era', 'éramos', 'erais', 'eran'],
    future: ['seré', 'serás', 'será', 'seremos', 'seréis', 'serán'],
  },
  estar: {
    present: ['estoy', 'estás', 'está', 'estamos', 'estáis', 'están'],
    preterite: ['estuve', 'estuviste', 'estuvo', 'estuvimos', 'estuvisteis', 'estuvieron'],
    imperfect: ['estaba', 'estabas', 'estaba', 'estábamos', 'estabais', 'estaban'],
    future: ['estaré', 'estarás', 'estará', 'estaremos', 'estaréis', 'estarán'],
  },
  ir: {
    present: ['voy', 'vas', 'va', 'vamos', 'vais', 'van'],
    preterite: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'],
    imperfect: ['iba', 'ibas', 'iba', 'íbamos', 'ibais', 'iban'],
    future: ['iré', 'irás', 'irá', 'iremos', 'iréis', 'irán'],
  },
  tener: {
    present: ['tengo', 'tienes', 'tiene', 'tenemos', 'tenéis', 'tienen'],
    preterite: ['tuve', 'tuviste', 'tuvo', 'tuvimos', 'tuvisteis', 'tuvieron'],
    imperfect: ['tenía', 'tenías', 'tenía', 'teníamos', 'teníais', 'tenían'],
    future: ['tendré', 'tendrás', 'tendrá', 'tendremos', 'tendréis', 'tendrán'],
  },
  hacer: {
    present: ['hago', 'haces', 'hace', 'hacemos', 'hacéis', 'hacen'],
    preterite: ['hice', 'hiciste', 'hizo', 'hicimos', 'hicisteis', 'hicieron'],
    imperfect: ['hacía', 'hacías', 'hacía', 'hacíamos', 'hacíais', 'hacían'],
    future: ['haré', 'harás', 'hará', 'haremos', 'haréis', 'harán'],
  },
  poder: {
    present: ['puedo', 'puedes', 'puede', 'podemos', 'podéis', 'pueden'],
    preterite: ['pude', 'pudiste', 'pudo', 'pudimos', 'pudisteis', 'pudieron'],
    imperfect: ['podía', 'podías', 'podía', 'podíamos', 'podíais', 'podían'],
    future: ['podré', 'podrás', 'podrá', 'podremos', 'podréis', 'podrán'],
  },
  decir: {
    present: ['digo', 'dices', 'dice', 'decimos', 'decís', 'dicen'],
    preterite: ['dije', 'dijiste', 'dijo', 'dijimos', 'dijisteis', 'dijeron'],
    imperfect: ['decía', 'decías', 'decía', 'decíamos', 'decíais', 'decían'],
    future: ['diré', 'dirás', 'dirá', 'diremos', 'diréis', 'dirán'],
  },
};

// Verbs that stay regular across all four drilled tenses, so generated
// answers are always correct.
export const VERB_BANK = [
  { infinitive: 'hablar', gloss: 'to speak' },
  { infinitive: 'cantar', gloss: 'to sing' },
  { infinitive: 'caminar', gloss: 'to walk' },
  { infinitive: 'comprar', gloss: 'to buy' },
  { infinitive: 'escuchar', gloss: 'to listen' },
  { infinitive: 'trabajar', gloss: 'to work' },
  { infinitive: 'estudiar', gloss: 'to study' },
  { infinitive: 'comer', gloss: 'to eat' },
  { infinitive: 'beber', gloss: 'to drink' },
  { infinitive: 'aprender', gloss: 'to learn' },
  { infinitive: 'correr', gloss: 'to run' },
  { infinitive: 'vender', gloss: 'to sell' },
  { infinitive: 'vivir', gloss: 'to live' },
  { infinitive: 'escribir', gloss: 'to write' },
  { infinitive: 'abrir', gloss: 'to open' },
  { infinitive: 'recibir', gloss: 'to receive' },
  { infinitive: 'compartir', gloss: 'to share' },
  { infinitive: 'ser', gloss: 'to be (permanent)', irregular: true },
  { infinitive: 'estar', gloss: 'to be (state/location)', irregular: true },
  { infinitive: 'ir', gloss: 'to go', irregular: true },
  { infinitive: 'tener', gloss: 'to have', irregular: true },
  { infinitive: 'hacer', gloss: 'to do / to make', irregular: true },
  { infinitive: 'poder', gloss: 'to be able to', irregular: true },
  { infinitive: 'decir', gloss: 'to say', irregular: true },
];

// Returns the conjugated form, or null if we can't produce it confidently.
export function conjugate(infinitive, tense, personIndex) {
  const verb = String(infinitive || '').toLowerCase();
  const irregular = IRREGULARS[verb];
  if (irregular && irregular[tense]) return irregular[tense][personIndex];

  const group = verb.slice(-2);
  const endings = REGULAR_ENDINGS[tense] && REGULAR_ENDINGS[tense][group];
  if (!endings) return null;
  const stem = tense === 'future' ? verb : verb.slice(0, -2);
  return `${stem}${endings[personIndex]}`;
}

// The full six-person table for a verb+tense, for the reference view.
export function conjugationTable(infinitive, tense) {
  return PRONOUNS.map((pronoun, i) => ({
    pronoun: pronoun.label,
    form: conjugate(infinitive, tense, i),
  }));
}

// These drills encode Spanish grammar specifically.
export function isSpanish(langCode) {
  return String(langCode || '').slice(0, 2) === 'es';
}
