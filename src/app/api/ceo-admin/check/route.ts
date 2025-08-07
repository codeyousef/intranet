import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import path from 'path';
import fs from 'fs';

// Helper function to open the database
async function openDb() {
  const dbPath = path.resolve(process.cwd(), 'mazaya.db');

  // Check if database file exists
  if (!fs.existsSync(dbPath)) {
    throw new Error('Database file not found');
  }

  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

// Helper function to create CEO admin users table if it doesn't exist
async function ensureCEOAdminTable(db: any) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ceo_admin_users (
      email TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Helper function to check if user is a CEO admin
async function isCEOAdmin(email: string): Promise<boolean> {
  try {
    if (!email) {
      return false;
    }

    const db = await openDb();
    await ensureCEOAdminTable(db);

    // Convert email to lowercase for case-insensitive comparison
    const emailLower = email.toLowerCase();

    // Try case-insensitive comparison using LOWER function in SQL
    const result = await db.get('SELECT * FROM ceo_admin_users WHERE LOWER(email) = ?', [emailLower]);

    await db.close();
    return !!result;
  } catch (error) {
    console.error('Error checking CEO admin status:', error);
    return false;
  }
}

export async function GET() {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ isCEOAdmin: false, authenticated: false });
    }

    const userIsCEOAdmin = await isCEOAdmin(session.user.email);

    const response = { 
      isCEOAdmin: userIsCEOAdmin, 
      authenticated: true,
      user: {
        email: session.user.email,
        name: session.user.name || ''
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error checking CEO admin status:', error);
    return NextResponse.json({ error: 'Failed to check CEO admin status' }, { status: 500 });
  }
}