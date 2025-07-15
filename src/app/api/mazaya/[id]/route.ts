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

// GET handler to retrieve a single offer by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if database file exists and has data
    const fs = require('fs');
    const dbPath = path.join(process.cwd(), 'mazaya.db');

    // If database doesn't exist or is empty, return not found
    if (!fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0) {
      console.log('Database file does not exist or is empty');
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    const db = await openDb();

    return new Promise<NextResponse>((resolve, reject) => {
      db.get('SELECT * FROM offers WHERE id = ?', [id], (err, row) => {
        db.close();

        if (err) {
          console.error('Database query error:', err.message);
          resolve(NextResponse.json({ error: 'Failed to fetch offer' }, { status: 500 }));
        } else if (!row) {
          resolve(NextResponse.json({ error: 'Offer not found' }, { status: 404 }));
        } else {
          resolve(NextResponse.json({ offer: row }, { status: 200 }));
        }
      });
    });
  } catch (error) {
    console.error('Error in GET handler:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}