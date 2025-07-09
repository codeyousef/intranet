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

// Check complaints
db.all("SELECT * FROM complaints", (err, rows) => {
  if (err) {
    console.error('Error querying complaints:', err);
  } else {
    console.log('\nComplaints table contents:');
    console.log('Total complaints:', rows.length);
    rows.forEach(row => {
      console.log('---');
      console.log('ID:', row.id);
      console.log('Content:', row.content);
      console.log('Category:', row.category);
      console.log('Status:', row.status);
      console.log('Created:', row.created_at);
    });
  }
  
  db.close();
});