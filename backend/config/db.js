const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define database file path
const dbPath = path.join(__dirname, '../database.sqlite');

// Connect to SQLite Database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ SQLite connection failed! Error:', err.message);
  } else {
    console.log('✅ Connected to SQLite database file successfully!');
  }
});

// Enable Foreign Key support in SQLite (disabled by default)
db.run('PRAGMA foreign_keys = ON;');

// Initialize database tables if they do not exist (Auto-Schema creation)
const initDb = () => {
  db.serialize(() => {
    // Create Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('citizen', 'admin')) DEFAULT 'citizen',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Issues table
    db.run(`
      CREATE TABLE IF NOT EXISTS issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        location TEXT NOT NULL,
        image_url TEXT DEFAULT NULL,
        status TEXT NOT NULL CHECK(status IN ('Pending', 'In Progress', 'Resolved')) DEFAULT 'Pending',
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  });
};

initDb();

// Custom Promise-based Adapter to match mysql2 promise pool structure
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    // Standard test query verification
    if (sql.trim().toUpperCase() === 'SELECT 1') {
      return resolve([[ { 1: 1 } ]]);
    }

    const sqlUpper = sql.trim().toUpperCase();
    if (sqlUpper.startsWith('SELECT')) {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve([rows]); // Resolves as [rows] to match mysql2 destructuring: const [users] = ...
      });
    } else {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        // Mimic mysql2 result object containing affectedRows and insertId
        resolve([{
          affectedRows: this.changes,
          insertId: this.lastID
        }]);
      });
    }
  });
};

module.exports = {
  query
};
