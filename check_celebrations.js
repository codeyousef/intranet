const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(process.cwd(), 'mazaya.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the database.');
});

// Check if celebrations table exists
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='celebrations'", (err, tables) => {
  if (err) {
    console.error('Error checking tables:', err);
    return;
  }
  
  console.log('\nChecking for celebrations table...');
  console.log('Tables found:', tables);
  
  if (tables.length === 0) {
    console.log('Celebrations table does not exist!');
    db.close();
    return;
  }
  
  // Check celebrations
  db.all("SELECT * FROM celebrations ORDER BY date DESC", (err, rows) => {
    if (err) {
      console.error('Error querying celebrations:', err);
    } else {
      console.log('\nCelebrations table contents:');
      console.log('Total celebrations:', rows.length);
      rows.forEach(row => {
        console.log('---');
        console.log('ID:', row.id);
        console.log('Type:', row.type);
        console.log('Name:', row.name);
        console.log('Date:', row.date);
        console.log('Years:', row.years);
      });
    }
    
    db.close();
  });
});