const express = require('express');
const multer = require('multer');
const learningDb = require('../db/learningDb');
const { requireAuth } = require('../middleware/auth');
const { parseGoogleTranslateCsv } = require('../utils/googleTranslateCsv');
const { pairSentences } = require('../utils/textSplit');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireAuth);

// POST /api/import  multipart/form-data: file=<csv>, advanced=<'true'|'false'>
// Imports rows into the "Learning" table (per spec: newly imported data is
// considered actively "in progress", not yet reviewed into Learn/Learned).
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No CSV file was uploaded (field name "file").' });

  const advanced = req.body && (req.body.advanced === 'true' || req.body.advanced === true);

  let pairs;
  try {
    pairs = parseGoogleTranslateCsv(req.file.buffer, req.user.base_language);
  } catch (err) {
    return res.status(400).json({ error: `Could not parse CSV: ${err.message}` });
  }

  if (pairs.length === 0) {
    return res.status(400).json({ error: 'No usable rows were found in that CSV file.' });
  }

  const defaultBaseLanguage = req.user.base_language;
  const defaultLearningLanguage = req.user.learning_languages[0];

  let records = pairs;
  if (advanced) {
    records = [];
    pairs.forEach(({ baseText, learningText, baseLanguage, learningLanguage }) => {
      pairSentences(baseText, learningText).forEach((p) => records.push({ ...p, baseLanguage, learningLanguage }));
    });
  }

  const added = learningDb.bulkAdd(
    req.user.id,
    'Learning',
    records.map((r) => ({
      ...r,
      baseLanguage: r.baseLanguage || defaultBaseLanguage,
      learningLanguage: r.learningLanguage || defaultLearningLanguage,
    }))
  );

  res.json({
    ok: true,
    parsedRows: pairs.length,
    importedRecords: added,
    advanced,
  });
});

module.exports = router;
