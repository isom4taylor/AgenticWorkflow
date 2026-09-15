const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { translateText } = require('../utils/translate');

const router = express.Router();
router.use(requireAuth);

// POST /api/translate  { text, targetLanguage? }
// Defaults source language to the user's base language and target language
// to the user's first configured learning language.
router.post('/', async (req, res) => {
  const { text, targetLanguage } = req.body || {};
  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: 'text is required.' });
  }
  const sourceLanguage = req.user.base_language;
  const target = targetLanguage || req.user.learning_languages[0];

  try {
    const result = await translateText(text, sourceLanguage, target);
    res.json({
      sourceLanguage,
      targetLanguage: target,
      plainTranslation: result.plainTranslation,
      options: result.options,
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
