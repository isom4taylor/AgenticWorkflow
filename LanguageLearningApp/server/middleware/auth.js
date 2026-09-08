const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const users = require('../db/users');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = users.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

module.exports = { requireAuth };
