import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

// Function to get a Graph API token
async function getGraphToken() {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const tenantId = process.env.AZURE_AD_TENANT_ID;

  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const scope = 'https://graph.microsoft.com/.default';

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      scope,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Graph token acquisition failed: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function GET(request: NextRequest) {
  try {
    // Get the path parameter from the request
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { success: false, error: 'Path parameter is required' },
        { status: 400 }
      );
    }

    // Get Graph token
    const token = await getGraphToken();

    // Site details from your test results
    const siteId = 'flyadeal.sharepoint.com,e6589590-5aca-4d4a-a14e-1a7b9f51396d,94ed5344-9dd1-42c9-b663-cb57c49ab1d4';

    // Extract the file name from the path
    const pathParts = path.split('/');
    const fileName = pathParts[pathParts.length - 1];

    console.log(`Attempting to fetch file: ${fileName} from path: ${path}`);

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
                content: htmlContent,
                path: path,
                fileName: fileName,
                foundVia: `search-in-drive-${drive.name}`,
              });
            }
          }
        }
      } catch (searchError) {
        // Search failed, continue to next drive
        console.log(`Search failed in drive ${drive.name}:`, searchError);
      }
    }

    // If search didn't work, try direct paths
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

    if (!defaultDriveResponse.ok) {
      throw new Error(`Failed to get default drive: ${defaultDriveResponse.status}`);
    }

    const defaultDrive = await defaultDriveResponse.json();

    // Try to get the file directly using the provided path
    try {
      const fileUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:${encodeURIComponent(path)}:/content`;

      console.log(`Attempting to fetch file from: ${fileUrl}`);

      const contentResponse = await fetch(fileUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/html',
        },
        redirect: 'follow', // Follow redirects
      });

      if (contentResponse.ok) {
        const htmlContent = await contentResponse.text();

        return NextResponse.json({
          success: true,
          content: htmlContent,
          path: path,
          fileName: fileName,
          foundVia: 'direct-path',
        });
      }
    } catch (directPathError) {
      console.log('Direct path fetch failed:', directPathError);
    }

    // Try common SharePoint document library paths
    // Construct alternative paths based on the file name
    const folderPath = path.substring(0, path.lastIndexOf('/'));
    const pathsToTry = [
      path, // Original path
      `/Shared Documents${folderPath}/${fileName}`,
      `/Documents${folderPath}/${fileName}`,
      `/SiteAssets${folderPath}/${fileName}`,
      `/SitePages${folderPath}/${fileName}`,
      // Try with different casing or encoding
      `${folderPath}/${encodeURIComponent(fileName)}`,
      `${folderPath}/${fileName.replace(/&/g, '%26')}`,
    ];

    for (const pathToTry of pathsToTry) {
      try {
        const fileUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:${encodeURIComponent(pathToTry)}:/content`;

        console.log(`Trying alternative path: ${pathToTry}`);

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
              content: htmlContent,
              path: pathToTry,
              fileName: fileName,
              foundVia: 'alternative-path',
            });
          }
        }
      } catch (pathError) {
        // Failed to try path, continue to next path
        console.log(`Alternative path failed: ${pathError}`);
      }
    }

    // Last resort: Try to access the folder directly and list its contents
    try {
      // Extract the folder path from the full path
      const folderPath = path.substring(0, path.lastIndexOf('/'));

      console.log(`Trying to list contents of folder: ${folderPath}`);

      const folderUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:${encodeURIComponent(folderPath)}:/children`;

      const folderResponse = await fetch(folderUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (folderResponse.ok) {
        const folderData = await folderResponse.json();

        // Check all files in the folder
        for (const item of folderData.value) {
          // Check if this item matches our file name (case insensitive)
          if (item.name.toLowerCase() === fileName.toLowerCase() && item.file) {
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
                content: htmlContent,
                path: path,
                fileName: item.name, // Use the actual file name from SharePoint
                foundVia: 'folder-listing',
              });
            }
          }
        }

        // If we get here, we couldn't find the file in the folder
        console.log(`File not found in folder. Files in folder: ${folderData.value.map(item => item.name).join(', ')}`);
      }
    } catch (folderError) {
      console.log('Folder listing failed:', folderError);
    }

    // If we get here, we couldn't find the file
    return NextResponse.json(
      { 
        success: false, 
        error: `File not found: ${path}`,
        details: 'The file could not be found using any of the available methods.'
      },
      { status: 404 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
