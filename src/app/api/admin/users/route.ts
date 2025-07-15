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

// Helper function to check if user is admin
async function isAdmin(email: string): Promise<boolean> {
  try {
    const db = await openDb();
    const result = await db.get('SELECT * FROM admin_users WHERE email = ?', [email]);
    await db.close();
    return !!result;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export async function GET() {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userIsAdmin = await isAdmin(session.user.email);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const db = await openDb();
    const adminUsers = await db.all('SELECT * FROM admin_users');
    await db.close();
    
    return NextResponse.json(adminUsers);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json({ error: 'Failed to fetch admin users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userIsAdmin = await isAdmin(session.user.email);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const data = await request.json();
    const { email } = data;
    
    // Validate required fields
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    const db = await openDb();
    
    // Check if user is already an admin
    const existingAdmin = await db.get('SELECT * FROM admin_users WHERE email = ?', [email]);
    if (existingAdmin) {
      await db.close();
      return NextResponse.json({ error: 'User is already an admin' }, { status: 400 });
    }
    
    const now = new Date().toISOString();
    
    const result = await db.run(
      'INSERT INTO admin_users (email, created_at, updated_at) VALUES (?, ?, ?)',
      [email, now, now]
    );
    
    await db.close();
    
    return NextResponse.json({ 
      id: result.lastID,
      email,
      created_at: now,
      updated_at: now
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding admin user:', error);
    return NextResponse.json({ error: 'Failed to add admin user' }, { status: 500 });
  }
}