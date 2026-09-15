// Lesson content for the Guides page, written for Spanish (the app's
// default learning language).
//
// A slide may carry any combination of `body` paragraphs, `bullets`, a
// `table`, a `note`, and an `image` ({ src, alt, caption }). No images ship
// with the app, but the viewer renders them whenever a slide supplies one -
// drop files in /public/img and reference them here.

export const LESSONS = [
  {
    id: 'parts-of-speech',
    icon: '🧩',
    title: 'Parts of Speech / Sentence structure',
    summary: 'The nine word classes, default word order, and how agreement ties a sentence together.',
    slides: [
      {
        title: 'The nine parts of speech',
        body: ['Every Spanish word belongs to one of these classes. Knowing which one you are dealing with tells you what has to agree with what.'],
        table: {
          headers: ['Spanish', 'English', 'Example'],
          rows: [
            ['el sustantivo', 'noun', 'la casa'],
            ['el artículo', 'article', 'el, la, un, una'],
            ['el adjetivo', 'adjective', 'grande, azul'],
            ['el verbo', 'verb', 'hablar, comer'],
            ['el adverbio', 'adverb', 'rápidamente, muy'],
            ['el pronombre', 'pronoun', 'yo, tú, lo'],
            ['la preposición', 'preposition', 'en, de, con'],
            ['la conjunción', 'conjunction', 'y, pero, porque'],
            ['la interjección', 'interjection', '¡ay!, ¡oye!'],
          ],
        },
      },
      {
        title: 'Default word order: Subject – Verb – Object',
        body: ['Spanish shares English\'s basic order, so a simple sentence maps across almost word for word.'],
        bullets: [
          'María come manzanas. → María eats apples.',
          'El niño lee el libro. → The boy reads the book.',
        ],
        note: 'Because the verb ending already tells you who is acting, the subject pronoun is usually dropped: "Como manzanas" is more natural than "Yo como manzanas". Add the pronoun back only for emphasis or contrast.',
      },
      {
        title: 'Adjectives follow the noun — and agree with it',
        body: ['This is the biggest structural difference from English. The adjective comes after the noun and copies its gender and number.'],
        bullets: [
          'la casa blanca → the white house',
          'las casas blancas → the white houses',
          'el coche blanco → the white car',
          'los coches blancos → the white cars',
        ],
        note: 'A few adjectives go before the noun and change meaning when they do: "un gran hombre" is a great man, "un hombre grande" is a big man.',
      },
      {
        title: 'The agreement chain',
        body: ['Gender and number ripple outward from the noun through its article and every adjective describing it. Get the noun right and the rest follows.'],
        table: {
          headers: ['', 'Masculine', 'Feminine'],
          rows: [
            ['Singular', 'el gato negro', 'la gata negra'],
            ['Plural', 'los gatos negros', 'las gatas negras'],
          ],
        },
      },
      {
        title: 'Questions and negation',
        bullets: [
          'Questions open with ¿ and close with ?: ¿Dónde está la biblioteca?',
          'Exclamations do the same with ¡ … !: ¡Qué bien!',
          'Negate by putting "no" directly before the verb: No hablo francés.',
          'Double negatives are correct, not a mistake: No veo nada. (I don\'t see anything.)',
        ],
        note: 'Word order barely changes in a question — intonation and the punctuation do the work. "¿Tú hablas español?" and "¿Hablas español?" are both fine.',
      },
    ],
  },

  {
    id: 'pronouns',
    icon: '👤',
    title: 'Pronouns',
    summary: 'Subject, direct object, indirect object, reflexive and prepositional pronouns — plus where they sit in the sentence.',
    slides: [
      {
        title: 'Subject pronouns',
        table: {
          headers: ['Spanish', 'English', 'Notes'],
          rows: [
            ['yo', 'I', ''],
            ['tú', 'you (informal)', 'one person you know'],
            ['usted', 'you (formal)', 'takes he/she verb forms'],
            ['él / ella', 'he / she', ''],
            ['nosotros / nosotras', 'we', 'nosotras if everyone is female'],
            ['vosotros / vosotras', 'you all (informal)', 'Spain only'],
            ['ustedes', 'you all', 'formal in Spain, everyday in Latin America'],
            ['ellos / ellas', 'they', 'ellas if everyone is female'],
          ],
        },
        note: 'Remember: these are usually left out. The verb ending carries the information.',
      },
      {
        title: 'Direct object pronouns',
        body: ['These replace the thing being acted on — the answer to "what?" or "whom?".'],
        table: {
          headers: ['Pronoun', 'Replaces', 'Example'],
          rows: [
            ['me', 'me', 'Ella me ve.'],
            ['te', 'you (informal)', 'Yo te veo.'],
            ['lo / la', 'him / her / it / you (formal)', 'Lo veo. / La veo.'],
            ['nos', 'us', 'Ellos nos ven.'],
            ['os', 'you all (Spain)', 'Yo os veo.'],
            ['los / las', 'them / you all', 'Los veo. / Las veo.'],
          ],
        },
        bullets: ['Veo el libro. → Lo veo.', 'Compro las flores. → Las compro.'],
      },
      {
        title: 'Indirect object pronouns',
        body: ['These mark the recipient — the answer to "to whom?" or "for whom?".'],
        table: {
          headers: ['Pronoun', 'Replaces', 'Example'],
          rows: [
            ['me', 'to/for me', 'Me das el libro.'],
            ['te', 'to/for you', 'Te doy el libro.'],
            ['le', 'to/for him, her, you (formal)', 'Le doy el libro.'],
            ['nos', 'to/for us', 'Nos dan flores.'],
            ['os', 'to/for you all (Spain)', 'Os doy el libro.'],
            ['les', 'to/for them, you all', 'Les doy el libro.'],
          ],
        },
        note: 'When both pronouns appear, indirect comes first — and "le/les + lo/la" becomes "se lo / se la": "Doy el libro a María" → "Se lo doy."',
      },
      {
        title: 'Reflexive pronouns',
        body: ['Used when the subject acts on itself. The pronoun is part of the verb\'s identity, which is why dictionaries list "levantarse", not "levantar".'],
        table: {
          headers: ['Pronoun', 'Example', 'English'],
          rows: [
            ['me', 'me levanto', 'I get (myself) up'],
            ['te', 'te levantas', 'you get up'],
            ['se', 'se levanta', 'he/she gets up'],
            ['nos', 'nos levantamos', 'we get up'],
            ['os', 'os levantáis', 'you all get up'],
            ['se', 'se levantan', 'they get up'],
          ],
        },
      },
      {
        title: 'Where the pronoun goes',
        bullets: [
          'Before a conjugated verb: Lo veo. / No lo veo.',
          'Attached to an infinitive: Quiero verlo. (or "Lo quiero ver" — both are correct.)',
          'Attached to a gerund: Estoy viéndolo.',
          'Attached to an affirmative command: ¡Dímelo!',
          'Before a negative command: ¡No me lo digas!',
        ],
        note: 'Attaching a pronoun can shift where the stress falls, which is why written accents appear: "viendo" → "viéndolo".',
      },
      {
        title: 'Pronouns after prepositions',
        body: ['After a preposition, Spanish uses a separate set. Only the "I" and "you" forms differ from the subject pronouns.'],
        bullets: [
          'para mí, para ti, para él / ella / usted',
          'para nosotros, para vosotros, para ellos / ellas / ustedes',
          'Con is irregular: conmigo, contigo, consigo.',
        ],
      },
    ],
  },

  {
    id: 'verb-tenses',
    icon: '⏳',
    title: 'Verb tenses',
    summary: 'When each tense is used, how it looks in a real sentence, and the conjugation patterns behind it.',
    slides: [
      {
        title: 'The tenses worth learning first',
        body: ['Four indicative tenses will carry almost any everyday conversation. Everything else is built on top of these.'],
        table: {
          headers: ['Tense', 'Spanish', 'Rough English'],
          rows: [
            ['Present', 'presente', 'I speak / I am speaking'],
            ['Preterite', 'pretérito indefinido', 'I spoke'],
            ['Imperfect', 'pretérito imperfecto', 'I used to speak / I was speaking'],
            ['Future', 'futuro simple', 'I will speak'],
          ],
        },
      },
      {
        title: 'When to use each one',
        bullets: [
          'Present — what is true now, habits, and near-future plans: Trabajo mañana.',
          'Preterite — a finished action with a clear beginning and end: Ayer comí paella.',
          'Imperfect — background, description, and repeated past habits: Cuando era niño, comía paella todos los domingos.',
          'Future — predictions and intentions: Mañana comeré paella.',
        ],
        note: 'Preterite vs imperfect is the hardest call for English speakers. Ask yourself: am I reporting an event (preterite) or painting the scene it happened in (imperfect)? Both often appear in one sentence: "Leía un libro cuando sonó el teléfono."',
      },
      {
        title: 'Example usage side by side',
        table: {
          headers: ['Tense', 'Example', 'English'],
          rows: [
            ['Present', 'Hablo con mi hermana.', 'I speak with my sister.'],
            ['Preterite', 'Hablé con mi hermana ayer.', 'I spoke with my sister yesterday.'],
            ['Imperfect', 'Hablaba con mi hermana cada día.', 'I used to speak with my sister every day.'],
            ['Future', 'Hablaré con mi hermana mañana.', 'I will speak with my sister tomorrow.'],
          ],
        },
        note: 'Time markers are your friend: ayer and anoche pull toward the preterite; siempre, cada día and mientras pull toward the imperfect.',
      },
      {
        title: 'Conjugation variants: the regular endings',
        body: ['Drop the -ar/-er/-ir and add the ending. The future is the odd one out: its endings attach to the whole infinitive.'],
        table: {
          headers: ['', '-ar (hablar)', '-er (comer)', '-ir (vivir)'],
          rows: [
            ['Present', 'hablo, hablas, habla, hablamos, habláis, hablan', 'como, comes, come, comemos, coméis, comen', 'vivo, vives, vive, vivimos, vivís, viven'],
            ['Preterite', 'hablé, hablaste, habló, hablamos, hablasteis, hablaron', 'comí, comiste, comió, comimos, comisteis, comieron', 'viví, viviste, vivió, vivimos, vivisteis, vivieron'],
            ['Imperfect', 'hablaba, hablabas, hablaba, hablábamos, hablabais, hablaban', 'comía, comías, comía, comíamos, comíais, comían', 'vivía, vivías, vivía, vivíamos, vivíais, vivían'],
            ['Future', 'hablaré, hablarás, hablará, hablaremos, hablaréis, hablarán', 'comeré, comerás, comerá, comeremos, comeréis, comerán', 'viviré, vivirás, vivirá, viviremos, viviréis, vivirán'],
          ],
        },
        note: '-er and -ir verbs share their preterite and imperfect endings — that\'s two fewer patterns to memorise.',
      },
      {
        title: 'Conjugation variants: predictable irregularities',
        body: ['Most "irregular" verbs are not random. They follow a handful of sub-patterns.'],
        bullets: [
          'Stem-changing e→ie: pensar → pienso, pero pensamos (the change skips nosotros/vosotros).',
          'Stem-changing o→ue: poder → puedo, dormir → duermo.',
          'Stem-changing e→i: pedir → pido, servir → sirvo.',
          'Irregular yo form only: tener → tengo, hacer → hago, salir → salgo, conocer → conozco.',
          'Spelling kept, sound kept: buscar → busqué, llegar → llegué, empezar → empecé.',
        ],
        note: 'The spelling changes in that last group exist purely to preserve the sound. "Buscé" would be pronounced with an s-sound, so the c becomes qu.',
      },
      {
        title: 'Truly irregular: the ones to memorise',
        table: {
          headers: ['Verb', 'Present', 'Preterite'],
          rows: [
            ['ser (to be)', 'soy, eres, es, somos, sois, son', 'fui, fuiste, fue, fuimos, fuisteis, fueron'],
            ['estar (to be)', 'estoy, estás, está, estamos, estáis, están', 'estuve, estuviste, estuvo, estuvimos, estuvisteis, estuvieron'],
            ['ir (to go)', 'voy, vas, va, vamos, vais, van', 'fui, fuiste, fue, fuimos, fuisteis, fueron'],
            ['tener (to have)', 'tengo, tienes, tiene, tenemos, tenéis, tienen', 'tuve, tuviste, tuvo, tuvimos, tuvisteis, tuvieron'],
          ],
        },
        note: 'Yes — ser and ir share the same preterite. Context tells them apart: "Fui médico" (I was a doctor) vs "Fui al médico" (I went to the doctor).',
      },
    ],
  },

  {
    id: 'alphabet',
    icon: '🔤',
    title: 'Alphabet',
    summary: 'All 27 letters, why the vowels are easier than English, and the consonants that trip people up.',
    slides: [
      {
        title: 'The 27 letters',
        body: ['Spanish uses the Latin alphabet plus ñ. Letter names matter when spelling things out loud.'],
        table: {
          headers: ['Letter', 'Name', 'Letter', 'Name'],
          rows: [
            ['a', 'a', 'n', 'ene'],
            ['b', 'be', 'ñ', 'eñe'],
            ['c', 'ce', 'o', 'o'],
            ['d', 'de', 'p', 'pe'],
            ['e', 'e', 'q', 'cu'],
            ['f', 'efe', 'r', 'erre'],
            ['g', 'ge', 's', 'ese'],
            ['h', 'hache', 't', 'te'],
            ['i', 'i', 'u', 'u'],
            ['j', 'jota', 'v', 'uve'],
            ['k', 'ka', 'w', 'uve doble'],
            ['l', 'ele', 'x', 'equis'],
            ['m', 'eme', 'y', 'ye'],
            ['', '', 'z', 'zeta'],
          ],
        },
        note: 'k and w appear almost only in borrowed words (kilo, web). ch, ll and rr are digraphs — two letters making one sound — not separate alphabet entries any more.',
      },
      {
        title: 'The vowels are the good news',
        body: ['Each vowel has exactly one sound, every time, regardless of the letters around it. There is nothing like English\'s "though / through / tough".'],
        table: {
          headers: ['Vowel', 'Sound', 'Example'],
          rows: [
            ['a', 'ah', 'casa'],
            ['e', 'eh', 'mesa'],
            ['i', 'ee', 'vino'],
            ['o', 'oh', 'todo'],
            ['u', 'oo', 'luna'],
          ],
        },
        note: 'Keep them short and crisp. English speakers tend to add a glide — "casa" is "KA-sa", not "KAY-suh".',
      },
      {
        title: 'Consonants that need care',
        bullets: [
          'h is silent, always: hola sounds like "ola".',
          'j is a throaty h: jamón. And g before e/i does the same: gente, girasol.',
          'g before a/o/u is hard: gato. Add u to keep it hard before e/i: guerra.',
          'c before a/o/u is a k: casa. Before e/i it is an s (Latin America) or th (most of Spain): cinco.',
          'z follows the same split as soft c: zapato.',
          'b and v are pronounced identically. Spaniards spell out "be" and "uve" to tell them apart.',
          'r between vowels is a single tap: para. rr — or r starting a word — is rolled: perro, rojo.',
          'ñ is the "ny" in canyon: año (year) is very different from ano.',
          'll is usually a y sound: llamar. So is y: yo. (This merger is called yeísmo.)',
        ],
      },
    ],
  },

  {
    id: 'accentuation',
    icon: '´',
    title: 'Accentuation',
    summary: 'Where the stress falls, when a written accent is required, and what agudas and llanas mean.',
    slides: [
      {
        title: 'First: find the stressed syllable',
        body: ['Every Spanish word of more than one syllable has one syllable said with more force — the sílaba tónica. Spanish accent rules are entirely about marking that syllable when its position is unexpected.'],
        bullets: [
          'ca-SA → stress on the second-to-last syllable',
          'ca-mi-NAR → stress on the last syllable',
          'TE-lé-fo-no → stress on the third-to-last syllable',
        ],
        note: 'Words are classified by which syllable carries that stress. That classification is what decides whether you write an accent.',
      },
      {
        title: 'Agudas — stress on the last syllable',
        body: ['A palabra aguda is stressed on its final syllable. It takes a written accent when it ends in a vowel, -n, or -s.'],
        table: {
          headers: ['Accent needed', 'No accent needed'],
          rows: [
            ['café (ends in vowel)', 'reloj (ends in j)'],
            ['canción (ends in n)', 'papel (ends in l)'],
            ['jamás (ends in s)', 'feliz (ends in z)'],
            ['sofá, menú, inglés', 'ciudad, hablar, error'],
          ],
        },
        note: 'Memorable shortcut: agudas get the accent for "n, s, or vowel" — the exact opposite of the llanas rule on the next slide.',
      },
      {
        title: 'Llanas — stress on the second-to-last syllable',
        body: ['A palabra llana (also called grave) is stressed on the penultimate syllable. This is the default pattern for Spanish words, so it needs an accent only in the less common case: when the word does NOT end in a vowel, -n, or -s.'],
        table: {
          headers: ['Accent needed', 'No accent needed'],
          rows: [
            ['árbol (ends in l)', 'casa'],
            ['lápiz (ends in z)', 'mesa'],
            ['cárcel (ends in l)', 'examen'],
            ['fácil, útil, azúcar', 'zapatos, hablan, grande'],
          ],
        },
        note: 'Because most Spanish words are llanas ending in a vowel or -s, most Spanish words carry no accent at all.',
      },
      {
        title: 'Esdrújulas — always accented',
        body: ['Worth knowing because it completes the system: if the stress falls on the third-to-last syllable or earlier, the accent is written every single time, with no conditions.'],
        bullets: [
          'teléfono, música, sábado, rápido, película',
          'And earlier still (sobresdrújulas), also always: dígamelo, cómpratelo',
        ],
        note: 'This is why adding a pronoun can create an accent: "diga" has none, but "dígamelo" must have one.',
      },
      {
        title: 'Accents that change meaning',
        body: ['Some one-syllable words take an accent purely to distinguish a pair of words. The stress is identical — only the meaning differs. This is the tilde diacrítica.'],
        table: {
          headers: ['With accent', 'Without accent'],
          rows: [
            ['él (he)', 'el (the)'],
            ['tú (you)', 'tu (your)'],
            ['mí (me)', 'mi (my)'],
            ['sí (yes)', 'si (if)'],
            ['más (more)', 'mas (but)'],
            ['sé (I know)', 'se (reflexive pronoun)'],
            ['té (tea)', 'te (you, object)'],
            ['qué / cómo / dónde (questions)', 'que / como / donde (statements)'],
          ],
        },
        note: 'Accents also break up vowel pairs that would otherwise be read as one syllable: "dia" would be one syllable, so "día" takes an accent to split it. Same with país and río.',
      },
    ],
  },
];

export function findLesson(id) {
  return LESSONS.find((lesson) => lesson.id === id) || null;
}
