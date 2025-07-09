import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

export async function GET() {
  try {
    // Open the database
    const db = await open({
      filename: path.resolve(process.cwd(), 'mazaya.db'),
      driver: sqlite3.Database
    });

    // Get today's date in MM-DD format (ignoring year for birthday comparison)
    const today = new Date();
    const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Get tomorrow's date
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowMonthDay = `${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    // Query for birthdays today
    const birthdays = await db.all(`
      SELECT name, date, years 
      FROM celebrations 
      WHERE type = 'birthday' AND date = ?
      ORDER BY name
    `, todayMonthDay);

    // Query for work anniversaries today
    const anniversaries = await db.all(`
      SELECT name, date, years
      FROM celebrations 
      WHERE type = 'anniversary' AND date = ?
      ORDER BY years DESC, name
    `, todayMonthDay);

    // Query for birthdays tomorrow
    const tomorrowBirthdays = await db.all(`
      SELECT name, date, years 
      FROM celebrations 
      WHERE type = 'birthday' AND date = ?
      ORDER BY name
    `, tomorrowMonthDay);

    // Query for work anniversaries tomorrow
    const tomorrowAnniversaries = await db.all(`
      SELECT name, date, years
      FROM celebrations 
      WHERE type = 'anniversary' AND date = ?
      ORDER BY years DESC, name
    `, tomorrowMonthDay);

    // Close the database
    await db.close();

    // Return the results
    return NextResponse.json({
      birthdays: birthdays.length > 0 ? birthdays : null,
      anniversaries: anniversaries.length > 0 ? anniversaries : null,
      tomorrowBirthdays: tomorrowBirthdays.length > 0 ? tomorrowBirthdays : null,
      tomorrowAnniversaries: tomorrowAnniversaries.length > 0 ? tomorrowAnniversaries : null
    });
  } catch (error) {
    console.error('Error fetching celebrations data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch celebrations data' },
      { status: 500 }
    );
  }
}
