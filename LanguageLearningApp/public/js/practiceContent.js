// Curated item banks for the Practice drills that can't be generated from
// rules: article/pronoun agreement, object pronouns, and tongue twisters.
// All Spanish, matching the app's default learning language.

// Definite-article agreement. `answer` is the article that belongs in the
// blank; the choices are always el/la/los/las.
export const ARTICLE_ITEMS = [
  { noun: 'libro', gloss: 'book', answer: 'el' },
  { noun: 'casa', gloss: 'house', answer: 'la' },
  { noun: 'mesa', gloss: 'table', answer: 'la' },
  { noun: 'perro', gloss: 'dog', answer: 'el' },
  { noun: 'ciudad', gloss: 'city', answer: 'la' },
  { noun: 'papel', gloss: 'paper', answer: 'el' },
  { noun: 'libros', gloss: 'books', answer: 'los' },
  { noun: 'casas', gloss: 'houses', answer: 'las' },
  { noun: 'flores', gloss: 'flowers', answer: 'las' },
  { noun: 'coches', gloss: 'cars', answer: 'los' },
  { noun: 'problema', gloss: 'problem', answer: 'el', note: 'Greek-origin nouns ending in -ma are masculine.' },
  { noun: 'mano', gloss: 'hand', answer: 'la', note: 'An exception: feminine despite ending in -o.' },
  { noun: 'día', gloss: 'day', answer: 'el', note: 'An exception: masculine despite ending in -a.' },
  { noun: 'agua', gloss: 'water', answer: 'el', note: 'Feminine, but takes "el" in the singular to avoid "la a-".' },
  { noun: 'luz', gloss: 'light', answer: 'la' },
  { noun: 'universidad', gloss: 'university', answer: 'la', note: 'Nouns ending in -dad are feminine.' },
  { noun: 'lápiz', gloss: 'pencil', answer: 'el' },
  { noun: 'clases', gloss: 'classes', answer: 'las' },
];

export const ARTICLE_CHOICES = ['el', 'la', 'los', 'las'];

// Subject-pronoun recall.
export const SUBJECT_PRONOUN_ITEMS = [
  { prompt: 'I', answer: 'yo' },
  { prompt: 'you (informal, singular)', answer: 'tú' },
  { prompt: 'he', answer: 'él' },
  { prompt: 'she', answer: 'ella' },
  { prompt: 'you (formal, singular)', answer: 'usted' },
  { prompt: 'we (mixed or masculine)', answer: 'nosotros' },
  { prompt: 'we (all feminine)', answer: 'nosotras' },
  { prompt: 'you all (informal, Spain)', answer: 'vosotros' },
  { prompt: 'they (mixed or masculine)', answer: 'ellos' },
  { prompt: 'they (all feminine)', answer: 'ellas' },
  { prompt: 'you all (formal / Latin America)', answer: 'ustedes' },
];

// Object-pronoun replacement. Each item shows a full sentence and asks for
// the rewritten version with the object replaced by a pronoun.
export const OBJECT_PRONOUN_ITEMS = [
  { type: 'direct', sentence: 'Veo el libro.', gloss: 'I see the book.', answer: 'Lo veo.', pronoun: 'lo' },
  { type: 'direct', sentence: 'Compro la casa.', gloss: 'I buy the house.', answer: 'La compro.', pronoun: 'la' },
  { type: 'direct', sentence: 'Leemos los periódicos.', gloss: 'We read the newspapers.', answer: 'Los leemos.', pronoun: 'los' },
  { type: 'direct', sentence: 'Escucho las canciones.', gloss: 'I listen to the songs.', answer: 'Las escucho.', pronoun: 'las' },
  { type: 'direct', sentence: 'Ella conoce a María.', gloss: 'She knows María.', answer: 'Ella la conoce.', pronoun: 'la' },
  { type: 'indirect', sentence: 'Doy el libro a María.', gloss: 'I give the book to María.', answer: 'Le doy el libro.', pronoun: 'le' },
  { type: 'indirect', sentence: 'Escribo una carta a mis padres.', gloss: 'I write a letter to my parents.', answer: 'Les escribo una carta.', pronoun: 'les' },
  { type: 'indirect', sentence: 'Explico la lección a ti.', gloss: 'I explain the lesson to you.', answer: 'Te explico la lección.', pronoun: 'te' },
  { type: 'indirect', sentence: 'Compran flores para nosotros.', gloss: 'They buy flowers for us.', answer: 'Nos compran flores.', pronoun: 'nos' },
  { type: 'both', sentence: 'Doy el libro a María.', gloss: 'I give the book to María.', answer: 'Se lo doy.', pronoun: 'se lo', note: '"le + lo" becomes "se lo".' },
  { type: 'both', sentence: 'Mando las cartas a mi hermano.', gloss: 'I send the letters to my brother.', answer: 'Se las mando.', pronoun: 'se las' },
  { type: 'both', sentence: 'Ella me da el dinero.', gloss: 'She gives me the money.', answer: 'Ella me lo da.', pronoun: 'me lo' },
];

export const TONGUE_TWISTERS = [
  {
    text: 'Tres tristes tigres tragaban trigo en un trigal.',
    gloss: 'Three sad tigers swallowed wheat in a wheat field.',
    focus: 'The "tr" cluster.',
  },
  {
    text: 'El perro de San Roque no tiene rabo porque Ramón Ramírez se lo ha cortado.',
    gloss: "Saint Roque's dog has no tail because Ramón Ramírez cut it off.",
    focus: 'Rolled "rr" and tapped "r".',
  },
  {
    text: 'Pablito clavó un clavito en la calva de un calvito.',
    gloss: 'Little Pablo nailed a little nail into the bald head of a little bald man.',
    focus: 'The "cl" cluster and the clear Spanish "a".',
  },
  {
    text: 'Como poco coco como, poco coco compro.',
    gloss: 'Since I eat little coconut, I buy little coconut.',
    focus: 'The hard "c" and short vowels.',
  },
  {
    text: 'El cielo está enladrillado, ¿quién lo desenladrillará?',
    gloss: 'The sky is bricked up; who will unbrick it?',
    focus: 'Long words and the "ll" sound.',
  },
  {
    text: 'Si su gusto gusta del gusto que gusta mi gusto, qué gusto.',
    gloss: 'If your taste likes the taste my taste likes, what a pleasure.',
    focus: 'The "gu" sound and rhythm.',
  },
];
