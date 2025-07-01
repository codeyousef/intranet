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
    return null;
  }

  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

// Helper function to check if user is people admin
async function isPeopleAdmin(email) {
  try {
    if (!email) return false;

    const db = await openDb();
    if (!db) return false;

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

// GET a specific event by ID
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    const db = await openDb();
    if (!db) {
      return NextResponse.json({ error: 'Database file not found' }, { status: 500 });
    }

    const event = await db.get('SELECT * FROM events WHERE id = ?', [id]);
    await db.close();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

// PUT (update) a specific event by ID
export async function PUT(request, { params }) {
  try {
    // Check if user is authenticated and is a people admin
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userIsPeopleAdmin = await isPeopleAdmin(session.user.email);
    if (!userIsPeopleAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { id } = params;
    
    // Parse request body
    const { title, description, event_date } = await request.json();

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const db = await openDb();
    if (!db) {
      return NextResponse.json({ error: 'Database file not found' }, { status: 500 });
    }

    // Check if event exists
    const existingEvent = await db.get('SELECT * FROM events WHERE id = ?', [id]);
    if (!existingEvent) {
      await db.close();
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    
    // Update event
    await db.run(
      'UPDATE events SET title = ?, description = ?, event_date = ?, updated_at = ? WHERE id = ?',
      [title, description, event_date, now, id]
    );

    // Get updated event
    const updatedEvent = await db.get('SELECT * FROM events WHERE id = ?', [id]);
    
    await db.close();

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

// DELETE a specific event by ID
export async function DELETE(request, { params }) {
  try {
    // Check if user is authenticated and is a people admin
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userIsPeopleAdmin = await isPeopleAdmin(session.user.email);
    if (!userIsPeopleAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { id } = params;
    
    const db = await openDb();
    if (!db) {
      return NextResponse.json({ error: 'Database file not found' }, { status: 500 });
    }

    // Check if event exists
    const existingEvent = await db.get('SELECT * FROM events WHERE id = ?', [id]);
    if (!existingEvent) {
      await db.close();
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Delete event
    await db.run('DELETE FROM events WHERE id = ?', [id]);
    
    await db.close();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}