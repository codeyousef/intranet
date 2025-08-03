import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const requestId = `test-newsletter-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  console.log(`[TEST-NEWSLETTER-FIX] Test started [${requestId}]`);

  try {
    // Check authentication
    const session = await getAuthSession();
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        details: 'Please sign in to run this test'
      }, { status: 401 });
    }

    console.log(`[TEST-NEWSLETTER-FIX] Authenticated as ${session.user?.email} [${requestId}]`);

    // Test the newsletter API
    console.log(`[TEST-NEWSLETTER-FIX] Fetching from newsletter API [${requestId}]`);
    const response = await fetch(new URL('/api/sharepoint/newsletter-list', request.url).toString(), {
      headers: {
        'Cookie': request.headers.get('cookie') || ''
      }
    });

    console.log(`[TEST-NEWSLETTER-FIX] Newsletter API response status: ${response.status} [${requestId}]`);
    
    const data = await response.json();
    
    // Check if the response was successful
    if (data.success && data.newsletter && data.newsletter.content) {
      console.log(`[TEST-NEWSLETTER-FIX] Newsletter fetch successful [${requestId}]`);
      console.log(`[TEST-NEWSLETTER-FIX] Content length: ${data.newsletter.content.length} [${requestId}]`);
      console.log(`[TEST-NEWSLETTER-FIX] Source: ${data.newsletter.source} [${requestId}]`);
      
      return NextResponse.json({
        success: true,
        message: 'Newsletter API is working correctly',
        details: {
          contentLength: data.newsletter.content.length,
          source: data.newsletter.source,
          lastUpdated: data.newsletter.lastUpdated,
          cached: data.newsletter.cached || false
        },
        requestId
      });
    } else {
      console.error(`[TEST-NEWSLETTER-FIX] Newsletter fetch failed [${requestId}]`);
      console.error(`[TEST-NEWSLETTER-FIX] Error: ${data.error || 'Unknown error'} [${requestId}]`);
      
      return NextResponse.json({
        success: false,
        message: 'Newsletter API returned an error',
        error: data.error || 'Unknown error',
        details: data,
        requestId
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error(`[TEST-NEWSLETTER-FIX] Test failed [${requestId}]`, error);
    
    return NextResponse.json({
      success: false,
      message: 'Test failed with an exception',
      error: error.message,
      stack: error.stack,
      requestId
    }, { status: 500 });
  }
}