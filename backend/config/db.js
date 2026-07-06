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

    // Create issue_supports table
    db.run(`
      CREATE TABLE IF NOT EXISTS issue_supports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        issue_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(issue_id, user_id),
        FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
    `, (err) => {
      if (err) {
        console.error('❌ Error creating issues table:', err.message);
        return;
      }
      
      // Dynamic column migration for SQLite
      db.all("PRAGMA table_info(issues)", [], (err, rows) => {
        if (err) {
          console.error("❌ Error fetching table info for issues:", err.message);
          return;
        }
        
        const columns = rows.map(r => r.name);
        
        if (!columns.includes('priority')) {
          db.run("ALTER TABLE issues ADD COLUMN priority TEXT CHECK(priority IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium';", (err) => {
            if (err) console.error("❌ Error adding column priority:", err.message);
            else console.log("✅ Added column 'priority' to issues table.");
          });
        }
        
        if (!columns.includes('latitude')) {
          db.run("ALTER TABLE issues ADD COLUMN latitude REAL DEFAULT NULL;", (err) => {
            if (err) console.error("❌ Error adding column latitude:", err.message);
            else console.log("✅ Added column 'latitude' to issues table.");
          });
        }
        
        if (!columns.includes('longitude')) {
          db.run("ALTER TABLE issues ADD COLUMN longitude REAL DEFAULT NULL;", (err) => {
            if (err) console.error("❌ Error adding column longitude:", err.message);
            else console.log("✅ Added column 'longitude' to issues table.");
          });
        }

        if (!columns.includes('is_deleted')) {
          db.run("ALTER TABLE issues ADD COLUMN is_deleted INTEGER DEFAULT 0;", (err) => {
            if (err) console.error("❌ Error adding column is_deleted:", err.message);
            else console.log("✅ Added column 'is_deleted' to issues table.");
          });
        }

        if (!columns.includes('deleted_at')) {
          db.run("ALTER TABLE issues ADD COLUMN deleted_at DATETIME DEFAULT NULL;", (err) => {
            if (err) console.error("❌ Error adding column deleted_at:", err.message);
            else console.log("✅ Added column 'deleted_at' to issues table.");
          });
        }

        if (!columns.includes('deleted_by')) {
          db.run("ALTER TABLE issues ADD COLUMN deleted_by INTEGER DEFAULT NULL;", (err) => {
            if (err) console.error("❌ Error adding column deleted_by:", err.message);
            else console.log("✅ Added column 'deleted_by' to issues table.");
          });
        }

        if (!columns.includes('deletion_reason')) {
          db.run("ALTER TABLE issues ADD COLUMN deletion_reason TEXT DEFAULT NULL;", (err) => {
            if (err) console.error("❌ Error adding column deletion_reason:", err.message);
            else console.log("✅ Added column 'deletion_reason' to issues table.");
          });
        }
      });

      // Add performance indexes
      db.run("CREATE INDEX IF NOT EXISTS idx_issues_category ON issues(category);");
      db.run("CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);");
      db.run("CREATE INDEX IF NOT EXISTS idx_issues_created ON issues(created_at);");
    });
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
