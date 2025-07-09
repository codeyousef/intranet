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

// Get today's date
const today = new Date();
const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

// Get tomorrow's date
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowMonthDay = `${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

console.log('Today is:', todayMonthDay);
console.log('Tomorrow is:', tomorrowMonthDay);

// Check celebrations for today
db.all("SELECT * FROM celebrations WHERE date = ? AND type = 'birthday'", [todayMonthDay], (err, rows) => {
  if (err) {
    console.error('Error querying today\'s birthdays:', err);
  } else {
    console.log(`\nBirthdays today (${todayMonthDay}):`, rows.length);
    rows.forEach(row => {
      console.log(`- ${row.name}`);
    });
  }
  
  // Check celebrations for tomorrow
  db.all("SELECT * FROM celebrations WHERE date = ? AND type = 'birthday'", [tomorrowMonthDay], (err, rows) => {
    if (err) {
      console.error('Error querying tomorrow\'s birthdays:', err);
    } else {
      console.log(`\nBirthdays tomorrow (${tomorrowMonthDay}):`, rows.length);
      rows.forEach(row => {
        console.log(`- ${row.name}`);
      });
    }
    
    // Show some sample dates in the database
    db.all("SELECT DISTINCT date FROM celebrations ORDER BY date LIMIT 10", (err, rows) => {
      if (err) {
        console.error('Error querying dates:', err);
      } else {
        console.log('\nSample dates in database:');
        rows.forEach(row => {
          console.log(`- ${row.date}`);
        });
      }
      
      db.close();
    });
  });
});