const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const dbPath = path.resolve(process.cwd(), 'mazaya.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the database.');
});

// Create complaints table
db.run(`
  CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    category TEXT,
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    resolved_at TEXT,
    admin_notes TEXT
  )
`, (err) => {
  if (err) {
    console.error('Error creating complaints table:', err.message);
  } else {
    console.log('complaints table created or already exists.');
  }
});

// Create suggestions table
db.run(`
  CREATE TABLE IF NOT EXISTS suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    category TEXT,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    resolved_at TEXT,
    admin_notes TEXT
  )
`, (err) => {
  if (err) {
    console.error('Error creating suggestions table:', err.message);
  } else {
    console.log('suggestions table created or already exists.');
  }
  
  // Close the database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
  });
});