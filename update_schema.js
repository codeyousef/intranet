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

// Create people_admin_users table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS people_admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT,
    updated_at TEXT
  )
`, (err) => {
  if (err) {
    console.error('Error creating people_admin_users table:', err.message);
    db.close();
    process.exit(1);
  }
  console.log('people_admin_users table created or already exists.');
  
  // Create events table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      event_date TEXT,
      created_by TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Error creating events table:', err.message);
      db.close();
      process.exit(1);
    }
    console.log('events table created or already exists.');
    
    // Create company_news table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS company_news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        published_at TEXT,
        created_by TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `, (err) => {
      if (err) {
        console.error('Error creating company_news table:', err.message);
        db.close();
        process.exit(1);
      }
      console.log('company_news table created or already exists.');
      
      // Close the database
      db.close();
      console.log('Database schema update complete.');
    });
  });
});