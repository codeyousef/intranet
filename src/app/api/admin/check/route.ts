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
      console.log('No email provided for admin check');
      return false;
    }

    console.log('Checking admin status for email:', email);
    const db = await openDb();

    // First, log all admin users to see what's in the database
    const allAdmins = await db.all('SELECT * FROM admin_users');
    console.log('All admin users in database:', allAdmins);

    // Convert email to lowercase for case-insensitive comparison
    const emailLower = email.toLowerCase();
    console.log('Lowercase email for comparison:', emailLower);

    // Try case-insensitive comparison using LOWER function in SQL
    const result = await db.get('SELECT * FROM admin_users WHERE LOWER(email) = ?', [emailLower]);
    console.log('Admin check result:', result);

    // If no result, also try manual comparison with all admin users
    if (!result && allAdmins.length > 0) {
      console.log('No exact match found, trying manual case-insensitive comparison');
      const matchingAdmin = allAdmins.find(admin => 
        admin.email.toLowerCase() === emailLower
      );
      console.log('Manual comparison result:', matchingAdmin || 'No match found');

      if (matchingAdmin) {
        console.log('Manual match found! User is admin.');
        await db.close();
        return true;
      }
    }

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
    console.log('GET /api/admin/check - Getting server session');
    const session = await getServerSession(authOptions);
    console.log('Session:', session ? {
      user: session.user,
      expires: session.expires
    } : 'No session');

    if (!session) {
      console.log('No session, returning unauthenticated response');
      return NextResponse.json({ isAdmin: false, authenticated: false });
    }

    console.log('User authenticated, checking if admin');
    const userIsAdmin = await isAdmin(session.user.email);
    console.log('Is admin result:', userIsAdmin);

    const response = { 
      isAdmin: userIsAdmin, 
      authenticated: true,
      user: {
        email: session.user.email,
        name: session.user.name
      }
    };
    console.log('Returning response:', response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ error: 'Failed to check admin status' }, { status: 500 });
  }
}
