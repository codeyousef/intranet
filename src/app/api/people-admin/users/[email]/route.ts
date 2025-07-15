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

// DELETE a people admin user
export async function DELETE(request: Request, { params }: { params: Promise<{ email: string }> }) {
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

    const { email } = await params;
    
    const db = await openDb();

    // Check if user exists
    const existingUser = await db.get('SELECT * FROM people_admin_users WHERE LOWER(email) = ?', [email.toLowerCase()]);
    if (!existingUser) {
      await db.close();
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete user
    await db.run('DELETE FROM people_admin_users WHERE LOWER(email) = ?', [email.toLowerCase()]);
    
    await db.close();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting people admin user:', error);
    return NextResponse.json({ error: 'Failed to delete people admin user' }, { status: 500 });
  }
}