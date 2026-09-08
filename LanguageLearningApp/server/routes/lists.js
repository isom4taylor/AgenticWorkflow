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
  console.error(err);
  return res.status(500).json({ error: 'Unexpected server error.' });
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

// POST /api/lists/:table  { baseText, learningText, baseLanguage, learningLanguage, notes }
router.post('/:table', (req, res) => {
  const { baseText, learningText, baseLanguage, learningLanguage, notes } = req.body || {};
  if (!baseText || !String(baseText).trim()) {
    return res.status(400).json({ error: 'baseText is required.' });
  }
  try {
    const record = learningDb.addRecord(req.user.id, req.params.table, {
      baseText,
      learningText,
      baseLanguage: baseLanguage || req.user.base_language,
      learningLanguage: learningLanguage || req.user.learning_languages[0],
      notes,
    });
    res.status(201).json({ record });
  } catch (err) {
    handleDbError(res, err);
  }
});

// PUT /api/lists/:table/:id  { baseText, learningText, baseLanguage, learningLanguage, notes }
router.put('/:table/:id', (req, res) => {
  const { baseText, learningText, baseLanguage, learningLanguage, notes } = req.body || {};
  const patch = {};
  if (baseText !== undefined) patch.base_text = baseText;
  if (learningText !== undefined) patch.learning_text = learningText;
  if (baseLanguage !== undefined) patch.base_language = baseLanguage;
  if (learningLanguage !== undefined) patch.learning_language = learningLanguage;
  if (notes !== undefined) patch.notes = notes;

  try {
    const record = learningDb.updateRecord(req.user.id, req.params.table, req.params.id, patch);
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

module.exports = router;
