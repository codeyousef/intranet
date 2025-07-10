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
    return NextResponse.json({ error: 'Database file not found' }, { status: 500 });
  }

  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

// Helper function to check if user is admin
async function isAdmin(email) {
  try {
    if (!email) {
      return false;
    }

    const db = await openDb();

    // Convert email to lowercase for case-insensitive comparison
    const emailLower = email.toLowerCase();

    // Try case-insensitive comparison using LOWER function in SQL
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

    if (!session) {
      return NextResponse.json({ isAdmin: false, authenticated: false });
    }

    const userIsAdmin = await isAdmin(session.user.email);

    const response = { 
      isAdmin: userIsAdmin, 
      authenticated: true,
      user: {
        email: session.user.email,
        name: session.user.name
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ error: 'Failed to check admin status' }, { status: 500 });
  }
}
