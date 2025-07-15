import { NextRequest, NextResponse } from 'next/server';
import { listFiles, getFileContent } from '@/lib/sharepointClient';

export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    search: [] as Array<{
      location?: string;
      foundItems?: Array<{
        name: string;
        type: string;
        path: string;
      }>;
      path?: string;
      status?: string;
      contentLength?: number;
      preview?: string;
      error?: string;
    }>,
    found: false,
    workingPath: null as string | null
  };

  try {
    console.log('[FIND-NEWSLETTER] Starting search for newsletter files');
    
    // Step 1: List all files in root
    const rootFiles = await listFiles();
    
    // Look for any newsletter-related files or folders
    const newsletterItems = rootFiles.filter((item: any) => 
      item.name.toLowerCase().includes('newsletter') ||
      item.name.toLowerCase().includes('ceo') ||
      item.name.toLowerCase().includes('last-newsletter')
    );

    results.search.push({
      location: 'root',
      foundItems: newsletterItems.map((item: any) => ({
        name: item.name,
        type: item.folder ? 'FOLDER' : 'FILE',
        path: item.name
      }))
    });

    // Try different possible paths
    const possiblePaths = [
      'last-newsletter.html',  // Direct in root
      'newsletter.html',
      'CEO Newsletter/last-newsletter.html',
      'CEO Newsletter/Newsletter.html',
      'CEO Newsletter/newsletter.html',
      'CEO Newsletter/index.html',
      'CEO-Newsletter/last-newsletter.html',
      'CEO_Newsletter/last-newsletter.html',
      'Newsletter/last-newsletter.html',
      'Newsletters/last-newsletter.html',
      'CEO Newsletter/Last Newsletter.html',
      'CEO Newsletter/CEO Newsletter.html'
    ];

    // Also check if any HTML files exist in root
    const htmlFiles = rootFiles.filter((item: any) => 
      !item.folder && (
        item.name.endsWith('.html') || 
        item.name.endsWith('.htm') ||
        item.name.endsWith('.aspx')
      )
    );

    if (htmlFiles.length > 0) {
      results.search.push({
        location: 'HTML files in root',
        foundItems: htmlFiles.map((f: any) => f.name)
      });
    }

    // Try to access each possible path
    for (const path of possiblePaths) {
      try {
        console.log(`[FIND-NEWSLETTER] Trying path: ${path}`);
        const content = await getFileContent(path);
        
        results.found = true;
        results.workingPath = path;
        results.search.push({
          path: path,
          status: 'SUCCESS',
          contentLength: content.length,
          preview: content.substring(0, 100) + '...'
        });
        
        // Stop on first success
        break;
      } catch (error: any) {
        results.search.push({
          path: path,
          status: 'NOT_FOUND',
          error: error.message.includes('itemNotFound') ? 'File not found' : error.message
        });
      }
    }

    // If we have folders with newsletter in the name, try to list their contents
    const newsletterFolders = newsletterItems.filter((item: any) => item.folder);
    for (const folder of newsletterFolders) {
      try {
        const folderContents = await listFiles(folder.name);
        results.search.push({
          location: `Contents of folder: ${folder.name}`,
          foundItems: folderContents.map((item: any) => ({
            name: item.name,
            type: item.folder ? 'FOLDER' : 'FILE',
            path: `${folder.name}/${item.name}`
          }))
        });
      } catch (error: any) {
        results.search.push({
          location: `Contents of folder: ${folder.name}`,
          error: error.message
        });
      }
    }

    return NextResponse.json(results);

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}