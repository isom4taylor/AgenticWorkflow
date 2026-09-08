module.exports = {
  PORT: process.env.PORT || 4000,
  // In production, set a real secret via the JWT_SECRET environment variable.
  JWT_SECRET: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
  JWT_EXPIRES_IN: '7d',
};
