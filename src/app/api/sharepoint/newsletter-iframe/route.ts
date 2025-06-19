// app/api/sharepoint/newsletter-iframe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

/**
 * Get Graph API token - THIS WORKS based on your test results
 */
async function getGraphToken() {
  const response = await fetch(
      `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.AZURE_AD_CLIENT_ID!,
          client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Graph token acquisition failed: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function GET(request: NextRequest) {
  try {
    // Get Graph token
    const token = await getGraphToken();

    // Site details from your test results
    const siteId = 'flyadeal.sharepoint.com,e6589590-5aca-4d4a-a14e-1a7b9f51396d,94ed5344-9dd1-42c9-b663-cb57c49ab1d4';
    const fileName = 'last-newsletter.html';

    // First, let's find the correct drive and folder structure
    const drivesResponse = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        }
    );

    if (!drivesResponse.ok) {
      throw new Error(`Failed to get drives: ${drivesResponse.status}`);
    }

    const drivesData = await drivesResponse.json();

    // Try to find the file in each drive
    for (const drive of drivesData.value) {

      // Search for the file
      try {
        const searchResponse = await fetch(
            `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${drive.id}/root/search(q='${fileName}')`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
              },
            }
        );

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();

          if (searchData.value && searchData.value.length > 0) {
            // Found the file!
            const file = searchData.value[0];

            // Get the file content
            const contentResponse = await fetch(
                `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${drive.id}/items/${file.id}/content`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'text/html',
                  },
                }
            );

            if (contentResponse.ok) {
              const htmlContent = await contentResponse.text();

              return NextResponse.json({
                success: true,
                newsletter: {
                  title: 'CEO Newsletter',
                  content: htmlContent,
                  sharePointUrl: file.webUrl || '',
                  lastUpdated: file.lastModifiedDateTime || new Date().toISOString(),
                  source: `Graph API - ${drive.name}`,
                  type: 'html',
                },
              });
            }
          }
        }
      } catch (searchError) {
        // Search failed, continue to next drive
      }
    }

    // If search didn't work, try direct paths

    // Try common SharePoint document library paths
    const pathsToTry = [
      '/CEO Newsletter/last-newsletter.html',
      '/Shared Documents/CEO Newsletter/last-newsletter.html',
      '/Documents/CEO Newsletter/last-newsletter.html',
      '/sites/Thelounge/CEO Newsletter/last-newsletter.html',
      '/SiteAssets/CEO Newsletter/last-newsletter.html',
      '/SitePages/CEO Newsletter/last-newsletter.html',
    ];

    // Get the default drive (usually "Documents" library)
    const defaultDriveResponse = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/drive`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        }
    );

    if (defaultDriveResponse.ok) {
      const defaultDrive = await defaultDriveResponse.json();

      for (const path of pathsToTry) {
        try {

          const fileUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:${encodeURIComponent(path)}:/content`;

          const fileResponse = await fetch(fileUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'text/html',
            },
            redirect: 'follow', // Follow redirects
          });

          if (fileResponse.ok) {
            const htmlContent = await fileResponse.text();

            if (htmlContent.length > 0) {

              return NextResponse.json({
                success: true,
                newsletter: {
                  title: 'CEO Newsletter',
                  content: htmlContent,
                  sharePointUrl: `https://flyadeal.sharepoint.com/sites/Thelounge${path}`,
                  lastUpdated: new Date().toISOString(),
                  source: `Graph API - ${path}`,
                  type: 'html',
                },
              });
            }
          } else if (fileResponse.status === 404) {
            // File not found, continue to next path
          } else {
            // Error accessing path, continue to next path
          }
        } catch (pathError) {
          // Failed to try path, continue to next path
        }
      }
    }

    // Last resort: List all files in the CEO Newsletter folder if we can find it

    try {
      // Try to access the CEO Newsletter folder directly
      const folderResponse = await fetch(
          `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/CEO Newsletter:/children`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          }
      );

      if (folderResponse.ok) {
        const folderData = await folderResponse.json();

        // Check all files in the folder
        for (const item of folderData.value) {

          if (item.name === fileName && item.file) {
            // Get this file's content
            const contentResponse = await fetch(
                `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${item.id}/content`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'text/html',
                  },
                }
            );

            if (contentResponse.ok) {
              const htmlContent = await contentResponse.text();

              return NextResponse.json({
                success: true,
                newsletter: {
                  title: 'CEO Newsletter',
                  content: htmlContent,
                  sharePointUrl: item.webUrl || '',
                  lastUpdated: item.lastModifiedDateTime || new Date().toISOString(),
                  source: 'Graph API - CEO Newsletter folder',
                  type: 'html',
                },
              });
            }
          }
        }
      }
    } catch (folderError) {
      // Could not list folder contents, continue
    }

    // If we get here, we couldn't find the file
    throw new Error('Newsletter file not found in any location');

  } catch (error: any) {
    console.error('❌ Newsletter API Error:', error);

    // Return error with helpful information
    const errorHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0;">Newsletter Not Found</h3>
          <p style="margin: 0;">We couldn't locate the newsletter file in SharePoint.</p>
        </div>

        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h4 style="margin: 0 0 10px 0;">Possible Issues:</h4>
          <ul style="margin: 0; padding-left: 20px;">
            <li>The file "last-newsletter.html" may not exist in the expected location</li>
            <li>The file might be in a different folder than "CEO Newsletter"</li>
            <li>The file name might be different (check for spaces or special characters)</li>
          </ul>
        </div>

        <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 5px;">
          <h4 style="margin: 0 0 10px 0;">Next Steps:</h4>
          <ol style="margin: 0; padding-left: 20px;">
            <li>Verify the file exists at: <code>/sites/Thelounge/CEO Newsletter/last-newsletter.html</code></li>
            <li>Check if the file has been moved or renamed</li>
            <li>Ensure the file is in a document library accessible to the app</li>
          </ol>
        </div>

        <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <p style="margin: 0; font-size: 12px; color: #6c757d;">
            <strong>Debug Info:</strong><br>
            Site ID: ${siteId || 'Not available'}<br>
            Timestamp: ${new Date().toISOString()}<br>
            Error: ${error.message}
          </p>
        </div>
      </div>
    `;

    return NextResponse.json(
        {
          success: false,
          error: 'Newsletter file not found',
          details: error.message,
          newsletter: {
            title: 'Newsletter Not Found',
            content: errorHtml,
            sharePointUrl: '',
            lastUpdated: new Date().toISOString(),
            source: 'Error Handler',
            type: 'html',
          },
        },
        { status: 404 }
    );
  }
}
