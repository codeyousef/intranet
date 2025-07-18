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

// Helper function to check if user is people admin
async function isPeopleAdmin(email: string): Promise<boolean> {
  try {
    if (!email) return false;

    const db = await openDb();

    // Check if user is a regular admin
    const adminResult = await db.get('SELECT * FROM admin_users WHERE LOWER(email) = ?', [email.toLowerCase()]);
    
    if (adminResult) {
      await db.close();
      return true;
    }

    // Check if user is a people admin
    const result = await db.get('SELECT * FROM people_admin_users WHERE LOWER(email) = ?', [email.toLowerCase()]);
    
    await db.close();
    return !!result;
  } catch (error) {
    console.error('Error checking people admin status:', error);
    return false;
  }
}

// GET a specific news item by ID
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const db = await openDb();

    const newsItem = await db.get('SELECT * FROM company_news WHERE id = ?', [id]);
    await db.close();

    if (!newsItem) {
      return NextResponse.json({ error: 'News item not found' }, { status: 404 });
    }

    return NextResponse.json(newsItem);
  } catch (error) {
    console.error('Error fetching news item:', error);
    return NextResponse.json({ error: 'Failed to fetch news item' }, { status: 500 });
  }
}

// PUT (update) a specific news item by ID
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check if user is authenticated and is a people admin
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userIsPeopleAdmin = await isPeopleAdmin(session.user.email);
    if (!userIsPeopleAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { id } = await params;
    
    // Parse request body
    const { title, content, published_at } = await request.json();

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const db = await openDb();

    // Check if news item exists
    const existingNewsItem = await db.get('SELECT * FROM company_news WHERE id = ?', [id]);
    if (!existingNewsItem) {
      await db.close();
      return NextResponse.json({ error: 'News item not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    
    // Update news item
    await db.run(
      'UPDATE company_news SET title = ?, content = ?, published_at = ?, updated_at = ? WHERE id = ?',
      [title, content, published_at, now, id]
    );

    // Get updated news item
    const updatedNewsItem = await db.get('SELECT * FROM company_news WHERE id = ?', [id]);
    
    await db.close();

    return NextResponse.json(updatedNewsItem);
  } catch (error) {
    console.error('Error updating news item:', error);
    return NextResponse.json({ error: 'Failed to update news item' }, { status: 500 });
  }
}

// DELETE a specific news item by ID
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check if user is authenticated and is a people admin
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userIsPeopleAdmin = await isPeopleAdmin(session.user.email);
    if (!userIsPeopleAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { id } = await params;
    
    const db = await openDb();

    // Check if news item exists
    const existingNewsItem = await db.get('SELECT * FROM company_news WHERE id = ?', [id]);
    if (!existingNewsItem) {
      await db.close();
      return NextResponse.json({ error: 'News item not found' }, { status: 404 });
    }

    // Delete news item
    await db.run('DELETE FROM company_news WHERE id = ?', [id]);
    
    await db.close();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting news item:', error);
    return NextResponse.json({ error: 'Failed to delete news item' }, { status: 500 });
  }
}