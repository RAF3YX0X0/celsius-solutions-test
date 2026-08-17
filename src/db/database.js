const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Ensure data directory exists
const dataDir = path.dirname(config.dbPath);
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (e) {}
}

const db = new Database(config.dbPath);

// Enable SQLite performance settings safely
try {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
} catch (e) {
  try { db.pragma('journal_mode = DELETE'); } catch (err) {}
}

// Run schema initialization
function initDatabase() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
    console.log('[Database] Schema initialized successfully at:', config.dbPath);
  } catch (err) {
    console.error('[Database Error] Failed to initialize schema:', err);
  }
}

module.exports = {
  db,
  initDatabase
};
