# Language Learning App

A self-hosted web app for building your own vocabulary/phrase decks, inspired
by a Learn → Learning → Learned workflow, with CSV import from Google
Translate's starred/saved translations.

## Tech stack & why

- **Backend:** Node.js + Express.
- **"Database":** plain JSON files on disk (`server/data/`), accessed
  through a small table-like abstraction (`server/db/`). This avoids native
  modules (e.g. `better-sqlite3`) that need a C++ build toolchain, so the app
  runs on any machine with Node installed — including the Node 14 install
  detected on this machine — with zero extra setup.
- **Frontend:** Plain HTML/CSS/JavaScript (ES modules), no build step. Served
  as static files directly by the Express server.
- **Auth:** email/password with bcrypt hashing + JWT bearer tokens
  (stored in `localStorage` on the client).

## Getting started

```powershell
cd "LanguageLearningApp"
npm install
npm start
```

Then open **http://localhost:4000** in your browser.

Optional environment variables (create a `.env`-style setup or set in your
shell before `npm start`):

- `PORT` — server port (default `4000`)
- `JWT_SECRET` — secret used to sign session tokens (default is a dev-only
  placeholder; set a real secret for anything beyond local use)
- `GOOGLE_TRANSLATE_API_KEY` — optional. If set, auto-translate falls back to
  the official (paid) Cloud Translation API v2 when the free lookup below is
  unavailable. Not required to use the app.

All app data lives under `server/data/` (git-ignored) as JSON files:
- `server/data/users.json` — account records (passwords are bcrypt-hashed)
- `server/data/learning/user-<id>.json` — each user's Learning Language
  Database (the `Learn`, `Learning`, and `Learned` tables)

## Features

### Navigation
The app is a small hash-routed SPA. The **homepage** (`#/`) is a tile grid
leading into the six study sections:

| Tile | Route | What it does |
| --- | --- | --- |
| Words of the Day | `#/words-of-the-day` | One noun, verb and adjective from `Learn` |
| Flash Cards | `#/flash-cards` | Two-sided cards from `Learning` |
| Practice | `#/practice` | Conjugation / speaking / listening drills |
| Quizzes | `#/quizzes` | Listening, spoken numbers, sentence refresher |
| Guides | `#/guides` | Slide-based grammar lessons |
| Teach Me Something | `#/teach-me` | Wikipedia in your learning language |

Everything that used to sit in the top bar as a tab now lives behind the
**profile button** in the top right (`My Words`, `Import Data`, `Settings`,
`Account`, `Log Out`). The only things left in the bar are the app name
(which links home) and the daily streak badge. Deep links work: every page
and sub-page has its own URL, the browser back button behaves, and page
modules return a cleanup function so timers, speech playback and global key
handlers are torn down on navigation.

### Words of the Day
Picks a random word from `Learn` for each part of speech — **noun**, **verb**,
**adjective** — and shows the part-of-speech heading, the learning-language
translation, and the base-language word. Picks are seeded from the calendar
date, so they stay stable all day (that's what makes them words of *the
day*); **🎲 Pick again** re-rolls on demand. Each card has a 🔊 button, and
any part of speech with no matching word shows a prompt to add one instead
of an empty card.

### Flash Cards
Cards are built from `Learning` entries that have **both** sides filled in
(entries still missing a translation can't make a two-sided card, and the
count of skipped entries is reported). The learning-language translation is
on the front in large bold text; the base-language word is hidden below.

- **Tap the card** (click, Enter or Space) to show/hide the answer
- **Swipe right** for the next card, **swipe left** for the previous one
  (touch and mouse drag), or use the **‹ ›** arrows or the **← →** keys
- A **counter** shows the current card out of the total
- Settings at the bottom: **swap languages** (put the base language on the
  front), **shuffle mode** (off by default — on, it shows a randomised
  order; off, it follows the `Learning` list order), and **sort A→Z** by
  either the learning language or the base language

### Practice
Low-pressure drills, nothing scored against you.

