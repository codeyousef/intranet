import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';

// Helper function to open the database
async function openDb() {
  const dbPath = path.join(process.cwd(), 'mazaya.db');

  return new Promise<sqlite3.Database>((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

// GET handler to retrieve all offers
export async function GET(req: NextRequest) {
  try {
    // Check if database file exists and has data
    const fs = require('fs');
    const dbPath = path.join(process.cwd(), 'mazaya.db');

    // If database doesn't exist or is empty, return empty array
    if (!fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0) {
      console.log('Database file does not exist or is empty');
      return NextResponse.json({ offers: [] }, { status: 200 });
    }

    const db = await openDb();

    return new Promise<NextResponse>((resolve, reject) => {
      db.all('SELECT * FROM offers ORDER BY updated_at DESC', [], (err, rows) => {
        db.close();

        if (err) {
          console.error('Database query error:', err.message);
          resolve(NextResponse.json({ offers: [] }, { status: 200 }));
        } else {
          resolve(NextResponse.json({ offers: rows }, { status: 200 }));
        }
      });
    });
  } catch (error) {
    console.error('Error in GET handler:', error);
    return NextResponse.json({ offers: [] }, { status: 200 });
  }
}

// For new offers, use the /api/mazaya/new endpoint
