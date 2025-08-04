import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

// Cache for newsletter content
let cache: {
  content?: string;
  timestamp?: number;
  etag?: string;
} = {};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

async function getGraphToken() {
  const tokenUrl = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.AZURE_AD_CLIENT_ID!,
      client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get Graph token');
  }

  const data = await response.json();
  return data.access_token;
}

export async function GET(request: NextRequest) {
  const requestId = `newsletter-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  // Use request ID from test header if available
  const testRequestId = request.headers.get('X-Test-Request-ID');
  if (testRequestId) {
    console.log(`[NEWSLETTER-LIST] Request started with test request ID [${testRequestId}]`);
  } else {
    console.log(`[NEWSLETTER-LIST] Request started [${requestId}]`);
  }

  // Use the test request ID if available, otherwise use the generated one
  const effectiveRequestId = testRequestId || requestId;

  // 🚨 ULTRA-CRITICAL DEBUGGING - Log everything at the start
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] API ENTRY POINT - ${new Date().toISOString()}`);
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] Request ID: ${effectiveRequestId}`);
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] Method: ${request.method}`);
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] URL: ${request.url}`);
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] User-Agent: ${request.headers.get('user-agent')}`);
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] Authorization: ${request.headers.get('authorization') ? 'Present' : 'Missing'}`);
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] Environment: ${process.env.NODE_ENV}`);
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] SharePoint Site: ${process.env.SHAREPOINT_SITE_URL || 'Not configured'}`);
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] SharePoint Client ID: ${process.env.SHAREPOINT_CLIENT_ID ? 'Present' : 'Missing'}`);
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] Timestamp: ${new Date().toISOString()}`);

  // Log comprehensive request details
  console.log(`🔍 [NEWSLETTER-API-DEBUG] Request Details [${effectiveRequestId}]`, {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    timestamp: new Date().toISOString(),
    headers: {
      authorization: request.headers.get('authorization') ? 'Present' : 'Missing',
      contentType: request.headers.get('content-type'),
      accept: request.headers.get('accept'),
      cookie: request.headers.get('cookie') ? 'Present' : 'Missing'
    }
  });

  try {
    console.log(`🔐 [NEWSLETTER-API-DEBUG] Starting authentication check [${effectiveRequestId}]`);
    const session = await getAuthSession();
    if (!session) {
      console.error(`❌ [NEWSLETTER-API-DEBUG] Authentication failed - no session [${effectiveRequestId}]`);
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    console.log(`✅ [NEWSLETTER-API-DEBUG] Authentication successful [${effectiveRequestId}]`, {
      userEmail: session.user?.email || 'unknown',
      userName: session.user?.name || 'unknown',
      sessionExpires: session.expires || 'unknown'
    });

    // Get test parameters from query string
    const searchParams = new URL(request.url).searchParams;
    const simulateNotFound = searchParams.get('simulate_not_found') === 'true';
    const simulatePermissionError = searchParams.get('simulate_permission_error') === 'true';
    const simulateNetworkError = searchParams.get('simulate_network_error') === 'true';
    const simulateHtmlError = searchParams.get('simulate_html_error') === 'true';
    const forceFetch = searchParams.get('force_fetch') === 'true';
    const clearCache = searchParams.get('clear_cache') === 'true';

    // Log comprehensive query parameters
    console.log(`📋 [NEWSLETTER-API-DEBUG] Query Parameters [${effectiveRequestId}]`, {
      simulateNotFound,
      simulatePermissionError,
      simulateNetworkError,
      simulateHtmlError,
      forceFetch,
      clearCache,
      allParams: Object.fromEntries(searchParams.entries())
    });

    // Log if we're in test mode
    if (simulateNotFound || simulatePermissionError || simulateNetworkError || simulateHtmlError) {
      console.log(`⚠️ [NEWSLETTER-API-DEBUG] Running in test mode with simulated conditions [${effectiveRequestId}]`);
    }

    // Check cache
    const now = Date.now();
    const cacheAge = cache.timestamp ? now - cache.timestamp : null;
    const isCacheValid = cache.content && cache.timestamp && (cacheAge! < CACHE_DURATION);
    const shouldUseCacheAnyway = isCacheValid && !forceFetch && !clearCache;

    console.log(`💾 [NEWSLETTER-API-DEBUG] Cache Status Check [${effectiveRequestId}]`, {
      hasCachedContent: !!cache.content,
      cacheTimestamp: cache.timestamp ? new Date(cache.timestamp).toISOString() : 'none',
      cacheAge: cacheAge ? `${Math.round(cacheAge / 1000)} seconds` : 'none',
      cacheDuration: `${CACHE_DURATION / 1000} seconds`,
      isCacheValid,
      forceFetch,
      clearCache,
      shouldUseCacheAnyway
    });

    if (clearCache && cache.content) {
      console.log(`🗑️ [NEWSLETTER-API-DEBUG] Clearing cache as requested [${effectiveRequestId}]`);
      cache = {};
    }

    if (shouldUseCacheAnyway) {
      console.log(`✅ [NEWSLETTER-API-DEBUG] Returning cached content [${effectiveRequestId}]`, {
        contentLength: cache.content?.length || 0,
        cacheAge: `${Math.round(cacheAge! / 1000)} seconds`
      });
      return NextResponse.json({
        success: true,
        newsletter: {
          title: 'CEO Newsletter',
          content: cache.content,
          lastUpdated: new Date(cache.timestamp!).toISOString(),
          source: 'SharePoint (cached)',
          cached: true
        }
      });
    }

    console.log(`🔄 [NEWSLETTER-API-DEBUG] Cache miss or forced fetch, fetching from SharePoint [${effectiveRequestId}]`, {
      reason: !cache.content ? 'no cached content' : 
              !cache.timestamp ? 'no cache timestamp' : 
              cacheAge! >= CACHE_DURATION ? 'cache expired' : 
              forceFetch ? 'force fetch requested' : 
              clearCache ? 'cache cleared' : 'unknown'
    });

    // Get Graph API token
    const graphToken = await getGraphToken();

    // First, get the site ID
    const siteUrl = 'https://graph.microsoft.com/v1.0/sites/flyadeal.sharepoint.com:/sites/Thelounge';
    const siteResponse = await fetch(siteUrl, {
      headers: {
        'Authorization': `Bearer ${graphToken}`,
        'Accept': 'application/json'
      }
    });

    if (!siteResponse.ok) {
      throw new Error(`Failed to get site: ${siteResponse.status}`);
    }

    const siteData = await siteResponse.json();
    const siteId = siteData.id;
    console.log(`[NEWSLETTER-LIST] Site ID: ${siteId} [${effectiveRequestId}]`);

    // Get the CEO Newsletter list
    const listsUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists`;
    const listsResponse = await fetch(listsUrl, {
      headers: {
        'Authorization': `Bearer ${graphToken}`,
        'Accept': 'application/json'
      }
    });

    if (!listsResponse.ok) {
      throw new Error(`Failed to get lists: ${listsResponse.status}`);
    }

    const listsData = await listsResponse.json();
    
    // Find the CEO Newsletter list
    const newsletterList = listsData.value.find((list: any) => 
      list.displayName === 'CEO Newsletter' || 
      list.name === 'CEO Newsletter' ||
      list.displayName === 'CEO%20Newsletter'
    );

    if (!newsletterList) {
      console.log('[NEWSLETTER-LIST] Available lists:', listsData.value.map((l: any) => l.displayName));
      throw new Error('CEO Newsletter list not found');
    }

    console.log(`[NEWSLETTER-LIST] Found newsletter list: ${newsletterList.id} [${effectiveRequestId}]`);

    // Get items from the CEO Newsletter list
    const itemsUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${newsletterList.id}/items?$expand=fields&$orderby=fields/Modified desc&$top=10`;
    const itemsResponse = await fetch(itemsUrl, {
      headers: {
        'Authorization': `Bearer ${graphToken}`,
        'Accept': 'application/json'
      }
    });

    if (!itemsResponse.ok) {
      const errorText = await itemsResponse.text();
      console.error(`[NEWSLETTER-LIST] Failed to get items: ${errorText} [${effectiveRequestId}]`);
      throw new Error(`Failed to get list items: ${itemsResponse.status}`);
    }

    const itemsData = await itemsResponse.json();
    console.log(`[NEWSLETTER-LIST] Found ${itemsData.value.length} items [${effectiveRequestId}]`);

    // Look for the latest newsletter item
    let newsletterContent = '';
    let newsletterItem = null;

    // Try to find 'last-newsletter.html' or similar
    for (const item of itemsData.value) {
      const fields = item.fields || {};
      const fileName = fields.FileLeafRef || fields.Title || '';
      
      console.log(`[NEWSLETTER-LIST] Checking item: ${fileName} [${effectiveRequestId}]`);
      
      if (fileName.toLowerCase().includes('last-newsletter') || 
          fileName.toLowerCase().includes('newsletter')) {
        newsletterItem = item;
        break;
      }
    }

    // If no specific newsletter found, get the first item
    if (!newsletterItem && itemsData.value.length > 0) {
      newsletterItem = itemsData.value[0];
    }

    if (newsletterItem) {
      // Get the file content
      const driveItemId = newsletterItem.id;
      const fileUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${newsletterList.id}/items/${driveItemId}/driveItem/content`;
      
      console.log(`[NEWSLETTER-LIST] Fetching file content [${effectiveRequestId}]`);
      
      const fileResponse = await fetch(fileUrl, {
        headers: {
          'Authorization': `Bearer ${graphToken}`,
          'Accept': 'text/html, text/plain, */*'
        }
      });

      if (fileResponse.ok) {
        newsletterContent = await fileResponse.text();
        console.log(`[NEWSLETTER-LIST] Successfully fetched content, length: ${newsletterContent.length} [${effectiveRequestId}]`);
      } else {
        // Try alternate approach - get webUrl and fetch directly
        const webUrl = newsletterItem.webUrl || newsletterItem.fields?.FileRef;
        if (webUrl) {
          console.log(`[NEWSLETTER-LIST] Trying direct fetch from: ${webUrl} [${effectiveRequestId}]`);
          
          // Try with user token
          const directResponse = await fetch(webUrl, {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'text/html'
            }
          });

          if (directResponse.ok) {
            newsletterContent = await directResponse.text();
          }
        }
      }
    }

    if (!newsletterContent) {
      throw new Error('No newsletter content found in the list');
    }

    // Clean up the HTML
    console.log(`[NEWSLETTER-LIST] Original content preview: ${newsletterContent.substring(0, 500)} [${effectiveRequestId}]`);
    
    // Fix malformed HTML at the beginning - handle incomplete opening tags
    // The content appears to start with an incomplete <td> tag followed by <html>
    let cleanedContent = newsletterContent;
    
    // Remove any incomplete opening tags at the beginning
    cleanedContent = cleanedContent.replace(/^[^<]*<[^>]*(?<!>)[^<]*<html/i, '<html');
    
    // If it still doesn't start with proper HTML, find the first complete HTML structure
    if (!cleanedContent.trim().startsWith('<html') && !cleanedContent.trim().startsWith('<!DOCTYPE')) {
      const htmlMatch = cleanedContent.match(/<html[\s\S]*$/i);
      if (htmlMatch) {
        cleanedContent = htmlMatch[0];
      }
    }
    
    // HTML entity decoding
    cleanedContent = cleanedContent.replace(/&quot;/g, '"');
    cleanedContent = cleanedContent.replace(/&lt;/g, '<');
    cleanedContent = cleanedContent.replace(/&gt;/g, '>');
    cleanedContent = cleanedContent.replace(/&amp;/g, '&');
    cleanedContent = cleanedContent.replace(/&nbsp;/g, ' ');
    cleanedContent = cleanedContent.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
    cleanedContent = cleanedContent.replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
    
    // Fix the specific issue where normal text is being treated as HTML attributes
    // This appears to be caused by malformed HTML where quotes are missing around attribute values
    // Pattern: word="" should become just word (remove the empty attribute)
    cleanedContent = cleanedContent.replace(/(\w+)=""/g, '$1');
    
    // Also fix cases where there might be malformed attributes in the middle of text
    // Pattern: word - word="" - word should become word - word - word
    cleanedContent = cleanedContent.replace(/(\w+)=""(\s*[-–]\s*)/g, '$1$2');
    
    // Fix any remaining malformed attribute patterns that might appear in text content
    cleanedContent = cleanedContent.replace(/([a-zA-Z]+)=""\s+/g, '$1 ');
    
    // Remove scripts and styles
    cleanedContent = cleanedContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    cleanedContent = cleanedContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Extract body content if present
    const bodyMatch = cleanedContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      cleanedContent = bodyMatch[1];
    }
    
    // Fix common HTML structure issues from SharePoint
    // Remove any remaining malformed opening tags
    cleanedContent = cleanedContent.replace(/^[^<]*<[^>]*(?<!>)(?=<)/g, '');
    
    // Ensure the content starts cleanly
    cleanedContent = cleanedContent.trim();
    
    newsletterContent = cleanedContent;
    
    console.log(`[NEWSLETTER-LIST] Cleaned content preview: ${newsletterContent.substring(0, 500)} [${effectiveRequestId}]`);

    console.log(`🎉 [NEWSLETTER-API-DEBUG] Successfully fetched newsletter content [${effectiveRequestId}]`, {
      contentLength: newsletterContent.length,
        contentType: newsletterContent.includes('<!DOCTYPE') || newsletterContent.includes('<html') ? 'Full HTML Document' : 'HTML Fragment',
        hasImages: newsletterContent.includes('<img'),
        hasTables: newsletterContent.includes('<table'),
        hasStyles: newsletterContent.includes('<style') || newsletterContent.includes('style='),
        hasScripts: newsletterContent.includes('<script'),
        contentPreview: newsletterContent.substring(0, 300).replace(/\s+/g, ' ').trim()
    });

    // Update cache
    cache = {
      content: newsletterContent,
      timestamp: Date.now()
    };

    return NextResponse.json({
      success: true,
      newsletter: {
        title: 'CEO Newsletter',
        content: newsletterContent,
        lastUpdated: new Date().toISOString(),
        source: 'SharePoint List (fresh)',
        cached: false
      }
    });

  } catch (error: any) {
    console.error(`❌ [NEWSLETTER-LIST] Error fetching newsletter [${effectiveRequestId}]:`, error);

    // If we have cached content (even if expired), return it
    if (cache.content) {
      console.log(`🔄 [NEWSLETTER-LIST] Returning expired cache due to error [${effectiveRequestId}]`);
      return NextResponse.json({
        success: true,
        newsletter: {
          title: 'CEO Newsletter',
          content: cache.content,
          lastUpdated: cache.timestamp ? new Date(cache.timestamp).toISOString() : new Date().toISOString(),
          source: 'SharePoint List (expired cache)',
          cached: true,
          warning: 'Unable to fetch latest newsletter, showing previous version'
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: error.message,
      errorType: 'general',
      details: 'Failed to fetch newsletter from SharePoint List',
      fallbackContent: {
        title: 'Newsletter Update',
        content: `
          <div style="padding: 20px; text-align: center; background: #f9f9f9; border-radius: 8px; font-family: Arial, sans-serif;">
            <h2 style="color: #00539f; margin-bottom: 20px;">Newsletter Temporarily Unavailable</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 15px;">
              We're currently experiencing issues accessing the newsletter. Please try again later.
            </p>
            <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
              Error: ${error.message}
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Request ID: ${effectiveRequestId}
            </p>
          </div>
        `,
        lastUpdated: new Date().toISOString(),
        source: 'system',
        isFallback: true,
        fallbackReason: error.message
      }
    });
  }
}
