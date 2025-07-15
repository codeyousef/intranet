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

// Get all admin users
db.all('SELECT * FROM admin_users', [], (err, rows) => {
  if (err) {
    console.error('Error getting admin users:', err.message);
    db.close();
    process.exit(1);
  }
  
  console.log('Admin users:');
  rows.forEach((row) => {
    console.log(`ID: ${row.id}, Email: ${row.email}, Created: ${row.created_at}`);
  });
  
  db.close();
});