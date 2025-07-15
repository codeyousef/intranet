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

    if (response.ok) {
      const tokenData = await response.json()
      return tokenData.access_token
    } else {
      const errorText = await response.text()
      return null
    }
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getAuthSession()
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

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

    // Method 1: Try SharePoint REST API with user's token (often works better)
    try {
      // Updated server-relative URL to match the correct path
      const serverRelativeUrl = '/sites/Thelounge/CEO%20Newsletter/last-newsletter.html'
      const restApiUrl = `https://flyadeal.sharepoint.com/_api/web/GetFileByServerRelativeUrl('${serverRelativeUrl}')/$value`
      
      const restResponse = await fetch(restApiUrl, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'text/html, */*',
        },
      })

      if (restResponse.ok) {
        htmlContent = await restResponse.text()
        fetchMethod = 'SharePoint REST API'
      }
    } catch (error) {
      console.error('SharePoint REST API error:', error)
    }

    // Method 2: Try Graph API with fresh application token
    if (!htmlContent) {
      try {
        const graphToken = await getFreshAccessToken()
        
        if (graphToken) {
          // Try multiple possible Graph API paths based on different URL structures
          const graphPaths = [
            "/sites/flyadeal.sharepoint.com,flyadeal.sharepoint.com:/sites/Thelounge:/drive/root:/CEO Newsletter/last-newsletter.html:/content",
            "/sites/flyadeal.sharepoint.com:/sites/Thelounge:/drive/root:/CEO Newsletter/last-newsletter.html:/content",
            "/sites/Thelounge/drive/root:/CEO Newsletter/last-newsletter.html:/content",
            "/sites/root/drive/root:/sites/Thelounge/CEO Newsletter/last-newsletter.html:/content"
          ]

          for (const path of graphPaths) {
            try {
              const graphResponse = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
                headers: {
                  'Authorization': `Bearer ${graphToken}`,
                  'Accept': 'text/html, */*',
                },
              })

              if (graphResponse.ok) {
                htmlContent = await graphResponse.text()
                fetchMethod = `Graph API (${path})`
                break
              }
            } catch (error) {
              console.error(`Graph API error for path ${path}:`, error)
            }
          }
        }
      } catch (error) {
        console.error('Graph API error:', error)
      }
    }

    // Method 3: Try direct fetch with user's token
    if (!htmlContent) {
      try {
        const directResponse = await fetch(newsletterUrl, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'text/html, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })

        if (directResponse.ok) {
          htmlContent = await directResponse.text()
          fetchMethod = 'Direct Fetch'
        }
      } catch (error) {
        console.error('Direct fetch error:', error)
      }
    }

    // If we still don't have content, return an error
    if (!htmlContent) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch newsletter',
        details: 'All methods to fetch the newsletter failed. Please check SharePoint permissions.'
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
