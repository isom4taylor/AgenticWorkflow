// Per-user "Learning Language Database": server/data/learning/user-<id>.json
//
// Each user gets their own database file containing three tables:
//   Learn, Learning, Learned
// Each row (record) has the shape:
//   { id, base_language, learning_language, base_text, learning_text, notes, created_at, updated_at }

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

function addRecord(userId, tableName, { baseLanguage, learningLanguage, baseText, learningText, notes }) {
  assertTable(tableName);
  const db = load(userId);
  if (tableName === 'Learn' && db.tables.Learn.length >= LEARN_LIST_CAP) {
    throw Object.assign(
      new Error(`The "Learn" list is capped at ${LEARN_LIST_CAP} items. Move some items out before adding more.`),
      { code: 'LEARN_LIST_FULL' }
    );
  }
  const now = new Date().toISOString();
  const record = {
    id: db.nextId++,
    base_language: baseLanguage || 'English',
    learning_language: learningLanguage || 'Spanish',
    base_text: baseText || '',
    learning_text: learningText || '',
    notes: notes || '',
    created_at: now,
    updated_at: now,
  };
  db.tables[tableName].push(record);
  save(userId, db);
  return record;
}

function updateRecord(userId, tableName, id, patch) {
  assertTable(tableName);
  const db = load(userId);
  const list = db.tables[tableName];
  const idx = list.findIndex((r) => r.id === Number(id));
  if (idx === -1) throw Object.assign(new Error('Record not found'), { code: 'NOT_FOUND' });
  const allowed = ['base_language', 'learning_language', 'base_text', 'learning_text', 'notes'];
  const clean = {};
  allowed.forEach((key) => {
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
  if (toTable === 'Learn' && db.tables.Learn.length >= LEARN_LIST_CAP) {
    throw Object.assign(
      new Error(`The "Learn" list is capped at ${LEARN_LIST_CAP} items. Move some items out before adding more.`),
      { code: 'LEARN_LIST_FULL' }
    );
  }
  const [record] = fromList.splice(idx, 1);
  record.updated_at = new Date().toISOString();
  db.tables[toTable].push(record);
  save(userId, db);
  return record;
}

function bulkAdd(userId, tableName, records) {
  assertTable(tableName);
  const db = load(userId);
  const now = new Date().toISOString();
  let added = 0;
  records.forEach((r) => {
    if (tableName === 'Learn' && db.tables.Learn.length >= LEARN_LIST_CAP) return;
    db.tables[tableName].push({
      id: db.nextId++,
      base_language: r.baseLanguage || 'English',
      learning_language: r.learningLanguage || 'Spanish',
      base_text: r.baseText || '',
      learning_text: r.learningText || '',
      notes: r.notes || '',
      created_at: now,
      updated_at: now,
    });
    added += 1;
  });
  save(userId, db);
  return added;
}

function toCsv(rows) {
  const headers = ['base_language', 'learning_language', 'base_text', 'learning_text', 'notes', 'created_at', 'updated_at'];
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
  exportAllAsCsv,
};
