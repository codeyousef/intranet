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

// GET handler to retrieve new offers
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

    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 7; // Default to 7 days

    const db = await openDb();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateStr = cutoffDate.toISOString();

    return new Promise<NextResponse>((resolve, reject) => {
      db.all(
        'SELECT * FROM offers WHERE created_at > ? ORDER BY created_at DESC', 
        [cutoffDateStr], 
        (err, rows) => {
          db.close();

          if (err) {
            console.error('Database query error:', err.message);
            resolve(NextResponse.json({ offers: [] }, { status: 200 }));
          } else {
            resolve(NextResponse.json({ offers: rows }, { status: 200 }));
          }
        }
      );
    });
  } catch (error) {
    console.error('Error in GET handler:', error);
    return NextResponse.json({ offers: [] }, { status: 200 });
  }
}
