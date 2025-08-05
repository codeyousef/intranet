// VIVA ENGAGE FUNCTIONALITY - CURRENTLY DISABLED
// This route is disabled as Viva Engage functionality is not currently in use

import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Viva Engage functionality is currently disabled' 
  }, { 
    status: 503 
  });
}

export async function POST() {
  return NextResponse.json({ 
    message: 'Viva Engage functionality is currently disabled' 
  }, { 
    status: 503 
  });
}