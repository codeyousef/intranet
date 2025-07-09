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

// POST: Submit a new suggestion (non-anonymous)
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

    // Insert suggestion with user information
    const result = await db.run(
      `INSERT INTO suggestions (content, category, user_email, user_name, created_at) VALUES (?, ?, ?, ?, datetime('now'))`,
      [content.trim(), category || null, session.user.email, session.user.name || session.user.email]
    );

    await db.close();

    return NextResponse.json({
      success: true,
      message: 'Thank you for your suggestion! Your idea has been submitted and will be reviewed by our team.',
      id: result.lastID
    });
  } catch (error: any) {
    console.error('Error submitting suggestion:', error);
    return NextResponse.json({ error: 'Failed to submit suggestion' }, { status: 500 });
  }
}

// GET: Retrieve suggestions (admin only)
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
    let query = 'SELECT * FROM suggestions';
    const params: any[] = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Get suggestions
    const suggestions = await db.all(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM suggestions';
    if (status) {
      countQuery += ' WHERE status = ?';
    }
    const { count } = await db.get(countQuery, status ? [status] : []);

    await db.close();

    return NextResponse.json({
      suggestions,
      total: count,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}

// PATCH: Update suggestion status (admin only)
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
      return NextResponse.json({ error: 'Suggestion ID is required' }, { status: 400 });
    }

    // Update suggestion
    const updates: string[] = [];
    const params: any[] = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
      
      if (status === 'resolved' || status === 'implemented') {
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
      `UPDATE suggestions SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    await db.close();

    return NextResponse.json({
      success: true,
      message: 'Suggestion updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating suggestion:', error);
    return NextResponse.json({ error: 'Failed to update suggestion' }, { status: 500 });
  }
}