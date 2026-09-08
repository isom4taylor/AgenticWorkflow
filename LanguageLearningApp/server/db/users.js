// Global "users" database: server/data/users.json
const path = require('path');
const bcrypt = require('bcryptjs');
const { readJson, writeJson } = require('./jsonFile');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

function loadAll() {
  return readJson(USERS_FILE, { nextId: 1, users: [] });
}

function saveAll(db) {
  writeJson(USERS_FILE, db);
}

function toPublic(user) {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
}

function findByEmail(email) {
  const db = loadAll();
  const normalized = String(email || '').trim().toLowerCase();
  return db.users.find((u) => u.email.toLowerCase() === normalized) || null;
}

function findById(id) {
  const db = loadAll();
  return db.users.find((u) => u.id === id) || null;
}

function createUser({ email, password, baseLanguage, learningLanguages, fluency }) {
  const db = loadAll();
  const normalized = String(email).trim().toLowerCase();
  if (db.users.some((u) => u.email.toLowerCase() === normalized)) {
    throw Object.assign(new Error('Email already in use'), { code: 'EMAIL_IN_USE' });
  }
  const now = new Date().toISOString();
  const user = {
    id: db.nextId,
    email: String(email).trim(),
    password_hash: bcrypt.hashSync(password, 10),
    base_language: baseLanguage || 'English',
    learning_languages: learningLanguages && learningLanguages.length ? learningLanguages : ['Spanish'],
    fluency: fluency || 'beginner',
    daily_streak_count: 0,
    last_active_date: null,
    created_at: now,
    updated_at: now,
  };
  db.users.push(user);
  db.nextId += 1;
  saveAll(db);
  return user;
}

function updateUser(id, patch) {
  const db = loadAll();
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });
  db.users[idx] = { ...db.users[idx], ...patch, updated_at: new Date().toISOString() };
  saveAll(db);
  return db.users[idx];
}

function deleteUser(id) {
  const db = loadAll();
  const before = db.users.length;
  db.users = db.users.filter((u) => u.id !== id);
  saveAll(db);
  return db.users.length < before;
}

function verifyPassword(user, password) {
  return bcrypt.compareSync(password, user.password_hash);
}

function setPassword(id, newPassword) {
  return updateUser(id, { password_hash: bcrypt.hashSync(newPassword, 10) });
}

// Updates the daily streak based on the last active date. Call on login.
function touchDailyStreak(id) {
  const user = findById(id);
  if (!user) return null;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  if (user.last_active_date === today) return user; // already counted today

  let nextStreak = 1;
  if (user.last_active_date) {
    const prev = new Date(user.last_active_date + 'T00:00:00Z');
    const now = new Date(today + 'T00:00:00Z');
    const diffDays = Math.round((now - prev) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) nextStreak = (user.daily_streak_count || 0) + 1;
    else nextStreak = 1; // streak broken (or first ever login handled above)
  }
  return updateUser(id, { daily_streak_count: nextStreak, last_active_date: today });
}

module.exports = {
  toPublic,
  findByEmail,
  findById,
  createUser,
  updateUser,
  deleteUser,
  verifyPassword,
  setPassword,
  touchDailyStreak,
};
