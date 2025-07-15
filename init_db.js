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

// Create platform_links table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS platform_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT,
    updated_at TEXT
  )
`, (err) => {
  if (err) {
    console.error('Error creating platform_links table:', err.message);
    db.close();
    process.exit(1);
  }
  console.log('platform_links table created or already exists.');
  
  // Check if platform_links table is empty
  db.get("SELECT COUNT(*) as count FROM platform_links", [], (err, row) => {
    if (err) {
      console.error('Error counting platform_links rows:', err.message);
      db.close();
      process.exit(1);
    }
    
    if (row.count === 0) {
      console.log('platform_links table is empty. Adding initial data...');
      
      // Add initial platform links
      const now = new Date().toISOString();
      const initialLinks = [
        ['SharePoint', 'https://flyadeal.sharepoint.com', 'FileText', 0, 1, now, now],
        ['Email', 'https://outlook.office.com', 'Mail', 1, 1, now, now],
        ['Teams', 'https://teams.microsoft.com', 'MessageSquare', 2, 1, now, now],
        ['HR Portal', 'https://hr.flyadeal.com', 'Users', 3, 1, now, now],
        ['IT Support', 'https://itsupport.flyadeal.com', 'Settings', 4, 1, now, now]
      ];
      
      const stmt = db.prepare(`
        INSERT INTO platform_links (title, url, icon, display_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      initialLinks.forEach((link) => {
        stmt.run(link, (err) => {
          if (err) {
            console.error(`Error adding link ${link[0]}:`, err.message);
          } else {
            console.log(`Added link: ${link[0]}`);
          }
        });
      });
      
      stmt.finalize();
    } else {
      console.log(`platform_links table already has ${row.count} rows.`);
    }
    
    // Create admin_users table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        created_at TEXT,
        updated_at TEXT
      )
    `, (err) => {
      if (err) {
        console.error('Error creating admin_users table:', err.message);
        db.close();
        process.exit(1);
      }
      console.log('admin_users table created or already exists.');
      
      // Check if admin_users table is empty
      db.get("SELECT COUNT(*) as count FROM admin_users", [], (err, row) => {
        if (err) {
          console.error('Error counting admin_users rows:', err.message);
          db.close();
          process.exit(1);
        }
        
        if (row.count === 0) {
          console.log('admin_users table is empty. Adding initial admin user...');
          
          // Add initial admin user
          const now = new Date().toISOString();
          db.run(`
            INSERT INTO admin_users (email, created_at, updated_at)
            VALUES (?, ?, ?)
          `, ['admin@flyadeal.com', now, now], function(err) {
            if (err) {
              console.error('Error adding admin user:', err.message);
            } else {
              console.log('Added admin user: admin@flyadeal.com');
            }
            
            // Close the database
            db.close();
            console.log('Database initialization complete.');
          });
        } else {
          console.log(`admin_users table already has ${row.count} rows.`);
          db.close();
          console.log('Database initialization complete.');
        }
      });
    });
  });
});