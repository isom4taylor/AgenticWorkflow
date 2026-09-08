// Tiny synchronous JSON-file storage helper.
//
// We intentionally avoid native database drivers (e.g. better-sqlite3) so this
// project runs on any Node.js version without a compiler toolchain. Each
// "database" is just a JSON file on disk, and each "table" is an array of
// plain objects inside that file. Reads/writes are synchronous so requests
// can't interleave and corrupt a file (Node is single-threaded and we never
// `await` in the middle of a read-modify-write cycle).

const fs = require('fs');
const path = require('path');

function ensureDirFor(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

function writeJson(filePath, data) {
  ensureDirFor(filePath);
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

module.exports = { readJson, writeJson, ensureDirFor };
