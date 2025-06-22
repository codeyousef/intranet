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

// Get all tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
  if (err) {
    console.error('Error getting tables:', err.message);
    db.close();
    process.exit(1);
  }
  
  console.log('Tables in the database:');
  tables.forEach((table) => {
    console.log(`- ${table.name}`);
  });
  
  // Check if platform_links table exists
  const platformLinksTable = tables.find(table => table.name === 'platform_links');
  if (platformLinksTable) {
    console.log('\nplatform_links table exists. Checking schema...');
    db.all("PRAGMA table_info(platform_links)", [], (err, columns) => {
      if (err) {
        console.error('Error getting platform_links schema:', err.message);
      } else {
        console.log('platform_links columns:');
        columns.forEach((column) => {
          console.log(`- ${column.name} (${column.type})`);
        });
      }
      
      // Check if there are any rows in the table
      db.get("SELECT COUNT(*) as count FROM platform_links", [], (err, row) => {
        if (err) {
          console.error('Error counting platform_links rows:', err.message);
        } else {
          console.log(`\nplatform_links has ${row.count} rows.`);
        }
        
        // Check admin_users table
        const adminUsersTable = tables.find(table => table.name === 'admin_users');
        if (adminUsersTable) {
          console.log('\nadmin_users table exists. Checking schema...');
          db.all("PRAGMA table_info(admin_users)", [], (err, columns) => {
            if (err) {
              console.error('Error getting admin_users schema:', err.message);
            } else {
              console.log('admin_users columns:');
              columns.forEach((column) => {
                console.log(`- ${column.name} (${column.type})`);
              });
            }
            
            // Check if there are any rows in the table
            db.get("SELECT COUNT(*) as count FROM admin_users", [], (err, row) => {
              if (err) {
                console.error('Error counting admin_users rows:', err.message);
              } else {
                console.log(`\nadmin_users has ${row.count} rows.`);
              }
              
              // Close the database
              db.close();
            });
          });
        } else {
          console.log('\nadmin_users table does not exist.');
          db.close();
        }
      });
    });
  } else {
    console.log('\nplatform_links table does not exist.');
    db.close();
  }
});