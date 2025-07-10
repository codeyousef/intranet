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
  console.log(`[NEWSLETTER-LIST] Request started [${requestId}]`);

  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Check cache
    const now = Date.now();
    if (cache.content && cache.timestamp && (now - cache.timestamp < CACHE_DURATION)) {
      console.log(`[NEWSLETTER-LIST] Returning cached content [${requestId}]`);
      return NextResponse.json({
        success: true,
        newsletter: {
          title: 'CEO Newsletter',
          content: cache.content,
          lastUpdated: new Date(cache.timestamp).toISOString(),
          source: 'SharePoint List (cached)',
          cached: true
        }
      });
    }

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
    console.log(`[NEWSLETTER-LIST] Site ID: ${siteId} [${requestId}]`);

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

    console.log(`[NEWSLETTER-LIST] Found newsletter list: ${newsletterList.id} [${requestId}]`);

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
      console.error(`[NEWSLETTER-LIST] Failed to get items: ${errorText} [${requestId}]`);
      throw new Error(`Failed to get list items: ${itemsResponse.status}`);
    }

    const itemsData = await itemsResponse.json();
    console.log(`[NEWSLETTER-LIST] Found ${itemsData.value.length} items [${requestId}]`);

    // Look for the latest newsletter item
    let newsletterContent = '';
    let newsletterItem = null;

    // Try to find 'last-newsletter.html' or similar
    for (const item of itemsData.value) {
      const fields = item.fields || {};
      const fileName = fields.FileLeafRef || fields.Title || '';
      
      console.log(`[NEWSLETTER-LIST] Checking item: ${fileName} [${requestId}]`);
      
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
      
      console.log(`[NEWSLETTER-LIST] Fetching file content [${requestId}]`);
      
      const fileResponse = await fetch(fileUrl, {
        headers: {
          'Authorization': `Bearer ${graphToken}`,
          'Accept': 'text/html, text/plain, */*'
        }
      });

      if (fileResponse.ok) {
        newsletterContent = await fileResponse.text();
        console.log(`[NEWSLETTER-LIST] Successfully fetched content, length: ${newsletterContent.length} [${requestId}]`);
      } else {
        // Try alternate approach - get webUrl and fetch directly
        const webUrl = newsletterItem.webUrl || newsletterItem.fields?.FileRef;
        if (webUrl) {
          console.log(`[NEWSLETTER-LIST] Trying direct fetch from: ${webUrl} [${requestId}]`);
          
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
    newsletterContent = newsletterContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    newsletterContent = newsletterContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    const bodyMatch = newsletterContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      newsletterContent = bodyMatch[1];
    }

    // No need for wrapper div - we'll handle responsive styling with CSS

    // More aggressive processing for mobile compatibility
    // Remove fixed widths from all elements
    newsletterContent = newsletterContent.replace(/width:\s*\d+px/gi, 'width: 100%');
    newsletterContent = newsletterContent.replace(/width="?\d+"?/gi, 'width="100%"');
    newsletterContent = newsletterContent.replace(/min-width:\s*\d+px/gi, 'min-width: 0');
    
    // Fix tables specifically
    newsletterContent = newsletterContent.replace(/<table([^>]*)>/gi, '<table$1 style="width: 100% !important; table-layout: fixed !important;">');
    
    // Fix images
    newsletterContent = newsletterContent.replace(/<img([^>]*?)>/gi, (match, attributes) => {
      // Remove width attribute and add responsive styling
      const cleanedAttrs = attributes.replace(/width="?\d+"?/gi, '');
      return `<img${cleanedAttrs} style="max-width: 100%; height: auto;">`;
    });
    
    // Trim any whitespace
    newsletterContent = newsletterContent.trim();
    
    // More aggressive removal of empty elements at the start
    let previousLength;
    do {
      previousLength = newsletterContent.length;
      
      // Remove empty paragraphs, divs, spans, and any whitespace at the start
      newsletterContent = newsletterContent.replace(/^(\s*<p[^>]*>(\s|&nbsp;|<br[^>]*>)*<\/p>\s*)+/gi, '');
      newsletterContent = newsletterContent.replace(/^(\s*<div[^>]*>(\s|&nbsp;|<br[^>]*>)*<\/div>\s*)+/gi, '');
      newsletterContent = newsletterContent.replace(/^(\s*<span[^>]*>(\s|&nbsp;)*<\/span>\s*)+/gi, '');
      newsletterContent = newsletterContent.replace(/^(\s*<br[^>]*>\s*)+/gi, '');
      newsletterContent = newsletterContent.replace(/^(\s|&nbsp;)+/gi, '');
      
      // Remove any element that contains only whitespace or nbsp at the start
      newsletterContent = newsletterContent.replace(/^<([^>]+)>(\s|&nbsp;|<br[^>]*>)*<\/\1>\s*/gi, '');
      
      // Also remove common SharePoint empty containers
      newsletterContent = newsletterContent.replace(/^<div[^>]*class="[^"]*ExternalClass[^"]*"[^>]*>(\s|&nbsp;)*<\/div>\s*/gi, '');
      newsletterContent = newsletterContent.replace(/^<div[^>]*style="[^"]*"[^>]*>(\s|&nbsp;)*<\/div>\s*/gi, '');
      
      // Remove empty table cells that might be at the start
      newsletterContent = newsletterContent.replace(/^<td[^>]*>(\s|&nbsp;|<br[^>]*>)*<\/td>\s*/gi, '');
      newsletterContent = newsletterContent.replace(/^<tr[^>]*>(\s*<td[^>]*>(\s|&nbsp;)*<\/td>\s*)*<\/tr>\s*/gi, '');
      
    } while (newsletterContent.length < previousLength); // Keep removing until no more changes
    
    // Add inline style to first actual element to ensure no gap
    newsletterContent = newsletterContent.replace(/^<([^>]+)/, (match, tag) => {
      // Check if it already has a style attribute
      if (tag.includes('style=')) {
        return match.replace(/style="([^"]*)"/, 'style="$1; margin-top: 0 !important; padding-top: 0 !important;"');
      } else {
        return `<${tag} style="margin-top: 0 !important; padding-top: 0 !important;"`;
      }
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
        source: 'SharePoint List',
        cached: false
      }
    });

  } catch (error: any) {
    console.error(`[NEWSLETTER-LIST] Error: ${error.message} [${requestId}]`);
    
    // Return cached content if available
    if (cache.content) {
      return NextResponse.json({
        success: true,
        newsletter: {
          title: 'CEO Newsletter',
          content: cache.content,
          lastUpdated: cache.timestamp ? new Date(cache.timestamp).toISOString() : new Date().toISOString(),
          source: 'SharePoint List (expired cache)',
          cached: true,
          warning: 'Using cached version due to error'
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: error.message,
      newsletter: {
        title: 'Newsletter Unavailable',
        content: `
          <div style="padding: 40px; text-align: center; background: #f5f5f5; border-radius: 8px;">
            <h2 style="color: #00539f;">CEO Newsletter</h2>
            <p style="color: #666;">The newsletter is temporarily unavailable.</p>
            <p style="color: #999; font-size: 14px; margin-top: 20px;">
              Error: ${error.message}<br>
              Request ID: ${requestId}
            </p>
          </div>
        `,
        lastUpdated: new Date().toISOString(),
        source: 'error'
      }
    });
  }
}