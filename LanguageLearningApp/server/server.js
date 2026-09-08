const path = require('path');
const express = require('express');
const cors = require('cors');
const { PORT } = require('./config');

const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/account');
const listsRoutes = require('./routes/lists');
const importRoutes = require('./routes/import');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/lists', listsRoutes);
app.use('/api/import', importRoutes);

// Serve the static frontend (vanilla HTML/CSS/JS - no build step required).
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Any unknown non-API GET request falls back to the SPA-ish app shell so
// deep links still work.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Centralized error handler (e.g. multer file-too-large errors).
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Unexpected server error.' });
});

app.listen(PORT, () => {
  console.log(`Language Learning App server running at http://localhost:${PORT}`);
});
