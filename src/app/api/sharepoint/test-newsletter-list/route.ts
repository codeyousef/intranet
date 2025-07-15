import { NextRequest, NextResponse } from 'next/server';

async function getGraphToken() {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const tenantId = process.env.AZURE_AD_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('Missing required environment variables');
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    steps: [] as Array<{
      name: string;
      status: string;
      data?: any;
      error?: string;
    }>
  };

  try {
    // Step 1: Get Graph token
    const token = await getGraphToken();
    results.steps.push({
      name: 'Get Graph Token',
      status: 'success'
    });

    // Step 2: Get site info
    const siteUrl = 'https://graph.microsoft.com/v1.0/sites/flyadeal.sharepoint.com:/sites/Thelounge';
    const siteResponse = await fetch(siteUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    const siteData = await siteResponse.json();
    results.steps.push({
      name: 'Get Site Info',
      status: siteResponse.ok ? 'success' : 'failed',
      data: {
        siteId: siteData.id,
        siteName: siteData.displayName
      }
    });

    if (!siteResponse.ok) {
      throw new Error('Failed to get site info');
    }

    // Step 3: List all lists in the site
    const listsUrl = `https://graph.microsoft.com/v1.0/sites/${siteData.id}/lists`;
    const listsResponse = await fetch(listsUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    const listsData = await listsResponse.json();
    results.steps.push({
      name: 'Get All Lists',
      status: listsResponse.ok ? 'success' : 'failed',
      data: {
        listCount: listsData.value?.length || 0,
        lists: listsData.value?.map((list: any) => ({
          id: list.id,
          displayName: list.displayName,
          name: list.name,
          webUrl: list.webUrl
        }))
      }
    });

    // Step 4: Find CEO Newsletter list
    const newsletterList = listsData.value?.find((list: any) => 
      list.displayName === 'CEO Newsletter' || 
      list.name === 'CEO Newsletter' ||
      list.displayName.includes('Newsletter') ||
      list.name.includes('Newsletter')
    );

    if (newsletterList) {
      results.steps.push({
        name: 'CEO Newsletter List Found',
        status: 'success',
        data: {
          listId: newsletterList.id,
          displayName: newsletterList.displayName,
          webUrl: newsletterList.webUrl
        }
      });

      // Step 5: Get items from the list
      const itemsUrl = `https://graph.microsoft.com/v1.0/sites/${siteData.id}/lists/${newsletterList.id}/items?$expand=fields&$top=10`;
      const itemsResponse = await fetch(itemsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        results.steps.push({
          name: 'Get List Items',
          status: 'success',
          data: {
            itemCount: itemsData.value?.length || 0,
            items: itemsData.value?.map((item: any) => ({
              id: item.id,
              title: item.fields?.Title || item.fields?.FileLeafRef || 'Untitled',
              created: item.createdDateTime,
              modified: item.lastModifiedDateTime,
              webUrl: item.webUrl
            }))
          }
        });
      } else {
        const error = await itemsResponse.text();
        results.steps.push({
          name: 'Get List Items',
          status: 'failed',
          error: error
        });
      }
    } else {
      results.steps.push({
        name: 'CEO Newsletter List Found',
        status: 'failed',
        error: 'No list with "Newsletter" in name found'
      });
    }

    return NextResponse.json(results);

  } catch (error: any) {
    return NextResponse.json({
      ...results,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}