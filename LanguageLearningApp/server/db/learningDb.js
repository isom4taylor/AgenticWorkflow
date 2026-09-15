// Per-user "Learning Language Database": server/data/learning/user-<id>.json
//
// Each user gets their own database file containing three tables:
//   Learn, Learning, Learned
// Each row (record) has the shape:
//   { id, base_language, part_of_speech, learning_language, base_text,
//     learning_text, notes, created_at, updated_at }
//
// `id` is a numeric, auto-incrementing identifier that is unique across all
// three tables for a given user (so moving a record between tables never
// changes its id).

const path = require('path');
const { readJson, writeJson } = require('./jsonFile');

const TABLES = ['Learn', 'Learning', 'Learned'];
const LEARN_LIST_CAP = 100;

const DEFAULT_SEED_WORDS = [
  'one', 'blue', 'fish', 'speak', 'eat', 'five', 'water', 'where', 'to be', 'library',
];

function filePathFor(userId) {
  return path.join(__dirname, '..', 'data', 'learning', `user-${userId}.json`);
}

function emptyDb() {
  return { nextId: 1, tables: { Learn: [], Learning: [], Learned: [] } };
}

function load(userId) {
  return readJson(filePathFor(userId), emptyDb());
}

function save(userId, db) {
  writeJson(filePathFor(userId), db);
}

function assertTable(tableName) {
  if (!TABLES.includes(tableName)) {
    throw Object.assign(new Error(`Unknown table "${tableName}"`), { code: 'BAD_TABLE' });
  }
}

function checkLearnCap(db, toTable) {
  if (toTable === 'Learn' && db.tables.Learn.length >= LEARN_LIST_CAP) {
    throw Object.assign(
      new Error(`The "Learn" list is capped at ${LEARN_LIST_CAP} items. Move some items out before adding more.`),
      { code: 'LEARN_LIST_FULL' }
    );
  }
}

// Creates (or resets) a user's learning database to its initial state:
// the "Learn" table seeded with the default vocabulary, "Learning" and
// "Learned" empty.
function initializeOrReset(userId, { baseLanguage, learningLanguage }) {
  const db = emptyDb();
  const now = new Date().toISOString();
  DEFAULT_SEED_WORDS.forEach((word) => {
    db.tables.Learn.push({
      id: db.nextId++,
      base_language: baseLanguage || 'English',
      part_of_speech: '',
      learning_language: learningLanguage || 'Spanish',
      base_text: word,
      learning_text: '',
      notes: '',
      created_at: now,
      updated_at: now,
    });
  });
  save(userId, db);
  return db;
}

