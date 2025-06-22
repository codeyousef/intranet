const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Open the database
const dbPath = path.resolve(process.cwd(), 'mazaya.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the database.');
});

// Function to add an admin user
function addAdminUser(email) {
  const now = new Date().toISOString();
  
  // First check if the user already exists
  db.get('SELECT * FROM admin_users WHERE LOWER(email) = LOWER(?)', [email], (err, row) => {
    if (err) {
      console.error('Error checking if user exists:', err.message);
      db.close();
      process.exit(1);
    }
    
    if (row) {
      console.log(`User ${email} is already an admin.`);
      db.close();
      process.exit(0);
    }
    
    // User doesn't exist, add them
    db.run(
      'INSERT INTO admin_users (email, created_at, updated_at) VALUES (?, ?, ?)',
      [email, now, now],
      function(err) {
        if (err) {
          console.error('Error adding admin user:', err.message);
          db.close();
          process.exit(1);
        }
        
        console.log(`Added ${email} as an admin user with ID ${this.lastID}.`);
        db.close();
        process.exit(0);
      }
    );
  });
}

// Ask for the email address
rl.question('Enter the email address to add as admin: ', (email) => {
  if (!email || !email.includes('@')) {
    console.error('Invalid email address.');
    db.close();
    rl.close();
    process.exit(1);
  }
  
  addAdminUser(email);
  rl.close();
});