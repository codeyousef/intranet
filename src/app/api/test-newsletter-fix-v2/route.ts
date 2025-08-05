import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const requestId = `test-newsletter-v2-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  console.log(`[TEST-NEWSLETTER-FIX-V2] Test started [${requestId}]`);

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

    console.log(`[TEST-NEWSLETTER-FIX-V2] Authenticated as ${session.user?.email} [${requestId}]`);

    // Get test parameters from query string
    const searchParams = new URL(request.url).searchParams;
    const testCase = searchParams.get('test') || 'default';
    const forceFetch = searchParams.get('force') === 'true';
    const clearCache = searchParams.get('clear_cache') === 'true';

    console.log(`[TEST-NEWSLETTER-FIX-V2] Running test case: ${testCase} [${requestId}]`);
    console.log(`[TEST-NEWSLETTER-FIX-V2] Force fetch: ${forceFetch}, Clear cache: ${clearCache} [${requestId}]`);

    // Build the URL with appropriate query parameters
    let testUrl = new URL('/api/sharepoint/newsletter-list', request.url);
    
    if (forceFetch) {
      testUrl.searchParams.set('force_fetch', 'true');
    }
    
    if (clearCache) {
      testUrl.searchParams.set('clear_cache', 'true');
    }

    // Add test-specific parameters
    if (testCase === 'not-found') {
      testUrl.searchParams.set('simulate_not_found', 'true');
    } else if (testCase === 'permission-error') {
      testUrl.searchParams.set('simulate_permission_error', 'true');
    } else if (testCase === 'network-error') {
      testUrl.searchParams.set('simulate_network_error', 'true');
    } else if (testCase === 'html-error') {
      testUrl.searchParams.set('simulate_html_error', 'true');
    }

    console.log(`[TEST-NEWSLETTER-FIX-V2] Fetching from: ${testUrl.toString()} [${requestId}]`);

    // Test the newsletter API
    const response = await fetch(testUrl.toString(), {
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'X-Test-Request-ID': requestId
      }
    });

    console.log(`[TEST-NEWSLETTER-FIX-V2] Newsletter API response status: ${response.status} [${requestId}]`);
    
    const data = await response.json();
    
    // Check if the response was successful
    if (data.success) {
      console.log(`[TEST-NEWSLETTER-FIX-V2] Newsletter fetch successful [${requestId}]`);
      
      const newsletterInfo = {
        title: data.newsletter?.title || 'No title',
        contentLength: data.newsletter?.content?.length || 0,
        source: data.newsletter?.source || 'unknown',
        isFallback: data.newsletter?.isFallback || false,
        fallbackReason: data.newsletter?.fallbackReason || 'none',
        errorType: data.newsletter?.errorType || 'none'
      };
      
      console.log(`[TEST-NEWSLETTER-FIX-V2] Newsletter info: ${JSON.stringify(newsletterInfo)} [${requestId}]`);
      
      return NextResponse.json({
        success: true,
        message: 'Newsletter API test completed successfully',
        testCase,
        newsletterInfo,
        requestId
      });
    } else {
      console.error(`[TEST-NEWSLETTER-FIX-V2] Newsletter fetch failed [${requestId}]`);
      console.error(`[TEST-NEWSLETTER-FIX-V2] Error: ${data.error || 'Unknown error'} [${requestId}]`);
      
      return NextResponse.json({
        success: false,
        message: 'Newsletter API returned an error',
        error: data.error || 'Unknown error',
        details: data,
        testCase,
        requestId
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error(`[TEST-NEWSLETTER-FIX-V2] Test failed [${requestId}]`, error);
    
    return NextResponse.json({
      success: false,
      message: 'Test failed with an exception',
      error: error.message,
      stack: error.stack,
      requestId
    }, { status: 500 });
  }
}