- **Conjugation**
  - *Verbs* — conjugate a verb for a given pronoun and tense (present,
    preterite, imperfect, future; mixed or a single tense; all verbs,
    regular only, or irregular only). Regular forms are generated from the
    endings; high-frequency irregulars (`ser`, `estar`, `ir`, `tener`,
    `hacer`, `poder`, `decir`) are spelled out in full. A missing accent is
    graded as correct with a nudge rather than wrong. **Show full table**
    displays the whole six-person conjugation for reference.
  - *Nouns / pronouns* — definite-article agreement (`el/la/los/las`,
    including the exceptions: `el agua`, `la mano`, `el día`, `el problema`)
    and subject-pronoun recall.
  - *Direct / indirect objects* — rewrite a sentence replacing the object
    with a pronoun, including the `le + lo → se lo` contraction. Filterable
    by direct / indirect / both.
- **Speaking**
  - *Numbers* — the untimed version of the numbers game (see Quizzes).
  - *Words / phrases* — a word from any of your lists is shown in the base
    language and you say the translation; the mic grades it.
  - *Tongue twisters* — six Spanish twisters with a gloss, a pronunciation
    focus note, adjustable playback speed, and a mic attempt graded on how
    many words came through.
- **Listening**
  - *Read my lists aloud* — plays each entry and its translation in turn,
    highlighting the current row. Pick the list, the speed, and whether to
    group by part of speech (each group can also be played on its own).

### Quizzes
- **Listening** — builds a short phrase from your `Learned` vocabulary,
  speaks it in the learning language, and asks you to type what it means in
  your base language. Grading looks only at the **content words**, so
  phrasing and filler don't cost you a point; partial answers report which
  words are missing. Needs at least 2 translated `Learned` entries.
- **Speaking** — the number on screen has to be said out loud in the
  learning language. Choose the **maximum number** (0–10, 0–100, 0–1000)
  and a **difficulty** that sets the per-number timer: **easy 10s**,
  **medium 6s**, **hard 3s**. Difficulty defaults from your fluency setting
  (beginner→easy, intermediate→medium, advanced→hard). A correct answer
  scores a point, shows a new number and restarts the clock; when the clock
  runs out you get your score with **Play again** and a link back to the
  menu. Spanish and English numbers are spelled out properly for grading
  (`58` → `cincuenta y ocho`), and matching tolerates missing accents,
  spoken digits and filler words.
- **Refresher** — shows a base-language word from `Learned` and asks you to
  write a sentence in the learning language using it. There's no grammar
  checker, so the check is deliberately mechanical: it verifies you actually
  used the target word and wrote a real sentence rather than a fragment, and
  can read your sentence back to you.

### Guides
A table of contents leading into slide-based lessons with prev/next
buttons, clickable slide dots, **← →** keyboard navigation, and a 🔊 button
that reads the Spanish examples aloud. Lessons:

1. **Parts of Speech / Sentence structure** — the nine word classes, SVO
   order and pro-drop, adjective placement and the agreement chain,
   questions and negation
2. **Pronouns** — subject, direct object, indirect object, reflexive and
   prepositional pronouns, plus placement rules
3. **Verb tenses** — when to use each one, example usage side by side, and
   conjugation variants (regular endings, stem changes, spelling changes,
   true irregulars)
4. **Alphabet** — all 27 letters and their names, the vowels, and the
   consonants that trip learners up
5. **Accentuation** — finding the stressed syllable, **agudas**, **llanas**,
   esdrújulas, and the accents that only distinguish meaning

Slides support images (`{ src, alt, caption }`) and render them when
present; none ship with the app, so drop files in `public/img` and
reference them from `guidesContent.js` to add visuals.

### Teach Me Something
Search Wikipedia **in your learning language** (the request is proxied
through the server so it can map your language to the right wiki subdomain).

- **Highlight any word or phrase** in the article text and a bar appears at
  the bottom with **➕ Add to Learn**. Since a `Learn` record needs a
  base-language side too, the selection is auto-translated *in reverse*
  (learning → base) and shown in a review modal so you can correct it and
  set a part of speech before saving. If auto-translate is rate-limited the
  modal just opens with the base field empty for you to fill in.
