/**
 * SharePoint Newsletter API Route
 * 
 * This API route fetches the HTML content of a newsletter from SharePoint and returns it.
 * It tries multiple approaches (REST API and Graph API) to fetch the content.
 * 
 * Implementation:
 * - Uses caching to reduce loading time (now set to 60 minutes)
 * - Tries multiple API approaches to fetch the content:
 *   1. SharePoint REST API (often works better with delegated permissions)
 *   2. Graph API with multiple possible paths (as fallback)
 * - Provides fallback content in case of errors
 * 
 * Changes Made to Fix Loading Time Issue:
 * - Updated all URLs to use the direct HTML URL from the issue description:
 *   https://flyadeal.sharepoint.com/sites/Thelounge/CEO%20Newsletter/last-newsletter.html
 * - Updated the server-relative URL for the REST API to match the correct path
 * - Added additional path to the Graph API paths to try more possible locations
 * - Updated all sharePointUrl references to use the direct HTML URL
 * - Increased cache duration from 30 minutes to 60 minutes to reduce loading time
 * 
 * Testing:
 * 1. Visit the homepage and check if the newsletter loads faster than before
 * 2. If it doesn't load, check the browser console for error messages
 * 3. To force a fresh fetch, add ?force_fetch=true to the URL or use the reset button
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { getFileContent } from '@/lib/sharepointClient'
import fs from 'fs'
import path from 'path'

// Cache file path
const CACHE_DIR = path.join(process.cwd(), '.newsletter-cache')
const CACHE_FILE = path.join(CACHE_DIR, 'newsletter.json')
const CACHE_DURATION = 60 * 60 * 1000 // 60 minutes - increased to reduce loading time

// Ensure cache directory exists
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

// Get cached newsletter
function getCachedNewsletter() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
      const now = Date.now()
      if (now - cached.timestamp < CACHE_DURATION) {
        return cached.data
      }
    }
  } catch (error) {
    // Cache read error, continue
  }
  return null
}

// Save newsletter to cache
function cacheNewsletter(data: any) {
  try {
    ensureCacheDir()
    const cacheData = {
      timestamp: Date.now(),
      data: data
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2))
  } catch (error) {
    // Cache write error, continue
  }
}

// Get fresh access token using client credentials
async function getFreshAccessToken() {
  try {
    console.log('[NEWSLETTER-API] Getting fresh access token for Graph API');
    console.log('[NEWSLETTER-API] Tenant ID:', process.env.AZURE_AD_TENANT_ID);
    console.log('[NEWSLETTER-API] Client ID:', process.env.AZURE_AD_CLIENT_ID);
    console.log('[NEWSLETTER-API] Client Secret present:', !!process.env.AZURE_AD_CLIENT_SECRET);

    const response = await fetch(`https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.AZURE_AD_CLIENT_ID!,
        client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      }),
    })

    console.log('[NEWSLETTER-API] Token response status:', response.status, response.statusText);

    if (response.ok) {
      const tokenData = await response.json()
      console.log('[NEWSLETTER-API] Token acquired successfully');
      return tokenData.access_token
    } else {
      const errorText = await response.text()
      console.error('[NEWSLETTER-API] Token acquisition failed:', errorText);
      return null
    }
  } catch (error: any) {
    console.error('[NEWSLETTER-API] Token acquisition error:', error.message);
    console.error('[NEWSLETTER-API] Error stack:', error.stack);
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('[NEWSLETTER-API] Request received at /api/sharepoint/newsletter');
    
    // Check authentication
    const session = await getAuthSession()
    
    if (!session) {
      console.error('[NEWSLETTER-API] No session found - returning 401');
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }
    
    console.log('[NEWSLETTER-API] Session authenticated for user:', session.user?.email);

    // Check for force fetch parameter
    const { searchParams } = new URL(request.url)
    const forceFetch = searchParams.get('force_fetch') === 'true'
    
    // Try to get from cache first (unless force fetch is requested)
    if (!forceFetch) {
      const cached = getCachedNewsletter()
      if (cached) {
        return NextResponse.json({
          success: true,
          newsletter: cached,
          fromCache: true
        })
      }
    }

    // Updated direct HTML URL based on the correct path from the issue
    const newsletterUrl = 'https://flyadeal.sharepoint.com/sites/Thelounge/CEO%20Newsletter/last-newsletter.html'
    
    let htmlContent = ''
    let fetchMethod = ''

    // Method 0: Try using the same SharePoint client that works for flight data
    try {
      console.log('[NEWSLETTER-API] Method 0: Trying SharePoint client (same as flight data)');
      const possiblePaths = [
        'CEO Newsletter/last-newsletter.html',
        'last-newsletter.html',
        'newsletter.html',
        'CEO Newsletter/Newsletter.html',
        'CEO Newsletter/newsletter.html',
        'Newsletter/last-newsletter.html',
        'CEO Newsletter/Last Newsletter.html',
        'CEO Newsletter/CEO Newsletter.html'
      ];
      
      for (const path of possiblePaths) {
        try {
          console.log(`[NEWSLETTER-API] Trying SharePoint client with path: ${path}`);
          const content = await getFileContent(path);
          if (content) {
            console.log(`[NEWSLETTER-API] Success! Found newsletter at: ${path}`);
            htmlContent = content;
            fetchMethod = `SharePoint Client (${path})`;
            break;
          }
        } catch (error: any) {
          console.log(`[NEWSLETTER-API] SharePoint client failed for ${path}:`, error.message);
        }
      }
    } catch (error: any) {
      console.error('[NEWSLETTER-API] SharePoint client error:', error.message);
      console.error('[NEWSLETTER-API] Error stack:', error.stack);
    }

    // Method 1: Try SharePoint REST API with user's token (often works better)
    try {
      // Updated server-relative URL to match the correct path
      const serverRelativeUrl = '/sites/Thelounge/CEO%20Newsletter/last-newsletter.html'
      const restApiUrl = `https://flyadeal.sharepoint.com/_api/web/GetFileByServerRelativeUrl('${serverRelativeUrl}')/$value`
      
      console.log('[NEWSLETTER-API] Method 1: Trying SharePoint REST API');
      console.log('[NEWSLETTER-API] REST API URL:', restApiUrl);
      console.log('[NEWSLETTER-API] Using session token:', session.accessToken ? `Bearer ${session.accessToken.substring(0, 10)}...` : 'NO TOKEN');
      
      const restResponse = await fetch(restApiUrl, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'text/html, */*',
        },
      })
      
      console.log('[NEWSLETTER-API] REST API Response:', restResponse.status, restResponse.statusText);
      
      if (!restResponse.ok) {
        const errorBody = await restResponse.text();
        console.error('[NEWSLETTER-API] REST API Error Response Body:', errorBody.substring(0, 500));
      }

      if (restResponse.ok) {
        htmlContent = await restResponse.text()
        fetchMethod = 'SharePoint REST API'
      }
    } catch (error: any) {
      console.error('[NEWSLETTER-API] SharePoint REST API error:', error.message);
      console.error('[NEWSLETTER-API] Error stack:', error.stack);
    }

    // Method 2: Try Graph API with fresh application token
    if (!htmlContent) {
      try {
        console.log('[NEWSLETTER-API] Method 2: Trying Graph API with application token');
        const graphToken = await getFreshAccessToken()
        
        if (graphToken) {
          console.log('[NEWSLETTER-API] Graph token acquired:', graphToken ? `Bearer ${graphToken.substring(0, 10)}...` : 'NO TOKEN');
          
          // Try multiple possible Graph API paths based on different URL structures
          const graphPaths = [
            "/sites/flyadeal.sharepoint.com,flyadeal.sharepoint.com:/sites/Thelounge:/drive/root:/CEO Newsletter/last-newsletter.html:/content",
            "/sites/flyadeal.sharepoint.com:/sites/Thelounge:/drive/root:/CEO Newsletter/last-newsletter.html:/content",
            "/sites/Thelounge/drive/root:/CEO Newsletter/last-newsletter.html:/content",
            "/sites/root/drive/root:/sites/Thelounge/CEO Newsletter/last-newsletter.html:/content"
          ]

          for (const path of graphPaths) {
            try {
              const graphUrl = `https://graph.microsoft.com/v1.0${path}`;
              console.log(`[NEWSLETTER-API] Trying Graph API path: ${graphUrl}`);
              
              const graphResponse = await fetch(graphUrl, {
                headers: {
                  'Authorization': `Bearer ${graphToken}`,
                  'Accept': 'text/html, */*',
                },
              })
              
              console.log(`[NEWSLETTER-API] Graph API Response for ${path}:`, graphResponse.status, graphResponse.statusText);
              
              if (!graphResponse.ok) {
                const errorBody = await graphResponse.text();
                console.error(`[NEWSLETTER-API] Graph API Error Response Body:`, errorBody.substring(0, 500));
              }

              if (graphResponse.ok) {
                htmlContent = await graphResponse.text()
                fetchMethod = `Graph API (${path})`
                break
              }
            } catch (error: any) {
              console.error(`[NEWSLETTER-API] Graph API error for path ${path}:`, error.message)
            }
          }
        } else {
          console.error('[NEWSLETTER-API] Failed to acquire Graph API token');
        }
      } catch (error: any) {
        console.error('[NEWSLETTER-API] Graph API error:', error.message)
        console.error('[NEWSLETTER-API] Error stack:', error.stack)
      }
    }

    // Method 3: Try direct fetch with user's token
    if (!htmlContent) {
      try {
        console.log('[NEWSLETTER-API] Method 3: Trying direct fetch with user token');
        console.log('[NEWSLETTER-API] Direct URL:', newsletterUrl);
        
        const directResponse = await fetch(newsletterUrl, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'text/html, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })
        
        console.log('[NEWSLETTER-API] Direct fetch response:', directResponse.status, directResponse.statusText);
        
        if (!directResponse.ok) {
          const errorBody = await directResponse.text();
          console.error('[NEWSLETTER-API] Direct fetch error response body:', errorBody.substring(0, 500));
        }

        if (directResponse.ok) {
          htmlContent = await directResponse.text()
          fetchMethod = 'Direct Fetch'
        }
      } catch (error: any) {
        console.error('[NEWSLETTER-API] Direct fetch error:', error.message)
        console.error('[NEWSLETTER-API] Error stack:', error.stack)
      }
    }

    // If we still don't have content, return an error
    if (!htmlContent) {
      console.error('[NEWSLETTER-API] Failed to fetch newsletter content from all methods');
      console.error('[NEWSLETTER-API] Returning error response');
      
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch newsletter',
        details: 'All methods to fetch the newsletter failed. Please check SharePoint permissions.',
        attemptedUrl: newsletterUrl
      })
    }

    // Process the HTML content
    // Extract title from HTML if possible
    let title = 'CEO Newsletter'
    const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) {
      title = titleMatch[1].trim()
    }

    // Clean up the HTML content
    // Remove SharePoint-specific scripts and styles that might interfere
    htmlContent = htmlContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    htmlContent = htmlContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    
    // Extract body content if it's a full HTML document
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    if (bodyMatch) {
      htmlContent = bodyMatch[1]
    }

    const newsletterData = {
      title: title,
      content: htmlContent,
      lastUpdated: new Date().toISOString(),
      source: fetchMethod,
      sharePointUrl: newsletterUrl
    }

    // Cache the newsletter data
    cacheNewsletter(newsletterData)

    return NextResponse.json({
      success: true,
      newsletter: newsletterData
    })

  } catch (error: any) {
    console.error('Newsletter API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: 'An unexpected error occurred'
    })
  }
}
