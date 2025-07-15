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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ 
        authenticated: false,
        isAuditAdmin: false 
      });
    }

    const db = await openDb();
    
    // Check if user is an audit admin
    const auditAdmin = await db.get(
      'SELECT * FROM audit_admin_users WHERE email = ?',
      [session.user.email]
    );

    // Also check if user is a regular admin (they get audit admin access too)
    const regularAdmin = await db.get(
      'SELECT * FROM admin_users WHERE email = ?',
      [session.user.email]
    );
    
    await db.close();

    return NextResponse.json({ 
      authenticated: true,
      isAuditAdmin: !!(auditAdmin || regularAdmin),
      email: session.user.email
    });
  } catch (error: any) {
    console.error('Error checking audit admin status:', error);
    return NextResponse.json({ 
      authenticated: false,
      isAuditAdmin: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}