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

All app data lives under `server/data/` (git-ignored) as JSON files:
- `server/data/users.json` — account records (passwords are bcrypt-hashed)
- `server/data/learning/user-<id>.json` — each user's Learning Language
  Database (the `Learn`, `Learning`, and `Learned` tables)

## Features

### Account
- **Create Account** — email + password. If the email is already registered,
  the UI offers a password-reset shortcut instead of failing silently.
- **Log In / Log Out**
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

From the **My Words** tab you can, per list:
- Add a new record (base text + optional learning-language text)
- Edit a record
- Move a record to any other list (e.g. Learn → Learning: "I want to learn it
  now"; Learning → Learn: "snooze for later"; any → Learned: "I've learned
  it"; Learned → Learning: "refresh/relearn it")
- Delete a record

The `Learn` list is capped at 100 items (adding/moving more into it is
blocked with a clear error) to match the "always 100" design intent.

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
      lists.js             CRUD + move for Learn/Learning/Learned
      import.js            CSV upload & import
    utils/
      googleTranslateCsv.js  CSV parsing for Google Translate exports
      textSplit.js            Sentence-splitting for "advanced import"
  public/                  Static frontend (no build step)
    index.html
    styles.css
    js/
      api.js               fetch wrapper + auth token storage
      ui.js                 toasts & modals
      main.js               app logic / view wiring
```

## Notes & simplifications

- Password reset ("forgot password") sets a new password directly rather
  than emailing a verification link, since no mail server is configured in
  this environment. In a production deployment you'd add email verification.
- The "database" is JSON-file based rather than a real SQL engine, to avoid
  native-module build requirements. The data access layer (`server/db/`) is
  isolated enough that it could be swapped for SQLite/Postgres later without
  touching the routes.
