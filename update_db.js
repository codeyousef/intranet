const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// First, install the xlsx package
console.log('Installing xlsx package...');
require('child_process').execSync('npm install xlsx', { stdio: 'inherit' });
console.log('xlsx package installed successfully.');

// Now require the xlsx package
const XLSX = require('xlsx');

// Open the database
const dbPath = path.resolve(process.cwd(), 'mazaya.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the database.');
});

// Create employees table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    department TEXT,
    date_of_birth TEXT NOT NULL,
    joining_date TEXT NOT NULL,
    created_at TEXT,
    updated_at TEXT
  )
`, (err) => {
  if (err) {
    console.error('Error creating employees table:', err.message);
    db.close();
    process.exit(1);
  }
  console.log('employees table created or already exists.');
  
  // Read the Excel file
  const excelPath = path.resolve(process.cwd(), 'BOD.xlsx');
  if (!fs.existsSync(excelPath)) {
    console.error('Excel file not found:', excelPath);
    db.close();
    process.exit(1);
  }
  
  console.log('Reading Excel file:', excelPath);
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  if (data.length === 0) {
    console.error('No data found in Excel file');
    db.close();
    process.exit(1);
  }
  
  console.log(`Found ${data.length} employees in Excel file`);
  
  // Clear existing data
  db.run('DELETE FROM employees', (err) => {
    if (err) {
      console.error('Error clearing employees table:', err.message);
      db.close();
      process.exit(1);
    }
    console.log('Cleared existing employee data');
    
    // Insert new data
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO employees (name, department, date_of_birth, joining_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    let insertedCount = 0;
    
    data.forEach((row) => {
      // Check if the row has the required fields
      if (!row.Name || !row['Date of Birth'] || !row['Joining Date']) {
        console.warn('Skipping row with missing required fields:', row);
        return;
      }
      
      // Convert Excel dates to ISO format
      let dob = row['Date of Birth'];
      let joiningDate = row['Joining Date'];
      
      // If the dates are numbers (Excel serial dates), convert them
      if (typeof dob === 'number') {
        dob = XLSX.SSF.format('yyyy-mm-dd', dob);
      }
      
      if (typeof joiningDate === 'number') {
        joiningDate = XLSX.SSF.format('yyyy-mm-dd', joiningDate);
      }
      
      stmt.run([
        row.Name,
        row.Department || '',
        dob,
        joiningDate,
        now,
        now
      ], (err) => {
        if (err) {
          console.error(`Error adding employee ${row.Name}:`, err.message);
        } else {
          insertedCount++;
          console.log(`Added employee: ${row.Name}`);
        }
      });
    });
    
    stmt.finalize(() => {
      console.log(`Successfully inserted ${insertedCount} employees`);
      db.close();
      console.log('Database update complete.');
    });
  });
});