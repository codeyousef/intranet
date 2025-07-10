import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    // Test if we can access the SharePoint site at all
    const siteUrl = 'https://flyadeal.sharepoint.com/sites/Thelounge/_api/web';
    const siteResponse = await fetch(siteUrl, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Accept': 'application/json'
      }
    });

    const results = {
      user: session.user?.email,
      siteAccess: {
        url: siteUrl,
        status: siteResponse.status,
        success: siteResponse.ok
      },
      newsletterTests: []
    };

    // If we can access the site, try to find the newsletter
    if (siteResponse.ok) {
      // Test 1: List contents of root folder
      const listUrl = "https://flyadeal.sharepoint.com/sites/Thelounge/_api/web/lists/getbytitle('Documents')/items?$select=FileLeafRef,FileRef,FSObjType&$filter=FSObjType eq 1";
      const listResponse = await fetch(listUrl, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/json;odata=verbose'
        }
      });

      results.newsletterTests.push({
        name: 'List document library folders',
        status: listResponse.status,
        success: listResponse.ok
      });

      if (listResponse.ok) {
        const data = await listResponse.json();
        results.newsletterTests[0].folders = data.d?.results?.map((item: any) => ({
          name: item.FileLeafRef,
          path: item.FileRef
        }));
      }

      // Test 2: Try alternative newsletter locations
      const alternativePaths = [
        '/SitePages/CEO-Newsletter.aspx',
        '/Shared Documents/CEO Newsletter/last-newsletter.html',
        '/Documents/CEO Newsletter/last-newsletter.html',
        '/Lists/CEO Newsletter/last-newsletter.html'
      ];

      for (const path of alternativePaths) {
        const testUrl = `https://flyadeal.sharepoint.com/sites/Thelounge/_api/web/GetFileByServerRelativeUrl('/sites/Thelounge${path}')`;
        try {
          const response = await fetch(testUrl, {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/json'
            }
          });
          
          results.newsletterTests.push({
            name: `Test path: ${path}`,
            status: response.status,
            exists: response.ok
          });
        } catch (e) {
          results.newsletterTests.push({
            name: `Test path: ${path}`,
            error: 'Failed to test'
          });
        }
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}