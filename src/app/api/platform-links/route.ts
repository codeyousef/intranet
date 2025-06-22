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
    const db = await openDb();
    const platformLinks = await db.all('SELECT * FROM platform_links ORDER BY display_order ASC');
    await db.close();
    
    return NextResponse.json(platformLinks);
  } catch (error) {
    console.error('Error fetching platform links:', error);
    return NextResponse.json({ error: 'Failed to fetch platform links' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userIsAdmin = await isAdmin(session.user.email);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const data = await request.json();
    const { title, url, icon, display_order, is_active } = data;
    
    // Validate required fields
    if (!title || !url || !icon) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const db = await openDb();
    const now = new Date().toISOString();
    
    const result = await db.run(
      'INSERT INTO platform_links (title, url, icon, display_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, url, icon, display_order || 0, is_active || 1, now, now]
    );
    
    await db.close();
    
    return NextResponse.json({ 
      id: result.lastID,
      title,
      url,
      icon,
      display_order: display_order || 0,
      is_active: is_active || 1,
      created_at: now,
      updated_at: now
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating platform link:', error);
    return NextResponse.json({ error: 'Failed to create platform link' }, { status: 500 });
  }
}