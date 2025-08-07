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

// Helper function to create CEO questions table if it doesn't exist
async function ensureCEOQuestionsTable(db: any) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ceo_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      category TEXT,
      is_anonymous BOOLEAN NOT NULL DEFAULT 0,
      user_name TEXT,
      user_email TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      admin_response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      answered_at DATETIME
    )
  `);
}

// Helper function to create CEO admin users table if it doesn't exist
async function ensureCEOAdminTable(db: any) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ceo_admin_users (
      email TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Helper function to check if user is a CEO admin or regular admin
async function isCEOAdminOrAdmin(email: string): Promise<boolean> {
  try {
    if (!email) {
      return false;
    }

    const db = await openDb();
    const emailLower = email.toLowerCase();

    // Check if user is a regular admin
    const adminResult = await db.get('SELECT * FROM admin_users WHERE LOWER(email) = ?', [emailLower]);
    
    // Check if user is a CEO admin
    const ceoAdminResult = await db.get('SELECT * FROM ceo_admin_users WHERE LOWER(email) = ?', [emailLower]);

    await db.close();
    return !!(adminResult || ceoAdminResult);
  } catch (error) {
    console.error('Error checking CEO admin status:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { content, category, is_anonymous } = await request.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (content.length > 5000) {
      return NextResponse.json({ error: 'Content must be 5000 characters or less' }, { status: 400 });
    }

    const db = await openDb();
    
    // Ensure the CEO questions table exists
    await ensureCEOQuestionsTable(db);

    // Prepare the data
    const questionData = {
      content: content.trim(),
      category: category || null,
      is_anonymous: is_anonymous ? 1 : 0,
      user_name: is_anonymous ? null : session.user.name,
      user_email: is_anonymous ? null : session.user.email,
      status: 'new'
    };

    // Insert the CEO question
    const result = await db.run(
      `INSERT INTO ceo_questions 
       (content, category, is_anonymous, user_name, user_email, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        questionData.content,
        questionData.category,
        questionData.is_anonymous,
        questionData.user_name,
        questionData.user_email,
        questionData.status
      ]
    );

    await db.close();

    return NextResponse.json({ 
      success: true, 
      message: 'Your question has been submitted to the CEO. Thank you for your input!',
      id: result.lastID
    });

  } catch (error) {
    console.error('Error submitting CEO question:', error);
    return NextResponse.json(
      { error: 'Failed to submit question. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is CEO admin or regular admin
    const isAuthorized = await isCEOAdminOrAdmin(session.user.email);
    
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Access denied. CEO admin privileges required.' }, { status: 403 });
    }

    const db = await openDb();
    
    // Ensure tables exist
    await ensureCEOQuestionsTable(db);
    await ensureCEOAdminTable(db);

    // Get all CEO questions
    const questions = await db.all(`
      SELECT id, content, category, is_anonymous, user_name, user_email, 
             status, admin_response, created_at, answered_at
      FROM ceo_questions
      ORDER BY created_at DESC
    `);

    await db.close();

    return NextResponse.json({ success: true, questions });

  } catch (error) {
    console.error('Error fetching CEO questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CEO questions' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is CEO admin or regular admin
    const isAuthorized = await isCEOAdminOrAdmin(session.user.email);
    
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Access denied. CEO admin privileges required.' }, { status: 403 });
    }

    const { id, status, admin_response } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }

    const validStatuses = ['new', 'under_review', 'answered', 'dismissed'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const db = await openDb();
    
    // Ensure table exists
    await ensureCEOQuestionsTable(db);

    // Update the question
    const updateFields = [];
    const updateValues = [];

    if (status) {
      updateFields.push('status = ?');
      updateValues.push(status);
      
      if (status === 'answered') {
        updateFields.push('answered_at = CURRENT_TIMESTAMP');
      }
    }

    if (admin_response !== undefined) {
      updateFields.push('admin_response = ?');
      updateValues.push(admin_response);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    updateValues.push(id);

    const result = await db.run(
      `UPDATE ceo_questions SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    await db.close();

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Question updated successfully'
    });

  } catch (error) {
    console.error('Error updating CEO question:', error);
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    );
  }
}