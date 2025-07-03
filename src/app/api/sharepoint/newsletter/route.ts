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

// Newsletter API temporarily disabled while troubleshooting Viva Engage
export async function GET(request: NextRequest) {
  console.log('Newsletter API is temporarily disabled while troubleshooting Viva Engage')

  return NextResponse.json({
    success: false,
    disabled: true,
    message: 'Newsletter functionality is temporarily disabled while troubleshooting Viva Engage',
  }, { status: 503 }) // 503 Service Unavailable
}
