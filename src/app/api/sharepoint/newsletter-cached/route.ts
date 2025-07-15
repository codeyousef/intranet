import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

// Simple in-memory cache with expiration
let cache: {
  content?: string;
  timestamp?: number;
  fetchMethod?: string;
} = {};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const CACHE_FILE = path.join(process.cwd(), '.newsletter-cache.json');

// Load cache from file on startup
async function loadCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8');
    cache = JSON.parse(data);
  } catch (error) {
    // Cache file doesn't exist or is invalid, that's okay
  }
}

// Save cache to file
async function saveCache() {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache));
  } catch (error) {
    console.error('Failed to save cache:', error);
  }
}

// Initialize cache
loadCache();

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check authentication
    const session = await getAuthSession();
    
    if (!session || !session.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        details: 'Please sign in to view the newsletter'
      }, { status: 401 });
    }

    // Check cache first
    const now = Date.now();
    if (cache.content && cache.timestamp && (now - cache.timestamp < CACHE_DURATION)) {
      console.log('[NEWSLETTER-CACHE] Returning cached content');
      return NextResponse.json({
        success: true,
        newsletter: {
          title: 'CEO Newsletter',
          content: cache.content,
          lastUpdated: new Date(cache.timestamp).toISOString(),
          source: `${cache.fetchMethod} (cached)`,
          cached: true
        }
      });
    }

    // Try to fetch fresh content
    console.log('[NEWSLETTER-CACHE] Cache miss, fetching fresh content');
    
    const newsletterUrl = 'https://flyadeal.sharepoint.com/sites/Thelounge/CEO%20Newsletter/last-newsletter.html';
    let htmlContent = '';
    let fetchMethod = '';

    // Try multiple methods to fetch the newsletter
    const methods = [
      {
        name: 'SharePoint REST API',
        fetch: async () => {
          const url = new URL(newsletterUrl);
          const serverRelativeUrl = decodeURIComponent(url.pathname);
          const restApiUrl = `https://flyadeal.sharepoint.com/_api/web/GetFileByServerRelativeUrl('${serverRelativeUrl}')/$value`;
          
          const response = await fetch(restApiUrl, {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'text/html, */*',
            },
          });
          
          if (response.ok) {
            return await response.text();
          }
          throw new Error(`REST API failed: ${response.status}`);
        }
      },
      {
        name: 'Direct HTML Fetch',
        fetch: async () => {
          const response = await fetch(newsletterUrl, {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'text/html, */*',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });
          
          if (response.ok) {
            return await response.text();
          }
          throw new Error(`Direct fetch failed: ${response.status}`);
        }
      }
    ];

    // Try each method
    for (const method of methods) {
      try {
        console.log(`[NEWSLETTER-CACHE] Trying ${method.name}`);
        htmlContent = await method.fetch();
        fetchMethod = method.name;
        console.log(`[NEWSLETTER-CACHE] ${method.name} successful`);
        break;
      } catch (error: any) {
        console.error(`[NEWSLETTER-CACHE] ${method.name} failed:`, error.message);
      }
    }

    // If we got content, cache it
    if (htmlContent) {
      // Clean up the HTML
      htmlContent = htmlContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      htmlContent = htmlContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
      
      const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        htmlContent = bodyMatch[1];
      }

      // Update cache
      cache = {
        content: htmlContent,
        timestamp: Date.now(),
        fetchMethod: fetchMethod
      };
      
      // Save cache to file
      await saveCache();

      return NextResponse.json({
        success: true,
        newsletter: {
          title: 'CEO Newsletter',
          content: htmlContent,
          lastUpdated: new Date().toISOString(),
          source: fetchMethod,
          cached: false
        }
      });
    }

    // If all methods failed, return cached content if available (even if expired)
    if (cache.content) {
      console.log('[NEWSLETTER-CACHE] All methods failed, returning expired cache');
      return NextResponse.json({
        success: true,
        newsletter: {
          title: 'CEO Newsletter',
          content: cache.content,
          lastUpdated: cache.timestamp ? new Date(cache.timestamp).toISOString() : new Date().toISOString(),
          source: `${cache.fetchMethod} (expired cache)`,
          cached: true,
          warning: 'Unable to fetch latest newsletter, showing previous version'
        }
      });
    }

    // Try manual override as final fallback
    try {
      console.log('[NEWSLETTER-CACHE] Trying manual override fallback');
      const manualResponse = await fetch(`${request.nextUrl.origin}/api/sharepoint/newsletter-manual`);
      if (manualResponse.ok) {
        const manualData = await manualResponse.json();
        if (manualData.success) {
          return NextResponse.json(manualData);
        }
      }
    } catch (error) {
      console.error('[NEWSLETTER-CACHE] Manual override failed:', error);
    }

    // Final fallback
    return NextResponse.json({
      success: false,
      error: 'Newsletter temporarily unavailable',
      details: 'Unable to fetch the newsletter. Please ensure you have access to the SharePoint site.',
      newsletter: {
        title: 'Newsletter Temporarily Unavailable',
        content: `
          <div style="padding: 40px; text-align: center; background: #f5f5f5; border-radius: 8px;">
            <h2 style="color: #00539f; margin-bottom: 20px;">CEO Newsletter</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              We're currently unable to load the newsletter. This might be due to:
            </p>
            <ul style="text-align: left; display: inline-block; margin: 20px 0; color: #666;">
              <li>SharePoint permissions need to be updated</li>
              <li>Your account may need access to the newsletter file</li>
              <li>Temporary network connectivity issues</li>
            </ul>
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              Please contact IT support if this issue persists.<br>
              <a href="/api/sharepoint/debug-permissions" style="color: #00539f;">View Permission Debug Info</a><br>
              <a href="/api/sharepoint/quick-test" style="color: #00539f;">Test SharePoint Access</a>
            </p>
          </div>
        `,
        lastUpdated: new Date().toISOString(),
        source: 'fallback'
      }
    });

  } catch (error: any) {
    console.error('[NEWSLETTER-CACHE] Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      newsletter: {
        title: 'Error Loading Newsletter',
        content: `
          <div style="padding: 40px; text-align: center;">
            <h2 style="color: #d32f2f;">Error Loading Newsletter</h2>
            <p>An unexpected error occurred. Please try again later.</p>
          </div>
        `,
        lastUpdated: new Date().toISOString(),
        source: 'error'
      }
    });
  }
}