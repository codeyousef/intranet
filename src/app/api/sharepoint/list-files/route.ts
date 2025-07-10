import { NextRequest, NextResponse } from 'next/server';
import { listFiles } from '@/lib/sharepointClient';

export async function GET(request: NextRequest) {
  try {
    console.log('[LIST-FILES] Starting to list SharePoint files');
    
    // List root folder
    const rootFiles = await listFiles();
    
    const result = {
      timestamp: new Date().toISOString(),
      rootFolder: {
        itemCount: rootFiles.length,
        items: rootFiles.map((item: any) => ({
          name: item.name,
          type: item.folder ? 'FOLDER' : 'FILE',
          id: item.id,
          size: item.size,
          lastModified: item.lastModifiedDateTime,
          webUrl: item.webUrl
        }))
      }
    };

    // Check if CEO Newsletter folder exists
    const ceoNewsletterFolder = rootFiles.find((item: any) => 
      item.folder && (
        item.name === 'CEO Newsletter' || 
        item.name.toLowerCase().includes('newsletter') ||
        item.name.toLowerCase().includes('ceo')
      )
    );

    if (ceoNewsletterFolder) {
      console.log('[LIST-FILES] Found CEO Newsletter folder:', ceoNewsletterFolder.name);
      
      try {
        // List contents of CEO Newsletter folder
        const newsletterFiles = await listFiles(ceoNewsletterFolder.name);
        result.ceoNewsletterFolder = {
          name: ceoNewsletterFolder.name,
          itemCount: newsletterFiles.length,
          items: newsletterFiles.map((item: any) => ({
            name: item.name,
            type: item.folder ? 'FOLDER' : 'FILE',
            size: item.size,
            lastModified: item.lastModifiedDateTime
          }))
        };
      } catch (error: any) {
        result.ceoNewsletterFolder = {
          name: ceoNewsletterFolder.name,
          error: error.message
        };
      }
    } else {
      console.log('[LIST-FILES] CEO Newsletter folder not found');
      result.ceoNewsletterFolder = {
        found: false,
        hint: 'No folder with "CEO", "Newsletter" in name found in root'
      };
    }

    // Look for any HTML files in root
    const htmlFiles = rootFiles.filter((item: any) => 
      !item.folder && (item.name.endsWith('.html') || item.name.endsWith('.htm'))
    );
    
    if (htmlFiles.length > 0) {
      result.htmlFilesInRoot = htmlFiles.map((f: any) => f.name);
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[LIST-FILES] Error:', error);
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}