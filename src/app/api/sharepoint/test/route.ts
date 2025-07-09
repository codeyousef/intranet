import { NextRequest, NextResponse } from 'next/server';
import { verifyFileAccess, listFiles } from '@/lib/sharepointClient';

/**
 * API endpoint to test SharePoint access
 * This endpoint verifies access to the SharePoint site and the Exp1004.csv file
 */
export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    steps: []
  };

  try {
    // Step 1: List files in the root folder
    results.steps.push({
      name: 'List files in root folder',
      status: 'running'
    });

    try {
      const files = await listFiles();
      
      results.steps[0].status = 'success';
      results.steps[0].fileCount = files.length;
      results.steps[0].files = files.map((file: any) => ({
        name: file.name,
        type: file.folder ? 'Folder' : 'File',
        size: file.size,
        lastModified: file.lastModifiedDateTime
      })).slice(0, 10); // Limit to first 10 files for brevity
    } catch (error: any) {
      results.steps[0].status = 'error';
      results.steps[0].error = error.message;
    }

    // Step 2: Verify access to the specific file
    const targetFile = 'Exp1004.csv';
    results.steps.push({
      name: `Verify access to "${targetFile}"`,
      status: 'running'
    });

    try {
      const fileAccess = await verifyFileAccess(targetFile);
      
      if (fileAccess.accessible) {
        results.steps[1].status = 'success';
        results.steps[1].fileDetails = fileAccess.fileDetails;
      } else {
        results.steps[1].status = 'error';
        results.steps[1].error = fileAccess.error;
      }
    } catch (error: any) {
      results.steps[1].status = 'error';
      results.steps[1].error = error.message;
    }

    // Overall status
    results.success = results.steps.every((step: any) => step.status === 'success');
    
    return NextResponse.json(results);
  } catch (error: any) {
    // Handle any unexpected errors
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}