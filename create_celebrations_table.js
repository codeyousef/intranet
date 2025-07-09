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

// Create celebrations table
db.run(`
  CREATE TABLE IF NOT EXISTS celebrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    years INTEGER
  )
`, (err) => {
  if (err) {
    console.error('Error creating celebrations table:', err.message);
  } else {
    console.log('Celebrations table created successfully.');
    
    // Get today's date and format it
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Format dates as MM-DD (the format the API expects)
    const formatDate = (date) => {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${month}-${day}`;
    };
    
    const todayStr = formatDate(today);
    const tomorrowStr = formatDate(tomorrow);
    
    console.log('Today:', todayStr);
    console.log('Tomorrow:', tomorrowStr);
    
    // Insert test data with today's and tomorrow's dates
    const celebrations = [
      { type: 'birthday', name: 'Ahmed Al-Salem', date: todayStr, years: null },
      { type: 'birthday', name: 'Sarah Ahmed', date: todayStr, years: null },
      { type: 'anniversary', name: 'Mohammed Al-Rashid', date: todayStr, years: 5 },
      { type: 'birthday', name: 'Fatima Al-Zahrani', date: tomorrowStr, years: null },
      { type: 'anniversary', name: 'Abdullah Hassan', date: tomorrowStr, years: 3 },
      { type: 'anniversary', name: 'Noura Al-Harbi', date: tomorrowStr, years: 10 },
      // Add some other dates for variety
      { type: 'birthday', name: 'Khalid Al-Otaibi', date: '12-25', years: null },
      { type: 'anniversary', name: 'Maryam Al-Qahtani', date: '01-15', years: 7 }
    ];
    
    const stmt = db.prepare("INSERT INTO celebrations (type, name, date, years) VALUES (?, ?, ?, ?)");
    
    celebrations.forEach((celebration, index) => {
      stmt.run(celebration.type, celebration.name, celebration.date, celebration.years, (err) => {
        if (err) {
          console.error('Error inserting celebration:', err);
        } else {
          console.log(`Inserted ${celebration.type} for ${celebration.name} on ${celebration.date}`);
        }
      });
    });
    
    stmt.finalize(() => {
      console.log('All celebrations inserted.');
      
      // Verify the data
      db.all("SELECT * FROM celebrations WHERE date IN (?, ?)", [todayStr, tomorrowStr], (err, rows) => {
        if (err) {
          console.error('Error verifying data:', err);
        } else {
          console.log('\nCelebrations for today and tomorrow:');
          rows.forEach(row => {
            console.log(`- ${row.type}: ${row.name} on ${row.date}`);
          });
        }
        
        db.close();
      });
    });
  }
});