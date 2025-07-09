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

// POST: Submit a new complaint (anonymous)
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, category } = await request.json();

    // Validate input
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (content.length > 5000) {
      return NextResponse.json({ error: 'Content is too long (max 5000 characters)' }, { status: 400 });
    }

    const db = await openDb();

    // Insert complaint (no user information stored for anonymity)
    const result = await db.run(
      `INSERT INTO complaints (content, category, created_at) VALUES (?, ?, datetime('now'))`,
      [content.trim(), category || null]
    );

    await db.close();

    return NextResponse.json({
      success: true,
      message: 'Your feedback has been submitted anonymously. Thank you for raising your voice.',
      id: result.lastID
    });
  } catch (error: any) {
    console.error('Error submitting complaint:', error);
    return NextResponse.json({ error: 'Failed to submit complaint' }, { status: 500 });
  }
}

// GET: Retrieve complaints (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is a people admin
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a people admin
    const db = await openDb();
    const peopleAdmin = await db.get(
      'SELECT * FROM people_admin_users WHERE email = ?',
      [session.user.email]
    );

    if (!peopleAdmin) {
      await db.close();
      return NextResponse.json({ error: 'Forbidden - People Admin access required' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = 'SELECT * FROM complaints';
    const params: any[] = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Get complaints
    const complaints = await db.all(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM complaints';
    if (status) {
      countQuery += ' WHERE status = ?';
    }
    const { count } = await db.get(countQuery, status ? [status] : []);

    await db.close();

    return NextResponse.json({
      complaints,
      total: count,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('Error fetching complaints:', error);
    return NextResponse.json({ error: 'Failed to fetch complaints' }, { status: 500 });
  }
}

// PATCH: Update complaint status (admin only)
export async function PATCH(request: NextRequest) {
  try {
    // Check if user is authenticated and is a people admin
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await openDb();
    const peopleAdmin = await db.get(
      'SELECT * FROM people_admin_users WHERE email = ?',
      [session.user.email]
    );

    if (!peopleAdmin) {
      await db.close();
      return NextResponse.json({ error: 'Forbidden - People Admin access required' }, { status: 403 });
    }

    const { id, status, admin_notes } = await request.json();

    if (!id) {
      await db.close();
      return NextResponse.json({ error: 'Complaint ID is required' }, { status: 400 });
    }

    // Update complaint
    const updates: string[] = [];
    const params: any[] = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
      
      if (status === 'resolved') {
        updates.push('resolved_at = datetime(\'now\')');
      }
    }

    if (admin_notes !== undefined) {
      updates.push('admin_notes = ?');
      params.push(admin_notes);
    }

    if (updates.length === 0) {
      await db.close();
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    params.push(id);
    await db.run(
      `UPDATE complaints SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    await db.close();

    return NextResponse.json({
      success: true,
      message: 'Complaint updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating complaint:', error);
    return NextResponse.json({ error: 'Failed to update complaint' }, { status: 500 });
  }
}