// Speech-to-text endpoint used when the browser's own SpeechRecognition
// can't be used (see server/utils/transcribe.js for why that happens).

const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { transcribe, isConfigured, activeProvider } = require('../utils/transcribe');
const { toLangCode } = require('../utils/languageCodes');

const router = express.Router();
// Drills record a few seconds at most; cap well below that to stay cheap.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

router.use(requireAuth);

// GET /api/speech/config
// Lets the client decide up front whether to offer record-and-transcribe,
// instead of discovering it's unavailable after a failed recording.
router.get('/config', (req, res) => {
  res.json({ transcriptionAvailable: isConfigured(), provider: activeProvider() });
});

// POST /api/speech/transcribe  multipart/form-data: audio=<blob>, language=<name|code>
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio was uploaded (field name "audio").' });
  }

  // Accept either a language name ("Spanish") or a code ("es"); default to
  // the user's first learning language.
  const requested = (req.body && req.body.language) || req.user.learning_languages[0];
  const langCode = toLangCode(requested) || String(requested || 'en').slice(0, 2);

  try {
    const { transcript, provider } = await transcribe(req.file.buffer, req.file.mimetype, langCode);
    res.json({ transcript, provider, language: langCode });
  } catch (err) {
    if (err.code === 'STT_NOT_CONFIGURED') return res.status(503).json({ error: err.message, code: err.code });
    if (err.code === 'EMPTY_AUDIO') return res.status(400).json({ error: err.message, code: err.code });
    console.error('Transcription failed:', err.message);
    res.status(502).json({ error: `Transcription failed: ${err.message}` });
  }
});

module.exports = router;
