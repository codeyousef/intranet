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
    if (!email) return false;

    const db = await openDb();

    const result = await db.get('SELECT * FROM admin_users WHERE LOWER(email) = ?', [email.toLowerCase()]);
    
    await db.close();
    return !!result;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// GET all people admin users
export async function GET() {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userIsAdmin = await isAdmin(session.user.email);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const db = await openDb();

    const peopleAdminUsers = await db.all('SELECT * FROM people_admin_users ORDER BY email');
    await db.close();

    return NextResponse.json(peopleAdminUsers);
  } catch (error) {
    console.error('Error fetching people admin users:', error);
    return NextResponse.json({ error: 'Failed to fetch people admin users' }, { status: 500 });
  }
}

// POST a new people admin user
export async function POST(request: Request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userIsAdmin = await isAdmin(session.user.email);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Parse request body
    const { email } = await request.json();

    // Validate required fields
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const db = await openDb();

    // Check if user already exists
    const existingUser = await db.get('SELECT * FROM people_admin_users WHERE LOWER(email) = ?', [email.toLowerCase()]);
    if (existingUser) {
      await db.close();
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const now = new Date().toISOString();
    
    // Insert new people admin user
    const result = await db.run(
      'INSERT INTO people_admin_users (email, created_at, updated_at) VALUES (?, ?, ?)',
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
    console.error('Error adding people admin user:', error);
    return NextResponse.json({ error: 'Failed to add people admin user' }, { status: 500 });
  }
}