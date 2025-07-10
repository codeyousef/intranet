import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if there's a manual newsletter file
    const manualNewsletterPath = path.join(process.cwd(), 'public', 'newsletter-content.html');
    
    try {
      const manualContent = await fs.readFile(manualNewsletterPath, 'utf-8');
      console.log('[NEWSLETTER-MANUAL] Using manual newsletter content');
      
      return NextResponse.json({
        success: true,
        newsletter: {
          title: 'CEO Newsletter',
          content: manualContent,
          lastUpdated: new Date().toISOString(),
          source: 'manual-override',
          message: 'Using manually uploaded newsletter content'
        }
      });
    } catch (error) {
      // No manual file, return instructions
      return NextResponse.json({
        success: false,
        error: 'Newsletter not configured',
        newsletter: {
          title: 'Newsletter Setup Required',
          content: `
            <div style="padding: 40px; background: #f8f9fa; border-radius: 8px; font-family: Arial, sans-serif;">
              <h2 style="color: #00539f; margin-bottom: 20px;">Newsletter Configuration Needed</h2>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                The SharePoint newsletter link appears to have changed or requires updated permissions.
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 4px; border-left: 4px solid #00539f;">
                <h3 style="margin-top: 0; color: #333;">Quick Fix Options:</h3>
                
                <ol style="color: #555; line-height: 1.8;">
                  <li><strong>Update SharePoint Link:</strong><br>
                      Verify the newsletter is still at:<br>
                      <code style="background: #f0f0f0; padding: 2px 4px;">/sites/Thelounge/CEO Newsletter/last-newsletter.html</code>
                  </li>
                  
                  <li style="margin-top: 15px;"><strong>Manual Upload (Temporary):</strong><br>
                      Place the newsletter HTML file at:<br>
                      <code style="background: #f0f0f0; padding: 2px 4px;">public/newsletter-content.html</code>
                  </li>
                  
                  <li style="margin-top: 15px;"><strong>Check Permissions:</strong><br>
                      Ensure users have read access to the CEO Newsletter folder in SharePoint
                  </li>
                </ol>
              </div>
              
              <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 4px;">
                <p style="margin: 0; color: #856404;">
                  <strong>Current Status:</strong> Newsletter file returns 401 Unauthorized<br>
                  <strong>Last Working:</strong> Before the newsletter routes were re-enabled
                </p>
              </div>
              
              <div style="margin-top: 20px; text-align: center;">
                <a href="https://flyadeal.sharepoint.com/sites/Thelounge" 
                   style="display: inline-block; padding: 10px 20px; background: #00539f; color: white; text-decoration: none; border-radius: 4px;">
                  Open SharePoint Site
                </a>
              </div>
            </div>
          `,
          lastUpdated: new Date().toISOString(),
          source: 'configuration-guide'
        }
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins to upload newsletter content
    // You can add your admin check here
    
    const { content } = await request.json();
    
    if (!content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 });
    }

    const manualNewsletterPath = path.join(process.cwd(), 'public', 'newsletter-content.html');
    await fs.writeFile(manualNewsletterPath, content, 'utf-8');
    
    return NextResponse.json({
      success: true,
      message: 'Newsletter content updated successfully'
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}