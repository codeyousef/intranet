const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const email = 'yousef.baitalmal@flyadeal.com';

const dbPath = path.resolve(process.cwd(), 'mazaya.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the database.');
});

// Add as people admin
db.run(
  "INSERT INTO people_admin_users (email, created_at) VALUES (?, datetime('now'))",
  [email],
  function(err) {
    if (err) {
      console.error('Error adding people admin:', err.message);
    } else {
      console.log(`Successfully added ${email} as a people admin`);
      console.log('Row ID:', this.lastID);
    }
    
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
    });
  }
);