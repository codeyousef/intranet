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

// GET all company news
export async function GET() {
  try {
    const db = await openDb();

    const news = await db.all('SELECT * FROM company_news ORDER BY published_at DESC');
    await db.close();

    return NextResponse.json(news);
  } catch (error) {
    console.error('Error fetching company news:', error);
    return NextResponse.json({ error: 'Failed to fetch company news' }, { status: 500 });
  }
}

// POST a new company news item
export async function POST(request: Request) {
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

    // Parse request body
    const { title, content, published_at } = await request.json();

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const db = await openDb();

    const now = new Date().toISOString();
    const publishDate = published_at || now;
    
    // Insert new company news item
    const result = await db.run(
      'INSERT INTO company_news (title, content, published_at, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [title, content, publishDate, session.user.email, now, now]
    );

    await db.close();

    return NextResponse.json({ 
      id: result.lastID,
      title,
      content,
      published_at: publishDate,
      created_by: session.user.email,
      created_at: now,
      updated_at: now
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating company news:', error);
    return NextResponse.json({ error: 'Failed to create company news' }, { status: 500 });
  }
}