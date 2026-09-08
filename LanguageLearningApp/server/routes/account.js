const express = require('express');
const archiver = require('archiver');
const users = require('../db/users');
const learningDb = require('../db/learningDb');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const FLUENCY_LEVELS = ['beginner', 'intermediate', 'advanced'];

router.use(requireAuth);

// PUT /api/account/settings { email, baseLanguage, learningLanguages, fluency }
router.put('/settings', (req, res) => {
  const { email, baseLanguage, learningLanguages, fluency } = req.body || {};
  const patch = {};

  if (email !== undefined && email !== req.user.email) {
    const existing = users.findByEmail(email);
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ error: 'That email is already in use by another account.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    patch.email = email;
  }
  if (baseLanguage !== undefined) {
    if (!baseLanguage.trim()) return res.status(400).json({ error: 'Base language cannot be empty.' });
    patch.base_language = baseLanguage.trim();
  }
  if (learningLanguages !== undefined) {
    if (!Array.isArray(learningLanguages) || learningLanguages.length === 0) {
      return res.status(400).json({ error: 'Provide at least one learning language.' });
    }
    patch.learning_languages = learningLanguages.map((l) => String(l).trim()).filter(Boolean);
  }
  if (fluency !== undefined) {
    if (!FLUENCY_LEVELS.includes(fluency)) return res.status(400).json({ error: `Fluency must be one of: ${FLUENCY_LEVELS.join(', ')}` });
    patch.fluency = fluency;
  }

  const updated = users.updateUser(req.user.id, patch);
  res.json({ user: users.toPublic(updated) });
});

// PUT /api/account/password { currentPassword, newPassword }
router.put('/password', (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!users.verifyPassword(req.user, currentPassword || '')) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  users.setPassword(req.user.id, newPassword);
  res.json({ ok: true });
});

// POST /api/account/reset  { confirm: true }
// Resets the Learning Language Database to its initial state.
router.post('/reset', (req, res) => {
  if (!req.body || req.body.confirm !== true) {
    return res.status(400).json({ error: 'Reset must be confirmed by sending { confirm: true }.' });
  }
  learningDb.initializeOrReset(req.user.id, {
    baseLanguage: req.user.base_language,
    learningLanguage: req.user.learning_languages[0],
  });
  res.json({ ok: true });
});

// GET /api/account/export - zip of Learn.csv, Learning.csv, Learned.csv
router.get('/export', (req, res) => {
  const csvs = learningDb.exportAllAsCsv(req.user.id);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="learning-language-database.zip"');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => res.status(500).end(String(err)));
  archive.pipe(res);
  Object.keys(csvs).forEach((table) => {
    archive.append(csvs[table], { name: `${table}.csv` });
  });
  archive.finalize();
});

// DELETE /api/account  { confirm: true }
router.delete('/', (req, res) => {
  if (!req.body || req.body.confirm !== true) {
    return res.status(400).json({ error: 'Deletion must be confirmed by sending { confirm: true }.' });
  }
  learningDb.deleteDb(req.user.id);
  users.deleteUser(req.user.id);
  res.json({ ok: true });
});

module.exports = router;
