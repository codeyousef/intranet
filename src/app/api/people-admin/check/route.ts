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

// Helper function to check if user is people admin
async function isPeopleAdmin(email) {
  try {
    if (!email) {
      console.log('No email provided for people admin check');
      return false;
    }

    console.log('Checking people admin status for email:', email);
    const db = await openDb();

    // First, check if user is a regular admin (they should have access too)
    const adminResult = await db.get('SELECT * FROM admin_users WHERE LOWER(email) = ?', [email.toLowerCase()]);
    
    if (adminResult) {
      console.log('User is a regular admin, granting people admin access');
      await db.close();
      return true;
    }

    // Then check if user is specifically a people admin
    const result = await db.get('SELECT * FROM people_admin_users WHERE LOWER(email) = ?', [email.toLowerCase()]);
    console.log('People admin check result:', result);

    await db.close();
    return !!result;
  } catch (error) {
    console.error('Error checking people admin status:', error);
    return false;
  }
}

export async function GET() {
  try {
    // Check if user is authenticated
    console.log('GET /api/people-admin/check - Getting server session');
    const session = await getServerSession(authOptions);
    console.log('Session:', session ? {
      user: session.user,
      expires: session.expires
    } : 'No session');

    if (!session) {
      console.log('No session, returning unauthenticated response');
      return NextResponse.json({ isPeopleAdmin: false, authenticated: false });
    }

    console.log('User authenticated, checking if people admin');
    const userIsPeopleAdmin = await isPeopleAdmin(session.user.email);
    console.log('Is people admin result:', userIsPeopleAdmin);

    const response = { 
      isPeopleAdmin: userIsPeopleAdmin, 
      authenticated: true,
      user: {
        email: session.user.email,
        name: session.user.name
      }
    };
    console.log('Returning response:', response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error checking people admin status:', error);
    return NextResponse.json({ error: 'Failed to check people admin status' }, { status: 500 });
  }
}