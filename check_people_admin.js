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

// Check people admin users
db.all("SELECT * FROM people_admin_users", (err, rows) => {
  if (err) {
    console.error('Error querying people_admin_users:', err);
  } else {
    console.log('\nPeople Admin Users:');
    console.log('Total people admins:', rows.length);
    rows.forEach(row => {
      console.log('- Email:', row.email, '| Added:', row.created_at);
    });
  }
  
  // Also check regular admins
  db.all("SELECT * FROM admin_users", (err, rows) => {
    if (err) {
      console.error('Error querying admin_users:', err);
    } else {
      console.log('\nRegular Admin Users:');
      console.log('Total admins:', rows.length);
      rows.forEach(row => {
        console.log('- Email:', row.email, '| Added:', row.created_at);
      });
    }
    
    db.close();
  });
});