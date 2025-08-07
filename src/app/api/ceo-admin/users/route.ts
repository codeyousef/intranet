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

// Helper function to check if user is admin
async function isAdmin(email: string): Promise<boolean> {
  try {
    if (!email) {
      return false;
    }

    const db = await openDb();

    // Convert email to lowercase for case-insensitive comparison
    const emailLower = email.toLowerCase();

    // Check if user is in admin_users table
    const result = await db.get('SELECT * FROM admin_users WHERE LOWER(email) = ?', [emailLower]);

    await db.close();
    return !!result;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export async function GET() {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin (only admins can view CEO admin users)
    const userIsAdmin = await isAdmin(session.user.email);
    
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Access denied. Admin privileges required.' }, { status: 403 });
    }

    const db = await openDb();
    await ensureCEOAdminTable(db);
    
    // Get all CEO admin users
    const users = await db.all('SELECT email, created_at FROM ceo_admin_users ORDER BY created_at DESC');
    
    await db.close();
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching CEO admin users:', error);
    return NextResponse.json({ error: 'Failed to fetch CEO admin users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin (only admins can add CEO admin users)
    const userIsAdmin = await isAdmin(session.user.email);
    
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Access denied. Admin privileges required.' }, { status: 403 });
    }

    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const db = await openDb();
    await ensureCEOAdminTable(db);

    try {
      // Insert new CEO admin user
      await db.run('INSERT INTO ceo_admin_users (email) VALUES (?)', [email.toLowerCase()]);
      
      await db.close();
      
      return NextResponse.json({ 
        success: true, 
        message: 'CEO admin user added successfully' 
      });
    } catch (dbError: any) {
      await db.close();
      
      // Handle duplicate email
      if (dbError.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        return NextResponse.json({ error: 'User is already a CEO admin' }, { status: 400 });
      }
      
      throw dbError;
    }
  } catch (error) {
    console.error('Error adding CEO admin user:', error);
    return NextResponse.json({ error: 'Failed to add CEO admin user' }, { status: 500 });
  }
}