- **🎲 Random** picks a random topic from a random category (food,
  beverages, animals, plants, furniture, clothing, household items,
  hobbies, activities), resolved to the learning language via Wikipedia's
  language links. You can also pin the category. If a topic has no article
  in your learning language, the English one is shown with a notice.

### Speech features & browser support
Anything that speaks uses the Web Speech API's `SpeechSynthesis`, which is
broadly supported. Anything that **listens** uses `SpeechRecognition`, which
today means **Chrome or Edge**, over `localhost` or HTTPS, with microphone
permission granted. Every mic-based drill detects this up front and falls
back to typing the answer instead of showing a dead button, and the number
game switches to the typed fallback if the mic is blocked mid-round.

### Account
- **Create Account** — email + password. If the email is already registered,
  the UI offers a password-reset shortcut instead of failing silently.
- **Log In / Log Out**
- **Reset Password** — click **Forgot password?** on the login screen (or
  the prompt shown when registering with an email that's already in use)
  to set a new password directly with just your email + a new password. No
  mail server is configured for this demo app, so there's no email
  verification step — anyone who knows the account email can reset its
  password. Treat this the same as you would any other account-recovery
  flow in a project you intend to expose beyond local/trusted use.
- **Import Data** — upload a CSV exported from Google Translate's starred
  list. The file has **no header row**; each row's columns mean
  `Language1,Language2,WordInLanguage1,WordInLanguage2` (languages may be
  given as codes like `en`/`es` or full names like `English`/`Spanish`, and
  can appear in either order — e.g. `en,es,library,biblioteca` or
  `es,en,biblioteca,library`). The importer detects which column matches
  your account's base language and places that word in the base column,
  putting the other word/language into the learning column. A simple
  2-column `[baseText, learningText]` CSV is also supported as a fallback.
  Imported rows land in the **Learning** table.
  - **Advanced import**: optionally splits each phrase into individual
    sentences/clauses before import, so long starred phrases become smaller,
    more digestible flashcards. Sentence alignment between languages is
    best-effort (by position), since there's no translation engine involved.
- **Reset Account** — restores the Learning Language Database to its initial
  state (the default 10-word seed list in `Learn`, empty `Learning`/`Learned`).
- **Delete Account** — requires confirmation, and offers to export your
  Learning Language Database to CSVs (as a ZIP download) before deleting.

### User Settings
- Email, password
- Base language, learning language(s)
- Language fluency (beginner / intermediate / advanced)
- Daily streak count (auto-incremented once per calendar day on login)

### Learning Language Database
Each account gets its own database with three tables: **Learn**, **Learning**,
**Learned**. New accounts are seeded with 10 starter English words in `Learn`.
Every record has a numeric **id**, a **Part of Speech** column (noun, verb,
adjective, etc.), plus the base-language text and learning-language
translation. The editor shows all three (English word, Part of Speech,
Translation) and its field labels/placeholders always reflect your actual
configured base/learning languages (e.g. "English" / "Spanish") rather than
generic text.

From **My Words** (in the profile dropdown) you can, per list:
- Add a new record (base text + optional part of speech + optional
  learning-language text — or use **🔄 Translate** to auto-fill it, see below)
- Edit a record (base text, part of speech, translation)
- Move a record to any other list (e.g. Learn → Learning: "I want to learn it
  now"; Learning → Learn: "snooze for later"; any → Learned: "I've learned
  it"; Learned → Learning: "refresh/relearn it")
- Delete a record

The `Learn` list is capped at 100 items (adding/moving more into it is
blocked with a clear error) to match the "always 100" design intent.

### Auto-translate
Click **🔄 Translate** next to the base-text field (or leave the translation
blank and add manually if you prefer — both are supported). It looks up
translation candidates for the word, grouped by part of speech, and shows
them in a modal where each option has its own checkbox plus a **"Select all
(mass accept)"** toggle:
- Check one option and accept it → fills the translation + part-of-speech
  fields for you to review before adding.
- Check multiple options (or "select all") and accept → creates one record
  per selected option immediately (e.g. "run" → verb: correr, ejecutar;
  noun: carrera).

**Limitation:** there is no public, documented Google API for word-level
translation options with part-of-speech data. This feature primarily uses
the same unofficial JSON endpoint that powers the dictionary panel on
translate.google.com (no API key needed) — but that endpoint is currently
returning `HTTP 429` (rate-limited) quite broadly, not just from sandboxed
dev environments, so the app automatically falls back in this order:
1. Unofficial Google endpoint (dictionary + part-of-speech options),
   retried once.
2. Official Cloud Translation API v2, only if you've set
   `GOOGLE_TRANSLATE_API_KEY` (paid, reliable, but plain translation only —
   no part-of-speech breakdown).
3. [MyMemory](https://mymemory.translated.net/)'s free translation API (no
   key required, plain translation only). Quality is community/translation-
   memory sourced, so it's occasionally rough around the edges, but keeps
   the button usable out of the box while Google's free endpoint is blocked.

If every step fails (rare — e.g. you're offline), the app tells you clearly
and you can always type the translation in manually. If you want the most
reliable/high-quality result, set `GOOGLE_TRANSLATE_API_KEY`.

### Advanced Editor Mode
Toggle **Advanced Editor Mode** (next to the list tabs) to mass-manage
records:
- Every row gets a checkbox, plus a **Select All** toggle.
- **Move Selected** — bulk-move all checked records to another list.
- **Set Part of Speech** — bulk-apply a part of speech to all checked records.
- **Delete Selected** — bulk-delete all checked records.
- **Mass Add** panel — add many records at once, one per line:
  `Base text, Translation, Part of speech` (translation and part of speech
  are optional).

**Selecting rows** follows the familiar file-manager convention (also shown
as a hint next to "Select All"):
- **Click** a checkbox — selects only that row, clearing any other selection.
- **Ctrl+Click** (⌘+Click on Mac) — adds/removes just that row from the
  current selection without touching the rest.
- **Shift+Click** — selects every row between the last-clicked row and the
  one you just clicked, in addition to whatever's already selected. Great
  for grabbing a big contiguous block quickly.

### Duplicate prevention & cleanup
- **On add (single or bulk):** before a record is saved, the app checks
  whether that exact word + translation combination already exists anywhere
  in Learn, Learning, or Learned.
  - Single **Add Record** (or the auto-translate "fill in and review" path):
    if a duplicate is found, a warning pop-up tells you the word and which
    list it's already in, and the record is **not** added.
  - Bulk operations (**Mass Add**, and accepting multiple auto-translate
    options at once): every unique record is added, and any duplicates
    (against the existing database *or* against another line in the same
    batch) are silently skipped and called out in the summary toast, e.g.
    `Added 3 record(s). Skipped 2 duplicate(s): "cat" (already in Learn), ...`.
  - Note: two entries for the same word with *different* translations are
    **not** considered duplicates of each other — that's what lets
    auto-translate's "mass accept" add several senses of one word (e.g.
    "run" → verb: *correr*, noun: *carrera*) as separate records.
- **Clean Up Duplicates** (Account tab): a one-click scan that removes a
  word that ended up listed more than once — whether that's two copies in
  the same list, or the same word spread across multiple lists — regardless
  of whether a translation has been filled in yet. When a word spans more
  than one list, exactly one copy is kept using this priority:
  - Learn + Learning + Learned → keep the **Learning** copy
  - Learn + Learning → keep the **Learning** copy
  - Learning + Learned → keep the **Learning** copy
  - Learn + Learned → keep the **Learned** copy
  - Duplicates confined to a single list keep the earliest-added copy.

## Project structure

```
LanguageLearningApp/
  server/
    server.js            Express app entry point
    config.js            Port / JWT config
    db/
      jsonFile.js         Generic sync JSON read/write helper
      users.js            Users "table" (create/find/update/delete, auth helpers)
      learningDb.js        Per-user Learn/Learning/Learned "database"
    middleware/auth.js     JWT bearer-token auth guard
    routes/
      auth.js              register / login / logout / me / forgot-password
      account.js           settings / password / reset / dedupe / export / delete
      lists.js             CRUD + bulk move/edit/add/delete for Learn/Learning/Learned
      import.js            CSV upload & import
      translate.js         auto-translate endpoint (either direction)
      wiki.js              Wikipedia search / random / categories proxy
    utils/
      googleTranslateCsv.js  CSV parsing for Google Translate exports
      textSplit.js            Sentence-splitting for "advanced import"
      languageCodes.js        language name <-> code lookups
      translate.js             auto-translate client (unofficial + official API)
      httpJson.js              promise wrapper around https.get for JSON APIs
  public/                  Static frontend (no build step)
    index.html
    styles.css
    js/
      api.js               fetch wrapper + auth token storage
      ui.js                 toasts & modals (incl. translate-options modal)
      main.js               app shell: auth, profile menu, routes, list editor
      router.js             hash router with per-route cleanup
      panels.js             show/hide the one visible page panel
      state.js              signed-in user + language accessors
      speech.js             SpeechSynthesis / SpeechRecognition wrappers
      textMatch.js          accent/punctuation-tolerant answer comparison
      numberWords.js        number -> words (es/en) for grading spoken numbers
      conjugation.js        Spanish conjugation engine + verb bank
      practiceContent.js    article/pronoun/object drill banks, tongue twisters
      guidesContent.js      the Guides lesson slides
      constants.js           shared part-of-speech list
      pages/
        home.js              homepage tile grid
        wordsOfTheDay.js     date-seeded picks per part of speech
        flashCards.js        card deck, swipe/arrow nav, sort & shuffle
        practice.js          practice index + every drill
        numbersGame.js       spoken-numbers drill (timed & untimed)
        quizzes.js           quiz index + listening & refresher
        guides.js            table of contents + slide viewer
        teachMe.js           Wikipedia reader + highlight-to-add
```

## Google account linking (not implemented — see why)

There is no public, documented Google API/OAuth scope that exposes a user's
Google Translate "starred translations" or "translation history" for
third-party apps to pull programmatically — this data is only accessible
through the Translate website's own UI (which is why it offers a manual CSV
export of your starred list, the same CSV this app's **Import Data** feature
already consumes). Google Cloud's "Translation API" is a separate product
(pay-per-character text translation) with no concept of per-user history —
it's not the same thing as translate.google.com's saved phrases.

So "linking a Google account to pull starred translations/history" isn't
achievable via a supported API. The closest practical equivalent already
built into this app is: export your starred list from Google Translate as a
CSV → import it here (**Import Data**, with optional sentence-splitting).

## Notes & simplifications

- Password reset ("forgot password") sets a new password directly rather
  than emailing a verification link, since no mail server is configured in
  this environment. In a production deployment you'd add email verification.
- The "database" is JSON-file based rather than a real SQL engine, to avoid
  native-module build requirements. The data access layer (`server/db/`) is
  isolated enough that it could be swapped for SQLite/Postgres later without
  touching the routes.
- The grammar content (Guides lessons, conjugation engine, article/pronoun
  and object-pronoun drill banks, tongue twisters) is **Spanish-specific**,
  matching the default learning language. Those screens show a notice when
  your learning language is something else. The language-agnostic
  features — Words of the Day, Flash Cards, Practice → Listening, Quizzes →
  Listening and Refresher, and Teach Me Something — work for any language
  the server can map to a code.
- Quiz grading is mechanical, not linguistic: there's no grammar checker or
  translation scorer behind it. The Listening quiz checks that the expected
  content words appear in your answer, and the Refresher checks that you
  used the target word in something sentence-length. Both are honest signals
  of recall without pretending to evaluate grammar.
- The Listening quiz composes phrases from your vocabulary using simple
  sentence frames (only when every chosen word is a noun, so the result
  reads naturally) or a plain conjunction-joined list otherwise. It does not
  generate arbitrary grammatical sentences.
