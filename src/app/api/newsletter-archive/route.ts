// app/api/newsletter-archive/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * Newsletter Archive API Route
 * 
 * This API route returns the HTML content of a newsletter archive file.
 */
export async function GET(request: NextRequest) {
  try {
    // Get the path parameter from the request
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      throw new Error('Path parameter is required');
    }

    // Extract the file number from the path
    const fileNameMatch = path.match(/\/(\d+(?:&\d+)?(?:\s*&\s*\d+)?).html$/i);
    const fileNumber = fileNameMatch ? fileNameMatch[1] : 'unknown';

    // Create a sample newsletter content based on the file number
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #333;">
        <h1 style="color: #5c068c; border-bottom: 2px solid #ffbe00; padding-bottom: 10px;">CEO Newsletter #${fileNumber}</h1>
        
        <div style="margin: 20px 0;">
          <h2 style="color: #5c068c;">Archive Edition #${fileNumber}</h2>
          <p>
            This is a placeholder for the archived newsletter content. In a real implementation,
            this would be replaced with the actual archived newsletter content from a database or file system.
          </p>
          
          <h3 style="color: #5c068c; margin-top: 20px;">Historical Updates</h3>
          <ul>
            <li>This is archived content from edition #${fileNumber}</li>
            <li>Company milestones from that period</li>
            <li>Key announcements and achievements</li>
            <li>Employee recognition from that time</li>
          </ul>
          
          <div style="background-color: #f9f9f9; border-left: 4px solid #ffbe00; padding: 15px; margin: 20px 0;">
            <p style="font-style: italic;">
              "This is a quote from the CEO that would have appeared in newsletter #${fileNumber}."
            </p>
            <p style="text-align: right; margin: 0;">— CEO</p>
          </div>
        </div>
        
        <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 0.9em; color: #666;">
          <p>This is an archived newsletter from our collection.</p>
        </div>
      </div>
    `;

    return NextResponse.json({
      success: true,
      content: htmlContent,
      fileName: `${fileNumber}.html`,
      path: path,
    });
  } catch (error: any) {
    console.error('❌ Newsletter Archive API Error:', error);

    // Return error with helpful information
    return NextResponse.json(
      {
        success: false,
        error: 'Newsletter archive file not found',
        details: error.message,
        content: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px;">
              <h3 style="margin: 0 0 10px 0;">Newsletter Archive File Not Found</h3>
              <p style="margin: 0;">We couldn't load the requested newsletter archive file.</p>
              <p style="margin-top: 10px;">Error: ${error.message}</p>
            </div>
          </div>
        `,
      },
      { status: 404 }
    );
  }
}