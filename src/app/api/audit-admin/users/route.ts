import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Open database connection
async function openDb() {
  return open({
    filename: path.resolve(process.cwd(), 'mazaya.db'),
    driver: sqlite3.Database
  });
}

// GET: List all audit admin users
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an admin
    const db = await openDb();
    const admin = await db.get(
      'SELECT * FROM admin_users WHERE email = ?',
      [session.user.email]
    );

    if (!admin) {
      await db.close();
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all audit admin users
    const auditAdmins = await db.all('SELECT * FROM audit_admin_users ORDER BY created_at DESC');
    await db.close();

    return NextResponse.json(auditAdmins);
  } catch (error: any) {
    console.error('Error fetching audit admin users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Add a new audit admin user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user is an admin
    const db = await openDb();
    const admin = await db.get(
      'SELECT * FROM admin_users WHERE email = ?',
      [session.user.email]
    );

    if (!admin) {
      await db.close();
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Add new audit admin
    const now = new Date().toISOString();
    await db.run(
      'INSERT INTO audit_admin_users (email, created_at, updated_at) VALUES (?, ?, ?)',
      [email.toLowerCase(), now, now]
    );

    await db.close();

    return NextResponse.json({ success: true, message: 'Audit admin added successfully' });
  } catch (error: any) {
    console.error('Error adding audit admin user:', error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      return NextResponse.json({ error: 'User is already an audit admin' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}