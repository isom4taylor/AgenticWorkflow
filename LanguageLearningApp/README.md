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

From the **My Words** tab you can, per list:
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
      account.js           settings / password / reset / export / delete
      lists.js             CRUD + bulk move/edit/add/delete for Learn/Learning/Learned
      import.js            CSV upload & import
      translate.js         auto-translate endpoint
    utils/
      googleTranslateCsv.js  CSV parsing for Google Translate exports
      textSplit.js            Sentence-splitting for "advanced import"
      languageCodes.js        language name <-> code lookups
      translate.js             auto-translate client (unofficial + official API)
  public/                  Static frontend (no build step)
    index.html
    styles.css
    js/
      api.js               fetch wrapper + auth token storage
      ui.js                 toasts & modals (incl. translate-options modal)
      main.js               app logic / view wiring
      constants.js           shared part-of-speech list
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
