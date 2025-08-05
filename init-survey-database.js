#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'prisma', 'dev.db');

console.log('Initializing survey database...');
console.log('Database path:', dbPath);

// Create or open database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database.');
});

// Create tables if they don't exist
const createTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create User table
      db.run(`CREATE TABLE IF NOT EXISTS User (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        image TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Create Survey table
      db.run(`CREATE TABLE IF NOT EXISTS Survey (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        question TEXT NOT NULL,
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Create SurveyOption table
      db.run(`CREATE TABLE IF NOT EXISTS SurveyOption (
        id TEXT PRIMARY KEY,
        surveyId TEXT NOT NULL,
        text TEXT NOT NULL,
        displayOrder INTEGER NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (surveyId) REFERENCES Survey (id) ON DELETE CASCADE
      )`);

      // Create SurveyResponse table
      db.run(`CREATE TABLE IF NOT EXISTS SurveyResponse (
        id TEXT PRIMARY KEY,
        surveyId TEXT NOT NULL,
        optionId TEXT NOT NULL,
        userId TEXT NOT NULL,
        userEmail TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (surveyId) REFERENCES Survey (id) ON DELETE CASCADE,
        FOREIGN KEY (optionId) REFERENCES SurveyOption (id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE,
        UNIQUE(surveyId, userId)
      )`, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Tables created successfully.');
          resolve();
        }
      });
    });
  });
};

// Generate a simple ID (similar to cuid)
const generateId = () => {
  return 'survey_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Insert survey data
const insertSurveyData = () => {
  return new Promise((resolve, reject) => {
    // Check if survey already exists
    db.get("SELECT COUNT(*) as count FROM Survey WHERE isActive = 1", (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (row.count > 0) {
        console.log('Active survey already exists. Skipping insertion.');
        resolve();
        return;
      }

      console.log('Creating new survey...');

      const surveyId = generateId();
      const option1Id = generateId();
      const option2Id = generateId();

      db.serialize(() => {
        // Insert survey
        db.run(`INSERT INTO Survey (id, title, question, isActive) VALUES (?, ?, ?, ?)`, 
          [surveyId, 'Lounge Design Feedback', 'Do you like the new lounge design?', 1], 
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            console.log('Survey created with ID:', surveyId);
          }
        );

        // Insert options
        db.run(`INSERT INTO SurveyOption (id, surveyId, text, displayOrder) VALUES (?, ?, ?, ?)`,
          [option1Id, surveyId, 'Yes, I love it!', 1],
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            console.log('Option 1 created:', 'Yes, I love it!');
          }
        );

        db.run(`INSERT INTO SurveyOption (id, surveyId, text, displayOrder) VALUES (?, ?, ?, ?)`,
          [option2Id, surveyId, 'No, needs improvement', 2],
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            console.log('Option 2 created:', 'No, needs improvement');
            resolve();
          }
        );
      });
    });
  });
};

// Main execution
createTables()
  .then(() => insertSurveyData())
  .then(() => {
    console.log('Survey database initialization completed successfully!');
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
    });
  })
  .catch((error) => {
    console.error('Error during database initialization:', error);
    db.close();
    process.exit(1);
  });