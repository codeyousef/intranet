// app/api/newsletter-archive/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * Newsletter Archive API Route
 * 
 * This API route returns the HTML content of a newsletter archive file.
 */
// Newsletter API temporarily disabled while troubleshooting Viva Engage
export async function GET(request: NextRequest) {
  console.log('Newsletter archive API is temporarily disabled while troubleshooting Viva Engage');

  return NextResponse.json({
    success: false,
    disabled: true,
    message: 'Newsletter functionality is temporarily disabled while troubleshooting Viva Engage',
  }, { status: 503 }) // 503 Service Unavailable
}
