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

// GET all events
export async function GET() {
  try {
    const db = await openDb();

    const events = await db.all('SELECT * FROM events ORDER BY event_date DESC');
    await db.close();

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST a new event
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
    const { title, description, event_date } = await request.json();

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const db = await openDb();

    const now = new Date().toISOString();
    
    // Insert new event
    const result = await db.run(
      'INSERT INTO events (title, description, event_date, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, event_date, session.user.email, now, now]
    );

    await db.close();

    return NextResponse.json({ 
      id: result.lastID,
      title,
      description,
      event_date,
      created_by: session.user.email,
      created_at: now,
      updated_at: now
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}