function deleteDb(userId) {
  try {
    require('fs').unlinkSync(filePathFor(userId));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

function listRecords(userId, tableName) {
  assertTable(tableName);
  const db = load(userId);
  return db.tables[tableName];
}

function countRecords(userId, tableName) {
  assertTable(tableName);
  const db = load(userId);
  return db.tables[tableName].length;
}

function makeRecord(db, r) {
  const now = new Date().toISOString();
  return {
    id: db.nextId++,
    base_language: r.baseLanguage || 'English',
    part_of_speech: r.partOfSpeech || '',
    learning_language: r.learningLanguage || 'Spanish',
    base_text: r.baseText || '',
    learning_text: r.learningText || '',
    notes: r.notes || '',
    created_at: now,
    updated_at: now,
  };
}

function addRecord(userId, tableName, fields) {
  assertTable(tableName);
  const db = load(userId);
  checkLearnCap(db, tableName);
  const record = makeRecord(db, fields);
  db.tables[tableName].push(record);
  save(userId, db);
  return record;
}

const PATCHABLE_FIELDS = ['base_language', 'part_of_speech', 'learning_language', 'base_text', 'learning_text', 'notes'];

function updateRecord(userId, tableName, id, patch) {
  assertTable(tableName);
  const db = load(userId);
  const list = db.tables[tableName];
  const idx = list.findIndex((r) => r.id === Number(id));
  if (idx === -1) throw Object.assign(new Error('Record not found'), { code: 'NOT_FOUND' });
  const clean = {};
  PATCHABLE_FIELDS.forEach((key) => {
    if (patch[key] !== undefined) clean[key] = patch[key];
  });
  list[idx] = { ...list[idx], ...clean, updated_at: new Date().toISOString() };
  save(userId, db);
  return list[idx];
}

function deleteRecord(userId, tableName, id) {
  assertTable(tableName);
  const db = load(userId);
  const before = db.tables[tableName].length;
  db.tables[tableName] = db.tables[tableName].filter((r) => r.id !== Number(id));
  save(userId, db);
  return db.tables[tableName].length < before;
}

function moveRecord(userId, fromTable, id, toTable) {
  assertTable(fromTable);
  assertTable(toTable);
  if (fromTable === toTable) throw Object.assign(new Error('Source and destination lists are the same'), { code: 'SAME_LIST' });
  const db = load(userId);
  const fromList = db.tables[fromTable];
  const idx = fromList.findIndex((r) => r.id === Number(id));
  if (idx === -1) throw Object.assign(new Error('Record not found'), { code: 'NOT_FOUND' });
  checkLearnCap(db, toTable);
  const [record] = fromList.splice(idx, 1);
  record.updated_at = new Date().toISOString();
  db.tables[toTable].push(record);
  save(userId, db);
  return record;
}

function bulkAdd(userId, tableName, records) {
  assertTable(tableName);
  const db = load(userId);
  let added = 0;
  records.forEach((r) => {
    if (tableName === 'Learn' && db.tables.Learn.length >= LEARN_LIST_CAP) return;
    db.tables[tableName].push(makeRecord(db, r));
    added += 1;
  });
  save(userId, db);
  return added;
}

// Moves multiple records (by id) from one table to another in a single
// pass. Stops adding to the destination once the Learn cap is hit; returns
// a summary so the caller can report partial success.
function bulkMove(userId, fromTable, ids, toTable) {
  assertTable(fromTable);
  assertTable(toTable);
  if (fromTable === toTable) throw Object.assign(new Error('Source and destination lists are the same'), { code: 'SAME_LIST' });
  const db = load(userId);
  const idSet = new Set(ids.map(Number));
  const fromList = db.tables[fromTable];
  let moved = 0;
  let skippedFull = 0;
  const remaining = [];
  fromList.forEach((record) => {
    if (idSet.has(record.id)) {
      if (toTable === 'Learn' && db.tables.Learn.length >= LEARN_LIST_CAP) {
        skippedFull += 1;
        remaining.push(record); // leave it in the source list
        return;
      }
      record.updated_at = new Date().toISOString();
      db.tables[toTable].push(record);
      moved += 1;
    } else {
      remaining.push(record);
    }
  });
  db.tables[fromTable] = remaining;
  save(userId, db);
  return { moved, skippedFull };
}

function bulkDelete(userId, tableName, ids) {
  assertTable(tableName);
  const db = load(userId);
  const idSet = new Set(ids.map(Number));
  const before = db.tables[tableName].length;
  db.tables[tableName] = db.tables[tableName].filter((r) => !idSet.has(r.id));
  const deleted = before - db.tables[tableName].length;
  save(userId, db);
  return deleted;
}

// Applies the same field patch (e.g. { part_of_speech: 'noun' }) to every
// record whose id is in `ids`.
function bulkUpdate(userId, tableName, ids, patch) {
  assertTable(tableName);
  const db = load(userId);
  const idSet = new Set(ids.map(Number));
  const clean = {};
  PATCHABLE_FIELDS.forEach((key) => {
    if (patch[key] !== undefined) clean[key] = patch[key];
  });
  let updated = 0;
  db.tables[tableName] = db.tables[tableName].map((r) => {
    if (!idSet.has(r.id)) return r;
    updated += 1;
    return { ...r, ...clean, updated_at: new Date().toISOString() };
  });
  save(userId, db);
  return updated;
}

function toCsv(rows) {
  const headers = ['id', 'base_language', 'part_of_speech', 'learning_language', 'base_text', 'learning_text', 'notes', 'created_at', 'updated_at'];
  const escape = (val) => {
    const s = String(val === undefined || val === null ? '' : val);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  });
  return lines.join('\r\n');
}

function exportAllAsCsv(userId) {
  const db = load(userId);
  const result = {};
  TABLES.forEach((t) => {
    result[t] = toCsv(db.tables[t]);
  });
  return result;
}

module.exports = {
  TABLES,
  LEARN_LIST_CAP,
  DEFAULT_SEED_WORDS,
  initializeOrReset,
  deleteDb,
  listRecords,
  countRecords,
  addRecord,
  updateRecord,
  deleteRecord,
  moveRecord,
  bulkAdd,
  bulkMove,
  bulkDelete,
  bulkUpdate,
  exportAllAsCsv,
};
