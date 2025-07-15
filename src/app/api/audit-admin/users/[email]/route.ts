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

// DELETE: Remove an audit admin user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await params;
    const emailToRemove = decodeURIComponent(email);

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

    // Prevent removing yourself
    if (emailToRemove.toLowerCase() === session.user.email.toLowerCase()) {
      await db.close();
      return NextResponse.json({ error: 'Cannot remove yourself from audit admin' }, { status: 400 });
    }

    // Remove the audit admin
    const result = await db.run(
      'DELETE FROM audit_admin_users WHERE email = ?',
      [emailToRemove.toLowerCase()]
    );

    await db.close();

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Audit admin not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Audit admin removed successfully' });
  } catch (error: any) {
    console.error('Error removing audit admin user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}