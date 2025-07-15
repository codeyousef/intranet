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
    const db = await openDb();
    const result = await db.get('SELECT * FROM admin_users WHERE email = ?', [email]);
    await db.close();
    return !!result;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const db = await openDb();
    const platformLink = await db.get('SELECT * FROM platform_links WHERE id = ?', [id]);
    await db.close();
    
    if (!platformLink) {
      return NextResponse.json({ error: 'Platform link not found' }, { status: 404 });
    }
    
    return NextResponse.json(platformLink);
  } catch (error) {
    console.error('Error fetching platform link:', error);
    return NextResponse.json({ error: 'Failed to fetch platform link' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userIsAdmin = await isAdmin(session.user.email);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const { id } = await params;
    const data = await request.json();
    const { title, url, icon, display_order, is_active } = data;
    
    // Validate required fields
    if (!title || !url || !icon) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const db = await openDb();
    
    // Check if platform link exists
    const existingLink = await db.get('SELECT * FROM platform_links WHERE id = ?', [id]);
    if (!existingLink) {
      await db.close();
      return NextResponse.json({ error: 'Platform link not found' }, { status: 404 });
    }
    
    const now = new Date().toISOString();
    
    await db.run(
      'UPDATE platform_links SET title = ?, url = ?, icon = ?, display_order = ?, is_active = ?, updated_at = ? WHERE id = ?',
      [title, url, icon, display_order || 0, is_active || 1, now, id]
    );
    
    const updatedLink = await db.get('SELECT * FROM platform_links WHERE id = ?', [id]);
    await db.close();
    
    return NextResponse.json(updatedLink);
  } catch (error) {
    console.error('Error updating platform link:', error);
    return NextResponse.json({ error: 'Failed to update platform link' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userIsAdmin = await isAdmin(session.user.email);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const { id } = await params;
    
    const db = await openDb();
    
    // Check if platform link exists
    const existingLink = await db.get('SELECT * FROM platform_links WHERE id = ?', [id]);
    if (!existingLink) {
      await db.close();
      return NextResponse.json({ error: 'Platform link not found' }, { status: 404 });
    }
    
    await db.run('DELETE FROM platform_links WHERE id = ?', [id]);
    await db.close();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting platform link:', error);
    return NextResponse.json({ error: 'Failed to delete platform link' }, { status: 500 });
  }
}