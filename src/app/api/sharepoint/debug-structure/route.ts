import { NextRequest, NextResponse } from 'next/server';
import { listFiles } from '@/lib/sharepointClient';

export async function GET(request: NextRequest) {
  try {
    // List root files and folders
    const rootItems = await listFiles();
    
    // Separate files and folders
    const folders = rootItems.filter((item: any) => item.folder);
    const files = rootItems.filter((item: any) => !item.folder);
    
    // Look for HTML files
    const htmlFiles = files.filter((file: any) => 
      file.name.endsWith('.html') || 
      file.name.endsWith('.htm') || 
      file.name.endsWith('.aspx')
    );
    
    // Look for newsletter-related items
    const newsletterRelated = rootItems.filter((item: any) => 
      item.name.toLowerCase().includes('newsletter') ||
      item.name.toLowerCase().includes('ceo') ||
      item.name.toLowerCase().includes('news')
    );

    const result = {
      timestamp: new Date().toISOString(),
      summary: {
        totalItems: rootItems.length,
        folders: folders.length,
        files: files.length,
        htmlFiles: htmlFiles.length,
        newsletterRelated: newsletterRelated.length
      },
      folders: folders.map((f: any) => ({
        name: f.name,
        created: f.createdDateTime,
        modified: f.lastModifiedDateTime
      })),
      htmlFiles: htmlFiles.map((f: any) => ({
        name: f.name,
        size: f.size,
        modified: f.lastModifiedDateTime
      })),
      newsletterRelated: newsletterRelated.map((item: any) => ({
        name: item.name,
        type: item.folder ? 'FOLDER' : 'FILE',
        modified: item.lastModifiedDateTime
      })),
      recommendation: 'Check the folders above for the newsletter file, or look for HTML files that might be the newsletter'
    };

    return NextResponse.json(result);

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      hint: 'Make sure you have proper SharePoint access'
    }, { status: 500 });
  }
}