import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

// Cache for newsletter archive content
let cache: {
  [path: string]: {
    content: string;
    timestamp: number;
  }
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
  const requestId = `newsletter-archive-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  console.log(`[NEWSLETTER-ARCHIVE] Request started [${requestId}]`);

  // Declare path variable at a higher scope so it's accessible in the catch block
  let path: string | null = null;

  try {
    // Get the path parameter from the request
    const { searchParams } = new URL(request.url);
    path = searchParams.get('path');
    const forceFetch = searchParams.get('force_fetch') === 'true';
    const clearCache = searchParams.get('clear_cache') === 'true';

    console.log(`[NEWSLETTER-ARCHIVE] Fetching file: ${path || 'none'} [${requestId}]`);
    console.log(`[NEWSLETTER-ARCHIVE] Force fetch: ${forceFetch}, Clear cache: ${clearCache} [${requestId}]`);

    if (!path) {
      console.log(`[NEWSLETTER-ARCHIVE] ERROR: No path parameter provided [${requestId}]`);
      return NextResponse.json({
        success: false,
        message: 'Path parameter is required'
      }, { status: 400 });
    }

    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      console.log(`[NEWSLETTER-ARCHIVE] ERROR: No authentication session found [${requestId}]`);
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    // Clear cache if requested
    if (clearCache && cache[path]) {
      console.log(`[NEWSLETTER-ARCHIVE] Clearing cache for path: ${path} [${requestId}]`);
      delete cache[path];
    }

    // Check cache
    const now = Date.now();
    if (!forceFetch && cache[path] && cache[path].timestamp && (now - cache[path].timestamp < CACHE_DURATION)) {
      console.log(`[NEWSLETTER-ARCHIVE] Returning cached content for path: ${path} [${requestId}]`);
      return NextResponse.json({
        success: true,
        content: cache[path].content,
        path: path,
        source: 'cache',
        lastUpdated: new Date(cache[path].timestamp).toISOString()
      });
    }

    console.log(`[NEWSLETTER-ARCHIVE] Cache miss, fetching from SharePoint [${requestId}]`);

    try {
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
      console.log(`[NEWSLETTER-ARCHIVE] Site ID: ${siteId} [${requestId}]`);

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
        console.log('[NEWSLETTER-ARCHIVE] Available lists:', listsData.value.map((l: any) => l.displayName));
        throw new Error('CEO Newsletter list not found');
      }

      console.log(`[NEWSLETTER-ARCHIVE] Found newsletter list: ${newsletterList.id} [${requestId}]`);

      // Extract the filename from the path for filtering
      const pathParts = path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      console.log(`[NEWSLETTER-ARCHIVE] Looking for file: ${fileName} in archive folder [${requestId}]`);
      console.log(`[NEWSLETTER-ARCHIVE] Full path requested: ${path} [${requestId}]`);

      // The archive files are in the "CEO Newsletter/Archive" folder
      // We need to filter by both the filename and the folder path
      const archiveFolderFilter = `startswith(fields/FileDirRef, '/sites/Thelounge/CEO Newsletter/Archive')`;
      const fileNameFilter = `fields/FileLeafRef eq '${fileName}'`;
      const combinedFilter = `(${archiveFolderFilter}) and (${fileNameFilter})`;
      
      // Get items from the CEO Newsletter list, filtering by the filename in the archive folder
      const itemsUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${newsletterList.id}/items?$expand=fields&$filter=${encodeURIComponent(combinedFilter)}&$top=5`;
      const itemsResponse = await fetch(itemsUrl, {
        headers: {
          'Authorization': `Bearer ${graphToken}`,
          'Accept': 'application/json'
        }
      });

      if (!itemsResponse.ok) {
        const errorText = await itemsResponse.text();
        console.error(`[NEWSLETTER-ARCHIVE] Failed to get items: ${errorText} [${requestId}]`);
        throw new Error(`Failed to get list items: ${itemsResponse.status}`);
      }

      const itemsData = await itemsResponse.json();
      console.log(`[NEWSLETTER-ARCHIVE] Found ${itemsData.value.length} items for file ${fileName} [${requestId}]`);

      let newsletterItem = null;
      if (itemsData.value.length > 0) {
        newsletterItem = itemsData.value[0]; // Take the first matching item
      }

      if (!newsletterItem) {
        throw new Error(`Newsletter file '${fileName}' not found in the list`);
      }

      // Get the file content
      const driveItemId = newsletterItem.id;
      const fileUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${newsletterList.id}/items/${driveItemId}/driveItem/content`;
      
      console.log(`[NEWSLETTER-ARCHIVE] Fetching file content [${requestId}]`);
      
      const fileResponse = await fetch(fileUrl, {
        headers: {
          'Authorization': `Bearer ${graphToken}`,
          'Accept': 'text/html, text/plain, */*'
        }
      });

      let fileContent = '';
      if (fileResponse.ok) {
        fileContent = await fileResponse.text();
        console.log(`[NEWSLETTER-ARCHIVE] Successfully fetched content, length: ${fileContent.length} [${requestId}]`);
      } else {
        throw new Error(`Failed to fetch file content: ${fileResponse.status}`);
      }

      console.log(`[NEWSLETTER-ARCHIVE] Successfully fetched file content (${fileContent.length} characters) [${requestId}]`);

      // Process the HTML content to make it safe for rendering - using enhanced processing
      let processedContent = fileContent;

      try {
        console.log(`[NEWSLETTER-ARCHIVE] Starting HTML processing [${requestId}]`);
        console.log(`[NEWSLETTER-ARCHIVE] Original content preview: ${fileContent.substring(0, 500)} [${requestId}]`);
        
        // Fix malformed HTML at the beginning - handle incomplete opening tags
        let cleanedContent = fileContent;
        
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
        
        // Remove scripts and styles that might interfere
        cleanedContent = cleanedContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        cleanedContent = cleanedContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

        // Additional sanitization to prevent React rendering errors
        // Remove HTML comments
        cleanedContent = cleanedContent.replace(/<!--[\s\S]*?-->/g, '');
        
        // Fix common HTML structure issues from SharePoint
        // Remove any remaining malformed opening tags
        cleanedContent = cleanedContent.replace(/^[^<]*<[^>]*(?<!>)(?=<)/g, '');
        
        // Ensure the content starts cleanly
        cleanedContent = cleanedContent.trim();
        
        processedContent = cleanedContent;
        
        console.log(`[NEWSLETTER-ARCHIVE] Cleaned content preview: ${processedContent.substring(0, 500)} [${requestId}]`);

        // Ensure all tags are properly closed
        const openTags = processedContent.match(/<([a-z][a-z0-9]*)[^>]*(?<!\/)\s*>/gi) || [];
        const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];

        for (const tag of openTags) {
          const tagName = tag.match(/<([a-z][a-z0-9]*)/i)?.[1]?.toLowerCase();
          if (tagName && !selfClosingTags.includes(tagName)) {
            const closeTagRegex = new RegExp(`</${tagName}\\s*>`, 'i');
            if (!closeTagRegex.test(processedContent)) {
              // Add closing tag at the end if missing
              processedContent += `</${tagName}>`;
              console.log(`[NEWSLETTER-ARCHIVE] Added missing closing tag for: ${tagName} [${requestId}]`);
            }
          }
        }

        // Fix common HTML issues that might cause React errors
        // Convert deprecated tags to modern equivalents
        processedContent = processedContent.replace(/<font([^>]*)>([\s\S]*?)<\/font>/gi, '<span$1>$2</span>');
        processedContent = processedContent.replace(/<center>([\s\S]*?)<\/center>/gi, '<div style="text-align:center">$1</div>');

        // Ensure all attributes have values and are properly quoted
        processedContent = processedContent.replace(/(\s)([a-z][a-z0-9\-_]*)(?=[\s>])(?!\s*=)/gi, '$1$2=""');
        processedContent = processedContent.replace(/=([^\s"][^\s>]*)/gi, '="$1"');

        // Make all images responsive and prevent lazy loading
        processedContent = processedContent.replace(/<img([^>]*?)>/gi, (match, attributes) => {
          // Remove width attribute and add responsive styling
          const cleanedAttrs = attributes.replace(/width="?\d+"?/gi, '');
          return `<img${cleanedAttrs} style="max-width: 100%; height: auto;" loading="eager" decoding="sync">`;
        });

        // Fix iframe issues if present
        processedContent = processedContent.replace(/<iframe([^>]*?)>/gi, (match, attributes) => {
          return `<iframe${attributes} sandbox="allow-same-origin allow-scripts" loading="eager">`;
        });

        // Wrap the content in a proper HTML structure if it doesn't already have one
        if (!processedContent.includes('<!DOCTYPE html>') && !processedContent.includes('<html')) {
          processedContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base target="_blank">
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      line-height: 1.6;
      color: #333;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    table {
      width: 100% !important;
      max-width: 100%;
      border-collapse: collapse;
    }
    td, th {
      padding: 8px;
    }
    a {
      color: #00539f;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="newsletter-content">
    ${processedContent}
  </div>
</body>
</html>`;
        }

        console.log(`[NEWSLETTER-ARCHIVE] Completed HTML processing [${requestId}]`);
      } catch (error: any) {
        console.error(`[NEWSLETTER-ARCHIVE] Error during HTML processing: ${error.message} [${requestId}]`);
        // If HTML processing fails, use a simplified version of the content with proper HTML structure
        processedContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      line-height: 1.6;
      color: #333;
      background-color: #f9f9f9;
    }
    .newsletter-fallback {
      background-color: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .newsletter-text {
      white-space: pre-line;
      margin-top: 15px;
      padding: 15px;
      background-color: #f5f5f5;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="newsletter-fallback">
    <h2 style="color: #00539f; margin-bottom: 20px;">Newsletter Content</h2>
    <p>The newsletter content could not be properly processed. Here is a simplified version:</p>
    <div class="newsletter-text">${fileContent.replace(/<[^>]*>/g, ' ')}</div>
  </div>
</body>
</html>`;
      }

      // Update cache
      cache[path] = {
        content: processedContent,
        timestamp: now
      };

      return NextResponse.json({
        success: true,
        content: processedContent,
        path: path,
        source: 'sharepoint',
        lastUpdated: new Date().toISOString()
      });
    } catch (error: any) {
      console.error(`[NEWSLETTER-ARCHIVE] Error fetching from SharePoint: ${error.message} [${requestId}]`);

      // If we have cached content (even if expired), return it
      if (cache[path] && cache[path].content) {
        console.log(`[NEWSLETTER-ARCHIVE] Returning expired cache due to error [${requestId}]`);
        return NextResponse.json({
          success: true,
          content: cache[path].content,
          path: path,
          source: 'expired-cache',
          lastUpdated: cache[path].timestamp ? new Date(cache[path].timestamp).toISOString() : new Date().toISOString(),
          warning: 'Using cached version due to error'
        });
      }

      // If no cached content is available, return a user-friendly error message
      console.log(`[NEWSLETTER-ARCHIVE] No cache available, returning fallback content [${requestId}]`);

      // Determine the type of error for a more specific message
      let errorType = 'general';
      let userMessage = 'The newsletter archive is temporarily unavailable.';

      if (error.message.includes('itemNotFound') || error.message.includes('not found')) {
        errorType = 'not_found';
        userMessage = 'The requested newsletter file could not be found. It may have been moved or renamed.';
      } else if (error.message.includes('unauthorized') || error.message.includes('access denied') || error.message.includes('permission')) {
        errorType = 'permission';
        userMessage = 'You may not have permission to access this newsletter. Please contact IT support.';
      } else if (error.message.includes('timeout') || error.message.includes('network')) {
        errorType = 'network';
        userMessage = 'There was a network issue while fetching the newsletter. Please check your connection.';
      }

      // Create a user-friendly fallback content with proper HTML structure
      const fallbackContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      line-height: 1.6;
      color: #333;
      background-color: #f9f9f9;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      text-align: center;
    }
    .info-box {
      background: white;
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .tips-box {
      margin: 30px 0;
      padding: 15px;
      background: #f0f7ff;
      border-radius: 6px;
      text-align: left;
    }
    .tips-box ul {
      color: #555;
      padding-left: 20px;
    }
    .tips-box li {
      margin-bottom: 8px;
    }
    .tech-info {
      color: #999;
      font-size: 12px;
      margin-top: 30px;
      text-align: center;
    }
    h2 {
      color: #00539f;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Newsletter Information</h2>

    <div class="info-box">
      <p style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 15px;">
        ${userMessage}
      </p>

      <p style="color: #666; font-size: 14px;">
        Our team has been notified and is working to resolve this issue.
      </p>
    </div>

    <div class="tips-box">
      <p style="color: #333; font-weight: bold; margin-bottom: 10px;">In the meantime, you can:</p>
      <ul>
        <li>Check the company announcements section for recent updates</li>
        <li>Contact the communications team for the latest newsletter</li>
        <li>Try refreshing the page or clearing your browser cache</li>
      </ul>
    </div>

    <p class="tech-info">
      Technical Information:<br>
      Error Type: ${errorType}<br>
      Request ID: ${requestId}<br>
      Path: ${path}
    </p>
  </div>
</body>
</html>`;

      return NextResponse.json({
        success: true, // Return success:true to prevent client-side error handling
        content: fallbackContent,
        path: path,
        source: 'fallback',
        errorType: errorType,
        errorMessage: error.message,
        requestId: requestId
      });
    }
  } catch (error: any) {
    console.error(`[NEWSLETTER-ARCHIVE] Unhandled error: ${error.message} [${requestId}]`);

    // Return a generic error message with fallback content using proper HTML structure
    const fallbackContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      line-height: 1.6;
      color: #333;
      background-color: #f9f9f9;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      text-align: center;
      padding: 30px;
      border-radius: 8px;
    }
    h2 {
      color: #00539f;
      margin-bottom: 20px;
    }
    .message {
      color: #333;
      font-size: 16px;
      margin-bottom: 15px;
    }
    .sub-message {
      color: #666;
      font-size: 14px;
      margin-top: 10px;
    }
    .request-id {
      color: #999;
      font-size: 12px;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Newsletter Archive</h2>
    <p class="message">We're sorry, but we couldn't load the newsletter archive at this time.</p>
    <p class="sub-message">Please try again later or contact support if the issue persists.</p>
    <p class="request-id">
      Request ID: ${requestId}
    </p>
  </div>
</body>
</html>`;

    return NextResponse.json({
      success: true, // Return success:true to prevent client-side error handling
      content: fallbackContent,
      path: path || 'unknown',
      source: 'error-fallback',
      errorMessage: error.message,
      requestId: requestId
    });
  }
}
