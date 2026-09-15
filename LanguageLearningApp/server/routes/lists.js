const express = require('express');
const learningDb = require('../db/learningDb');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function handleDbError(res, err) {
  if (err.code === 'BAD_TABLE') return res.status(404).json({ error: err.message });
  if (err.code === 'NOT_FOUND') return res.status(404).json({ error: err.message });
  if (err.code === 'LEARN_LIST_FULL') return res.status(409).json({ error: err.message });
  if (err.code === 'SAME_LIST') return res.status(400).json({ error: err.message });
  if (err.code === 'DUPLICATE') return res.status(409).json({ error: err.message, table: err.table });
  console.error(err);
  return res.status(500).json({ error: 'Unexpected server error.' });
}

function fieldsFromBody(body, defaults) {
  const { baseText, learningText, baseLanguage, learningLanguage, partOfSpeech, notes } = body || {};
  return {
    baseText,
    learningText,
    partOfSpeech,
    notes,
    baseLanguage: baseLanguage || defaults.baseLanguage,
    learningLanguage: learningLanguage || defaults.learningLanguage,
  };
}

function patchFromBody(body) {
  const { baseText, learningText, baseLanguage, learningLanguage, partOfSpeech, notes } = body || {};
  const patch = {};
  if (baseText !== undefined) patch.base_text = baseText;
  if (learningText !== undefined) patch.learning_text = learningText;
  if (baseLanguage !== undefined) patch.base_language = baseLanguage;
  if (learningLanguage !== undefined) patch.learning_language = learningLanguage;
  if (partOfSpeech !== undefined) patch.part_of_speech = partOfSpeech;
  if (notes !== undefined) patch.notes = notes;
  return patch;
}

// GET /api/lists  -> counts for all three tables (for nav badges)
router.get('/', (req, res) => {
  const counts = {};
  learningDb.TABLES.forEach((t) => {
    counts[t] = learningDb.countRecords(req.user.id, t);
  });
  res.json({ tables: learningDb.TABLES, counts, learnCap: learningDb.LEARN_LIST_CAP });
});

// GET /api/lists/:table
router.get('/:table', (req, res) => {
  try {
    const records = learningDb.listRecords(req.user.id, req.params.table);
    res.json({ table: req.params.table, records });
  } catch (err) {
    handleDbError(res, err);
  }
});

// POST /api/lists/:table  { baseText, learningText, partOfSpeech, baseLanguage, learningLanguage, notes }
router.post('/:table', (req, res) => {
  const { baseText } = req.body || {};
  if (!baseText || !String(baseText).trim()) {
    return res.status(400).json({ error: 'baseText is required.' });
  }
  try {
    const record = learningDb.addRecord(
      req.user.id,
      req.params.table,
      fieldsFromBody(req.body, { baseLanguage: req.user.base_language, learningLanguage: req.user.learning_languages[0] })
    );
    res.status(201).json({ record });
  } catch (err) {
    handleDbError(res, err);
  }
});

// POST /api/lists/:table/bulk-add  { records: [{ baseText, learningText, partOfSpeech }, ...] }
router.post('/:table/bulk-add', (req, res) => {
  const { records } = req.body || {};
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'records must be a non-empty array.' });
  }
  const valid = records.filter((r) => r && r.baseText && String(r.baseText).trim());
  if (valid.length === 0) return res.status(400).json({ error: 'Every record needs at least a baseText value.' });
  try {
    const result = learningDb.bulkAdd(
      req.user.id,
      req.params.table,
      valid.map((r) => fieldsFromBody(r, { baseLanguage: req.user.base_language, learningLanguage: req.user.learning_languages[0] }))
    );
    res.status(201).json({
      added: result.added,
      skipped: records.length - result.added,
      skippedFull: result.skippedFull,
      duplicates: result.duplicates,
    });
  } catch (err) {
    handleDbError(res, err);
  }
});

// PUT /api/lists/:table/bulk-edit  { ids: [...], patch: { partOfSpeech, learningLanguage, baseLanguage, notes } }
// NOTE: this must be registered BEFORE "PUT /:table/:id" — otherwise Express
// would match "bulk-edit" as the :id parameter of the route below.
router.put('/:table/bulk-edit', (req, res) => {
  const { ids, patch } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids must be a non-empty array.' });
  try {
    const updated = learningDb.bulkUpdate(req.user.id, req.params.table, ids, patchFromBody(patch));
    res.json({ updated });
  } catch (err) {
    handleDbError(res, err);
  }
});

// PUT /api/lists/:table/:id  { baseText, learningText, partOfSpeech, baseLanguage, learningLanguage, notes }
router.put('/:table/:id', (req, res) => {
  try {
    const record = learningDb.updateRecord(req.user.id, req.params.table, req.params.id, patchFromBody(req.body));
    res.json({ record });
  } catch (err) {
    handleDbError(res, err);
  }
});

// DELETE /api/lists/:table/:id
router.delete('/:table/:id', (req, res) => {
  try {
    const removed = learningDb.deleteRecord(req.user.id, req.params.table, req.params.id);
    if (!removed) return res.status(404).json({ error: 'Record not found.' });
    res.json({ ok: true });
  } catch (err) {
    handleDbError(res, err);
  }
});

// POST /api/lists/:table/bulk-delete  { ids: [...] }
router.post('/:table/bulk-delete', (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids must be a non-empty array.' });
  try {
    const deleted = learningDb.bulkDelete(req.user.id, req.params.table, ids);
    res.json({ deleted });
  } catch (err) {
    handleDbError(res, err);
  }
});

// POST /api/lists/:table/:id/move  { to: 'Learning' }
router.post('/:table/:id/move', (req, res) => {
  const { to } = req.body || {};
  if (!to) return res.status(400).json({ error: '"to" target list is required.' });
  try {
    const record = learningDb.moveRecord(req.user.id, req.params.table, req.params.id, to);
    res.json({ record });
  } catch (err) {
    handleDbError(res, err);
  }
});

// POST /api/lists/:table/bulk-move  { ids: [...], to: 'Learning' }
router.post('/:table/bulk-move', (req, res) => {
  const { ids, to } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids must be a non-empty array.' });
  if (!to) return res.status(400).json({ error: '"to" target list is required.' });
  try {
    const result = learningDb.bulkMove(req.user.id, req.params.table, ids, to);
    res.json(result);
  } catch (err) {
    handleDbError(res, err);
  }
});

module.exports = router;
