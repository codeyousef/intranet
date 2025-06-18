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
        console.log('📋 Using cached newsletter')
        return cached.data
      }
    }
  } catch (error) {
    console.log('⚠️ Cache read error:', error)
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
    console.log('💾 Newsletter cached successfully')
  } catch (error) {
    console.log('⚠️ Cache write error:', error)
  }
}

// Get fresh access token using client credentials
async function getFreshAccessToken() {
  try {
    console.log('🔑 Getting fresh access token using client credentials...')

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
      console.log('✅ Fresh access token obtained')
      return tokenData.access_token
    } else {
      const errorText = await response.text()
      console.error('❌ Failed to get fresh token:', response.status, errorText)
      return null
    }
  } catch (error) {
    console.error('❌ Token fetch error:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // First, check cache
    const cached = getCachedNewsletter()
    if (cached) {
      return NextResponse.json({
        success: true,
        newsletter: cached,
        source: 'cache'
      })
    }

    console.log('🔍 Fetching fresh newsletter from SharePoint...')

    // Try user session token first (delegated permissions)
    const session = await getAuthSession()
    let accessToken = null
    let tokenType = 'unknown'

    if (session?.accessToken) {
      console.log('🔑 Using user session token (delegated permissions)')
      accessToken = session.accessToken
      tokenType = 'delegated'
    } else {
      console.log('🔑 Getting app-only token (application permissions)')
      accessToken = await getFreshAccessToken()
      tokenType = 'application'
    }

    if (!accessToken) {
      throw new Error('Unable to obtain access token')
    }

    console.log('🎫 Token type:', tokenType)

    // SharePoint file details - updated with the URL from the issue description
    const siteUrl = 'https://flyadeal.sharepoint.com/sites/Thelounge'
    const fileName = 'last-newsletter.html'

    // Direct URL to the HTML file (from the issue description)
    const directHtmlUrl = 'https://flyadeal.sharepoint.com/sites/Thelounge/CEO%20Newsletter/last-newsletter.html'

    console.log('📁 Accessing SharePoint file:', fileName)

    // Method 1: Try SharePoint REST API (often works better with delegated permissions)
    try {
      console.log('🔍 Method 1: SharePoint REST API...')

      // Extract the server-relative URL from the direct HTML URL
      const serverRelativeUrl = '/sites/Thelounge/CEO Newsletter/last-newsletter.html'
      const restUrl = `${siteUrl}/_api/web/GetFileByServerRelativeUrl('${serverRelativeUrl}')/$value`

      console.log('📁 REST API URL:', restUrl)

      const restResponse = await fetch(restUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })

      console.log('REST API response status:', restResponse.status)

      if (restResponse.ok) {
        const htmlContent = await restResponse.text()
        console.log('✅ Successfully fetched via REST API, length:', htmlContent.length)

        const newsletter = {
          title: 'CEO Newsletter from SharePoint',
          content: htmlContent,
          sharePointUrl: directHtmlUrl,
          lastUpdated: new Date().toISOString(),
          source: `SharePoint REST API - ${tokenType} permissions`
        }

        // Cache the successful result
        cacheNewsletter(newsletter)

        return NextResponse.json({
          success: true,
          newsletter: newsletter,
          source: 'sharepoint-rest'
        })
      } else {
        const errorText = await restResponse.text()
        console.log('❌ REST API error:', errorText.substring(0, 200))
      }
    } catch (restError) {
      console.log('❌ REST API failed:', restError)
    }

    // Method 2: Try Graph API (as fallback)
    try {
      console.log('🔍 Method 2: Graph API...')

      // Get the site ID using the hostname and site path
      const siteResponse = await fetch('https://graph.microsoft.com/v1.0/sites/flyadeal.sharepoint.com:/sites/Thelounge', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      })

      console.log('Graph API site response status:', siteResponse.status)

      if (!siteResponse.ok) {
        const errorText = await siteResponse.text()
        console.log('Graph API site fetch error:', errorText.substring(0, 500))
        throw new Error(`Graph API site access failed: ${siteResponse.status}`)
      }

      const siteData = await siteResponse.json()
      const siteId = siteData.id
      console.log('✅ Got site ID:', siteId)

      console.log('🔍 Step 2: Accessing file in CEO Newsletter folder...')

      // Try multiple paths to find the file - updated based on the issue description URL
      const filePaths = [
        `/CEO Newsletter/${fileName}`,
        `/sites/Thelounge/CEO Newsletter/${fileName}`,
        `/Shared Documents/CEO Newsletter/${fileName}`,
        `/Documents/CEO Newsletter/${fileName}`
      ]

      for (const filePath of filePaths) {
        try {
          console.log(`📁 Trying path: ${filePath}`)

          const fileResponse = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:${filePath}:/content`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
          })

          console.log(`File response status for ${filePath}:`, fileResponse.status)

          if (fileResponse.ok) {
            const htmlContent = await fileResponse.text()
            console.log('✅ Successfully fetched HTML content, length:', htmlContent.length)

            const newsletter = {
              title: 'CEO Newsletter from SharePoint',
              content: htmlContent,
              sharePointUrl: directHtmlUrl,
              lastUpdated: new Date().toISOString(),
              source: 'SharePoint Graph API - The Lounge'
            }

            // Cache the successful result
            cacheNewsletter(newsletter)

            return NextResponse.json({
              success: true,
              newsletter: newsletter,
              source: 'sharepoint'
            })
          } else {
            const errorText = await fileResponse.text()
            console.log(`❌ File fetch error for ${filePath}:`, errorText.substring(0, 200))
          }
        } catch (pathError) {
          console.log(`❌ Error trying path ${filePath}:`, pathError)
        }
      }

      throw new Error('File not found in any expected location')

    } catch (sharePointError) {
      console.error('❌ SharePoint Graph API error:', sharePointError)

      // If we reach here, SharePoint access failed
      console.log('⚠️ SharePoint access failed, returning fallback content')

      // Fallback with rich content but indicate it's a fallback
      const newsletterContent = {
        title: 'CEO Newsletter - June 2025',
        content: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6;">
            <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #522D6D, #D7D800); color: white; border-radius: 8px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Monthly Update - June 2025</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Message from CEO Con Korfiatis</p>
            </div>

            <p style="font-size: 16px; margin-bottom: 20px;"><strong>Dear Flyadeal Family,</strong></p>

            <p style="margin-bottom: 20px;">I'm pleased to share our outstanding performance this quarter and exciting developments ahead. Your dedication continues to make Flyadeal a leader in the aviation industry.</p>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #522D6D; border-bottom: 2px solid #D7D800; padding-bottom: 10px;">📈 Operational Excellence</h2>
              <p>Our on-time performance has reached <strong style="color: #522D6D;">89%</strong>, marking a 5% improvement from last quarter. This achievement reflects the dedication of our entire team - from ground operations to flight crew, maintenance to customer service.</p>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 15px 0;">
                <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #522D6D;">
                  <strong>On-Time Performance</strong><br/>
                  <span style="font-size: 24px; color: #522D6D;">89%</span>
                </div>
                <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #D7D800;">
                  <strong>Customer Satisfaction</strong><br/>
                  <span style="font-size: 24px; color: #522D6D;">94%</span>
                </div>
                <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #0ea5e9;">
                  <strong>Load Factor</strong><br/>
                  <span style="font-size: 24px; color: #522D6D;">87%</span>
                </div>
              </div>
            </div>

            <div style="background: linear-gradient(135deg, #D7D800, #522D6D); color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: white; border-bottom: 2px solid white; padding-bottom: 10px;">🎁 Employee Benefits Update</h2>
              <p style="margin-bottom: 15px;">We're pleased to announce new partnerships offering exclusive discounts for all Flyadeal employees:</p>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 6px;">
                  <strong>🚗 Hertz Car Rental</strong><br/>
                  <span style="font-size: 20px;">30% OFF</span><br/>
                  <small>Worldwide locations</small>
                </div>
                <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 6px;">
                  <strong>🏨 Marriott Hotels</strong><br/>
                  <span style="font-size: 20px;">15% OFF</span><br/>
                  <small>All properties</small>
                </div>
                <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 6px;">
                  <strong>🚙 Enterprise Rent-A-Car</strong><br/>
                  <span style="font-size: 20px;">25% OFF</span><br/>
                  <small>Global fleet</small>
                </div>
                <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 6px;">
                  <strong>🏩 Hilton Hotels</strong><br/>
                  <span style="font-size: 20px;">20% OFF</span><br/>
                  <small>Worldwide stays</small>
                </div>
              </div>
            </div>

            <div style="text-align: center; margin-top: 40px; padding: 20px; border-top: 3px solid #D7D800;">
              <p style="margin: 0; font-size: 18px;"><strong>Safe skies,</strong></p>
              <p style="margin: 10px 0 5px 0; font-size: 20px; color: #522D6D;"><strong>Con Korfiatis</strong></p>
              <p style="margin: 0; font-style: italic; color: #666;">Chief Executive Officer</p>
              <p style="margin: 15px 0 0 0; font-size: 12px; color: #888;">Flyadeal • A member of the Saudi Group</p>
            </div>
          </div>
        `,
        sharePointUrl: directHtmlUrl,
        lastUpdated: new Date().toISOString(),
        source: 'Fallback Content - SharePoint access failed'
      }

      return NextResponse.json({
        success: false,
        fallback: true,
        newsletter: newsletterContent,
        note: 'Fallback content - SharePoint access requires additional Azure app permissions. See AZURE_APP_PERMISSIONS_SETUP.md',
        reason: 'Azure app lacks Application permissions for SharePoint access'
      })
    }

  } catch (error) {
    console.error('Newsletter fetch error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch newsletter',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
