const sqlite3 = require('sqlite3').verbose();
const xlsx = require('xlsx');
const path = require('path');

// Open database
const dbPath = path.resolve(process.cwd(), 'mazaya.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the database.');
});

// Create celebrations table if it doesn't exist
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
    return;
  }
  console.log('Celebrations table ready.');
  
  // Clear existing data
  db.run("DELETE FROM celebrations", (err) => {
    if (err) {
      console.error('Error clearing celebrations table:', err);
      return;
    }
    console.log('Cleared existing celebrations data.');
    
    // Read Excel file
    try {
      const workbook = xlsx.readFile('./BOD.xlsx');
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);
      
      console.log(`Found ${data.length} rows in Excel file`);
      console.log('First few rows:', data.slice(0, 3));
      
      // Process and insert data
      const stmt = db.prepare("INSERT INTO celebrations (type, name, date, years) VALUES (?, ?, ?, ?)");
      let insertCount = 0;
      
      data.forEach((row) => {
        // Extract employee name - might be in different columns depending on Excel structure
        const name = row['Employee Name'] || row['Name'] || row['Employee'] || 
                    row['Full Name'] || row['Staff Name'] || row['الاسم'] ||
                    Object.values(row).find(val => typeof val === 'string' && val.length > 3);
        
        // Extract date - look for birthday/DOB column
        const dobStr = row['Date of Birth'] || row['DOB'] || row['Birthday'] || 
                       row['Birth Date'] || row['تاريخ الميلاد'] || row['Date'];
        
        // Extract joining date for anniversaries
        const joiningStr = row['Joining Date'] || row['Join Date'] || row['Start Date'] || 
                          row['Employment Date'] || row['تاريخ الالتحاق'];
        
        if (name) {
          // Process birthday
          if (dobStr) {
            try {
              // Parse the date - Excel might store dates as numbers or strings
              let date;
              if (typeof dobStr === 'number') {
                // Excel date number
                date = new Date((dobStr - 25569) * 86400 * 1000);
              } else {
                // String date
                date = new Date(dobStr);
              }
              
              if (!isNaN(date.getTime())) {
                // Format as MM-DD for storage
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const formattedDate = `${month}-${day}`;
                
                stmt.run('birthday', name.trim(), formattedDate, null, (err) => {
                  if (err) {
                    console.error(`Error inserting birthday for ${name}:`, err);
                  } else {
                    insertCount++;
                  }
                });
              }
            } catch (e) {
              console.error(`Error processing birthday for ${name}:`, e);
            }
          }
          
          // Process work anniversary
          if (joiningStr) {
            try {
              // Parse the joining date
              let joiningDate;
              if (typeof joiningStr === 'number') {
                // Excel date number
                joiningDate = new Date((joiningStr - 25569) * 86400 * 1000);
              } else {
                // String date
                joiningDate = new Date(joiningStr);
              }
              
              if (!isNaN(joiningDate.getTime())) {
                // Calculate years of service
                const today = new Date();
                const yearsOfService = today.getFullYear() - joiningDate.getFullYear();
                
                // Only add as anniversary if they've been with company for at least 1 year
                if (yearsOfService >= 1) {
                  // Format as MM-DD for storage
                  const month = String(joiningDate.getMonth() + 1).padStart(2, '0');
                  const day = String(joiningDate.getDate()).padStart(2, '0');
                  const formattedDate = `${month}-${day}`;
                  
                  stmt.run('anniversary', name.trim(), formattedDate, yearsOfService, (err) => {
                    if (err) {
                      console.error(`Error inserting anniversary for ${name}:`, err);
                    } else {
                      insertCount++;
                    }
                  });
                }
              }
            } catch (e) {
              console.error(`Error processing anniversary for ${name}:`, e);
            }
          }
        }
      });
      
      stmt.finalize(() => {
        console.log(`Inserted ${insertCount} birthdays.`);
        
        // Verify the import
        db.all("SELECT COUNT(*) as count FROM celebrations", (err, result) => {
          if (err) {
            console.error('Error counting celebrations:', err);
          } else {
            console.log(`Total celebrations in database: ${result[0].count}`);
            
            // Show some examples
            db.all("SELECT * FROM celebrations LIMIT 5", (err, rows) => {
              if (err) {
                console.error('Error fetching sample data:', err);
              } else {
                console.log('\nSample celebrations:');
                rows.forEach(row => {
                  console.log(`- ${row.type}: ${row.name} on ${row.date}`);
                });
              }
              
              db.close();
            });
          }
        });
      });
      
    } catch (error) {
      console.error('Error reading Excel file:', error);
      db.close();
    }
  });
});