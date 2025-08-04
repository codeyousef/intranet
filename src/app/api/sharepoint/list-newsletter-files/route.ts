import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { listFiles } from '@/lib/sharepointClient';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }
    
    console.log('[LIST-NEWSLETTER-FILES] Starting to list newsletter files');
    
    const results: any = {
      success: true,
      foldersChecked: [],
      filesFound: {}
    };
    
    // List of folders to check based on the browser link
    const foldersToCheck = [
      '', // Root directory
      'CEO Newsletter', // The known folder from browser link
      'Newsletter',
      'Shared Documents',
      'Documents',
      'Shared Documents/CEO Newsletter',
      'Documents/CEO Newsletter',
      'SitePages',
      'SiteAssets'
    ];
    
    for (const folder of foldersToCheck) {
      try {
        console.log(`[LIST-NEWSLETTER-FILES] Checking folder: "${folder}"`);
        const files = await listFiles(folder);
        
        console.log(`[LIST-NEWSLETTER-FILES] Found ${files.length} items in folder: ${folder || 'root'}`);
        
        results.foldersChecked.push(folder || 'root');
        results.filesFound[folder || 'root'] = files.map(file => ({
          name: file.name,
          type: file.folder ? 'folder' : 'file',
          size: file.size || 0,
          lastModified: file.lastModifiedDateTime,
          webUrl: file.webUrl,
          // Include additional details if it's a newsletter file
          isNewsletter: file.name.toLowerCase().includes('newsletter') || 
                       file.name.toLowerCase().includes('ceo') ||
                       file.name.toLowerCase().endsWith('.html')
        }));
        
        // If this is the CEO Newsletter folder, list its contents in detail
        if (folder === 'CEO Newsletter' && files.length > 0) {
          results.ceoNewsletterContents = files;
          console.log('[LIST-NEWSLETTER-FILES] CEO Newsletter folder contents:', 
            files.map(f => `${f.name} (${f.folder ? 'folder' : 'file'})`).join(', '));
        }
        
      } catch (error: any) {
        console.error(`[LIST-NEWSLETTER-FILES] Error accessing folder "${folder}":`, error.message);
        results.filesFound[folder || 'root'] = `Error: ${error.message}`;
      }
    }
    
    // Find all HTML files across all folders
    const allHtmlFiles: any[] = [];
    for (const [folder, files] of Object.entries(results.filesFound)) {
      if (Array.isArray(files)) {
        const htmlFiles = files.filter((f: any) => 
          f.name.toLowerCase().endsWith('.html') || 
          f.name.toLowerCase().endsWith('.htm')
        );
        htmlFiles.forEach((f: any) => {
          allHtmlFiles.push({
            path: folder === 'root' ? f.name : `${folder}/${f.name}`,
            ...f
          });
        });
      }
    }
    results.allHtmlFiles = allHtmlFiles;
    
    // Find all newsletter-related files
    const newsletterFiles: any[] = [];
    for (const [folder, files] of Object.entries(results.filesFound)) {
      if (Array.isArray(files)) {
        const newsFiles = files.filter((f: any) => f.isNewsletter);
        newsFiles.forEach((f: any) => {
          newsletterFiles.push({
            path: folder === 'root' ? f.name : `${folder}/${f.name}`,
            ...f
          });
        });
      }
    }
    results.newsletterRelatedFiles = newsletterFiles;
    
    // Add summary
    results.summary = {
      totalFoldersChecked: results.foldersChecked.length,
      totalHtmlFiles: allHtmlFiles.length,
      totalNewsletterFiles: newsletterFiles.length,
      hasCeoNewsletterFolder: !!results.ceoNewsletterContents,
      ceoNewsletterFileCount: results.ceoNewsletterContents?.length || 0
    };
    
    return NextResponse.json(results);
    
  } catch (error: any) {
    console.error('[LIST-NEWSLETTER-FILES] API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: 'Failed to list newsletter files'
    }, { status: 500 });
  }
}