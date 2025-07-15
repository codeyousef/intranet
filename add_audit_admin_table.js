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

// Create audit_admin_users table
db.run(`
  CREATE TABLE IF NOT EXISTS audit_admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT,
    updated_at TEXT
  )
`, (err) => {
  if (err) {
    console.error('Error creating audit_admin_users table:', err.message);
    db.close();
    process.exit(1);
  }
  console.log('audit_admin_users table created or already exists.');
  
  // Add the user as the first audit admin
  const adminEmail = 'yousef.baitalmal@flyadeal.com';
  const now = new Date().toISOString();
  
  db.run(`
    INSERT OR IGNORE INTO audit_admin_users (email, created_at, updated_at)
    VALUES (?, ?, ?)
  `, [adminEmail, now, now], (err) => {
    if (err) {
      console.error('Error adding initial audit admin:', err.message);
    } else {
      console.log(`Added ${adminEmail} as audit admin.`);
    }
    
    // Close the database
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
    });
  });
});