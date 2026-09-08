const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');
const users = require('../db/users');
const learningDb = require('../db/learningDb');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

// POST /api/auth/register  { email, password }
router.post('/register', (req, res) => {
  const { email, password } = req.body || {};
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Please provide a valid email address.' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const existing = users.findByEmail(email);
  if (existing) {
    return res.status(409).json({
      error: 'An account with this email already exists.',
      code: 'EMAIL_IN_USE',
      offerPasswordReset: true,
    });
  }

  const user = users.createUser({ email, password });
  learningDb.initializeOrReset(user.id, {
    baseLanguage: user.base_language,
    learningLanguage: user.learning_languages[0],
  });
  users.touchDailyStreak(user.id);
  const fresh = users.findById(user.id);

  const token = signToken(fresh);
  res.status(201).json({ token, user: users.toPublic(fresh) });
});

// POST /api/auth/login  { email, password }
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = users.findByEmail(email);
  if (!user || !users.verifyPassword(user, password || '')) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  users.touchDailyStreak(user.id);
  const fresh = users.findById(user.id);
  const token = signToken(fresh);
  res.json({ token, user: users.toPublic(fresh) });
});

// POST /api/auth/logout - stateless JWT; client just discards the token.
router.post('/logout', (req, res) => {
  res.status(204).end();
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: users.toPublic(req.user) });
});

// POST /api/auth/forgot-password  { email, newPassword }
// Simplified "reset password" flow offered when a registration email is
// already in use. A real product would email a verification link; this demo
// app resets the password directly since there is no mail server configured.
router.post('/forgot-password', (req, res) => {
  const { email, newPassword } = req.body || {};
  const user = users.findByEmail(email);
  if (!user) return res.status(404).json({ error: 'No account found with that email.' });
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  users.setPassword(user.id, newPassword);
  res.json({ ok: true });
});

module.exports = router;
