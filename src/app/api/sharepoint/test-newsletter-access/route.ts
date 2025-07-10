import { NextRequest, NextResponse } from 'next/server';
import { listFiles, getFileContent } from '@/lib/sharepointClient';

export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  try {
    // Test 1: List files in the root folder to see structure
    results.tests.push({
      name: 'List root folder contents',
      status: 'running'
    });

    try {
      const rootFiles = await listFiles();
      results.tests[0].status = 'success';
      results.tests[0].items = rootFiles.map((item: any) => ({
        name: item.name,
        type: item.folder ? 'Folder' : 'File',
        id: item.id,
        webUrl: item.webUrl
      }));
      
      // Check if CEO Newsletter folder exists
      const ceoNewsletterFolder = rootFiles.find((item: any) => 
        item.folder && item.name === 'CEO Newsletter'
      );
      
      if (ceoNewsletterFolder) {
        results.tests[0].ceoNewsletterFolderFound = true;
      }
    } catch (error: any) {
      results.tests[0].status = 'error';
      results.tests[0].error = error.message;
    }

    // Test 2: List files in CEO Newsletter folder
    results.tests.push({
      name: 'List CEO Newsletter folder contents',
      status: 'running'
    });

    try {
      const newsletterFiles = await listFiles('CEO Newsletter');
      results.tests[1].status = 'success';
      results.tests[1].items = newsletterFiles.map((item: any) => ({
        name: item.name,
        type: item.folder ? 'Folder' : 'File',
        size: item.size,
        lastModified: item.lastModifiedDateTime
      }));
    } catch (error: any) {
      results.tests[1].status = 'error';
      results.tests[1].error = error.message;
    }

    // Test 3: Try to access newsletter file using the same pattern as CSV
    results.tests.push({
      name: 'Access newsletter HTML file',
      status: 'running'
    });

    try {
      // Try the exact same pattern as CSV files
      const htmlContent = await getFileContent('CEO Newsletter/last-newsletter.html');
      results.tests[2].status = 'success';
      results.tests[2].contentLength = htmlContent.length;
      results.tests[2].preview = htmlContent.substring(0, 200) + '...';
      results.tests[2].success = true;
    } catch (error: any) {
      results.tests[2].status = 'error';
      results.tests[2].error = error.message;
      
      // If that fails, try without .html extension
      try {
        const htmlContent2 = await getFileContent('CEO Newsletter/last-newsletter');
        results.tests[2].status = 'success-alt';
        results.tests[2].altPath = 'CEO Newsletter/last-newsletter';
        results.tests[2].contentLength = htmlContent2.length;
        results.tests[2].preview = htmlContent2.substring(0, 200) + '...';
      } catch (error2: any) {
        results.tests[2].altError = error2.message;
      }
    }

    // Test 4: For comparison, test CSV access (known working)
    results.tests.push({
      name: 'Access CSV file (for comparison)',
      status: 'running'
    });

    try {
      const csvContent = await getFileContent('Exp1004.csv');
      results.tests[3].status = 'success';
      results.tests[3].contentLength = csvContent.length;
      results.tests[3].preview = csvContent.substring(0, 100) + '...';
    } catch (error: any) {
      results.tests[3].status = 'error';
      results.tests[3].error = error.message;
    }

    // Summary
    results.summary = {
      totalTests: results.tests.length,
      successful: results.tests.filter((t: any) => t.status === 'success' || t.status === 'success-alt').length,
      failed: results.tests.filter((t: any) => t.status === 'error').length
    };

    // Recommendations
    if (results.tests[2].status === 'error') {
      results.recommendations = [
        'Check if the newsletter file exists in the CEO Newsletter folder',
        'Verify the exact filename (might not be "last-newsletter.html")',
        'Ensure the Graph API application has Files.Read.All permission'
      ];
    }

    return NextResponse.json(results);

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}