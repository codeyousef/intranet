import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // SharePoint URL for iframe embedding
    const sharePointUrl = 'https://flyadeal.sharepoint.com/:u:/s/Thelounge/EbmTH-roSPpIlOelea0QeTkBagnZ0L9eV9kuFXEt2bUwBA'
    
    // Convert sharing URL to embed URL
    const embedUrl = sharePointUrl.replace(':u:', ':u:/g').replace('?e=5yRgje', '') + '?embed=true'
    
    console.log('🔍 Creating iframe embed URL for SharePoint...')
    console.log('Original URL:', sharePointUrl)
    console.log('Embed URL:', embedUrl)

    // Return iframe-ready content
    const iframeContent = `
      <div style="width: 100%; height: 600px; border: none; background: white;">
        <iframe 
          src="${embedUrl}" 
          width="100%" 
          height="100%" 
          frameborder="0" 
          allowfullscreen
          style="border: none;"
          sandbox="allow-scripts allow-same-origin allow-forms allow-downloads">
        </iframe>
        <div style="padding: 10px; background: #f5f5f5; text-align: center; font-size: 12px; color: #666;">
          <a href="${sharePointUrl}?e=5yRgje" target="_blank" style="text-decoration: none; color: #522D6D;">
            📄 Open in SharePoint
          </a>
        </div>
      </div>
    `

    return NextResponse.json({
      success: true,
      newsletter: {
        title: 'CEO Newsletter from SharePoint',
        content: iframeContent,
        sharePointUrl: sharePointUrl + '?e=5yRgje',
        embedUrl,
        lastUpdated: new Date().toISOString(),
        source: 'SharePoint - The Lounge (iframe embed)',
        type: 'iframe'
      },
      note: 'Newsletter embedded via iframe - may require SharePoint authentication'
    })

  } catch (error) {
    console.error('Newsletter iframe error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Newsletter iframe failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}