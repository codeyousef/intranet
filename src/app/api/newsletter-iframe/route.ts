// app/api/newsletter-iframe/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * Newsletter API Route
 * 
 * This API route returns the HTML content of a newsletter.
 */
export async function GET(request: NextRequest) {
  try {
    // Create a sample newsletter content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #333;">
        <h1 style="color: #5c068c; border-bottom: 2px solid #ffbe00; padding-bottom: 10px;">CEO Newsletter</h1>

        <div style="margin: 20px 0;">
          <h2 style="color: #5c068c;">Welcome to the Latest Edition</h2>
          <p>
            Welcome to our newsletter! This is a placeholder content that would be replaced 
            with actual newsletter content from a database or content management system in a 
            real implementation.
          </p>

          <h3 style="color: #5c068c; margin-top: 20px;">Company Updates</h3>
          <ul>
            <li>New routes announced for the upcoming season</li>
            <li>Employee satisfaction survey results are in</li>
            <li>Maintenance efficiency improved by 15%</li>
            <li>New training programs launching next month</li>
          </ul>

          <h3 style="color: #5c068c; margin-top: 20px;">Achievements</h3>
          <p>
            Our team has achieved remarkable results this quarter. On-time performance has improved,
            and customer satisfaction scores are at an all-time high.
          </p>

          <div style="background-color: #f9f9f9; border-left: 4px solid #ffbe00; padding: 15px; margin: 20px 0;">
            <p style="font-style: italic;">
              "I'm proud of what we've accomplished together. Our dedication to excellence
              continues to set us apart in the industry."
            </p>
            <p style="text-align: right; margin: 0;">— CEO</p>
          </div>
        </div>

        <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 0.9em; color: #666;">
          <p>Thank you for reading our newsletter. See you in the next edition!</p>
        </div>
      </div>
    `;

    return NextResponse.json({
      success: true,
      newsletter: {
        title: 'CEO Newsletter',
        content: htmlContent,
        lastUpdated: new Date().toISOString(),
        source: 'Internal System',
        type: 'html',
      },
    });
  } catch (error: any) {
    console.error('❌ Newsletter API Error:', error);

    // Return error with helpful information
    const errorHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0;">Newsletter Not Found</h3>
          <p style="margin: 0;">We couldn't load the newsletter content.</p>
        </div>

        <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 5px;">
          <h4 style="margin: 0 0 10px 0;">Next Steps:</h4>
          <ol style="margin: 0; padding-left: 20px;">
            <li>Try refreshing the page</li>
            <li>Contact IT support if the issue persists</li>
          </ol>
        </div>

        <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <p style="margin: 0; font-size: 12px; color: #6c757d;">
            <strong>Debug Info:</strong><br>
            Timestamp: ${new Date().toISOString()}<br>
            Error: ${error.message}
          </p>
        </div>
      </div>
    `;

    return NextResponse.json(
      {
        success: false,
        error: 'Newsletter not found',
        details: error.message,
        newsletter: {
          title: 'Newsletter Not Found',
          content: errorHtml,
          lastUpdated: new Date().toISOString(),
          source: 'Error Handler',
          type: 'html',
        },
      },
      { status: 404 }
    );
  }
}
