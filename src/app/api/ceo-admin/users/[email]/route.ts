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

export async function DELETE(
  request: Request,
  context: { params: Promise<{ email: string }> }
) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin (only admins can remove CEO admin users)
    const userIsAdmin = await isAdmin(session.user.email);
    
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Access denied. Admin privileges required.' }, { status: 403 });
    }

    const params = await context.params;
    const emailToRemove = decodeURIComponent(params.email);

    if (!emailToRemove) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    const db = await openDb();
    
    // Remove CEO admin user
    const result = await db.run('DELETE FROM ceo_admin_users WHERE LOWER(email) = ?', [emailToRemove.toLowerCase()]);
    
    await db.close();
    
    if (result.changes === 0) {
      return NextResponse.json({ error: 'CEO admin user not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'CEO admin user removed successfully' 
    });
  } catch (error) {
    console.error('Error removing CEO admin user:', error);
    return NextResponse.json({ error: 'Failed to remove CEO admin user' }, { status: 500 });
  }
}